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
  return verifyToken(token);
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
