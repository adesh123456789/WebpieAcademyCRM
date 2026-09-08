import { prisma } from "@/lib/prisma";
import {
  generatedQuestionSchema,
  type Difficulty,
  type GeneratedQuestion,
  AI_CANDIDATE_STATUS,
} from "./schemas";

const OPTION_IDS = new Set(["A", "B", "C", "D", "E", "F"]);

interface BankQuery {
  tenantId: string;
  concept: string;
  difficulty: Difficulty;
  count: number;
}

/**
 * AI-001 section 3 - the non-fabricating fallback. Returns pre-approved Question
 * rows the tenant is allowed to use, mapped to GeneratedQuestion. Scope is fixed
 * here (never taken from caller input):
 *   status       in (REVIEWED, VERIFIED)
 *   ownerScope   in (PLATFORM, TENANT_PRIVATE)
 *   tenantId     = ctx tenant  OR  null (platform bank)
 *   type         = SINGLE_CORRECT   (expressible as a single-letter answer)
 */
export async function selectApprovedBankQuestions(
  q: BankQuery,
  aiRequestId: string,
): Promise<GeneratedQuestion[]> {
  const take = Math.min(Math.max(1, Math.trunc(q.count)), 20);

  const rows = await prisma.question.findMany({
    where: {
      concept: q.concept,
      declaredDifficulty: q.difficulty,
      type: "SINGLE_CORRECT",
      status: { in: ["REVIEWED", "VERIFIED"] },
      ownerScope: { in: ["PLATFORM", "TENANT_PRIVATE"] },
      OR: [{ tenantId: q.tenantId }, { tenantId: null }],
    },
    orderBy: { updatedAt: "desc" },
    take,
  });

  const out: GeneratedQuestion[] = [];
  for (const row of rows) {
    const mapped = toGeneratedQuestion(row, aiRequestId);
    if (mapped) out.push(mapped);
  }
  return out;
}

function toGeneratedQuestion(
  row: {
    tenantId: string | null;
    concept: string;
    subject: string;
    declaredDifficulty: string;
    body: string;
    options: string;
    correctAnswer: string;
    solution: string;
  },
  aiRequestId: string,
): GeneratedQuestion | null {
  let options: unknown;
  let correct: unknown;
  try {
    options = JSON.parse(row.options);
    correct = JSON.parse(row.correctAnswer);
  } catch {
    return null;
  }
  if (typeof correct !== "string" || !OPTION_IDS.has(correct)) return null; // skip MULTIPLE_CORRECT / NUMERICAL

  const candidate = {
    body: row.body,
    options,
    correctAnswer: correct,
    solution: row.solution,
    declaredDifficulty: (["EASY", "MEDIUM", "HARD"].includes(row.declaredDifficulty)
      ? row.declaredDifficulty
      : "MEDIUM") as Difficulty,
    concept: row.concept,
    subject: row.subject,
    status: AI_CANDIDATE_STATUS,
    source: "BANK" as const,
    provenance: {
      provider: "webpie-bank",
      model: "approved-question-bank",
      promptTemplateId: "n/a",
      promptTemplateVersion: "n/a",
      aiRequestId,
    },
  };

  const parsed = generatedQuestionSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}
