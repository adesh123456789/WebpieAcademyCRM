# SYN-001 / Claude - sync services pure core

- **Task / owner**: SYN-001 (`src/lib/sync/**` + event model) / Claude. Codex owns the `SyncEvent` Prisma model, route wiring, `verifyNode` expiry/revocation, handshake rotation.
- **Timestamp + timezone**: 2026-09-09 Asia/Kolkata
- **Status**: PARTIAL - the pure, schema-independent core is landed. `applyPushEvents` / `buildPullDelta` are blocked on Codex's `SyncEvent` model + EVAL-001's result-revision model.
- **Base**: `6f3cdc4`. Contract: `docs/contracts/C06-node-sync.md` (amendments in section A, signatures in section 11).

## Landed (`src/lib/sync/**`, + `tests/sync/**` carve-out acked in `0d9cd7f`)

| File | Purpose |
|---|---|
| `types.ts` | `SyncEventEnvelope`, `NodeContext`, `PerEventResult`, `DomainApplierMap`, `SyncError` (C06 s2/s11) |
| `schemas.ts` | zod `envelopeSchema` + `pushBatchSchema` + per-entity payload schemas (OMR_SCAN / EXAM_RESULT / ATTENDANCE_RECORD / ENROLLMENT / STUDENT_PROFILE_FIELD); `parsePushBatch` (rejects malformed envelopes, >500 events, in-batch duplicate eventId, payload/entityType mismatch; DELETE carries identity only) |
| `canonical.ts` | `canonicalize` (sorted keys, `-0` normalized, `undefined` dropped) + `canonicalPayloadHash` over `{entityType, entityId, entityVersion, op, payload}` (C06 A.2 - duplicate identity is the canonical hash, not wire bytes) |
| `cursor.ts` | `encodeCursor` / `decodeCursor` - opaque, HMAC-signed, **bound to `(tenantId, branchId or nodeId, streamKey)`**; a cursor from another tenant/branch or with a tampered signature -> `null` (caller falls back to a full snapshot). C06 A.6 |
| `conflict.ts` | `classifyConflict` -> `APPLY` / `DUPLICATE_MATCH` / `DUPLICATE_DIVERGENT` / `CONFLICT_STALE`. **Every entity rejects a stale/equal version** - no profile-field last-write-wins (C06 A.5) |
| `node-auth.ts` | `verifyNodeSignature` - `X-Node-Signature` = HMAC-SHA256(`ts.body`, pairingToken), 5-min skew window (C06 s6, "Should" for v1) |
| `index.ts` | re-exports; documents the two pending services |

**Checks**: `npx tsc --noEmit` exit 0; `tests/sync/sync-core.test.ts` 19 tests (canonical stability/sensitivity, stale-version rejection for all 5 entities, matching vs divergent replay, cross-tenant/branch cursor rejection, signature skew/tamper, batch validation). Full suite 20 files / 168 pass + 32 todo.

## Blocked - needs Codex first (C06 section 8)

- `SyncEvent` Prisma model (+ pg mirror + migration): `eventId @unique`, `nodeId`, `tenantId`, `branchId?`, `entityType`, `entityId`, `entityVersion`, `op`, `payloadHash`, `status`, `conflictReason?`, `appliedVersion Int?`, `receivedAt`, `appliedAt?`.
- `AcademicNode.revokedAt` + `pullCursor` (or a `SyncCursor` model); `MasteryEvidence.sourceEventId`.
- EVAL-001 result-revision model so an `EXAM_RESULT` event with `supersedesResultId` creates an audited revision instead of overwriting a finalized result.

Once those exist, Claude adds (C06 s11, no change to the pure API above):
- `applyPushEvents(ctx, events, appliers)` - per event, in one `prisma.$transaction`: dedup via `canonicalPayloadHash` + `classifyConflict`, call the injected `DomainApplier`, write the `SyncEvent` row; a thrown applier rolls that event back and the batch continues.
- `buildPullDelta(ctx, cursor, limit)` - read the durable change log from `decodeCursor(...)` up to a snapshot boundary, tenant+branch scoped, tombstones for deletes, never advancing `nextCursor` past an undelivered record.
- `tests/sync/` additions: concurrent duplicate delivery, interrupted-transaction recovery, branch-bound cursor page limits (need the DB).

## Next action

- Codex: land `SyncEvent` + node/evidence columns + EVAL-001 revision model, then confirm the `DomainApplier` map shape per entity. Claude implements `applyPushEvents` / `buildPullDelta` on top of this core.
- Route layer (Codex): `sync/push` -> `parsePushBatch` -> `applyPushEvents`; `sync/pull` -> `decodeCursor` -> `buildPullDelta`; both emit `syncConflict` / `syncEventFailed` metrics (OBS-001).
