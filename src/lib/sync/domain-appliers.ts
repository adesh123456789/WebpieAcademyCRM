import type { DomainApplierMap, DomainApplyOutcome } from "./types";

type AnyRecord = Record<string, any>;
const record = (value: unknown): AnyRecord => (value && typeof value === "object" ? value as AnyRecord : {});
const idVersion = (stored: number | null, incoming: number) => Math.max(stored ?? 0, incoming);

/** Transaction-bound domain adapters. Each adapter accepts only its own envelope payload. */
export const domainAppliers: DomainApplierMap = {
  OMR_SCAN: async (tx: any, _ctx, event, stored) => {
    const p = record(event.payload);
    await tx.oMRScan.update({ where: { id: event.entityId }, data: { detectedResponses: JSON.stringify(p.detectedResponses ?? {}), verifiedResponses: p.verifiedResponses ? JSON.stringify(p.verifiedResponses) : undefined, status: p.status ?? "PROCESSING", confidenceScore: Number(p.confidenceScore ?? 0) } });
    return { appliedVersion: idVersion(stored, event.entityVersion) };
  },
  EXAM_RESULT: async (tx: any, ctx, event, stored) => {
    const p = record(event.payload);
    const snapshot = JSON.stringify(p.result ?? p);
    if (p.supersedesResultId) {
      const prior = await tx.examResult.findUnique({ where: { id: p.supersedesResultId } });
      if (!prior || prior.tenantId !== ctx.tenantId || prior.isFinal) {
        const nextRevision = (await tx.examResultRevision.count({ where: { examId: p.examId, studentId: p.studentId } })) + 1;
        await tx.examResultRevision.create({ data: { tenantId: ctx.tenantId, examId: p.examId, studentId: p.studentId, supersedesResultId: p.supersedesResultId, revision: nextRevision, resultSnapshot: snapshot, reason: p.reason ?? "SYNC_REVISION", createdById: p.createdById ?? null } });
      }
    }
    return { appliedVersion: idVersion(stored, event.entityVersion) };
  },
  ATTENDANCE_RECORD: async (tx: any, _ctx, event, stored) => {
    // AttendanceRecord has no tenantId column; scope is via session -> batch -> tenant.
    const p = record(event.payload);
    await tx.attendanceRecord.upsert({
      where: { id: event.entityId },
      create: { id: event.entityId, studentId: p.studentId, sessionId: p.sessionId, status: p.status ?? "PRESENT", source: "OFFLINE_NODE" },
      update: { status: p.status ?? "PRESENT", source: "OFFLINE_NODE" },
    });
    return { appliedVersion: idVersion(stored, event.entityVersion) };
  },
  ENROLLMENT: async (tx: any, ctx, event, stored) => {
    const p = record(event.payload);
    await tx.enrollment.upsert({ where: { id: event.entityId }, create: { id: event.entityId, studentId: p.studentId, courseId: p.courseId, batchId: p.batchId, status: p.status ?? "ACTIVE" }, update: { status: p.status ?? "ACTIVE" } });
    return { appliedVersion: idVersion(stored, event.entityVersion) };
  },
  STUDENT_PROFILE_FIELD: async (tx: any, ctx, event, stored) => {
    const p = record(event.payload);
    const allowed = ["name", "email", "phone", "school", "targetExam", "targetYear", "status"] as const;
    const data: AnyRecord = {};
    for (const key of allowed) if (p[key] !== undefined) data[key] = p[key];
    await tx.student.updateMany({ where: { id: event.entityId, tenantId: ctx.tenantId }, data });
    return { appliedVersion: idVersion(stored, event.entityVersion) };
  },
};
