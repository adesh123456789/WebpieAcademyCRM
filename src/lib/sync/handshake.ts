import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * SYN-001 / C06 s6 + amendment A.7 - Academic Node token rotation.
 *
 * A node refreshes its pairing token before expiry. Rotation:
 *   - requires a currently valid, non-revoked credential
 *   - is an atomic compare-and-swap on the old token, so two concurrent
 *     rotations can never mint two valid successors
 *   - expiry is inclusive (`tokenExpiresAt <= now` => expired => re-pair, not rotate)
 *   - a revoked node cannot rotate.
 */

const TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

export type RotateResult =
  | { ok: true; pairingToken: string; tokenExpiresAt: Date }
  | { ok: false; reason: "UNKNOWN" | "REVOKED" | "EXPIRED" | "RACE" };

function newToken(): string {
  return `node_${randomBytes(24).toString("hex")}`;
}

export async function rotateNodeToken(currentToken: string, now: Date = new Date()): Promise<RotateResult> {
  if (!currentToken || !currentToken.startsWith("node_")) return { ok: false, reason: "UNKNOWN" };

  const node = await prisma.academicNode.findUnique({ where: { pairingToken: currentToken } });
  if (!node) return { ok: false, reason: "UNKNOWN" };
  if (node.revokedAt) return { ok: false, reason: "REVOKED" };
  if (node.tokenExpiresAt && node.tokenExpiresAt.getTime() <= now.getTime()) {
    return { ok: false, reason: "EXPIRED" };
  }

  const pairingToken = newToken();
  const tokenExpiresAt = new Date(now.getTime() + TOKEN_TTL_MS);

  // Compare-and-swap: only the holder of the exact current token, still unrevoked,
  // wins. A concurrent rotation that already swapped -> this matches 0 rows.
  const swapped = await prisma.academicNode.updateMany({
    where: { id: node.id, pairingToken: currentToken, revokedAt: null },
    data: { pairingToken, tokenExpiresAt, lastSeenAt: now },
  });
  if (swapped.count !== 1) return { ok: false, reason: "RACE" };

  await prisma.auditLog.create({
    data: {
      tenantId: node.tenantId,
      action: "ACADEMIC_NODE_TOKEN_ROTATED",
      entityType: "AcademicNode",
      entityId: node.id,
      details: JSON.stringify({ nodeCode: node.nodeCode, tokenExpiresAt: tokenExpiresAt.toISOString() }),
    },
  });

  return { ok: true, pairingToken, tokenExpiresAt };
}
