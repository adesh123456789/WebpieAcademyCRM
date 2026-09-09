/**
 * Structured logging (PRD Section 41 "Observability", 42 "Monitoring", OBS-001..004).
 *
 * One JSON object per line: { ts, level, event, ...fields }. Callers pass explicit
 * scalar fields - the logger never deep-serializes an arbitrary object, so raw PII
 * cannot leak by accident (OBS-003). Errors are reduced to name/message/stack.
 *
 * Level from LOG_LEVEL (silent < error < warn < info < debug); default "info",
 * "error" when NODE_ENV=production, "silent" when NODE_ENV=test unless overridden.
 */

export type LogLevel = "silent" | "error" | "warn" | "info" | "debug";

const RANK: Record<LogLevel, number> = { silent: 0, error: 1, warn: 2, info: 3, debug: 4 };

function defaultLevel(): LogLevel {
  const env = (process.env.LOG_LEVEL || "").toLowerCase() as LogLevel;
  if (env in RANK) return env;
  if (process.env.NODE_ENV === "production") return "error";
  if (process.env.NODE_ENV === "test") return "silent";
  return "info";
}

export type LogFields = Record<string, string | number | boolean | null | undefined>;

export interface Logger {
  error(event: string, fields?: LogFields, err?: unknown): void;
  warn(event: string, fields?: LogFields): void;
  info(event: string, fields?: LogFields): void;
  debug(event: string, fields?: LogFields): void;
  /** Bind fields (e.g. { traceId, tenantId }) onto every line from the returned logger. */
  child(bound: LogFields): Logger;
}

type Sink = (line: string) => void;

/** Overridable for tests; defaults to process.stdout. */
export let sink: Sink = (line) => {
  process.stdout.write(line + "\n");
};

export function setSink(fn: Sink): void {
  sink = fn;
}

/** Write one raw line through the current sink, swallowing sink errors. Used by
 *  the logger and by the default metric sink so both share one output stream
 *  (and one `setSink` for capture/routing) while metrics stay level-independent. */
export function emitLine(line: string): void {
  try {
    sink(line);
  } catch {
    /* output must never throw into the caller */
  }
}

function errShape(err: unknown): LogFields {
  if (err instanceof Error) {
    return { errName: err.name, errMessage: err.message, errStack: err.stack?.split("\n").slice(0, 4).join(" | ") };
  }
  if (err === undefined) return {};
  return { errMessage: String(err) };
}

function pruneUndefined(o: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k] = v;
  return out;
}

function make(bound: LogFields, getLevel: () => LogLevel): Logger {
  const emit = (level: Exclude<LogLevel, "silent">, event: string, fields?: LogFields, err?: unknown) => {
    if (RANK[level] > RANK[getLevel()]) return;
    const record = pruneUndefined({
      ts: new Date().toISOString(),
      level,
      event,
      ...bound,
      ...(fields ?? {}),
      ...errShape(err),
    });
    try {
      sink(JSON.stringify(record));
    } catch {
      // logging must never throw into the caller
    }
  };
  return {
    error: (e, f, err) => emit("error", e, f, err),
    warn: (e, f) => emit("warn", e, f),
    info: (e, f) => emit("info", e, f),
    debug: (e, f) => emit("debug", e, f),
    child: (extra) => make({ ...bound, ...extra }, getLevel),
  };
}

/** Root logger. Level is read per-call so tests can flip LOG_LEVEL at runtime. */
export const log: Logger = make({}, defaultLevel);
