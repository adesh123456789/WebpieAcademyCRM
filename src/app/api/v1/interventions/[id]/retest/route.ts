import { NextRequest, NextResponse } from "next/server";
import { getSessionContext, createAuditLog } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/permissions";
import { InterventionService } from "@/lib/intervention/intervention-service";
import { observedRoute } from "@/lib/api/observed-route";

export const POST = observedRoute("/api/v1/interventions/[id]/retest", async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getSessionContext(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!checkApiPermission(session.role, "interventions_manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const intervention = await prisma.intervention.findFirst({ where: { id: params.id, tenantId: session.tenantId } });
  if (!intervention) return NextResponse.json({ error: "Intervention not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const results = Array.isArray(body.results) ? body.results : [];
  if (results.some((r: any) => typeof r?.studentId !== "string" || typeof r?.newScore !== "number" || r.newScore < 0 || r.newScore > 100)) {
    return NextResponse.json({ error: "Invalid retest results" }, { status: 400 });
  }
  try {
    const updated = await InterventionService.verifyAndResolveIntervention(params.id, results);
    await createAuditLog({ tenantId: session.tenantId, userId: session.userId, action: "INTERVENTION_RETEST", entityType: "Intervention", entityId: params.id, details: { resultCount: results.length, status: updated.status } });
    return NextResponse.json({ success: true, intervention: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 422 });
  }
});
