import { randomBytes, createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSessionContext, canAccessStudent } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { observedRoute } from "@/lib/api/observed-route";

export const POST = observedRoute("/api/v1/reports/[id]/share", async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getSessionContext(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const hours = Math.min(168, Math.max(1, Number(body.expiresInHours) || 72));
  const report = await (prisma as any).reportVersion.findFirst({ where: { id: params.id, tenantId: session.tenantId } });
  if (!report) return NextResponse.json({ error: "Published report not found" }, { status: 404 });
  if (!(await canAccessStudent(session, report.studentId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const token = randomBytes(32).toString("hex");
  const link = await (prisma as any).reportShareLink.create({ data: { tenantId: session.tenantId, studentId: report.studentId, reportId: report.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + hours * 3600000) } });
  return NextResponse.json({ token, expiresAt: link.expiresAt });
});
