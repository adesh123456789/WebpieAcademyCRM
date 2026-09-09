import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/permissions";
import { observedRoute } from "@/lib/api/observed-route";

export const GET = observedRoute("/api/v1/interventions/[id]", async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getSessionContext(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!checkApiPermission(session.role, "interventions_manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const intervention = await prisma.intervention.findFirst({ where: { id: params.id, tenantId: session.tenantId } });
  if (!intervention) return NextResponse.json({ error: "Intervention not found" }, { status: 404 });
  const ladder = JSON.parse(intervention.practiceLadder || "[]") as { tier?: string; questionId?: string }[];
  return NextResponse.json({ id: intervention.id, title: intervention.title, concept: intervention.concept, priority: intervention.priority, status: intervention.status === "ASSIGNED" ? "UNVERIFIED" : intervention.status, verifiedAt: intervention.resolvedAt, ladder: ladder.map((item) => ({ tier: item.tier, questionIds: item.questionId ? [item.questionId] : [] })), worksheetUrl: intervention.worksheetPdfUrl });
});
