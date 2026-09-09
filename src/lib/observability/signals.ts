import { log, type LogFields } from "./logger";

/**
 * Monitoring signal catalog (PRD Section 42). Until a real metrics backend is
 * wired, `metric()` emits a structured `metric` log line that a collector can
 * scrape; the catalog keeps signal names, units and alert thresholds in one place
 * so the operator dashboards (OBS-002/004) and the launch war-room agree.
 */

export type Dashboard = "cloud" | "omr" | "ai" | "sync" | "product" | "security";

export interface SignalDef {
  dashboard: Dashboard;
  key: string;
  unit: "count" | "ms" | "ratio" | "bytes";
  description: string;
  /** operator alert fires at/above (or, for ratios where lower is worse, below) this */
  alert?: { direction: "above" | "below"; value: number };
}

export const SIGNALS = {
  // Cloud health
  apiRequest: { dashboard: "cloud", key: "api.request", unit: "count", description: "handled API request" },
  apiLatency: { dashboard: "cloud", key: "api.latency_ms", unit: "ms", description: "request latency", alert: { direction: "above", value: 500 } },
  apiError: { dashboard: "cloud", key: "api.error", unit: "count", description: "5xx / unhandled error", alert: { direction: "above", value: 1 } },
  jobQueueDepth: { dashboard: "cloud", key: "queue.depth", unit: "count", description: "pending background jobs" },

  // OMR
  omrJobStarted: { dashboard: "omr", key: "omr.job_started", unit: "count", description: "OMR job created" },
  omrSheetProcessed: { dashboard: "omr", key: "omr.sheet_processed", unit: "count", description: "sheet extracted" },
  omrSheetRejected: { dashboard: "omr", key: "omr.sheet_rejected", unit: "count", description: "sheet failed safe (REJECTED/UNMATCHED)" },
  omrReviewRate: { dashboard: "omr", key: "omr.review_rate", unit: "ratio", description: "questions routed to human review", alert: { direction: "above", value: 0.3 } },
  omrFalseConfidence: { dashboard: "omr", key: "omr.false_confidence_rate", unit: "ratio", description: "confident-but-wrong extraction", alert: { direction: "above", value: 0.01 } },

  // AI
  aiRequest: { dashboard: "ai", key: "ai.request", unit: "count", description: "AI gateway call" },
  aiLatency: { dashboard: "ai", key: "ai.latency_ms", unit: "ms", description: "AI gateway call latency" },
  aiFallback: { dashboard: "ai", key: "ai.fallback", unit: "count", description: "model unavailable -> bank/template fallback" },
  aiInvalidOutput: { dashboard: "ai", key: "ai.invalid_output", unit: "count", description: "model output failed schema validation", alert: { direction: "above", value: 1 } },

  // Sync
  syncNodesOnline: { dashboard: "sync", key: "sync.nodes_online", unit: "count", description: "paired nodes seen recently" },
  syncQueueSize: { dashboard: "sync", key: "sync.queue_size", unit: "count", description: "pending outbox events" },
  syncConflict: { dashboard: "sync", key: "sync.conflict", unit: "count", description: "event rejected as stale/divergent", alert: { direction: "above", value: 1 } },
  syncEventFailed: { dashboard: "sync", key: "sync.event_failed", unit: "count", description: "event apply transaction rolled back", alert: { direction: "above", value: 1 } },

  // Product funnel
  goldenStepCompleted: { dashboard: "product", key: "product.golden_step", unit: "count", description: "a golden-workflow step completed for a pilot tenant" },
  interventionVerified: { dashboard: "product", key: "product.intervention_verified", unit: "count", description: "intervention closed with retest evidence" },

  // Security
  authFailed: { dashboard: "security", key: "security.auth_failed", unit: "count", description: "failed login / invalid token" },
  permissionDenied: { dashboard: "security", key: "security.permission_denied", unit: "count", description: "403 on a protected operation" },
  privilegedAction: { dashboard: "security", key: "security.privileged_action", unit: "count", description: "result unlock / fee reversal / OMR override / permission change / node pairing" },
} satisfies Record<string, SignalDef>;

export type SignalName = keyof typeof SIGNALS;

/** Emit a metric sample as a structured log line. Extra fields must be scalars (OBS-003). */
export function metric(name: SignalName, value: number, fields?: LogFields): void {
  const def = SIGNALS[name];
  log.info("metric", { metric: def.key, dashboard: def.dashboard, unit: def.unit, value, ...(fields ?? {}) });
}
