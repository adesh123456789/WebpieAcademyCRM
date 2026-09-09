/**
 * SYN-001 - Academic Node <-> Cloud sync services (Claude lane).
 * Contract: docs/contracts/C06-node-sync.md.
 *
 * Landed now (pure, no schema dependency):
 *   - envelope + per-entity payload validation  (./schemas)
 *   - canonical payload hashing                 (./canonical)
 *   - signed, scope-bound pull-cursor codec     (./cursor)
 *   - per-event conflict classification         (./conflict)
 *   - node request-signature verification       (./node-auth)
 *
 * Landed on the SyncEvent schema (`b3d1ff3`):
 *   - applyPushEvents(ctx, events, appliers)    -> per-event transactional apply
 *   - buildPullDelta(ctx, cursor, limit)        -> tenant/branch delta (createdAt
 *     v1; edit/delete tracking needs a Codex change log - see pull.ts header)
 */

export * from "./types";
export {
  envelopeSchema,
  pushBatchSchema,
  parsePushBatch,
  validateEventPayload,
  MAX_EVENTS_PER_BATCH,
} from "./schemas";
export { canonicalize, canonicalPayloadHash } from "./canonical";
export { encodeCursor, decodeCursor, scopeKeyFor, type CursorState } from "./cursor";
export { classifyConflict, type ConflictDecision } from "./conflict";
export { verifyNodeSignature, nodeSignature } from "./node-auth";
export { applyPushEvents } from "./apply";
export { buildPullDelta } from "./pull";
export { domainAppliers } from "./domain-appliers";
