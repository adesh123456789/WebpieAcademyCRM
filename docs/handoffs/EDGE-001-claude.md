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

## Update - local store + health guard + offline session (`458e528`, OMR-002 now landed)

- `src/lib/node/local-store.ts` - `NodeStore` contract (pairing, cached roster/exams, local scans, durable outbox, pull cursor, `applyDelta`) + `MemoryNodeStore` reference impl.
- `src/lib/node/health.ts` - `checkNodeHealth` / `assertHealthyForHeavyJob`. **Disk guard PAUSEs a heavy job on low storage (AC-020)**; memory-low is WARN only (`os.freemem()` ignores reclaimable cache, so it is an unreliable stop signal - deployments can opt into a mem PAUSE via thresholds).
- `src/lib/node/offline-session.ts` - `OfflineSession(store)`:
  - `reconnect({ pull })` - loops `buildPullDelta` pages into the store, advances + persists the pull cursor.
  - `ingestScan()` - raster + deterministic extraction -> `store.putScan` + an `OMR_SCAN` outbox event; roll -> studentId resolved from the cached roster. Health-guarded.
  - `evaluateExamLocally()` - advisory local deterministic score for the offline teacher view (NOT authoritative; the cloud re-evaluates on sync via OMR-002's finalize).
  - `reconnect({ push })` - `drainOutbox` -> `POST /api/v1/sync/push` -> `store.dequeue(delivered)`.
  - `toCachedExam()` helper (cloud exam row -> `CachedExam`).
- `tests/e2e/offline-session.e2e.test.ts` (5) - pull roster -> offline ingest + local eval -> reconnect drains through the real push route (OMRScan rows land), idempotent re-reconnect, cursor advance, disk-PAUSE refuses ingest.

## Update - request signing + encrypted secrets (`f0f5ef1`)

- `src/lib/node/transport.ts` - `signedHeaders(rawBody, token)` (`Authorization: Bearer` + `X-Node-Signature` = HMAC-SHA256 over `ts.body` + `X-Node-Timestamp`, C06 s6) and `makeNodeTransport({ baseUrl, pairingToken, fetchImpl? })` -> a signed `{ push, pull }` the `OfflineSession` consumes. `fetchImpl` injectable.
- `src/lib/node/secrets.ts` - `NodeSecrets` abstraction: `MemorySecrets` (dev/test), **`EncryptedFileSecrets`** (AES-256-GCM at rest, key = `NODE_ENCRYPTION_KEY`, file mode `0600`), `OsKeychainSecrets` seam (throws - platform adapter TODO). The pairing token never touches plaintext env/logs (SEC-006).
- `src/lib/sync/node-auth.ts` - `verifyNodeRequest(rawBody, headers, node, { requireSignature })`: bearer-only when no signature headers and not required; otherwise enforces `verifyNodeSignature`. Enable per deployment via `SYNC_REQUIRE_NODE_SIGNATURE=1`.
- 15 tests (`tests/sync/node-transport.test.ts`, `node-secrets.test.ts`): signature round-trip / tamper / skew, `verifyNodeRequest` modes, transport push/pull with injected fetch, AES round-trip / wrong-key / tamper / token-never-plaintext.
- **Note:** `f0f5ef1` also swept in uncommitted `src/app/page.tsx` + `CopilotActionPreviewModal.tsx` changes that were staged in the shared checkout by another agent's process - that Copilot-UI work is now committed; no need to re-commit it. tsc + full suite green.

## Remaining EDGE-001

- Windows process + local API on localhost/LAN, tenant-paired (thin wrapper over `OfflineSession`).
- SQLite-backed `NodeStore` (same interface; needs a `better-sqlite3` / Prisma-SQLite dependency decision - Codex/package.json).
- Node calls sign requests with `verifyNodeSignature` (helper already in `src/lib/sync/node-auth.ts`); pairing token stored via OS-secure mechanism.
- Signed update manifest + rollback (AC-020 update path) - needs packaging decisions.
- Trigger cloud finalize from the node after `reconnect(push)` so the authoritative result exists.

## Checks

`npx tsc --noEmit` exit 0; `npm test` 30 files / 246 pass + 32 todo.
