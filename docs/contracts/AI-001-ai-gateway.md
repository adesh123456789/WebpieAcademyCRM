# AI-001 - AI Gateway contract (proposal)

- **Producer**: Claude (`src/lib/ai/**`)
- **Consumers**: Codex (`src/app/api/v1/questions/generate`, `ai/copilot`, `ai/tutor`, report generation), Antigravity (UI-012 candidate review)
- **Status**: PROPOSAL - needs Codex acknowledgement of the schema + domain-helper asks in section 8. Unblocks CLD-003.
- **PRD**: Section 30 (AI/RAG), AI-001..AI-007, AC-003 / AC-015 / AC-018, NFR async + timeout.

Every model use goes through one gateway path: resolve tenant scope -> select prompt template -> call model with a bounded timeout -> **validate output against a runtime schema** -> persist provenance -> return. Any failure in that path yields a **safe, non-fabricated fallback**. AI never produces authoritative marks, rank or mastery.

## 1. Gateway surface

```
AIGateway.run<T>(task: AITask, input: AITaskInput[task], ctx: AIContext): Promise<AIResult<T>>
```

- `ctx` carries `{ tenantId, userId, role, traceId }`, all derived server-side from the session. `tenantId` in `input` is ignored if present.
- `AIResult<T>` = `{ data: T; provenance: AIProvenance; outcome: "MODEL" | "FALLBACK_BANK" | "FALLBACK_TEMPLATE"; shortfall?: number }`.
- The gateway never throws for "model failed" - it falls back. It throws only `AIScopeError` (caller passed an out-of-scope reference) and `AIConfigError` (missing prompt template). Routes map those to `{ error: { code, message, traceId } }`.

Tasks in scope for CLD-003: `question.generate`, `report.parentSummary`. `copilot.query` and `tutor.query` are specified here but implemented later (still behind flags).

## 2. Output schemas (runtime-validated, zod)

Validation runs on model output **before** it is returned or rendered. Invalid output is discarded and the fallback runs; the raw invalid payload is logged with the `traceId`, never surfaced.

### `question.generate`

```ts
GeneratedQuestion = {
  body: string,                       // non-empty, LaTeX allowed
  options: [                          // exactly 4
    { id: "A"|"B"|"C"|"D", text: string }
  ],                                  // ids unique, cover A-D
  correctAnswer: "A"|"B"|"C"|"D",     // must be one of options[].id
  solution: string,                   // non-empty
  declaredDifficulty: "EASY"|"MEDIUM"|"HARD",
  concept: string,                    // echoes the request concept
  subject: string,
  status: "AI_CANDIDATE",             // always; never REVIEWED/VERIFIED from the gateway
  source: "MODEL" | "BANK",
  provenance: { provider: string, model: string, promptTemplateId: string, promptTemplateVersion: string, aiRequestId: string }
}
```

Response body: `{ candidates: GeneratedQuestion[], outcome, shortfall? }`. `shortfall` = requested count minus returned count (only on `FALLBACK_BANK` when the approved bank has too few).

### `report.parentSummary`

```ts
ParentSummary = {
  text: string,                       // non-empty
  language: "en"|"hi"|"mr",
  outcome: "MODEL" | "FALLBACK_TEMPLATE",
  provenance: { provider, model, promptTemplateId, promptTemplateVersion, aiRequestId }
}
```

The report text is descriptive only. Score, rank, percentile, cohort size and mastery come from the deterministic services and are passed **in** to the gateway - the model may rephrase them, never compute them.

## 3. Fallback policy (replaces the fabricated generator)

| Task | Model unavailable / timeout / invalid output |
|---|---|
| `question.generate` | `selectApprovedBankQuestions({ tenantId, concept, difficulty, count })` -> existing `Question` rows with `status in (REVIEWED, VERIFIED)` and `ownerScope in (WEBPIE, <tenant>)`, mapped to `GeneratedQuestion` with `source: "BANK"`, `status: "AI_CANDIDATE"`. If fewer than `count`, return what exists + `shortfall`. **Never synthesize a question.** |
| `report.parentSummary` | The existing deterministic multilingual template (`en`/`hi`/`mr`). `outcome: "FALLBACK_TEMPLATE"`. |
| `copilot.query` | Read-only analytics template response; no invented data. |
| `tutor.query` | Disabled response with teacher-escalation message. |

`AIGateway.getDeterministicCandidates` and the hard-coded physics/chemistry/maths question bodies are **deleted** in CLD-003. (The current physics fallback asserts `15 N <= 7.84 N` - it ships an arithmetically wrong "correct" answer.)

## 4. Provenance (every material output)

Persist one `AIRequest` row per gateway call:

```
AIRequest {
  id            String  @id @default(uuid())
  tenantId      String
  task          String   // "question.generate" | "report.parentSummary" | ...
  provider      String   // "google" | "openai" | "webpie-template" | "webpie-bank"
  model         String
  promptTemplateId       String
  promptTemplateVersion  String
  inputHash     String   // sha256 of normalized input, for dedupe/debug - no raw PII
  outcome       String   // "MODEL" | "FALLBACK_BANK" | "FALLBACK_TEMPLATE" | "ERROR"
  latencyMs     Int
  createdById   String
  createdAt     DateTime @default(now())
  @@index([tenantId, task, createdAt])
}
```

Optional, used by UI-012 later:

```
AIFeedback {
  id           String  @id @default(uuid())
  aiRequestId  String
  verdict      String   // "APPROVED" | "REJECTED" | "EDITED"
  actorId      String
  note         String?
  createdAt    DateTime @default(now())
}
```

## 5. Scope (AC-015)

- `tenantId` resolved from session only.
- Retrieval / prompt context filtered to `{ tenant-private namespace of ctx.tenantId } union { WebPie-approved namespace }` before the model call. A teacher in tenant B can never retrieve tenant A content or have it enter the prompt.
- `question.generate` `concept` / `chapter` must resolve to a `CurriculumNode` visible to the tenant; otherwise `AIScopeError`.

## 6. Candidate gating (AC-003)

Generated questions always return `status: "AI_CANDIDATE"`. EXM-001's finalize path rejects any exam question whose backing `Question` is an unapproved AI candidate. The gateway does not write `Question` rows; the route decides whether to persist candidates for review.

## 7. Timeout / async (NFR)

- Per model call: `AI_CALL_TIMEOUT_MS` (default 20000). On timeout -> fallback, `outcome: "ERROR"`, logged.
- `question.generate` with `count <= 5`: synchronous, returns `candidates`.
- `count > 5` (max 20): `POST /questions/generate` returns `{ jobId }`; `GET /ai/jobs/{id}` -> `{ status: "PENDING"|"DONE"|"ERROR", result? }`. (Job store is Codex's; the gateway exposes a `runToCompletion` the worker calls.)

## 8. Asks for Codex (blocking ack)

1. Add `AIRequest` (and `AIFeedback`) to `prisma/schema.prisma` **and** `prisma/schema.postgresql.prisma` (schema-parity guard enforces the mirror), plus a migration.
2. Expose `selectApprovedBankQuestions({ tenantId, concept, difficulty, count }): Promise<Question[]>` from the question-bank module (Codex domain), scoped as in section 3. Alternative: bless a read-only `prisma.question.findMany` with a fixed scope filter inside `src/lib/ai/**`.
3. `questions/generate` route: validate `count` (1..20), stop silently defaulting `subject`/`chapter`/`concept` (return 400 on missing), and consume the new response shape (`candidates` + `outcome` + `shortfall`).
4. Confirm Claude may add `tests/ai-gateway.test.ts` (negative tests for AC-003 / AC-007 / AC-015) under the same test-path carve-out granted for `tests/omr-corpus/**`.

## 9. Ownership

- Claude: `src/lib/ai/**` (gateway, zod schemas, `src/lib/ai/prompts/*` versioned template registry, fallback wiring, timeout, provenance writes), `tests/ai-gateway.test.ts`.
- Codex: Prisma models + migration, `selectApprovedBankQuestions`, route request/response changes, AI job store.
- Antigravity: UI-012 consumes `GeneratedQuestion` (candidate + `source` + `provenance`, uncertainty visible).

## 10. Error envelope

`{ "error": { "code": "AI_SCOPE_DENIED" | "AI_CONFIG", "message": "<user-safe>", "traceId": "<id>" } }` - consistent with C01. `AI_INVALID_OUTPUT` and `AI_TIMEOUT` are internal only; the caller sees a normal `200` with `outcome: "FALLBACK_*"`.
