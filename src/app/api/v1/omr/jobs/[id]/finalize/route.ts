import { NextRequest, NextResponse } from "next/server";
import { getSessionContext, createAuditLog } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeterministicEvaluationEngine, ExamQuestionConfig, StudentAttemptInput } from "@/lib/academic/evaluation-engine";
import { MasteryAlgorithmEngine, MasteryEvidenceItem } from "@/lib/academic/mastery-engine";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionContext(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const job = await prisma.oMRJob.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
      include: {
        exam: {
          include: {
            examQuestions: {
              include: { question: true },
              orderBy: { orderIndex: "asc" },
            },
          },
        },
        scans: {
          include: {
            job: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "OMR Job not found" }, { status: 404 });
    }

    const examQuestions: ExamQuestionConfig[] = job.exam.examQuestions.map((eq) => ({
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

    // Build student attempts
    const attempts: StudentAttemptInput[] = [];
    const scanMapByStudent: Record<string, any> = {};

    for (const scan of job.scans) {
      if (!scan.studentId) continue;
      const verified = scan.verifiedResponses ? JSON.parse(scan.verifiedResponses) : null;
      const detected = JSON.parse(scan.detectedResponses || "{}");
      const chosenResponsesByQNum = verified || detected;

      // Map question number to question ID
      const responsesByQId: Record<string, any> = {};
      for (const eq of job.exam.examQuestions) {
        const ans = chosenResponsesByQNum[eq.orderIndex];
        if (ans) {
          responsesByQId[eq.questionId] = ans;
        }
      }

      attempts.push({
        studentId: scan.studentId,
        rollNumber: scan.detectedRollNumber || "UNKNOWN",
        responses: responsesByQId,
      });

      scanMapByStudent[scan.studentId] = scan;
    }

    // Run Deterministic Evaluation
    const evaluatedResults = DeterministicEvaluationEngine.evaluateCohort(examQuestions, attempts);

    // Save Exam Results & Mastery Evidence
    for (const evalRes of evaluatedResults) {
      await prisma.examResult.upsert({
        where: {
          examId_studentId_version: {
            examId: job.examId,
            studentId: evalRes.studentId,
            version: 1,
          },
        },
        create: {
          tenantId: session.tenantId,
          examId: job.examId,
          studentId: evalRes.studentId,
          batchId: job.batchId,
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
          isFinal: true,
        },
        update: {
          score: evalRes.totalMarks,
          accuracyPercentage: evalRes.accuracyPercentage,
          cohortRank: evalRes.cohortRank,
          cohortPercentile: evalRes.cohortPercentile,
          questionResponses: JSON.stringify(evalRes.questionDetails),
        },
      });

      // Insert Mastery Evidence
      for (const qDetail of evalRes.questionDetails) {
        await prisma.masteryEvidence.create({
          data: {
            tenantId: session.tenantId,
            studentId: evalRes.studentId,
            concept: qDetail.concept,
            examId: job.examId,
            questionId: qDetail.questionId,
            wasCorrect: qDetail.status === "CORRECT",
            difficultyWeight: 1.5,
            recencyWeight: 1.0,
          },
        });

        // Recalculate Mastery Score for this concept
        const allConceptEvidences = await prisma.masteryEvidence.findMany({
          where: {
            tenantId: session.tenantId,
            studentId: evalRes.studentId,
            concept: qDetail.concept,
          },
        });

        const masteryInput: MasteryEvidenceItem[] = allConceptEvidences.map((e) => ({
          questionId: e.questionId,
          concept: e.concept,
          subject: qDetail.subject,
          chapter: "Unit",
          wasCorrect: e.wasCorrect,
          difficulty: "MEDIUM",
          timestamp: e.timestamp,
        }));

        const masteryCalc = MasteryAlgorithmEngine.calculateConceptMastery(qDetail.concept, masteryInput);

        await prisma.masteryScore.upsert({
          where: {
            studentId_concept: {
              studentId: evalRes.studentId,
              concept: qDetail.concept,
            },
          },
          create: {
            tenantId: session.tenantId,
            studentId: evalRes.studentId,
            subject: qDetail.subject,
            chapter: "Unit",
            concept: qDetail.concept,
            score: masteryCalc.score,
            state: masteryCalc.state,
            confidence: masteryCalc.confidence,
            totalAttempts: masteryCalc.totalAttempts,
            correctAttempts: masteryCalc.correctAttempts,
          },
          update: {
            score: masteryCalc.score,
            state: masteryCalc.state,
            confidence: masteryCalc.confidence,
            totalAttempts: masteryCalc.totalAttempts,
            correctAttempts: masteryCalc.correctAttempts,
          },
        });
      }
    }

    // Mark job and exam finalized
    await prisma.oMRJob.update({
      where: { id: job.id },
      data: {
        status: "FINALIZED",
        finalizedAt: new Date(),
      },
    });

    await prisma.exam.update({
      where: { id: job.examId },
      data: {
        status: "EVALUATED",
      },
    });

    await createAuditLog({
      tenantId: session.tenantId,
      userId: session.userId,
      action: "EXAM_FINALIZED",
      entityType: "Exam",
      entityId: job.examId,
      details: { jobId: job.id, evaluatedCount: evaluatedResults.length },
    });

    return NextResponse.json({
      success: true,
      evaluatedCount: evaluatedResults.length,
      results: evaluatedResults,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
