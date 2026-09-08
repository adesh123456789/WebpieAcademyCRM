# CLD-003 / Claude - AI Gateway hardening

- **Task / owner**: CLD-003 (AI Gateway hardening, split from AI-001) / Claude
- **Timestamp + timezone**: 2026-09-09 Asia/Kolkata
- **Status**: BLOCKED on Codex ack of contract `AI-001` (section 8). Contract published this commit.
- **Base**: `44aa894` on `master`.

## What is published now

- `docs/contracts/AI-001-ai-gateway.md` - full gateway contract.
- `docs/contracts/README.md` - AI-001 row added to the register.

## What CLD-003 will implement (Claude, in `src/lib/ai/**` + `tests/ai-gateway.test.ts`)

1. Single `AIGateway.run(task, input, ctx)` path: scope -> prompt template -> model call (20s timeout) -> **zod output validation** -> provenance write -> return; failure -> safe fallback.
2. Runtime schemas for `question.generate` and `report.parentSummary` (AI-001 section 2). Invalid model output is discarded, fallback runs, raw payload logged with `traceId` only.
3. **Delete `getDeterministicCandidates`** and the hard-coded physics/chem/maths bodies (the physics one ships `15 N <= 7.84 N` as a correct answer). Replace with `selectApprovedBankQuestions(...)` -> `Question` rows `status in (REVIEWED, VERIFIED)`, `source: "BANK"`, `status: "AI_CANDIDATE"`, `shortfall` when the bank is short.
4. Parent summary keeps the existing deterministic `en`/`hi`/`mr` templates as the fallback (`outcome: "FALLBACK_TEMPLATE"`); the model may only rephrase deterministic numbers, never compute them.
5. `src/lib/ai/prompts/*` - versioned static prompt-template registry (`promptTemplateId` + `promptTemplateVersion` in every provenance record).
6. Provenance: write one `AIRequest` row per call (`outcome` MODEL | FALLBACK_BANK | FALLBACK_TEMPLATE | ERROR, `latencyMs`, `inputHash` = sha256 of normalized input, no raw PII).
7. Negative tests: AC-003 (candidate cannot enter finalized exam - assert `status: "AI_CANDIDATE"`), AC-007 (core generate works with keys unset -> bank fallback, never fabrication), AC-015 (tenant B `concept`/context never retrieved for tenant A).

## Blocking asks for Codex (AI-001 section 8)

1. `AIRequest` + `AIFeedback` in `prisma/schema.prisma` **and** `prisma/schema.postgresql.prisma` (parity guard `scripts/check-schema-parity.mjs` enforces the mirror) + migration.
2. `selectApprovedBankQuestions({ tenantId, concept, difficulty, count }): Promise<Question[]>` from the question-bank module, or bless a fixed-scope read-only `prisma.question.findMany` inside `src/lib/ai/**`.
3. `questions/generate` route: `count` 1..20 validation, stop defaulting `subject`/`chapter`/`concept` silently (400 on missing), consume `{ candidates, outcome, shortfall }`.
4. Confirm `tests/ai-gateway.test.ts` under the `tests/omr-corpus/**`-style carve-out.

## Next action

- Codex: ack or amend AI-001 section 8 in a handoff; add the two Prisma models + helper. Then CLD-003 implementation starts in `src/lib/ai/**` only.
- Claude: while blocked, available for CLD-004 (E2E harness scaffold under `tests/e2e/**`) against the synthetic fixture world.
