import { NextRequest, NextResponse } from "next/server";
import { canAccessStudent, getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { observedRoute } from "@/lib/api/observed-route";

export const GET = observedRoute("/api/v1/mastery/students/[studentId]", async (req: NextRequest, { params }: { params: { studentId: string } }) => {
  const session = await getSessionContext(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await canAccessStudent(session, params.studentId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await prisma.masteryScore.findMany({ where: { tenantId: session.tenantId, studentId: params.studentId }, orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ concepts: rows.map((row) => ({
    concept: row.concept,
    subject: row.subject,
    score: row.score,
    state: row.state,
    confidence: row.confidence,
    evidenceCount: row.totalAttempts,
    insufficientEvidence: row.totalAttempts < 2,
  })), updatedAt: rows.reduce<Date | null>((latest, row) => !latest || row.updatedAt > latest ? row.updatedAt : latest, null) });
});
