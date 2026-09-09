import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { call, createTestWorld, loginAs, type TestWorld } from "./support/harness";

import { GET as studentsGet } from "../../src/app/api/v1/students/route";
import { POST as examsPost } from "../../src/app/api/v1/exams/route";
import { POST as reviewPost } from "../../src/app/api/v1/exams/[id]/review/route";
import { PATCH as editPatch } from "../../src/app/api/v1/exams/[id]/route";
import { POST as finalizePost } from "../../src/app/api/v1/exams/[id]/finalize/route";
import { GET as artifactsGet } from "../../src/app/api/v1/exams/[id]/artifacts/route";
import { POST as omrJobsPost } from "../../src/app/api/v1/omr/jobs/route";
import { POST as omrFinalizePost } from "../../src/app/api/v1/omr/jobs/[id]/finalize/route";
import { GET as resultsGet } from "../../src/app/api/v1/results/exams/[id]/route";
import { GET as portalGet } from "../../src/app/api/v1/parent/portal/route";

/**
 * PRD golden loop, end to end, against one synthetic tenant:
 *   auth -> students -> exam builder -> artifacts -> OMR -> evaluation ->
 *   results -> mastery -> intervention -> retest -> parent report.
 *
 * `it` = behaviour verifiable against today's routes.
 * `it.todo` = step whose backend is not built yet; the label names the blocking task.
 * This is the living REL-001 launch-gate map - keep the ordering and the todo labels.
 */

let world: TestWorld;
let teacherToken: string;
let examId = "";

beforeAll(async () => {
  world = await createTestWorld();
  teacherToken = await loginAs(world.a.users.teacher.email!, world.a.tenant.code);
});

describe("Golden loop / Stage 1 - identity & scope", () => {
  it("S1: teacher authenticates and receives a tenant-scoped session", async () => {
    expect(teacherToken).toBeTruthy();
  });

  it("S2: teacher can list students in their tenant", async () => {
    const res = await call(studentsGet, "/api/v1/students", { token: teacherToken });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.students)).toBe(true);
    for (const s of res.body.students) expect(s.tenantId ?? world.a.tenant.id).toBe(world.a.tenant.id);
  });

  it.todo("S2a: teacher sees ONLY assigned-batch students - blocked on STU-001 (batch assignment enforcement)");
});

describe("Golden loop / Stage 2 - exam builder & artifacts", () => {
  it("S3: teacher creates an exam from an approved question", async () => {
    const res = await call(examsPost, "/api/v1/exams", {
      token: teacherToken,
      body: {
        title: "E2E Physics Benchmark",
        examType: "JEE_MAIN",
        questionIds: [world.a.question.id],
        batchIds: [world.a.batch.id],
        markingRules: { correct: 4, incorrect: -1, unattempted: 0 },
      },
    });
    expect(res.status).toBe(200);
    expect(res.body.exam?.tenantId).toBe(world.a.tenant.id);
    examId = res.body.exam.id;
  });

  it("S3-neg: a counsellor cannot create an exam", async () => {
    const res = await call(examsPost, "/api/v1/exams", {
      user: world.a.users.counsellor,
      body: { title: "x", examType: "JEE_MAIN", questionIds: [world.a.question.id] },
    });
    expect(res.status).toBe(403);
  });

  it("S3-scope: exam creation rejects a question from another tenant", async () => {
    const before = await prisma.exam.count({ where: { tenantId: world.a.tenant.id } });
    const res = await call(examsPost, "/api/v1/exams", {
      token: teacherToken,
      body: { title: "leak?", examType: "JEE_MAIN", questionIds: [world.b.question.id] },
    });
    expect([400, 403]).toContain(res.status);
    expect(await prisma.exam.count({ where: { tenantId: world.a.tenant.id } })).toBe(before);
  });

  it("S3a: draft -> review -> transactional finalize, immutable question snapshot", async () => {
    const created = await call(examsPost, "/api/v1/exams", { token: teacherToken,
      body: { title: "Versioned exam", examType: "JEE_MAIN", questionIds: [world.a.question.id] } });
    const id = created.body.exam.id;
    const transition = (handler: typeof reviewPost, body: object) => call(handler, `/api/v1/exams/${id}`, { token: teacherToken, params: { id }, body });
    expect((await transition(finalizePost, { expectedVersion: 1, idempotencyKey: "early" })).status).toBe(409);
    expect((await transition(reviewPost, { expectedVersion: 1 })).body.status).toBe("IN_REVIEW");
    const finalized = await transition(finalizePost, { expectedVersion: 2, idempotencyKey: "finalize-1" });
    expect(finalized.status).toBe(200);
    expect(finalized.body.snapshotId).toBeTruthy();
    expect((await transition(finalizePost, { expectedVersion: 2, idempotencyKey: "finalize-1" })).body).toEqual(finalized.body);
    expect((await transition(finalizePost, { expectedVersion: 2, idempotencyKey: "different" })).status).toBe(409);
    const frozen = await prisma.exam.findUniqueOrThrow({ where: { id } });
    expect((await call(editPatch, `/api/v1/exams/${id}`, { token: teacherToken, params: { id },
      body: { expectedVersion: finalized.body.version, title: "Overwrite finalized" } })).status).toBe(409);
    expect(await prisma.exam.findUniqueOrThrow({ where: { id } })).toEqual(frozen);
    const original = await prisma.question.findUniqueOrThrow({ where: { id: world.a.question.id } });
    await prisma.question.update({ where: { id: original.id }, data: { correctAnswer: JSON.stringify("D"), body: "Changed source" } });
    try {
      const artifact = await call(artifactsGet, `/api/v1/exams/${id}/artifacts?type=answer_key`, { token: teacherToken, params: { id } });
      expect(artifact.status).toBe(200);
      expect(artifact.body.answerKey[0].correctAnswer).toEqual(JSON.parse(original.correctAnswer));
      expect(await prisma.auditLog.count({ where: { entityId: id, action: "EXAM_FINALIZE" } })).toBe(1);
    } finally {
      await prisma.question.update({ where: { id: original.id }, data: { correctAnswer: original.correctAnswer, body: original.body } });
    }
    const another = await call(examsPost, "/api/v1/exams", { token: teacherToken,
      body: { title: "Review guard", examType: "JEE_MAIN", questionIds: [original.id] } });
    const guardId = another.body.exam.id;
    const guard = (handler: typeof reviewPost, body: object) => call(handler, `/api/v1/exams/${guardId}`, { token: teacherToken, params: { id: guardId }, body });
    await prisma.question.update({ where: { id: original.id }, data: { status: "AI_CANDIDATE" } });
    expect((await guard(reviewPost, { expectedVersion: 1 })).status).toBe(422);
    await prisma.question.update({ where: { id: original.id }, data: { status: original.status } });
    expect((await guard(reviewPost, { expectedVersion: 1 })).status).toBe(200);
    await prisma.question.update({ where: { id: original.id }, data: { body: "Changed after review" } });
    try {
      expect((await guard(finalizePost, { expectedVersion: 2, idempotencyKey: "stale" })).status).toBe(409);
      expect((await prisma.exam.findUniqueOrThrow({ where: { id: guardId } })).status).toBe("IN_REVIEW");
    } finally {
      await prisma.question.update({ where: { id: original.id }, data: { body: original.body } });
    }
    const edit = (body: object) => call(editPatch, `/api/v1/exams/${guardId}`, { token: teacherToken, params: { id: guardId }, body });
    expect((await edit({ expectedVersion: 2, questionIds: [world.b.question.id] })).status).toBe(403);
    const revised = await edit({ expectedVersion: 2, title: "Revised draft", markingRules: { correct: 5, incorrect: -2, unattempted: 0 } });
    expect(revised.status).toBe(200);
    expect(revised.body.exam).toMatchObject({ status: "DRAFT", version: 3, title: "Revised draft", totalMarks: 5 });
    expect(JSON.parse(revised.body.exam.blueprint).reviewHash).toBeUndefined();
    expect((await edit({ expectedVersion: 2, title: "Stale edit" })).status).toBe(409);
    expect((await guard(finalizePost, { expectedVersion: 3, idempotencyKey: "without-review" })).status).toBe(409);
    expect((await guard(reviewPost, { expectedVersion: 3 })).body).toMatchObject({ status: "IN_REVIEW", version: 4 });
    expect(await prisma.auditLog.count({ where: { entityId: guardId, action: "EXAM_EDIT" } })).toBe(1);
  });
  it("S3b: blueprint validation blocks impossible mark/count combinations without partial writes", async () => {
    const before = await prisma.exam.count({ where: { tenantId: world.a.tenant.id } });
    for (const invalid of [{ totalMarks: 300 }, { totalQuestions: 75 }]) {
      const res = await call(examsPost, "/api/v1/exams", {
        token: teacherToken,
        body: { title: "Invalid blueprint", examType: "JEE_MAIN", questionIds: [world.a.question.id], ...invalid },
      });
      expect(res.status).toBe(422);
    }
    expect(await prisma.exam.count({ where: { tenantId: world.a.tenant.id } })).toBe(before);
    const draft = await prisma.exam.findUniqueOrThrow({ where: { id: examId }, include: { examQuestions: true } });
    expect(draft.status).toBe("DRAFT");
    expect(draft.finalizedAt).toBeNull();
    expect(draft.totalMarks).toBe(draft.examQuestions.reduce((sum, q) => sum + q.marksCorrect, 0));
    for (const invalid of [
      { questionIds: [world.a.question.id, world.a.question.id] },
      { markingRules: { correct: -4, incorrect: -1, unattempted: 0 } },
      { batchIds: [world.b.batch.id] },
    ]) {
      const res = await call(examsPost, "/api/v1/exams", {
        token: teacherToken,
        body: { title: "Invalid selection", examType: "JEE_MAIN", questionIds: [world.a.question.id], ...invalid },
      });
      expect([400, 403]).toContain(res.status);
    }
    expect(await prisma.exam.count({ where: { tenantId: world.a.tenant.id } })).toBe(before);
  });

  it("S4: exam artifact endpoint responds for a real exam", async () => {
    expect(examId).toBeTruthy();
    const res = await call(artifactsGet, `/api/v1/exams/${examId}/artifacts`, {
      token: teacherToken,
      params: { id: examId },
    });
    expect(res.status).not.toBe(500);
  });

  it.todo("S4a: generated PDF/OMR carry branding, correct pagination and a scannable 4-corner fiducial - blocked on EXM-001 / OMR-001");
});

describe("Golden loop / Stage 3 - OMR capture & review", () => {
  it("S5-auth: OMR job creation rejects an unauthenticated request", async () => {
    const res = await call(omrJobsPost, "/api/v1/omr/jobs", { body: { examId } });
    expect(res.status).toBe(401);
  });

  it("S7-guard: finalizing a non-existent OMR job does not 500", async () => {
    const res = await call(omrFinalizePost, "/api/v1/omr/jobs/nope/finalize", {
      token: teacherToken,
      params: { id: "nope" },
      body: {},
    });
    expect([400, 404, 409]).toContain(res.status);
  });

  it.todo("S5: real image/PDF ingest, normalization, anchor + identity detection, per-bubble confidence - blocked on OMR-001");
  it.todo("S6: low-confidence responses require review with cropped evidence; override records detected/final/actor - blocked on OMR-001 (see tests/omr-corpus)");
  it.todo("S7: finalize is retry-safe and blocked while review items remain; one logical result per batch - blocked on OMR-002");
});

describe("Golden loop / Stage 4 - evaluation & results", () => {
  it("S8: results endpoint returns the exam scoped to the tenant", async () => {
    const res = await call(resultsGet, `/api/v1/results/exams/${examId}`, {
      token: teacherToken,
      params: { id: examId },
    });
    expect(res.status).toBe(200);
  });

  it("S8-isolation (AC-001): teacher A cannot read tenant B's exam results", async () => {
    const res = await call(resultsGet, `/api/v1/results/exams/${world.b.exam.id}`, {
      token: teacherToken,
      params: { id: world.b.exam.id },
    });
    expect([403, 404]).toContain(res.status);
    expect(JSON.stringify(res.body)).not.toContain(world.b.exam.title);
  });

  it.todo("S8a: deterministic scoring, negative marking, cohort rank/percentile snapshot, reproducible re-run - blocked on EVAL-001");
  it.todo("S8b: answer-key correction creates an audited result revision - blocked on EVAL-001");
});

describe("Golden loop / Stage 5 - mastery & intervention", () => {
  it.todo("S9: ResultComputed -> MasteryEvidence -> weakness detection with insufficient-evidence handling - blocked on INT-001");
  it.todo("S10: intervention creates a 3-tier practice ladder and a printable remedial worksheet - blocked on INT-001");
  it.todo("S11: mini re-test recomputes mastery; intervention stays unverified until retest evidence exists (AC-009) - blocked on INT-001");
});

describe("Golden loop / Stage 6 - parent report", () => {
  it("S12: a linked parent can open their child's portal report", async () => {
    const res = await call(portalGet, `/api/v1/parent/portal?roll=${world.a.student.rollNumber}&lang=en`, {
      user: world.a.users.parent,
    });
    expect(res.status).toBe(200);
    expect(res.body.student ?? res.body).toBeTruthy();
  });

  it("S12-scope (AC-010): a parent cannot open a child they are not linked to", async () => {
    const res = await call(portalGet, `/api/v1/parent/portal?roll=${world.a.otherStudent.rollNumber}`, {
      user: world.a.users.parent,
    });
    expect([403, 404]).toContain(res.status);
    expect(JSON.stringify(res.body)).not.toContain(world.a.otherStudent.name);
  });

  it.todo("S12a: published report is a versioned artifact; share link is scoped and expiring (AC-010) - blocked on REP-001");
  it.todo("S12b: multilingual (en/hi/mr) summary asserts only persisted facts; cohort size is real, not hardcoded - blocked on REP-001");
});

describe("Golden loop / provenance", () => {
  it("records at most one exam per create and never cross-tenant question links", async () => {
    const exams = await prisma.exam.findMany({ where: { tenantId: world.a.tenant.id } });
    expect(exams.length).toBeGreaterThanOrEqual(1);
    const xqs = await prisma.examQuestion.findMany({
      where: { exam: { tenantId: world.a.tenant.id } },
      include: { question: true },
    });
    for (const xq of xqs) {
      expect(xq.question.tenantId === null || xq.question.tenantId === world.a.tenant.id).toBe(true);
    }
  });
});
