import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { TokenPayload } from "@/lib/auth";
import { draftInput, ExamDraftError } from "./draft";

export const editInput = draftInput.partial().extend({ expectedVersion: z.number().int().positive() }).strict();

export async function editExam(id: string, input: z.infer<typeof editInput>, session: TokenPayload) {
  return prisma.$transaction(async tx => {
    const exam = await tx.exam.findFirst({ where: { id, tenantId: session.tenantId,
      ...(session.branchId ? { branchId: session.branchId } : {}) },
      include: { examQuestions: { orderBy: { orderIndex: "asc" } } } });
    if (!exam) throw new ExamDraftError(404, "Exam not found");
    if (!["DRAFT", "IN_REVIEW"].includes(exam.status) || exam.version !== input.expectedVersion) throw new ExamDraftError(409, "VERSION_CONFLICT");
    const { expectedVersion, ...changes } = input;
    const merged = draftInput.safeParse({ title: exam.title, examType: exam.examType,
      durationMinutes: exam.durationMinutes, questionIds: exam.examQuestions.map(q => q.questionId),
      batchIds: JSON.parse(exam.batchIds), markingRules: JSON.parse(exam.markingRules), ...changes });
    if (!merged.success) throw new ExamDraftError(400, "Invalid exam edit");
    const data = merged.data;
    const marks = data.questionIds.length * data.markingRules.correct;
    if ((data.totalMarks !== undefined && Math.abs(data.totalMarks - marks) > 1e-8) ||
      (data.totalQuestions !== undefined && data.totalQuestions !== data.questionIds.length)) throw new ExamDraftError(422, "BLUEPRINT_INVALID");
    const questions = await tx.question.findMany({ where: { id: { in: data.questionIds },
      OR: [{ ownerScope: "PLATFORM", tenantId: null }, { ownerScope: "TENANT_PRIVATE", tenantId: session.tenantId }] } });
    if (questions.length !== data.questionIds.length) throw new ExamDraftError(403, "Question outside authorized scope");
    const batchCount = await tx.batch.count({ where: { id: { in: data.batchIds }, tenantId: session.tenantId,
      ...(session.branchId ? { branchId: session.branchId } : {}) } });
    if (batchCount !== new Set(data.batchIds).size) throw new ExamDraftError(403, "Batch outside authorized scope");
    const changed = await tx.exam.updateMany({ where: { id, version: expectedVersion, status: exam.status }, data: {
      title: data.title, examType: data.examType, durationMinutes: data.durationMinutes,
      batchIds: JSON.stringify(data.batchIds), markingRules: JSON.stringify(data.markingRules),
      totalMarks: marks, totalQuestions: questions.length, status: "DRAFT", version: { increment: 1 },
      blueprint: JSON.stringify({ totalQuestions: questions.length, totalMarks: marks }), finalizedAt: null,
    } });
    if (changed.count !== 1) throw new ExamDraftError(409, "VERSION_CONFLICT");
    await tx.examQuestion.deleteMany({ where: { examId: id } });
    for (let index = 0; index < data.questionIds.length; index++) {
      const questionId = data.questionIds[index];
      await tx.examQuestion.create({ data: { examId: id, questionId,
        sectionName: `${questions.find(q => q.id === questionId)!.subject} Section`, orderIndex: index + 1,
        marksCorrect: data.markingRules.correct, marksIncorrect: data.markingRules.incorrect, paperSet: "A" } });
    }
    await tx.auditLog.create({ data: { tenantId: session.tenantId, userId: session.userId, action: "EXAM_EDIT",
      entityType: "Exam", entityId: id, details: JSON.stringify({ previousVersion: expectedVersion, version: expectedVersion + 1, invalidatedReview: exam.status === "IN_REVIEW" }) } });
    return tx.exam.findUniqueOrThrow({ where: { id } });
  });
}
