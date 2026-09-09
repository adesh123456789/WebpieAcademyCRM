import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { call, createTestWorld, type TestWorld } from "./support/harness";
import { POST as handshake } from "../../src/app/api/v1/sync/handshake/route";
import { POST as push } from "../../src/app/api/v1/sync/push/route";
import { processOfflineScan, drainOutbox } from "../../src/lib/node/offline-pipeline";
import type { SyncEventEnvelope } from "../../src/lib/sync";
import { renderSheet, TEST_30Q_GEOMETRY } from "../omr-corpus/raster-fixtures";

/**
 * EDGE-001 groundwork - the offline scan -> outbox -> reconnect -> sync loop
 * (AC-013 / AC-014) at the library level, delivered through the real
 * POST /api/v1/sync/push handler. Also proves the OMR_SCAN sync payload schema
 * now matches the domain applier (previously stripped jobId -> every scan sync
 * REJECTED).
 */

const geom = TEST_30Q_GEOMETRY;
const answers: Record<number, "A" | "B" | "C" | "D"> = {};
for (let q = 1; q <= 24; q++) answers[q] = (["A", "B", "C", "D"] as const)[q % 4];

let world: TestWorld;
let token = "";
let jobId = "";

const pushViaRoute = async (batch: SyncEventEnvelope[]) => {
  const res = await call(push, "/api/v1/sync/push", { method: "POST", token, body: { events: batch } });
  expect(res.status).toBe(200);
  return { results: res.body.results };
};

beforeAll(async () => {
  world = await createTestWorld();
  const paired = await call(handshake, "/api/v1/sync/handshake", {
    body: { tenantCode: world.a.tenant.code, nodeCode: "OFFLINE-NODE-1", machineFingerprint: "fp-off" },
  });
  token = paired.body.pairingToken;
  jobId = (await prisma.oMRJob.create({ data: { tenantId: world.a.tenant.id, examId: world.a.exam.id, status: "PROCESSING", totalSheets: 2 } })).id;
});

describe("processOfflineScan", () => {
  it("produces an OMR_SCAN outbox event for a readable sheet", () => {
    const image = renderSheet({ roll: "260014", answers });
    const { extraction, outboxEvent } = processOfflineScan({ image, geometry: geom, scanId: "scan-off-1", jobId, entityVersion: 1, supported: true });
    expect(extraction.status).toBe("CONFIDENT");
    expect(outboxEvent).not.toBeNull();
    expect(outboxEvent!.entityType).toBe("OMR_SCAN");
    expect(outboxEvent!.payload).toMatchObject({ jobId, status: "CONFIDENT", detectedRollNumber: "260014" });
  });

  it("holds a fail-safe sheet on the node (no outbox event)", () => {
    const image = renderSheet({ roll: "260014", answers, omitFiducial: 2 }); // torn corner -> REJECTED
    const { extraction, outboxEvent } = processOfflineScan({ image, geometry: geom, scanId: "scan-off-bad", jobId, entityVersion: 1, supported: true });
    expect(extraction.status).toBe("REJECTED");
    expect(outboxEvent).toBeNull();
  });
});

describe("offline -> reconnect -> drainOutbox through the real push route", () => {
  it("delivers queued scans, is idempotent on replay, and retains conflicts", async () => {
    const image = renderSheet({ roll: "260014", answers });
    const { outboxEvent } = processOfflineScan({ image, geometry: geom, scanId: "scan-drain-1", jobId, entityVersion: 2, supported: true });
    const outbox = [outboxEvent!];

    const first = await drainOutbox(outbox, pushViaRoute);
    expect(first.delivered).toEqual([outboxEvent!.eventId]);
    expect(first.retained).toEqual([]);
    const scan = await prisma.oMRScan.findUnique({ where: { id: "scan-drain-1" } });
    expect(scan?.status).toBe("CONFIDENT");
    expect(JSON.parse(scan!.detectedResponses)[1]).toBe(answers[1]);

    // reconnect replay of the same outbox -> DUPLICATE, still "delivered"
    const replay = await drainOutbox(outbox, pushViaRoute);
    expect(replay.delivered).toEqual([outboxEvent!.eventId]);

    // a stale-version event for the same scan -> retained, not delivered
    const stale: SyncEventEnvelope = { ...outboxEvent!, eventId: "ev_stale_offline", entityVersion: 1 };
    const conflicted = await drainOutbox([stale], pushViaRoute);
    expect(conflicted.delivered).toEqual([]);
    expect(conflicted.retained.map((e) => e.eventId)).toEqual(["ev_stale_offline"]);
  });

  it("retains the whole outbox when the push transport fails", async () => {
    const image = renderSheet({ roll: "260014", answers });
    const { outboxEvent } = processOfflineScan({ image, geometry: geom, scanId: "scan-neterr", jobId, entityVersion: 1, supported: true });
    const failing = async () => {
      throw new Error("network down");
    };
    const res = await drainOutbox([outboxEvent!], failing);
    expect(res.delivered).toEqual([]);
    expect(res.retained).toHaveLength(1);
  });
});
