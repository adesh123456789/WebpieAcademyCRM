import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WebPiePDFGenerator } from "@/lib/omr/pdf-generator";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionContext(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const intervention = await prisma.intervention.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
      include: { tenant: true },
    });

    if (!intervention) return NextResponse.json({ error: "Intervention not found" }, { status: 404 });

    const ladder = JSON.parse(intervention.practiceLadder || "[]");

    // Format questions for worksheet
    const worksheetQuestions = ladder.map((item: any, idx: number) => ({
      orderIndex: idx + 1,
      tier: item.tier || (idx < 2 ? "Foundation" : idx < 4 ? "Application" : "Exam-Level"),
      body: item.body || item.q || `Practice question on ${intervention.concept}`,
      options: item.options || [
        { id: "A", text: "Option A" },
        { id: "B", text: "Option B" },
        { id: "C", text: "Option C" },
        { id: "D", text: "Option D" },
      ],
    }));

    const doc = WebPiePDFGenerator.generateRemedialWorksheet(
      {
        instituteName: intervention.tenant.name,
        concept: intervention.concept,
      },
      worksheetQuestions
    );

    const pdfDataUri = doc.output("datauristring");

    return NextResponse.json({
      success: true,
      dataUri: pdfDataUri,
      filename: `Remedial_Worksheet_${intervention.concept.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
