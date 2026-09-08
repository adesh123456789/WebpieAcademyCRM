import { performance } from "node:perf_hooks";
import { selectApprovedBankQuestions } from "./bank-fallback";
import { parentSummaryPrompt, questionGeneratePrompt } from "./prompts";
import { recordAIRequest } from "./provenance";
import {
  AI_CANDIDATE_STATUS,
  generatedQuestionSchema,
  modelQuestionListSchema,
  parentSummarySchema,
  type AIContext,
  type AIResult,
  type Difficulty,
  type GeneratedQuestion,
  type Language,
  type ParentSummary,
  type ParentSummaryInput,
  type QuestionGenerateInput,
} from "./schemas";

// ---- back-compat types (kept so existing route imports still compile) ----

export interface AIGenerateQuestionRequest {
  tenantId: string;
  examType: string;
  subject: string;
  chapter: string;
  concept: string;
  difficulty: Difficulty;
  count: number;
}

export interface AIGeneratedQuestionCandidate extends GeneratedQuestion {}

export interface ParentReportSummaryRequest {
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

// ---- config ----

const DEFAULT_TIMEOUT_MS = 20_000;
const timeoutMs = () => {
  const n = Number(process.env.AI_CALL_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MS;
};

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * AI-001 AI Gateway. One path per task:
 *   resolve scope -> prompt template -> model call (bounded timeout) ->
 *   runtime schema validation -> provenance -> return.
 * Any failure yields a safe, non-fabricated fallback. AI never produces
 * authoritative marks, rank or mastery.
 */
export class AIGateway {
  static readonly VERSION = "2026.2";

  // ---------- question.generate ----------

  static async generateQuestions(
    input: QuestionGenerateInput,
    ctx: AIContext,
  ): Promise<AIResult<{ candidates: GeneratedQuestion[] }>> {
    const count = Math.min(Math.max(1, Math.trunc(input.count || 1)), 20);
    const started = performance.now();
    const tpl = questionGeneratePrompt;

    const modelCandidates = await this.tryModelQuestions({ ...input, count }, ctx);

    if (modelCandidates) {
      const latencyMs = performance.now() - started;
      const aiRequestId = await recordAIRequest(ctx, {
        task: "question.generate",
        provider: "google",
        model: "gemini-1.5-flash",
        promptTemplateId: tpl.id,
        promptTemplateVersion: tpl.version,
        input: { ...input, count, tenantId: ctx.tenantId },
        outcome: "MODEL",
        latencyMs,
      });
      const candidates = modelCandidates.map((c) => ({
        ...c,
        provenance: { ...c.provenance, aiRequestId },
      }));
      return {
        data: { candidates },
        outcome: "MODEL",
        provenance: candidates[0]?.provenance ?? this.blankProvenance(tpl, aiRequestId),
      };
    }

    // fallback: approved bank only, never fabricated
    const latencyMs = performance.now() - started;
    const aiRequestId = await recordAIRequest(ctx, {
      task: "question.generate",
      provider: "webpie-bank",
      model: "approved-question-bank",
      promptTemplateId: tpl.id,
      promptTemplateVersion: tpl.version,
      input: { ...input, count, tenantId: ctx.tenantId },
      outcome: "FALLBACK_BANK",
      latencyMs,
    });
    const candidates = await selectApprovedBankQuestions(
      { tenantId: ctx.tenantId, concept: input.concept, difficulty: input.difficulty, count },
      aiRequestId,
    );
    return {
      data: { candidates },
      outcome: "FALLBACK_BANK",
      provenance: candidates[0]?.provenance ?? this.blankProvenance(tpl, aiRequestId),
      shortfall: count - candidates.length,
    };
  }

  /** Returns validated MODEL candidates, or null to signal "use the fallback". */
  private static async tryModelQuestions(
    input: QuestionGenerateInput,
    ctx: AIContext,
  ): Promise<GeneratedQuestion[] | null> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return null;

    try {
      const res = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: questionGeneratePrompt.build(input) }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        },
        timeoutMs(),
      );
      if (!res.ok) {
        console.error(`[ai] gemini http ${res.status} trace=${ctx.traceId}`);
        return null;
      }
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return null;

      const parsed = modelQuestionListSchema.safeParse(JSON.parse(text));
      if (!parsed.success) {
        console.error(`[ai] gemini output failed schema trace=${ctx.traceId}`);
        return null;
      }

      const mapped: GeneratedQuestion[] = [];
      for (const q of parsed.data.slice(0, input.count)) {
        const candidate = {
          body: q.body,
          options: q.options,
          correctAnswer: q.correctAnswer,
          solution: q.solution,
          declaredDifficulty: input.difficulty,
          concept: input.concept,
          subject: input.subject,
          status: AI_CANDIDATE_STATUS,
          source: "MODEL" as const,
          provenance: {
            provider: "google",
            model: "gemini-1.5-flash",
            promptTemplateId: questionGeneratePrompt.id,
            promptTemplateVersion: questionGeneratePrompt.version,
            aiRequestId: "pending",
          },
        };
        const check = generatedQuestionSchema.safeParse(candidate);
        if (!check.success) return null; // one bad item -> distrust the whole batch
        mapped.push(check.data);
      }
      return mapped.length > 0 ? mapped : null;
    } catch (err) {
      console.error(`[ai] gemini call failed trace=${ctx.traceId}:`, (err as Error).message);
      return null;
    }
  }

  // ---------- report.parentSummary ----------

  static async parentSummary(
    input: ParentSummaryInput,
    ctx: AIContext,
  ): Promise<AIResult<ParentSummary>> {
    const started = performance.now();
    const tpl = parentSummaryPrompt;
    // v1: no model wired for parent summaries yet - deterministic template only.
    // The template restates authoritative numbers; it never computes them.
    const text = renderParentTemplate(input);
    const latencyMs = performance.now() - started;
    const aiRequestId = await recordAIRequest(ctx, {
      task: "report.parentSummary",
      provider: "webpie-template",
      model: "parent-summary-template-v1",
      promptTemplateId: tpl.id,
      promptTemplateVersion: tpl.version,
      input: { ...input, tenantId: ctx.tenantId },
      outcome: "FALLBACK_TEMPLATE",
      latencyMs,
    });
    const summary: ParentSummary = {
      text,
      language: input.language,
      outcome: "FALLBACK_TEMPLATE",
      provenance: {
        provider: "webpie-template",
        model: "parent-summary-template-v1",
        promptTemplateId: tpl.id,
        promptTemplateVersion: tpl.version,
        aiRequestId,
      },
    };
    const check = parentSummarySchema.safeParse(summary);
    if (!check.success) throw new Error("parent summary template produced invalid output");
    return { data: check.data, outcome: "FALLBACK_TEMPLATE", provenance: summary.provenance };
  }

  private static blankProvenance(
    tpl: { id: string; version: string },
    aiRequestId: string,
  ): AIResult<unknown>["provenance"] {
    return {
      provider: "webpie-bank",
      model: "approved-question-bank",
      promptTemplateId: tpl.id,
      promptTemplateVersion: tpl.version,
      aiRequestId,
    };
  }

  // ---------- deprecated back-compat shims (Codex removes when routes migrate) ----------

  /** @deprecated use {@link AIGateway.generateQuestions}. Returns candidates only. */
  static async generateQuestionCandidates(
    params: AIGenerateQuestionRequest,
  ): Promise<AIGeneratedQuestionCandidate[]> {
    const ctx: AIContext = {
      tenantId: params.tenantId,
      userId: "system",
      role: "SYSTEM",
      traceId: `legacy-${Date.now()}`,
    };
    const result = await this.generateQuestions(
      {
        examType: params.examType,
        subject: params.subject,
        chapter: params.chapter,
        concept: params.concept,
        difficulty: params.difficulty,
        count: params.count,
      },
      ctx,
    );
    return result.data.candidates;
  }

  /** @deprecated use {@link AIGateway.parentSummary}. Returns the summary text only. */
  static async generateParentReportSummary(req: ParentReportSummaryRequest): Promise<string> {
    const ctx: AIContext = {
      tenantId: "system",
      userId: "system",
      role: "SYSTEM",
      traceId: `legacy-${Date.now()}`,
    };
    const result = await this.parentSummary(req, ctx);
    return result.data.text;
  }
}

function renderParentTemplate(i: ParentSummaryInput): string {
  const accuracy = i.maxMarks > 0 ? Math.round((i.score / i.maxMarks) * 100) : 0;
  const strong = i.strongConcepts.join(", ");
  const weak = i.weakConcepts.join(", ");

  if (i.language === "mr") {
    return `पालक सारांश: ${i.studentName} यांनी ${i.examTitle} मध्ये ${i.maxMarks} पैकी ${i.score} गुण मिळवले (${accuracy}%). एकूण ${i.totalStudents} विद्यार्थ्यांमध्ये वर्ग क्रमांक ${i.rank}.
उत्कृष्ट संकल्पना: ${strong || "सर्वसाधारण"}.
सुधारणा आवश्यक: ${weak || "कोणतीही गंभीर त्रुटी नाही"}.
पुढील कृती: कमकुवत संकल्पनांसाठी वैयक्तिक सराव पत्रक दिले आहे.`;
  }
  if (i.language === "hi") {
    return `अभिभावक सारांश: ${i.studentName} ने ${i.examTitle} में ${i.maxMarks} में से ${i.score} अंक (${accuracy}%) प्राप्त किए। कुल ${i.totalStudents} विद्यार्थियों में कक्षा रैंक ${i.rank}।
मज़बूत अवधारणाएँ: ${strong || "सामान्य"}.
सुधार आवश्यक: ${weak || "कोई गंभीर समस्या नहीं"}.
अगली कार्रवाई: कमज़ोर अवधारणाओं के लिए व्यक्तिगत अभ्यास पत्रक दिया गया है।`;
  }
  return `Parent summary: ${i.studentName} scored ${i.score} of ${i.maxMarks} (${accuracy}%) in ${i.examTitle}, ranking ${i.rank} of ${i.totalStudents}.
Strengths: ${strong || "solid baseline across tested units"}.
Focus areas: ${weak || "none critical"}.
Next action: a personalised remedial worksheet has been assigned for the focus areas.`;
}
