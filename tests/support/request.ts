import { NextRequest } from "next/server";
import { signToken, type TokenPayload } from "../../src/lib/auth";
import type { User } from "@prisma/client";

export function sessionFor(user: User): TokenPayload {
  return {
    userId: user.id, tenantId: user.tenantId, branchId: user.branchId,
    role: user.role, name: user.name, email: user.email,
  };
}

/** Real NextRequest; no auth, Prisma or handler mocks. */
export function request(path: string, options: {
  method?: string;
  body?: unknown;
  user?: User;
  token?: string;
  viaCookie?: boolean;
} = {}) {
  const headers = new Headers();
  const token = options.token ?? (options.user ? signToken(sessionFor(options.user)) : undefined);
  if (token) headers.set(options.viaCookie ? "cookie" : "authorization",
    options.viaCookie ? `webpie_token=${token}` : `Bearer ${token}`);
  if (options.body !== undefined) headers.set("content-type", "application/json");
  return new NextRequest(new URL(path, "http://webpie.test"), {
    method: options.method ?? (options.body === undefined ? "GET" : "POST"),
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}
