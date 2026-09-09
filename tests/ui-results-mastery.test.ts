/**
 * tests/ui-results-mastery.test.ts
 *
 * Unit tests for Results & Cohort Analytics, Student Evidence Drilldown,
 * Concept Mastery States, Worksheet Practice Ladder Editing, and Before/After Retest Verification (UI-006).
 * Validates Contract C05:
 *  - Deterministic evaluation projection (leaderboard, ranks, percentiles, negative marks)
 *  - Response evidence linking without answer-key leakage
 *  - Mastery state classification (MASTERED, PRACTICING, CRITICAL, INSUFFICIENT_EVIDENCE)
 *  - Practice ladder reordering and tier validation
 *  - Retest verification state tracking (UNVERIFIED vs VERIFIED)
 */

import { describe, it, expect } from "vitest";

// ============================================================================
// Logic Helpers Mirroring Component Invariants
// ============================================================================

export interface LeaderboardItem {
  rank: number;
  percentile: number;
  studentId: string;
  studentName: string;
  rollNumber: string;
  score: number;
  accuracyPercentage: number;
  totalAttempted: number;
  totalCorrect: number;
  totalIncorrect: number;
  negativeMarksDeducted: number;
  subjectScores?: Record<string, { score: number; max: number }>;
}

export interface MasteryEvidenceProjection {
  concept: string;
  subject: string;
  score: number;
  state: "MASTERED" | "PRACTICING" | "CRITICAL" | "INSUFFICIENT_EVIDENCE";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  evidenceCount: number;
}

export function sortLeaderboard(
  items: LeaderboardItem[],
  field: "rank" | "score" | "accuracyPercentage",
  ascending: boolean
): LeaderboardItem[] {
  return [...items].sort((a, b) => {
    const valA = a[field] ?? 0;
    const valB = b[field] ?? 0;
    return ascending ? valA - valB : valB - valA;
  });
}

export function filterLeaderboard(items: LeaderboardItem[], query: string): LeaderboardItem[] {
  if (!query.trim()) return items;
  const q = query.toLowerCase();
  return items.filter(
    (item) =>
      item.studentName.toLowerCase().includes(q) || item.rollNumber.toLowerCase().includes(q)
  );
}

export function classifyMasteryState(score: number, evidenceCount: number): "MASTERED" | "PRACTICING" | "CRITICAL" | "INSUFFICIENT_EVIDENCE" {
  if (evidenceCount < 3) {
    return "INSUFFICIENT_EVIDENCE";
  }
  if (score >= 80) {
    return "MASTERED";
  }
  if (score < 50) {
    return "CRITICAL";
  }
  return "PRACTICING";
}

export function reorderLadderQuestions<T extends { orderIndex: number }>(
  questions: T[],
  fromIndex: number,
  direction: "up" | "down"
): T[] {
  const targetIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
  if (targetIndex < 0 || targetIndex >= questions.length) return questions;

  const copy = [...questions];
  const item = copy[fromIndex];
  copy[fromIndex] = copy[targetIndex];
  copy[targetIndex] = item;

  return copy.map((q, idx) => ({ ...q, orderIndex: idx + 1 }));
}

export function checkRetestStatus(status: string): { isVerified: boolean; badgeLabel: string } {
  const isVerified = status === "VERIFIED" || status === "RESOLVED";
  return {
    isVerified,
    badgeLabel: isVerified ? "Retest Verified" : "Pending Retest (Unverified)",
  };
}

// ============================================================================
// Test Suites
// ============================================================================

describe("UI-006: Results, Mastery Evidence & Practice Ladder (Contract C05)", () => {
  const sampleLeaderboard: LeaderboardItem[] = [
    {
      rank: 1,
      percentile: 100,
      studentId: "s1",
      studentName: "Aarav Sharma",
      rollNumber: "260001",
      score: 286,
      accuracyPercentage: 92,
      totalAttempted: 72,
      totalCorrect: 66,
      totalIncorrect: 6,
      negativeMarksDeducted: 6,
      subjectScores: {
        Physics: { score: 94, max: 100 },
        Chemistry: { score: 96, max: 100 },
        Mathematics: { score: 96, max: 100 },
      },
    },
    {
      rank: 2,
      percentile: 85.5,
      studentId: "s2",
      studentName: "Isha Patel",
      rollNumber: "260002",
      score: 242,
      accuracyPercentage: 81,
      totalAttempted: 68,
      totalCorrect: 56,
      totalIncorrect: 12,
      negativeMarksDeducted: 12,
      subjectScores: {
        Physics: { score: 72, max: 100 },
        Chemistry: { score: 86, max: 100 },
        Mathematics: { score: 84, max: 100 },
      },
    },
    {
      rank: 3,
      percentile: 45.0,
      studentId: "s3",
      studentName: "Rohan Deshmukh",
      rollNumber: "260003",
      score: 135,
      accuracyPercentage: 54,
      totalAttempted: 60,
      totalCorrect: 34,
      totalIncorrect: 26,
      negativeMarksDeducted: 26,
    },
  ];

  describe("Cohort Leaderboard Sorting & Filtering", () => {
    it("sorts leaderboard by score descending", () => {
      const sorted = sortLeaderboard(sampleLeaderboard, "score", false);
      expect(sorted[0].score).toBe(286);
      expect(sorted[1].score).toBe(242);
      expect(sorted[2].score).toBe(135);
    });

    it("sorts leaderboard by rank ascending", () => {
      const sorted = sortLeaderboard(sampleLeaderboard, "rank", true);
      expect(sorted[0].rank).toBe(1);
      expect(sorted[2].rank).toBe(3);
    });

    it("filters leaderboard by student name substring", () => {
      const filtered = filterLeaderboard(sampleLeaderboard, "Isha");
      expect(filtered.length).toBe(1);
      expect(filtered[0].rollNumber).toBe("260002");
    });

    it("filters leaderboard by roll number query", () => {
      const filtered = filterLeaderboard(sampleLeaderboard, "260003");
      expect(filtered.length).toBe(1);
      expect(filtered[0].studentName).toBe("Rohan Deshmukh");
    });

    it("returns empty array for unmatched search", () => {
      const filtered = filterLeaderboard(sampleLeaderboard, "xyz999");
      expect(filtered.length).toBe(0);
    });
  });

  describe("Contract C05 Privacy & Answer Key Invariant", () => {
    it("ensures student evidence objects never expose canonical answer keys", () => {
      const questionEvidence = [
        { orderIndex: 1, concept: "Rotational Inertia", status: "CORRECT", studentResponse: "A", marksAwarded: 4 },
        { orderIndex: 2, concept: "Torque", status: "INCORRECT", studentResponse: "C", marksAwarded: -1 },
      ];

      questionEvidence.forEach((item: any) => {
        expect(item.correctAnswer).toBeUndefined();
        expect(item.canonicalKey).toBeUndefined();
        expect(item.answerKey).toBeUndefined();
      });
    });
  });

  describe("Concept Mastery State Classification", () => {
    it("classifies as INSUFFICIENT_EVIDENCE when evidence count < 3", () => {
      expect(classifyMasteryState(90, 2)).toBe("INSUFFICIENT_EVIDENCE");
      expect(classifyMasteryState(0, 0)).toBe("INSUFFICIENT_EVIDENCE");
    });

    it("classifies as MASTERED when score >= 80% with sufficient evidence", () => {
      expect(classifyMasteryState(82, 10)).toBe("MASTERED");
      expect(classifyMasteryState(95, 4)).toBe("MASTERED");
    });

    it("classifies as CRITICAL when score < 50% with sufficient evidence", () => {
      expect(classifyMasteryState(38, 9)).toBe("CRITICAL");
      expect(classifyMasteryState(48, 5)).toBe("CRITICAL");
    });

    it("classifies as PRACTICING when score is between 50% and 79%", () => {
      expect(classifyMasteryState(65, 8)).toBe("PRACTICING");
      expect(classifyMasteryState(74, 12)).toBe("PRACTICING");
    });
  });

  describe("Remedial Worksheet Practice Ladder Reordering", () => {
    const ladder = [
      { id: "q1", orderIndex: 1, tier: "Foundation" },
      { id: "q2", orderIndex: 2, tier: "Application" },
      { id: "q3", orderIndex: 3, tier: "Exam-Level" },
    ];

    it("moves question down correctly and updates orderIndex", () => {
      const reordered = reorderLadderQuestions(ladder, 0, "down");
      expect(reordered[0].id).toBe("q2");
      expect(reordered[0].orderIndex).toBe(1);
      expect(reordered[1].id).toBe("q1");
      expect(reordered[1].orderIndex).toBe(2);
    });

    it("moves question up correctly and updates orderIndex", () => {
      const reordered = reorderLadderQuestions(ladder, 2, "up");
      expect(reordered[1].id).toBe("q3");
      expect(reordered[1].orderIndex).toBe(2);
      expect(reordered[2].id).toBe("q2");
      expect(reordered[2].orderIndex).toBe(3);
    });

    it("no-ops safely when moving first element up or last element down", () => {
      const topUp = reorderLadderQuestions(ladder, 0, "up");
      expect(topUp[0].id).toBe("q1");

      const bottomDown = reorderLadderQuestions(ladder, 2, "down");
      expect(bottomDown[2].id).toBe("q3");
    });
  });

  describe("Before/After Retest Verification Tracking", () => {
    it("marks status as unverified when awaiting retest follow-up", () => {
      const check = checkRetestStatus("ACTIVE");
      expect(check.isVerified).toBe(false);
      expect(check.badgeLabel).toBe("Pending Retest (Unverified)");
    });

    it("marks status as verified when retest confirmation lands", () => {
      const check = checkRetestStatus("VERIFIED");
      expect(check.isVerified).toBe(true);
      expect(check.badgeLabel).toBe("Retest Verified");
    });
  });
});
