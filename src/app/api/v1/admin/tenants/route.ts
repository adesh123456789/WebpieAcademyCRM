import { NextRequest, NextResponse } from "next/server";
import { getSessionContext, hashPassword, createAuditLog } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionContext(req);
    // Allow if role is WEBPIE_ADMIN or OWNER
    if (session && session.role !== "WEBPIE_ADMIN" && session.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
    }

    const tenants = await prisma.tenant.findMany({
      include: {
        branches: true,
        users: {
          select: { id: true, name: true, email: true, role: true },
        },
        students: {
          select: { id: true },
        },
        exams: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedTenants = tenants.map((t) => {
      const owner = t.users.find((u) => u.role === "OWNER");
      return {
        id: t.id,
        name: t.name,
        code: t.code,
        type: t.type,
        status: t.status,
        planId: t.planId,
        customDomain: t.customDomain,
        branchesCount: t.branches.length,
        studentsCount: t.students.length,
        examsCount: t.exams.length,
        ownerName: owner?.name || "Unassigned",
        ownerEmail: owner?.email || "—",
        createdAt: t.createdAt,
      };
    });

    return NextResponse.json({ tenants: formattedTenants });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionContext(req);
    if (session && session.role !== "WEBPIE_ADMIN" && session.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      code,
      type, // "INSTITUTE" | "INDIVIDUAL_TEACHER"
      planId,
      city,
      address,
      ownerName,
      ownerEmail,
      ownerPassword,
      ownerPhone,
      primaryExam,
    } = body;

    if (!name || !code || !ownerEmail) {
      return NextResponse.json(
        { error: "Institute Name, Unique Code, and Owner Email are required" },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existingCode = await prisma.tenant.findUnique({
      where: { code: code.toUpperCase().trim() },
    });

    if (existingCode) {
      return NextResponse.json(
        { error: `Institute code '${code}' is already registered.` },
        { status: 409 }
      );
    }

    const cleanCode = code.toUpperCase().trim();
    const cleanType = type === "INDIVIDUAL_TEACHER" ? "INDIVIDUAL_TEACHER" : "INSTITUTE";
    const passwordHash = await hashPassword(ownerPassword || "admin123");

    // 1. Create Tenant
    const tenant = await prisma.tenant.create({
      data: {
        name,
        code: cleanCode,
        type: cleanType,
        status: "ACTIVE",
        planId: planId || (cleanType === "INSTITUTE" ? "PRO_INSTITUTE" : "TEACHER_PRO"),
        customDomain: `${cleanCode.toLowerCase()}.webpie.in`,
        domainVerified: true,
        locale: "en",
        timezone: "Asia/Kolkata",
      },
    });

    // 2. Create Initial Branch
    const branch = await prisma.branch.create({
      data: {
        tenantId: tenant.id,
        code: "MAIN",
        name: cleanType === "INSTITUTE" ? `${name} - Main Campus` : `${name} Classroom`,
        city: city || "Pune",
        address: address || "Main Center",
        contact: ownerPhone || "+91 9800000000",
      },
    });

    // 3. Create Institute Owner User
    const owner = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        name: ownerName || `${name} Admin`,
        email: ownerEmail.toLowerCase().trim(),
        phone: ownerPhone || "9800000000",
        passwordHash,
        role: "OWNER",
        status: "ACTIVE",
      },
    });

    // 4. Create Initial Course & Batch
    const course = await prisma.course.create({
      data: {
        tenantId: tenant.id,
        name: `1-Year Target ${primaryExam || "JEE Main"} 2026`,
        code: `${primaryExam || "JEE"}-2026`,
        examType: primaryExam || "JEE_MAIN",
        gradeClass: "11",
        academicYear: "2025-2026",
      },
    });

    await prisma.batch.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        courseId: course.id,
        name: "Morning Batch A",
        code: "BATCH-A",
      },
    });

    // 5. Default Website Sections
    await prisma.websiteSection.create({
      data: {
        tenantId: tenant.id,
        sectionKey: "HERO",
        title: `Welcome to ${name}`,
        subtitle: `Premier Coaching for ${primaryExam || "JEE & NEET"} with Concept-Level Diagnostic Assessment.`,
        content: JSON.stringify({
          ctaPrimary: "Enroll Now",
          stats: [{ label: "Top Rankers", value: "50+" }],
        }),
        orderIndex: 1,
      },
    });

    await createAuditLog({
      tenantId: tenant.id,
      userId: session?.userId,
      action: "INSTITUTE_PROVISIONED",
      entityType: "Tenant",
      entityId: tenant.id,
      details: { name, code: cleanCode, type: cleanType, ownerEmail },
    });

    return NextResponse.json({
      success: true,
      message: `Institute '${name}' successfully provisioned!`,
      tenant,
      branch,
      owner: {
        id: owner.id,
        name: owner.name,
        email: owner.email,
        role: owner.role,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
