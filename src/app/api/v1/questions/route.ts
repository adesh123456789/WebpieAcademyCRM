import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionContext(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const subject = searchParams.get("subject") || undefined;
    const difficulty = searchParams.get("difficulty") || undefined;
    const type = searchParams.get("type") || undefined;
    const search = searchParams.get("search") || "";

    const questions = await prisma.question.findMany({
      where: {
        OR: [
          { ownerScope: "PLATFORM" },
          { tenantId: session.tenantId },
        ],
        ...(subject ? { subject } : {}),
        ...(difficulty ? { declaredDifficulty: difficulty } : {}),
        ...(type ? { type } : {}),
        ...(search
          ? {
              OR: [
                { body: { contains: search } },
                { concept: { contains: search } },
                { chapter: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    const parsedQuestions = questions.map((q) => ({
      ...q,
      options: JSON.parse(q.options || "[]"),
      correctAnswer: JSON.parse(q.correctAnswer || `""`),
    }));

    return NextResponse.json({ questions: parsedQuestions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionContext(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { subject, chapter, topic, concept, type, declaredDifficulty, questionBody, options, correctAnswer, solution } = body;

    if (!questionBody || !correctAnswer || !subject) {
      return NextResponse.json({ error: "Subject, Question Body, and Correct Answer are required" }, { status: 400 });
    }

    const count = await prisma.question.count();
    const code = `Q-${subject.substring(0, 3)}-${String(count + 1).padStart(4, "0")}`;

    const question = await prisma.question.create({
      data: {
        tenantId: session.tenantId,
        ownerScope: "TENANT_PRIVATE",
        code,
        subject,
        chapter: chapter || "General",
        topic: topic || "General",
        concept: concept || "General",
        type: type || "SINGLE_CORRECT",
        declaredDifficulty: declaredDifficulty || "MEDIUM",
        body: questionBody,
        options: JSON.stringify(options || []),
        correctAnswer: JSON.stringify(correctAnswer),
        solution: solution || "",
        source: "TEACHER",
        status: "VERIFIED",
      },
    });

    return NextResponse.json({ success: true, question });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
