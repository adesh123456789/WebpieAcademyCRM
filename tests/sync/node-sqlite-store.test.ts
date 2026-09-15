import { describe, expect, it } from "vitest";
import { SqliteNodeStore } from "../../src/lib/node/sqlite-store";

/**
 * EDGE-001 - SqliteNodeStore's own contract, in isolation from OfflineSession
 * (see tests/e2e/offline-session-sqlite.e2e.test.ts for the integrated flow
 * and the on-disk-plaintext / restart-durability checks). All in :memory:.
 */

const KEY = "unit-test-node-encryption-key-32bytes";

describe("SqliteNodeStore", () => {
  it("returns null for everything before anything is written", () => {
    const store = new SqliteNodeStore(":memory:", { encryptionKey: KEY });
    expect(store.getPairing()).toBeNull();
    expect(store.getExam("x")).toBeNull();
    expect(store.getStudentByRoll("x")).toBeNull();
    expect(store.listStudents()).toEqual([]);
    expect(store.getScan("x")).toBeNull();
    expect(store.listScans("job")).toEqual([]);
    expect(store.outbox()).toEqual([]);
    expect(store.getPullCursor()).toBeNull();
    store.close();
  });

  it("pairing is a singleton row - setPairing twice replaces, not duplicates", () => {
    const store = new SqliteNodeStore(":memory:", { encryptionKey: KEY });
    store.setPairing({ nodeId: "n1", tenantId: "t1", branchId: "b1", token: "tok-1" });
    store.setPairing({ nodeId: "n1", tenantId: "t1", branchId: "b2", token: "tok-2" });
    expect(store.getPairing()).toEqual({ nodeId: "n1", tenantId: "t1", branchId: "b2", token: "tok-2" });
    store.close();
  });

  it("exam / student / scan round-trip by id, and students are also findable by roll", () => {
    const store = new SqliteNodeStore(":memory:", { encryptionKey: KEY });
    const exam = { id: "e1", totalQuestions: 2, markingRules: { correct: 4 }, questions: [] };
    store.putExam(exam);
    expect(store.getExam("e1")).toEqual(exam);
    // upsert, not duplicate
    store.putExam({ ...exam, totalQuestions: 5 });
    expect(store.getExam("e1")?.totalQuestions).toBe(5);

    store.putStudent({ id: "s1", rollNumber: "R1", name: "Alice", branchId: "b1" });
    expect(store.getStudentByRoll("R1")?.id).toBe("s1");
    expect(store.listStudents()).toHaveLength(1);

    store.putScan({ id: "sc1", jobId: "j1", studentId: "s1", detectedRollNumber: "R1", status: "CONFIDENT", detectedResponses: { 1: "A" }, confidenceScore: 0.9 });
    expect(store.getScan("sc1")?.studentId).toBe("s1");
    expect(store.listScans("j1")).toHaveLength(1);
    expect(store.listScans("other-job")).toEqual([]);
    store.close();
  });

  it("outbox enqueue is idempotent on eventId and preserves insertion order; dequeue removes exactly the given ids", () => {
    const store = new SqliteNodeStore(":memory:", { encryptionKey: KEY });
    const ev = (id: string) => ({ eventId: id, entityType: "OMR_SCAN", entityId: id, entityVersion: 1, payload: {}, occurredAt: new Date().toISOString() }) as any;
    store.enqueue(ev("e1"));
    store.enqueue(ev("e2"));
    store.enqueue(ev("e1")); // duplicate, ignored
    expect(store.outbox().map((e) => e.eventId)).toEqual(["e1", "e2"]);
    store.dequeue(["e1"]);
    expect(store.outbox().map((e) => e.eventId)).toEqual(["e2"]);
    store.dequeue([]); // no-op, doesn't throw
    store.close();
  });

  it("pull cursor set/clear", () => {
    const store = new SqliteNodeStore(":memory:", { encryptionKey: KEY });
    expect(store.getPullCursor()).toBeNull();
    store.setPullCursor("cursor-1");
    expect(store.getPullCursor()).toBe("cursor-1");
    store.setPullCursor("cursor-2");
    expect(store.getPullCursor()).toBe("cursor-2");
    store.setPullCursor(null);
    expect(store.getPullCursor()).toBeNull();
    store.close();
  });

  it("applyDelta upserts student changes and applies tombstones inside one transaction", () => {
    const store = new SqliteNodeStore(":memory:", { encryptionKey: KEY });
    store.putStudent({ id: "s1", rollNumber: "R1", name: "Alice", branchId: "b1" });
    store.putExam({ id: "e1", totalQuestions: 1, markingRules: {}, questions: [] });

    store.applyDelta({
      changes: { students: [{ id: "s2", rollNumber: "R2", name: "Bob", branchId: "b1", extraCloudField: "ignored" }] },
      tombstones: [{ entityType: "students", entityId: "s1" }, { entityType: "exams", entityId: "e1" }],
      nextCursor: "c1",
      hasMore: false,
    });

    expect(store.getStudentByRoll("R2")?.id).toBe("s2");
    expect(store.getStudentByRoll("R1")).toBeNull(); // tombstoned
    expect(store.getExam("e1")).toBeNull(); // tombstoned
    store.close();
  });

  it("setPairing / getPairing without an encryption key throws (never silently plaintext)", () => {
    const store = new SqliteNodeStore(":memory:"); // no key, no NODE_ENCRYPTION_KEY in this test env
    expect(() => store.setPairing({ nodeId: "n", tenantId: "t", branchId: null, token: "x" })).toThrow(/NODE_ENCRYPTION_KEY/);
    store.close();
  });
});
