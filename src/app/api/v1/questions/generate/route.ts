import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { AIGateway } from "@/lib/ai/ai-gateway";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionContext(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { examType = "JEE_MAIN", subject, chapter, concept, difficulty = "MEDIUM", count = 2 } = body;
    if (!subject || !chapter || !concept) return NextResponse.json({ error: "subject, chapter, and concept are required" }, { status: 400 });
    if (!Number.isInteger(count) || count < 1 || count > 20) return NextResponse.json({ error: "count must be an integer from 1 to 20" }, { status: 400 });

    const result = await AIGateway.generateQuestions({ examType, subject, chapter, concept, difficulty, count }, {
      tenantId: session.tenantId, userId: session.userId, role: session.role, traceId: req.headers.get("x-request-id") || crypto.randomUUID(),
    });

    return NextResponse.json({
      success: true,
      candidates: result.data.candidates,
      outcome: result.outcome,
      ...(result.shortfall === undefined ? {} : { shortfall: result.shortfall }),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
