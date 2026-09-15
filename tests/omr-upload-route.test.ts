import { beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { GET as listJobs, POST } from "../src/app/api/v1/omr/jobs/route";
import { GET as getImage } from "../src/app/api/v1/omr/scans/[id]/image/route";
import { createTestWorld, loginAs, type TestWorld } from "./e2e/support/harness";
import { MAX_OMR_FILES } from "../src/lib/omr-upload/validate";

let world: TestWorld;
let token: string;

beforeAll(async () => {
  world = await createTestWorld();
  token = await loginAs(world.a.users.teacher.email!, world.a.tenant.code);
});

async function upload(files: File[], extra?: Record<string, string>) {
  const form = new FormData();
  form.set("examId", world.a.exam.id);
  for (const file of files) form.append("files", file);
  const req = new NextRequest("http://webpie.test/api/v1/omr/jobs", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, ...extra },
    body: form,
  });
  const res = await POST(req);
  return { status: res.status, body: await res.json() };
}

describe("OMR multipart upload guard", () => {
  it("rejects invalid batches before creating any job", async () => {
    const before = await prisma.oMRJob.count({ where: { tenantId: world.a.tenant.id } });
    const invalid = [
      { files: [] as File[], status: 400 },
      { files: [new File(["bad"], "sheet.gif", { type: "image/gif" })], status: 400 },
      { files: [new File(["not-png"], "sheet.png", { type: "image/png" })], status: 400 },
      { files: [new File([new Uint8Array(10 * 1024 * 1024 + 1)], "huge.png", { type: "image/png" })], status: 413 },
      { files: Array.from({ length: MAX_OMR_FILES + 1 }, (_, i) => new File(["x"], `${i}.png`, { type: "image/png" })), status: 413 },
    ];
    for (const { files, status } of invalid) {
      const response = await upload(files);
      expect(response.status).toBe(status);
      expect(response.body.error).toBeTruthy();
      expect(await prisma.oMRJob.count({ where: { tenantId: world.a.tenant.id } })).toBe(before);
    }
  });

  it("honors the declared request limit before parsing multipart data", async () => {
    const before = await prisma.oMRJob.count({ where: { tenantId: world.a.tenant.id } });
    const response = await upload([], { "content-length": String(111 * 1024 * 1024) });
    expect(response.status).toBe(413);
    expect(await prisma.oMRJob.count({ where: { tenantId: world.a.tenant.id } })).toBe(before);
  });

  it("serves an uploaded PNG only to its tenant through the projected scan URL", async () => {
    const png = await sharp(Buffer.alloc(32 * 32, 255), { raw: { width: 32, height: 32, channels: 1 } }).png().toBuffer();
    const response = await upload([new File([new Uint8Array(png)], "sheet.png", { type: "image/png" })]);
    expect(response.status).toBe(200);
    expect(response.body.job.totalSheets).toBe(1);
    expect(response.body.job.scans).toHaveLength(1);
    const scan = response.body.job.scans[0];
    expect(scan.status).not.toBe("CONFIDENT");
    expect(scan.sheetImageUrl).toBe(`/api/v1/omr/scans/${scan.id}/image`);
    const stored = await prisma.oMRScan.findUniqueOrThrow({ where: { id: scan.id } });
    expect(stored.sheetImageUrl).toMatch(/^\/uploads\//);

    const imageRequest = (auth?: string) => new NextRequest(`http://webpie.test${scan.sheetImageUrl}`, {
      headers: auth ? { authorization: `Bearer ${auth}` } : undefined,
    });
    const own = await getImage(imageRequest(token), { params: { id: scan.id } });
    expect(own.status).toBe(200);
    expect(own.headers.get("content-type")).toBe("image/png");
    expect(Buffer.from(await own.arrayBuffer())).toEqual(png);
    const browserImage = await getImage(new NextRequest(`http://webpie.test${scan.sheetImageUrl}`, {
      headers: { cookie: `webpie_token=${token}` },
    }), { params: { id: scan.id } });
    expect(browserImage.status).toBe(200);
    expect((await getImage(imageRequest(), { params: { id: scan.id } })).status).toBe(401);
    const otherToken = await loginAs(world.b.users.teacher.email!, world.b.tenant.code);
    expect((await getImage(imageRequest(otherToken), { params: { id: scan.id } })).status).toBe(404);

    const jobs = await listJobs(new NextRequest("http://webpie.test/api/v1/omr/jobs", {
      headers: { authorization: `Bearer ${token}` },
    }));
    expect(jobs.status).toBe(200);
    expect(JSON.stringify(await jobs.json())).not.toContain("/uploads/");
  });
});
