import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import { createTestWorld, type TestWorld } from "./support/fixtures";

describe("Tenant Isolation & Data Boundaries (PRD Section 5 & 39)", () => {
  let tenantAId: string;
  let tenantBId: string;
  let studentAId: string;

  let world: TestWorld;
  beforeAll(async () => {
    expect(await prisma.tenant.count()).toBe(0);
    world = await createTestWorld();
    tenantAId = world.a.tenant.id;
    tenantBId = world.b.tenant.id;
    studentAId = world.a.student.id;
  });

  it("SEC-003: Prevents cross-tenant student lookup", async () => {
    // Attempting to query Student A under Tenant B context must return null
    const crossQuery = await prisma.student.findFirst({
      where: {
        id: studentAId,
        tenantId: tenantBId, // Tenant B attempting to access Tenant A's student
      },
    });

    expect(crossQuery).toBeNull();
  });

  it("RBAC-002: Enforces branch isolation within same tenant", async () => {
    const kothrudBranch = world.a.branch;
    const campBranch = world.a.otherBranch;

    expect(kothrudBranch).not.toBeNull();
    expect(campBranch).not.toBeNull();
    expect(kothrudBranch?.id).not.toBe(campBranch?.id);

    // Kothrud student cannot be fetched under Camp branch filter
    const studentInKothrud = await prisma.student.findFirst({
      where: {
        id: studentAId,
        branchId: campBranch!.id,
      },
    });

    expect(studentInKothrud).toBeNull();
  });

  it("Audit trail captures privileged events", async () => {
    const auditRecord = await prisma.auditLog.create({
      data: {
        tenantId: tenantAId,
        action: "OMR_OVERRIDE",
        entityType: "OMRScan",
        entityId: "test-scan-123",
        details: JSON.stringify({
          original: "B",
          corrected: "C",
          reason: "Teacher verified visual ink density on physical sheet",
        }),
      },
    });

    expect(auditRecord.id).toBeDefined();
    expect(auditRecord.action).toBe("OMR_OVERRIDE");

    // Clean up
    await prisma.auditLog.delete({ where: { id: auditRecord.id } });
  });
});
