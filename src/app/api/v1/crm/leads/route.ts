import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionContext(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!checkApiPermission(session.role, "crm")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const leads = await prisma.cRMLead.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ leads });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionContext(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!checkApiPermission(session.role, "crm")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const { name, phone, email, source, courseInterest, examTarget } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "Name and Phone are required" }, { status: 400 });
    }

    const lead = await prisma.cRMLead.create({
      data: {
        tenantId: session.tenantId,
        branchId: session.branchId || (await prisma.branch.findFirst({ where: { tenantId: session.tenantId } }))!.id,
        name,
        phone,
        email,
        source: source || "WALK_IN",
        stage: "ENQUIRY",
        courseInterest,
        examTarget,
        counsellorId: session.userId,
      },
    });

    return NextResponse.json({ success: true, lead });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionContext(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!checkApiPermission(session.role, "crm")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const { id, stage, nextFollowUpAt, lostReason } = body;

    const updated = await prisma.cRMLead.update({
      where: { id },
      data: {
        ...(stage ? { stage } : {}),
        ...(nextFollowUpAt ? { nextFollowUpAt: new Date(nextFollowUpAt) } : {}),
        ...(lostReason ? { lostReason } : {}),
      },
    });

    return NextResponse.json({ success: true, lead: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
