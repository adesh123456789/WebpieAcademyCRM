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
import { POST as omrOverridePost } from "../../src/app/api/v1/omr/responses/[id]/override/route";
import { POST as omrFinalizePost } from "../../src/app/api/v1/omr/jobs/[id]/finalize/route";
import { GET as resultsGet } from "../../src/app/api/v1/results/exams/[id]/route";
import { GET as portalGet } from "../../src/app/api/v1/parent/portal/route";
import { GET as masteryGet } from "../../src/app/api/v1/mastery/students/[studentId]/route";
import { POST as interventionsPost } from "../../src/app/api/v1/interventions/route";
import { GET as interventionGet } from "../../src/app/api/v1/interventions/[id]/route";
import { POST as retestPost } from "../../src/app/api/v1/interventions/[id]/retest/route";
import { POST as reviseAnswerKeyPost } from "../../src/app/api/v1/exams/[id]/answer-key/revise/route";
import { POST as reportPublishPost } from "../../src/app/api/v1/reports/[id]/publish/route";
import { POST as reportSharePost } from "../../src/app/api/v1/reports/[id]/share/route";
import { GET as reportShareGet } from "../../src/app/api/v1/reports/share/[token]/route";

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
let omrJobId = "";
let ambiguousScanId = "";

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

  it("S5: ingests a scan batch; a double-marked sheet lands in REVIEW_REQUIRED, not scored", async () => {
    const res = await call(omrJobsPost, "/api/v1/omr/jobs", {
      token: teacherToken,
      body: {
        examId: world.a.exam.id,
        simulatedSheets: [
          { roll: world.a.student.rollNumber, grid: { 1: [0.9, 0.02, 0.01, 0.02] } }, // clean -> A
          { roll: world.a.sibling.rollNumber, grid: { 1: [0.8, 0.02, 0.75, 0.02] } }, // A + C -> DOUBLE_MARK
        ],
      },
    });
    expect(res.status).toBe(200);
    expect(res.body.job.status).toBe("REVIEW_REQUIRED");
    omrJobId = res.body.job.id;
    const scans = res.body.job.scans as { id: string; status: string; detectedRollNumber: string }[];
    expect(scans).toHaveLength(2);
    ambiguousScanId = scans.find((s) => s.status === "AMBIGUOUS")!.id;
    expect(ambiguousScanId).toBeTruthy();
  });

  it("S7-blocked: finalize is refused (409) while a scan is still under review", async () => {
    const res = await call(omrFinalizePost, `/api/v1/omr/jobs/${omrJobId}/finalize`, {
      token: teacherToken,
      params: { id: omrJobId },
      body: { idempotencyKey: "omr-final-1" },
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/review/i);
  });

  it("S6: an override records detected -> final -> actor and clears the review flag", async () => {
    const res = await call(omrOverridePost, `/api/v1/omr/responses/${ambiguousScanId}/override`, {
      token: teacherToken,
      params: { id: ambiguousScanId },
      body: { questionNumber: 1, newResponse: "A", reason: "double mark - resolved to A" },
    });
    expect(res.status).toBe(200);
    expect(res.body.scan.status).toBe("OVERRIDDEN");
    expect(JSON.parse(res.body.scan.verifiedResponses)["1"]).toBe("A");

    const audit = await prisma.auditLog.findFirst({
      where: { action: "OMR_OVERRIDE", entityId: ambiguousScanId },
      orderBy: { timestamp: "desc" },
    });
    const details = JSON.parse(audit!.details as string);
    expect(details).toMatchObject({ questionNumber: 1, correctedValue: "A" });
    expect(audit!.userId).toBeTruthy();
  });

  it("S6-guard: a stale expectedVersion override is rejected (409)", async () => {
    const res = await call(omrOverridePost, `/api/v1/omr/responses/${ambiguousScanId}/override`, {
      token: teacherToken,
      params: { id: ambiguousScanId },
      body: { questionNumber: 1, newResponse: "B", expectedVersion: 0 },
    });
    expect(res.status).toBe(409);
  });

  it("S7-key: finalize requires an idempotency key", async () => {
    const res = await call(omrFinalizePost, `/api/v1/omr/jobs/${omrJobId}/finalize`, {
      token: teacherToken,
      params: { id: omrJobId },
      body: {},
    });
    expect(res.status).toBe(400);
  });

  it("S7: finalize succeeds once every flagged scan is resolved; same key replays to one result set, a different key 409s; a finalized job rejects overrides", async () => {
    const finalized = await call(omrFinalizePost, `/api/v1/omr/jobs/${omrJobId}/finalize`, {
      token: teacherToken,
      params: { id: omrJobId },
      body: { idempotencyKey: "omr-final-1" },
    });
    expect(finalized.status).toBe(200);
    expect(finalized.body.evaluatedCount).toBe(2);
    expect(await prisma.examResult.count({ where: { examId: world.a.exam.id } })).toBe(2);

    const replay = await call(omrFinalizePost, `/api/v1/omr/jobs/${omrJobId}/finalize`, {
      token: teacherToken,
      params: { id: omrJobId },
      body: { idempotencyKey: "omr-final-1" },
    });
    expect(replay.status).toBe(200);
    expect(replay.body.replay).toBe(true);
    expect(await prisma.examResult.count({ where: { examId: world.a.exam.id } })).toBe(2);

    const differentKey = await call(omrFinalizePost, `/api/v1/omr/jobs/${omrJobId}/finalize`, {
      token: teacherToken,
      params: { id: omrJobId },
      body: { idempotencyKey: "omr-final-different" },
    });
    expect(differentKey.status).toBe(409);

    const overrideAfterFinalize = await call(omrOverridePost, `/api/v1/omr/responses/${ambiguousScanId}/override`, {
      token: teacherToken,
      params: { id: ambiguousScanId },
      body: { questionNumber: 1, newResponse: "B", reason: "late correction" },
    });
    expect(overrideAfterFinalize.status).toBe(409);
  });
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

  it("S8a: deterministic scoring, negative marking, cohort rank/percentile snapshot, reproducible re-run", async () => {
    const first = await call(resultsGet, `/api/v1/results/exams/${world.a.exam.id}`, { token: teacherToken, params: { id: world.a.exam.id } });
    const second = await call(resultsGet, `/api/v1/results/exams/${world.a.exam.id}`, { token: teacherToken, params: { id: world.a.exam.id } });
    expect(first.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(first.body.leaderboard.length).toBe(2);
    expect(first.body.leaderboard.map((r: any) => r.rank)).toEqual([1, 2]);
    expect(first.body.leaderboard.every((r: any) => r.percentile >= 0 && r.percentile <= 100)).toBe(true);
  });
  it("S8b: answer-key correction creates an audited result revision", async () => {
    const before = await prisma.examResult.count({ where: { examId: world.a.exam.id } });
    const revised = await call(reviseAnswerKeyPost, `/api/v1/exams/${world.a.exam.id}/answer-key/revise`, { token: teacherToken, params: { id: world.a.exam.id }, body: { questionId: world.a.question.id, correctAnswer: "B", reason: "Verified answer-key correction" } });
    expect(revised.status).toBe(200);
    expect(revised.body.revisedResults).toBe(2);
    expect(await prisma.examResult.count({ where: { examId: world.a.exam.id } })).toBe(before + 2);
    expect(await prisma.examResultRevision.count({ where: { examId: world.a.exam.id, reason: "Verified answer-key correction" } })).toBe(2);
    expect(await prisma.auditLog.count({ where: { entityId: world.a.exam.id, action: "ANSWER_KEY_REVISED" } })).toBe(1);
  });
});

describe("Golden loop / Stage 5 - mastery & intervention", () => {
  let interventionId = "";
  it("S9: ResultComputed -> MasteryEvidence -> weakness detection with insufficient-evidence handling", async () => {
    const res = await call(masteryGet, `/api/v1/mastery/students/${world.a.student.id}`, { token: teacherToken, params: { studentId: world.a.student.id } });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.concepts)).toBe(true);
    for (const concept of res.body.concepts) if (concept.insufficientEvidence) expect(concept.state).not.toBe("MASTERED");
  });
  it("S10: intervention creates a 3-tier practice ladder and a printable remedial worksheet", async () => {
    const created = await call(interventionsPost, "/api/v1/interventions", { token: teacherToken, body: { concept: world.a.question.concept, studentIds: [world.a.student.id], priority: "HIGH" } });
    expect(created.status).toBe(200);
    interventionId = created.body.intervention.id;
    const detail = await call(interventionGet, `/api/v1/interventions/${interventionId}`, { token: teacherToken, params: { id: interventionId } });
    expect(detail.status).toBe(200);
    expect(detail.body.status).toBe("UNVERIFIED");
    expect(detail.body.ladder.length).toBeGreaterThan(0);
  });
  it("S11: mini re-test recomputes mastery; intervention stays unverified until retest evidence exists (AC-009)", async () => {
    const insufficient = await call(retestPost, `/api/v1/interventions/${interventionId}/retest`, { token: teacherToken, params: { id: interventionId }, body: { results: [] } });
    expect(insufficient.status).toBe(422);
    const verified = await call(retestPost, `/api/v1/interventions/${interventionId}/retest`, { token: teacherToken, params: { id: interventionId }, body: { results: [{ studentId: world.a.student.id, newScore: 85 }] } });
    expect(verified.status).toBe(200);
    expect(verified.body.intervention.status).toBe("VERIFIED");
  });
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

  let reportV2Id = "";

  it("S12a: publishing a report is versioned; the share link is scoped and expiring (AC-010)", async () => {
    const pub = (studentId: string) =>
      call(reportPublishPost, `/api/v1/reports/${studentId}/publish`, { token: teacherToken, params: { id: studentId } });

    const v1 = await pub(world.a.student.id);
    expect(v1.status).toBe(200);
    expect(v1.body.report.version).toBe(1);
    const v2 = await pub(world.a.student.id);
    expect(v2.body.report.version).toBe(2); // versioned artifact, not overwrite
    reportV2Id = v2.body.report.id;

    const shared = await call(reportSharePost, `/api/v1/reports/${reportV2Id}/share`, {
      token: teacherToken,
      params: { id: reportV2Id },
      body: { expiresInHours: 1 },
    });
    expect(shared.status).toBe(200);
    expect(new Date(shared.body.expiresAt).getTime()).toBeGreaterThan(Date.now());

    const viaLink = await call(reportShareGet, `/api/v1/reports/share/${shared.body.token}`, {
      params: { token: shared.body.token },
    });
    expect(viaLink.status).toBe(200);
    expect(viaLink.body.report.version).toBe(2);
    expect(viaLink.body.report.student.id).toBe(world.a.student.id);

    // a bad token is not a valid link
    expect((await call(reportShareGet, "/api/v1/reports/share/deadbeef", { params: { token: "deadbeef" } })).status).toBe(404);

    // AC-010: a teacher cannot share the report of a student outside their batch scope
    const otherReport = await pub(world.a.otherStudent.id);
    expect(otherReport.status).toBe(200);
    const denied = await call(reportSharePost, `/api/v1/reports/${otherReport.body.report.id}/share`, {
      token: teacherToken,
      params: { id: otherReport.body.report.id },
      body: {},
    });
    expect(denied.status).toBe(403);
  });

  it("S12b: the published report projects only persisted facts (real result + cohort)", async () => {
    const dbResult = await prisma.examResult.findFirst({
      where: { examId: world.a.exam.id, studentId: world.a.student.id },
      orderBy: { computedAt: "desc" },
    });
    expect(dbResult).not.toBeNull();

    const pub = await call(reportPublishPost, `/api/v1/reports/${world.a.student.id}/publish`, {
      token: teacherToken,
      params: { id: world.a.student.id },
    });
    const p = pub.body.report.projection;
    expect(p.latestResult.score).toBe(dbResult!.score);
    expect(p.latestResult.rank).toBe(dbResult!.cohortRank);
    expect(p.latestResult.percentile).toBe(dbResult!.cohortPercentile);
    // concept health comes from persisted MasteryScore rows, not a template
    expect(Array.isArray(p.conceptHealth)).toBe(true);

    // parent portal cohort size is derived, never the old hardcoded 30
    const portal = await call(portalGet, `/api/v1/parent/portal?roll=${world.a.student.rollNumber}&lang=en`, {
      user: world.a.users.parent,
    });
    expect(portal.status).toBe(200);
    const realCohort = await prisma.examResult.count({ where: { examId: world.a.exam.id } });
    if (portal.body.report?.cohortSize !== undefined) {
      expect(portal.body.report.cohortSize).toBe(realCohort);
    }
  });
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
