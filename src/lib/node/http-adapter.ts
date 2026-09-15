import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * EDGE-001 - bridges Node's raw `http.Server` request/response to the same
 * `(Request) => Promise<Response>` shape the cloud's Next.js route handlers
 * already use (and `tests/e2e/support/harness.ts`'s `call()` already drives),
 * so the Academic Node's own local API is written, and tested, exactly like
 * the rest of this codebase - no framework, no new dependency.
 */

export type WebHandler = (req: Request) => Promise<Response>;

/** Wrap a WebHandler for `http.createServer(toNodeHandler(handler))`. */
export function toNodeHandler(handler: WebHandler) {
  return async (nodeReq: IncomingMessage, nodeRes: ServerResponse) => {
    try {
      const req = await nodeRequestFromIncoming(nodeReq);
      const res = await handler(req);
      await writeNodeResponse(res, nodeRes);
    } catch (err: any) {
      if (!nodeRes.headersSent) {
        nodeRes.statusCode = 500;
        nodeRes.setHeader("content-type", "application/json");
      }
      nodeRes.end(JSON.stringify({ error: err?.message || "internal error" }));
    }
  };
}

async function nodeRequestFromIncoming(nodeReq: IncomingMessage): Promise<Request> {
  const host = nodeReq.headers.host || "localhost";
  const url = new URL(nodeReq.url || "/", `http://${host}`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(nodeReq.headers)) {
    if (typeof value === "string") headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(", "));
  }

  const method = (nodeReq.method || "GET").toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  let body: Buffer | undefined;
  if (hasBody) {
    const chunks: Buffer[] = [];
    for await (const chunk of nodeReq) chunks.push(chunk as Buffer);
    body = Buffer.concat(chunks);
  }

  return new Request(url, { method, headers, body: hasBody && body ? new Uint8Array(body) : undefined });
}

async function writeNodeResponse(res: Response, nodeRes: ServerResponse): Promise<void> {
  nodeRes.statusCode = res.status;
  res.headers.forEach((value, key) => nodeRes.setHeader(key, value));
  const buf = Buffer.from(await res.arrayBuffer());
  nodeRes.end(buf);
}

/** Small helper matching the cloud routes' NextResponse.json(...) ergonomics. */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
