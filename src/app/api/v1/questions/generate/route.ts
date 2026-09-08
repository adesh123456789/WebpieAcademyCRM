import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { AIGateway } from "@/lib/ai/ai-gateway";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionContext(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { examType, subject, chapter, concept, difficulty, count } = body;

    const candidates = await AIGateway.generateQuestionCandidates({
      tenantId: session.tenantId,
      examType: examType || "JEE_MAIN",
      subject: subject || "PHYSICS",
      chapter: chapter || "Laws of Motion",
      concept: concept || "Limiting Friction & Angle of Repose",
      difficulty: difficulty || "MEDIUM",
      count: count || 2,
    });

    return NextResponse.json({
      success: true,
      candidates,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
