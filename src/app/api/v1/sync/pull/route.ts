import { NextRequest, NextResponse } from "next/server";
import { AcademicNodeSyncService } from "@/lib/sync/sync-service";
import { buildPullDelta, verifyNodeRequest } from "@/lib/sync";
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer node_")) return NextResponse.json({ error: "Node token required" }, { status: 401 });
  const node = await AcademicNodeSyncService.verifyNode(auth.slice(7));
  if (!node) return NextResponse.json({ error: "Node not recognized" }, { status: 403 });
  try {
    verifyNodeRequest("", req.headers, node, { requireSignature: process.env.SYNC_REQUIRE_NODE_SIGNATURE === "1" });
    const url = new URL(req.url);
    return NextResponse.json(await buildPullDelta({ nodeId: node.id, tenantId: node.tenantId, branchId: node.branchId }, url.searchParams.get("cursor"), Number(url.searchParams.get("limit") || 100)));
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unable to build sync delta" }, { status: error?.status || 400 });
  }
}
