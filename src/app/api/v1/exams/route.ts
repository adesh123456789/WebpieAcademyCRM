import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionContext(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const exams = await prisma.exam.findMany({
      where: {
        tenantId: session.tenantId,
      },
      include: {
        examQuestions: { include: { question: { select: { id: true, code: true, subject: true, chapter: true, topic: true, concept: true, type: true, declaredDifficulty: true, body: true, options: true, status: true } } } },
        examResults: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ exams });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionContext(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!checkApiPermission(session.role, "exams_manage")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const { title, examType, durationMinutes, totalMarks, questionIds, batchIds, markingRules } = body;

    if (!title || !examType || !questionIds || questionIds.length === 0) {
      return NextResponse.json({ error: "Exam title, type, and questions are required" }, { status: 400 });
    }

    const count = await prisma.exam.count({ where: { tenantId: session.tenantId } });
    const code = `${examType}-EXAM-${String(count + 1).padStart(3, "0")}`;

    const exam = await prisma.exam.create({
      data: {
        tenantId: session.tenantId,
        branchId: session.branchId,
        title,
        code,
        examType,
        durationMinutes: durationMinutes || 180,
        totalMarks: totalMarks || questionIds.length * 4,
        totalQuestions: questionIds.length,
        status: "FINALIZED",
        batchIds: JSON.stringify(batchIds || []),
        blueprint: JSON.stringify({ totalQuestions: questionIds.length }),
        markingRules: JSON.stringify(markingRules || { correct: 4, incorrect: -1, unattempted: 0 }),
        isCbtEnabled: true,
        finalizedAt: new Date(),
        createdById: session.userId,
      },
    });

    // Create exam questions
    for (let i = 0; i < questionIds.length; i++) {
      const q = await prisma.question.findFirst({ where: { id: questionIds[i], OR: [{ ownerScope: "PLATFORM" }, { tenantId: session.tenantId }] } });
      if (!q) return NextResponse.json({ error: "Question outside authorized content scope" }, { status: 403 });
      await prisma.examQuestion.create({
        data: {
          examId: exam.id,
          questionId: questionIds[i],
          sectionName: `${q?.subject || "General"} Section`,
          orderIndex: i + 1,
          marksCorrect: 4,
          marksIncorrect: q?.type === "NUMERICAL" ? 0 : -1,
          paperSet: "A",
        },
      });
    }

    return NextResponse.json({ success: true, exam });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
