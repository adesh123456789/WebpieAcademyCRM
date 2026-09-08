import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { AIContext, AIOutcome, AITask } from "./schemas";

/** Stable JSON stringify (sorted keys) so the same logical input hashes the same. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const body = Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",");
  return `{${body}}`;
}

export function hashInput(input: unknown): string {
  return createHash("sha256").update(stableStringify(input)).digest("hex");
}

export interface ProvenanceDraft {
  task: AITask;
  provider: string;
  model: string;
  promptTemplateId: string;
  promptTemplateVersion: string;
  input: unknown;
  outcome: AIOutcome;
  latencyMs: number;
}

/**
 * Persist one AIRequest row per gateway call. Never throws into the caller -
 * a provenance write failure must not break the user-facing workflow (AI-007),
 * but it is logged with the trace id.
 */
export async function recordAIRequest(ctx: AIContext, draft: ProvenanceDraft): Promise<string> {
  try {
    const row = await prisma.aIRequest.create({
      data: {
        tenantId: ctx.tenantId,
        task: draft.task,
        provider: draft.provider,
        model: draft.model,
        promptTemplateId: draft.promptTemplateId,
        promptTemplateVersion: draft.promptTemplateVersion,
        inputHash: hashInput(draft.input),
        outcome: draft.outcome,
        latencyMs: Math.max(0, Math.round(draft.latencyMs)),
        createdById: ctx.userId,
      },
      select: { id: true },
    });
    return row.id;
  } catch (err) {
    console.error(`[ai] provenance write failed trace=${ctx.traceId}:`, (err as Error).message);
    return `unrecorded:${ctx.traceId}`;
  }
}
