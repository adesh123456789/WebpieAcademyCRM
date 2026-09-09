import { describe, expect, it } from "vitest";
import {
  canonicalPayloadHash,
  canonicalize,
  classifyConflict,
  decodeCursor,
  encodeCursor,
  parsePushBatch,
  verifyNodeSignature,
  nodeSignature,
  type NodeContext,
  type SyncEventEnvelope,
} from "../../src/lib/sync";

/**
 * SYN-001 pure core (C06). The transactional applyPushEvents / buildPullDelta
 * wait on Codex's SyncEvent model + EVAL-001; carve-out acked in
 * docs/handoffs/C06-...-codex.md.
 */

const ctxA: NodeContext = { nodeId: "node-a", tenantId: "T_A", branchId: "BR_1" };
const ctxTenant: NodeContext = { nodeId: "node-t", tenantId: "T_A", branchId: null };

const evt = (over: Partial<SyncEventEnvelope> = {}): SyncEventEnvelope => ({
  eventId: "ev_00000001",
  entityType: "ATTENDANCE_RECORD",
  entityId: "att-1",
  entityVersion: 3,
  op: "UPSERT",
  occurredAt: "2026-09-09T10:00:00.000Z",
  payload: { batchId: "b1", sessionDate: "2026-09-09", studentId: "s1", status: "PRESENT" },
  ...over,
});

describe("canonical hashing", () => {
  it("is stable across key order and equal for logically equal payloads", () => {
    const a = canonicalPayloadHash(evt({ payload: { batchId: "b1", sessionDate: "2026-09-09", studentId: "s1", status: "PRESENT" } }));
    const b = canonicalPayloadHash(evt({ payload: { status: "PRESENT", studentId: "s1", batchId: "b1", sessionDate: "2026-09-09" } }));
    expect(a).toBe(b);
  });
  it("changes when identity, version, op or payload changes", () => {
    const base = canonicalPayloadHash(evt());
    expect(canonicalPayloadHash(evt({ entityVersion: 4 }))).not.toBe(base);
    expect(canonicalPayloadHash(evt({ op: "DELETE" }))).not.toBe(base);
    expect(canonicalPayloadHash(evt({ entityId: "att-2" }))).not.toBe(base);
    expect(canonicalPayloadHash(evt({ payload: { batchId: "b1", sessionDate: "2026-09-09", studentId: "s1", status: "ABSENT" } }))).not.toBe(base);
  });
  it("canonicalize normalizes -0 and drops undefined", () => {
    expect(canonicalize({ a: -0, b: undefined, c: 1 })).toBe('{"a":0,"c":1}');
  });
});

describe("conflict classification (C06 A.5 - no profile-field LWW exception)", () => {
  it("applies a strictly newer version", () => {
    expect(classifyConflict({ entityType: "ENROLLMENT", incomingVersion: 5, storedVersion: 4, eventAlreadySeen: false })).toBe("APPLY");
  });
  it("rejects a stale or equal version for every entity type, including profile fields", () => {
    for (const t of ["OMR_SCAN", "EXAM_RESULT", "ATTENDANCE_RECORD", "ENROLLMENT", "STUDENT_PROFILE_FIELD"] as const) {
      expect(classifyConflict({ entityType: t, incomingVersion: 4, storedVersion: 4, eventAlreadySeen: false })).toBe("CONFLICT_STALE");
      expect(classifyConflict({ entityType: t, incomingVersion: 2, storedVersion: 7, eventAlreadySeen: false })).toBe("CONFLICT_STALE");
    }
  });
  it("distinguishes a matching replay from a divergent one", () => {
    expect(classifyConflict({ entityType: "OMR_SCAN", incomingVersion: 3, storedVersion: 2, eventAlreadySeen: true, hashMatchesPrior: true })).toBe("DUPLICATE_MATCH");
    expect(classifyConflict({ entityType: "OMR_SCAN", incomingVersion: 3, storedVersion: 2, eventAlreadySeen: true, hashMatchesPrior: false })).toBe("DUPLICATE_DIVERGENT");
  });
  it("treats a non-positive or non-integer version as stale", () => {
    expect(classifyConflict({ entityType: "ENROLLMENT", incomingVersion: 0, storedVersion: null, eventAlreadySeen: false })).toBe("CONFLICT_STALE");
    expect(classifyConflict({ entityType: "ENROLLMENT", incomingVersion: 1.5, storedVersion: null, eventAlreadySeen: false })).toBe("CONFLICT_STALE");
  });
});

describe("pull cursor codec (C06 A.6 - scope-bound + signed)", () => {
  const state = { tenantId: "T_A", scopeKey: "BR_1", streamKey: "students", position: "2026-09-09T10:00:00Z|id-500", snapshotBoundary: "sb-1" };

  it("round-trips for the issuing node context", () => {
    const token = encodeCursor(state);
    expect(decodeCursor(token, ctxA)).toEqual(state);
  });
  it("rejects a cursor bound to another tenant", () => {
    const token = encodeCursor(state);
    expect(decodeCursor(token, { ...ctxA, tenantId: "T_B" })).toBeNull();
  });
  it("rejects a cursor bound to another branch/scope", () => {
    const token = encodeCursor(state);
    expect(decodeCursor(token, { ...ctxA, branchId: "BR_2" })).toBeNull();
  });
  it("a tenant-level node uses its nodeId as the scope key", () => {
    const tState = { ...state, scopeKey: "node-t" };
    expect(decodeCursor(encodeCursor(tState), ctxTenant)).toEqual(tState);
  });
  it("rejects a tampered signature or body", () => {
    const token = encodeCursor(state);
    const [body, mac] = token.split(".");
    expect(decodeCursor(`${body}.${mac.slice(0, -2)}xx`, ctxA)).toBeNull();
    const otherBody = Buffer.from(JSON.stringify({ ...state, scopeKey: "BR_9" }), "utf8").toString("base64url");
    expect(decodeCursor(`${otherBody}.${mac}`, ctxA)).toBeNull();
  });
  it("returns null for absent/garbage tokens", () => {
    expect(decodeCursor(null, ctxA)).toBeNull();
    expect(decodeCursor("not-a-cursor", ctxA)).toBeNull();
  });
});

describe("push batch validation", () => {
  const good = { events: [evt()] };

  it("accepts a well-formed batch", () => {
    expect(parsePushBatch(good).events).toHaveLength(1);
  });
  it("rejects a bad envelope, oversized batch, and in-batch duplicate eventId", () => {
    expect(() => parsePushBatch({ events: [] })).toThrow();
    expect(() => parsePushBatch({ events: [evt({ entityVersion: 0 })] })).toThrow();
    expect(() => parsePushBatch({ events: [evt(), evt()] })).toThrow(); // same eventId twice
    expect(() => parsePushBatch({ events: Array.from({ length: 501 }, (_, i) => evt({ eventId: `ev_${i.toString().padStart(8, "0")}` })) })).toThrow();
  });
  it("rejects a payload that does not match its entityType", () => {
    expect(() => parsePushBatch({ events: [evt({ entityType: "OMR_SCAN", payload: { nope: true } })] })).toThrow();
    expect(() =>
      parsePushBatch({
        events: [evt({ entityType: "OMR_SCAN", payload: { examId: "e1", studentRollNumber: "260001", detectedResponses: { 1: "Z" }, confidenceScores: { 1: 0.9 }, scannedAt: "2026-09-09T10:00:00.000Z" } })],
      }),
    ).toThrow(); // option "Z" invalid
  });
  it("allows a DELETE event to carry identity only", () => {
    expect(parsePushBatch({ events: [evt({ op: "DELETE", payload: {} })] }).events).toHaveLength(1);
  });
});

describe("node request signature (C06 s6)", () => {
  const node = { pairingToken: "node_secrettoken" };
  const body = JSON.stringify({ events: [] });
  const headers = (h: Record<string, string>) => new Headers(h);

  it("accepts a fresh valid signature", () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = nodeSignature(body, ts, node.pairingToken);
    expect(verifyNodeSignature(body, headers({ "x-node-signature": sig, "x-node-timestamp": ts }), node)).toBe(true);
  });
  it("rejects missing headers, stale timestamp and a wrong signature", () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = nodeSignature(body, ts, node.pairingToken);
    expect(() => verifyNodeSignature(body, headers({}), node)).toThrow();
    const stale = String(Math.floor(Date.now() / 1000) - 3600);
    expect(() => verifyNodeSignature(body, headers({ "x-node-signature": sig, "x-node-timestamp": stale }), node)).toThrow();
    expect(() => verifyNodeSignature(body, headers({ "x-node-signature": "deadbeef", "x-node-timestamp": ts }), node)).toThrow();
    expect(() => verifyNodeSignature("tampered-body", headers({ "x-node-signature": sig, "x-node-timestamp": ts }), node)).toThrow();
  });
});
