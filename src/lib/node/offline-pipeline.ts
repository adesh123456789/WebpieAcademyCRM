import { randomUUID } from "node:crypto";
import { extractSheetFromImage, type GrayscaleImage, type SheetGeometry } from "@/lib/omr/raster";
import type { SheetExtractionResult } from "@/lib/omr/omr-engine";
import type { SyncEventEnvelope } from "@/lib/sync";

/**
 * EDGE-001 groundwork - the offline assessment loop as a pure composition of the
 * shipped engines. A Windows Academic Node runs this while disconnected:
 *   scan image -> raster + deterministic extraction -> local review/store ->
 *   durable outbox event -> (on reconnect) drain to POST /api/v1/sync/push.
 *
 * This module owns none of the runtime concerns (process, local SQLite, signed
 * updater, disk guard) - those are the rest of EDGE-001 and wait on OMR-002.
 */

export interface OfflineScanArgs {
  image: GrayscaleImage;
  geometry: SheetGeometry;
  /** node-local id of the OMRScan row this sheet maps to */
  scanId: string;
  jobId: string;
  /** monotonic per-scan version on the node (bump on each re-scan/override) */
  entityVersion: number;
  /** is this sheet inside the supported-conditions envelope? */
  supported?: boolean;
  now?: string;
}

export interface OfflineScanResult {
  extraction: SheetExtractionResult;
  /**
   * The outbox event to queue, or null when the sheet failed safe
   * (`REJECTED` / `UNMATCHED`) - it stays on the node for human review and is
   * not synced until resolved.
   */
  outboxEvent: SyncEventEnvelope | null;
}

function toLetterMap(responses: Record<number, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [q, letter] of Object.entries(responses)) out[String(q)] = letter;
  return out;
}

export function processOfflineScan(args: OfflineScanArgs): OfflineScanResult {
  const extraction = extractSheetFromImage(args.image, args.geometry, args.scanId, {
    supported: args.supported,
  });

  if (extraction.status === "REJECTED" || extraction.status === "UNMATCHED") {
    return { extraction, outboxEvent: null };
  }

  const outboxEvent: SyncEventEnvelope = {
    eventId: randomUUID(),
    entityType: "OMR_SCAN",
    entityId: args.scanId,
    entityVersion: args.entityVersion,
    op: "UPSERT",
    occurredAt: args.now ?? new Date().toISOString(),
    payload: {
      jobId: args.jobId,
      detectedRollNumber: extraction.rollNumber || undefined,
      detectedResponses: toLetterMap(extraction.responses),
      confidenceScore: extraction.overallConfidence,
      status: extraction.status, // "CONFIDENT" | "AMBIGUOUS"
      scannedAt: args.now ?? new Date().toISOString(),
    },
  };
  return { extraction, outboxEvent };
}

export interface PushFn {
  (batch: SyncEventEnvelope[]): Promise<{ results: { eventId: string; status: string }[] }>;
}

export interface DrainResult {
  /** eventIds the cloud accepted (APPLIED or DUPLICATE) - safe to remove from the outbox */
  delivered: string[];
  /** events to keep for retry / node-side inspection (CONFLICT, REJECTED, or undelivered) */
  retained: SyncEventEnvelope[];
}

/**
 * Drain a local outbox to the cloud in ordered batches. Idempotent by design:
 * a replay of an already-applied event comes back DUPLICATE and is still
 * treated as delivered.
 */
export async function drainOutbox(
  events: SyncEventEnvelope[],
  push: PushFn,
  batchSize = 100,
): Promise<DrainResult> {
  const delivered: string[] = [];
  const retained: SyncEventEnvelope[] = [];
  const byId = new Map(events.map((e) => [e.eventId, e]));

  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    let results: { eventId: string; status: string }[];
    try {
      ({ results } = await push(batch));
    } catch {
      // network / server failure - keep the whole remaining outbox for retry
      retained.push(...events.slice(i));
      return { delivered, retained };
    }
    const seen = new Set<string>();
    for (const r of results) {
      seen.add(r.eventId);
      if (r.status === "APPLIED" || r.status === "DUPLICATE") delivered.push(r.eventId);
      else {
        const e = byId.get(r.eventId);
        if (e) retained.push(e);
      }
    }
    for (const e of batch) if (!seen.has(e.eventId)) retained.push(e);
  }

  return { delivered, retained };
}
