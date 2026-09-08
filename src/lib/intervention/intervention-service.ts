import { prisma } from "../prisma";
import { MasteryAlgorithmEngine } from "../academic/mastery-engine";

export interface CreateInterventionParams {
  tenantId: string;
  branchId?: string;
  concept: string;
  studentIds: string[];
  priority?: "CRITICAL" | "HIGH" | "MEDIUM";
  createdById?: string;
}

export class InterventionService {
  /**
   * Scans exam results or mastery scores to identify students struggling with concepts
   */
  public static async detectWeaknessQueue(tenantId: string) {
    const weakScores = await prisma.masteryScore.findMany({
      where: {
        tenantId,
        state: { in: ["CRITICAL", "WEAK"] },
      },
      include: {
        student: true,
      },
      orderBy: { score: "asc" },
    });

    // Group students by concept
    const conceptClusters: Record<
      string,
      {
        concept: string;
        subject: string;
        chapter: string;
        averageScore: number;
        students: { id: string; name: string; rollNumber: string; score: number }[];
      }
    > = {};

    for (const item of weakScores) {
      if (!conceptClusters[item.concept]) {
        conceptClusters[item.concept] = {
          concept: item.concept,
          subject: item.subject,
          chapter: item.chapter,
          averageScore: 0,
          students: [],
        };
      }

      conceptClusters[item.concept].students.push({
        id: item.student.id,
        name: item.student.name,
        rollNumber: item.student.rollNumber,
        score: item.score,
      });
    }

    // Compute averages
    return Object.values(conceptClusters).map((cluster) => {
      const avg =
        cluster.students.reduce((acc, s) => acc + s.score, 0) / (cluster.students.length || 1);
      return {
        ...cluster,
        averageScore: Math.round(avg * 10) / 10,
        priority: avg < 30 ? "CRITICAL" : "HIGH",
      };
    });
  }

  /**
   * Creates a formal intervention with practice ladder
   */
  public static async createIntervention(params: CreateInterventionParams) {
    // 1. Fetch practice questions for this concept: 2 Foundation, 2 Application, 1 Exam-Level
    const practiceQuestions = await prisma.question.findMany({
      where: {
        concept: params.concept,
      },
      take: 6,
    });

    const practiceLadder = practiceQuestions.map((q, idx) => ({
      orderIndex: idx + 1,
      tier: idx < 2 ? "Foundation" : idx < 4 ? "Application" : "Exam-Level",
      questionId: q.id,
      body: q.body,
      options: JSON.parse(q.options || "[]"),
    }));

    return prisma.intervention.create({
      data: {
        tenantId: params.tenantId,
        branchId: params.branchId,
        title: `Remedial Sprint: ${params.concept}`,
        concept: params.concept,
        studentIds: JSON.stringify(params.studentIds),
        priority: params.priority || "HIGH",
        status: "ASSIGNED",
        practiceLadder: JSON.stringify(practiceLadder),
        createdById: params.createdById,
      },
    });
  }

  /**
   * Resolves intervention after verifying re-test evidence (PRD INT-003: Cannot claim success without verification)
   */
  public static async verifyAndResolveIntervention(
    interventionId: string,
    retestResults: { studentId: string; newScore: number }[]
  ) {
    const intervention = await prisma.intervention.findUnique({
      where: { id: interventionId },
    });

    if (!intervention) throw new Error("Intervention not found");

    const avgNewScore =
      retestResults.reduce((acc, r) => acc + r.newScore, 0) / (retestResults.length || 1);

    const isResolved = avgNewScore >= 60.0;

    return prisma.intervention.update({
      where: { id: interventionId },
      data: {
        status: isResolved ? "RESOLVED" : "IN_PROGRESS",
        afterMasteryAvg: Math.round(avgNewScore * 10) / 10,
        resolvedAt: isResolved ? new Date() : null,
      },
    });
  }
}
