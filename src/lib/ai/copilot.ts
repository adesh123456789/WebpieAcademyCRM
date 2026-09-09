import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { prisma } from "@/lib/prisma";
import { traceLogger, metric } from "@/lib/observability";
import { recordAIRequest } from "./provenance";
import {
  AIScopeError,
  copilotActionPlanSchema,
  type AIContext,
  type AIResult,
  type CopilotActionPlan,
} from "./schemas";

/**
 * AI-001 - Teacher Copilot, scoped. The Copilot never retrieves or infers data
 * outside the caller's authorized scope (AC-018), and it never executes actions:
 * it returns a `status: "PROPOSED"` plan that a subsequent authorized call turns
 * into a real worksheet / intervention.
 *
 * v1 is deterministic (mastery analytics + templated actions). A model may later
 * rephrase `evidenceSummary`, but the numbers stay from deterministic services.
 */

export interface CopilotScope {
  /** owner / branch admin / individual teacher see every batch in their tenant (or branch) */
  all: boolean;
  batchIds: string[];
}

const ALL_BATCH_ROLES = new Set(["OWNER", "BRANCH_ADMIN", "INDIVIDUAL_TEACHER", "WEBPIE_ADMIN"]);

export function resolveCopilotScope(role: string, rawScopes: string | null): CopilotScope {
  if (ALL_BATCH_ROLES.has(role)) return { all: true, batchIds: [] };
  let batchIds: string[] = [];
  try {
    const parsed = JSON.parse(rawScopes || "{}");
    if (Array.isArray(parsed.batchIds)) batchIds = parsed.batchIds.filter((b: unknown) => typeof b === "string");
  } catch {
    /* no scopes -> empty */
  }
  return { all: false, batchIds };
}

export interface CopilotWeaknessInput {
  batchId: string;
  subject?: string;
}

type CopilotCtx = AIContext & { scopes: string | null; branchId?: string | null };

const WEAK_STATES = ["CRITICAL", "WEAK"];

export async function copilotWeaknessPlan(
  input: CopilotWeaknessInput,
  ctx: CopilotCtx,
): Promise<AIResult<CopilotActionPlan | null>> {
  const started = performance.now();
  const scope = resolveCopilotScope(ctx.role, ctx.scopes);
  const log = traceLogger(ctx.traceId, { task: "copilot.query", tenantId: ctx.tenantId });

  // Scope gate (AC-018): a batch outside the caller's authorized set is invisible.
  if (!scope.all && !scope.batchIds.includes(input.batchId)) {
    log.warn("ai.copilot_scope_denied", { batchId: input.batchId });
    metric("permissionDenied", 1, { route: "ai.copilot" });
    throw new AIScopeError("Copilot cannot access a batch outside your assigned scope");
  }

  const batch = await prisma.batch.findFirst({
    where: {
      id: input.batchId,
      tenantId: ctx.tenantId,
      ...(ctx.branchId ? { branchId: ctx.branchId } : {}),
    },
    select: { id: true, name: true },
  });
  if (!batch) throw new AIScopeError("Batch not found in your tenant/branch scope");

  const enrolled = await prisma.enrollment.findMany({
    where: { batchId: batch.id, status: "ACTIVE" },
    select: { studentId: true },
  });
  const studentIds = enrolled.map((e) => e.studentId);

  const evidence =
    studentIds.length === 0
      ? []
      : await prisma.masteryScore.findMany({
          where: {
            tenantId: ctx.tenantId, // never crosses tenants (AC-015)
            studentId: { in: studentIds },
            state: { in: WEAK_STATES },
            ...(input.subject ? { subject: input.subject } : {}),
          },
          select: { concept: true, subject: true, score: true, studentId: true },
        });

  const provenanceBase = {
    task: "copilot.query" as const,
    provider: "webpie-analytics",
    model: "copilot-weakness-v1",
    promptTemplateId: "copilot.weakness",
    promptTemplateVersion: "1.0.0",
    input: { batchId: input.batchId, subject: input.subject ?? null, tenantId: ctx.tenantId },
  };

  if (evidence.length === 0) {
    const aiRequestId = await recordAIRequest(ctx, {
      ...provenanceBase,
      outcome: "FALLBACK_TEMPLATE",
      latencyMs: performance.now() - started,
    });
    metric("aiRequest", 1, { task: "copilot.query", outcome: "NO_WEAKNESS" });
    return {
      data: null,
      outcome: "FALLBACK_TEMPLATE",
      provenance: { provider: provenanceBase.provider, model: provenanceBase.model, promptTemplateId: provenanceBase.promptTemplateId, promptTemplateVersion: provenanceBase.promptTemplateVersion, aiRequestId },
    };
  }

  // worst concept: most students affected, then lowest average mastery
  const byConcept = new Map<string, { subject: string; students: Set<string>; sum: number; n: number }>();
  for (const e of evidence) {
    const row = byConcept.get(e.concept) ?? { subject: e.subject, students: new Set<string>(), sum: 0, n: 0 };
    row.students.add(e.studentId);
    row.sum += e.score;
    row.n += 1;
    byConcept.set(e.concept, row);
  }
  const ranked = Array.from(byConcept.entries())
    .map(([concept, r]) => ({ concept, subject: r.subject, affected: r.students.size, avg: r.sum / r.n }))
    .sort((a, b) => b.affected - a.affected || a.avg - b.avg);
  const worst = ranked[0];

  const aiRequestId = await recordAIRequest(ctx, {
    ...provenanceBase,
    outcome: "FALLBACK_TEMPLATE",
    latencyMs: performance.now() - started,
  });

  const plan: CopilotActionPlan = {
    id: randomUUID(),
    topic: worst.concept,
    subject: worst.subject,
    targetBatch: batch.name,
    evidenceSummary: `${worst.affected} of ${studentIds.length} students in ${batch.name} are weak in "${worst.concept}" (average mastery ${Math.round(worst.avg)}%).`,
    recommendedActions: [
      {
        type: "REMEDIAL_WORKSHEET",
        title: `Remedial worksheet: ${worst.concept}`,
        description: "Three-tier practice ladder - foundation, application, exam-level - for the weak cluster.",
        estimatedMinutes: 45,
      },
      {
        type: "EXTRA_DOUBT_SESSION",
        title: `Doubt session: ${worst.concept}`,
        description: "Targeted concept clarification before the next assessment.",
        estimatedMinutes: 30,
      },
    ],
    retrievalScope: "TENANT_PRIVATE",
    confidenceScore: Math.min(1, worst.affected / Math.max(3, studentIds.length)),
    aiRequestId,
    status: "PROPOSED",
  };

  const check = copilotActionPlanSchema.safeParse(plan);
  if (!check.success) throw new Error("copilot plan failed schema validation");

  metric("aiRequest", 1, { task: "copilot.query", outcome: "PLAN" });
  return {
    data: check.data,
    outcome: "FALLBACK_TEMPLATE",
    provenance: { provider: provenanceBase.provider, model: provenanceBase.model, promptTemplateId: provenanceBase.promptTemplateId, promptTemplateVersion: provenanceBase.promptTemplateVersion, aiRequestId },
  };
}
