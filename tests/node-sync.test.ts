import { describe, it, expect, beforeAll } from "vitest";
import { AcademicNodeSyncService } from "../src/lib/sync/sync-service";
import { prisma } from "../src/lib/prisma";

describe("Windows Academic Node & Offline Sync Protocol (PRD Sec 33, 34, 35)", () => {
  let tenantId: string;
  let tenantCode: string;
  let examId: string;
  let studentRoll: string;
  let testNodeId: string;
  let pairingToken: string;

  beforeAll(async () => {
    const tenant = await prisma.tenant.findUnique({
      where: { code: "APEX_PUNE" },
      include: { branches: true },
    });
    tenantId = tenant!.id;
    tenantCode = tenant!.code;

    const exam = await prisma.exam.findFirst({
      where: { tenantId },
      include: { examQuestions: true },
    });
    examId = exam!.id;

    const student = await prisma.student.findFirst({
      where: { tenantId },
    });
    studentRoll = student!.rollNumber;
  });

  it("SYNC-001: Successfully pairs Windows Academic Node with tenant", async () => {
    const handshakeResult = await AcademicNodeSyncService.pairNode({
      tenantId,
      nodeCode: "PUNE-TEST-NODE-01",
      name: "Pune Lab 1 Windows Workstation",
      machineFingerprint: "WIN-UUID-4A8F-992C-TEST",
      ipAddress: "192.168.1.105",
      osVersion: "Windows 11 Pro 64-bit",
    });

    expect(handshakeResult.success).toBe(true);
    expect(handshakeResult.node).toBeDefined();
    expect(handshakeResult.node.nodeCode).toBe("PUNE-TEST-NODE-01");
    expect(handshakeResult.pairingToken).toMatch(/^node_[a-f0-9]{48}$/);

    testNodeId = handshakeResult.node.id;
    pairingToken = handshakeResult.pairingToken;
  });

  it("SYNC-002: Verifies node token and updates heartbeat", async () => {
    const node = await AcademicNodeSyncService.verifyNode(pairingToken);
    expect(node).not.toBeNull();
    expect(node?.id).toBe(testNodeId);
    expect(node?.status).toBe("ONLINE");

    // Invalid token must be rejected
    const invalidNode = await AcademicNodeSyncService.verifyNode("node_invalid_bogus_token");
    expect(invalidNode).toBeNull();
  });

  it("SYNC-003: Generates pull delta with complete exam and student rosters for offline store", async () => {
    const pullResult = await AcademicNodeSyncService.generatePullDelta(tenantId);

    expect(pullResult.tenantId).toBe(tenantId);
    expect(pullResult.delta.studentsCount).toBeGreaterThan(0);
    expect(pullResult.delta.examsCount).toBeGreaterThan(0);

    const pulledExam = pullResult.delta.exams.find((e) => e.id === examId);
    expect(pulledExam).toBeDefined();
    expect(pulledExam?.questions.length).toBeGreaterThan(0);
    expect(pulledExam?.questions[0].correctAnswer).toBeDefined();
  });

  it("SYNC-004: Ingests offline OMR scans, deterministically evaluates, and updates mastery", async () => {
    const pushPayload = {
      nodeId: testNodeId,
      tenantId,
      batchTimestamp: new Date().toISOString(),
      scans: [
        {
          examId,
          studentRollNumber: studentRoll,
          detectedResponses: {
            1: "A",
            2: "B",
            3: "C",
            4: "D",
            5: "14.2",
          },
          confidenceScores: {
            1: 0.99,
            2: 0.98,
            3: 0.95,
            4: 0.99,
            5: 0.97,
          },
          scannedAt: new Date().toISOString(),
        },
      ],
    };

    const pushResult = await AcademicNodeSyncService.ingestPushDelta(pushPayload);

    expect(pushResult.success).toBe(true);
    expect(pushResult.ingestedScansCount).toBe(1);
    expect(pushResult.evaluatedCount).toBeGreaterThan(0);

    // Verify student exam result was created in master database
    const student = await prisma.student.findFirst({
      where: { tenantId, rollNumber: studentRoll },
    });

    const result = await prisma.examResult.findFirst({
      where: { examId, studentId: student!.id },
    });

    expect(result).not.toBeNull();
    expect(result?.score).toBeDefined();
    expect(result?.cohortRank).toBeGreaterThanOrEqual(1);

    // Verify node stats were incremented
    const updatedNode = await prisma.academicNode.findUnique({
      where: { id: testNodeId },
    });
    expect(updatedNode?.offlineScansCount).toBeGreaterThan(0);
  });

  it("SYNC-005: Lists fleet nodes scoped to tenant", async () => {
    const nodes = await AcademicNodeSyncService.listNodes(tenantId);
    expect(nodes.length).toBeGreaterThan(0);
    const ourNode = nodes.find((n) => n.id === testNodeId);
    expect(ourNode).toBeDefined();
    expect(ourNode?.tenant.code).toBe(tenantCode);
  });
});
