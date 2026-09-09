import { createHmac, timingSafeEqual } from "node:crypto";
import { SyncError } from "./types";

/**
 * Request signing (C06 s6, "Should" for v1). `X-Node-Signature` =
 * hex(HMAC-SHA256(rawBody, pairingToken)), `X-Node-Timestamp` = unix seconds;
 * reject a skew over 5 minutes. Enabled per-tenant via a flag; when disabled the
 * route falls back to bearer-token auth only. `verifyNode` expiry/revocation is
 * Codex's (route layer) - here we only check the signature.
 */

const MAX_SKEW_SECONDS = 300;

type HeaderLike = { get(name: string): string | null };

export function nodeSignature(rawBody: string, timestamp: string, pairingToken: string): string {
  return createHmac("sha256", pairingToken).update(`${timestamp}.${rawBody}`).digest("hex");
}

export function verifyNodeSignature(
  rawBody: string,
  headers: HeaderLike,
  node: { pairingToken: string },
  now: number = Date.now(),
): true {
  const sig = headers.get("x-node-signature");
  const ts = headers.get("x-node-timestamp");
  if (!sig || !ts) throw new SyncError("NODE_SIGNATURE", "missing node signature headers", 401);

  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum) || Math.abs(now / 1000 - tsNum) > MAX_SKEW_SECONDS) {
    throw new SyncError("NODE_SIGNATURE", "node timestamp outside allowed skew", 401);
  }

  const expected = nodeSignature(rawBody, ts, node.pairingToken);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new SyncError("NODE_SIGNATURE", "node signature mismatch", 401);
  }
  return true;
}
