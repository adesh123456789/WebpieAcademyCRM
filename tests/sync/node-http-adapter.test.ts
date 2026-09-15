import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { toNodeHandler, json } from "../../src/lib/node/http-adapter";

/**
 * EDGE-001 - toNodeHandler over a REAL http.Server on a real loopback socket,
 * not just calling the WebHandler function directly (that's what
 * tests/e2e/node-api.e2e.test.ts does for the routes themselves) - this is
 * the one place proving the Request/Response <-> IncomingMessage/
 * ServerResponse bridge itself works over actual bytes on the wire.
 */

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const handler = toNodeHandler(async (req) => {
    const url = new URL(req.url);
    if (url.pathname === "/echo-json") return json({ method: req.method, query: Object.fromEntries(url.searchParams) });
    if (url.pathname === "/echo-body" && req.method === "POST") {
      const bytes = new Uint8Array(await req.arrayBuffer());
      return new Response(bytes, { status: 201, headers: { "content-type": req.headers.get("content-type") || "application/octet-stream", "x-echo": "yes" } });
    }
    if (url.pathname === "/boom") throw new Error("deliberate failure");
    return json({ error: "not found" }, 404);
  });
  server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("toNodeHandler over a real http.Server", () => {
  it("round-trips a GET with query params and JSON headers", async () => {
    const res = await fetch(`${baseUrl}/echo-json?a=1&b=two`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ method: "GET", query: { a: "1", b: "two" } });
  });

  it("round-trips a POST body byte-for-byte, including a custom status and header", async () => {
    const payload = new Uint8Array([0, 1, 2, 250, 251, 252, 255]); // arbitrary binary, not valid UTF-8
    const res = await fetch(`${baseUrl}/echo-body`, { method: "POST", body: payload, headers: { "content-type": "application/octet-stream" } });
    expect(res.status).toBe(201);
    expect(res.headers.get("x-echo")).toBe("yes");
    const back = new Uint8Array(await res.arrayBuffer());
    expect(Array.from(back)).toEqual(Array.from(payload));
  });

  it("an unmatched route 404s cleanly", async () => {
    const res = await fetch(`${baseUrl}/nope`);
    expect(res.status).toBe(404);
  });

  it("a thrown handler error becomes a 500 JSON body, not a hung/crashed connection", async () => {
    const res = await fetch(`${baseUrl}/boom`);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("deliberate failure");
  });
});
