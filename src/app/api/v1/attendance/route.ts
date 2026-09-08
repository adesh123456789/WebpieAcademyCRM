import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionContext(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!checkApiPermission(session.role, "attendance_manage")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get("batchId");
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    const batches = await prisma.batch.findMany({
      where: { tenantId: session.tenantId },
      include: {
        enrollments: {
          include: { student: true },
        },
      },
    });

    let currentSession = null;
    if (batchId) {
      currentSession = await prisma.attendanceSession.findUnique({
        where: {
          batchId_sessionDate: {
            batchId,
            sessionDate: date,
          },
        },
        include: {
          records: {
            include: { student: true },
          },
        },
      });
    }

    return NextResponse.json({ batches, currentSession });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionContext(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!checkApiPermission(session.role, "attendance_manage")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const { batchId, date, topicCovered, records } = body;

    if (!batchId || !records || records.length === 0) {
      return NextResponse.json({ error: "Batch and student records required" }, { status: 400 });
    }

    const sessionDate = date || new Date().toISOString().split("T")[0];

    const attSession = await prisma.attendanceSession.upsert({
      where: {
        batchId_sessionDate: {
          batchId,
          sessionDate,
        },
      },
      create: {
        tenantId: session.tenantId,
        branchId: session.branchId || (await prisma.batch.findUnique({ where: { id: batchId } }))!.branchId,
        batchId,
        sessionDate,
        topicCovered: topicCovered || "Class Lecture",
        takenById: session.userId,
      },
      update: {
        topicCovered: topicCovered || "Class Lecture",
      },
    });

    // Upsert student attendance records
    for (const r of records) {
      await prisma.attendanceRecord.upsert({
        where: {
          sessionId_studentId: {
            sessionId: attSession.id,
            studentId: r.studentId,
          },
        },
        create: {
          sessionId: attSession.id,
          studentId: r.studentId,
          status: r.status || "PRESENT",
          source: r.source || "MANUAL",
        },
        update: {
          status: r.status || "PRESENT",
        },
      });
    }

    return NextResponse.json({ success: true, sessionId: attSession.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
