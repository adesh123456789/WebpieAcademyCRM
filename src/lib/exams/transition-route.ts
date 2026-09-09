import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionContext } from "@/lib/auth";
import { checkApiPermission } from "@/lib/permissions";
import { ExamDraftError } from "./draft";
import { transitionExam } from "./lifecycle";

export function transitionRoute(action: "review" | "finalize") {
  return async (req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await getSessionContext(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!checkApiPermission(session.role, "exams_manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const schema = z.object({ expectedVersion: z.number().int().positive(), idempotencyKey: action === "finalize" ? z.string().min(1).max(128) : z.string().optional() });
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid transition request" }, { status: 400 });
    try {
      return NextResponse.json(await transitionExam(params.id, session, action, parsed.data.expectedVersion, parsed.data.idempotencyKey));
    } catch (error) {
      if (error instanceof ExamDraftError) return NextResponse.json({ error: error.message }, { status: error.status });
      console.error("Exam transition failed", error);
      return NextResponse.json({ error: "Unable to transition exam" }, { status: 500 });
    }
  };
}
