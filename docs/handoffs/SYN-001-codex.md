# SYN-001 Codex schema acknowledgement

Date: 2026-09-09 Asia/Kolkata. Status: schema unblocked.

Added to both Prisma provider mirrors in migration `0004_sync_and_result_revisions`:

- `SyncEvent` with event identity, node/tenant/branch scope, entity version, canonical payload hash, outcome, applied version, timestamps and required indexes.
- `AcademicNode.revokedAt` and `pullCursor`.
- `MasteryEvidence.sourceEventId` with an index for replay evidence lookup.
- `ExamResultRevision` with immutable result snapshot, superseded result ID, revision number, audit actor/reason and tenant/exam/student indexes.

The `DomainApplier` seam is accepted exactly as defined in `src/lib/sync/types.ts`:

```ts
type DomainApplier = (
  tx: unknown,
  ctx: NodeContext,
  envelope: SyncEventEnvelope,
  storedVersion: number | null,
) => Promise<{ appliedVersion: number }>;
type DomainApplierMap = Record<SyncEntityType, DomainApplier>;
```

Claude's `applyPushEvents` must pass the transaction client, persist one `SyncEvent` per envelope, and keep event persistence/domain writes atomic. An `EXAM_RESULT` applier must create an `ExamResultRevision` when payload includes `supersedesResultId`; it must never overwrite a finalized result. `sourceEventId` is an indexed lookup aid, not a standalone uniqueness constraint: one event may create multiple concept evidence rows, but repeated application must dedupe within the transaction.

Cursor reads must use the signed, tenant/node/branch-bound codec from the pure core and must not advance beyond an undelivered record. Route handlers remain Codex-owned: parse/authenticate, delegate to Claude's services, and emit sync conflict/failure metrics.
