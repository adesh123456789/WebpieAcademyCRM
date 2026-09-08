import { beforeAll, describe, expect, it } from "vitest";
import { GET as me } from "../src/app/api/v1/auth/me/route";
import { POST as login } from "../src/app/api/v1/auth/login/route";
import { GET as students } from "../src/app/api/v1/students/route";
import { GET as fees } from "../src/app/api/v1/fees/route";
import { prisma } from "../src/lib/prisma";
import { createTestWorld, TEST_PASSWORD, type TestWorld } from "./support/fixtures";
import { request } from "./support/request";

describe("Foundation: real handlers against synthetic, isolated data", () => {
  let world: TestWorld;
  beforeAll(async () => {
    expect(await prisma.tenant.count()).toBe(0);
    world = await createTestWorld();
  });

  it("builds distinct accounts, related profiles and overlapping tenant roll numbers", async () => {
    expect(world.a.student.id).not.toBe(world.a.users.student.id);
    expect(world.a.parent.id).not.toBe(world.a.users.parent.id);
    expect(world.a.student.rollNumber).toBe(world.b.student.rollNumber);
    expect(await prisma.studentParentLink.count({ where: { parentId: world.a.parent.id } })).toBe(2);
    expect(await prisma.branch.count({ where: { tenantId: world.a.tenant.id } })).toBe(2);
  });

  it("rejects unauthenticated and malformed-token requests", async () => {
    expect((await me(request("/api/v1/auth/me"))).status).toBe(401);
    expect((await students(request("/api/v1/students", { token: "invalid" }))).status).toBe(401);
  });

  it("logs in through the actual handler and resolves its response cookie", async () => {
    const response = await login(request("/api/v1/auth/login", { body: {
      email: world.a.users.owner.email, password: TEST_PASSWORD, tenantCode: world.a.tenant.code,
    } }));
    expect(response.status).toBe(200);
    const token = response.cookies.get("webpie_token")?.value;
    expect(token).toBeTruthy();
    const session = await me(request("/api/v1/auth/me", { token, viaCookie: true }));
    expect(session.status).toBe(200);
    const body = await session.json();
    expect(body.user.id).toBe(world.a.users.owner.id);
    expect(body.user.tenantId).toBe(world.a.tenant.id);
    expect(body.user).not.toHaveProperty("passwordHash");
  });

  it("rejects an incorrect password", async () => {
    const response = await login(request("/api/v1/auth/login", { body: {
      email: world.a.users.owner.email, password: "wrong", tenantCode: world.a.tenant.code,
    } }));
    expect(response.status).toBe(401);
  });

  it("lists only the authenticated owner's tenant even when a client supplies another tenant", async () => {
    const response = await students(request(`/api/v1/students?tenantId=${world.b.tenant.id}`, { user: world.a.users.owner }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.students.map((s: { id: string }) => s.id).sort()).toEqual(
      [world.a.student.id, world.a.sibling.id, world.a.otherStudent.id].sort());
  });

  it("returns 403 from the real fee handler for a teacher", async () => {
    expect((await fees(request("/api/v1/fees", { user: world.a.users.teacher }))).status).toBe(403);
  });

  it("returns the authorized accountant's fee plan, excluding the other tenant", async () => {
    const response = await fees(request("/api/v1/fees", { user: world.a.users.accountant }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.feePlans.map((p: { id: string }) => p.id)).toEqual([world.a.feePlan.id]);
  });
});
