import { NextRequest, NextResponse } from "next/server";
import { AcademicNodeSyncService } from "@/lib/sync/sync-service";
import { prisma } from "@/lib/prisma";
import { rotateNodeToken } from "@/lib/sync/handshake";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const refreshToken = body.currentToken || (req.headers.get("authorization")?.startsWith("Bearer node_") ? req.headers.get("authorization")!.slice(7) : null);
    if (refreshToken) {
      const rotated = await rotateNodeToken(refreshToken);
      if (!rotated.ok) return NextResponse.json({ error: `Node token ${rotated.reason.toLowerCase()}` }, { status: rotated.reason === "REVOKED" ? 403 : 401 });
      return NextResponse.json(rotated);
    }
    const { tenantCode, branchCode, nodeCode, name, machineFingerprint, ipAddress, osVersion } = body;

    if (!tenantCode || !nodeCode || !machineFingerprint) {
      return NextResponse.json(
        { error: "tenantCode, nodeCode, and machineFingerprint are required" },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { code: tenantCode.toUpperCase().trim() },
      include: { branches: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: `Tenant code '${tenantCode}' not found` }, { status: 404 });
    }

    let branchId = tenant.branches[0]?.id;
    if (branchCode) {
      const b = tenant.branches.find((br) => br.code === branchCode.toUpperCase().trim());
      if (b) branchId = b.id;
    }

    const result = await AcademicNodeSyncService.pairNode({
      tenantId: tenant.id,
      branchId,
      nodeCode,
      name: name || `${tenant.name} Local Terminal`,
      machineFingerprint,
      ipAddress: ipAddress || req.headers.get("x-forwarded-for") || "127.0.0.1",
      osVersion,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
