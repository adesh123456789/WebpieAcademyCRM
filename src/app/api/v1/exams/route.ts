import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/permissions";
import { createExamDraft, draftInput, ExamDraftError } from "@/lib/exams/draft";

export async function GET(req: NextRequest) {
  const session = await getSessionContext(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const exams = await prisma.exam.findMany({
    where: { tenantId: session.tenantId },
    include: {
      examQuestions: { include: { question: { select: { id: true, code: true, subject: true, chapter: true, topic: true, concept: true, type: true, declaredDifficulty: true, body: true, options: true, status: true } } } },
      examResults: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ exams });
}

export async function POST(req: NextRequest) {
  const session = await getSessionContext(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!checkApiPermission(session.role, "exams_manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = draftInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid exam request", issues: parsed.error.flatten() }, { status: 400 });
  try {
    const exam = await createExamDraft(parsed.data, session);
    return NextResponse.json({ success: true, exam });
  } catch (error) {
    if (error instanceof ExamDraftError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Exam draft creation failed", error);
    return NextResponse.json({ error: "Unable to create exam" }, { status: 500 });
  }
}
