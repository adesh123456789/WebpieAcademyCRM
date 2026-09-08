import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "webpie-academic-os-secret-2026";

export interface TokenPayload {
  userId: string;
  tenantId: string;
  branchId?: string | null;
  role: string;
  name: string;
  email: string;
  scopes?: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
}

/**
 * Resolves authenticated user, tenant, and branch context from NextRequest
 * PRD RBAC-001: Every authenticated API call resolves tenant context server-side;
 * client-provided tenant IDs cannot elevate access.
 */
export async function getSessionContext(req: NextRequest): Promise<TokenPayload | null> {
  // Check Authorization header or cookie
  const authHeader = req.headers.get("authorization");
  let token: string | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else {
    token = req.cookies.get("webpie_token")?.value || null;
  }

  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = await prisma.user.findFirst({ where: { id: payload.userId, tenantId: payload.tenantId, status: "ACTIVE" }, select: { id: true, tenantId: true, branchId: true, role: true, name: true, email: true, scopes: true } });
  if (!user) return null;
  return { userId: user.id, tenantId: user.tenantId, branchId: user.branchId, role: user.role, name: user.name, email: user.email, scopes: user.scopes };
}

export async function getStudentForSession(session: TokenPayload) {
  return prisma.student.findFirst({ where: { tenantId: session.tenantId, email: session.email } });
}

export async function getParentForSession(session: TokenPayload) {
  return prisma.parent.findFirst({ where: { tenantId: session.tenantId, email: session.email } });
}

export async function canAccessStudent(session: TokenPayload, studentId: string): Promise<boolean> {
  const student = await prisma.student.findFirst({ where: { id: studentId, tenantId: session.tenantId }, select: { id: true, branchId: true, email: true } });
  if (!student) return false;
  if (session.role === "OWNER" || session.role === "WEBPIE_ADMIN") return true;
  if (session.role === "STUDENT") return student.email === session.email;
  if (session.role === "PARENT") {
    const parent = await getParentForSession(session);
    return !!parent && !!(await prisma.studentParentLink.findFirst({ where: { studentId, parentId: parent.id } }));
  }
  if (session.role === "TEACHER") {
    try {
      const batchIds = JSON.parse(session.scopes || "{}").batchIds || [];
      return !!(await prisma.enrollment.findFirst({ where: { studentId, batchId: { in: batchIds } } }));
    } catch { return false; }
  }
  return student.branchId === session.branchId;
}

export function hasRole(userRole: string, allowedRoles: string[]): boolean {
  if (userRole === "OWNER" || userRole === "WEBPIE_ADMIN") return true;
  return allowedRoles.includes(userRole);
}

/**
 * Creates an immutable audit log entry for privileged actions (PRD SEC-005)
 */
export async function createAuditLog({
  tenantId,
  userId,
  action,
  entityType,
  entityId,
  details,
  ipAddress,
}: {
  tenantId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, any>;
  ipAddress?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action,
        entityType,
        entityId,
        details: details ? JSON.stringify(details) : null,
        ipAddress,
      },
    });
  } catch (e) {
    console.error("Failed to write audit log:", e);
  }
}
