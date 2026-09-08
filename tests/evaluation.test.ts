import { describe, it, expect } from "vitest";
import {
  DeterministicEvaluationEngine,
  ExamQuestionConfig,
  StudentAttemptInput,
} from "../src/lib/academic/evaluation-engine";

describe("Deterministic Evaluation Engine (PRD Section 27)", () => {
  const testQuestions: ExamQuestionConfig[] = [
    {
      id: "q1",
      questionId: "Q1",
      sectionName: "Physics",
      type: "SINGLE_CORRECT",
      subject: "PHYSICS",
      concept: "Friction",
      correctAnswer: "A",
      marksCorrect: 4,
      marksIncorrect: -1,
    },
    {
      id: "q2",
      questionId: "Q2",
      sectionName: "Physics",
      type: "SINGLE_CORRECT",
      subject: "PHYSICS",
      concept: "Kinematics",
      correctAnswer: "B",
      marksCorrect: 4,
      marksIncorrect: -1,
    },
    {
      id: "q3",
      questionId: "Q3",
      sectionName: "Mathematics",
      type: "NUMERICAL",
      subject: "MATHEMATICS",
      concept: "Limits",
      correctAnswer: "15.0",
      numericalTolerance: 0.05,
      marksCorrect: 4,
      marksIncorrect: 0,
    },
    {
      id: "q4",
      questionId: "Q4",
      sectionName: "Chemistry",
      type: "MULTIPLE_CORRECT",
      subject: "CHEMISTRY",
      concept: "Bonding",
      correctAnswer: ["A", "C"],
      marksCorrect: 4,
      marksIncorrect: -2,
    },
  ];

  it("EVAL-001: Correctly scores Single Correct (+4 for correct, -1 for incorrect, 0 for unattempted)", () => {
    const correctRes = DeterministicEvaluationEngine.gradeResponse(testQuestions[0], "A");
    expect(correctRes.status).toBe("CORRECT");
    expect(correctRes.marksAwarded).toBe(4);

    const wrongRes = DeterministicEvaluationEngine.gradeResponse(testQuestions[0], "C");
    expect(wrongRes.status).toBe("INCORRECT");
    expect(wrongRes.marksAwarded).toBe(-1);

    const blankRes = DeterministicEvaluationEngine.gradeResponse(testQuestions[0], "");
    expect(blankRes.status).toBe("UNATTEMPTED");
    expect(blankRes.marksAwarded).toBe(0);
  });

  it("EVAL-003: Correctly evaluates Numerical question with tolerance", () => {
    const exact = DeterministicEvaluationEngine.gradeResponse(testQuestions[2], "15.0");
    expect(exact.status).toBe("CORRECT");
    expect(exact.marksAwarded).toBe(4);

    const withinTolerance = DeterministicEvaluationEngine.gradeResponse(testQuestions[2], "15.03");
    expect(withinTolerance.status).toBe("CORRECT");
    expect(withinTolerance.marksAwarded).toBe(4);

    const outOfTolerance = DeterministicEvaluationEngine.gradeResponse(testQuestions[2], "15.2");
    expect(outOfTolerance.status).toBe("INCORRECT");
    expect(outOfTolerance.marksAwarded).toBe(0);
  });

  it("EVAL-002: Correctly evaluates Multiple Correct partial marks and penalty", () => {
    // Both correct options selected -> Full marks (+4)
    const full = DeterministicEvaluationEngine.gradeResponse(testQuestions[3], ["A", "C"]);
    expect(full.status).toBe("CORRECT");
    expect(full.marksAwarded).toBe(4);

    // 1 correct option selected, no wrong options -> Partial marks (+1)
    const partial = DeterministicEvaluationEngine.gradeResponse(testQuestions[3], ["A"]);
    expect(partial.status).toBe("PARTIALLY_CORRECT");
    expect(partial.marksAwarded).toBe(1);

    // Any wrong option selected (e.g. A and B) -> Negative deduction (-2)
    const penalty = DeterministicEvaluationEngine.gradeResponse(testQuestions[3], ["A", "B"]);
    expect(penalty.status).toBe("INCORRECT");
    expect(penalty.marksAwarded).toBe(-2);
  });

  it("EVAL-005 & EVAL-006: Correctly ranks cohort and computes percentiles deterministically", () => {
    const attempts: StudentAttemptInput[] = [
      {
        studentId: "s1",
        rollNumber: "ROLL01",
        responses: { Q1: "A", Q2: "B", Q3: "15.0", Q4: ["A", "C"] }, // Score: 16 (All correct)
      },
      {
        studentId: "s2",
        rollNumber: "ROLL02",
        responses: { Q1: "A", Q2: "C", Q3: "15.0", Q4: ["A", "C"] }, // Score: 11 (1 wrong in Q2: 4 - 1 + 4 + 4)
      },
      {
        studentId: "s3",
        rollNumber: "ROLL03",
        responses: { Q1: "A", Q2: "", Q3: "", Q4: "" }, // Score: 4 (Q1 correct, rest unattempted)
      },
    ];

    const results = DeterministicEvaluationEngine.evaluateCohort(testQuestions, attempts);

    expect(results).toHaveLength(3);
    // Rank 1
    expect(results[0].studentId).toBe("s1");
    expect(results[0].totalMarks).toBe(16);
    expect(results[0].cohortRank).toBe(1);
    expect(results[0].cohortPercentile).toBe(100);

    // Rank 2
    expect(results[1].studentId).toBe("s2");
    expect(results[1].totalMarks).toBe(11);
    expect(results[1].cohortRank).toBe(2);

    // Rank 3
    expect(results[2].studentId).toBe("s3");
    expect(results[2].totalMarks).toBe(4);
    expect(results[2].cohortRank).toBe(3);
  });

  it("EVAL-007: Reproducibility guarantee - same inputs always produce identical output", () => {
    const attempts: StudentAttemptInput[] = [
      { studentId: "s1", rollNumber: "R1", responses: { Q1: "A", Q2: "B" } },
    ];

    const run1 = DeterministicEvaluationEngine.evaluateCohort(testQuestions, attempts);
    const run2 = DeterministicEvaluationEngine.evaluateCohort(testQuestions, attempts);

    expect(JSON.stringify(run1)).toBe(JSON.stringify(run2));
  });
});
