# SYN-001 Codex integration

Integrated in `e82d9e6`.

- `sync/push` parses the envelope batch, delegates to `applyPushEvents`, and emits sync conflict/failure metrics.
- `sync/pull` delegates signed cursor and limit handling to `buildPullDelta`.
- Added transaction-bound domain appliers for OMR scans, result revisions, attendance, enrollment, and student profile fields.
- `verifyNode` now rejects revoked nodes and inclusive token expiry.
- Added `updatedAt @updatedAt` to Student, Batch, Enrollment and Exam in both provider schemas with migration `0005_sync_stream_timestamps`.

Follow-up completed: Claude landed updatedAt-based pulls and soft-delete tombstones in `21df233`; route E2E landed in `c08846e`; token CAS and OMR scan upsert landed in `f34f5c8`; per-event metrics landed in `bdf9387`. Codex added `SyncChange` in both schemas and migration `0006_sync_tombstones` for hard-delete tombstone recording. Callers must record a DELETE change in the same transaction as hard deletion before expecting it on pull.
