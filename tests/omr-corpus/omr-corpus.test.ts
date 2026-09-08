import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { loadCorpus } from "./schema";
import { formatMarkdown, runCorpus, type CorpusReport } from "./runner";

/**
 * CLD-002 - OMR benchmark corpus.
 *
 * Runs the labelled synthetic corpus through the current deterministic OMR
 * engine and asserts safety invariants plus regression ceilings. The generated
 * report (tests/omr-corpus/REPORT.md) is committed and regenerated
 * deterministically on every run, so metric changes show up in its diff.
 *
 * BASELINE reflects the *simulated* engine (density logic only, no real pixels).
 * The OMR-001 safety slice (114070c) removed all false confidence and silent
 * misses by routing faint / isolated marks and out-of-envelope sheets to review,
 * which deliberately traded auto-extraction accuracy for review rate. The full
 * OMR-001 (real raster + anchors) must recover accuracy via shape/position
 * features. If any ceiling here regresses, this suite fails on purpose.
 */
const BASELINE = {
  // OMR-001 trades auto-accepts for human review on faint/isolated marks.
  // New safety baseline after eliminating false confidence and silent misses.
  extractionAccuracyFloor: 0.73,
  reviewRateCeil: 0.42,
  falseConfidenceRateCeil: 0.02,
  silentMissRateCeil: 0.08,
  unsupportedConfidentLeaksCeil: 0,
} as const;

const fixtures = loadCorpus();
let report: CorpusReport;

describe("OMR benchmark corpus (CLD-002)", () => {
  it("loads and schema-validates every fixture", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(10);
    const supported = fixtures.filter((f) => f.sheet.supported);
    const unsupported = fixtures.filter((f) => !f.sheet.supported);
    expect(supported.length).toBeGreaterThanOrEqual(7);
    expect(unsupported.length).toBeGreaterThanOrEqual(2);
  });

  it("runs the corpus and produces the three headline metrics", () => {
    report = runCorpus(fixtures);
    expect(report.supportedQuestions).toBeGreaterThan(100);
    for (const k of ["extractionAccuracy", "reviewRate", "falseConfidenceRate"] as const) {
      expect(typeof report[k]).toBe("number");
      expect(report[k]).toBeGreaterThanOrEqual(0);
      expect(report[k]).toBeLessThanOrEqual(1);
    }
    // eslint-disable-next-line no-console
    console.log(
      `[omr-corpus] accuracy=${report.extractionAccuracy} review=${report.reviewRate} ` +
        `falseConfidence=${report.falseConfidenceRate} silentMiss=${report.silentMissRate} ` +
        `unsupportedLeaks=${report.unsupportedConfidentLeaks}`,
    );
  });

  it("never auto-accepts a wrong answer on clean supported sheets", () => {
    report ??= runCorpus(fixtures);
    const cleanFiles = new Set(
      fixtures.filter((f) => f.sheet.supported && f.sheet.capture.condition === "clean").map((f) => f.file),
    );
    const cleanFalseConfident = report.falseConfidentQuestions.filter((q) => cleanFiles.has(q.file));
    expect(cleanFalseConfident).toEqual([]);
    const cleanSilentMiss = report.silentMissQuestions.filter((q) => cleanFiles.has(q.file));
    expect(cleanSilentMiss).toEqual([]);
  });

  it("routes sheets with no roll number to the unmatched queue", () => {
    report ??= runCorpus(fixtures);
    expect(report.unmatchedDetectionMisses).toBe(0);
  });

  it("holds the recorded baseline (no regression)", () => {
    report ??= runCorpus(fixtures);
    expect(report.extractionAccuracy).toBeGreaterThanOrEqual(BASELINE.extractionAccuracyFloor);
    expect(report.reviewRate).toBeLessThanOrEqual(BASELINE.reviewRateCeil);
    expect(report.falseConfidenceRate).toBeLessThanOrEqual(BASELINE.falseConfidenceRateCeil);
    expect(report.silentMissRate).toBeLessThanOrEqual(BASELINE.silentMissRateCeil);
    expect(report.unsupportedConfidentLeaks).toBeLessThanOrEqual(
      BASELINE.unsupportedConfidentLeaksCeil,
    );
  });
});

afterAll(() => {
  if (!report) return;
  try {
    const out = fileURLToPath(new URL("./REPORT.md", import.meta.url));
    writeFileSync(out, formatMarkdown(report), "utf8");
  } catch {
    // report generation is a convenience, not a test requirement
  }
});
