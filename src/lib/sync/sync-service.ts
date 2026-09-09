import { prisma } from "../prisma";
import crypto from "crypto";
import { DeterministicEvaluationEngine, ExamQuestionConfig, StudentAttemptInput } from "../academic/evaluation-engine";
import { MasteryAlgorithmEngine } from "../academic/mastery-engine";
import { createAuditLog } from "../auth";

export interface NodePairingRequest {
  tenantId: string;
  branchId?: string | null;
  nodeCode: string;
  name: string;
  machineFingerprint: string;
  ipAddress?: string;
  osVersion?: string;
}

export interface OfflinePushPayload {
  nodeId: string;
  tenantId: string;
  batchTimestamp: string;
  scans: Array<{
    examId: string;
    studentRollNumber: string;
    detectedResponses: Record<number, string>;
    confidenceScores: Record<number, number>;
    manualOverrides?: Record<number, string>;
    scannedAt: string;
  }>;
  attendanceRecords?: Array<{
    batchId: string;
    date: string;
    records: Array<{ studentId: string; status: string }>;
  }>;
}

export class AcademicNodeSyncService {
  /**
   * PRD Sec 33: Node Pairing Handshake
   * Authenticates local Windows PC and registers it in the tenant fleet
   */
  static async pairNode(data: NodePairingRequest) {
    const pairingToken = `node_${crypto.randomBytes(24).toString("hex")}`;
    const tokenExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365); // 1 year

    const node = await prisma.academicNode.upsert({
      where: {
        tenantId_nodeCode: {
          tenantId: data.tenantId,
          nodeCode: data.nodeCode.toUpperCase().trim(),
        },
      },
      create: {
        tenantId: data.tenantId,
        branchId: data.branchId || null,
        nodeCode: data.nodeCode.toUpperCase().trim(),
        name: data.name,
        machineFingerprint: data.machineFingerprint,
        ipAddress: data.ipAddress || "127.0.0.1",
        osVersion: data.osVersion || "Windows 11 (64-bit)",
        pairingToken,
        tokenExpiresAt,
        status: "ONLINE",
        lastSeenAt: new Date(),
        syncEngineState: "IDLE",
      },
      update: {
        name: data.name,
        machineFingerprint: data.machineFingerprint,
        ipAddress: data.ipAddress || "127.0.0.1",
        osVersion: data.osVersion || "Windows 11 (64-bit)",
        pairingToken,
        tokenExpiresAt,
        status: "ONLINE",
        lastSeenAt: new Date(),
      },
      include: {
        tenant: true,
        branch: true,
      },
    });

    await createAuditLog({
      tenantId: data.tenantId,
      action: "ACADEMIC_NODE_PAIRED",
      entityType: "AcademicNode",
      entityId: node.id,
      details: {
        nodeCode: node.nodeCode,
        machineFingerprint: data.machineFingerprint,
      },
    });

    return {
      success: true,
      node: {
        id: node.id,
        nodeCode: node.nodeCode,
        name: node.name,
        tenantCode: node.tenant.code,
        branchName: node.branch?.name || "Main Campus",
        status: node.status,
      },
      pairingToken,
    };
  }

  /**
   * Verifies node authorization token and updates heartbeat
   */
  static async verifyNode(pairingToken: string) {
    const node = await prisma.academicNode.findUnique({
      where: { pairingToken },
      include: { tenant: true, branch: true },
    });

    if (!node) return null;
    if (node.revokedAt || (node.tokenExpiresAt && node.tokenExpiresAt <= new Date())) return null;

    // Heartbeat update
    await prisma.academicNode.update({
      where: { id: node.id },
      data: {
        lastSeenAt: new Date(),
        status: "ONLINE",
      },
    });

    return node;
  }

  /**
   * PRD Sec 34: Pull Delta
   * Delivers latest curriculum, active exams, blueprints, answer keys, and student rosters to the offline node
   */
  static async generatePullDelta(tenantId: string, since?: Date) {
    const whereFilter = since ? { tenantId, updatedAt: { gte: since } } : { tenantId };

    const students = await prisma.student.findMany({
      where: { tenantId },
      include: { enrollments: true },
    });

    const exams = await prisma.exam.findMany({
      where: { tenantId },
      include: {
        examQuestions: {
          include: { question: true },
        },
      },
    });

    const batches = await prisma.batch.findMany({
      where: { tenantId },
    });

    return {
      tenantId,
      generatedAt: new Date().toISOString(),
      delta: {
        studentsCount: students.length,
        examsCount: exams.length,
        batchesCount: batches.length,
        students: students.map((s) => ({
          id: s.id,
          rollNumber: s.rollNumber,
          name: s.name,
          targetExam: s.targetExam,
          enrollments: s.enrollments,
        })),
        exams: exams.map((e) => ({
          id: e.id,
          code: e.code,
          title: e.title,
          examType: e.examType,
          durationMinutes: e.durationMinutes,
          totalMarks: e.totalMarks,
          totalQuestions: e.totalQuestions,
          markingRules: JSON.parse(e.markingRules || "{}"),
          blueprint: JSON.parse(e.blueprint || "{}"),
          questions: e.examQuestions.map((eq) => ({
            questionId: eq.questionId,
            orderIndex: eq.orderIndex,
            section: eq.sectionName,
            marks: eq.marksCorrect,
            negativeMarks: eq.marksIncorrect,
            correctAnswer: eq.question.correctAnswer,
            tolerance: eq.question.numericalTolerance,
            subject: eq.question.subject,
            chapter: eq.question.chapter,
            concept: eq.question.concept,
            difficulty: eq.question.declaredDifficulty,
          })),
        })),
        batches,
      },
    };
  }

  /**
   * PRD Sec 34 & 35: Ingest Push Delta
   * Ingests offline OMR scans, evaluates them deterministically, and updates master analytics
   */
  static async ingestPushDelta(payload: OfflinePushPayload) {
    const { nodeId, tenantId, scans, attendanceRecords } = payload;

    // Verify node exists
    const node = await prisma.academicNode.findUnique({ where: { id: nodeId } });
    if (!node || node.tenantId !== tenantId) {
      throw new Error("Invalid Academic Node context");
    }

    let ingestedScansCount = 0;
    const evaluatedResults: any[] = [];

    // Group scans by examId
    const scansByExam = new Map<string, typeof scans>();
    for (const scan of scans) {
      const list = scansByExam.get(scan.examId) || [];
      list.push(scan);
      scansByExam.set(scan.examId, list);
    }

    for (const [examId, examScans] of Array.from(scansByExam.entries())) {
      const exam = await prisma.exam.findUnique({
        where: { id: examId },
        include: {
          examQuestions: {
            include: { question: true },
            orderBy: { orderIndex: "asc" },
          },
        },
      });

      if (!exam) continue;

      const examQuestions: ExamQuestionConfig[] = exam.examQuestions.map((eq) => ({
        id: eq.id,
        questionId: eq.questionId,
        sectionName: eq.sectionName,
        type: eq.question.type as any,
        subject: eq.question.subject,
        concept: eq.question.concept,
        correctAnswer: JSON.parse(eq.question.correctAnswer || `""`),
        marksCorrect: eq.marksCorrect,
        marksIncorrect: eq.marksIncorrect,
      }));

      // Create an OMRJob representing this synced batch
      const job = await prisma.oMRJob.create({
        data: {
          tenantId,
          examId,
          status: "COMPLETED",
          totalSheets: examScans.length,
          processedSheets: examScans.length,
          createdAt: new Date(),
        },
      });

      const attempts: StudentAttemptInput[] = [];

      for (const scan of examScans) {
        const student = await prisma.student.findFirst({
          where: { tenantId, rollNumber: scan.studentRollNumber },
        });

        if (!student) continue;

        const effectiveResponses = {
          ...scan.detectedResponses,
          ...(scan.manualOverrides || {}),
        };

        // Create OMRScan record
        await prisma.oMRScan.create({
          data: {
            jobId: job.id,
            studentId: student.id,
            sheetImageUrl: `offline_node_${node.nodeCode}_${Date.now()}`,
            detectedRollNumber: scan.studentRollNumber,
            confidenceScore: 0.98,
            status: scan.manualOverrides ? "OVERRIDDEN" : "CONFIDENT",
            detectedResponses: JSON.stringify(scan.detectedResponses),
            verifiedResponses: JSON.stringify(effectiveResponses),
            ambiguityFlags: null,
          },
        });

        // Map question number to question ID
        const responsesByQId: Record<string, any> = {};
        for (const eq of exam.examQuestions) {
          const ans = effectiveResponses[eq.orderIndex];
          if (ans !== undefined) {
            responsesByQId[eq.questionId] = ans;
          }
        }

        attempts.push({
          studentId: student.id,
          rollNumber: scan.studentRollNumber,
          responses: responsesByQId,
        });

        ingestedScansCount++;
      }

      // Compute Cohort Ranks & Percentiles
      if (attempts.length > 0) {
        const evaluatedCohort = DeterministicEvaluationEngine.evaluateCohort(examQuestions, attempts);

        for (const evalRes of evaluatedCohort) {
          const resRecord = await prisma.examResult.upsert({
            where: {
              examId_studentId_version: {
                examId,
                studentId: evalRes.studentId,
                version: 1,
              },
            },
            create: {
              tenantId,
              examId,
              studentId: evalRes.studentId,
              score: evalRes.totalMarks,
              maximumMarks: evalRes.maximumMarks,
              accuracyPercentage: evalRes.accuracyPercentage,
              totalAttempted: evalRes.totalAttempted,
              totalCorrect: evalRes.totalCorrect,
              totalIncorrect: evalRes.totalIncorrect,
              totalUnattempted: evalRes.totalUnattempted,
              negativeMarksDeducted: evalRes.negativeMarksDeducted,
              cohortRank: evalRes.cohortRank,
              cohortPercentile: evalRes.cohortPercentile,
              subjectScores: JSON.stringify(evalRes.subjectScores),
              questionResponses: JSON.stringify(evalRes.questionDetails),
            },
            update: {
              score: evalRes.totalMarks,
              maximumMarks: evalRes.maximumMarks,
              accuracyPercentage: evalRes.accuracyPercentage,
              totalAttempted: evalRes.totalAttempted,
              totalCorrect: evalRes.totalCorrect,
              totalIncorrect: evalRes.totalIncorrect,
              totalUnattempted: evalRes.totalUnattempted,
              negativeMarksDeducted: evalRes.negativeMarksDeducted,
              cohortRank: evalRes.cohortRank,
              cohortPercentile: evalRes.cohortPercentile,
              subjectScores: JSON.stringify(evalRes.subjectScores),
              questionResponses: JSON.stringify(evalRes.questionDetails),
            },
          });
          evaluatedResults.push(resRecord);

          // Update student longitudinal mastery evidence
          for (const detail of evalRes.questionDetails) {
            await prisma.masteryEvidence.create({
              data: {
                tenantId,
                studentId: evalRes.studentId,
                concept: detail.concept,
                examId,
                questionId: detail.questionId,
                wasCorrect: detail.status === "CORRECT",
                difficultyWeight: 1.5,
                recencyWeight: 1.0,
              },
            });
          }
        }
      }
    }

    // Ingest offline attendance if provided
    if (attendanceRecords && attendanceRecords.length > 0) {
      let branchId = node.branchId;
      if (!branchId) {
        const fallbackBranch = await prisma.branch.findFirst({ where: { tenantId } });
        branchId = fallbackBranch?.id || "default_branch";
      }

      for (const att of attendanceRecords) {
        const sessionDate = att.date || new Date().toISOString().split("T")[0];
        const attSession = await prisma.attendanceSession.upsert({
          where: {
            batchId_sessionDate: {
              batchId: att.batchId,
              sessionDate,
            },
          },
          create: {
            tenantId,
            branchId,
            batchId: att.batchId,
            sessionDate,
            topicCovered: "Offline Node Session",
          },
          update: {},
        });

        for (const rec of att.records) {
          await prisma.attendanceRecord.upsert({
            where: {
              sessionId_studentId: {
                sessionId: attSession.id,
                studentId: rec.studentId,
              },
            },
            create: {
              sessionId: attSession.id,
              studentId: rec.studentId,
              status: rec.status,
              source: "OFFLINE_NODE",
            },
            update: {
              status: rec.status,
              source: "OFFLINE_NODE",
            },
          });
        }
      }
    }

    // Update AcademicNode stats
    await prisma.academicNode.update({
      where: { id: nodeId },
      data: {
        lastSyncAt: new Date(),
        offlineScansCount: { increment: ingestedScansCount },
        syncEngineState: "IDLE",
        status: "ONLINE",
      },
    });

    await createAuditLog({
      tenantId,
      action: "NODE_OFFLINE_SYNC",
      entityType: "AcademicNode",
      entityId: nodeId,
      details: {
        ingestedScansCount,
        evaluatedCount: evaluatedResults.length,
      },
    });

    return {
      success: true,
      ingestedScansCount,
      evaluatedCount: evaluatedResults.length,
      syncedAt: new Date().toISOString(),
    };
  }

  /**
   * Lists fleet nodes for Super Admin and Institute Owner
   */
  static async listNodes(tenantId?: string) {
    return prisma.academicNode.findMany({
      where: tenantId ? { tenantId } : undefined,
      include: {
        tenant: { select: { name: true, code: true } },
        branch: { select: { name: true, code: true, city: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }
}
