import { z } from "zod";

/**
 * AI-001 - runtime output schemas. Model output is validated against these
 * BEFORE it is returned or rendered; invalid output is discarded and the
 * non-fabricating fallback runs instead.
 */

export const DIFFICULTY = ["EASY", "MEDIUM", "HARD"] as const;
export type Difficulty = (typeof DIFFICULTY)[number];

export const LANGUAGE = ["en", "hi", "mr"] as const;
export type Language = (typeof LANGUAGE)[number];

export type AITask = "question.generate" | "report.parentSummary" | "copilot.query";

export type AIOutcome = "MODEL" | "FALLBACK_BANK" | "FALLBACK_TEMPLATE" | "ERROR";

export const AI_CANDIDATE_STATUS = "AI_CANDIDATE" as const;

const optionSchema = z.object({
  id: z.enum(["A", "B", "C", "D", "E", "F"]),
  text: z.string().min(1),
});

/**
 * A generated question candidate. `source: "MODEL"` items have passed model-output
 * validation; `source: "BANK"` items are pre-approved Question rows. Real exam
 * papers use 4 options; the bank may legitimately hold 2-6, so the shared schema
 * is lenient and the model prompt asks for exactly 4.
 */
export const generatedQuestionSchema = z
  .object({
    body: z.string().min(1),
    options: z.array(optionSchema).min(2).max(6),
    correctAnswer: z.enum(["A", "B", "C", "D", "E", "F"]),
    solution: z.string().min(1),
    declaredDifficulty: z.enum(DIFFICULTY),
    concept: z.string().min(1),
    subject: z.string().min(1),
    status: z.literal(AI_CANDIDATE_STATUS),
    source: z.enum(["MODEL", "BANK"]),
    provenance: z.object({
      provider: z.string().min(1),
      model: z.string().min(1),
      promptTemplateId: z.string().min(1),
      promptTemplateVersion: z.string().min(1),
      aiRequestId: z.string().min(1),
    }),
  })
  .superRefine((q, ctx) => {
    const ids = new Set(q.options.map((o) => o.id));
    if (ids.size !== q.options.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "option ids must be unique" });
    }
    if (!ids.has(q.correctAnswer)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "correctAnswer must be one of the option ids" });
    }
  });

export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;

/**
 * Raw model output for question generation, before we attach status/source/
 * provenance. Strict: exactly 4 options, ids A-D.
 */
export const modelQuestionSchema = z
  .object({
    body: z.string().min(1),
    options: z
      .array(z.object({ id: z.enum(["A", "B", "C", "D"]), text: z.string().min(1) }))
      .length(4),
    correctAnswer: z.enum(["A", "B", "C", "D"]),
    solution: z.string().min(1),
  })
  .superRefine((q, ctx) => {
    const ids = new Set(q.options.map((o) => o.id));
    if (ids.size !== 4) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "option ids must be A,B,C,D" });
    if (!ids.has(q.correctAnswer)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "correctAnswer must be one of the option ids" });
    }
  });

export const modelQuestionListSchema = z.array(modelQuestionSchema).min(1);

export const parentSummarySchema = z.object({
  text: z.string().min(1),
  language: z.enum(LANGUAGE),
  outcome: z.enum(["MODEL", "FALLBACK_TEMPLATE"]),
  provenance: z.object({
    provider: z.string().min(1),
    model: z.string().min(1),
    promptTemplateId: z.string().min(1),
    promptTemplateVersion: z.string().min(1),
    aiRequestId: z.string().min(1),
  }),
});

export type ParentSummary = z.infer<typeof parentSummarySchema>;

// --- copilot.query (AI-001 scoped Teacher Copilot) ---

export const copilotActionSchema = z.object({
  type: z.enum(["REMEDIAL_WORKSHEET", "EXTRA_DOUBT_SESSION", "ASSIGNMENT_RETEST"]),
  title: z.string().min(1),
  description: z.string().min(1),
  estimatedMinutes: z.number().int().positive().max(240),
});

export const copilotActionPlanSchema = z.object({
  id: z.string().min(1),
  topic: z.string().min(1),
  subject: z.string().min(1),
  targetBatch: z.string().min(1),
  evidenceSummary: z.string().min(1),
  recommendedActions: z.array(copilotActionSchema).min(1),
  /** where the evidence/context came from - always internal, tenant-scoped */
  retrievalScope: z.enum(["TENANT_PRIVATE", "WEBPIE_APPROVED_BANK"]),
  confidenceScore: z.number().min(0).max(1),
  aiRequestId: z.string().min(1),
  /** this is a proposal - confirming it is a separate authorized action */
  status: z.literal("PROPOSED"),
});

export type CopilotActionPlan = z.infer<typeof copilotActionPlanSchema>;

// --- task inputs ---

export interface QuestionGenerateInput {
  examType: string;
  subject: string;
  chapter: string;
  concept: string;
  difficulty: Difficulty;
  count: number; // 1..20, enforced by the route and clamped defensively here
}

export interface ParentSummaryInput {
  studentName: string;
  examTitle: string;
  score: number;
  maxMarks: number;
  rank: number;
  totalStudents: number;
  strongConcepts: string[];
  weakConcepts: string[];
  language: Language;
}

export interface AIContext {
  tenantId: string;
  userId: string;
  role: string;
  traceId: string;
}

export interface AIResult<T> {
  data: T;
  outcome: AIOutcome;
  provenance: {
    provider: string;
    model: string;
    promptTemplateId: string;
    promptTemplateVersion: string;
    aiRequestId: string;
  };
  shortfall?: number;
}

export class AIScopeError extends Error {
  code = "AI_SCOPE_DENIED" as const;
}
export class AIConfigError extends Error {
  code = "AI_CONFIG" as const;
}
