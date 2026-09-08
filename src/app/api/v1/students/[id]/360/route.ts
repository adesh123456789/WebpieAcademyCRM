import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionContext(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const student = await prisma.student.findFirst({
      where: {
        id: params.id,
        tenantId: session.tenantId,
      },
      include: {
        branch: true,
        enrollments: {
          include: {
            course: true,
            batch: true,
          },
        },
        parentLinks: {
          include: {
            parent: true,
          },
        },
        examResults: {
          include: {
            exam: true,
          },
          orderBy: { computedAt: "desc" },
        },
        masteryScores: {
          orderBy: { score: "asc" },
        },
        feePlans: {
          include: {
            installments: true,
            payments: true,
          },
        },
        attendanceRecords: {
          include: {
            session: true,
          },
          orderBy: { markedAt: "desc" },
          take: 30,
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Concept mastery aggregates
    const criticalConcepts = student.masteryScores.filter((m) => m.state === "CRITICAL");
    const weakConcepts = student.masteryScores.filter((m) => m.state === "WEAK");
    const masteredConcepts = student.masteryScores.filter((m) => m.state === "MASTERED");

    // Attendance stats
    const totalSessions = student.attendanceRecords.length;
    const presentSessions = student.attendanceRecords.filter((r) => r.status === "PRESENT").length;
    const attendancePercentage = totalSessions > 0 ? (presentSessions / totalSessions) * 100 : 100;

    // Fees summary
    const totalFees = student.feePlans.reduce((acc, f) => acc + f.netAmount, 0);
    const paidFees = student.feePlans.flatMap((f) => f.payments).reduce((acc, p) => acc + p.amount, 0);
    const outstandingFees = totalFees - paidFees;

    return NextResponse.json({
      student: {
        ...student,
        stats: {
          totalExamsAttempted: student.examResults.length,
          latestScore: student.examResults[0]?.score ?? null,
          latestPercentile: student.examResults[0]?.cohortPercentile ?? null,
          attendancePercentage: Math.round(attendancePercentage * 10) / 10,
          criticalCount: criticalConcepts.length,
          weakCount: weakConcepts.length,
          masteredCount: masteredConcepts.length,
          totalFees,
          paidFees,
          outstandingFees,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
