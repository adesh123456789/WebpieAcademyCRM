import { describe, expect, it } from "vitest";
import {
  extractSheetFromImage,
  rasterToDensityMap,
  otsuThreshold,
} from "../../src/lib/omr/raster";
import { renderSheet, TEST_30Q_GEOMETRY } from "./raster-fixtures";

/**
 * OMR-001 - raster front-end. Synthetic grayscale sheets through the real
 * pipeline (binarize -> fiducials -> projective deskew -> bubble sampling) and
 * on into the safety-hardened DeterministicOMREngine.
 */

const geom = TEST_30Q_GEOMETRY;
const answers: Record<number, "A" | "B" | "C" | "D"> = {};
for (let q = 1; q <= 30; q++) answers[q] = (["A", "B", "C", "D"] as const)[q % 4];
// leave a few genuinely blank
delete answers[7];
delete answers[18];
delete answers[26];

describe("raster front-end - clean sheet", () => {
  it("recovers every marked answer and the roll number", () => {
    const img = renderSheet({ roll: "260014", answers });
    const raster = rasterToDensityMap(img, geom);

    expect(raster.templateValid).toBe(true);
    expect(raster.pageComplete).toBe(true);
    expect(raster.rollNumber).toBe("260014");
    expect(raster.fiducials).toHaveLength(4);

    const result = extractSheetFromImage(img, geom, "clean", { supported: true });
    expect(result.status).toBe("CONFIDENT");
    for (const [qStr, letter] of Object.entries(answers)) {
      expect(result.responses[Number(qStr)]).toBe(letter);
    }
    for (const q of [7, 18, 26]) expect(result.responses[q]).toBeUndefined();
    expect(result.ambiguities).toHaveLength(0);
  });
});

describe("raster front-end - projective deskew", () => {
  it("still recovers answers and roll from a rotated scan", () => {
    const img = renderSheet({ roll: "260014", answers, rotationDeg: 4 });
    const result = extractSheetFromImage(img, geom, "rotated", { supported: true });
    expect(result.rollNumber).toBe("260014");
    let correct = 0;
    for (const [qStr, letter] of Object.entries(answers)) {
      if (result.responses[Number(qStr)] === letter) correct++;
    }
    expect(correct).toBe(Object.keys(answers).length);
    expect(result.status).toBe("CONFIDENT");
  });
});

describe("raster front-end - faint marks are flagged, not dropped", () => {
  it("a ~0.35-density fill lands in the low-confidence band and is queued for review", () => {
    const faint = { 1: 0.35, 2: 0.33, 3: 0.36 };
    const img = renderSheet({ roll: "260014", answers, fills: faint });
    const raster = rasterToDensityMap(img, geom);
    for (const q of [1, 2, 3]) {
      const top = Math.max(...raster.questionDensityMap[q]);
      expect(top).toBeGreaterThan(0.28);
      expect(top).toBeLessThan(0.42);
    }
    const result = extractSheetFromImage(img, geom, "faint", { supported: true });
    const flagged = new Set(result.ambiguities.map((a) => a.questionNumber));
    for (const q of [1, 2, 3]) {
      expect(result.responses[q]).toBeUndefined();
      expect(flagged.has(q)).toBe(true);
    }
    expect(result.ambiguities.every((a) => a.reason === "LOW_CONFIDENCE" || a.reason === "STRAY_MARK")).toBe(
      true,
    );
  });
});

describe("raster front-end - fail-safe on out-of-envelope sheets", () => {
  it("a torn corner (missing fiducial) is REJECTED, not scored", () => {
    const img = renderSheet({ roll: "260014", answers, omitFiducial: 2 });
    const raster = rasterToDensityMap(img, geom);
    expect(raster.templateValid).toBe(false);
    expect(raster.fiducials).toEqual([]);

    const result = extractSheetFromImage(img, geom, "torn", { supported: true });
    expect(result.status).toBe("REJECTED");
  });

  it("a cropped bottom band is REJECTED", () => {
    const img = renderSheet({ roll: "260014", answers, clipBottomFrac: 0.18 });
    const result = extractSheetFromImage(img, geom, "cropped", { supported: true });
    expect(result.status).toBe("REJECTED");
  });
});

describe("raster front-end - roll block", () => {
  it("an unfilled roll block resolves to UNMATCHED", () => {
    const img = renderSheet({ roll: "", answers });
    const raster = rasterToDensityMap(img, geom);
    expect(raster.rollNumber).toBe("");

    const result = extractSheetFromImage(img, geom, "no-roll", { supported: true });
    expect(result.status).toBe("UNMATCHED");
  });
});

describe("raster front-end - binarize", () => {
  it("otsu separates a bimodal page", () => {
    const img = renderSheet({ roll: "260014", answers });
    const t = otsuThreshold(img);
    expect(t).toBeGreaterThan(20);
    expect(t).toBeLessThan(235);
  });
});
