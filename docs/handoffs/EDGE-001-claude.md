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

## Update - the Windows process itself (2026-09-15)

The remaining "thin wrapper over OfflineSession" is landed and actually runs -
`npm run node:start` starts a real process, listens on a real port, and
serves real requests (verified by hand, then covered by tests below).

- `src/lib/node/http-adapter.ts` [NEW] - `toNodeHandler` bridges Node's raw
  `http.Server` to a `(Request) => Promise<Response>` WebHandler - the exact
  same shape the cloud's Next.js route handlers already use (and
  `tests/e2e/support/harness.ts`'s `call()` already drives), so the node's own
  routes are written and tested identically to the rest of this codebase. No
  framework, no new dependency for this part.
- `src/lib/node/node-api.ts` [NEW] - `createNodeApi(ctx)`: `GET /health`,
  `POST /pair` (calls the cloud's real `/api/v1/sync/handshake`, then
  `store.setPairing(...)` - `SqliteNodeStore` already seals the token at rest,
  so no separate `NodeSecrets` file is wired in here; `secrets.ts` remains a
  valid seam for a future OS-keychain swap, just not this runtime's source of
  truth), `GET /status`, `POST /scans` (raw image bytes + `?jobId&scanId` ->
  `decodeGrayscale` -> `OfflineSession.ingestScan`), `GET
  /jobs/:jobId/local-score`, `POST /sync` (builds a fresh `makeNodeTransport`
  from the current pairing and calls `OfflineSession.reconnect`). Not
  multipart/form-data - raw body + query params, since this API has exactly
  one caller this repo controls end to end so far.
- `src/node-runtime/main.ts` [NEW] - the actual process: env config
  (`NODE_PORT`, `NODE_DATA_DIR`, `NODE_CLOUD_BASE_URL`, `NODE_ENCRYPTION_KEY`,
  `NODE_SYNC_INTERVAL_MS`), wires `SqliteNodeStore` + `OfflineSession` +
  `createNodeApi` to `http.createServer`, runs a best-effort background sync
  timer (`unref()`'d, never keeps the process alive on its own, never lets a
  failed cloud round-trip crash it), clean `SIGINT`/`SIGTERM` shutdown.
  `npm run node:start` (added `tsx` as a devDependency to run it - zero build
  step for dev; packaging into a real distributable still needs a compile
  step, see below).
- `src/lib/omr/image-decoder.ts` - the PDF branch's `import("./pdf-render")`
  is now dynamic, not a static top-level import: `mupdf`'s real-ESM/top-level-
  await shape broke `tsx`'s transform pipeline the same way it broke Next's
  webpack bundle before `serverComponentsExternalPackages` (`docs/handoffs/CLD-005-ci-claude.md`)
  - lazy-loading it (already inside an `if (mimeType === "application/pdf")`
    branch, so this costs nothing on the PNG/JPEG path) sidesteps eager
  static-transform tooling generally, not just this one instance.
- `src/lib/sync/sync-service.ts` (Codex's file, narrow additive edit) -
  `pairNode`'s response now also includes `node.tenantId`/`node.branchId`
  (raw ids) alongside the existing `tenantCode`/`branchName` - `NodePairing`
  needs the actual ids for local bookkeeping, and the handshake route didn't
  expose them. Purely additive; existing tests assert individual fields, not
  full-object equality, so nothing broke.
- `tests/e2e/node-api.e2e.test.ts` [NEW] (11) - drives the local API exactly
  like a real caller (real `Request`/`Response` objects), with the cloud side
  going through the REAL route handlers (a `fetch` shim dispatches to
  `handshake`/`push`/`pull`, not mocks): pair -> status reflects it -> sync
  pulls the roster -> a real PNG upload decodes and queues an OMR_SCAN event
  -> local advisory score -> sync drains the event through the real push
  route and the scan lands in the DB -> an unpaired node's `/sync` is refused
  (409, not a silent no-op) -> 404 on an unknown route.
- `tests/sync/node-http-adapter.test.ts` [NEW] (4) - `toNodeHandler` over a
  REAL `http.Server` on a real loopback socket (not just calling the
  WebHandler directly): GET with query params, a POST with an arbitrary
  binary body round-tripping byte-for-byte, 404, and a thrown handler error
  becoming a clean 500 instead of a hung connection.

## Remaining EDGE-001

- **Real Windows packaging**: a signed, distributable executable/installer
  (`node:start`'s `tsx` dev-run is not that - needs a real compile step, e.g.
  `esbuild`/`pkg`, that this pass didn't build), a system-tray presence
  instead of a foreground process, and running as an actual Windows service
  (auto-start on boot, restart on crash) rather than something a person keeps
  a terminal open for.
- Signed update manifest + rollback (AC-020 update path) - needs packaging
  decisions that depend on the above.
- Trigger cloud finalize from the node after `reconnect(push)` so the
  authoritative result exists without a separate manual step.
- The local API is unauthenticated by design (trusted LAN, one controlled
  caller) - worth a pass once a real local UI/companion tool exists to call
  it, to decide whether that assumption still holds.

## Checks

`npx tsc --noEmit` exit 0; `npm test` 43 files / 352 pass + 16 todo (all `browser-golden-workflow`, UI lane). `npm run node:start` verified by hand: real process, real port, `/health`/`/status`/`/pair` respond correctly before any DB/cloud is involved.
