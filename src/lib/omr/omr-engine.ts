export interface OMRTemplateConfig {
  id: string;
  name: string;
  totalQuestions: number;
  optionsPerQuestion: number; // usually 4 (A, B, C, D)
  columns: number; // e.g. 2 or 3 columns on sheet
  rollNumberDigits: number; // 6 digits
}

export interface DetectedBubble {
  questionNumber: number;
  option: string;
  fillDensity: number; // 0.0 (clean white) to 1.0 (fully black filled)
  isMarked: boolean;
  confidence: number;
}

export interface SheetExtractionResult {
  sheetId: string;
  rollNumber: string;
  responses: Record<number, string>; // questionNum -> "A" | "B" | "C" | "D"
  bubbleDetails: Record<number, DetectedBubble[]>;
  ambiguities: {
    questionNumber: number;
    reason: "DOUBLE_MARK" | "LOW_CONFIDENCE" | "PARTIAL_FILL" | "STRAY_MARK";
    message: string;
    detectedOptions: string[];
    cropEvidenceBox?: { x: number; y: number; width: number; height: number };
  }[];
  overallConfidence: number;
  status: "CONFIDENT" | "AMBIGUOUS" | "UNMATCHED" | "REJECTED";
}

/**
 * Standard WebPie 60/75 Question OMR Template Definition
 */
export const DEFAULT_OMR_TEMPLATE: OMRTemplateConfig = {
  id: "WEBPIE_STANDARD_75Q",
  name: "WebPie Standard 75-Question JEE/NEET Sheet",
  totalQuestions: 75,
  optionsPerQuestion: 4,
  columns: 3,
  rollNumberDigits: 6,
};

/**
 * Deterministic OMR Computer Vision & Processing Engine (PRD Section 26)
 */
export class DeterministicOMREngine {
  // Density threshold for a valid bubble fill (typically > 0.45 filled)
  public static readonly FILL_THRESHOLD = 0.42;
  public static readonly HIGH_CONFIDENCE_THRESHOLD = 0.65;
  public static readonly AMBIGUITY_DELTA_THRESHOLD = 0.15; // If two bubbles are within 15% density
  public static readonly LOW_CONFIDENCE_FLOOR = 0.28;

  /**
   * Evaluates question bubbles from density matrix
   */
  public static processQuestionBubbles(
    questionNumber: number,
    optionDensities: { option: string; density: number }[]
  ): {
    chosenOption: string | null;
    bubbles: DetectedBubble[];
    ambiguityReason: SheetExtractionResult["ambiguities"][0] | null;
  } {
    const bubbles: DetectedBubble[] = optionDensities.map((item) => ({
      questionNumber,
      option: item.option,
      fillDensity: Math.round(item.density * 100) / 100,
      isMarked: item.density >= this.FILL_THRESHOLD,
      confidence: item.density >= this.HIGH_CONFIDENCE_THRESHOLD ? 0.98 : item.density < 0.2 ? 0.99 : 0.75,
    }));

    const markedBubbles = bubbles.filter((b) => b.isMarked);

    // Case 1: Unattempted (all clean)
    if (markedBubbles.length === 0) {
      const top = [...bubbles].sort((a, b) => b.fillDensity - a.fillDensity)[0];
      if (top.fillDensity >= this.LOW_CONFIDENCE_FLOOR) {
        return { chosenOption: null, bubbles, ambiguityReason: {
          questionNumber, reason: "LOW_CONFIDENCE",
          message: `Question ${questionNumber}: faint mark requires visual review.`,
          detectedOptions: [top.option],
          cropEvidenceBox: { x: 0, y: questionNumber, width: 1, height: 1 },
        } };
      }
      return { chosenOption: null, bubbles, ambiguityReason: null };
    }

    // Case 2: Exactly 1 clearly marked bubble
    if (markedBubbles.length === 1) {
      const topBubble = markedBubbles[0];
      // Check if second highest bubble is close to threshold (stray mark or faint erase)
      const otherDensities = bubbles
        .filter((b) => b.option !== topBubble.option)
        .map((b) => b.fillDensity);
      const nextHighest = Math.max(...otherDensities, 0);

      if (topBubble.fillDensity < this.HIGH_CONFIDENCE_THRESHOLD && nextHighest < this.LOW_CONFIDENCE_FLOOR) {
        return { chosenOption: null, bubbles, ambiguityReason: {
          questionNumber, reason: "STRAY_MARK",
          message: `Question ${questionNumber}: isolated mark lacks sufficient fill confidence.`,
          detectedOptions: [topBubble.option],
          cropEvidenceBox: { x: 0, y: questionNumber, width: 1, height: 1 },
        } };
      }

      if (topBubble.fillDensity - nextHighest < this.AMBIGUITY_DELTA_THRESHOLD && nextHighest > 0.25) {
        return {
          chosenOption: topBubble.option,
          bubbles,
          ambiguityReason: {
            questionNumber,
            reason: "PARTIAL_FILL",
            message: `Question ${questionNumber}: Option ${topBubble.option} marked but secondary faint mark detected on another option.`,
            detectedOptions: [topBubble.option],
          },
        };
      }

      return {
        chosenOption: topBubble.option,
        bubbles,
        ambiguityReason: null,
      };
    }

    // Case 3: Multiple bubbles marked (Double Mark / Ambiguity)
    markedBubbles.sort((a, b) => b.fillDensity - a.fillDensity);
    return {
      chosenOption: null, // Safely fail into review (PRD Section 26.1)
      bubbles,
      ambiguityReason: {
        questionNumber,
        reason: "DOUBLE_MARK",
        message: `Question ${questionNumber}: Multiple bubbles marked (${markedBubbles.map((b) => b.option).join(", ")}).`,
        detectedOptions: markedBubbles.map((b) => b.option),
      },
    };
  }

  /**
   * Process a complete batch sheet simulated or read from raster scan
   */
  public static extractResponsesFromGrid(
    sheetId: string,
    rollNumber: string,
    totalQuestions: number,
    questionDensityMap: Record<number, number[]>, // qNum -> [A_density, B_density, C_density, D_density]
    validation: { supported?: boolean; templateValid?: boolean; pageComplete?: boolean } = {},
  ): SheetExtractionResult {
    const responses: Record<number, string> = {};
    const bubbleDetails: Record<number, DetectedBubble[]> = {};
    const ambiguities: SheetExtractionResult["ambiguities"] = [];
    const options = ["A", "B", "C", "D"];

    let totalConfidenceSum = 0;

    for (let q = 1; q <= totalQuestions; q++) {
      const densities = questionDensityMap[q] || [0.02, 0.03, 0.01, 0.02];
      const optionItems = options.map((opt, idx) => ({
        option: opt,
        density: densities[idx] ?? 0.0,
      }));

      const { chosenOption, bubbles, ambiguityReason } = this.processQuestionBubbles(q, optionItems);

      bubbleDetails[q] = bubbles;
      if (chosenOption) {
        responses[q] = chosenOption;
      }
      if (ambiguityReason) {
        ambiguities.push(ambiguityReason);
      }

      const qConfidence = bubbles.reduce((acc, b) => acc + b.confidence, 0) / bubbles.length;
      totalConfidenceSum += qConfidence;
    }

    const overallConfidence =
      totalQuestions > 0 ? Math.round((totalConfidenceSum / totalQuestions) * 100) / 100 : 1.0;

    const status: SheetExtractionResult["status"] =
      validation.supported === false || validation.templateValid === false || validation.pageComplete === false
        ? "REJECTED"
        : ambiguities.length > 0 ? "AMBIGUOUS" : rollNumber ? "CONFIDENT" : "UNMATCHED";

    return {
      sheetId,
      rollNumber,
      responses,
      bubbleDetails,
      ambiguities,
      overallConfidence,
      status,
    };
  }
}
