import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { prisma } from "../../src/lib/prisma";
import { call, createTestWorld, type TestWorld } from "./support/harness";
import { POST as handshake } from "../../src/app/api/v1/sync/handshake/route";
import { POST as push } from "../../src/app/api/v1/sync/push/route";
import { GET as pull } from "../../src/app/api/v1/sync/pull/route";
import { SqliteNodeStore } from "../../src/lib/node/sqlite-store";
import { OfflineSession, toCachedExam } from "../../src/lib/node/offline-session";
import { renderSheet, TEST_30Q_GEOMETRY } from "../omr-corpus/raster-fixtures";
import type { SyncEventEnvelope, PullDelta } from "../../src/lib/sync";

/**
 * EDGE-001 - the same OfflineSession flow as offline-session.e2e.test.ts, but
 * over SqliteNodeStore instead of MemoryNodeStore: proves NodeStore's durable
 * implementation is a drop-in (OfflineSession never knows which one it has),
 * and that the cache, pairing and outbox genuinely survive a process restart
 * (closing and reopening the SQLite file), not just an in-memory Map.
 */

const geom = TEST_30Q_GEOMETRY;
const KEY = "sqlite-store-e2e-encryption-key-32b";
let world: TestWorld;
let token = "";
let jobId = "";

const paths: string[] = [];
function tmpDbPath(): string {
  const p = join(tmpdir(), `node-store-${Math.random().toString(36).slice(2)}.sqlite`);
  paths.push(p);
  return p;
}

afterAll(() => {
  for (const p of paths.splice(0)) {
    for (const suffix of ["", "-wal", "-shm"]) {
      if (existsSync(p + suffix)) rmSync(p + suffix);
    }
  }
});

beforeAll(async () => {
  world = await createTestWorld();
  token = (
    await call(handshake, "/api/v1/sync/handshake", {
      body: { tenantCode: world.a.tenant.code, nodeCode: "SQLITE-NODE", machineFingerprint: "fp-sqlite" },
    })
  ).body.pairingToken;
  jobId = (
    await prisma.oMRJob.create({ data: { tenantId: world.a.tenant.id, examId: world.a.exam.id, status: "PROCESSING", totalSheets: 2 } })
  ).id;
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

async function cacheExam(store: SqliteNodeStore) {
  const exam = await prisma.exam.findUniqueOrThrow({
    where: { id: world.a.exam.id },
    include: { examQuestions: { include: { question: true } } },
  });
  store.putExam(toCachedExam(exam as any));
}

describe("OfflineSession over SqliteNodeStore", () => {
  it("caches the roster via reconnect(pull) exactly like MemoryNodeStore", async () => {
    const store = new SqliteNodeStore(tmpDbPath(), { encryptionKey: KEY });
    const session = new OfflineSession(store);
    await session.reconnect({ pull: pullViaRoute });
    const ids = store.listStudents().map((s) => s.id).sort();
    expect(ids).toEqual([world.a.student.id, world.a.sibling.id].sort());
    store.close();
  });

  it("ingests a scan, scores it locally, and drains the durable outbox through the real push route", async () => {
    const store = new SqliteNodeStore(tmpDbPath(), { encryptionKey: KEY });
    const session = new OfflineSession(store);
    await session.reconnect({ pull: pullViaRoute });
    await cacheExam(store);

    const result = session.ingestScan({
      image: renderSheet({ roll: world.a.student.rollNumber, answers: { 1: "A" } }),
      geometry: geom,
      scanId: "sqlite-scan-1",
      jobId,
      entityVersion: 1,
      supported: true,
    });
    expect(result).toEqual({ extraction: "CONFIDENT", queued: true });
    expect(store.outbox()).toHaveLength(1);

    const scored = session.evaluateExamLocally(world.a.exam.id, jobId);
    expect(scored.find((r) => r.studentId === world.a.student.id)?.totalCorrect).toBe(1);

    const r = await session.reconnect({ push: pushViaRoute });
    expect(r.delivered).toHaveLength(1);
    expect(store.outbox()).toEqual([]);
    const scan = await prisma.oMRScan.findUnique({ where: { id: "sqlite-scan-1" } });
    expect(scan?.status).toBe("CONFIDENT");
    store.close();
  });

  it("survives a process restart: pairing, cached roster and a queued outbox event reopen intact", async () => {
    const path = tmpDbPath();
    const pairing = { nodeId: "node-restart", tenantId: world.a.tenant.id, branchId: world.a.branch.id, token: "pairing-secret-token-xyz" };

    const before = new SqliteNodeStore(path, { encryptionKey: KEY });
    before.setPairing(pairing);
    const session1 = new OfflineSession(before);
    await session1.reconnect({ pull: pullViaRoute });
    session1.ingestScan({
      image: renderSheet({ roll: world.a.sibling.rollNumber, answers: { 1: "B" } }),
      geometry: geom,
      scanId: "sqlite-restart-scan",
      jobId,
      entityVersion: 1,
      supported: true,
    });
    const queuedEventId = before.outbox()[0].eventId;
    before.close(); // simulates the node process exiting

    // "restart": a fresh SqliteNodeStore instance over the same file
    const after = new SqliteNodeStore(path, { encryptionKey: KEY });
    expect(after.getPairing()).toEqual(pairing);
    expect(after.listStudents().map((s) => s.id).sort()).toEqual([world.a.student.id, world.a.sibling.id].sort());
    expect(after.outbox().map((e) => e.eventId)).toEqual([queuedEventId]);
    expect(after.getScan("sqlite-restart-scan")?.detectedRollNumber).toBe(world.a.sibling.rollNumber);

    const session2 = new OfflineSession(after);
    const r = await session2.reconnect({ push: pushViaRoute });
    expect(r.delivered).toEqual([queuedEventId]);
    after.close();
  });

  it("the pairing token never touches disk in plaintext (SEC-006)", () => {
    const path = tmpDbPath();
    const token = "super-secret-node-pairing-token";
    const store = new SqliteNodeStore(path, { encryptionKey: KEY });
    store.setPairing({ nodeId: "n1", tenantId: world.a.tenant.id, branchId: null, token });
    store.close(); // flush WAL into the main file

    const onDisk = readFileSync(path);
    expect(onDisk.includes(Buffer.from(token, "utf8"))).toBe(false);
    if (existsSync(`${path}-wal`)) {
      const wal = readFileSync(`${path}-wal`);
      expect(wal.includes(Buffer.from(token, "utf8"))).toBe(false);
    }

    // and it fails closed with the wrong key
    const wrongKey = new SqliteNodeStore(path, { encryptionKey: "a-completely-different-key-000000" });
    expect(() => wrongKey.getPairing()).toThrow(/decrypt/i);
    wrongKey.close();
  });

  it("requires NODE_ENCRYPTION_KEY before touching the pairing token", () => {
    const store = new SqliteNodeStore(tmpDbPath()); // no key, env unset in this test env
    expect(() => store.setPairing({ nodeId: "n", tenantId: "t", branchId: null, token: "x" })).toThrow(
      /NODE_ENCRYPTION_KEY/,
    );
    store.close();
  });

  it("applyDelta upserts cached students and honours student/exam tombstones, transactionally", async () => {
    const store = new SqliteNodeStore(tmpDbPath(), { encryptionKey: KEY });
    await cacheExam(store);
    store.putStudent({ id: "s-local", rollNumber: "999999", name: "Local only", branchId: world.a.branch.id });

    store.applyDelta({
      changes: { students: [{ id: "s-new", rollNumber: "111111", name: "Fresh pull", branchId: world.a.branch.id, ignoredExtraField: true }] },
      tombstones: [
        { entityType: "students", entityId: "s-local" },
        { entityType: "exams", entityId: world.a.exam.id },
      ],
      nextCursor: "c1",
      hasMore: false,
    });

    expect(store.getStudentByRoll("111111")?.id).toBe("s-new");
    expect(store.getStudentByRoll("999999")).toBeNull();
    expect(store.getExam(world.a.exam.id)).toBeNull();
    store.close();
  });
});
