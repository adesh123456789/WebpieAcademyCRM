export interface MasteryEvidenceItem {
  questionId: string;
  concept: string;
  subject: string;
  chapter: string;
  wasCorrect: boolean;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  timestamp: Date | string;
}

export type MasteryState =
  | "NOT_ASSESSED"
  | "CRITICAL"
  | "WEAK"
  | "DEVELOPING"
  | "PROFICIENT"
  | "MASTERED";

export interface ConceptMasteryResult {
  concept: string;
  subject: string;
  chapter: string;
  score: number; // 0 - 100
  state: MasteryState;
  confidence: number; // 0.0 - 1.0
  totalAttempts: number;
  correctAttempts: number;
  evidence: MasteryEvidenceItem[];
  algorithmVersion: string;
}

export class MasteryAlgorithmEngine {
  public static readonly VERSION = "v1.0";

  private static getDifficultyWeight(difficulty: "EASY" | "MEDIUM" | "HARD"): number {
    switch (difficulty) {
      case "HARD":
        return 2.0;
      case "MEDIUM":
        return 1.5;
      case "EASY":
      default:
        return 1.0;
    }
  }

  private static getRecencyWeight(timestamp: Date | string): number {
    const daysAgo = Math.max(
      0,
      (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60 * 24)
    );
    // Half-life decay of 45 days
    return Math.exp(-0.015 * daysAgo);
  }

  /**
   * Deterministic Weighted Mastery Calculation (PRD Sec 28)
   */
  public static calculateConceptMastery(
    concept: string,
    evidenceItems: MasteryEvidenceItem[]
  ): ConceptMasteryResult {
    const conceptEvidence = evidenceItems.filter((e) => e.concept === concept);

    if (conceptEvidence.length === 0) {
      return {
        concept,
        subject: "GENERAL",
        chapter: "GENERAL",
        score: 0,
        state: "NOT_ASSESSED",
        confidence: 0,
        totalAttempts: 0,
        correctAttempts: 0,
        evidence: [],
        algorithmVersion: this.VERSION,
      };
    }

    const sample = conceptEvidence[0];
    const subject = sample.subject;
    const chapter = sample.chapter;

    let totalWeightedScore = 0;
    let totalMaxWeight = 0;
    let correctAttempts = 0;

    for (const ev of conceptEvidence) {
      const diffW = this.getDifficultyWeight(ev.difficulty);
      const recW = this.getRecencyWeight(ev.timestamp);
      const combinedWeight = diffW * recW;

      totalMaxWeight += combinedWeight;
      if (ev.wasCorrect) {
        totalWeightedScore += combinedWeight;
        correctAttempts++;
      }
    }

    const rawAccuracy = totalMaxWeight > 0 ? (totalWeightedScore / totalMaxWeight) * 100 : 0;

    // Minimum evidence confidence factor (PRD 28.2: Avoid overconfidence from 1-2 questions)
    // 3 or more attempts reach full confidence 1.0
    const confidence = Math.min(1.0, conceptEvidence.length / 3);

    // Bounded mastery score
    const finalScore = Math.round(rawAccuracy * 10) / 10;

    // Thresholds defined in PRD Section 28.3
    let state: MasteryState = "NOT_ASSESSED";
    if (conceptEvidence.length < 2) {
      state = "DEVELOPING"; // insufficient attempts to label critical or mastered safely
    } else if (finalScore < 30) {
      state = "CRITICAL";
    } else if (finalScore < 50) {
      state = "WEAK";
    } else if (finalScore < 70) {
      state = "DEVELOPING";
    } else if (finalScore < 85) {
      state = "PROFICIENT";
    } else {
      state = "MASTERED";
    }

    return {
      concept,
      subject,
      chapter,
      score: finalScore,
      state,
      confidence: Math.round(confidence * 100) / 100,
      totalAttempts: conceptEvidence.length,
      correctAttempts,
      evidence: conceptEvidence,
      algorithmVersion: this.VERSION,
    };
  }

  /**
   * Evaluates all concepts from a stream of evidence
   */
  public static calculateAllMasteries(
    evidenceItems: MasteryEvidenceItem[]
  ): Record<string, ConceptMasteryResult> {
    const conceptMap: Record<string, MasteryEvidenceItem[]> = {};

    for (const item of evidenceItems) {
      if (!conceptMap[item.concept]) {
        conceptMap[item.concept] = [];
      }
      conceptMap[item.concept].push(item);
    }

    const results: Record<string, ConceptMasteryResult> = {};
    for (const [concept, items] of Object.entries(conceptMap)) {
      results[concept] = this.calculateConceptMastery(concept, items);
    }

    return results;
  }
}
