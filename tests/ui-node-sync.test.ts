/**
 * tests/ui-node-sync.test.ts
 *
 * Unit tests for UI-011 Academic Node Fleet & Sync Hub UI.
 * Verifies operational status classification, 90-day token TTL calculations,
 * event envelope filtering, and Contract C06 conflict invariants.
 */

import { describe, it, expect } from "vitest";
import {
  getNodeOperationalStatus,
  getTokenRemainingDays,
  filterSyncEvents,
  isConflictEvent,
  type AcademicNodeRecord,
  type SyncEventEnvelope,
} from "../src/components/modals/NodeSyncModal";

describe("UI-011: Node Operational Status Classifier", () => {
  const baseNow = new Date("2026-09-09T12:00:00Z");

  it("classifies node as REVOKED if revokedAt is non-null, overriding other fields", () => {
    const node: AcademicNodeRecord = {
      id: "node_1",
      nodeCode: "NODE-PUNE-01",
      name: "Scanner 1",
      machineFingerprint: "WIN-PC-1",
      status: "ONLINE",
      lastSeenAt: new Date("2026-09-09T11:58:00Z"),
      tokenExpiresAt: new Date("2026-12-09T12:00:00Z"),
      revokedAt: new Date("2026-09-08T10:00:00Z"),
    };

    expect(getNodeOperationalStatus(node, baseNow)).toBe("REVOKED");
  });

  it("classifies node as TOKEN_EXPIRED if tokenExpiresAt is in the past", () => {
    const node: AcademicNodeRecord = {
      id: "node_2",
      nodeCode: "NODE-PUNE-02",
      name: "Scanner 2",
      machineFingerprint: "WIN-PC-2",
      status: "ONLINE",
      tokenExpiresAt: new Date("2026-09-08T12:00:00Z"), // Expired 1 day ago
    };

    expect(getNodeOperationalStatus(node, baseNow)).toBe("TOKEN_EXPIRED");
  });

  it("classifies node as TOKEN_EXPIRING_SOON if token expires within 14 days", () => {
    const node: AcademicNodeRecord = {
      id: "node_3",
      nodeCode: "NODE-PUNE-03",
      name: "Scanner 3",
      machineFingerprint: "WIN-PC-3",
      status: "ONLINE",
      tokenExpiresAt: new Date("2026-09-17T12:00:00Z"), // 8 days away
    };

    expect(getNodeOperationalStatus(node, baseNow)).toBe("TOKEN_EXPIRING_SOON");
  });

  it("classifies node as ONLINE if lastSeenAt is within 10 minutes", () => {
    const node: AcademicNodeRecord = {
      id: "node_4",
      nodeCode: "NODE-PUNE-04",
      name: "Scanner 4",
      machineFingerprint: "WIN-PC-4",
      status: "ACTIVE",
      lastSeenAt: new Date("2026-09-09T11:55:00Z"), // 5 min ago
      tokenExpiresAt: new Date("2026-12-09T12:00:00Z"),
    };

    expect(getNodeOperationalStatus(node, baseNow)).toBe("ONLINE");
  });

  it("classifies node as OFFLINE if dormant or lastSeenAt is older than 10 minutes", () => {
    const node: AcademicNodeRecord = {
      id: "node_5",
      nodeCode: "NODE-PUNE-05",
      name: "Scanner 5",
      machineFingerprint: "WIN-PC-5",
      status: "OFFLINE",
      lastSeenAt: new Date("2026-09-08T12:00:00Z"), // 24 hours ago
      tokenExpiresAt: new Date("2026-12-09T12:00:00Z"),
    };

    expect(getNodeOperationalStatus(node, baseNow)).toBe("OFFLINE");
  });
});

describe("UI-011: Token TTL Calculations (Contract C06 90-Day Policy)", () => {
  const baseNow = new Date("2026-09-09T00:00:00Z");

  it("computes remaining days correctly for active token", () => {
    const expiry = new Date("2026-10-09T00:00:00Z"); // 30 days
    expect(getTokenRemainingDays(expiry, baseNow)).toBe(30);
  });

  it("returns negative days for expired token", () => {
    const expiry = new Date("2026-09-05T00:00:00Z"); // -4 days
    expect(getTokenRemainingDays(expiry, baseNow)).toBe(-4);
  });

  it("returns default 90 days when tokenExpiresAt is not provided", () => {
    expect(getTokenRemainingDays(undefined, baseNow)).toBe(90);
  });
});

describe("UI-011: Event Envelope Filtering & Causal Ordering", () => {
  const sampleEvents: SyncEventEnvelope[] = [
    {
      eventId: "evt_101",
      nodeCode: "NODE-PUNE-01",
      entityType: "OMR_SCAN",
      entityId: "scan_01",
      entityVersion: 1,
      op: "APPEND",
      occurredAt: "2026-09-09T10:00:00Z",
      status: "APPLIED",
    },
    {
      eventId: "evt_102",
      nodeCode: "NODE-PUNE-01",
      entityType: "EXAM_RESULT",
      entityId: "res_01",
      entityVersion: 2,
      op: "APPEND",
      occurredAt: "2026-09-09T10:05:00Z",
      status: "CONFLICT",
      conflictReason: "STALE_VERSION: Cannot mutate finalized result",
    },
    {
      eventId: "evt_103",
      nodeCode: "NODE-PUNE-02",
      entityType: "ATTENDANCE_RECORD",
      entityId: "att_01",
      entityVersion: 1,
      op: "UPSERT",
      occurredAt: "2026-09-09T10:10:00Z",
      status: "DUPLICATE",
    },
  ];

  it("filters events by entityType", () => {
    const filtered = filterSyncEvents(sampleEvents, { entityType: "OMR_SCAN" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].eventId).toBe("evt_101");
  });

  it("filters events by status", () => {
    const conflicts = filterSyncEvents(sampleEvents, { status: "CONFLICT" });
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].eventId).toBe("evt_102");
  });

  it("searches events by text query (id, entity, or node)", () => {
    const matchNode = filterSyncEvents(sampleEvents, { search: "NODE-PUNE-02" });
    expect(matchNode).toHaveLength(1);
    expect(matchNode[0].eventId).toBe("evt_103");

    const matchEntity = filterSyncEvents(sampleEvents, { search: "res_01" });
    expect(matchEntity).toHaveLength(1);
    expect(matchEntity[0].entityType).toBe("EXAM_RESULT");
  });

  it("identifies conflict events correctly", () => {
    expect(isConflictEvent(sampleEvents[0])).toBe(false); // APPLIED
    expect(isConflictEvent(sampleEvents[1])).toBe(true);  // CONFLICT
    expect(isConflictEvent(sampleEvents[2])).toBe(false); // DUPLICATE

    const rejectedEv: SyncEventEnvelope = {
      ...sampleEvents[0],
      status: "REJECTED",
    };
    expect(isConflictEvent(rejectedEv)).toBe(true);
  });
});
