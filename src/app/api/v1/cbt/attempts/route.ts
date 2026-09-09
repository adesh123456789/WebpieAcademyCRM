import { NextRequest, NextResponse } from "next/server";
import { getSessionContext, getStudentForSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { usePinnedQuestions } from "@/lib/exams/lifecycle";
import { DeterministicEvaluationEngine, ExamQuestionConfig } from "@/lib/academic/evaluation-engine";
import { persistEvaluationResult } from "@/lib/academic/result-persistence";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionContext(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { examId } = body;
    const linkedStudent = await getStudentForSession(session);
    const studentId = session.role === "STUDENT" ? linkedStudent?.id : body.studentId;
    if (!studentId) return NextResponse.json({ error: "Student profile required" }, { status: 403 });

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
    if (!["FINALIZED", "CONDUCTED"].includes(exam.status)) return NextResponse.json({ error: "Exam is not finalized" }, { status: 409 });
    if (!exam.isCbtEnabled) return NextResponse.json({ error: "CBT is not enabled for this exam" }, { status: 409 });
    const blueprint = JSON.parse(exam.blueprint || "{}");
    const policy = blueprint.cbtEligibility || blueprint.cbt || {};
    const now = new Date();
    if (policy.opensAt && now < new Date(policy.opensAt)) return NextResponse.json({ error: "CBT window has not opened" }, { status: 403 });
    if (policy.closesAt && now >= new Date(policy.closesAt)) return NextResponse.json({ error: "CBT window has closed" }, { status: 403 });
    const batchIds = JSON.parse(exam.batchIds || "[]") as string[];
    if (batchIds.length && !(await prisma.enrollment.findFirst({ where: { studentId, batchId: { in: batchIds }, status: "ACTIVE" } }))) return NextResponse.json({ error: "Student is not eligible for this exam" }, { status: 403 });
    await usePinnedQuestions(exam);

    // Look up or create attempt
    let attempt = await prisma.cBTAttempt.findFirst({
      where: {
        examId,
        studentId,
        status: "IN_PROGRESS",
      },
    });

    if (!attempt) {
      const attemptLimit = Math.max(1, Number(policy.attemptLimit) || 1);
      const previousAttempts = await prisma.cBTAttempt.count({ where: { examId, studentId, status: { in: ["SUBMITTED", "TIMED_OUT"] } } });
      if (previousAttempts >= attemptLimit) return NextResponse.json({ error: "CBT attempt limit reached" }, { status: 409 });
      attempt = await prisma.cBTAttempt.create({
        data: {
          tenantId: session.tenantId,
          examId,
          studentId,
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
      serverTime: new Date(),
      expiresAt: new Date(attempt.startTime.getTime() + exam.durationMinutes * 60_000),
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

    const linkedStudent = await getStudentForSession(session);
    const attempt = await prisma.cBTAttempt.findFirst({
      where: { id: attemptId, tenantId: session.tenantId, ...(session.role === "STUDENT" ? { studentId: linkedStudent?.id || "__none__" } : {}) },
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
    if (attempt.status !== "IN_PROGRESS") return NextResponse.json({ error: "Attempt is no longer active" }, { status: 409 });
    const expired = Date.now() >= attempt.startTime.getTime() + attempt.exam.durationMinutes * 60_000;
    if (expired && !isFinalSubmit) {
      await prisma.cBTAttempt.update({ where: { id: attempt.id }, data: { status: "TIMED_OUT", serverClockTime: new Date() } });
      return NextResponse.json({ error: "Exam time has expired" }, { status: 409 });
    }

    if (isFinalSubmit) {
      await usePinnedQuestions(attempt.exam);
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

      const finalResponses = expired ? JSON.parse(attempt.responses || "{}") : (responses || {});
      const finalEval = DeterministicEvaluationEngine.evaluateCohort(examQuestions, [
        {
          studentId: attempt.studentId,
          rollNumber: "ONLINE",
          responses: finalResponses,
        },
      ], { multipleCorrectPolicy: JSON.parse(attempt.exam.markingRules || "{}").multipleCorrectPolicy });

      const evalRes = finalEval[0];

      await prisma.cBTAttempt.update({
        where: { id: attempt.id },
        data: {
          responses: JSON.stringify(finalResponses),
          status: expired ? "TIMED_OUT" : "SUBMITTED",
          submitTime: new Date(),
        },
      });

      const persisted = await persistEvaluationResult({ tenantId: session.tenantId, examId: attempt.examId, result: evalRes });
      for (const detail of evalRes.questionDetails) {
        const exists = await prisma.masteryEvidence.findFirst({ where: { tenantId: session.tenantId, examId: attempt.examId, studentId: attempt.studentId, questionId: detail.questionId } });
        if (!exists) await prisma.masteryEvidence.create({ data: { tenantId: session.tenantId, examId: attempt.examId, studentId: attempt.studentId, questionId: detail.questionId, concept: detail.concept, wasCorrect: detail.status === "CORRECT" } });
      }

      return NextResponse.json({
        success: true,
        submitted: true,
        result: evalRes,
        resultId: persisted.id,
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

    return NextResponse.json({ success: true, saved: true, responses: JSON.parse(updated.responses), markedForReview: JSON.parse(updated.markedForReview), serverTime: updated.serverClockTime });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
