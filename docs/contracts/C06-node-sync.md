# C06 - Academic Node <-> Cloud sync contract (proposal)

- **Producer**: Claude (`src/lib/sync/**` + event model) and Codex (Prisma tables + route wiring)
- **Consumers**: the future Windows local runtime (EDGE-001); admin fleet UI (UI-011)
- **Status**: PROPOSAL - needs Codex ack of the schema asks in section 8. Unblocks SYN-001 (which also waits on EVAL-001).
- **PRD**: Section 32 (sync), Section 33-34 (Academic Node), SYNC-001..005, AC-013 / AC-014 / AC-020.

Fixes the prototype gaps recorded in `docs/PROJECT_ANALYSIS.md` #7: `generatePullDelta` ignores its `since` filter and returns the whole tenant roster to a branch node; `verifyNode` never checks `tokenExpiresAt`; `ingestPushDelta` has no event ids, re-`create`s `MasteryEvidence` on replay, and last-write-wins upserts a FINALIZED `ExamResult`; `SyncQueueItem` is defined but unused.

## 1. Principles

- Local writes become **durable, idempotent events** with a client-generated `eventId`.
- The cloud applies each `eventId` **exactly once**; a replay is a no-op that returns the first outcome.
- Cloud->node changes arrive through a **resumable pull cursor**, scoped to the node's tenant **and branch**.
- **Finalized exam responses / results and payments are append/revision-oriented** - never last-write-wins.
- Admin always sees node last-sync time, pending queue size, and conflict/failed counts.

## 2. Event envelope

```ts
SyncEventEnvelope = {
  eventId: string,        // client-generated ULID or uuid; the idempotency key
  entityType: "OMR_SCAN" | "EXAM_RESULT" | "ATTENDANCE_RECORD" | "ENROLLMENT" | "STUDENT_PROFILE_FIELD",
  entityId: string,       // logical id of the target entity
  entityVersion: number,  // per-(entityType,entityId) monotonic counter on the node
  op: "UPSERT" | "DELETE" | "APPEND",
  occurredAt: string,     // ISO, node clock (advisory only; never authoritative for scoring)
  payload: unknown        // validated per entityType by src/lib/sync schemas (zod)
}
```

Cloud persists one `SyncEvent` row per received envelope regardless of outcome (see section 8).

## 3. Push - `POST /api/v1/sync/push`

- Auth: `Authorization: Bearer node_<pairingToken>` (see section 6). Body: `{ events: SyncEventEnvelope[] }` (node sends them in causal order; max 500/request).
- Per event, in array order:
  1. Look up `SyncEvent` by `eventId`. **Exists** -> return `{ eventId, status: "DUPLICATE", appliedVersion }`, no side effect.
  2. New -> load the target entity's stored version. If `entityVersion <= storedVersion`:
     - profile field: apply last-write-wins **with an audit row**, `status: "APPLIED"`.
     - `EXAM_RESULT` / finalized `OMR_SCAN` / payment: **do not apply**. `status: "CONFLICT"`, `conflictReason: "STALE_VERSION"`, raise a review/unlock task. Never mutate a `FINALIZED` result in place.
  3. Otherwise apply the op and write `SyncEvent { status: "APPLIED", appliedVersion: entityVersion }`.
- `MasteryEvidence` derived from an applied `EXAM_RESULT` event is tagged with `sourceEventId`; a replay never creates duplicate evidence.
- Response: `{ results: [{ eventId, status, appliedVersion?, conflictReason? }], serverCursor }` where `status in APPLIED | DUPLICATE | CONFLICT | REJECTED`.

## 4. Pull - `GET /api/v1/sync/pull?cursor=<opaque>&limit=<n<=500>`

- Returns entities changed since `cursor`, **scoped to `node.tenantId` and, when `node.branchId` is set, that branch only** (students/batches/exams/enrollments filtered by branch; curriculum + answer keys are tenant/platform-wide).
- `cursor` is an opaque server token encoding a `(updatedAt, id)` high-water mark; monotonic and resumable after a long outage. Absent cursor = full snapshot.
- Deletes are explicit: `{ entityType, entityId, deletedAt }` entries, not omissions.
- Response: `{ changes: { students, batches, exams, curriculum, deletes }, nextCursor, hasMore }`.
- The free-form `?since=<date>` param is removed (it was never applied).

## 5. Conflict policy (per PRD 32.1)

| Entity | Policy |
|---|---|
| Student non-critical profile field | version check; last-write-wins allowed **with audit** |
| Enrollment / batch membership | both sides changed -> `CONFLICT`, explicit resolution task |
| Exam draft | version conflict -> node keeps latest/merge; cloud never silently overwrites |
| Finalized responses / results | never overwrite; `CONFLICT` -> revision/unlock flow |
| Payment | idempotent immutable transaction + reversal; replay = `DUPLICATE` |

## 6. Node auth, expiry, revocation

- `verifyNode` **must** reject when `tokenExpiresAt < now` -> `401 NODE_TOKEN_EXPIRED`.
- Add `AcademicNode.revokedAt`; non-null -> `403 NODE_REVOKED` on every sync call.
- Pairing-token TTL drops to 90 days. `POST /api/v1/sync/handshake` refreshes/rotates the token before expiry (old token invalid immediately after).
- **Should (v1.1):** request signing - `X-Node-Signature: hex(HMAC-SHA256(rawBody, pairingToken))` + `X-Node-Timestamp` (reject clock skew > 5 min) to stop token-only replay. v1 ships bearer-only; the helper (`verifyNodeSignature`) lands in `src/lib/sync/**` disabled behind a flag.
- Every push/pull updates `lastSeenAt`.

## 7. Invariants / tests (SYNC-001..005, Claude adds `tests/sync/**`)

- SYNC-001: replayed `eventId` -> no duplicate payment / result / attendance / mastery evidence.
- SYNC-002: per-entity `entityVersion` strictly increasing; stale or out-of-order events are `CONFLICT`/`DUPLICATE`, never applied.
- SYNC-003: `GET /api/v1/sync/nodes` exposes `lastSyncAt`, pending outbox size, conflict count, failed-event count per node.
- SYNC-004: after a simulated outage, pull-from-cursor + push-outbox drains with no manual DB edits (AC-014).
- SYNC-005: automated suite covers concurrent edits and duplicate delivery.
- AC-013: internet disabled before OMR processing -> local workflow completes and queues events; AC-020: node update fails health check -> rollback (EDGE-001).

## 8. Asks for Codex (blocking ack)

1. New Prisma model `SyncEvent` in **both** schema mirrors + migration:

```
SyncEvent {
  id             String   @id @default(uuid())
  eventId        String   @unique
  nodeId         String
  tenantId       String
  branchId       String?
  entityType     String
  entityId       String
  entityVersion  Int
  op             String
  payloadHash    String
  status         String   // APPLIED | DUPLICATE | CONFLICT | REJECTED
  conflictReason String?
  receivedAt     DateTime @default(now())
  appliedAt      DateTime?
  @@index([nodeId, receivedAt])
  @@index([tenantId, entityType, entityId, entityVersion])
}
```

2. `AcademicNode`: add `revokedAt DateTime?` and `pullCursor String?` (or a `SyncCursor` model if you prefer per-stream cursors).
3. `MasteryEvidence`: add `sourceEventId String?` (+ index) so replayed result events don't duplicate evidence. Same idea for `ExamResult` if a result can be superseded by a revision.
4. Route wiring: `sync/push` and `sync/pull` consume the envelopes/cursor above and delegate apply/scope logic to `src/lib/sync/**`; `sync/handshake` gains token rotation; drop the unused `SyncQueueItem` write paths on the cloud side (keep the model for node-local outbox docs).
5. Confirm Claude may add `tests/sync/**` under the `tests/omr-corpus/**`-style carve-out.

## 9. Ownership

- Claude: `src/lib/sync/**` - zod envelope + per-entity payload schemas, `applyPushEvents()`, `buildPullDelta(cursor, node)` with branch scope, conflict classifier, `verifyNodeSignature` helper, cursor encode/decode; `tests/sync/**`.
- Codex: Prisma models + migration (section 8), route handlers, `verifyNode` expiry/revocation, handshake rotation.
- EDGE-001 (Claude, later): node-side local store, outbox/inbox, retry, signed updater.

## 10. Error envelope

`{ "error": { "code": "NODE_TOKEN_EXPIRED" | "NODE_REVOKED" | "SYNC_VERSION_CONFLICT" | "SYNC_OUT_OF_SCOPE", "message": "<user-safe>", "traceId": "<id>" } }` - consistent with C01.
