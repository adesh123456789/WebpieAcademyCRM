import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { TokenPayload } from "@/lib/auth";
import { ExamDraftError } from "./draft";

const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export async function transitionExam(id: string, session: TokenPayload, action: "review" | "finalize", expectedVersion: number, key?: string) {
  return prisma.$transaction(async tx => {
    const exam = await tx.exam.findFirst({ where: { id, tenantId: session.tenantId,
      ...(session.branchId ? { branchId: session.branchId } : {}) },
      include: { examQuestions: { include: { question: true }, orderBy: { orderIndex: "asc" } } } });
    if (!exam) throw new ExamDraftError(404, "Exam not found");
    const blueprint = JSON.parse(exam.blueprint);
    if (action === "finalize" && exam.status === "FINALIZED" && blueprint.finalizeKey === key && blueprint.finalizeVersion === expectedVersion) {
      return { id, status: exam.status, version: exam.version, snapshotId: blueprint.snapshotId, finalizedAt: exam.finalizedAt };
    }
    if (exam.version !== expectedVersion || exam.status !== (action === "review" ? "DRAFT" : "IN_REVIEW")) throw new ExamDraftError(409, "VERSION_CONFLICT");
    if (!exam.examQuestions.length || exam.totalQuestions !== exam.examQuestions.length ||
      Math.abs(exam.totalMarks - exam.examQuestions.reduce((n, q) => n + q.marksCorrect, 0)) > 1e-8) throw new ExamDraftError(422, "BLUEPRINT_INVALID");
    for (const item of exam.examQuestions) {
      const q = item.question;
      if (!((q.ownerScope === "PLATFORM" && q.tenantId === null) || (q.ownerScope === "TENANT_PRIVATE" && q.tenantId === session.tenantId))) throw new ExamDraftError(403, "Question outside authorized scope");
      if (!["REVIEWED", "VERIFIED"].includes(q.status)) throw new ExamDraftError(422, "UNAPPROVED_CANDIDATE");
    }
    const fingerprint = hash({ questions: exam.examQuestions, markingRules: exam.markingRules, totalMarks: exam.totalMarks, durationMinutes: exam.durationMinutes, batchIds: exam.batchIds });
    if (action === "finalize" && blueprint.reviewHash !== fingerprint) throw new ExamDraftError(409, "REVIEW_STALE");
    const next = { ...blueprint, reviewHash: fingerprint };
    const finalizedAt = action === "finalize" ? new Date() : null;
    if (action === "finalize") {
      const questionVersions: Record<string, string> = {};
      for (const item of exam.examQuestions) {
        const snapshot = JSON.stringify(item.question);
        const previous = await tx.questionVersion.findUnique({ where: { questionId_version: { questionId: item.questionId, version: item.question.version } } });
        if (previous && previous.snapshot !== snapshot) throw new ExamDraftError(409, "QUESTION_VERSION_CONFLICT");
        const version = previous ?? await tx.questionVersion.create({ data: {
          questionId: item.questionId, version: item.question.version, tenantId: item.question.tenantId,
          snapshot, status: "APPROVED", createdById: session.userId,
        } });
        questionVersions[item.id] = version.id;
      }
      Object.assign(next, { questionVersions, snapshotId: randomUUID(), finalizeKey: key, finalizeVersion: expectedVersion });
    }
    const status = action === "review" ? "IN_REVIEW" : "FINALIZED";
    const updated = await tx.exam.updateMany({ where: { id, tenantId: session.tenantId, version: expectedVersion, status: exam.status }, data: {
      status, version: { increment: 1 }, blueprint: JSON.stringify(next), finalizedAt,
    } });
    if (updated.count !== 1) throw new ExamDraftError(409, "VERSION_CONFLICT");
    await tx.auditLog.create({ data: { tenantId: session.tenantId, userId: session.userId, action: `EXAM_${action.toUpperCase()}`, entityType: "Exam", entityId: id,
      details: JSON.stringify({ version: expectedVersion + 1, snapshotId: next.snapshotId ?? null }) } });
    return { id, status, version: expectedVersion + 1, snapshotId: next.snapshotId, finalizedAt };
  });
}

/** Hydrate pinned questions for all delivery/scoring consumers; old exams retain legacy behavior. */
export async function usePinnedQuestions<T extends { blueprint: string; examQuestions: Array<{ id: string; question: object }> }>(exam: T): Promise<T> {
  const refs = JSON.parse(exam.blueprint).questionVersions as Record<string, string> | undefined;
  if (!refs) return exam;
  const rows = await prisma.questionVersion.findMany({ where: { id: { in: Object.values(refs) } } });
  const byId = new Map(rows.map(row => [row.id, row]));
  for (const item of exam.examQuestions) {
    const row = byId.get(refs[item.id]);
    if (!row) throw new Error("Pinned question version missing");
    const snapshot = JSON.parse(row.snapshot);
    // Preserve the caller's safe projection; never add answer keys to a list projection.
    item.question = Object.fromEntries(Object.keys(item.question).map(key => [key, snapshot[key]]));
  }
  return exam;
}
