import { NextRequest, NextResponse } from "next/server";
import { getSessionContext, createAuditLog } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/permissions";
import { publicOMRScan } from "@/lib/omr-upload/public-scan";

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

    // Once every sheet is terminal, clear the job-level review gate so the
    // retry-safe finalize route can proceed. Keep the transition scoped to the
    // current job and leave processing/rejected sheets blocked until resolved.
    const remainingReview = await prisma.oMRScan.count({
      where: {
        jobId: scan.jobId,
        status: { notIn: ["CONFIDENT", "OVERRIDDEN"] },
      },
    });
    if (remainingReview === 0 && scan.job.status === "REVIEW_REQUIRED") {
      await prisma.oMRJob.update({ where: { id: scan.jobId }, data: { status: "READY" } });
    }

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

    return NextResponse.json({ success: true, scan: publicOMRScan(updated) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
