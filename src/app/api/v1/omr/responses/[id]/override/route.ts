import { NextRequest, NextResponse } from "next/server";
import { getSessionContext, createAuditLog } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/permissions";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionContext(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!checkApiPermission(session.role, "omr")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const { questionNumber, newResponse, reason } = body;
    const expectedVersion = Number.isInteger(body.expectedVersion) ? body.expectedVersion : null;

    const scan = await prisma.oMRScan.findUnique({
      where: { id: params.id },
      include: { job: true },
    });

    if (!scan) return NextResponse.json({ error: "Scan record not found" }, { status: 404 });
    if (scan.job.tenantId !== session.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (scan.job.status === "FINALIZED") {
      return NextResponse.json({ error: "Finalized OMR jobs cannot be overridden" }, { status: 409 });
    }
    if (expectedVersion !== null && (scan as any).version !== expectedVersion) {
      return NextResponse.json({ error: "Scan revision is stale", expectedVersion: (scan as any).version }, { status: 409 });
    }

    const detected = JSON.parse(scan.detectedResponses || "{}");
    const verified = scan.verifiedResponses ? JSON.parse(scan.verifiedResponses) : { ...detected };

    const originalValue = verified[questionNumber] || detected[questionNumber] || null;
    verified[questionNumber] = newResponse;

    const updatedCount = await (prisma.oMRScan as any).updateMany({
      where: { id: scan.id, ...(expectedVersion === null ? {} : { version: expectedVersion }) },
      data: {
        verifiedResponses: JSON.stringify(verified),
        status: "OVERRIDDEN",
        verifiedById: session.userId,
        verifiedAt: new Date(),
        version: { increment: 1 },
      },
    });
    if (updatedCount.count !== 1) return NextResponse.json({ error: "Scan revision is stale" }, { status: 409 });
    const updated = await prisma.oMRScan.findUniqueOrThrow({ where: { id: scan.id } });

    // Write audit log (PRD OMR-004)
    await createAuditLog({
      tenantId: session.tenantId,
      userId: session.userId,
      action: "OMR_OVERRIDE",
      entityType: "OMRScan",
      entityId: scan.id,
      details: {
        questionNumber,
        originalValue,
        correctedValue: newResponse,
        reason: reason || "Manual teacher verification",
      },
    });

    return NextResponse.json({ success: true, scan: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
