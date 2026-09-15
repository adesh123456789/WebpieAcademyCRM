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

## Update - durable SqliteNodeStore (2026-09-15)

`docs/contracts/NODE-STORE-SQLITE.md` landed (Codex) naming the tables but leaving the driver open ("existing Prisma SQLite dependency" vs. `better-sqlite3`). Picked it up and **overrode that note** - see the doc comment atop `src/lib/node/sqlite-store.ts` for the full reasoning, short version:

- `NodeStore` is a *synchronous* interface by design (`OfflineSession.ingestScan`/`.evaluateExamLocally` call it un-awaited, so bubble-sheet capture on constrained pilot hardware never blocks on I/O scheduling). `@prisma/client` is async-only - durability through it would force `NodeStore` async and break `OfflineSession` + every existing caller/test.
- `better-sqlite3` would preserve the sync contract but is a native module needing a build toolchain on every pilot machine and in the Docker image.
- **Chose `node:sqlite`** - Node's built-in synchronous driver (stable, unflagged since Node 22.5; this repo runs Node 24). Zero new dependency, zero native compile step. Still experimental upstream (one-line warning) - pin the Node version the packaged node runtime ships with and re-check before a Node major bump.

Landed:
- `src/lib/node/crypto.ts` [NEW] - shared AES-256-GCM `encryptString`/`decryptString`, factored out so the pairing token gets the same at-rest treatment in both `EncryptedFileSecrets` (file) and `SqliteNodeStore` (DB column) without duplicating cipher code. `secrets.ts` itself is untouched (zero regression risk to its existing tests).
- `src/lib/node/sqlite-store.ts` [NEW] - `SqliteNodeStore implements NodeStore`. Tables per the contract (`node_pairing` singleton `id=1`, `cached_student`, `cached_exam`, `local_scan`, `outbox_event`, `node_metadata` for pull cursor + schema version), created with `CREATE TABLE IF NOT EXISTS` migrations on construction. Pairing token is AES-256-GCM sealed before it touches the row - never plaintext on disk (contract requirement, tested). `applyDelta` deliberately mirrors `MemoryNodeStore`: only `changes.students` are upserted (raw cloud `Exam` rows in `changes.exams` are unjoined - not the `CachedExam` shape `putExam` expects, so a full exam refresh still goes through `toCachedExam()` explicitly); both entity types honour tombstones. `dequeue`/`applyDelta` run inside `BEGIN`/`COMMIT`/`ROLLBACK` per the contract's transactional requirement.
- `src/lib/node/node-sqlite.d.ts` [NEW] - minimal ambient typings for `node:sqlite` (the shared `@types/node@^20` predates this module). Loaded via `process.getBuiltinModule("node:sqlite")` rather than a static `import` - Vite/vitest's builtin-module check doesn't yet recognise this very new core module and tries to resolve it as an npm package; a runtime lookup sidesteps that (and would sidestep the same problem in a webpack/Next bundle, if this module is ever reached from one).
- `tests/sync/node-sqlite-store.test.ts` [NEW] (7) - the store's own contract in isolation: empty-store reads, pairing singleton (replace not duplicate), exam/student/scan round-trip + upsert, outbox idempotency/ordering/dequeue, pull cursor, `applyDelta` transactional upsert+tombstone, missing-key failure.
- `tests/e2e/offline-session-sqlite.e2e.test.ts` [NEW] (6) - the same `OfflineSession` flow as `offline-session.e2e.test.ts` but over `SqliteNodeStore`, proving it's a true drop-in: roster caching, ingest + local score + drain through the real `POST /api/v1/sync/push`, **a simulated process restart** (close the store, reopen the same file, pairing/roster/queued-outbox-event all intact), the pairing token verified absent from the raw on-disk bytes (main file + WAL) with a wrong-key open failing closed, and missing-key refusal.

## Remaining EDGE-001

- Windows process + local API on localhost/LAN, tenant-paired (thin wrapper over `OfflineSession`, now with `SqliteNodeStore` as its durable store).
- Node calls sign requests with `verifyNodeSignature` (helper already in `src/lib/sync/node-auth.ts`); pairing token stored via OS-secure mechanism (or `SqliteNodeStore`'s sealed column, now that it exists).
- Signed update manifest + rollback (AC-020 update path) - needs packaging decisions.
- Trigger cloud finalize from the node after `reconnect(push)` so the authoritative result exists.

## Checks

`npx tsc --noEmit` exit 0; `npm test` 38 files / 317 pass + 16 todo (all `browser-golden-workflow`, UI lane).
