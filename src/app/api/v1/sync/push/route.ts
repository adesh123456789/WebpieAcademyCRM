import { NextRequest, NextResponse } from "next/server";
import { AcademicNodeSyncService } from "@/lib/sync/sync-service";
import { parsePushBatch, applyPushEvents, domainAppliers } from "@/lib/sync";
import { metric } from "@/lib/observability";
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer node_")) return NextResponse.json({ error: "Node token required" }, { status: 401 });
  const node = await AcademicNodeSyncService.verifyNode(auth.slice(7));
  if (!node) return NextResponse.json({ error: "Node not recognized" }, { status: 403 });
  try {
    const events = parsePushBatch(await req.json());
    const result = await applyPushEvents({ nodeId: node.id, tenantId: node.tenantId, branchId: node.branchId }, events.events, domainAppliers);
    for (const item of result.results) {
      if (item.status === "CONFLICT") metric("syncConflict", 1, { eventId: item.eventId });
      if (item.status === "REJECTED") metric("syncEventFailed", 1, { eventId: item.eventId });
    }
    return NextResponse.json(result);
  } catch (error: any) {
    metric("syncEventFailed", 1, { nodeId: node.id });
    return NextResponse.json({ error: error?.message || "Invalid sync batch" }, { status: 400 });
  }
}
