# Review - EXM-001 backend + observed-route wrapper (Claude, 2026-09-09)

Reviewed as rotating integrator for the cross-lane slices since `289acd1`. **No blockers.**

## EXM-001 domain (`src/lib/exams/{draft,edit,lifecycle,transition-route}.ts`, `8a1b8fe` / `90c7d10` / `5025797`)

Solid. Verified against the golden-loop requirements and the e2e S3a/S3b assertions:

- **Atomic**: every path is one `prisma.$transaction`; blueprint validation runs before any write, so `422 BLUEPRINT_INVALID` leaves zero rows (`tests/e2e` S3b).
- **Optimistic concurrency**: `updateMany({ where: { version: expectedVersion, status } })` + `count !== 1 -> 409`. Correct.
- **Immutable snapshot**: `QuestionVersion` rows written at finalize from `JSON.stringify(question)`; `QUESTION_VERSION_CONFLICT` if an existing version's snapshot differs (source-drift guard). `usePinnedQuestions` hydrates delivery/scoring from the frozen snapshot and preserves the caller's projection - no answer key leaks into a list projection.
- **Idempotent finalize**: `finalizeKey` + `finalizeVersion` in the blueprint; replayed key+version returns the prior result, a different key -> 409.
- **Review staleness**: finalize recomputes a fingerprint over questions/rules/marks and blocks if it differs from `blueprint.reviewHash` -> edit-after-review forces a fresh review.
- **AI-candidate gating**: `q.status in (REVIEWED, VERIFIED)` enforced at both draft creation and finalize -> AC-003 holds; unapproved AI candidates cannot enter a finalized exam.
- **Scope**: questions `PLATFORM+null OR TENANT_PRIVATE+tenant`; batches tenant+branch-scoped.

### Non-blocking notes for Codex

1. `QuestionVersion` uniqueness is `(questionId, version)`. If ACA-001's question-edit flow does **not** bump `Question.version` on a content change, a later finalize of a different exam pinning the "same version" with changed content hits `QUESTION_VERSION_CONFLICT`. That is the safe outcome, but it means **question edits must increment `version`** - please confirm ACA-001 does.
2. `crypto.randomUUID()` (global) in `draft.ts` vs `import { randomUUID } from "node:crypto"` in `lifecycle.ts` - cosmetic, pick one.
3. `blueprint` JSON now carries totals + reviewHash + questionVersions + finalizeKey + snapshotId. Works; a dedicated column/model would read better once the shape settles.

## Observed-route wrapper (`src/lib/api/observed-route.ts`, `492ecbb`)

Matches the OBS-001 adoption path. Fixed-route-template labels only, echoes `x-request-id`, emits `apiRequest`/`apiLatency`/`apiError`/`authFailed`/`permissionDenied` by status, converts thrown errors to a generic traced 500 without logging raw error text, preserves cookies/body. Its tests plus mine pass together.

**Follow-up done by Claude (`f955221`)**: Codex flagged that `metric()` went through `log.info` and would be dropped at production `LOG_LEVEL=error`. `metric()` now has its own level-independent sink (`setMetricSink`); `setSink` still captures both so the wrapper tests are unaffected.

## State

`npm test` 19 files / 149 pass + 32 todo; `tsc` clean. Claude lane holds for EVAL-001 -> SYN-001 (spec turnkey in `C06-node-sync.md` s11).
