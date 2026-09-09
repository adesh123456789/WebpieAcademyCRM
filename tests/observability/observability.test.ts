import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { log, setSink } from "../../src/lib/observability/logger";
import { getTraceId, TRACE_HEADER } from "../../src/lib/observability/trace";
import { SIGNALS, metric } from "../../src/lib/observability/signals";

/**
 * Observability layer (PRD 41/42, OBS-001..004). New `tests/observability/**`
 * subtree - carve-out requested in docs/handoffs/OBS-001-claude.md, same pattern
 * as tests/omr-corpus/** and tests/sync/**.
 */

let lines: string[] = [];
const savedLevel = process.env.LOG_LEVEL;

beforeEach(() => {
  lines = [];
  setSink((l) => lines.push(l));
  process.env.LOG_LEVEL = "debug";
});
afterEach(() => {
  setSink((l) => process.stdout.write(l + "\n"));
  if (savedLevel === undefined) delete process.env.LOG_LEVEL;
  else process.env.LOG_LEVEL = savedLevel;
});

const parsed = () => lines.map((l) => JSON.parse(l));

describe("structured logger", () => {
  it("emits one JSON object per line with ts/level/event and explicit fields", () => {
    log.info("thing.happened", { count: 3, ok: true });
    expect(lines).toHaveLength(1);
    const rec = parsed()[0];
    expect(rec.level).toBe("info");
    expect(rec.event).toBe("thing.happened");
    expect(rec.count).toBe(3);
    expect(rec.ok).toBe(true);
    expect(typeof rec.ts).toBe("string");
  });

  it("honours LOG_LEVEL ordering", () => {
    process.env.LOG_LEVEL = "warn";
    log.debug("d");
    log.info("i");
    log.warn("w");
    log.error("e");
    expect(parsed().map((r) => r.event)).toEqual(["w", "e"]);
  });

  it("child() binds fields onto every line", () => {
    const l = log.child({ traceId: "abc", tenantId: "t1" });
    l.info("a");
    l.warn("b", { extra: 1 });
    const recs = parsed();
    expect(recs[0]).toMatchObject({ traceId: "abc", tenantId: "t1", event: "a" });
    expect(recs[1]).toMatchObject({ traceId: "abc", tenantId: "t1", event: "b", extra: 1 });
  });

  it("reduces an Error to name/message/truncated stack, never the raw object", () => {
    log.error("boom", { where: "here" }, new Error("kaboom"));
    const rec = parsed()[0];
    expect(rec.errName).toBe("Error");
    expect(rec.errMessage).toBe("kaboom");
    expect(typeof rec.errStack).toBe("string");
    expect(rec).not.toHaveProperty("stack");
  });

  it("never throws into the caller even if the sink throws", () => {
    setSink(() => {
      throw new Error("sink down");
    });
    expect(() => log.info("still.fine")).not.toThrow();
  });

  it("drops undefined fields", () => {
    log.info("e", { a: 1, b: undefined });
    const rec = parsed()[0];
    expect(rec.a).toBe(1);
    expect(rec).not.toHaveProperty("b");
  });
});

describe("trace id", () => {
  const headers = (h: Record<string, string>) => new Headers(h);

  it("uses a valid x-request-id from Headers", () => {
    expect(getTraceId(headers({ [TRACE_HEADER]: "req-12345678" }))).toBe("req-12345678");
  });

  it("falls back to x-correlation-id", () => {
    expect(getTraceId(headers({ "x-correlation-id": "corr-abcdef" }))).toBe("corr-abcdef");
  });

  it("mints a uuid when the header is missing or junk", () => {
    const a = getTraceId(headers({}));
    const b = getTraceId(headers({ [TRACE_HEADER]: "x" })); // too short -> rejected
    const c = getTraceId(undefined);
    for (const v of [a, b, c]) expect(v).toMatch(/^[0-9a-f-]{36}$/);
    expect(a).not.toBe(c);
  });

  it("accepts a plain-object header bag", () => {
    expect(getTraceId({ [TRACE_HEADER]: "plain-object-id" })).toBe("plain-object-id");
  });
});

describe("metric signals", () => {
  it("emits a metric line resolved from the catalog", () => {
    metric("aiRequest", 1, { task: "question.generate", outcome: "MODEL" });
    const rec = parsed()[0];
    expect(rec).toMatchObject({
      event: "metric",
      metric: "ai.request",
      dashboard: "ai",
      unit: "count",
      value: 1,
      task: "question.generate",
      outcome: "MODEL",
    });
  });

  it("emits even when LOG_LEVEL suppresses logs (metrics are not level-gated)", () => {
    process.env.LOG_LEVEL = "error";
    log.info("should.be.dropped");
    metric("apiRequest", 1, { route: "/x" });
    const events = parsed().map((r) => r.event);
    expect(events).not.toContain("should.be.dropped");
    expect(events).toContain("metric");
  });

  it("catalog covers every PRD 42 dashboard with alert thresholds where it matters", () => {
    const dashboards = new Set(Object.values(SIGNALS).map((s) => s.dashboard));
    expect(dashboards).toEqual(new Set(["cloud", "omr", "ai", "sync", "product", "security"]));
    expect(SIGNALS.apiLatency.alert).toEqual({ direction: "above", value: 500 });
    expect(SIGNALS.omrFalseConfidence.alert).toEqual({ direction: "above", value: 0.01 });
  });
});
