import { NextRequest, NextResponse } from "next/server";
import { SEED_CURRICULUM_NODES, getSubjectsForExam } from "@/lib/academic/knowledge-graph";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const examType = searchParams.get("examType") || "JEE_MAIN";
    const subject = searchParams.get("subject") || undefined;

    let nodes = SEED_CURRICULUM_NODES;
    if (examType !== "ALL") {
      nodes = nodes.filter((n) => n.examType === examType || n.examType === "JEE_MAIN");
    }
    if (subject) {
      nodes = nodes.filter((n) => n.subject === subject);
    }

    const availableSubjects = getSubjectsForExam(examType);

    return NextResponse.json({
      nodes,
      subjects: availableSubjects,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
