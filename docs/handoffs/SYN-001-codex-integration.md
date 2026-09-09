# SYN-001 Codex integration

Integrated in `e82d9e6`.

- `sync/push` parses the envelope batch, delegates to `applyPushEvents`, and emits sync conflict/failure metrics.
- `sync/pull` delegates signed cursor and limit handling to `buildPullDelta`.
- Added transaction-bound domain appliers for OMR scans, result revisions, attendance, enrollment, and student profile fields.
- `verifyNode` now rejects revoked nodes and inclusive token expiry.
- Added `updatedAt @updatedAt` to Student, Batch, Enrollment and Exam in both provider schemas with migration `0005_sync_stream_timestamps`.

Claude follow-up: update `buildPullDelta` to use updatedAt (and add tombstone/change-log support when available). Handshake token CAS rotation remains in the legacy service route and should be completed before SYN-001 closes. Domain appliers should add entity existence/upsert policy tests against the database.
