import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { call, createTestWorld, type TestWorld } from "./support/harness";
import { POST as handshake } from "../../src/app/api/v1/sync/handshake/route";
import { POST as push } from "../../src/app/api/v1/sync/push/route";
import { GET as pull } from "../../src/app/api/v1/sync/pull/route";

/**
 * SYN-001 - the Academic Node sync loop through the real route handlers:
 * pair -> push events (apply / replay / stale) -> pull delta -> rotate token
 * -> revoked node rejected. Covers AC-013 / AC-014 at the API layer.
 */

let world: TestWorld;
let token = "";

const ev = (o: Record<string, unknown>) => ({
  eventId: `ev_${Math.random().toString(36).slice(2, 12)}`,
  op: "UPSERT",
  occurredAt: "2026-09-09T12:00:00.000Z",
  ...o,
});

beforeAll(async () => {
  world = await createTestWorld();
  const paired = await call(handshake, "/api/v1/sync/handshake", {
    body: { tenantCode: world.a.tenant.code, nodeCode: "E2E-NODE-1", machineFingerprint: "fp-e2e" },
  });
  expect(paired.status).toBe(200);
  token = paired.body.pairingToken;
  expect(token.startsWith("node_")).toBe(true);
});

describe("sync/push", () => {
  it("rejects a missing or unrecognized node token", async () => {
    expect((await call(push, "/api/v1/sync/push", { method: "POST", body: { events: [] } })).status).toBe(401);
    expect((await call(push, "/api/v1/sync/push", { method: "POST", token: "node_bogus", body: { events: [] } })).status).toBe(403);
  });

  it("applies an enrollment event, then reports DUPLICATE on replay and CONFLICT on a stale version", async () => {
    const enrPayload = { studentId: world.a.sibling.id, courseId: world.a.course.id, batchId: world.a.batch.id, status: "ACTIVE" };
    const enrollmentEvent = ev({ entityType: "ENROLLMENT", entityId: "e2e-enr-1", entityVersion: 2, payload: enrPayload });

    const applied = await call(push, "/api/v1/sync/push", { method: "POST", token, body: { events: [enrollmentEvent] } });
    expect(applied.status).toBe(200);
    expect(applied.body.results[0]).toMatchObject({ status: "APPLIED", appliedVersion: 2 });
    expect(await prisma.enrollment.findUnique({ where: { id: "e2e-enr-1" } })).toMatchObject({ status: "ACTIVE" });

    const replay = await call(push, "/api/v1/sync/push", { method: "POST", token, body: { events: [enrollmentEvent] } });
    expect(replay.body.results[0].status).toBe("DUPLICATE");

    const stale = await call(push, "/api/v1/sync/push", {
      method: "POST",
      token,
      body: { events: [ev({ entityType: "ENROLLMENT", entityId: "e2e-enr-1", entityVersion: 1, payload: enrPayload })] },
    });
    expect(stale.body.results[0]).toMatchObject({ status: "CONFLICT", conflictReason: "STALE_VERSION" });
  });

  it("400s a malformed batch", async () => {
    expect((await call(push, "/api/v1/sync/push", { method: "POST", token, body: { events: [{ nope: true }] } })).status).toBe(400);
  });
});

describe("sync/pull", () => {
  it("returns a tenant-scoped delta with a resumable cursor", async () => {
    const first = await call(pull, "/api/v1/sync/pull?limit=2", { token });
    expect(first.status).toBe(200);
    for (const s of first.body.changes.students as { tenantId: string }[]) expect(s.tenantId).toBe(world.a.tenant.id);
    expect(typeof first.body.nextCursor).toBe("string");

    if (first.body.hasMore) {
      const firstIds = Object.values(first.body.changes).flat().map((r) => (r as { id: string }).id);
      const second = await call(pull, `/api/v1/sync/pull?cursor=${encodeURIComponent(first.body.nextCursor)}&limit=500`, { token });
      const secondIds = Object.values(second.body.changes).flat().map((r) => (r as { id: string }).id);
      expect(secondIds.some((id) => firstIds.includes(id))).toBe(false);
    }
  });
});

describe("sync/handshake token rotation", () => {
  it("rotates the token; the old one stops working", async () => {
    const rotated = await call(handshake, "/api/v1/sync/handshake", { body: { currentToken: token } });
    expect(rotated.status).toBe(200);
    expect(rotated.body.ok).toBe(true);
    const oldToken = token;
    token = rotated.body.pairingToken;
    expect(token).not.toBe(oldToken);

    const withOld = await call(pull, "/api/v1/sync/pull", { token: oldToken });
    expect(withOld.status).toBe(403);
    expect((await call(pull, "/api/v1/sync/pull", { token })).status).toBe(200);
  });

  it("a revoked node cannot push or rotate", async () => {
    const node = await prisma.academicNode.findFirst({ where: { pairingToken: token } });
    await prisma.academicNode.update({ where: { id: node!.id }, data: { revokedAt: new Date() } });
    expect((await call(push, "/api/v1/sync/push", { method: "POST", token, body: { events: [] } })).status).toBe(403);
    const rot = await call(handshake, "/api/v1/sync/handshake", { body: { currentToken: token } });
    expect(rot.status).toBe(403);
  });
});
