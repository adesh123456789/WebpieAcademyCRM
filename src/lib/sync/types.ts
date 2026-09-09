/**
 * SYN-001 / C06 - shared types for the Academic Node <-> Cloud sync services.
 * See docs/contracts/C06-node-sync.md sections 2 and 11.
 */

export const SYNC_ENTITY_TYPES = [
  "OMR_SCAN",
  "EXAM_RESULT",
  "ATTENDANCE_RECORD",
  "ENROLLMENT",
  "STUDENT_PROFILE_FIELD",
] as const;
export type SyncEntityType = (typeof SYNC_ENTITY_TYPES)[number];

export const SYNC_OPS = ["UPSERT", "DELETE", "APPEND"] as const;
export type SyncOp = (typeof SYNC_OPS)[number];

export interface SyncEventEnvelope {
  eventId: string; // client ULID/uuid - the idempotency key
  entityType: SyncEntityType;
  entityId: string;
  entityVersion: number; // per-(type,id) monotonic on the node
  op: SyncOp;
  occurredAt: string; // ISO, node clock, advisory only
  payload: unknown; // validated per entityType by ./schemas
}

export interface NodeContext {
  nodeId: string;
  tenantId: string;
  branchId: string | null; // null = tenant-level node
}

export type PerEventStatus = "APPLIED" | "DUPLICATE" | "CONFLICT" | "REJECTED";
export type ConflictReason =
  | "STALE_VERSION"
  | "DIVERGENT_PAYLOAD"
  | "OUT_OF_SCOPE"
  | "SCHEMA";

export interface PerEventResult {
  eventId: string;
  status: PerEventStatus;
  appliedVersion: number | null;
  conflictReason?: ConflictReason;
}

export interface PushResult {
  results: PerEventResult[];
  serverCursor: string;
}

export interface PullDelta {
  changes: Record<string, unknown[]>;
  tombstones: { entityType: SyncEntityType; entityId: string; deletedAt: string }[];
  nextCursor: string;
  hasMore: boolean;
  snapshotBoundary: string;
}

/** Domain seam - Codex provides one applier per entity type (C06 s11). */
export interface DomainApplyOutcome {
  appliedVersion: number;
}
export type DomainApplier = (
  tx: unknown,
  ctx: NodeContext,
  envelope: SyncEventEnvelope,
  storedVersion: number | null,
) => Promise<DomainApplyOutcome>;
export type DomainApplierMap = Record<SyncEntityType, DomainApplier>;

export class SyncError extends Error {
  constructor(
    public code:
      | "SYNC_SCHEMA"
      | "SYNC_OUT_OF_SCOPE"
      | "SYNC_VERSION_CONFLICT"
      | "NODE_TOKEN_EXPIRED"
      | "NODE_REVOKED"
      | "NODE_SIGNATURE",
    message: string,
    public status = 400,
  ) {
    super(message);
    this.name = "SyncError";
  }
}
