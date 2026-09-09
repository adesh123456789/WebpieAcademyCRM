import { NextRequest, NextResponse } from "next/server";
import { getSessionContext, createAuditLog } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InterventionService } from "@/lib/intervention/intervention-service";
import { checkApiPermission } from "@/lib/permissions";
import { observedRoute } from "@/lib/api/observed-route";

export const POST = observedRoute("/api/v1/ai/copilot/confirm", async (req: NextRequest) => {
  const session = await getSessionContext(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!checkApiPermission(session.role, "interventions_manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (typeof body.planId !== "string" || !body.planId) return NextResponse.json({ error: "planId is required" }, { status: 400 });
  const request = await (prisma.aIRequest as any).findFirst({ where: { tenantId: session.tenantId, resultJson: { contains: body.planId } } });
  if (!request?.resultJson) return NextResponse.json({ error: "Copilot plan not found" }, { status: 404 });
  const plan = JSON.parse(request.resultJson);
  if (plan.status !== "PROPOSED" || plan.id !== body.planId) return NextResponse.json({ error: "Copilot plan already confirmed" }, { status: 409 });
  if (!Array.isArray(plan.studentIds) || !plan.studentIds.length || !plan.batchId) return NextResponse.json({ error: "Copilot plan is missing target scope" }, { status: 422 });
  const intervention = await InterventionService.createIntervention({
    tenantId: session.tenantId,
    branchId: session.branchId || undefined,
    concept: plan.topic,
    studentIds: plan.studentIds,
    priority: plan.priority,
    createdById: session.userId,
  });
  await (prisma.aIRequest as any).update({ where: { id: request.id }, data: { resultJson: JSON.stringify({ ...plan, status: "CONFIRMED", interventionId: intervention.id }) } });
  await createAuditLog({ tenantId: session.tenantId, userId: session.userId, action: "COPILOT_PLAN_CONFIRMED", entityType: "Intervention", entityId: intervention.id, details: { planId: plan.id, aiRequestId: request.id, batchId: plan.batchId } });
  return NextResponse.json({ success: true, intervention });
});
