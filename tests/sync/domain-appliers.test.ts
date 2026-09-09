import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { createTestWorld, type TestWorld } from "../support/fixtures";
import { applyPushEvents, domainAppliers } from "../../src/lib/sync";
import type { NodeContext, SyncEventEnvelope } from "../../src/lib/sync";

/**
 * SYN-001 - the real DomainApplier map (Codex) exercised against the database
 * through applyPushEvents. Verifies each entity's upsert / revision policy and
 * that a replay does not double-write.
 */

let world: TestWorld;
let ctx: NodeContext;

const evt = (o: Partial<SyncEventEnvelope>): SyncEventEnvelope => ({
  eventId: `ev_${Math.random().toString(36).slice(2, 12)}`,
  entityType: "ENROLLMENT",
  entityId: "x",
  entityVersion: 1,
  op: "UPSERT",
  occurredAt: "2026-09-09T12:00:00.000Z",
  payload: {},
  ...o,
});

const push = (e: SyncEventEnvelope) => applyPushEvents(ctx, [e], domainAppliers);

beforeAll(async () => {
  world = await createTestWorld();
  ctx = { nodeId: "NODE_DA", tenantId: world.a.tenant.id, branchId: null };
});

describe("ENROLLMENT applier", () => {
  it("creates then updates one enrollment row by node-chosen id, idempotent on replay", async () => {
    const id = "enr-sync-1";
    const e = evt({ entityType: "ENROLLMENT", entityId: id, entityVersion: 1,
      payload: { studentId: world.a.sibling.id, courseId: world.a.course.id, batchId: world.a.batch.id, status: "ACTIVE" } });
    expect((await push(e)).results[0].status).toBe("APPLIED");
    expect(await prisma.enrollment.findUnique({ where: { id } })).toMatchObject({ status: "ACTIVE", studentId: world.a.sibling.id });

    // replay: DUPLICATE, no change
    expect((await push(e)).results[0].status).toBe("DUPLICATE");

    const e2 = evt({ entityType: "ENROLLMENT", entityId: id, entityVersion: 2,
      payload: { studentId: world.a.sibling.id, courseId: world.a.course.id, batchId: world.a.batch.id, status: "DROPPED" } });
    expect((await push(e2)).results[0].status).toBe("APPLIED");
    expect((await prisma.enrollment.findUnique({ where: { id } }))?.status).toBe("DROPPED");
    expect(await prisma.enrollment.count({ where: { id } })).toBe(1);
  });
});

describe("STUDENT_PROFILE_FIELD applier", () => {
  it("updates only allowlisted fields, scoped to the ctx tenant", async () => {
    const e = evt({ entityType: "STUDENT_PROFILE_FIELD", entityId: world.a.student.id, entityVersion: 1,
      payload: { name: "Renamed Synthetic", school: "New School", tenantId: "hacked", id: "hacked" } });
    expect((await push(e)).results[0].status).toBe("APPLIED");
    const s = await prisma.student.findUnique({ where: { id: world.a.student.id } });
    expect(s?.name).toBe("Renamed Synthetic");
    expect(s?.school).toBe("New School");
    expect(s?.tenantId).toBe(world.a.tenant.id); // not "hacked"
  });

  it("does nothing for a student in another tenant", async () => {
    const before = await prisma.student.findUnique({ where: { id: world.b.student.id } });
    const e = evt({ entityType: "STUDENT_PROFILE_FIELD", entityId: world.b.student.id, entityVersion: 1,
      payload: { name: "Cross Tenant Write" } });
    // applier runs (no per-entity scope pre-check) but updateMany is tenant-scoped -> 0 rows
    await push(e);
    expect((await prisma.student.findUnique({ where: { id: world.b.student.id } }))?.name).toBe(before?.name);
  });
});

describe("ATTENDANCE_RECORD applier", () => {
  it("upserts an attendance row against an existing session", async () => {
    const session = await prisma.attendanceSession.create({ data: {
      tenantId: world.a.tenant.id, branchId: world.a.branch.id, batchId: world.a.batch.id, sessionDate: "2026-09-09",
    } });
    const id = "att-sync-1";
    const e = evt({ entityType: "ATTENDANCE_RECORD", entityId: id, entityVersion: 1,
      payload: { studentId: world.a.student.id, sessionId: session.id, status: "LATE" } });
    expect((await push(e)).results[0].status).toBe("APPLIED");
    const rec = await prisma.attendanceRecord.findUnique({ where: { id } });
    expect(rec).toMatchObject({ status: "LATE", source: "OFFLINE_NODE", sessionId: session.id });
  });
});

describe("OMR_SCAN applier", () => {
  it("updates an existing scan's responses/status", async () => {
    const job = await prisma.oMRJob.create({ data: { tenantId: world.a.tenant.id, examId: world.a.exam.id, status: "PROCESSING", totalSheets: 1 } });
    const scan = await prisma.oMRScan.create({ data: { jobId: job.id, studentId: world.a.student.id, status: "AMBIGUOUS",
      detectedResponses: "{}", verifiedResponses: "{}" } });
    const e = evt({ entityType: "OMR_SCAN", entityId: scan.id, entityVersion: 1,
      payload: { detectedResponses: { 1: "A", 2: "C" }, status: "OVERRIDDEN", confidenceScore: 0.95 } });
    expect((await push(e)).results[0].status).toBe("APPLIED");
    const after = await prisma.oMRScan.findUnique({ where: { id: scan.id } });
    expect(after?.status).toBe("OVERRIDDEN");
    expect(JSON.parse(after!.detectedResponses)).toEqual({ 1: "A", 2: "C" });
  });
});

describe("EXAM_RESULT applier", () => {
  it("creates an ExamResultRevision when superseding a final result, never overwrites it", async () => {
    const result = await prisma.examResult.create({ data: {
      tenantId: world.a.tenant.id, examId: world.a.exam.id, studentId: world.a.student.id, version: 1, isFinal: true,
      score: 40, maximumMarks: 100, accuracyPercentage: 40, totalAttempted: 10, totalCorrect: 10, totalIncorrect: 0,
      totalUnattempted: 0, negativeMarksDeducted: 0, cohortRank: 1, cohortPercentile: 99,
      subjectScores: "{}", questionResponses: "{}",
    } });
    const e = evt({ entityType: "EXAM_RESULT", entityId: `res-${result.id}`, entityVersion: 1,
      payload: { examId: world.a.exam.id, studentId: world.a.student.id, supersedesResultId: result.id,
        reason: "ANSWER_KEY_CORRECTION", result: { score: 44 } } });
    expect((await push(e)).results[0].status).toBe("APPLIED");

    const revs = await prisma.examResultRevision.findMany({ where: { examId: world.a.exam.id, studentId: world.a.student.id } });
    expect(revs).toHaveLength(1);
    expect(revs[0]).toMatchObject({ supersedesResultId: result.id, revision: 1, reason: "ANSWER_KEY_CORRECTION" });
    // the authoritative final result is untouched
    expect((await prisma.examResult.findUnique({ where: { id: result.id } }))?.score).toBe(40);
  });
});
