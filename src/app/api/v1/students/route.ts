import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionContext(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!checkApiPermission(session.role, "students_manage")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const requestedBranchId = searchParams.get("branchId");
    const branchId = session.role === "OWNER" || session.role === "WEBPIE_ADMIN" ? (requestedBranchId || undefined) : session.branchId || undefined;
    const search = searchParams.get("search") || "";
    const targetExam = searchParams.get("targetExam") || undefined;
    let teacherBatchIds: string[] | null = null;
    if (session.role === "TEACHER") {
      try {
        const parsed = JSON.parse(session.scopes || "{}");
        teacherBatchIds = Array.isArray(parsed.batchIds) ? parsed.batchIds.filter((id: unknown) => typeof id === "string") : [];
      } catch {
        teacherBatchIds = [];
      }
    }

    const students = await prisma.student.findMany({
      where: {
        tenantId: session.tenantId,
        ...(branchId ? { branchId } : {}),
        ...(teacherBatchIds ? { enrollments: { some: { batchId: { in: teacherBatchIds }, status: "ACTIVE" } } } : {}),
        ...(targetExam ? { targetExam } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { rollNumber: { contains: search } },
                { phone: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        branch: true,
        enrollments: {
          include: {
            course: true,
            batch: true,
          },
        },
        parentLinks: {
          include: {
            parent: true,
          },
        },
      },
      orderBy: { rollNumber: "asc" },
    });

    return NextResponse.json({ students });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionContext(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!checkApiPermission(session.role, "students_manage")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const { name, rollNumber, phone, email, branchId, targetExam, targetYear, courseId, batchId } = body;

    if (!name || !rollNumber) {
      return NextResponse.json({ error: "Name and Roll Number are required" }, { status: 400 });
    }

    const assignedBranchId = branchId || session.branchId;
    if (!assignedBranchId) {
      return NextResponse.json({ error: "Branch ID required" }, { status: 400 });
    }

    const branch = await prisma.branch.findFirst({ where: { id: assignedBranchId, tenantId: session.tenantId } });
    if (!branch || (session.role !== "OWNER" && session.role !== "WEBPIE_ADMIN" && branch.id !== session.branchId)) {
      return NextResponse.json({ error: "Branch outside authorized scope" }, { status: 403 });
    }

    // Check duplicate
    const existing = await prisma.student.findFirst({
      where: {
        tenantId: session.tenantId,
        rollNumber,
      },
    });

    if (existing) {
      return NextResponse.json({ error: `Roll number ${rollNumber} already exists in this institute.` }, { status: 409 });
    }

    const student = await prisma.student.create({
      data: {
        tenantId: session.tenantId,
        branchId: assignedBranchId,
        name,
        rollNumber,
        phone,
        email,
        targetExam: targetExam || "JEE_MAIN",
        targetYear: targetYear || 2026,
      },
    });

    // If batch assigned, create enrollment
    if (batchId && courseId) {
      await prisma.enrollment.create({
        data: {
          studentId: student.id,
          batchId,
          courseId,
          status: "ACTIVE",
        },
      });
    }

    return NextResponse.json({ success: true, student });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
