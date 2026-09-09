import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import { createTestWorld, type TestWorld } from "./support/fixtures";
import { AIGateway } from "../src/lib/ai/ai-gateway";
import { generatedQuestionSchema, modelQuestionListSchema, AIScopeError, type AIContext } from "../src/lib/ai/schemas";

/**
 * CLD-002 sibling for the AI lane: AI-001 gateway behaviour.
 * Model API keys are stripped by tests/support/setup.ts, so every call here
 * exercises the non-fabricating fallback path.
 * Covers AC-003 (candidate gating), AC-007 (core works without AI, never
 * fabricates), AC-015 (tenant/namespace scope), plus provenance + schemas.
 */

let world: TestWorld;
const ctxFor = (tenantId: string, userId: string): AIContext => ({
  tenantId,
  userId,
  role: "TEACHER",
  traceId: `test-${Math.random().toString(36).slice(2)}`,
});

beforeAll(async () => {
  world = await createTestWorld();
  // A platform (global) question on the same concept, visible to every tenant.
  await prisma.question.create({
    data: {
      tenantId: null,
      code: "PLATFORM-SPEED-1",
      ownerScope: "PLATFORM",
      subject: "PHYSICS",
      chapter: "Motion",
      topic: "Speed",
      concept: "Speed",
      declaredDifficulty: "MEDIUM",
      type: "SINGLE_CORRECT",
      status: "VERIFIED",
      body: "PLATFORM speed question",
      options: JSON.stringify([
        { id: "A", text: "10" },
        { id: "B", text: "20" },
        { id: "C", text: "30" },
        { id: "D", text: "40" },
      ]),
      correctAnswer: JSON.stringify("B"),
      solution: "platform solution",
    },
  });
  // A draft question that must never be offered as an approved fallback.
  await prisma.question.create({
    data: {
      tenantId: world.a.tenant.id,
      code: "A-SPEED-DRAFT",
      ownerScope: "TENANT_PRIVATE",
      subject: "PHYSICS",
      chapter: "Motion",
      topic: "Speed",
      concept: "Speed",
      declaredDifficulty: "MEDIUM",
      type: "SINGLE_CORRECT",
      status: "DRAFT",
      body: "DRAFT speed question",
      options: JSON.stringify([
        { id: "A", text: "1" },
        { id: "B", text: "2" },
      ]),
      correctAnswer: JSON.stringify("A"),
      solution: "draft solution",
    },
  });
});

describe("AI Gateway - question.generate fallback (AI-001)", () => {
  it("AC-007: works with no model key and only ever returns approved bank questions", async () => {
    const res = await AIGateway.generateQuestions(
      {
        examType: "JEE_MAIN",
        subject: "PHYSICS",
        chapter: "Motion",
        concept: "Speed",
        difficulty: "MEDIUM",
        count: 5,
      },
      ctxFor(world.a.tenant.id, world.a.users.teacher.id),
    );

    expect(res.outcome).toBe("FALLBACK_BANK");
    expect(res.data.candidates.length).toBeGreaterThan(0);
    for (const c of res.data.candidates) {
      expect(c.source).toBe("BANK");
      expect(generatedQuestionSchema.safeParse(c).success).toBe(true);
    }
    const bodies = res.data.candidates.map((c) => c.body);
    // real approved rows only - never the deleted fabricated generator's output
    expect(bodies).toContain("Synthetic question"); // tenant A's own approved question
    expect(bodies).toContain("PLATFORM speed question"); // global approved bank
    expect(bodies).not.toContain("DRAFT speed question"); // unapproved
    expect(bodies.join(" ")).not.toMatch(/block of mass|bond order|Taylor series/); // old fabricator
  });

  it("AC-003: candidates are AI_CANDIDATE even though the backing rows are VERIFIED", async () => {
    const res = await AIGateway.generateQuestions(
      { examType: "JEE_MAIN", subject: "PHYSICS", chapter: "Motion", concept: "Speed", difficulty: "MEDIUM", count: 3 },
      ctxFor(world.a.tenant.id, world.a.users.teacher.id),
    );
    expect(res.data.candidates.length).toBeGreaterThan(0);
    for (const c of res.data.candidates) expect(c.status).toBe("AI_CANDIDATE");
  });

  it("AC-015: tenant A never receives tenant B's private questions", async () => {
    const fromA = await AIGateway.generateQuestions(
      { examType: "JEE_MAIN", subject: "PHYSICS", chapter: "Motion", concept: "Speed", difficulty: "MEDIUM", count: 10 },
      ctxFor(world.a.tenant.id, world.a.users.teacher.id),
    );
    const fromB = await AIGateway.generateQuestions(
      { examType: "JEE_MAIN", subject: "PHYSICS", chapter: "Motion", concept: "Speed", difficulty: "MEDIUM", count: 10 },
      ctxFor(world.b.tenant.id, world.b.users.owner.id),
    );
    // A sees: its own approved + platform. B sees: its own approved + platform. Never each other's.
    const aBodies = fromA.data.candidates.map((c) => c.body);
    const bBodies = fromB.data.candidates.map((c) => c.body);
    expect(aBodies).toContain("Synthetic question");
    expect(aBodies).toContain("PLATFORM speed question");
    expect(bBodies).toContain("PLATFORM speed question");
    // Each tenant's private "Synthetic question" row is distinct; count proves no leak:
    // A must see exactly 2 (own + platform), not 3.
    expect(aBodies.length).toBe(2);
    expect(bBodies.length).toBe(2);
  });

  it("reports a shortfall when the approved bank has fewer than requested, without erroring", async () => {
    const res = await AIGateway.generateQuestions(
      { examType: "JEE_MAIN", subject: "PHYSICS", chapter: "Motion", concept: "Speed", difficulty: "HARD", count: 4 },
      ctxFor(world.a.tenant.id, world.a.users.teacher.id),
    );
    expect(res.outcome).toBe("FALLBACK_BANK");
    expect(res.data.candidates.length).toBe(0); // nothing approved at HARD
    expect(res.shortfall).toBe(4);
  });

  it("writes one AIRequest provenance row per call and links it into each candidate", async () => {
    const before = await prisma.aIRequest.count({ where: { tenantId: world.a.tenant.id } });
    const res = await AIGateway.generateQuestions(
      { examType: "JEE_MAIN", subject: "PHYSICS", chapter: "Motion", concept: "Speed", difficulty: "MEDIUM", count: 2 },
      ctxFor(world.a.tenant.id, world.a.users.teacher.id),
    );
    const rows = await prisma.aIRequest.findMany({
      where: { tenantId: world.a.tenant.id, task: "question.generate" },
      orderBy: { createdAt: "desc" },
    });
    expect(await prisma.aIRequest.count({ where: { tenantId: world.a.tenant.id } })).toBe(before + 1);
    expect(rows[0].outcome).toBe("FALLBACK_BANK");
    expect(rows[0].provider).toBe("webpie-bank");
    expect(rows[0].createdById).toBe(world.a.users.teacher.id);
    for (const c of res.data.candidates) expect(c.provenance.aiRequestId).toBe(rows[0].id);
  });
});

describe("AI Gateway - report.parentSummary (AI-001)", () => {
  it("returns a template summary that restates authoritative numbers and records provenance", async () => {
    const res = await AIGateway.parentSummary(
      {
        studentName: "Aarav",
        examTitle: "Unit Test 3",
        score: 68,
        maxMarks: 100,
        rank: 4,
        totalStudents: 42,
        strongConcepts: ["Kinematics"],
        weakConcepts: ["Friction"],
        language: "mr",
      },
      ctxFor(world.a.tenant.id, world.a.users.teacher.id),
    );
    expect(res.outcome).toBe("FALLBACK_TEMPLATE");
    expect(res.data.language).toBe("mr");
    expect(res.data.text).toContain("Aarav");
    expect(res.data.text).toContain("68");
    const row = await prisma.aIRequest.findFirst({
      where: { tenantId: world.a.tenant.id, task: "report.parentSummary" },
      orderBy: { createdAt: "desc" },
    });
    expect(row?.outcome).toBe("FALLBACK_TEMPLATE");
    expect(res.data.provenance.aiRequestId).toBe(row?.id);
  });
});

describe("AI Gateway - output schemas reject malformed model output (AI-001)", () => {
  it("modelQuestionListSchema requires exactly four options", () => {
    const bad = [{ body: "q", options: [{ id: "A", text: "1" }], correctAnswer: "A", solution: "s" }];
    expect(modelQuestionListSchema.safeParse(bad).success).toBe(false);
  });

  it("generatedQuestionSchema rejects a correctAnswer not among the options", () => {
    const bad = {
      body: "q",
      options: [
        { id: "A", text: "1" },
        { id: "B", text: "2" },
      ],
      correctAnswer: "C",
      solution: "s",
      declaredDifficulty: "MEDIUM",
      concept: "Speed",
      subject: "PHYSICS",
      status: "AI_CANDIDATE",
      source: "MODEL",
      provenance: {
        provider: "google",
        model: "gemini-1.5-flash",
        promptTemplateId: "question.generate",
        promptTemplateVersion: "1.0.0",
        aiRequestId: "x",
      },
    };
    expect(generatedQuestionSchema.safeParse(bad).success).toBe(false);
  });
});

describe("AI Gateway - Teacher Copilot (AI-001, AC-018)", () => {
  const teacherCtx = () => ({
    tenantId: world.a.tenant.id,
    userId: world.a.users.teacher.id,
    role: "TEACHER",
    branchId: world.a.branch.id,
    traceId: `t-${Math.random().toString(36).slice(2)}`,
    scopes: world.a.users.teacher.scopes,
  });

  beforeAll(async () => {
    // in-scope weakness (student is enrolled in the teacher's assigned batch)
    await prisma.masteryScore.create({ data: {
      tenantId: world.a.tenant.id, studentId: world.a.student.id, subject: "PHYSICS", chapter: "Mechanics",
      concept: "Friction", score: 34, state: "WEAK",
    } });
    // out-of-scope weakness (sibling is in the unassigned batch)
    await prisma.masteryScore.create({ data: {
      tenantId: world.a.tenant.id, studentId: world.a.sibling.id, subject: "PHYSICS", chapter: "Optics",
      concept: "Refraction", score: 20, state: "CRITICAL",
    } });
  });

  it("AC-018: refuses a batch outside the teacher's assigned scope", async () => {
    await expect(
      AIGateway.copilotWeaknessPlan({ batchId: world.a.unassignedBatch.id }, teacherCtx()),
    ).rejects.toBeInstanceOf(AIScopeError);
  });

  it("builds a PROPOSED plan only from evidence inside scope, and writes no side effects", async () => {
    const before = await prisma.intervention.count({ where: { tenantId: world.a.tenant.id } });
    const res = await AIGateway.copilotWeaknessPlan({ batchId: world.a.batch.id }, teacherCtx());

    expect(res.data).not.toBeNull();
    const plan = res.data!;
    expect(plan.status).toBe("PROPOSED");
    expect(plan.topic).toBe("Friction"); // in-scope
    expect(plan.retrievalScope).toBe("TENANT_PRIVATE");
    expect(plan.recommendedActions.length).toBeGreaterThan(0);
    expect(JSON.stringify(plan)).not.toContain("Refraction"); // out-of-scope weakness never surfaces
    expect(await prisma.intervention.count({ where: { tenantId: world.a.tenant.id } })).toBe(before);

    const req = await prisma.aIRequest.findFirst({
      where: { tenantId: world.a.tenant.id, task: "copilot.query" },
      orderBy: { createdAt: "desc" },
    });
    expect(req).toMatchObject({ provider: "webpie-analytics" });
    expect(plan.aiRequestId).toBe(req!.id);
  });

  it("returns null when there is no weak concept in scope", async () => {
    const res = await AIGateway.copilotWeaknessPlan({ batchId: world.a.batch.id, subject: "CHEMISTRY" }, teacherCtx());
    expect(res.data).toBeNull();
  });

  it("an owner (no batch scopes) may query any batch in the tenant", async () => {
    const res = await AIGateway.copilotWeaknessPlan({ batchId: world.a.batch.id }, {
      tenantId: world.a.tenant.id, userId: world.a.users.owner.id, role: "OWNER", branchId: null,
      traceId: "owner-1", scopes: world.a.users.owner.scopes,
    });
    expect(res.data?.topic).toBe("Friction");
  });

  it("AC-015: cannot reach another tenant's batch", async () => {
    await expect(
      AIGateway.copilotWeaknessPlan({ batchId: world.b.batch.id }, {
        tenantId: world.a.tenant.id, userId: world.a.users.owner.id, role: "OWNER", branchId: null,
        traceId: "x", scopes: null,
      }),
    ).rejects.toBeInstanceOf(AIScopeError);
  });
});
