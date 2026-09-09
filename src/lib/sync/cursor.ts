import { createHmac, timingSafeEqual } from "node:crypto";
import type { NodeContext } from "./types";

/**
 * Opaque pull cursor (C06 s4 + amendment A.6). Bound to (tenantId, nodeId or
 * branchId, streamKey) and HMAC-signed so a node cannot forge one or replay
 * another node's. The body carries a durable ordered position + snapshot
 * boundary; a page limit must never advance it past an undelivered record - that
 * invariant lives in buildPullDelta, this module only encodes/decodes/validates.
 */

export interface CursorState {
  tenantId: string;
  /** the scope key: nodeId for tenant-level nodes, branchId for branch nodes */
  scopeKey: string;
  streamKey: string;
  /** ordered change-log position this page consumed up to */
  position: string;
  /** snapshot boundary the page is consistent to */
  snapshotBoundary: string;
}

function secret(): string {
  return process.env.NODE_ENCRYPTION_KEY || process.env.JWT_SECRET || "sync-cursor-dev-only";
}

function sign(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

function b64urlEncode(s: string): string {
  return Buffer.from(s, "utf8").toString("base64url");
}
function b64urlDecode(s: string): string {
  return Buffer.from(s, "base64url").toString("utf8");
}

export function encodeCursor(state: CursorState): string {
  const body = b64urlEncode(JSON.stringify(state));
  return `${body}.${sign(body)}`;
}

/**
 * Returns the CursorState only if the signature is valid AND it is bound to this
 * node context (tenant + the node's own scope key). Any mismatch -> null, so the
 * caller falls back to a full snapshot rather than trusting a foreign cursor.
 */
export function decodeCursor(token: string | null | undefined, ctx: NodeContext): CursorState | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expected = sign(body);
  if (mac.length !== expected.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) {
    return null;
  }
  let state: CursorState;
  try {
    state = JSON.parse(b64urlDecode(body));
  } catch {
    return null;
  }
  const expectedScope = ctx.branchId ?? ctx.nodeId;
  if (state.tenantId !== ctx.tenantId || state.scopeKey !== expectedScope) return null;
  if (typeof state.streamKey !== "string" || typeof state.position !== "string") return null;
  return state;
}

/** The scope key a fresh cursor for this node should carry. */
export function scopeKeyFor(ctx: NodeContext): string {
  return ctx.branchId ?? ctx.nodeId;
}
