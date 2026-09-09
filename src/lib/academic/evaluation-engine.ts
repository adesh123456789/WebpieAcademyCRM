export interface ExamQuestionConfig {
  id: string;
  questionId: string;
  sectionName: string;
  type: "SINGLE_CORRECT" | "MULTIPLE_CORRECT" | "NUMERICAL" | "ASSERTION_REASON";
  subject: string;
  concept: string;
  correctAnswer: any; // "A" | ["A", "C"] | 14.5 | "TRUE"
  numericalTolerance?: number;
  marksCorrect: number;
  marksIncorrect: number;
  /** Optional profile-specific multiple-correct matrix. */
  multipleCorrectPolicy?: { partialMarks: number; wrongMarks: number };
}

export interface StudentAttemptInput {
  studentId: string;
  rollNumber: string;
  responses: Record<string, any>; // questionId -> answer chosen
}

export interface QuestionGradingDetail {
  questionId: string;
  subject: string;
  concept: string;
  type: string;
  userAnswer: any;
  correctAnswer: any;
  status: "CORRECT" | "INCORRECT" | "UNATTEMPTED" | "PARTIALLY_CORRECT";
  marksAwarded: number;
}

export interface StudentEvaluationResult {
  studentId: string;
  rollNumber: string;
  totalMarks: number;
  maximumMarks: number;
  accuracyPercentage: number;
  totalAttempted: number;
  totalCorrect: number;
  totalIncorrect: number;
  totalUnattempted: number;
  negativeMarksDeducted: number;
  cohortRank: number;
  cohortPercentile: number;
  subjectScores: Record<string, { score: number; max: number; attempted: number; correct: number }>;
  questionDetails: QuestionGradingDetail[];
}

/**
 * Deterministic Authoritative Evaluation Engine (PRD Section 27)
 */
export class DeterministicEvaluationEngine {
  /**
   * Grades a single question response based on question type and marking scheme
   */
  public static gradeResponse(
    q: ExamQuestionConfig,
    userAnswer: any,
    policy = q.multipleCorrectPolicy,
  ): { status: QuestionGradingDetail["status"]; marksAwarded: number } {
    // Check if unattempted
    if (
      userAnswer === undefined ||
      userAnswer === null ||
      userAnswer === "" ||
      (Array.isArray(userAnswer) && userAnswer.length === 0)
    ) {
      return { status: "UNATTEMPTED", marksAwarded: 0 };
    }

    if (q.type === "SINGLE_CORRECT" || q.type === "ASSERTION_REASON") {
      const isCorrect = String(userAnswer).trim().toUpperCase() === String(q.correctAnswer).trim().toUpperCase();
      if (isCorrect) {
        return { status: "CORRECT", marksAwarded: q.marksCorrect };
      } else {
        return { status: "INCORRECT", marksAwarded: q.marksIncorrect };
      }
    }

    if (q.type === "NUMERICAL") {
      const userNum = parseFloat(String(userAnswer).trim());
      const correctNum = parseFloat(String(q.correctAnswer).trim());
      const tolerance = q.numericalTolerance ?? 0.01;

      if (!isNaN(userNum) && !isNaN(correctNum) && Math.abs(userNum - correctNum) <= tolerance) {
        return { status: "CORRECT", marksAwarded: q.marksCorrect };
      } else {
        return { status: "INCORRECT", marksAwarded: q.marksIncorrect };
      }
    }

    if (q.type === "MULTIPLE_CORRECT") {
      // Multiple correct format: JEE Advanced partial marking rule
      const userArr = Array.isArray(userAnswer) ? userAnswer.map(String).map((s) => s.toUpperCase().trim()) : [String(userAnswer).toUpperCase().trim()];
      const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer.map(String).map((s) => s.toUpperCase().trim()) : [String(q.correctAnswer).toUpperCase().trim()];

      // Any wrong choice selected yields negative marks
      const hasWrong = userArr.some((ans) => !correctArr.includes(ans));
      if (hasWrong) {
        return { status: "INCORRECT", marksAwarded: policy?.wrongMarks ?? q.marksIncorrect };
      }

      // If exactly matches all correct answers
      const allSelected = correctArr.every((ans) => userArr.includes(ans));
      if (allSelected && userArr.length === correctArr.length) {
        return { status: "CORRECT", marksAwarded: q.marksCorrect };
      }

      // Partial marking: +1 mark per correct option if no incorrect option was chosen
      if (userArr.length > 0) {
        const partialMarks = policy?.partialMarks ?? Math.min(userArr.length, q.marksCorrect - 1);
        return { status: "PARTIALLY_CORRECT", marksAwarded: partialMarks };
      }
    }

    return { status: "INCORRECT", marksAwarded: q.marksIncorrect };
  }

  /**
   * Evaluates an entire cohort of students deterministically, assigning cohort ranks and percentiles
   */
  public static evaluateCohort(
    questions: ExamQuestionConfig[],
    attempts: StudentAttemptInput[],
    options?: { multipleCorrectPolicy?: { partialMarks: number; wrongMarks: number } },
  ): StudentEvaluationResult[] {
    const maximumMarks = questions.reduce((acc, q) => acc + q.marksCorrect, 0);

    const preliminaryResults = attempts.map((attempt) => {
      let totalMarks = 0;
      let totalAttempted = 0;
      let totalCorrect = 0;
      let totalIncorrect = 0;
      let totalUnattempted = 0;
      let negativeMarksDeducted = 0;

      const subjectScores: Record<string, { score: number; max: number; attempted: number; correct: number }> = {};
      const questionDetails: QuestionGradingDetail[] = [];

      for (const q of questions) {
        if (!subjectScores[q.subject]) {
          subjectScores[q.subject] = { score: 0, max: 0, attempted: 0, correct: 0 };
        }
        subjectScores[q.subject].max += q.marksCorrect;

        const userAns = attempt.responses[q.questionId];
        const { status, marksAwarded } = this.gradeResponse(q, userAns, options?.multipleCorrectPolicy ?? q.multipleCorrectPolicy);

        if (status === "CORRECT") {
          totalCorrect++;
          totalAttempted++;
          subjectScores[q.subject].correct++;
          subjectScores[q.subject].attempted++;
        } else if (status === "PARTIALLY_CORRECT") {
          totalAttempted++;
          subjectScores[q.subject].attempted++;
        } else if (status === "INCORRECT") {
          totalIncorrect++;
          totalAttempted++;
          subjectScores[q.subject].attempted++;
          if (marksAwarded < 0) {
            negativeMarksDeducted += Math.abs(marksAwarded);
          }
        } else {
          totalUnattempted++;
        }

        totalMarks += marksAwarded;
        subjectScores[q.subject].score += marksAwarded;

        questionDetails.push({
          questionId: q.questionId,
          subject: q.subject,
          concept: q.concept,
          type: q.type,
          userAnswer: userAns ?? null,
          correctAnswer: q.correctAnswer,
          status,
          marksAwarded,
        });
      }

      const accuracyPercentage = totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0;

      return {
        studentId: attempt.studentId,
        rollNumber: attempt.rollNumber,
        totalMarks: Math.round(totalMarks * 100) / 100,
        maximumMarks,
        accuracyPercentage: Math.round(accuracyPercentage * 100) / 100,
        totalAttempted,
        totalCorrect,
        totalIncorrect,
        totalUnattempted,
        negativeMarksDeducted: Math.round(negativeMarksDeducted * 100) / 100,
        cohortRank: 1,
        cohortPercentile: 100.0,
        subjectScores,
        questionDetails,
      };
    });

    // Deterministic Tie-Breaking Policy (PRD EVAL-005):
    // 1. Higher totalMarks
    // 2. Fewer negativeMarksDeducted
    // 3. Higher subject marks (MATHEMATICS/BIOLOGY -> PHYSICS -> CHEMISTRY)
    // 4. Stable sort by rollNumber
    preliminaryResults.sort((a, b) => {
      if (b.totalMarks !== a.totalMarks) {
        return b.totalMarks - a.totalMarks;
      }
      if (a.negativeMarksDeducted !== b.negativeMarksDeducted) {
        return a.negativeMarksDeducted - b.negativeMarksDeducted; // fewer negative is better
      }
      // Subject priority
      const getSubjectScore = (res: typeof a, subj: string) => res.subjectScores[subj]?.score ?? 0;
      const aMathBio = getSubjectScore(a, "MATHEMATICS") || getSubjectScore(a, "BIOLOGY");
      const bMathBio = getSubjectScore(b, "MATHEMATICS") || getSubjectScore(b, "BIOLOGY");
      if (bMathBio !== aMathBio) return bMathBio - aMathBio;

      const aPhys = getSubjectScore(a, "PHYSICS");
      const bPhys = getSubjectScore(b, "PHYSICS");
      if (bPhys !== aPhys) return bPhys - aPhys;

      return a.rollNumber.localeCompare(b.rollNumber);
    });

    const totalStudents = preliminaryResults.length;

    // Assign Ranks and Percentiles (PRD EVAL-006)
    // Percentile Formula: (count of scores <= current score) / N * 100
    return preliminaryResults.map((result, idx) => {
      const cohortRank = idx + 1;
      const countLesserOrEqual = preliminaryResults.filter((r) => r.totalMarks <= result.totalMarks).length;
      const cohortPercentile = totalStudents > 0 ? (countLesserOrEqual / totalStudents) * 100 : 100;

      return {
        ...result,
        cohortRank,
        cohortPercentile: Math.round(cohortPercentile * 100) / 100,
      };
    });
  }
}
