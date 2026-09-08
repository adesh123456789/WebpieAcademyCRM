import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password, tenantCode } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find user across tenants or by specific tenant
    let whereClause: any = { email: email.toLowerCase() };
    if (tenantCode) {
      const tenant = await prisma.tenant.findUnique({ where: { code: tenantCode } });
      if (tenant) {
        whereClause.tenantId = tenant.id;
      }
    }

    const user = await prisma.user.findFirst({
      where: whereClause,
      include: {
        tenant: true,
        branch: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = signToken({
      userId: user.id,
      tenantId: user.tenantId,
      branchId: user.branchId,
      role: user.role,
      name: user.name,
      email: user.email,
      scopes: user.scopes,
    });

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenant.name,
        tenantType: user.tenant.type,
        tenantCode: user.tenant.code,
        branchId: user.branchId,
        branchName: user.branch?.name || "Main",
      },
    });

    // Set HTTP cookie
    response.cookies.set("webpie_token", token, {
      httpOnly: false, // Accessible to client-side scripts if needed
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
