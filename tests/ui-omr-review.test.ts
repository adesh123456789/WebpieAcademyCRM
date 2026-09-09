/**
 * tests/ui-omr-review.test.ts
 *
 * Unit tests for OMR Review, Telemetry, Ambiguity Crop Review, and Finalize Safety Floor (UI-005).
 * Validates Contract C04 invariants:
 *  - Classification of scans (CONFIDENT, AMBIGUOUS, UNMATCHED, REJECTED, OVERRIDDEN)
 *  - Hard blocking of finalize action when any ambiguous/unmatched/rejected sheet remains
 *  - Optimistic concurrency version tracking for teacher overrides
 *  - Audit trail payload generation
 *  - Progress telemetry and verification completion percentage
 */

import { describe, it, expect } from "vitest";

// ============================================================================
// Logic Helpers Mirroring Component Invariants
// ============================================================================

export interface ScanItem {
  id: string;
  detectedRollNumber?: string;
  status: "CONFIDENT" | "AMBIGUOUS" | "UNMATCHED" | "REJECTED" | "OVERRIDDEN";
  confidenceScore: number;
  detectedResponses?: string;
  verifiedResponses?: string;
  ambiguityFlags?: string;
}

export function computeOmrMetrics(scans: ScanItem[], jobStatus?: string) {
  let confident = 0;
  let ambiguous = 0;
  let unmatched = 0;
  let rejected = 0;
  let overridden = 0;

  scans.forEach((s) => {
    const st = s.status?.toUpperCase() || "CONFIDENT";
    if (st === "CONFIDENT") confident++;
    else if (st === "AMBIGUOUS") ambiguous++;
    else if (st === "UNMATCHED") unmatched++;
    else if (st === "REJECTED") rejected++;
    else if (st === "OVERRIDDEN") overridden++;
  });

  const unresolvedCount = ambiguous + unmatched + rejected;
  const isFinalizeBlocked = unresolvedCount > 0 || jobStatus === "PROCESSING";

  return {
    total: scans.length,
    confident,
    ambiguous,
    unmatched,
    rejected,
    overridden,
    unresolvedCount,
    isFinalizeBlocked,
    completionRate: scans.length > 0 ? Math.round(((confident + overridden) / scans.length) * 100) : 0,
  };
}

export function filterOmrScans(
  scans: ScanItem[],
  tab: "ALL" | "REVIEW_NEEDED" | "CONFIDENT" | "OVERRIDDEN" | "UNMATCHED" | "REJECTED",
  searchRoll?: string
) {
  return scans.filter((s) => {
    const st = s.status?.toUpperCase() || "CONFIDENT";
    const rollMatch = !searchRoll || (s.detectedRollNumber || "").toLowerCase().includes(searchRoll.toLowerCase());
    if (!rollMatch) return false;

    if (tab === "ALL") return true;
    if (tab === "REVIEW_NEEDED") return st === "AMBIGUOUS" || st === "UNMATCHED" || st === "REJECTED";
    if (tab === "CONFIDENT") return st === "CONFIDENT";
    if (tab === "OVERRIDDEN") return st === "OVERRIDDEN";
    if (tab === "UNMATCHED") return st === "UNMATCHED";
    if (tab === "REJECTED") return st === "REJECTED";
    return true;
  });
}

export function constructOverridePayload(
  scanId: string,
  questionNumber: number,
  newResponse: string,
  reason: string,
  currentVersion: number
) {
  return {
    scanId,
    questionNumber,
    newResponse,
    reason: reason.trim(),
    expectedVersion: currentVersion,
  };
}

// ============================================================================
// Test Suites
// ============================================================================

describe("UI-005: OMR Review & Contract C04 Safety Floor", () => {
  const sampleScans: ScanItem[] = [
    {
      id: "scan-1",
      detectedRollNumber: "260001",
      status: "CONFIDENT",
      confidenceScore: 0.98,
      detectedResponses: JSON.stringify({ "1": "A", "2": "B" }),
    },
    {
      id: "scan-2",
      detectedRollNumber: "260002",
      status: "AMBIGUOUS",
      confidenceScore: 0.72,
      detectedResponses: JSON.stringify({ "1": "C", "2": "D" }),
      ambiguityFlags: JSON.stringify([
        { questionNumber: 1, reason: "DOUBLE_MARK", message: "Double fill detected on options A and C" },
      ]),
    },
    {
      id: "scan-3",
      detectedRollNumber: "999999",
      status: "UNMATCHED",
      confidenceScore: 0.88,
    },
    {
      id: "scan-4",
      detectedRollNumber: "260004",
      status: "REJECTED",
      confidenceScore: 0.35,
      ambiguityFlags: JSON.stringify([
        { questionNumber: 0, reason: "TORN_CORNER", message: "Fiducial anchor misalignment" },
      ]),
    },
    {
      id: "scan-5",
      detectedRollNumber: "260005",
      status: "OVERRIDDEN",
      confidenceScore: 0.91,
      verifiedResponses: JSON.stringify({ "1": "B" }),
    },
  ];

  describe("Contract C04 Finalization Safety Floor", () => {
    it("physically blocks finalization when unresolved scans exist", () => {
      const metrics = computeOmrMetrics(sampleScans, "REVIEW_REQUIRED");
      expect(metrics.unresolvedCount).toBe(3); // 1 ambiguous + 1 unmatched + 1 rejected
      expect(metrics.isFinalizeBlocked).toBe(true);
    });

    it("blocks finalization when job status is PROCESSING regardless of scan states", () => {
      const allConfident: ScanItem[] = [
        { id: "s1", status: "CONFIDENT", confidenceScore: 0.95 },
        { id: "s2", status: "CONFIDENT", confidenceScore: 0.96 },
      ];
      const metrics = computeOmrMetrics(allConfident, "PROCESSING");
      expect(metrics.unresolvedCount).toBe(0);
      expect(metrics.isFinalizeBlocked).toBe(true);
    });

    it("unblocks finalization only when all sheets are CONFIDENT or OVERRIDDEN", () => {
      const resolvedScans: ScanItem[] = [
        { id: "s1", status: "CONFIDENT", confidenceScore: 0.95 },
        { id: "s2", status: "OVERRIDDEN", confidenceScore: 0.85 },
        { id: "s3", status: "CONFIDENT", confidenceScore: 0.99 },
      ];
      const metrics = computeOmrMetrics(resolvedScans, "REVIEW_REQUIRED");
      expect(metrics.unresolvedCount).toBe(0);
      expect(metrics.isFinalizeBlocked).toBe(false);
      expect(metrics.completionRate).toBe(100);
    });
  });

  describe("Telemetry and Verification Progress", () => {
    it("accurately counts every classification bucket", () => {
      const metrics = computeOmrMetrics(sampleScans);
      expect(metrics.total).toBe(5);
      expect(metrics.confident).toBe(1);
      expect(metrics.ambiguous).toBe(1);
      expect(metrics.unmatched).toBe(1);
      expect(metrics.rejected).toBe(1);
      expect(metrics.overridden).toBe(1);
    });

    it("computes verification completion percentage correctly", () => {
      // 1 confident + 1 overridden out of 5 = 40%
      const metrics = computeOmrMetrics(sampleScans);
      expect(metrics.completionRate).toBe(40);
    });

    it("handles zero sheets safely without NaN", () => {
      const metrics = computeOmrMetrics([]);
      expect(metrics.total).toBe(0);
      expect(metrics.completionRate).toBe(0);
      expect(metrics.isFinalizeBlocked).toBe(false);
    });
  });

  describe("Review Queue Filtering", () => {
    it("filters REVIEW_NEEDED to ambiguous, unmatched, and rejected items", () => {
      const reviewNeeded = filterOmrScans(sampleScans, "REVIEW_NEEDED");
      expect(reviewNeeded.length).toBe(3);
      expect(reviewNeeded.map((s) => s.id)).toEqual(["scan-2", "scan-3", "scan-4"]);
    });

    it("filters by CONFIDENT", () => {
      const confident = filterOmrScans(sampleScans, "CONFIDENT");
      expect(confident.length).toBe(1);
      expect(confident[0].id).toBe("scan-1");
    });

    it("filters by OVERRIDDEN", () => {
      const overridden = filterOmrScans(sampleScans, "OVERRIDDEN");
      expect(overridden.length).toBe(1);
      expect(overridden[0].id).toBe("scan-5");
    });

    it("filters by student roll number query", () => {
      const matches = filterOmrScans(sampleScans, "ALL", "260002");
      expect(matches.length).toBe(1);
      expect(matches[0].id).toBe("scan-2");
    });

    it("returns empty array when query does not match", () => {
      const matches = filterOmrScans(sampleScans, "ALL", "NONEXISTENT");
      expect(matches.length).toBe(0);
    });
  });

  describe("Contract C04 Audit Override Payload", () => {
    it("constructs valid override payload with expectedVersion and reason", () => {
      const payload = constructOverridePayload("scan-2", 1, "A", "Legitimate mark verified by teacher", 1);
      expect(payload).toEqual({
        scanId: "scan-2",
        questionNumber: 1,
        newResponse: "A",
        reason: "Legitimate mark verified by teacher",
        expectedVersion: 1,
      });
    });

    it("trims whitespace from override justification note", () => {
      const payload = constructOverridePayload("scan-2", 2, "B", "   Teacher manual correction   ", 2);
      expect(payload.reason).toBe("Teacher manual correction");
      expect(payload.expectedVersion).toBe(2);
    });
  });
});
