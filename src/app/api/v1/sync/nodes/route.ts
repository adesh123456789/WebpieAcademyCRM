import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { AcademicNodeSyncService } from "@/lib/sync/sync-service";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionContext(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.role === "WEBPIE_ADMIN" ? undefined : session.tenantId;
    const nodes = await AcademicNodeSyncService.listNodes(tenantId);

    return NextResponse.json({ nodes });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
