import { randomUUID, createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSessionContext, createAuditLog } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/permissions";
import { observedRoute } from "@/lib/api/observed-route";

export const POST = observedRoute("/api/v1/reports/[id]/publish", async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getSessionContext(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!checkApiPermission(session.role, "interventions_manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const student = await prisma.student.findFirst({ where: { id: params.id, tenantId: session.tenantId }, include: { tenant: true, examResults: { include: { exam: true }, orderBy: { computedAt: "desc" } }, masteryScores: true } });
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  const latest = student.examResults[0] || null;
  const projection = { institute: { name: student.tenant.name, code: student.tenant.code }, student: { id: student.id, name: student.name, rollNumber: student.rollNumber }, latestResult: latest ? { examTitle: latest.exam.title, score: latest.score, maxMarks: latest.maximumMarks, rank: latest.cohortRank, percentile: latest.cohortPercentile } : null, conceptHealth: student.masteryScores.map((m) => ({ concept: m.concept, subject: m.subject, score: m.score, state: m.state, confidence: m.confidence })) };
  const db = prisma as any;
  const previous = await db.reportVersion.findFirst({ where: { tenantId: session.tenantId, studentId: student.id }, orderBy: { version: "desc" } });
  const report = await db.reportVersion.create({ data: { id: randomUUID(), tenantId: session.tenantId, studentId: student.id, version: (previous?.version || 0) + 1, projectionJson: JSON.stringify(projection), sourceResultId: latest?.id, sourceMasteryAt: student.masteryScores.reduce((d: Date | null, m: any) => !d || m.updatedAt > d ? m.updatedAt : d, null) } });
  await createAuditLog({ tenantId: session.tenantId, userId: session.userId, action: "REPORT_PUBLISHED", entityType: "ReportVersion", entityId: report.id, details: { studentId: student.id, version: report.version } });
  return NextResponse.json({ report: { id: report.id, studentId: report.studentId, version: report.version, publishedAt: report.publishedAt, projection } });
});
