import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { checkApiPermission } from "@/lib/permissions";
import { editExam, editInput } from "@/lib/exams/edit";
import { ExamDraftError } from "@/lib/exams/draft";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionContext(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!checkApiPermission(session.role, "exams_manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = editInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid exam edit" }, { status: 400 });
  try {
    return NextResponse.json({ success: true, exam: await editExam(params.id, parsed.data, session) });
  } catch (error) {
    if (error instanceof ExamDraftError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Exam edit failed", error);
    return NextResponse.json({ error: "Unable to edit exam" }, { status: 500 });
  }
}
