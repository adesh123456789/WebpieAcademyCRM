import { prisma } from "../../src/lib/prisma";
import { hashPassword } from "../../src/lib/auth";
import { inject } from "vitest";
import { relative, isAbsolute } from "node:path";

export const TEST_PASSWORD = "synthetic-test-password";

/** Explicit fixtures, never a demo seed/reset. IDs deliberately differ across account/profile entities. */
export async function createTestWorld() {
  const url = process.env.DATABASE_URL ?? "";
  const path = url.startsWith("file:") ? relative(inject("testDirectory"), url.slice(5)) : "..";
  if (!path || path.startsWith("..") || isAbsolute(path)) {
    throw new Error("Synthetic fixtures require the isolated Vitest database");
  }
  const passwordHash = await hashPassword(TEST_PASSWORD);
  async function createTenant(code: string, type = "INSTITUTE") {
    const tenant = await prisma.tenant.create({ data: { name: `Synthetic ${code}`, code, type } });
    const branch = await prisma.branch.create({ data: { tenantId: tenant.id, code: "MAIN", name: "Main" } });
    const otherBranch = await prisma.branch.create({ data: { tenantId: tenant.id, code: "OTHER", name: "Other" } });
    const course = await prisma.course.create({ data: {
      tenantId: tenant.id, name: "Synthetic course", code: "COURSE", examType: "JEE_MAIN",
      gradeClass: "12", academicYear: "2026-2027",
    } });
    async function makeBatch(branchId: string, code: string) {
      return prisma.batch.create({ data: { tenantId: tenant.id, branchId, courseId: course.id, name: code, code } });
    }
    const batch = await makeBatch(branch.id, "ASSIGNED");
    const unassignedBatch = await makeBatch(branch.id, "UNASSIGNED");
    const otherBatch = await makeBatch(otherBranch.id, "OTHER");
    async function makeStudent(branchId: string, batchId: string, rollNumber: string) {
      const student = await prisma.student.create({ data: {
        tenantId: tenant.id, branchId, rollNumber, name: `Synthetic ${rollNumber}`,
        email: `${rollNumber}@${code.toLowerCase()}.test`,
      } });
      await prisma.enrollment.create({ data: { studentId: student.id, courseId: course.id, batchId } });
      return student;
    }
    // Repeated roll numbers across tenants exercise tenant-qualified lookups.
    const student = await makeStudent(branch.id, batch.id, "260001");
    const sibling = await makeStudent(branch.id, unassignedBatch.id, "260002");
    const otherStudent = await makeStudent(otherBranch.id, otherBatch.id, "260003");
    const parent = await prisma.parent.create({ data: {
      tenantId: tenant.id, name: "Synthetic parent", phone: "0000000000", email: `parent@${code.toLowerCase()}.test`,
      studentLinks: { create: [{ studentId: student.id }, { studentId: sibling.id }] },
    } });
    async function makeUser(role: string, branchId: string | null = branch.id, email?: string) {
      return prisma.user.create({ data: {
        tenantId: tenant.id, branchId, name: `Synthetic ${role}`, role, passwordHash,
        email: email ?? `${role.toLowerCase()}@${code.toLowerCase()}.test`,
        scopes: role === "TEACHER" ? JSON.stringify({ batchIds: [batch.id] }) : null,
      } });
    }
    const users = {
      owner: await makeUser(type === "INDIVIDUAL_TEACHER" ? "INDIVIDUAL_TEACHER" : "OWNER", null),
      branchAdmin: await makeUser("BRANCH_ADMIN"), teacher: await makeUser("TEACHER"),
      counsellor: await makeUser("COUNSELLOR"), accountant: await makeUser("ACCOUNTANT"),
      student: await makeUser("STUDENT", branch.id, student.email!),
      parent: await makeUser("PARENT", branch.id, parent.email!),
    };
    const question = await prisma.question.create({ data: {
      tenantId: tenant.id, code: `${code}-Q1`, ownerScope: "TENANT_PRIVATE", subject: "PHYSICS",
      chapter: "Motion", topic: "Speed", concept: "Speed", body: "Synthetic question",
      options: JSON.stringify([{ id: "A", text: "1" }, { id: "B", text: "2" }]),
      correctAnswer: JSON.stringify("A"), solution: "Synthetic solution",
    } });
    const exam = await prisma.exam.create({ data: {
      tenantId: tenant.id, branchId: branch.id, title: "Synthetic exam", code: "EXAM",
      examType: "JEE_MAIN", batchIds: JSON.stringify([batch.id]), blueprint: "{}",
      markingRules: JSON.stringify({ correct: 4, incorrect: -1, unattempted: 0 }),
      totalQuestions: 1, totalMarks: 4, status: "FINALIZED", isCbtEnabled: true,
      examQuestions: { create: { questionId: question.id, sectionName: "Physics", orderIndex: 1 } },
    } });
    const feePlan = await prisma.feePlan.create({ data: {
      tenantId: tenant.id, studentId: student.id, grossAmount: 1000, netAmount: 1000,
    } });
    return { tenant, branch, otherBranch, course, batch, unassignedBatch, otherBatch,
      student, sibling, otherStudent, parent, users, question, exam, feePlan };
  }
  return { a: await createTenant("TEST_A"), b: await createTenant("TEST_B", "INDIVIDUAL_TEACHER") };
}

export type TestWorld = Awaited<ReturnType<typeof createTestWorld>>;
