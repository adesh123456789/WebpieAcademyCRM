import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { createTestWorld, type TestWorld } from "../support/fixtures";
import { applyPushEvents, buildPullDelta } from "../../src/lib/sync";
import type { DomainApplier, DomainApplierMap, NodeContext, SyncEventEnvelope } from "../../src/lib/sync";

/**
 * SYN-001 applyPushEvents / buildPullDelta on the landed SyncEvent schema
 * (b3d1ff3). Uses stub domain appliers - real appliers are Codex's domain.
 */

let world: TestWorld;
let calls: { entityType: string; storedVersion: number | null; version: number }[] = [];

const passthrough: DomainApplier = async (_tx, _ctx, env, storedVersion) => {
  calls.push({ entityType: env.entityType, storedVersion, version: env.entityVersion });
  return { appliedVersion: env.entityVersion };
};
const boom: DomainApplier = async () => {
  throw new Error("domain applier failed");
};

const appliers = (over: Partial<DomainApplierMap> = {}): DomainApplierMap => ({
  OMR_SCAN: passthrough,
  EXAM_RESULT: passthrough,
  ATTENDANCE_RECORD: passthrough,
  ENROLLMENT: passthrough,
  STUDENT_PROFILE_FIELD: passthrough,
  ...over,
});

const nodeA: NodeContext = { nodeId: "NODE_A", tenantId: "", branchId: null };
const evt = (o: Partial<SyncEventEnvelope> = {}): SyncEventEnvelope => ({
  eventId: `ev_${Math.random().toString(36).slice(2, 12)}`,
  entityType: "ATTENDANCE_RECORD",
  entityId: "att-1",
  entityVersion: 1,
  op: "UPSERT",
  occurredAt: "2026-09-09T10:00:00.000Z",
  payload: { batchId: "b1", sessionDate: "2026-09-09", studentId: "s1", status: "PRESENT" },
  ...o,
});

beforeAll(async () => {
  world = await createTestWorld();
  nodeA.tenantId = world.a.tenant.id;
});

describe("applyPushEvents", () => {
  it("applies a new event, records one APPLIED SyncEvent, passes storedVersion", async () => {
    calls = [];
    const e = evt({ entityId: "att-apply-1", entityVersion: 1 });
    const { results } = await applyPushEvents(nodeA, [e], appliers());
    expect(results[0]).toMatchObject({ eventId: e.eventId, status: "APPLIED", appliedVersion: 1 });
    expect(calls).toEqual([{ entityType: "ATTENDANCE_RECORD", storedVersion: null, version: 1 }]);
    const row = await prisma.syncEvent.findUnique({ where: { eventId: e.eventId } });
    expect(row).toMatchObject({ status: "APPLIED", appliedVersion: 1, nodeId: "NODE_A", tenantId: world.a.tenant.id });
  });

  it("is idempotent - replaying the same eventId + payload returns DUPLICATE and does not re-run the applier", async () => {
    const e = evt({ entityId: "att-idem", entityVersion: 2 });
    await applyPushEvents(nodeA, [e], appliers());
    calls = [];
    const { results } = await applyPushEvents(nodeA, [e], appliers());
    expect(results[0]).toMatchObject({ status: "DUPLICATE", appliedVersion: 2 });
    expect(calls).toEqual([]);
  });

  it("flags a divergent replay (same eventId, different payload) as CONFLICT without applying", async () => {
    const e = evt({ entityId: "att-div", entityVersion: 1 });
    await applyPushEvents(nodeA, [e], appliers());
    calls = [];
    const tampered = { ...e, payload: { batchId: "b1", sessionDate: "2026-09-09", studentId: "s1", status: "ABSENT" } };
    const { results } = await applyPushEvents(nodeA, [tampered], appliers());
    expect(results[0]).toMatchObject({ status: "CONFLICT", conflictReason: "DIVERGENT_PAYLOAD" });
    expect(calls).toEqual([]);
  });

  it("rejects a stale/equal entityVersion for a new eventId and records the conflict", async () => {
    const id = "att-stale";
    await applyPushEvents(nodeA, [evt({ entityId: id, entityVersion: 5 })], appliers());
    const stale = evt({ entityId: id, entityVersion: 5 });
    const { results } = await applyPushEvents(nodeA, [stale], appliers());
    expect(results[0]).toMatchObject({ status: "CONFLICT", conflictReason: "STALE_VERSION" });
    const row = await prisma.syncEvent.findUnique({ where: { eventId: stale.eventId } });
    expect(row?.status).toBe("CONFLICT");
  });

  it("applies a strictly newer version and passes the prior version as storedVersion", async () => {
    const id = "att-seq";
    await applyPushEvents(nodeA, [evt({ entityId: id, entityVersion: 1 })], appliers());
    calls = [];
    const { results } = await applyPushEvents(nodeA, [evt({ entityId: id, entityVersion: 2 })], appliers());
    expect(results[0].status).toBe("APPLIED");
    expect(calls[0]).toMatchObject({ storedVersion: 1, version: 2 });
  });

  it("rolls back a failed applier (no SyncEvent row) so the event can be retried", async () => {
    const e = evt({ entityId: "att-fail", entityType: "OMR_SCAN", entityVersion: 1,
      payload: { examId: world.a.exam.id, studentRollNumber: "260001", detectedResponses: { 1: "A" }, confidenceScores: { 1: 0.9 }, scannedAt: "2026-09-09T10:00:00.000Z" } });
    const failed = await applyPushEvents(nodeA, [e], appliers({ OMR_SCAN: boom }));
    expect(failed.results[0].status).toBe("REJECTED");
    expect(await prisma.syncEvent.findUnique({ where: { eventId: e.eventId } })).toBeNull();
    const retry = await applyPushEvents(nodeA, [e], appliers());
    expect(retry.results[0].status).toBe("APPLIED");
  });

  it("REJECTS an entityType with no applier", async () => {
    const e = evt({ entityId: "att-noapplier" });
    const partial = { ...appliers() };
    delete (partial as Record<string, unknown>).ATTENDANCE_RECORD;
    const { results } = await applyPushEvents(nodeA, [e], partial as DomainApplierMap);
    expect(results[0]).toMatchObject({ status: "REJECTED", conflictReason: "SCHEMA" });
  });

  it("treats an eventId first seen from another node as OUT_OF_SCOPE conflict", async () => {
    const e = evt({ entityId: "att-xnode", entityVersion: 1 });
    await applyPushEvents(nodeA, [e], appliers());
    const nodeB: NodeContext = { nodeId: "NODE_B", tenantId: world.a.tenant.id, branchId: null };
    const { results } = await applyPushEvents(nodeB, [e], appliers());
    expect(results[0]).toMatchObject({ status: "CONFLICT", conflictReason: "OUT_OF_SCOPE" });
  });
});

describe("buildPullDelta", () => {
  it("full snapshot on a null cursor, scoped to the node's tenant", async () => {
    const delta = await buildPullDelta(nodeA, null, 500);
    const ids = (delta.changes.students as { id: string }[]).map((s) => s.id).sort();
    expect(ids).toEqual([world.a.student.id, world.a.sibling.id, world.a.otherStudent.id].sort());
    expect((delta.changes.exams as { id: string }[]).map((e) => e.id)).toContain(world.a.exam.id);
    // never tenant B
    for (const s of delta.changes.students as { tenantId: string }[]) expect(s.tenantId).toBe(world.a.tenant.id);
    expect(delta.hasMore).toBe(false);
  });

  it("branch-scoped node sees only its branch's students", async () => {
    const branchCtx: NodeContext = { nodeId: "NODE_BR", tenantId: world.a.tenant.id, branchId: world.a.branch.id };
    const delta = await buildPullDelta(branchCtx, null, 500);
    const ids = (delta.changes.students as { id: string }[]).map((s) => s.id).sort();
    expect(ids).toEqual([world.a.student.id, world.a.sibling.id].sort()); // otherStudent is on otherBranch
  });

  it("paginates without overlap or skip and returns a resumable cursor", async () => {
    const first = await buildPullDelta(nodeA, null, 2);
    expect(first.hasMore).toBe(true);
    const firstIds = Object.values(first.changes).flat().map((r) => (r as { id: string }).id);
    expect(firstIds).toHaveLength(2);
    const second = await buildPullDelta(nodeA, first.nextCursor, 500);
    const secondIds = Object.values(second.changes).flat().map((r) => (r as { id: string }).id);
    expect(secondIds.some((id) => firstIds.includes(id))).toBe(false);
    // together they cover at least the 3 students + 3 batches + 1 exam of tenant A
    expect(new Set([...firstIds, ...secondIds]).size).toBeGreaterThanOrEqual(7);
  });

  it("rejects a cursor minted for another tenant (falls back to full snapshot)", async () => {
    const foreign = await buildPullDelta({ nodeId: "N", tenantId: world.b.tenant.id, branchId: null }, null, 2);
    const delta = await buildPullDelta(nodeA, foreign.nextCursor, 500);
    // foreign cursor ignored -> full snapshot again
    expect((delta.changes.students as unknown[]).length).toBe(3);
  });
});
