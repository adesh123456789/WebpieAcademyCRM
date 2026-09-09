import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { getTraceId } from "@/lib/observability";
import { observedRoute } from "@/lib/api/observed-route";
import { AIGateway } from "@/lib/ai/ai-gateway";
import { AIScopeError } from "@/lib/ai/schemas";

export const POST = observedRoute("/api/v1/ai/copilot", async (req: NextRequest, _ctx, traceId) => {
  const session = await getSessionContext(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const result = await AIGateway.copilotWeaknessPlan(body, {
      tenantId: session.tenantId,
      userId: session.userId,
      role: session.role,
      traceId: getTraceId(req.headers) || traceId,
      scopes: session.scopes ?? null,
      branchId: session.branchId,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AIScopeError) return NextResponse.json({ error: { code: "AI_SCOPE_DENIED" } }, { status: 403 });
    return NextResponse.json({ error: "Copilot request failed", traceId }, { status: 500 });
  }
});
