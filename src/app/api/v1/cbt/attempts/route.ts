import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeterministicEvaluationEngine, ExamQuestionConfig } from "@/lib/academic/evaluation-engine";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionContext(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { examId } = body;

    const exam = await prisma.exam.findFirst({
      where: { id: examId, tenantId: session.tenantId },
      include: {
        examQuestions: {
          include: { question: true },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

    // Look up or create attempt
    let attempt = await prisma.cBTAttempt.findFirst({
      where: {
        examId,
        studentId: session.userId,
        status: "IN_PROGRESS",
      },
    });

    if (!attempt) {
      attempt = await prisma.cBTAttempt.create({
        data: {
          tenantId: session.tenantId,
          examId,
          studentId: session.userId,
          startTime: new Date(),
          serverClockTime: new Date(),
          status: "IN_PROGRESS",
        },
      });
    }

    const sanitizedQuestions = exam.examQuestions.map((eq) => ({
      orderIndex: eq.orderIndex,
      questionId: eq.questionId,
      subject: eq.question.subject,
      sectionName: eq.sectionName,
      body: eq.question.body,
      options: JSON.parse(eq.question.options || "[]"),
      type: eq.question.type,
      marksCorrect: eq.marksCorrect,
      marksIncorrect: eq.marksIncorrect,
    }));

    return NextResponse.json({
      attemptId: attempt.id,
      durationMinutes: exam.durationMinutes,
      startTime: attempt.startTime,
      responses: JSON.parse(attempt.responses || "{}"),
      markedForReview: JSON.parse(attempt.markedForReview || "[]"),
      questions: sanitizedQuestions,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSessionContext(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { attemptId, responses, markedForReview, isFinalSubmit } = body;

    const attempt = await prisma.cBTAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          include: {
            examQuestions: {
              include: { question: true },
            },
          },
        },
      },
    });

    if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });

    if (isFinalSubmit) {
      // Evaluate CBT attempt deterministically
      const examQuestions: ExamQuestionConfig[] = attempt.exam.examQuestions.map((eq) => ({
        id: eq.id,
        questionId: eq.questionId,
        sectionName: eq.sectionName,
        type: eq.question.type as any,
        subject: eq.question.subject,
        concept: eq.question.concept,
        correctAnswer: JSON.parse(eq.question.correctAnswer || `""`),
        marksCorrect: eq.marksCorrect,
        marksIncorrect: eq.marksIncorrect,
      }));

      const finalEval = DeterministicEvaluationEngine.evaluateCohort(examQuestions, [
        {
          studentId: attempt.studentId,
          rollNumber: "ONLINE",
          responses: responses || {},
        },
      ]);

      const evalRes = finalEval[0];

      await prisma.cBTAttempt.update({
        where: { id: attempt.id },
        data: {
          responses: JSON.stringify(responses || {}),
          status: "SUBMITTED",
          submitTime: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        submitted: true,
        result: evalRes,
      });
    }

    // Auto-save heartbeat
    const updated = await prisma.cBTAttempt.update({
      where: { id: attempt.id },
      data: {
        responses: JSON.stringify(responses || {}),
        markedForReview: JSON.stringify(markedForReview || []),
        serverClockTime: new Date(),
      },
    });

    return NextResponse.json({ success: true, saved: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
