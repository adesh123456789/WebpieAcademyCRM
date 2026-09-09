import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { TokenPayload } from "@/lib/auth";

export const draftInput = z.object({
  title: z.string().trim().min(1).max(200),
  examType: z.string().trim().min(1).max(50),
  durationMinutes: z.number().int().positive().max(1440).default(180),
  questionIds: z.array(z.string().min(1)).min(1).max(300).refine(ids => new Set(ids).size === ids.length),
  batchIds: z.array(z.string().min(1)).max(100).default([]),
  totalMarks: z.number().finite().positive().optional(),
  totalQuestions: z.number().int().positive().optional(),
  markingRules: z.object({
    correct: z.number().finite().positive(),
    incorrect: z.number().finite().max(0),
    unattempted: z.literal(0),
  }).default({ correct: 4, incorrect: -1, unattempted: 0 }),
});

export class ExamDraftError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function createExamDraft(input: z.infer<typeof draftInput>, session: TokenPayload) {
  const marks = input.questionIds.length * input.markingRules.correct;
  if ((input.totalMarks !== undefined && Math.abs(input.totalMarks - marks) > 1e-8)
    || (input.totalQuestions !== undefined && input.totalQuestions !== input.questionIds.length)) {
    throw new ExamDraftError(422, "BLUEPRINT_INVALID: totals must match selected questions and marking rules");
  }
  return prisma.$transaction(async tx => {
    const questions = await tx.question.findMany({ where: {
      id: { in: input.questionIds },
      OR: [{ ownerScope: "PLATFORM", tenantId: null }, { ownerScope: "TENANT_PRIVATE", tenantId: session.tenantId }],
    } });
    if (questions.length !== input.questionIds.length) throw new ExamDraftError(403, "Question outside authorized content scope");
    const batches = await tx.batch.count({ where: { id: { in: input.batchIds }, tenantId: session.tenantId,
      ...(session.branchId ? { branchId: session.branchId } : {}) } });
    if (batches !== new Set(input.batchIds).size) throw new ExamDraftError(403, "Batch outside authorized scope");
    const byId = new Map(questions.map(q => [q.id, q]));
    return tx.exam.create({ data: {
      tenantId: session.tenantId, branchId: session.branchId, title: input.title,
      code: `${input.examType}-${crypto.randomUUID()}`, examType: input.examType,
      durationMinutes: input.durationMinutes, totalMarks: marks, totalQuestions: questions.length,
      status: "DRAFT", batchIds: JSON.stringify(input.batchIds),
      blueprint: JSON.stringify({ totalQuestions: questions.length, totalMarks: marks }),
      markingRules: JSON.stringify(input.markingRules), isCbtEnabled: false, createdById: session.userId,
      examQuestions: { create: input.questionIds.map((id, index) => ({
        questionId: id, sectionName: `${byId.get(id)!.subject} Section`, orderIndex: index + 1,
        marksCorrect: input.markingRules.correct, marksIncorrect: input.markingRules.incorrect, paperSet: "A",
      })) },
    } });
  });
}
