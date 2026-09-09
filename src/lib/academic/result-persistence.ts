import { prisma } from "@/lib/prisma";
import type { StudentEvaluationResult } from "./evaluation-engine";

/** Persist one deterministic evaluation as an immutable revision. */
export async function persistEvaluationResult(input: {
  tenantId: string;
  examId: string;
  batchId?: string | null;
  result: StudentEvaluationResult;
}) {
  const { tenantId, examId, batchId, result } = input;
  const questionResponses = JSON.stringify(result.questionDetails);
  const existing = await prisma.examResult.findFirst({
    where: { tenantId, examId, studentId: result.studentId },
    orderBy: { version: "desc" },
  });
  if (existing && existing.score === result.totalMarks && existing.questionResponses === questionResponses) return existing;
  const version = (existing?.version ?? 0) + 1;
  return prisma.examResult.create({ data: {
    tenantId, examId, studentId: result.studentId, batchId: batchId ?? null,
    score: result.totalMarks, maximumMarks: result.maximumMarks,
    accuracyPercentage: result.accuracyPercentage, totalAttempted: result.totalAttempted,
    totalCorrect: result.totalCorrect, totalIncorrect: result.totalIncorrect,
    totalUnattempted: result.totalUnattempted, negativeMarksDeducted: result.negativeMarksDeducted,
    cohortRank: result.cohortRank, cohortPercentile: result.cohortPercentile,
    subjectScores: JSON.stringify(result.subjectScores), questionResponses,
    version, isFinal: true,
  } });
}
