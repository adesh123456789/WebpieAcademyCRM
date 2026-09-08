import type { ParentSummaryInput, QuestionGenerateInput } from "./schemas";

/**
 * AI-001 - versioned prompt template registry. Every material AI output records
 * `promptTemplateId` + `promptTemplateVersion`; bump the version on any wording
 * change so provenance stays meaningful.
 */
export interface PromptTemplate<I> {
  id: string;
  version: string;
  build: (input: I) => string;
}

export const questionGeneratePrompt: PromptTemplate<QuestionGenerateInput> = {
  id: "question.generate",
  version: "1.0.0",
  build: (i) =>
    [
      `Generate ${i.count} ${i.difficulty} multiple-choice question(s) for the ${i.examType} exam.`,
      `Subject: ${i.subject}. Chapter: ${i.chapter}. Concept: ${i.concept}.`,
      `Return a strict JSON array. Each element must be an object with keys:`,
      `"body" (question text, LaTeX with $...$ allowed),`,
      `"options" (array of exactly 4 objects {"id":"A"|"B"|"C"|"D","text":string}),`,
      `"correctAnswer" ("A"|"B"|"C"|"D"),`,
      `"solution" (step-by-step working, LaTeX allowed).`,
      `Do not include any commentary outside the JSON.`,
    ].join("\n"),
};

export const parentSummaryPrompt: PromptTemplate<ParentSummaryInput> = {
  id: "report.parentSummary",
  version: "1.0.0",
  build: (i) => {
    const accuracy = i.maxMarks > 0 ? Math.round((i.score / i.maxMarks) * 100) : 0;
    return [
      `Write a short, plain parent-facing summary in ${i.language}.`,
      `These figures are authoritative - restate them, do not recompute:`,
      `student=${i.studentName}; exam=${i.examTitle}; score=${i.score}/${i.maxMarks} (${accuracy}%);`,
      `rank=${i.rank} of ${i.totalStudents};`,
      `strengths=${i.strongConcepts.join(", ") || "none notable"};`,
      `focus areas=${i.weakConcepts.join(", ") || "none critical"}.`,
      `2-4 sentences. No predictions, no invented numbers. Return plain text only.`,
    ].join("\n");
  },
};
