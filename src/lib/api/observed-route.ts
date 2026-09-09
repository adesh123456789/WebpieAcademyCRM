import { NextRequest, NextResponse } from "next/server";
import { getTraceId, TRACE_HEADER, metric, traceLogger } from "@/lib/observability";

/** Fixed route templates only: never use raw URLs, query strings, bodies or credentials as labels. */
export function observedRoute<C>(route: string, handler: (req: NextRequest, context: C, traceId: string) => Promise<Response>) {
  return async (req: NextRequest, context: C): Promise<Response> => {
    const traceId = getTraceId(req.headers);
    const started = performance.now();
    const fields = { route, method: req.method, traceId };
    metric("apiRequest", 1, fields);
    let response: Response;
    try {
      response = await handler(req, context, traceId);
    } catch {
      // Prisma/provider errors can contain SQL values, credentials or student data.
      traceLogger(traceId).error("api.unhandled_error", { route, method: req.method });
      response = NextResponse.json({ error: "Internal server error", traceId }, { status: 500 });
    }
    const status = response.status;
    if (status >= 500) metric("apiError", 1, { ...fields, status });
    if (status === 401) metric("authFailed", 1, fields);
    if (status === 403) metric("permissionDenied", 1, fields);
    metric("apiLatency", performance.now() - started, { ...fields, status });
    const headers = new Headers(response.headers);
    headers.set(TRACE_HEADER, traceId);
    return new Response(response.body, { status, statusText: response.statusText, headers });
  };
}
