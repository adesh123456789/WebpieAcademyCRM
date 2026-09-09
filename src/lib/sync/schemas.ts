import { z } from "zod";
import { SYNC_ENTITY_TYPES, SYNC_OPS, SyncError, type SyncEntityType, type SyncEventEnvelope } from "./types";

/**
 * Wire validation for a push batch (C06 s2/s3). The envelope is validated
 * structurally; the payload is validated per entityType. Anything malformed is a
 * SyncError("SYNC_SCHEMA") - the route maps it to 400, the batch is not applied.
 */

const idString = z.string().min(1).max(128);
const qKey = z.string().regex(/^\d+$/);
const optionLetter = z.string().regex(/^[A-F]$/);

export const envelopeSchema = z.object({
  eventId: z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/),
  entityType: z.enum(SYNC_ENTITY_TYPES),
  entityId: idString,
  entityVersion: z.number().int().min(1),
  op: z.enum(SYNC_OPS),
  occurredAt: z.string().datetime(),
  payload: z.unknown(),
});

export const MAX_EVENTS_PER_BATCH = 500;

export const pushBatchSchema = z.object({
  events: z.array(envelopeSchema).min(1).max(MAX_EVENTS_PER_BATCH),
});

// --- per-entity payloads ---

// Matches what an offline node produces and the OMR_SCAN domain applier consumes.
const omrScanPayload = z.object({
  jobId: idString,
  studentId: idString.optional(),
  detectedRollNumber: z.string().max(32).optional(),
  detectedResponses: z.record(qKey, optionLetter),
  verifiedResponses: z.record(qKey, optionLetter).optional(),
  confidenceScore: z.number().min(0).max(1).default(0),
  status: z.enum(["CONFIDENT", "AMBIGUOUS", "UNMATCHED", "OVERRIDDEN", "PROCESSING"]).default("PROCESSING"),
  scannedAt: z.string().datetime().optional(),
});

const examResultPayload = z.object({
  examId: idString,
  studentId: idString,
  engineVersion: z.string().min(1),
  computedAt: z.string().datetime(),
  score: z.number().finite(),
  maximumMarks: z.number().finite().positive(),
  responses: z.record(qKey, z.union([optionLetter, z.array(optionLetter), z.number()])),
  /** set when this result supersedes a prior revision (answer-key correction) */
  supersedesResultId: idString.optional(),
});

const attendanceRecordPayload = z.object({
  batchId: idString,
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  studentId: idString,
  status: z.enum(["PRESENT", "ABSENT", "LATE"]),
});

const enrollmentPayload = z.object({
  studentId: idString,
  courseId: idString,
  batchId: idString,
  status: z.enum(["ACTIVE", "PAUSED", "WITHDRAWN"]),
});

const studentProfileFieldPayload = z.object({
  studentId: idString,
  field: z.enum(["name", "phone", "email", "school", "targetExam", "targetYear"]),
  value: z.string().max(320),
});

const PAYLOADS: Record<SyncEntityType, z.ZodTypeAny> = {
  OMR_SCAN: omrScanPayload,
  EXAM_RESULT: examResultPayload,
  ATTENDANCE_RECORD: attendanceRecordPayload,
  ENROLLMENT: enrollmentPayload,
  STUDENT_PROFILE_FIELD: studentProfileFieldPayload,
};

/** Validate one envelope's payload against its entityType schema. Throws SyncError. */
export function validateEventPayload(e: SyncEventEnvelope): unknown {
  const schema = PAYLOADS[e.entityType];
  const parsed = schema.safeParse(e.payload);
  if (!parsed.success) {
    throw new SyncError("SYNC_SCHEMA", `invalid ${e.entityType} payload for event ${e.eventId}`, 400);
  }
  // DELETE events carry only identity; UPSERT/APPEND must carry a full payload
  return parsed.data;
}

/** Parse + validate a raw push body into typed envelopes (payloads validated too). */
export function parsePushBatch(raw: unknown): { events: SyncEventEnvelope[] } {
  const parsed = pushBatchSchema.safeParse(raw);
  if (!parsed.success) {
    throw new SyncError("SYNC_SCHEMA", "malformed sync push batch", 400);
  }
  const events = parsed.data.events as SyncEventEnvelope[];
  const seen = new Set<string>();
  for (const e of events) {
    if (seen.has(e.eventId)) {
      throw new SyncError("SYNC_SCHEMA", `duplicate eventId ${e.eventId} within one batch`, 400);
    }
    seen.add(e.eventId);
    if (e.op !== "DELETE") validateEventPayload(e);
  }
  return { events };
}
