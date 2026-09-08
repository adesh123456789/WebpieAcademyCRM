import { NextRequest, NextResponse } from "next/server";
import { getSessionContext, createAuditLog } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionContext(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!checkApiPermission(session.role, "fees")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const payments = await prisma.feePayment.findMany({
      where: { tenantId: session.tenantId },
      include: {
        student: true,
      },
      orderBy: { paidAt: "desc" },
    });

    const feePlans = await prisma.feePlan.findMany({
      where: { tenantId: session.tenantId },
      include: {
        student: true,
        installments: true,
        payments: true,
      },
    });

    const totalCollected = payments.reduce((acc, p) => acc + p.amount, 0);
    const totalObligations = feePlans.reduce((acc, f) => acc + f.netAmount, 0);
    const totalOutstanding = totalObligations - totalCollected;

    return NextResponse.json({
      metrics: {
        totalObligations,
        totalCollected,
        totalOutstanding,
      },
      payments,
      feePlans,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionContext(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!checkApiPermission(session.role, "fees")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const { studentId, feePlanId, amount, paymentMode, transactionRef, remarks } = body;

    if (!studentId || !amount) {
      return NextResponse.json({ error: "Student and amount are required" }, { status: 400 });
    }

    const student = await prisma.student.findFirst({ where: { id: studentId, tenantId: session.tenantId } });
    if (!student) return NextResponse.json({ error: "Student outside authorized tenant" }, { status: 403 });
    if (feePlanId) {
      const plan = await prisma.feePlan.findFirst({ where: { id: feePlanId, tenantId: session.tenantId, studentId } });
      if (!plan) return NextResponse.json({ error: "Fee plan does not belong to student" }, { status: 403 });
    }

    const count = await prisma.feePayment.count({ where: { tenantId: session.tenantId } });
    const receiptNumber = `REC-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

    const payment = await prisma.feePayment.create({
      data: {
        tenantId: session.tenantId,
        studentId,
        feePlanId: feePlanId || (await prisma.feePlan.findFirst({ where: { studentId, tenantId: session.tenantId } }))?.id || "",
        receiptNumber,
        amount: parseFloat(amount),
        paymentMode: paymentMode || "UPI",
        transactionRef: transactionRef || `TXN-${Date.now()}`,
        status: "SUCCESS",
        remarks,
        collectedById: session.userId,
      },
      include: { student: true },
    });

    await createAuditLog({
      tenantId: session.tenantId,
      userId: session.userId,
      action: "PAYMENT_RECORDED",
      entityType: "FeePayment",
      entityId: payment.id,
      details: { amount, receiptNumber, studentId },
    });

    return NextResponse.json({ success: true, payment });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
