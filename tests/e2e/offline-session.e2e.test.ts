import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { call, createTestWorld, type TestWorld } from "./support/harness";
import { POST as handshake } from "../../src/app/api/v1/sync/handshake/route";
import { POST as push } from "../../src/app/api/v1/sync/push/route";
import { GET as pull } from "../../src/app/api/v1/sync/pull/route";
import { MemoryNodeStore } from "../../src/lib/node/local-store";
import { OfflineSession, toCachedExam } from "../../src/lib/node/offline-session";
import { NodeHealthError } from "../../src/lib/node/health";
import { renderSheet, TEST_30Q_GEOMETRY } from "../omr-corpus/raster-fixtures";
import type { SyncEventEnvelope, PullDelta } from "../../src/lib/sync";

/**
 * EDGE-001 - a full offline working session: reconnect(pull) -> go offline ->
 * ingest + local evaluate -> reconnect(push) drains the outbox through the real
 * POST /api/v1/sync/push. Covers AC-013 / AC-014 / AC-020 at the library level.
 */

const geom = TEST_30Q_GEOMETRY;
let world: TestWorld;
let token = "";
let jobId = "";

beforeAll(async () => {
  world = await createTestWorld();
  token = (await call(handshake, "/api/v1/sync/handshake", {
    body: { tenantCode: world.a.tenant.code, nodeCode: "SESSION-NODE", machineFingerprint: "fp-sess" },
  })).body.pairingToken;
  jobId = (await prisma.oMRJob.create({ data: { tenantId: world.a.tenant.id, examId: world.a.exam.id, status: "PROCESSING", totalSheets: 2 } })).id;
});

const pullViaRoute = async (cursor: string | null): Promise<PullDelta> => {
  const q = cursor ? `?cursor=${encodeURIComponent(cursor)}&limit=500` : "?limit=500";
  const res = await call(pull, `/api/v1/sync/pull${q}`, { token });
  expect(res.status).toBe(200);
  return res.body as PullDelta;
};
const pushViaRoute = async (batch: SyncEventEnvelope[]) => {
  const res = await call(push, "/api/v1/sync/push", { method: "POST", token, body: { events: batch } });
  expect(res.status).toBe(200);
  return { results: res.body.results };
};

async function seededSession() {
  const store = new MemoryNodeStore();
  const session = new OfflineSession(store);
  await session.reconnect({ pull: pullViaRoute }); // roster into the local cache
  const exam = await prisma.exam.findUniqueOrThrow({
    where: { id: world.a.exam.id },
    include: { examQuestions: { include: { question: true } } },
  });
  store.putExam(toCachedExam(exam as any));
  return { store, session };
}

describe("OfflineSession", () => {
  it("caches the branch-scoped roster on reconnect(pull)", async () => {
    // the paired node is scoped to the tenant's first branch (handshake default)
    const { store } = await seededSession();
    const ids = store.listStudents().map((s) => s.id).sort();
    expect(ids).toEqual([world.a.student.id, world.a.sibling.id].sort()); // otherStudent is on otherBranch
  });

  it("ingests offline scans into the store + outbox and scores them locally", async () => {
    const { store, session } = await seededSession();

    const s1 = session.ingestScan({ image: renderSheet({ roll: world.a.student.rollNumber, answers: { 1: "A" } }), geometry: geom, scanId: "sess-scan-1", jobId, entityVersion: 1, supported: true });
    const s2 = session.ingestScan({ image: renderSheet({ roll: world.a.sibling.rollNumber, answers: { 1: "B" } }), geometry: geom, scanId: "sess-scan-2", jobId, entityVersion: 1, supported: true });
    expect(s1).toEqual({ extraction: "CONFIDENT", queued: true });
    expect(s2.queued).toBe(true);
    expect(store.outbox()).toHaveLength(2);
    expect(store.getScan("sess-scan-1")?.studentId).toBe(world.a.student.id);

    const results = session.evaluateExamLocally(world.a.exam.id, jobId);
    expect(results).toHaveLength(2);
    const forStudent = results.find((r) => r.studentId === world.a.student.id)!;
    const forSibling = results.find((r) => r.studentId === world.a.sibling.id)!;
    expect(forStudent.totalCorrect).toBe(1); // answered A, key is A
    expect(forSibling.totalIncorrect).toBe(1); // answered B
  });

  it("reconnect(push) drains the outbox through the real route and is idempotent", async () => {
    const { store, session } = await seededSession();
    session.ingestScan({ image: renderSheet({ roll: world.a.student.rollNumber, answers: { 1: "A" } }), geometry: geom, scanId: "sess-drain-1", jobId, entityVersion: 3, supported: true });
    const queued = store.outbox()[0].eventId;

    const r1 = await session.reconnect({ push: pushViaRoute });
    expect(r1.delivered).toEqual([queued]);
    expect(store.outbox()).toEqual([]);
    const scan = await prisma.oMRScan.findUnique({ where: { id: "sess-drain-1" } });
    expect(scan?.status).toBe("CONFIDENT");
    expect(JSON.parse(scan!.detectedResponses)["1"]).toBe("A");

    // reconnect again with an empty outbox -> no-op, no throw
    const r2 = await session.reconnect({ push: pushViaRoute });
    expect(r2.delivered).toEqual([]);
    expect(r2.retained).toBe(0);
  });

  it("pull cursor advances and a second pull with no changes is empty", async () => {
    const { store, session } = await seededSession();
    const cursor1 = store.getPullCursor();
    expect(cursor1).toBeTruthy();
    const r = await session.reconnect({ pull: pullViaRoute });
    expect(r.pulled).toBe(0); // nothing new since the seed pull
  });

  it("AC-020: a heavy step is refused when the node is in PAUSE (low disk)", async () => {
    const store = new MemoryNodeStore();
    const paused = new OfflineSession(store, {
      probe: { disk: () => ({ free: 10 * 1024 * 1024, total: 500 * 1024 * 1024 * 1024 }), mem: () => ({ free: 8e9, total: 16e9 }) },
    });
    expect(() =>
      paused.ingestScan({ image: renderSheet({ roll: "260001", answers: { 1: "A" } }), geometry: geom, scanId: "x", jobId, entityVersion: 1 }),
    ).toThrow(NodeHealthError);
  });
});
