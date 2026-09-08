# CLD-003 / Claude - AI Gateway hardening

- **Task / owner**: CLD-003 (AI Gateway hardening, split from AI-001) / Claude
- **Timestamp + timezone**: 2026-09-09 Asia/Kolkata
- **Status**: DONE (Claude-owned slice, integrated on `master`). Route migration + shim removal is Codex follow-up.
- **Base**: `0b1451a` (Codex AI-001 ack). Contract: `docs/contracts/AI-001-ai-gateway.md`.

## Files (all in the acked scope: `src/lib/ai/**` + `tests/ai-gateway.test.ts`)

- `src/lib/ai/schemas.ts` [NEW] - zod: `modelQuestionListSchema` (strict: exactly 4 options, A-D) validates raw model output; `generatedQuestionSchema` (lenient 2-6 options, unique ids, `correctAnswer` in ids) is the response type; `parentSummarySchema`; task input/context/result types; `AIScopeError` / `AIConfigError`.
- `src/lib/ai/prompts.ts` [NEW] - versioned prompt-template registry (`id` + `version`, recorded in every provenance row).
- `src/lib/ai/provenance.ts` [NEW] - `hashInput` (sha256 of sorted-key JSON, no raw PII), `recordAIRequest` -> one `AIRequest` row per call; never throws into the workflow (AI-007).
- `src/lib/ai/bank-fallback.ts` [NEW] - `selectApprovedBankQuestions`: fixed-scope read-only `prisma.question.findMany` per the Codex ack - `status in (REVIEWED,VERIFIED)`, `ownerScope in (PLATFORM,TENANT_PRIVATE)`, `tenantId = ctx OR null`, `type = SINGLE_CORRECT`, concept + difficulty match, `take` clamped 1..20. Maps rows -> `GeneratedQuestion` (`source:"BANK"`, `status:"AI_CANDIDATE"`); skips rows whose `correctAnswer` is not a single letter.
- `src/lib/ai/ai-gateway.ts` [REWRITE] - `AIGateway.generateQuestions(input, ctx)` and `AIGateway.parentSummary(input, ctx)`:
  - question path: prompt -> Gemini call with `AbortController` timeout (`AI_CALL_TIMEOUT_MS`, default 20000) -> `modelQuestionListSchema` validation -> map + re-validate with `generatedQuestionSchema`; **any** miss (no key / http error / parse / schema / one bad item / exception) -> `selectApprovedBankQuestions`. `outcome` is `MODEL` or `FALLBACK_BANK`; `shortfall = count - returned`.
  - parent path: deterministic `en`/`hi`/`mr` template only (no model wired yet); `outcome: "FALLBACK_TEMPLATE"`; restates authoritative numbers, never computes.
  - **`getDeterministicCandidates` and the hard-coded physics/chemistry/maths bodies are deleted** (the physics one shipped `15 N <= 7.84 N` as the correct answer). `grep` for `getDeterministicCandidates|block of mass|bond order|Taylor series` in `src/` -> no matches.
- `tests/ai-gateway.test.ts` [NEW] - 8 tests: AC-007 (no key -> bank only, never fabricated; asserts old fabricator strings absent), AC-003 (candidates are `AI_CANDIDATE` though backing rows are `VERIFIED`), AC-015 (tenant A never sees tenant B private rows; platform bank shared; count proves no leak), shortfall path, provenance row written + linked into candidates, and two schema-rejection unit tests.

## Checks

- `npx tsc --noEmit` -> exit 0.
- `npm test` -> 11 files / 58 tests pass (added 8; no existing test changed).
- `npx prisma generate` currently hits `EPERM` on the Windows engine `.dll` rename because other processes in the shared checkout hold it; the generated **types** already include `AIRequest`/`AIFeedback` (from Codex's `0b1451a`), so tsc and tests are unaffected. A clean `prisma generate` will succeed once no dev server / vitest worker holds the engine.

## Back-compat shims (Codex removes on route migration)

`AIGateway.generateQuestionCandidates(params)` and `AIGateway.generateParentReportSummary(req)` are kept with their **exact previous signatures/return types** so `src/app/api/v1/questions/generate/route.ts` and `src/app/api/v1/parent/portal/route.ts` compile unchanged. They synthesize a `SYSTEM` context and drop `outcome`/`shortfall`.

**Codex route follow-up (AI-001 section 8.3):** migrate both routes to `generateQuestions(input, ctx)` / `parentSummary(input, ctx)` with the real session ctx, enforce required `subject`/`chapter`/`concept` (400) and `count` 1..20, return `{ candidates, outcome, shortfall? }`, then delete the two shims. `parent/portal` should also stop hardcoding `totalStudents: 30` (analysis #9) - pass the real cohort size.

## Next

- Codex: route migration above; optionally add `AIFeedback` write path for UI-012.
- Antigravity: UI-012 consumes `GeneratedQuestion` (`source`, `provenance`, `status: "AI_CANDIDATE"` visible; `shortfall` shown when > 0).
- Claude: CLD-004 (E2E harness under `tests/e2e/**`) is the next unblocked Claude task.
