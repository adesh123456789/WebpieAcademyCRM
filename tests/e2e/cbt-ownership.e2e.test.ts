import { beforeAll, describe, expect, it } from "vitest";
import { call, createTestWorld, type TestWorld } from "./support/harness";
import { POST as cbtStart, PUT as cbtSave } from "../../src/app/api/v1/cbt/attempts/route";
import { prisma } from "../../src/lib/prisma";

/**
 * AC-011 - CBT attempt ownership, idempotent submission, server-authoritative
 * clock. Ownership + basic idempotency are enforced today (SEC-001); the clock,
 * autosave/reconnect and eligibility windows landed with CBT-001 (`5e1d99b`).
 */

let world: TestWorld;
let attemptId = "";

beforeAll(async () => {
  world = await createTestWorld();
});

/** A dedicated finalized CBT exam on tenant A, with an optional eligibility policy. */
async function makeCbtExam(cbtEligibility: Record<string, unknown> = {}, batchId?: string) {
  return prisma.exam.create({
    data: {
      tenantId: world.a.tenant.id,
      branchId: world.a.branch.id,
      title: "CBT synthetic exam",
      code: `CBT-${Math.random().toString(36).slice(2, 8)}`,
      examType: "JEE_MAIN",
      batchIds: JSON.stringify([batchId ?? world.a.batch.id]),
      blueprint: JSON.stringify({ cbtEligibility }),
      markingRules: JSON.stringify({ correct: 4, incorrect: -1, unattempted: 0 }),
      durationMinutes: 60,
      totalQuestions: 1,
      totalMarks: 4,
      status: "FINALIZED",
      isCbtEnabled: true,
      examQuestions: { create: { questionId: world.a.question.id, sectionName: "Physics", orderIndex: 1 } },
    },
  });
}

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

  it("server-authoritative exam clock: expiry is enforced regardless of client time (CBT-001)", async () => {
    const exam = await makeCbtExam();
    const started = await call(cbtStart, "/api/v1/cbt/attempts", {
      user: world.a.users.student,
      body: { examId: exam.id },
    });
    expect(started.status).toBe(200);
    const id = started.body.attemptId as string;
    // the server hands back its own clock and a derived expiry; the client sends none
    expect(new Date(started.body.serverTime).getTime()).toBeGreaterThan(0);
    expect(new Date(started.body.expiresAt).getTime()).toBe(
      new Date(started.body.startTime).getTime() + 60 * 60_000,
    );

    // wind the attempt's start back past its duration - the save below carries no clock
    await prisma.cBTAttempt.update({
      where: { id },
      data: { startTime: new Date(Date.now() - 61 * 60_000) },
    });

    const save = await call(cbtSave, "/api/v1/cbt/attempts", {
      user: world.a.users.student,
      body: { attemptId: id, responses: { [world.a.question.id]: "A" } },
    });
    expect(save.status).toBe(409);
    expect(String(save.body.error)).toMatch(/expired/i);
    const row = await prisma.cBTAttempt.findUnique({ where: { id } });
    expect(row?.status).toBe("TIMED_OUT");
  });

  it("autosave heartbeat + reconnect restores saved responses after a disconnect (AC-011)", async () => {
    const exam = await makeCbtExam();
    const started = await call(cbtStart, "/api/v1/cbt/attempts", {
      user: world.a.users.student,
      body: { examId: exam.id },
    });
    const id = started.body.attemptId as string;

    const beat = await call(cbtSave, "/api/v1/cbt/attempts", {
      user: world.a.users.student,
      body: {
        attemptId: id,
        responses: { [world.a.question.id]: "A" },
        markedForReview: [world.a.question.id],
      },
    });
    expect(beat.status).toBe(200);
    expect(beat.body.saved).toBe(true);
    expect(beat.body.responses).toEqual({ [world.a.question.id]: "A" });
    expect(new Date(beat.body.serverTime).getTime()).toBeGreaterThan(0);

    // a reconnect is just another start call for the same in-progress attempt
    const resumed = await call(cbtStart, "/api/v1/cbt/attempts", {
      user: world.a.users.student,
      body: { examId: exam.id },
    });
    expect(resumed.status).toBe(200);
    expect(resumed.body.attemptId).toBe(id);
    expect(resumed.body.responses).toEqual({ [world.a.question.id]: "A" });
    expect(resumed.body.markedForReview).toEqual([world.a.question.id]);
  });

  it("eligibility window and attempt-limit enforcement per tenant flag (CBT-001)", async () => {
    const past = new Date(Date.now() - 60 * 60_000).toISOString();
    const future = new Date(Date.now() + 60 * 60_000).toISOString();

    const notOpen = await call(cbtStart, "/api/v1/cbt/attempts", {
      user: world.a.users.student,
      body: { examId: (await makeCbtExam({ opensAt: future })).id },
    });
    expect(notOpen.status).toBe(403);
    expect(String(notOpen.body.error)).toMatch(/not opened/i);

    const closed = await call(cbtStart, "/api/v1/cbt/attempts", {
      user: world.a.users.student,
      body: { examId: (await makeCbtExam({ closesAt: past })).id },
    });
    expect(closed.status).toBe(403);
    expect(String(closed.body.error)).toMatch(/closed/i);

    const wrongBatch = await call(cbtStart, "/api/v1/cbt/attempts", {
      user: world.a.users.student,
      body: { examId: (await makeCbtExam({}, world.a.otherBatch.id)).id },
    });
    expect(wrongBatch.status).toBe(403);
    expect(String(wrongBatch.body.error)).toMatch(/not eligible/i);

    const exam = await makeCbtExam({ opensAt: past, closesAt: future, attemptLimit: 1 });
    const first = await call(cbtStart, "/api/v1/cbt/attempts", {
      user: world.a.users.student,
      body: { examId: exam.id },
    });
    expect(first.status).toBe(200);
    const submit = await call(cbtSave, "/api/v1/cbt/attempts", {
      user: world.a.users.student,
      body: { attemptId: first.body.attemptId, responses: { [world.a.question.id]: "A" }, isFinalSubmit: true },
    });
    expect(submit.status).toBe(200);
    const second = await call(cbtStart, "/api/v1/cbt/attempts", {
      user: world.a.users.student,
      body: { examId: exam.id },
    });
    expect(second.status).toBe(409);
    expect(String(second.body.error)).toMatch(/limit/i);
  });

  it("CBT result lands in the common ExamResult/mastery pipeline, not a side path (CBT-001 / EVAL-001)", async () => {
    const exam = await makeCbtExam();
    const started = await call(cbtStart, "/api/v1/cbt/attempts", {
      user: world.a.users.student,
      body: { examId: exam.id },
    });
    const submit = await call(cbtSave, "/api/v1/cbt/attempts", {
      user: world.a.users.student,
      body: {
        attemptId: started.body.attemptId,
        responses: { [world.a.question.id]: "A" },
        isFinalSubmit: true,
      },
    });
    expect(submit.status).toBe(200);
    expect(submit.body.submitted).toBe(true);
    expect(submit.body.resultId).toBeTruthy();

    // the same versioned table the OMR finalize path writes, marked final
    const result = await prisma.examResult.findFirst({
      where: { examId: exam.id, studentId: world.a.student.id, isFinal: true },
    });
    expect(result?.id).toBe(submit.body.resultId);

    // per-question mastery evidence, in the shared MasteryEvidence table
    const evidence = await prisma.masteryEvidence.findMany({
      where: { examId: exam.id, studentId: world.a.student.id },
    });
    expect(evidence).toHaveLength(1);
    expect(evidence[0].concept).toBe(world.a.question.concept);
    expect(evidence[0].wasCorrect).toBe(true);

    const attempt = await prisma.cBTAttempt.findUnique({ where: { id: started.body.attemptId } });
    expect(attempt?.status).toBe("SUBMITTED");
  });
});
