import { beforeAll, describe, expect, it } from "vitest";
import { call, createTestWorld, type TestWorld } from "./support/harness";
import { POST as cbtStart, PUT as cbtSave } from "../../src/app/api/v1/cbt/attempts/route";

/**
 * AC-011 - CBT attempt ownership, idempotent submission, server-authoritative
 * clock. Ownership + basic idempotency are enforced today (SEC-001); the clock,
 * autosave/reconnect and eligibility windows are CBT-001.
 */

let world: TestWorld;
let attemptId = "";

beforeAll(async () => {
  world = await createTestWorld();
});

describe("CBT attempt ownership & submission", () => {
  it("a student starts an attempt on their own tenant's exam", async () => {
    const res = await call(cbtStart, "/api/v1/cbt/attempts", {
      user: world.a.users.student,
      body: { examId: world.a.exam.id },
    });
    expect(res.status).toBe(200);
    expect(res.body.attemptId).toBeTruthy();
    attemptId = res.body.attemptId;
  });

  it("a user from another tenant cannot save into that attempt", async () => {
    const res = await call(cbtSave, "/api/v1/cbt/attempts", {
      user: world.b.users.student,
      body: { attemptId, responses: { 1: "A" } },
    });
    expect([403, 404]).toContain(res.status);
  });

  it("start is idempotent - the same student resumes the same in-progress attempt", async () => {
    const res = await call(cbtStart, "/api/v1/cbt/attempts", {
      user: world.a.users.student,
      body: { examId: world.a.exam.id },
    });
    expect(res.status).toBe(200);
    expect(res.body.attemptId).toBe(attemptId);
  });

  it("a submitted attempt cannot be submitted again", async () => {
    const first = await call(cbtSave, "/api/v1/cbt/attempts", {
      user: world.a.users.student,
      body: { attemptId, responses: { 1: "A" }, isFinalSubmit: true },
    });
    expect(first.status).toBe(200);
    const second = await call(cbtSave, "/api/v1/cbt/attempts", {
      user: world.a.users.student,
      body: { attemptId, responses: { 1: "B" }, isFinalSubmit: true },
    });
    expect(second.status).toBe(409);
  });

  it.todo("server-authoritative exam clock: expiry is enforced regardless of client time - blocked on CBT-001");
  it.todo("autosave heartbeat + reconnect restores saved responses after a disconnect (AC-011) - blocked on CBT-001");
  it.todo("eligibility window and attempt-limit enforcement per tenant flag - blocked on CBT-001");
  it.todo("CBT result lands in the common ExamResult/mastery pipeline, not a side path - blocked on CBT-001 / EVAL-001");
});
