import { describe, it, expect } from "vitest";
import { DeterministicOMREngine } from "../src/lib/omr/omr-engine";

describe("OMR Computer Vision & Bubble Detection (PRD Section 26)", () => {
  it("OMR-001: Correctly identifies a clear bubble mark with high confidence", () => {
    // Option A filled heavily (density 0.85), others blank (< 0.05)
    const densities = [
      { option: "A", density: 0.85 },
      { option: "B", density: 0.03 },
      { option: "C", density: 0.02 },
      { option: "D", density: 0.04 },
    ];

    const result = DeterministicOMREngine.processQuestionBubbles(1, densities);
    expect(result.chosenOption).toBe("A");
    expect(result.ambiguityReason).toBeNull();
    expect(result.bubbles[0].isMarked).toBe(true);
    expect(result.bubbles[0].confidence).toBeGreaterThan(0.9);
  });

  it("OMR-002: Safely flags Double Mark into ambiguity queue rather than guessing", () => {
    // Both A and C filled
    const densities = [
      { option: "A", density: 0.78 },
      { option: "B", density: 0.04 },
      { option: "C", density: 0.72 },
      { option: "D", density: 0.02 },
    ];

    const result = DeterministicOMREngine.processQuestionBubbles(5, densities);
    expect(result.chosenOption).toBeNull(); // Must NOT auto-accept
    expect(result.ambiguityReason).not.toBeNull();
    expect(result.ambiguityReason?.reason).toBe("DOUBLE_MARK");
    expect(result.ambiguityReason?.detectedOptions).toEqual(["A", "C"]);
  });

  it("Accurately identifies unattempted question", () => {
    const densities = [
      { option: "A", density: 0.02 },
      { option: "B", density: 0.01 },
      { option: "C", density: 0.03 },
      { option: "D", density: 0.02 },
    ];

    const result = DeterministicOMREngine.processQuestionBubbles(12, densities);
    expect(result.chosenOption).toBeNull();
    expect(result.ambiguityReason).toBeNull();
  });

  it("Extracts whole sheet grid responses and flags ambiguous questions", () => {
    const gridMap: Record<number, number[]> = {
      1: [0.85, 0.02, 0.01, 0.01], // Q1: A
      2: [0.02, 0.88, 0.03, 0.01], // Q2: B
      3: [0.75, 0.01, 0.72, 0.02], // Q3: A + C (Double mark)
      4: [0.01, 0.02, 0.01, 0.02], // Q4: unattempted
    };

    const sheetResult = DeterministicOMREngine.extractResponsesFromGrid(
      "sheet-001",
      "260001",
      4,
      gridMap
    );

    expect(sheetResult.rollNumber).toBe("260001");
    expect(sheetResult.responses[1]).toBe("A");
    expect(sheetResult.responses[2]).toBe("B");
    expect(sheetResult.responses[3]).toBeUndefined(); // Flagged
    expect(sheetResult.ambiguities).toHaveLength(1);
    expect(sheetResult.ambiguities[0].reason).toBe("DOUBLE_MARK");
    expect(sheetResult.status).toBe("AMBIGUOUS");
  });
});
