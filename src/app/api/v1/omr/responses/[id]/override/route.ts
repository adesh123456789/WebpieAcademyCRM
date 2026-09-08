import { NextRequest, NextResponse } from "next/server";
import { getSessionContext, createAuditLog } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionContext(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { questionNumber, newResponse, reason } = body;

    const scan = await prisma.oMRScan.findUnique({
      where: { id: params.id },
      include: { job: true },
    });

    if (!scan) return NextResponse.json({ error: "Scan record not found" }, { status: 404 });
    if (scan.job.tenantId !== session.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const detected = JSON.parse(scan.detectedResponses || "{}");
    const verified = scan.verifiedResponses ? JSON.parse(scan.verifiedResponses) : { ...detected };

    const originalValue = verified[questionNumber] || detected[questionNumber] || null;
    verified[questionNumber] = newResponse;

    const updated = await prisma.oMRScan.update({
      where: { id: scan.id },
      data: {
        verifiedResponses: JSON.stringify(verified),
        status: "OVERRIDDEN",
        verifiedById: session.userId,
        verifiedAt: new Date(),
      },
    });

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
