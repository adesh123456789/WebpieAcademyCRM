import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionContext, getParentForSession } from "@/lib/auth";
import { AIGateway } from "@/lib/ai/ai-gateway";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionContext(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["PARENT", "OWNER", "WEBPIE_ADMIN"].includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const studentRoll = searchParams.get("roll");
    const language = (searchParams.get("lang") || "en") as "en" | "hi" | "mr";

    const parent = session.role === "PARENT" ? await getParentForSession(session) : null;
    if (session.role === "PARENT" && !parent) return NextResponse.json({ error: "Parent profile not linked" }, { status: 403 });
    const student = await prisma.student.findFirst({
      where: { tenantId: session.tenantId, ...(studentRoll ? { rollNumber: studentRoll } : {}), ...(parent ? { parentLinks: { some: { parentId: parent.id } } } : {}) },
      include: {
        tenant: true,
        examResults: {
          include: { exam: true },
          orderBy: { computedAt: "desc" },
        },
        masteryScores: true,
        feePlans: {
          include: { payments: true },
        },
        attendanceRecords: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const latestResult = student.examResults[0] || null;
    const strongConcepts = student.masteryScores
      .filter((m) => m.state === "MASTERED" || m.state === "PROFICIENT")
      .map((m) => m.concept);
    const weakConcepts = student.masteryScores
      .filter((m) => m.state === "CRITICAL" || m.state === "WEAK")
      .map((m) => m.concept);

    // AI/Deterministic multilingual parent summary
    const summaryText = await AIGateway.generateParentReportSummary({
      studentName: student.name,
      examTitle: latestResult?.exam.title || "Periodic Benchmark Assessment",
      score: latestResult?.score || 0,
      maxMarks: latestResult?.maximumMarks || 100,
      rank: latestResult?.cohortRank || 1,
      totalStudents: 30,
      strongConcepts,
      weakConcepts,
      language,
    });

    // Attendance
    const totalSessions = student.attendanceRecords.length;
    const presentSessions = student.attendanceRecords.filter((r) => r.status === "PRESENT").length;
    const attendanceRate = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 100;

    // Fees
    const totalFees = student.feePlans.reduce((acc, f) => acc + f.netAmount, 0);
    const paidFees = student.feePlans.flatMap((f) => f.payments).reduce((acc, p) => acc + p.amount, 0);

    return NextResponse.json({
      institute: {
        name: student.tenant.name,
        code: student.tenant.code,
        primaryColor: student.tenant.primaryColor,
      },
      student: {
        name: student.name,
        rollNumber: student.rollNumber,
        targetExam: student.targetExam,
      },
      summary: summaryText,
      latestResult: latestResult
        ? {
            examTitle: latestResult.exam.title,
            score: latestResult.score,
            maxMarks: latestResult.maximumMarks,
            rank: latestResult.cohortRank,
            percentile: latestResult.cohortPercentile,
            accuracy: latestResult.accuracyPercentage,
            subjectScores: JSON.parse(latestResult.subjectScores || "{}"),
          }
        : null,
      conceptHealth: {
        strong: strongConcepts,
        weak: weakConcepts,
      },
      attendance: {
        percentage: attendanceRate,
        totalSessions,
        presentSessions,
      },
      fees: {
        total: totalFees,
        paid: paidFees,
        due: totalFees - paidFees,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
