import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { createTestWorld, type TestWorld } from "../support/fixtures";
import { rotateNodeToken } from "../../src/lib/sync";

/** SYN-001 / C06 A.7 - Academic Node token rotation via compare-and-swap. */

let world: TestWorld;

async function makeNode(over: Partial<{ pairingToken: string; revokedAt: Date | null; tokenExpiresAt: Date | null }> = {}) {
  return prisma.academicNode.create({
    data: {
      tenantId: world.a.tenant.id,
      nodeCode: `ND-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      name: "Test node",
      machineFingerprint: "fp",
      pairingToken: over.pairingToken ?? `node_${Math.random().toString(36).slice(2, 30)}`,
      tokenExpiresAt: over.tokenExpiresAt === undefined ? new Date(Date.now() + 86_400_000) : over.tokenExpiresAt,
      revokedAt: over.revokedAt ?? null,
    },
  });
}

beforeAll(async () => {
  world = await createTestWorld();
});

describe("rotateNodeToken", () => {
  it("issues a fresh token + 90-day expiry and invalidates the old one", async () => {
    const node = await makeNode();
    const res = await rotateNodeToken(node.pairingToken);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.pairingToken).not.toBe(node.pairingToken);
    expect(res.tokenExpiresAt.getTime()).toBeGreaterThan(Date.now() + 80 * 86_400_000);

    const reloaded = await prisma.academicNode.findUnique({ where: { id: node.id } });
    expect(reloaded?.pairingToken).toBe(res.pairingToken);
    // old token no longer resolves
    expect(await prisma.academicNode.findUnique({ where: { pairingToken: node.pairingToken } })).toBeNull();
    // audit trail
    expect(await prisma.auditLog.count({ where: { entityId: node.id, action: "ACADEMIC_NODE_TOKEN_ROTATED" } })).toBe(1);
  });

  it("refuses a revoked node", async () => {
    const node = await makeNode({ revokedAt: new Date() });
    expect(await rotateNodeToken(node.pairingToken)).toEqual({ ok: false, reason: "REVOKED" });
  });

  it("refuses an expired token (inclusive) - node must re-pair", async () => {
    const node = await makeNode({ tokenExpiresAt: new Date(Date.now() - 1000) });
    expect(await rotateNodeToken(node.pairingToken)).toEqual({ ok: false, reason: "EXPIRED" });
  });

  it("refuses an unknown token", async () => {
    expect(await rotateNodeToken("node_does_not_exist")).toEqual({ ok: false, reason: "UNKNOWN" });
    expect(await rotateNodeToken("not-even-a-node-token")).toEqual({ ok: false, reason: "UNKNOWN" });
  });

  it("concurrent rotation of the same token mints exactly one successor", async () => {
    const node = await makeNode();
    const [a, b] = await Promise.all([rotateNodeToken(node.pairingToken), rotateNodeToken(node.pairingToken)]);
    const okCount = [a, b].filter((r) => r.ok).length;
    const raceCount = [a, b].filter((r) => !r.ok && r.reason === "RACE").length;
    expect(okCount).toBe(1);
    expect(raceCount).toBe(1);
  });
});
