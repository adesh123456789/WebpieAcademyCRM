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

    const exam = await prisma.exam.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
      include: {
        examQuestions: {
          include: { question: true },
          orderBy: { orderIndex: "asc" },
        },
        examResults: {
          include: { student: true },
          orderBy: { cohortRank: "asc" },
        },
      },
    });

    if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

    const results = exam.examResults;
    const totalStudents = results.length;

    // Cohort Statistics
    const scores = results.map((r) => r.score);
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // Subject Breakdown
    const subjectAggregates: Record<string, { totalScore: number; maxScore: number; count: number }> = {};
    for (const r of results) {
      const subScores = JSON.parse(r.subjectScores || "{}");
      for (const [subj, data] of Object.entries(subScores) as [string, any][]) {
        if (!subjectAggregates[subj]) {
          subjectAggregates[subj] = { totalScore: 0, maxScore: 0, count: 0 };
        }
        subjectAggregates[subj].totalScore += data.score;
        subjectAggregates[subj].maxScore += data.max;
        subjectAggregates[subj].count++;
      }
    }

    const subjectStats = Object.entries(subjectAggregates).map(([subject, data]) => ({
      subject,
      averagePercentage: data.maxScore > 0 ? Math.round((data.totalScore / data.maxScore) * 100) : 0,
    }));

    return NextResponse.json({
      exam: {
        id: exam.id,
        title: exam.title,
        code: exam.code,
        examType: exam.examType,
        totalMarks: exam.totalMarks,
        totalQuestions: exam.totalQuestions,
        status: exam.status,
      },
      analytics: {
        totalStudents,
        highestScore,
        lowestScore,
        averageScore: Math.round(averageScore * 10) / 10,
        subjectStats,
      },
      leaderboard: results.map((r) => ({
        rank: r.cohortRank,
        percentile: r.cohortPercentile,
        studentId: r.studentId,
        studentName: r.student.name,
        rollNumber: r.student.rollNumber,
        score: r.score,
        accuracyPercentage: r.accuracyPercentage,
        totalAttempted: r.totalAttempted,
        totalCorrect: r.totalCorrect,
        totalIncorrect: r.totalIncorrect,
        negativeMarksDeducted: r.negativeMarksDeducted,
        subjectScores: JSON.parse(r.subjectScores || "{}"),
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
