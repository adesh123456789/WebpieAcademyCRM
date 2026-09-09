import { nodeSignature } from "@/lib/sync/node-auth";
import type { PullDelta, SyncEventEnvelope } from "@/lib/sync";
import type { PushFn } from "./offline-pipeline";

/**
 * EDGE-001 - the node's authenticated transport to the cloud. Every request
 * carries `Authorization: Bearer <pairingToken>` plus a `X-Node-Signature`
 * (HMAC-SHA256 over `timestamp.body`) and `X-Node-Timestamp` (C06 s6), so the
 * cloud can reject a stolen bearer token replayed from elsewhere.
 */

export function signedHeaders(rawBody: string, pairingToken: string, now: number = Date.now()): Record<string, string> {
  const ts = String(Math.floor(now / 1000));
  return {
    authorization: `Bearer ${pairingToken}`,
    "content-type": "application/json",
    "x-node-timestamp": ts,
    "x-node-signature": nodeSignature(rawBody, ts, pairingToken),
  };
}

export interface NodeTransportOptions {
  baseUrl: string;
  pairingToken: string;
  /** injectable for tests; defaults to global fetch */
  fetchImpl?: typeof fetch;
  now?: () => number;
}

export interface NodeTransport {
  push: PushFn;
  pull: (cursor: string | null) => Promise<PullDelta>;
}

export function makeNodeTransport(opts: NodeTransportOptions): NodeTransport {
  const doFetch = opts.fetchImpl ?? fetch;
  const now = opts.now ?? Date.now;
  const base = opts.baseUrl.replace(/\/$/, "");

  return {
    async push(events: SyncEventEnvelope[]) {
      const body = JSON.stringify({ events });
      const res = await doFetch(`${base}/api/v1/sync/push`, {
        method: "POST",
        headers: signedHeaders(body, opts.pairingToken, now()),
        body,
      });
      if (!res.ok) throw new Error(`sync/push ${res.status}`);
      const json = (await res.json()) as { results: { eventId: string; status: string }[] };
      return { results: json.results };
    },

    async pull(cursor: string | null) {
      const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}&limit=500` : "?limit=500";
      const res = await doFetch(`${base}/api/v1/sync/pull${qs}`, {
        method: "GET",
        headers: signedHeaders("", opts.pairingToken, now()),
      });
      if (!res.ok) throw new Error(`sync/pull ${res.status}`);
      return (await res.json()) as PullDelta;
    },
  };
}
