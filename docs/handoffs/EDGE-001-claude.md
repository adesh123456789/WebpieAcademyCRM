# EDGE-001 / Claude - offline pipeline groundwork

- **Task / owner**: EDGE-001 (Windows Academic Node) / Claude. Board dep is OMR-002; the runtime-independent core (offline scan -> outbox -> reconnect -> sync) is buildable now against the shipped engines + sync services, so it is started here.
- **Timestamp + timezone**: 2026-09-09 Asia/Kolkata
- **Status**: PARTIAL - offline assessment loop as a pure library; runtime packaging (process, local SQLite store, signed updater/rollback, disk guard) waits on OMR-002.
- **Base**: `4a70c01`.

## Landed

- `src/lib/node/offline-pipeline.ts` [NEW]
  - `processOfflineScan({ image, geometry, scanId, jobId, entityVersion, supported })` -> `{ extraction, outboxEvent }`. Runs `extractSheetFromImage` (raster + deterministic engine). `REJECTED` / `UNMATCHED` -> `outboxEvent: null` (held on the node for review, not synced). Otherwise emits an `OMR_SCAN` `SyncEventEnvelope` (`eventId` = uuid, payload = `jobId` + detected roll/responses + `confidenceScore` + status).
  - `drainOutbox(events, push, batchSize?)` -> `{ delivered, retained }`. Ordered batches; `APPLIED` / `DUPLICATE` -> delivered (drop), `CONFLICT` / `REJECTED` / undelivered -> retained; a thrown `push` retains the whole remaining outbox for retry. Idempotent - a reconnect replay of an applied event returns `DUPLICATE` and is still "delivered".
- `tests/e2e/offline-node.e2e.test.ts` [NEW] - 4 tests: outbox event for a readable sheet; fail-safe sheet held with no event; **full offline -> reconnect -> drain through the real `POST /api/v1/sync/push`** (scan row created in DB with correct responses), idempotent replay, stale-version retained, transport-failure retains the outbox.

## Bug fixed in passing

`src/lib/sync/schemas.ts` `omrScanPayload` did not match the `OMR_SCAN` domain applier: the schema had `examId` / `studentRollNumber` / `confidenceScores` (record) and **no `jobId` / `status`**, so `parsePushBatch` stripped `jobId` and every real OMR scan sync went `REJECTED` (the applier's `upsert` create needs `jobId`). Schema now is `{ jobId, studentId?, detectedRollNumber?, detectedResponses, verifiedResponses?, confidenceScore, status, scannedAt? }` - aligned to the applier and the offline node. The `sync-node` E2E passed before only because it used `ENROLLMENT` events.

## Remaining EDGE-001 (blocked on OMR-002)

- Windows process + local API on localhost/LAN, tenant-paired.
- Local SQLite store: cached roster/exams from `buildPullDelta`, durable outbox table (currently `SyncEventEnvelope[]` in memory).
- Local deterministic evaluation on synced results; cloud finalize integration once OMR-002's retry-safe job path lands.
- Signed update manifest + rollback; disk/RAM health guard (AC-020).
- `verifyNodeSignature` (already in `src/lib/sync/node-auth.ts`) enabled on the node's push/pull calls.

## Checks

`npx tsc --noEmit` exit 0; `npm test` 30 files / 246 pass + 32 todo.
