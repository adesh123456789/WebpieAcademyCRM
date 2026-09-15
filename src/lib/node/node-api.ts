import { decodeGrayscale } from "@/lib/omr/image-decoder";
import { STANDARD_75Q_GEOMETRY } from "@/lib/omr/raster";
import { json, type WebHandler } from "./http-adapter";
import { NodeHealthError } from "./health";
import type { NodeStore, NodePairing } from "./local-store";
import type { OfflineSession } from "./offline-session";
import { makeNodeTransport } from "./transport";

/**
 * EDGE-001 - the Academic Node's local HTTP API, over `http-adapter.ts`'s
 * WebHandler bridge. Runs on localhost/LAN on the Windows machine; not the
 * cloud API. A teacher's browser (or a companion scanner tool) on the same
 * network is the intended caller, not the internet.
 *
 * Deliberately not multipart/form-data for /scans: the raw-body + query-params
 * shape needs no parsing dependency and this API has exactly one caller this
 * repo controls end to end (no external client to be compatible with yet).
 */

export interface NodeApiContext {
  /**
   * SqliteNodeStore already seals the pairing token at rest
   * (AES-256-GCM, NODE_ENCRYPTION_KEY) - no separate NodeSecrets store is
   * wired in here. secrets.ts/EncryptedFileSecrets remains a valid seam for
   * a future OS-keychain swap, just not this runtime's source of truth.
   */
  store: NodeStore;
  session: OfflineSession;
  /** e.g. https://app.webpieacademy.com - the cloud this node syncs against. */
  cloudBaseUrl: string;
  /** injectable for tests */
  fetchImpl?: typeof fetch;
}

function healthSnapshot(ctx: NodeApiContext) {
  try {
    return { health: ctx.session.guard() };
  } catch (err) {
    if (err instanceof NodeHealthError) return { health: err.health };
    throw err;
  }
}

async function handleHealth(ctx: NodeApiContext): Promise<Response> {
  const { health } = healthSnapshot(ctx);
  return json({ status: health.status, disk: health.diskFreeBytes, mem: health.memFreeBytes, reasons: health.reasons });
}

async function handlePair(req: Request, ctx: NodeApiContext): Promise<Response> {
  const body = await req.json().catch(() => null);
  if (!body?.tenantCode || !body?.nodeCode || !body?.machineFingerprint) {
    return json({ error: "tenantCode, nodeCode and machineFingerprint are required" }, 400);
  }
  const doFetch = ctx.fetchImpl ?? fetch;
  const res = await doFetch(`${ctx.cloudBaseUrl.replace(/\/$/, "")}/api/v1/sync/handshake`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.pairingToken || !data?.node?.id) {
    return json({ error: data?.error || `handshake failed (${res.status})` }, res.status && res.status >= 400 ? res.status : 502);
  }
  const pairing: NodePairing = {
    nodeId: data.node.id,
    tenantId: data.node.tenantId ?? "",
    branchId: data.node.branchId ?? null,
    token: data.pairingToken,
  };
  ctx.store.setPairing(pairing);
  return json({
    paired: true,
    nodeId: pairing.nodeId,
    tenantId: pairing.tenantId,
    branchId: pairing.branchId,
    tenantCode: data.node.tenantCode,
    branchName: data.node.branchName,
  });
}

async function handleStatus(ctx: NodeApiContext): Promise<Response> {
  const pairing = ctx.store.getPairing();
  const { health } = healthSnapshot(ctx);
  return json({
    paired: !!pairing,
    nodeId: pairing?.nodeId ?? null,
    tenantId: pairing?.tenantId ?? null,
    branchId: pairing?.branchId ?? null,
    pullCursor: ctx.store.getPullCursor(),
    outboxDepth: ctx.store.outbox().length,
    cachedStudents: ctx.store.listStudents().length,
    health: { status: health.status, reasons: health.reasons },
  });
}

async function handleScan(req: Request, ctx: NodeApiContext): Promise<Response> {
  const url = new URL(req.url);
  const jobId = url.searchParams.get("jobId");
  const scanId = url.searchParams.get("scanId");
  const entityVersion = Number(url.searchParams.get("entityVersion") ?? "1");
  const supported = url.searchParams.get("supported") !== "false";
  if (!jobId || !scanId) return json({ error: "jobId and scanId query params are required" }, 400);

  const mimeType = req.headers.get("content-type") || "";
  const bytes = Buffer.from(await req.arrayBuffer());
  if (!bytes.length) return json({ error: "empty request body - send the scanned image as raw bytes" }, 400);

  let image;
  try {
    image = await decodeGrayscale(bytes, mimeType);
  } catch (err: any) {
    return json({ error: `could not decode scan: ${err?.message || err}` }, 400);
  }

  try {
    const result = ctx.session.ingestScan({
      image,
      // A cached exam's own geometry would be the fuller answer once exam
      // profiles vary sheet templates; every artifact this repo prints today
      // uses the one standard template.
      geometry: STANDARD_75Q_GEOMETRY,
      scanId,
      jobId,
      entityVersion,
      supported,
    });
    return json(result);
  } catch (err) {
    if (err instanceof NodeHealthError) return json({ error: err.message, health: err.health }, 503);
    throw err;
  }
}

async function handleLocalScore(jobId: string, examId: string | null, ctx: NodeApiContext): Promise<Response> {
  if (!examId) return json({ error: "?examId= query param is required" }, 400);
  try {
    const results = ctx.session.evaluateExamLocally(examId, jobId);
    return json({ results, advisory: true });
  } catch (err: any) {
    if (err instanceof NodeHealthError) return json({ error: err.message, health: err.health }, 503);
    return json({ error: err?.message || "could not score locally" }, 404);
  }
}

async function handleSync(ctx: NodeApiContext): Promise<Response> {
  const pairing = ctx.store.getPairing();
  if (!pairing) return json({ error: "node is not paired" }, 409);
  const transport = makeNodeTransport({ baseUrl: ctx.cloudBaseUrl, pairingToken: pairing.token, fetchImpl: ctx.fetchImpl });
  try {
    const result = await ctx.session.reconnect({ pull: transport.pull, push: transport.push });
    return json(result);
  } catch (err: any) {
    return json({ error: err?.message || "sync failed" }, 502);
  }
}

export function createNodeApi(ctx: NodeApiContext): WebHandler {
  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const { pathname } = url;

    if (req.method === "GET" && pathname === "/health") return handleHealth(ctx);
    if (req.method === "POST" && pathname === "/pair") return handlePair(req, ctx);
    if (req.method === "GET" && pathname === "/status") return handleStatus(ctx);
    if (req.method === "POST" && pathname === "/scans") return handleScan(req, ctx);
    if (req.method === "POST" && pathname === "/sync") return handleSync(ctx);

    const scoreMatch = req.method === "GET" && pathname.match(/^\/jobs\/([^/]+)\/local-score$/);
    if (scoreMatch) return handleLocalScore(scoreMatch[1], url.searchParams.get("examId"), ctx);

    return json({ error: "not found" }, 404);
  };
}
