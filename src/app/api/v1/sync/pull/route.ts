import { NextRequest, NextResponse } from "next/server";
import { AcademicNodeSyncService } from "@/lib/sync/sync-service";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer node_")) {
      return NextResponse.json({ error: "Unauthorized: Valid Node Token required" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const node = await AcademicNodeSyncService.verifyNode(token);
    if (!node) {
      return NextResponse.json({ error: "Forbidden: Academic Node not recognized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const sinceParam = searchParams.get("since");
    const since = sinceParam ? new Date(sinceParam) : undefined;

    const delta = await AcademicNodeSyncService.generatePullDelta(node.tenantId, since);

    return NextResponse.json(delta);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
