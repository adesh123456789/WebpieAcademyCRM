import { prisma } from "@/lib/prisma";
import { canonicalPayloadHash } from "./canonical";
import { classifyConflict } from "./conflict";
import { encodeCursor } from "./cursor";
import {
  type DomainApplierMap,
  type NodeContext,
  type PerEventResult,
  type PushResult,
  type SyncEventEnvelope,
} from "./types";

/**
 * SYN-001 / C06 s3 + amendments A.2/A.3/A.5. Apply a push batch:
 *
 *  For each envelope, in its OWN prisma.$transaction:
 *   - eventId already recorded?
 *       node/tenant mismatch     -> CONFLICT (disclose nothing)
 *       canonical hash matches    -> DUPLICATE, echo the original appliedVersion
 *       hash differs              -> CONFLICT (divergent replay)
 *   - new event:
 *       entityVersion <= latest APPLIED version for this entity -> CONFLICT (STALE_VERSION), recorded
 *       no applier for entityType                               -> REJECTED (SCHEMA), recorded
 *       else: run the injected DomainApplier, then write the APPLIED SyncEvent
 *             row in the SAME transaction.
 *
 * A thrown applier rolls the whole event back (SyncEvent row included) so the
 * node can retry; the batch continues with the next event.
 */
export async function applyPushEvents(
  ctx: NodeContext,
  events: SyncEventEnvelope[],
  appliers: DomainApplierMap,
): Promise<PushResult> {
  const results: PerEventResult[] = [];

  for (const envelope of events) {
    const payloadHash = canonicalPayloadHash(envelope);
    const scope = {
      eventId: envelope.eventId,
      nodeId: ctx.nodeId,
      tenantId: ctx.tenantId,
      branchId: ctx.branchId,
      entityType: envelope.entityType,
      entityId: envelope.entityId,
      entityVersion: envelope.entityVersion,
      op: envelope.op,
      payloadHash,
    };

    let result: PerEventResult;
    try {
      result = await prisma.$transaction(async (tx) => {
        const prior = await tx.syncEvent.findUnique({ where: { eventId: envelope.eventId } });
        if (prior) {
          if (prior.nodeId !== ctx.nodeId || prior.tenantId !== ctx.tenantId) {
            return { eventId: envelope.eventId, status: "CONFLICT", appliedVersion: null, conflictReason: "OUT_OF_SCOPE" };
          }
          const decision = classifyConflict({
            entityType: envelope.entityType,
            incomingVersion: envelope.entityVersion,
            storedVersion: prior.appliedVersion,
            eventAlreadySeen: true,
            hashMatchesPrior: prior.payloadHash === payloadHash,
          });
          if (decision === "DUPLICATE_MATCH") {
            return { eventId: envelope.eventId, status: "DUPLICATE", appliedVersion: prior.appliedVersion };
          }
          return { eventId: envelope.eventId, status: "CONFLICT", appliedVersion: null, conflictReason: "DIVERGENT_PAYLOAD" };
        }

        const latest = await tx.syncEvent.findFirst({
          where: {
            tenantId: ctx.tenantId,
            entityType: envelope.entityType,
            entityId: envelope.entityId,
            status: "APPLIED",
          },
          orderBy: { entityVersion: "desc" },
          select: { entityVersion: true },
        });
        const storedVersion = latest?.entityVersion ?? null;

        const decision = classifyConflict({
          entityType: envelope.entityType,
          incomingVersion: envelope.entityVersion,
          storedVersion,
          eventAlreadySeen: false,
        });
        if (decision === "CONFLICT_STALE") {
          await tx.syncEvent.create({ data: { ...scope, status: "CONFLICT", conflictReason: "STALE_VERSION", appliedVersion: null } });
          return { eventId: envelope.eventId, status: "CONFLICT", appliedVersion: null, conflictReason: "STALE_VERSION" };
        }

        const applier = appliers[envelope.entityType];
        if (!applier) {
          await tx.syncEvent.create({ data: { ...scope, status: "REJECTED", conflictReason: "SCHEMA", appliedVersion: null } });
          return { eventId: envelope.eventId, status: "REJECTED", appliedVersion: null, conflictReason: "SCHEMA" };
        }

        const outcome = await applier(tx, ctx, envelope, storedVersion);
        await tx.syncEvent.create({
          data: { ...scope, status: "APPLIED", appliedVersion: outcome.appliedVersion, appliedAt: new Date() },
        });
        return { eventId: envelope.eventId, status: "APPLIED", appliedVersion: outcome.appliedVersion };
      });
    } catch {
      // Applier or write failed -> the transaction (SyncEvent row included) rolled
      // back. The event is not recorded, so the node can safely retry it. The
      // route emits `syncEventFailed`; the caller sees REJECTED for this event.
      result = { eventId: envelope.eventId, status: "REJECTED", appliedVersion: null, conflictReason: "SCHEMA" };
    }
    results.push(result);
  }

  return {
    results,
    serverCursor: encodeCursor({
      tenantId: ctx.tenantId,
      scopeKey: ctx.branchId ?? ctx.nodeId,
      streamKey: "all",
      position: "",
      snapshotBoundary: new Date().toISOString(),
    }),
  };
}
