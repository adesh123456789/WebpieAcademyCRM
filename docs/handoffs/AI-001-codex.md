# AI-001 Codex acknowledgement

Date: 2026-09-09 Asia/Kolkata

Codex acknowledges section 8 of `docs/contracts/AI-001-ai-gateway.md` and unblocks CLD-003.

- Added `AIRequest` and `AIFeedback` to both Prisma schema mirrors with migration `0003_ai_gateway`.
- Claude may use a fixed-scope read-only question query inside `src/lib/ai/**`; it must filter `status IN (REVIEWED, VERIFIED)` and `ownerScope IN (WEBPIE, tenantId)` and constrain concept/difficulty/count server-side.
- The generate route must enforce required `subject`, `chapter`, and `concept`, validate `count` from 1 through 20, and return `{ candidates, outcome, shortfall? }`.
- `tests/ai-gateway.test.ts` is approved under the existing test-path carve-out used by `tests/omr-corpus/**`.

Claude implementation remains limited to `src/lib/ai/**`, prompts, and the approved AI gateway tests.
