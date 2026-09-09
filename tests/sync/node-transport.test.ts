import { describe, expect, it, vi } from "vitest";
import { verifyNodeSignature, verifyNodeRequest } from "../../src/lib/sync";
import { signedHeaders, makeNodeTransport } from "../../src/lib/node/transport";
import type { SyncEventEnvelope } from "../../src/lib/sync";

const TOKEN = "node_transport_secret";

describe("signed node headers", () => {
  it("produce a signature verifyNodeSignature accepts", () => {
    const body = JSON.stringify({ events: [] });
    const h = signedHeaders(body, TOKEN);
    expect(verifyNodeSignature(body, new Headers(h), { pairingToken: TOKEN })).toBe(true);
  });

  it("reject a tampered body or a wrong token", () => {
    const body = JSON.stringify({ events: ["a"] });
    const h = new Headers(signedHeaders(body, TOKEN));
    expect(() => verifyNodeSignature(JSON.stringify({ events: ["b"] }), h, { pairingToken: TOKEN })).toThrow();
    expect(() => verifyNodeSignature(body, h, { pairingToken: "wrong" })).toThrow();
  });

  it("reject a stale timestamp", () => {
    const body = "";
    const h = new Headers(signedHeaders(body, TOKEN, Date.now() - 10 * 60 * 1000));
    expect(() => verifyNodeSignature(body, h, { pairingToken: TOKEN })).toThrow();
  });
});

describe("verifyNodeRequest adoption seam", () => {
  const node = { pairingToken: TOKEN };
  it("is bearer-only when no signature headers and not required", () => {
    expect(verifyNodeRequest("{}", new Headers(), node)).toEqual({ signed: false });
  });
  it("enforces the signature when headers are present", () => {
    const h = new Headers(signedHeaders("{}", TOKEN));
    expect(verifyNodeRequest("{}", h, node)).toEqual({ signed: true });
    const bad = new Headers({ "x-node-signature": "deadbeef", "x-node-timestamp": String(Math.floor(Date.now() / 1000)) });
    expect(() => verifyNodeRequest("{}", bad, node)).toThrow();
  });
  it("requires a signature when requireSignature is set", () => {
    expect(() => verifyNodeRequest("{}", new Headers(), node, { requireSignature: true })).toThrow();
  });
});

describe("makeNodeTransport", () => {
  const events: SyncEventEnvelope[] = [
    { eventId: "ev_1", entityType: "ATTENDANCE_RECORD", entityId: "a1", entityVersion: 1, op: "UPSERT", occurredAt: "2026-09-09T10:00:00.000Z", payload: {} },
  ];

  it("push signs the request and returns the results", async () => {
    const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toMatch(/\/api\/v1\/sync\/push$/);
      const h = new Headers(init.headers);
      expect(h.get("authorization")).toBe(`Bearer ${TOKEN}`);
      expect(h.get("x-node-signature")).toBeTruthy();
      expect(verifyNodeSignature(init.body as string, h, { pairingToken: TOKEN })).toBe(true);
      expect(JSON.parse(init.body as string).events).toHaveLength(1);
      return new Response(JSON.stringify({ results: [{ eventId: "ev_1", status: "APPLIED" }] }), { status: 200 });
    });
    const t = makeNodeTransport({ baseUrl: "http://node.local", pairingToken: TOKEN, fetchImpl: fetchImpl as unknown as typeof fetch });
    const res = await t.push(events);
    expect(res.results[0]).toEqual({ eventId: "ev_1", status: "APPLIED" });
  });

  it("pull signs an empty body and returns the delta", async () => {
    const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toContain("/api/v1/sync/pull?cursor=abc");
      const h = new Headers(init.headers);
      expect(verifyNodeSignature("", h, { pairingToken: TOKEN })).toBe(true);
      return new Response(JSON.stringify({ changes: { students: [] }, tombstones: [], nextCursor: "next", hasMore: false, snapshotBoundary: "sb" }), { status: 200 });
    });
    const t = makeNodeTransport({ baseUrl: "http://node.local/", pairingToken: TOKEN, fetchImpl: fetchImpl as unknown as typeof fetch });
    const delta = await t.pull("abc");
    expect(delta.nextCursor).toBe("next");
  });

  it("throws on a non-2xx response", async () => {
    const fetchImpl = vi.fn(async () => new Response("no", { status: 403 }));
    const t = makeNodeTransport({ baseUrl: "http://x", pairingToken: TOKEN, fetchImpl: fetchImpl as unknown as typeof fetch });
    await expect(t.push(events)).rejects.toThrow(/403/);
  });
});
