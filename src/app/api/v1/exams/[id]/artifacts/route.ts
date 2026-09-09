import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WebPiePDFGenerator } from "@/lib/omr/pdf-generator";
import { usePinnedQuestions } from "@/lib/exams/lifecycle";
import { checkApiPermission } from "@/lib/permissions";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionContext(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!checkApiPermission(session.role, "exams_manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "omr"; // "omr" | "question_paper" | "answer_key"

    const exam = await prisma.exam.findFirst({
      where: {
        id: params.id,
        tenantId: session.tenantId,
      },
      include: {
        tenant: true,
        examQuestions: {
          include: {
            question: true,
          },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    await usePinnedQuestions(exam);
    const branding = {
      instituteName: exam.tenant.name,
      examTitle: exam.title,
      examCode: exam.code,
      durationMinutes: exam.durationMinutes,
      totalMarks: exam.totalMarks,
      totalQuestions: exam.totalQuestions,
    };

    if (type === "omr") {
      const doc = WebPiePDFGenerator.generateOMRSheet(branding);
      const pdfDataUri = doc.output("datauristring");
      return NextResponse.json({
        type: "omr",
        dataUri: pdfDataUri,
        filename: `${exam.code}_OMR_SHEET.pdf`,
      });
    }

    if (type === "question_paper") {
      const formattedQuestions = exam.examQuestions.map((eq) => ({
        orderIndex: eq.orderIndex,
        subject: eq.question.subject,
        sectionName: eq.sectionName,
        body: eq.question.body,
        options: JSON.parse(eq.question.options || "[]"),
        marksCorrect: eq.marksCorrect,
        marksIncorrect: eq.marksIncorrect,
      }));

      const doc = WebPiePDFGenerator.generateQuestionPaper(branding, formattedQuestions);
      const pdfDataUri = doc.output("datauristring");
      return NextResponse.json({
        type: "question_paper",
        dataUri: pdfDataUri,
        filename: `${exam.code}_QUESTION_PAPER.pdf`,
      });
    }

    // Answer Key
    const answerKey = exam.examQuestions.map((eq) => ({
      qNo: eq.orderIndex,
      subject: eq.question.subject,
      concept: eq.question.concept,
      correctAnswer: JSON.parse(eq.question.correctAnswer || `""`),
      solution: eq.question.solution,
    }));

    return NextResponse.json({
      type: "answer_key",
      answerKey,
      filename: `${exam.code}_ANSWER_KEY.json`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
