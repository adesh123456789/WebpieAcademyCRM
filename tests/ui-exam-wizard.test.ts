/**
 * tests/ui-exam-wizard.test.ts
 *
 * Unit tests for ExamWizardModal logic (UI-004).
 * Tests are pure functions / data operations extracted from component logic.
 * No DOM rendering required — all assertions are on data transformations.
 */

import { describe, it, expect } from "vitest";
import type { BlueprintSection, SelectedQuestion } from "../src/components/modals/ExamWizardModal";

// ---------------------------------------------------------------------------
// Helpers mirroring component-internal logic
// ---------------------------------------------------------------------------

/** Compute total marks for a blueprint (mirrors component useMemo). */
function computeBlueprintTotals(sections: BlueprintSection[]) {
  const totalQuestions = sections.reduce((s, sec) => s + sec.questionCount, 0);
  const totalMarks = sections.reduce(
    (s, sec) => s + sec.questionCount * sec.marksCorrect,
    0
  );
  return { totalQuestions, totalMarks };
}

/** Step-1 validation: title must be non-empty to proceed. */
function isStep1Valid(title: string, code: string): boolean {
  return title.trim().length > 0 && code.trim().length > 0;
}

/** Count unapproved AI candidates in the selected questions list. */
function countUnapprovedAi(questions: SelectedQuestion[]): number {
  return questions.filter(
    (q) => q.source === "AI" && q.status !== "APPROVED"
  ).length;
}

/** Finalize gate: returns true only when unapproved AI count is 0. */
function canFinalize(questions: SelectedQuestion[]): boolean {
  return countUnapprovedAi(questions) === 0;
}

/** Reorder: move item at index up by one position (swap with previous). */
function moveUp<T>(arr: T[], index: number): T[] {
  if (index <= 0) return arr;
  const next = [...arr];
  [next[index - 1], next[index]] = [next[index], next[index - 1]];
  return next;
}

/** Reorder: move item at index down by one position (swap with next). */
function moveDown<T>(arr: T[], index: number): T[] {
  if (index >= arr.length - 1) return arr;
  const next = [...arr];
  [next[index], next[index + 1]] = [next[index + 1], next[index]];
  return next;
}

/** Filter detection: true when the list is empty. */
function isFilterEmpty<T>(items: T[]): boolean {
  return items.length === 0;
}

const PAPER_SET_OPTIONS = ["A", "B", "C", "D"] as const;
type PaperSet = (typeof PAPER_SET_OPTIONS)[number];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ExamWizard — Blueprint live totals", () => {
  it("sums questions and marks across all sections", () => {
    const sections: BlueprintSection[] = [
      { id: "s1", name: "Physics", subject: "Physics", questionType: "SINGLE_CORRECT", questionCount: 20, marksCorrect: 4, marksIncorrect: -1 },
      { id: "s2", name: "Chemistry", subject: "Chemistry", questionType: "SINGLE_CORRECT", questionCount: 20, marksCorrect: 4, marksIncorrect: -1 },
      { id: "s3", name: "Maths Numerical", subject: "Mathematics", questionType: "NUMERICAL", questionCount: 10, marksCorrect: 4, marksIncorrect: 0 },
    ];
    const { totalQuestions, totalMarks } = computeBlueprintTotals(sections);
    expect(totalQuestions).toBe(50);
    expect(totalMarks).toBe(200);
  });

  it("returns zeros for empty blueprint", () => {
    const { totalQuestions, totalMarks } = computeBlueprintTotals([]);
    expect(totalQuestions).toBe(0);
    expect(totalMarks).toBe(0);
  });

  it("handles mixed marking schemes", () => {
    const sections: BlueprintSection[] = [
      { id: "s1", name: "MCQ", subject: "Physics", questionType: "SINGLE_CORRECT", questionCount: 25, marksCorrect: 3, marksIncorrect: -1 },
      { id: "s2", name: "Numerical", subject: "Physics", questionType: "NUMERICAL", questionCount: 5, marksCorrect: 4, marksIncorrect: 0 },
    ];
    const { totalQuestions, totalMarks } = computeBlueprintTotals(sections);
    expect(totalQuestions).toBe(30);
    expect(totalMarks).toBe(95);
  });
});

describe("ExamWizard — Step 1 validation", () => {
  it("blocks when title is empty", () => { expect(isStep1Valid("", "JM-2025-04")).toBe(false); });
  it("blocks when code is empty", () => { expect(isStep1Valid("JEE Mains", "")).toBe(false); });
  it("blocks when both are empty", () => { expect(isStep1Valid("", "")).toBe(false); });
  it("allows when both title and code are provided", () => { expect(isStep1Valid("JEE Mains", "JM-2025-04")).toBe(true); });
  it("trims whitespace correctly", () => {
    expect(isStep1Valid("   ", "JM-CODE")).toBe(false);
    expect(isStep1Valid("  Valid Title  ", "JM-CODE")).toBe(true);
  });
});

describe("ExamWizard — AI candidate approval gate", () => {
  const makeQ = (id: string, source: "INSTITUTE" | "PLATFORM" | "AI", status?: "AI_CANDIDATE" | "VERIFIED" | "APPROVED"): SelectedQuestion =>
    ({ id, subject: "Physics", type: "SINGLE_CORRECT", body: `Q${id}`, source, status });

  it("allows finalize when no AI questions present", () => {
    const qs = [makeQ("q1", "INSTITUTE", "VERIFIED"), makeQ("q2", "PLATFORM", "VERIFIED")];
    expect(canFinalize(qs)).toBe(true);
    expect(countUnapprovedAi(qs)).toBe(0);
  });

  it("allows finalize when all AI questions are APPROVED", () => {
    const qs = [makeQ("q1", "INSTITUTE", "VERIFIED"), makeQ("q2", "AI", "APPROVED"), makeQ("q3", "AI", "APPROVED")];
    expect(canFinalize(qs)).toBe(true);
  });

  it("blocks finalize when any AI question is AI_CANDIDATE", () => {
    const qs = [makeQ("q1", "INSTITUTE", "VERIFIED"), makeQ("q2", "AI", "AI_CANDIDATE"), makeQ("q3", "AI", "APPROVED")];
    expect(canFinalize(qs)).toBe(false);
    expect(countUnapprovedAi(qs)).toBe(1);
  });

  it("counts all unapproved AI candidates correctly", () => {
    const qs = [makeQ("q1", "AI", "AI_CANDIDATE"), makeQ("q2", "AI", "AI_CANDIDATE"), makeQ("q3", "AI", "APPROVED"), makeQ("q4", "INSTITUTE")];
    expect(countUnapprovedAi(qs)).toBe(2);
    expect(canFinalize(qs)).toBe(false);
  });
});

describe("ExamWizard — Question reorder logic", () => {
  const QS = ["q1", "q2", "q3", "q4"];

  it("moveUp swaps item with previous", () => { expect(moveUp(QS, 1)).toEqual(["q2", "q1", "q3", "q4"]); });
  it("moveUp at index 0 is no-op", () => { expect(moveUp(QS, 0)).toEqual(["q1", "q2", "q3", "q4"]); });
  it("moveDown swaps item with next", () => { expect(moveDown(QS, 2)).toEqual(["q1", "q2", "q4", "q3"]); });
  it("moveDown at last index is no-op", () => { expect(moveDown(QS, 3)).toEqual(["q1", "q2", "q3", "q4"]); });
  it("does not mutate original array", () => {
    const orig = ["q1", "q2", "q3"];
    const result = moveUp(orig, 2);
    expect(orig).toEqual(["q1", "q2", "q3"]);
    expect(result).toEqual(["q1", "q3", "q2"]);
  });
});

describe("ExamWizard — Paper set options", () => {
  it("has exactly four options A B C D", () => {
    expect(PAPER_SET_OPTIONS).toHaveLength(4);
    expect(PAPER_SET_OPTIONS).toContain("A");
    expect(PAPER_SET_OPTIONS).toContain("B");
    expect(PAPER_SET_OPTIONS).toContain("C");
    expect(PAPER_SET_OPTIONS).toContain("D");
  });

  it("validates selected sets against options", () => {
    const selected: PaperSet[] = ["A", "C"];
    expect(selected.every((s) => PAPER_SET_OPTIONS.includes(s))).toBe(true);
  });
});

describe("ExamWizard — Filter empty state", () => {
  it("returns true when exam list is empty", () => { expect(isFilterEmpty([])).toBe(true); });
  it("returns false when exams present", () => { expect(isFilterEmpty([{ id: "e1" }])).toBe(false); });
  it("works for generic types", () => {
    expect(isFilterEmpty<string>([])).toBe(true);
    expect(isFilterEmpty<number>([1, 2, 3])).toBe(false);
  });
});
