import { randomUUID } from "node:crypto";
import { log, type Logger } from "./logger";

/**
 * Correlation id (OBS-001). A user-facing job/error can be traced end to end by
 * this id. Routes already read `x-request-id`; standardize on it here.
 */
export const TRACE_HEADER = "x-request-id";

type HeaderLike = { get(name: string): string | null } | Record<string, string | undefined> | undefined;

export function getTraceId(headers?: HeaderLike): string {
  if (headers) {
    const raw =
      typeof (headers as { get?: unknown }).get === "function"
        ? (headers as { get(n: string): string | null }).get(TRACE_HEADER) ??
          (headers as { get(n: string): string | null }).get("x-correlation-id")
        : (headers as Record<string, string | undefined>)[TRACE_HEADER] ??
          (headers as Record<string, string | undefined>)["x-correlation-id"];
    if (raw && /^[\w.:-]{6,128}$/.test(raw)) return raw;
  }
  return randomUUID();
}

/** A logger bound to this trace (and any extra scope fields). */
export function traceLogger(
  traceId: string,
  scope?: Record<string, string | number | boolean | null | undefined>,
): Logger {
  return log.child({ traceId, ...(scope ?? {}) });
}
