import type { SyncEntityType } from "./types";

/**
 * Per-event decision (C06 s3 + amendment A.5). Every entity rejects a stale
 * version in v1 - there is no "profile field last-write-wins" exception. A later
 * reconciliation must create a new audited version, not silently overwrite.
 */
export type ConflictDecision =
  | "APPLY" //             new event, version ahead of stored -> apply
  | "DUPLICATE_MATCH" //   eventId already applied, identity hash matches -> no-op, echo prior result
  | "DUPLICATE_DIVERGENT" // eventId already applied, hash differs -> CONFLICT, disclose nothing
  | "CONFLICT_STALE"; //   new eventId but entityVersion <= stored -> CONFLICT

export function classifyConflict(args: {
  entityType: SyncEntityType;
  incomingVersion: number;
  storedVersion: number | null;
  /** true when a SyncEvent row already exists for this eventId */
  eventAlreadySeen: boolean;
  /** when eventAlreadySeen: does the stored canonical hash equal the incoming one? */
  hashMatchesPrior?: boolean;
}): ConflictDecision {
  const { incomingVersion, storedVersion, eventAlreadySeen, hashMatchesPrior } = args;

  if (eventAlreadySeen) {
    return hashMatchesPrior ? "DUPLICATE_MATCH" : "DUPLICATE_DIVERGENT";
  }
  if (!Number.isInteger(incomingVersion) || incomingVersion < 1) return "CONFLICT_STALE";
  if (storedVersion !== null && incomingVersion <= storedVersion) return "CONFLICT_STALE";
  return "APPLY";
}
