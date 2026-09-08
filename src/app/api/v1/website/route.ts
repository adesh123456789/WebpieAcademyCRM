import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantCode = searchParams.get("tenantCode");

    let tenantId: string | null = null;
    if (tenantCode) {
      const tenant = await prisma.tenant.findUnique({ where: { code: tenantCode } });
      tenantId = tenant?.id || null;
    } else {
      const session = await getSessionContext(req);
      tenantId = session?.tenantId || null;
    }

    if (!tenantId) {
      // Return default tenant
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id || "";
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        websiteSections: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const formattedSections: Record<string, any> = {};
    for (const sec of tenant.websiteSections) {
      formattedSections[sec.sectionKey] = {
        id: sec.id,
        title: sec.title,
        subtitle: sec.subtitle,
        content: JSON.parse(sec.content || "{}"),
        isVisible: sec.isVisible,
        orderIndex: sec.orderIndex,
      };
    }

    return NextResponse.json({
      tenant: {
        name: tenant.name,
        code: tenant.code,
        primaryColor: tenant.primaryColor,
        customDomain: tenant.customDomain,
      },
      sections: formattedSections,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSessionContext(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { sectionKey, title, subtitle, content, isVisible } = body;

    const updated = await prisma.websiteSection.upsert({
      where: {
        tenantId_sectionKey: {
          tenantId: session.tenantId,
          sectionKey,
        },
      },
      create: {
        tenantId: session.tenantId,
        sectionKey,
        title,
        subtitle,
        content: JSON.stringify(content || {}),
        isVisible: isVisible ?? true,
      },
      update: {
        title,
        subtitle,
        content: JSON.stringify(content || {}),
        isVisible: isVisible ?? true,
      },
    });

    return NextResponse.json({ success: true, section: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
