# SYN-001 / Claude - sync services pure core

- **Task / owner**: SYN-001 (`src/lib/sync/**` + event model) / Claude. Codex owns the `SyncEvent` Prisma model, route wiring, `verifyNode` expiry/revocation, handshake rotation.
- **Timestamp + timezone**: 2026-09-09 Asia/Kolkata
- **Status**: Claude half implemented. `applyPushEvents` + `buildPullDelta` landed on Codex's `SyncEvent` schema (`b3d1ff3`). Route wiring + real `DomainApplier` implementations are Codex's.
- **Base**: `7039f95` (pure core) -> this slice on `b3d1ff3`. Contract: `docs/contracts/C06-node-sync.md` (amendments in section A, signatures in section 11).

## Update: `applyPushEvents` + `buildPullDelta` (`src/lib/sync/{apply,pull}.ts`)

**`applyPushEvents(ctx, events, appliers)`** - per event in its own `prisma.$transaction`:
- prior `SyncEvent` by `eventId`: node/tenant mismatch -> `CONFLICT/OUT_OF_SCOPE` (no disclosure); canonical hash match -> `DUPLICATE` (echoes original `appliedVersion`, applier not re-run); hash differs -> `CONFLICT/DIVERGENT_PAYLOAD`.
- new event: `entityVersion <= latest APPLIED version for the entity` -> `CONFLICT/STALE_VERSION` (recorded); no applier -> `REJECTED/SCHEMA` (recorded); else run the injected `DomainApplier(tx, ctx, envelope, storedVersion)` then write the `APPLIED` `SyncEvent` row in the same tx.
- applier throws -> whole event (incl. its `SyncEvent` row) rolls back -> `REJECTED`, **retriable** (re-push of the same `eventId` applies cleanly).
- 12 DB-backed tests (`tests/sync/sync-apply.test.ts`) with stub appliers: apply/idempotent/divergent/stale/sequential-version/rollback-retry/no-applier/cross-node.

**`buildPullDelta(ctx, cursor, limit)`** - tenant + branch scoped delta over `students / batches / exams / curriculum`. Cursor is the signed scope-bound codec; a foreign cursor -> full snapshot. Pagination never advances `nextCursor` past an undelivered row (cursor stores the last delivered `createdAt` + the ids delivered at that instant).

## Update 2: pull on `updatedAt` + tombstones + handshake CAS + DB applier tests

Codex added `updatedAt` to Student/Batch/Exam/Enrollment (migration `0005`) and wired the routes + `domainAppliers` (`e82d9e6`). Follow-ups done:

- **`buildPullDelta` now cursors on `updatedAt`** - an edited row resurfaces after a cursor that already delivered it. `CurriculumNode` (no `updatedAt`, effectively immutable) stays on `createdAt`.
- **Tombstones**: archived students (`status = ARCHIVED`) and non-active batches surface as `{ entityType: "<stream>", entityId, deletedAt }` instead of a change. `PullDelta.tombstones[].entityType` loosened to the stream key. Genuine hard deletes still need a `SyncChange` append-only log - deferred.
- **`src/lib/sync/handshake.ts` - `rotateNodeToken(currentToken)`**: requires a valid non-revoked, non-expired (inclusive) credential; atomic compare-and-swap (`updateMany where pairingToken = current AND revokedAt = null`) so concurrent rotations mint exactly one successor (the loser gets `RACE`); audits `ACADEMIC_NODE_TOKEN_ROTATED`. Route calls this; the legacy pairing service is otherwise unchanged.
- **DB applier tests** (`tests/sync/domain-appliers.test.ts`, 6): ENROLLMENT create->update->idempotent-replay; STUDENT_PROFILE_FIELD allowlist + tenant-scoped `updateMany` (ignores `id`/`tenantId` in payload, no-ops for another tenant's student); ATTENDANCE_RECORD upsert against a real session; OMR_SCAN update of an existing scan; EXAM_RESULT creates one `ExamResultRevision` superseding a final result and never mutates the authoritative row.
- **Fixed one applier bug**: `ATTENDANCE_RECORD` was passing `tenantId` to `attendanceRecord.create` / `.upsert`, but that model has no `tenantId` column (scope is session -> batch -> tenant) - it would have thrown on every attendance sync. Now creates with `source: "OFFLINE_NODE"` and no `tenantId`.

`tests/sync/**` totals 45 tests (core 19, apply 12, domain-appliers 6, handshake 5, pull-updatedat 3). tsc + 222 tests / 32 todo pass.

### Still Codex

- Route: call `rotateNodeToken` from the handshake refresh endpoint (if not already); emit `syncConflict`/`syncEventFailed` metrics from `sync/push` per `PerEventResult.status`.
- `OMR_SCAN` applier is `update`-only - a scan produced offline that does not yet exist cloud-side will `REJECTED`. Decide the policy (upsert with job linkage, or require the scan row first) - flagged, not changed.
- Hard-delete tombstones still need a `SyncChange` log for a complete C06 A.6.

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
