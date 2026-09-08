import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InterventionService } from "@/lib/intervention/intervention-service";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionContext(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch existing active interventions
    const activeInterventions = await prisma.intervention.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: "desc" },
    });

    // Detect new concept weakness triage queue
    const detectedQueue = await InterventionService.detectWeaknessQueue(session.tenantId);

    return NextResponse.json({
      interventions: activeInterventions.map((i) => ({
        ...i,
        studentIds: JSON.parse(i.studentIds || "[]"),
        practiceLadder: JSON.parse(i.practiceLadder || "[]"),
      })),
      detectedQueue,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionContext(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { concept, studentIds, priority } = body;

    if (!concept || !studentIds || studentIds.length === 0) {
      return NextResponse.json({ error: "Concept and student IDs required" }, { status: 400 });
    }

    const intervention = await InterventionService.createIntervention({
      tenantId: session.tenantId,
      branchId: session.branchId || undefined,
      concept,
      studentIds,
      priority,
      createdById: session.userId,
    });

    return NextResponse.json({ success: true, intervention });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
