import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { observedRoute } from "@/lib/api/observed-route";

export const GET = observedRoute("/api/v1/reports/share/[token]", async (_req: NextRequest, { params }: { params: { token: string } }) => {
  const hash = createHash("sha256").update(params.token).digest("hex");
  const link = await (prisma as any).reportShareLink.findUnique({ where: { tokenHash: hash }, include: { report: true } });
  if (!link || link.revokedAt || link.expiresAt <= new Date()) return NextResponse.json({ error: "Share link expired or revoked" }, { status: 404 });
  return NextResponse.json({ report: { id: link.report.id, version: link.report.version, publishedAt: link.report.publishedAt, ...JSON.parse(link.report.projectionJson) } });
});
