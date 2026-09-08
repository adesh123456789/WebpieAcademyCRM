import { request } from "../../support/request";
import { TEST_PASSWORD } from "../../support/fixtures";
import { POST as loginHandler } from "../../../src/app/api/v1/auth/login/route";
import type { User } from "@prisma/client";

export { createTestWorld, type TestWorld } from "../../support/fixtures";

/**
 * CLD-004 - end-to-end harness. Drives the real Next route handlers in sequence,
 * threading a session token and IDs like a browser would, against one synthetic
 * tenant. Distinct from tests/routes-foundation.test.ts (single-handler smoke):
 * these suites walk the whole PRD golden loop and mark unbuilt steps `it.todo`
 * with the blocking task id, so the file doubles as the REL-001 launch-gate map.
 */

// Route handlers are (NextRequest, ctx?) => Promise<NextResponse>; both extend the
// web Request/Response, so a loose signature keeps the harness handler-agnostic.
export type RouteHandler = (req: any, ctx?: any) => Promise<Response>;

export interface CallResult<T = any> {
  status: number;
  body: T;
  headers: Headers;
  raw: Response;
}

export interface CallOptions {
  method?: string;
  body?: unknown;
  /** Sign a token for this user. */
  user?: User;
  /** Use an explicit token (overrides `user`). */
  token?: string;
  /** Route params for dynamic segments, e.g. { id }. */
  params?: Record<string, string>;
}

export async function call<T = any>(
  handler: RouteHandler,
  path: string,
  opts: CallOptions = {},
): Promise<CallResult<T>> {
  const req = request(path, {
    method: opts.method,
    body: opts.body,
    user: opts.user,
    token: opts.token,
  });
  // Next 14 passes a plain { params }; awaiting a plain object is a no-op, so this
  // shape also satisfies handlers written for the Next 15 Promise form.
  const res = await handler(req, opts.params ? { params: opts.params } : undefined);
  let body: T = null as T;
  try {
    body = (await res.clone().json()) as T;
  } catch {
    /* non-JSON or empty body */
  }
  return { status: res.status, body, headers: res.headers, raw: res };
}

/** Log in through the real handler and return the session cookie token. */
export async function loginAs(email: string, tenantCode: string): Promise<string> {
  const res = await loginHandler(
    request("/api/v1/auth/login", { body: { email, password: TEST_PASSWORD, tenantCode } }),
  );
  const token = res.cookies.get("webpie_token")?.value;
  if (!token) throw new Error(`loginAs(${email}) returned no session cookie (status ${res.status})`);
  return token;
}
