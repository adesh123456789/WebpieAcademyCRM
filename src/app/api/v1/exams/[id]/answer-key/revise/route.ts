import { NextRequest, NextResponse } from "next/server";
import { getSessionContext, createAuditLog } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/permissions";
import { usePinnedQuestions } from "@/lib/exams/lifecycle";
import { DeterministicEvaluationEngine, type ExamQuestionConfig } from "@/lib/academic/evaluation-engine";
import { persistEvaluationResult } from "@/lib/academic/result-persistence";
import { observedRoute } from "@/lib/api/observed-route";

export const POST = observedRoute("/api/v1/exams/[id]/answer-key/revise", async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getSessionContext(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!checkApiPermission(session.role, "exams_manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (typeof body.questionId !== "string" || body.correctAnswer === undefined || typeof body.reason !== "string" || !body.reason.trim()) return NextResponse.json({ error: "questionId, correctAnswer and reason are required" }, { status: 400 });
  const exam = await prisma.exam.findFirst({ where: { id: params.id, tenantId: session.tenantId }, include: { examQuestions: { include: { question: true }, orderBy: { orderIndex: "asc" } } } });
  if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  await usePinnedQuestions(exam);
  if (!exam.examQuestions.some((q) => q.questionId === body.questionId)) return NextResponse.json({ error: "Question is not part of this exam" }, { status: 422 });
  const prior = await prisma.examResult.findMany({ where: { tenantId: session.tenantId, examId: exam.id, isFinal: true }, include: { student: true } });
  if (!prior.length) return NextResponse.json({ error: "No finalized results to revise" }, { status: 409 });
  const rules = JSON.parse(exam.markingRules || "{}");
  const questions: ExamQuestionConfig[] = exam.examQuestions.map((eq) => ({ id: eq.id, questionId: eq.questionId, sectionName: eq.sectionName, type: eq.question.type as ExamQuestionConfig["type"], subject: eq.question.subject, concept: eq.question.concept, correctAnswer: eq.questionId === body.questionId ? body.correctAnswer : JSON.parse(eq.question.correctAnswer), numericalTolerance: eq.question.numericalTolerance ?? undefined, marksCorrect: eq.marksCorrect, marksIncorrect: eq.marksIncorrect }));
  const attempts = prior.map((r) => ({ studentId: r.studentId, rollNumber: r.student.rollNumber, responses: Object.fromEntries((JSON.parse(r.questionResponses || "[]") as any[]).map((d) => [d.questionId, d.userAnswer])) }));
  const evaluated = DeterministicEvaluationEngine.evaluateCohort(questions, attempts, { multipleCorrectPolicy: rules.multipleCorrectPolicy });
  const resultIds: string[] = [];
  for (const result of evaluated) {
    const old = prior.find((r) => r.studentId === result.studentId)!;
    const saved = await persistEvaluationResult({ tenantId: session.tenantId, examId: exam.id, batchId: old.batchId, result });
    resultIds.push(saved.id);
    await prisma.examResultRevision.create({ data: { tenantId: session.tenantId, examId: exam.id, studentId: result.studentId, supersedesResultId: old.id, revision: saved.version, resultSnapshot: JSON.stringify(result), reason: body.reason.trim(), createdById: session.userId } });
  }
  const blueprint = JSON.parse(exam.blueprint || "{}");
  const revisions = Array.isArray(blueprint.answerKeyRevisions) ? blueprint.answerKeyRevisions : [];
  revisions.push({ questionId: body.questionId, correctAnswer: body.correctAnswer, reason: body.reason.trim(), actorId: session.userId, at: new Date().toISOString() });
  await prisma.exam.update({ where: { id: exam.id }, data: { blueprint: JSON.stringify({ ...blueprint, answerKeyRevisions: revisions }) } });
  await createAuditLog({ tenantId: session.tenantId, userId: session.userId, action: "ANSWER_KEY_REVISED", entityType: "Exam", entityId: exam.id, details: { questionId: body.questionId, reason: body.reason.trim(), resultIds } });
  return NextResponse.json({ success: true, revisedResults: resultIds.length, resultIds });
});
