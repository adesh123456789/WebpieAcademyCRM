# OMR-002 Codex Handoff

Status: IN_PROGRESS — finalize safety floor and review revisions landed.

Commit `775d937` adds an `OMRScan.version` revision column in both Prisma schema mirrors and migration `0008_omr_scan_revision`. The override route now rejects finalized jobs, enforces `expectedVersion` when supplied, atomically increments the scan revision, and returns `409` on stale concurrent edits.

Commit `e90b4b4` updates the real OMR finalize handler so it returns `409` whenever:

- any scan is not terminal `CONFIDENT` or `OVERRIDDEN` (including unknown/processing states),
- fewer scans than `job.totalSheets` have been ingested, or
- the job remains `PROCESSING` / `REVIEW_REQUIRED`.

This prevents partially ingested offline batches from finalizing as confident results. The EDGE-001 offline reconnect path is covered by `tests/e2e/offline-node.e2e.test.ts` and remains green.

Validation: OMR unit + offline route E2E (8 tests passed); `npx tsc --noEmit` passed.

Remaining OMR-002 integration work is a full S7 route assertion covering review override, blocked finalize, and same-key replay with exactly one logical result set.
