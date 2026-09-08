import { describe, it, expect } from "vitest";
import {
  MasteryAlgorithmEngine,
  MasteryEvidenceItem,
} from "../src/lib/academic/mastery-engine";

describe("Mastery Algorithm Engine (PRD Section 28)", () => {
  it("MST-003: Accurately reports Insufficient Evidence when no attempts exist", () => {
    const res = MasteryAlgorithmEngine.calculateConceptMastery("Friction", []);
    expect(res.state).toBe("NOT_ASSESSED");
    expect(res.score).toBe(0);
    expect(res.confidence).toBe(0);
  });

  it("Accurately categorizes high performance into MASTERED state", () => {
    const evidence: MasteryEvidenceItem[] = [
      {
        questionId: "q1",
        concept: "Limiting Friction",
        subject: "PHYSICS",
        chapter: "Laws of Motion",
        wasCorrect: true,
        difficulty: "HARD",
        timestamp: new Date(),
      },
      {
        questionId: "q2",
        concept: "Limiting Friction",
        subject: "PHYSICS",
        chapter: "Laws of Motion",
        wasCorrect: true,
        difficulty: "MEDIUM",
        timestamp: new Date(),
      },
      {
        questionId: "q3",
        concept: "Limiting Friction",
        subject: "PHYSICS",
        chapter: "Laws of Motion",
        wasCorrect: true,
        difficulty: "EASY",
        timestamp: new Date(),
      },
    ];

    const res = MasteryAlgorithmEngine.calculateConceptMastery("Limiting Friction", evidence);
    expect(res.score).toBe(100);
    expect(res.state).toBe("MASTERED");
    expect(res.confidence).toBe(1.0);
    expect(res.totalAttempts).toBe(3);
    expect(res.correctAttempts).toBe(3);
  });

  it("Accurately categorizes struggling performance into CRITICAL state (< 30%)", () => {
    const evidence: MasteryEvidenceItem[] = [
      {
        questionId: "q1",
        concept: "Limiting Friction",
        subject: "PHYSICS",
        chapter: "Laws of Motion",
        wasCorrect: false,
        difficulty: "MEDIUM",
        timestamp: new Date(),
      },
      {
        questionId: "q2",
        concept: "Limiting Friction",
        subject: "PHYSICS",
        chapter: "Laws of Motion",
        wasCorrect: false,
        difficulty: "HARD",
        timestamp: new Date(),
      },
      {
        questionId: "q3",
        concept: "Limiting Friction",
        subject: "PHYSICS",
        chapter: "Laws of Motion",
        wasCorrect: false,
        difficulty: "EASY",
        timestamp: new Date(),
      },
    ];

    const res = MasteryAlgorithmEngine.calculateConceptMastery("Limiting Friction", evidence);
    expect(res.score).toBe(0);
    expect(res.state).toBe("CRITICAL");
  });

  it("MST-002: Maintains transparent explainability evidence trace", () => {
    const evidence: MasteryEvidenceItem[] = [
      {
        questionId: "q1",
        concept: "Limits",
        subject: "MATHEMATICS",
        chapter: "Calculus",
        wasCorrect: true,
        difficulty: "MEDIUM",
        timestamp: new Date(),
      },
    ];

    const res = MasteryAlgorithmEngine.calculateConceptMastery("Limits", evidence);
    expect(res.evidence).toHaveLength(1);
    expect(res.evidence[0].questionId).toBe("q1");
    expect(res.algorithmVersion).toBe(MasteryAlgorithmEngine.VERSION);
  });
});
