# ACA-001 Codex progress

Date: 2026-09-09 Asia/Kolkata

The approved question-bank selector required by AI-001 is available at `src/lib/ai/bank-fallback.ts`. It is read-only and enforces:

- `status` in `REVIEWED` or `VERIFIED`
- platform rows (`tenantId = null`) or the authenticated tenant
- requested concept and difficulty
- bounded count from 1 through 20

This fixed-scope helper is the approved alternative to exposing Prisma directly in the AI gateway. ACA schema primitives (`QuestionVersion`, `CurriculumQuestionMapping`) and migrations are integrated in `023dea7`.

Next implementation slice is EXM-001: consume immutable question version IDs in draft/review/finalize flows, validate blueprint totals, and reject unapproved AI candidates.
