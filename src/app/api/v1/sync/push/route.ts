import { NextRequest, NextResponse } from "next/server";
import { AcademicNodeSyncService } from "@/lib/sync/sync-service";

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { scans, attendanceRecords } = body;

    const result = await AcademicNodeSyncService.ingestPushDelta({
      nodeId: node.id,
      tenantId: node.tenantId,
      batchTimestamp: new Date().toISOString(),
      scans: scans || [],
      attendanceRecords,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
