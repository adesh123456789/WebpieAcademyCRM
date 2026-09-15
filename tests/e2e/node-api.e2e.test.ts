import { beforeAll, describe, expect, it } from "vitest";
import sharp from "sharp";
import { NextRequest } from "next/server";
import { prisma } from "../../src/lib/prisma";
import { createTestWorld, type TestWorld } from "../support/fixtures";
import { POST as handshake } from "../../src/app/api/v1/sync/handshake/route";
import { POST as push } from "../../src/app/api/v1/sync/push/route";
import { GET as pull } from "../../src/app/api/v1/sync/pull/route";
import { createNodeApi } from "../../src/lib/node/node-api";
import { SqliteNodeStore } from "../../src/lib/node/sqlite-store";
import { OfflineSession, toCachedExam } from "../../src/lib/node/offline-session";
import { renderSheet } from "../omr-corpus/raster-fixtures";
import { STANDARD_75Q_GEOMETRY, type GrayscaleImage } from "../../src/lib/omr/raster";

/**
 * EDGE-001 - the Academic Node's own local HTTP API (createNodeApi), driven
 * exactly like a real caller would over HTTP (constructing real Request
 * objects, reading real Response objects) - not calling internal functions
 * directly. The cloud side of every call goes through the REAL route
 * handlers (fakeCloudFetch dispatches to them, not mocks), so this proves
 * pair -> sync -> scan -> local score -> sync-drains-the-scan end to end.
 */

const KEY = "node-api-e2e-encryption-key-32bytes";

function fakeCloudFetch(): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = (init?.method || "GET").toUpperCase();
    const headers = new Headers(init?.headers as HeadersInit);
    const body = typeof init?.body === "string" ? init.body : undefined;
    const req = new NextRequest(url, { method, headers, body });

    if (url.pathname === "/api/v1/sync/handshake" && method === "POST") return handshake(req) as unknown as Response;
    if (url.pathname === "/api/v1/sync/push" && method === "POST") return push(req) as unknown as Response;
    if (url.pathname === "/api/v1/sync/pull" && method === "GET") return pull(req) as unknown as Response;
    throw new Error(`unhandled fetch in test: ${method} ${url.pathname}`);
  }) as typeof fetch;
}

async function toPng(image: GrayscaleImage): Promise<Buffer> {
  return sharp(Buffer.from(Uint8Array.from(image.data)), { raw: { width: image.width, height: image.height, channels: 1 } })
    .png()
    .toBuffer();
}

describe("Academic Node local API (createNodeApi)", () => {
  let world: TestWorld;
  let jobId: string;
  let api: ReturnType<typeof createNodeApi>;
  let store: SqliteNodeStore;

  beforeAll(async () => {
    world = await createTestWorld();
    jobId = (
      await prisma.oMRJob.create({ data: { tenantId: world.a.tenant.id, examId: world.a.exam.id, status: "PROCESSING", totalSheets: 1 } })
    ).id;
    store = new SqliteNodeStore(":memory:", { encryptionKey: KEY });
    const session = new OfflineSession(store);
    api = createNodeApi({ store, session, cloudBaseUrl: "http://cloud.test", fetchImpl: fakeCloudFetch() });
  });

  it("GET /health responds before the node is paired", async () => {
    const res = await api(new Request("http://node.local/health"));
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("OK");
  });

  it("GET /status reflects an unpaired node", async () => {
    const res = await api(new Request("http://node.local/status"));
    expect((await res.json()).paired).toBe(false);
  });

  it("POST /pair rejects an incomplete body", async () => {
    const res = await api(new Request("http://node.local/pair", { method: "POST", body: JSON.stringify({}) }));
    expect(res.status).toBe(400);
  });

  it("POST /pair completes a real handshake against the cloud and durably persists it", async () => {
    const res = await api(
      new Request("http://node.local/pair", {
        method: "POST",
        body: JSON.stringify({ tenantCode: world.a.tenant.code, nodeCode: "EDGE-NODE-1", machineFingerprint: "fp-edge-1" }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.paired).toBe(true);
    expect(body.tenantCode).toBe(world.a.tenant.code);
    expect(body.nodeId).toBeTruthy();

    const pairing = store.getPairing();
    expect(pairing?.token).toMatch(/^node_/);
    expect(pairing?.nodeId).toBe(body.nodeId);
  });

  it("GET /status reflects the pairing", async () => {
    const res = await api(new Request("http://node.local/status"));
    expect(await res.json()).toMatchObject({ paired: true });
  });

  it("POST /sync pulls the branch-scoped roster into the local store", async () => {
    const res = await api(new Request("http://node.local/sync", { method: "POST" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pulled).toBeGreaterThan(0);
    expect(store.listStudents().map((s) => s.id)).toContain(world.a.student.id);
  });

  it("POST /scans decodes a real PNG upload and queues an OMR_SCAN outbox event", async () => {
    const exam = await prisma.exam.findUniqueOrThrow({
      where: { id: world.a.exam.id },
      include: { examQuestions: { include: { question: true } } },
    });
    store.putExam(toCachedExam(exam as any));

    const image = renderSheet({ geom: STANDARD_75Q_GEOMETRY, roll: world.a.student.rollNumber, answers: { 1: "A" } });
    const png = await toPng(image);

    const res = await api(
      new Request(`http://node.local/scans?jobId=${jobId}&scanId=node-scan-1&entityVersion=1`, {
        method: "POST",
        headers: { "content-type": "image/png" },
        body: new Uint8Array(png),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ extraction: "CONFIDENT", queued: true });
    expect(store.outbox()).toHaveLength(1);
  });

  it("GET /jobs/:jobId/local-score scores the ingested scan advisorially", async () => {
    const res = await api(new Request(`http://node.local/jobs/${jobId}/local-score?examId=${world.a.exam.id}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.advisory).toBe(true);
    expect(body.results.find((r: any) => r.studentId === world.a.student.id)?.totalCorrect).toBe(1);
  });

  it("POST /sync drains the outbox through the real push route", async () => {
    const res = await api(new Request("http://node.local/sync", { method: "POST" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.delivered).toHaveLength(1);
    expect(store.outbox()).toEqual([]);
    const scan = await prisma.oMRScan.findUnique({ where: { id: "node-scan-1" } });
    expect(scan?.status).toBe("CONFIDENT");
  });

  it("POST /sync on an unpaired node is refused, not silently a no-op", async () => {
    const unpaired = new SqliteNodeStore(":memory:", { encryptionKey: KEY });
    const unpairedApi = createNodeApi({
      store: unpaired,
      session: new OfflineSession(unpaired),
      cloudBaseUrl: "http://cloud.test",
      fetchImpl: fakeCloudFetch(),
    });
    const res = await unpairedApi(new Request("http://node.local/sync", { method: "POST" }));
    expect(res.status).toBe(409);
    unpaired.close();
  });

  it("unknown routes 404", async () => {
    const res = await api(new Request("http://node.local/does-not-exist"));
    expect(res.status).toBe(404);
  });
});
