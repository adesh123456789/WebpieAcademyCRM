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
 * Pending Codex's `SyncEvent` model + EVAL-001 revision model:
 *   - applyPushEvents(ctx, events, appliers)    -> transactional apply + provenance
 *   - buildPullDelta(ctx, cursor, limit)        -> durable change log + tombstones
 * Signatures are specified in C06 s11; they slot in here without changing the
 * pure API below.
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
