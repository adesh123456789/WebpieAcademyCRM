import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { observedRoute } from "../../src/lib/api/observed-route";
import { setSink, sink } from "../../src/lib/observability/logger";

const originalSink = sink;
afterEach(() => { setSink(originalSink); vi.unstubAllEnvs(); });

describe("observed route boundary", () => {
  it("echoes a validated trace, preserves response cookies/body and emits status signals", async () => {
    vi.stubEnv("LOG_LEVEL", "info");
    const lines: Record<string, unknown>[] = [];
    setSink(line => lines.push(JSON.parse(line)));
    for (const status of [200, 401, 403, 500]) {
      const handler = observedRoute("/api/test", async () => {
        const response = NextResponse.json({ status }, { status });
        response.cookies.set("session", "test-cookie", { httpOnly: true });
        return response;
      });
      const response = await handler(new NextRequest("http://localhost/api/test?secret=never-log", {
        headers: { "x-request-id": "test-trace-123" },
      }), undefined);
      expect(response.status).toBe(status);
      expect(response.headers.get("x-request-id")).toBe("test-trace-123");
      expect(response.headers.get("set-cookie")).toContain("session=test-cookie");
      expect(await response.json()).toEqual({ status });
    }
    const count = (name: string) => lines.filter(line => line.metric === name).length;
    expect(count("api.request")).toBe(4);
    expect(count("api.latency_ms")).toBe(4);
    expect(count("api.error")).toBe(1);
    expect(count("security.auth_failed")).toBe(1);
    expect(count("security.permission_denied")).toBe(1);
    expect(JSON.stringify(lines)).not.toContain("never-log");
  });

  it("turns a thrown failure into one traced 500 without logging raw error text", async () => {
    vi.stubEnv("LOG_LEVEL", "info");
    const lines: Record<string, unknown>[] = [];
    setSink(line => lines.push(JSON.parse(line)));
    const handler = observedRoute("/api/test", async () => { throw new Error("private-password-value"); });
    const response = await handler(new NextRequest("http://localhost/api/test", {
      headers: { "x-request-id": "invalid spaces" },
    }), undefined);
    expect(response.status).toBe(500);
    const trace = response.headers.get("x-request-id");
    expect(trace).toMatch(/^[a-f0-9-]{36}$/);
    expect((await response.json()).traceId).toBe(trace);
    expect(lines.filter(line => line.metric === "api.error")).toHaveLength(1);
    expect(JSON.stringify(lines)).not.toContain("private-password-value");
  });
});
