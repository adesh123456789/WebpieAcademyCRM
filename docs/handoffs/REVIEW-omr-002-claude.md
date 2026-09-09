# Review - OMR-002 (Claude, 2026-09-09)

Rotating-integrator review of OMR-002 as of `66d270c`. **Accepted.**

## Verified

- **`db37941` review-gate release**: after an override the route counts scans on the job not in `(CONFIDENT, OVERRIDDEN)`; when none remain and the job is `REVIEW_REQUIRED` it transitions to `READY`. The finalize route's block set is `PROCESSING`/`REVIEW_REQUIRED`, so `READY` proceeds. Fixes the permanent-409 bug I flagged.
- **Retry-safe finalize** (`40d01b6` + `e90b4b4`): `idempotencyKey` required (400 without); finalized job + same key -> `{ replay: true }`; finalized job + different key -> 409; optimistic `updateMany` claim + `count !== 1` -> 409. Blocked while any scan is non-terminal, sheets are missing (`totalSheets` vs ingested), or job is `PROCESSING`/`REVIEW_REQUIRED`.
- **Override revisions** (`775d937`): `OMRScan.version` column (migration `0008`); override rejects finalized jobs (409), enforces `expectedVersion` when supplied, atomically increments the revision, 409 on stale.
- **S7 golden-loop assertion** now live (`db37941` flipped my `it.todo`): finalize 200 + `examResult.count === 2`; replay `{replay:true}` with count unchanged (one logical result set); different key 409; post-finalize override 409.
- `result-persistence.ts` (my earlier review, fixed in `4a70c01`): now `prisma.$transaction`, and demotes prior `isFinal: true` before creating the new version.

`npx tsc --noEmit` clean; `npm test` 31 files / 260 pass + 29 todo; `tests/e2e/golden-workflow` 21 pass / 9 todo.

## Minor notes (non-blocking)

1. **`OMRJob.status = "READY"`** is a new value not in the model's `// status` comment (`"PROCESSING" | "REVIEW_REQUIRED" | ...`). Add it to the enum comment and to `UI-011`'s status map if it surfaces there.
2. **`result-persistence.ts` dedup** still compares only `score` + `questionResponses`. A pure re-rank (same score/responses, changed `cohortRank`/`cohortPercentile`) returns the stale row and skips the revision. Fine for answer-key correction (score changes); include rank/percentile or a result hash if cohort recomputation ever needs its own revision.
3. **`db37941` gate release** runs `oMRJob.update` / `oMRScan.count` outside the scan `updateMany` transaction. The override write is authoritative and the release is idempotent, so this is acceptable; worth folding into one `$transaction` if you touch this route again.

## Downstream

OMR-002 done -> **EDGE-001 unblocks** (deps SYN-001 Claude-half + OMR-002, both satisfied). Claude continues EDGE-001: local store + cloud-finalize integration on top of the retry-safe finalize path. INT-001 unblocks for Codex.
