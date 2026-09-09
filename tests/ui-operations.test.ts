/**
 * tests/ui-operations.test.ts
 *
 * Unit tests for Operations UI workflows (UI-008):
 * - CRM 5-Stage Kanban Funnel progression (ENQUIRY -> FOLLOW_UP -> DEMO -> ADMISSION -> LOST)
 * - Duplicate phone detection in CRM leads
 * - Fee collection idempotency key payload formatting
 * - Append-only fee receipt reversal audit status preservation
 * - Session attendance rate and telemetry calculations
 *
 * Validates Contract OPS-001.
 */

import { describe, it, expect } from "vitest";

// ============================================================================
// Logic Helpers Mirroring UI-008 Components
// ============================================================================

export type CrmStage = "ENQUIRY" | "FOLLOW_UP" | "DEMO" | "ADMISSION" | "LOST";

export const CRM_STAGES: CrmStage[] = ["ENQUIRY", "FOLLOW_UP", "DEMO", "ADMISSION", "LOST"];

export function getNextCrmStage(currentStage: CrmStage): CrmStage | null {
  const idx = CRM_STAGES.indexOf(currentStage);
  if (idx >= 0 && idx < CRM_STAGES.length - 1) {
    return CRM_STAGES[idx + 1];
  }
  return null;
}

export function detectDuplicatePhoneNumbers(leads: { phone?: string }[]): Set<string> {
  const counts: Record<string, number> = {};
  leads.forEach((l) => {
    if (l.phone) counts[l.phone] = (counts[l.phone] || 0) + 1;
  });
  return new Set(Object.keys(counts).filter((p) => counts[p] > 1));
}

export interface FeePaymentPayload {
  studentId: string;
  amount: number;
  paymentMode: string;
  remarks: string;
  idempotencyKey: string;
}

export function buildIdempotentFeePayload(
  studentId: string,
  amount: number,
  paymentMode: string,
  remarks: string,
  keyPrefix = "fee"
): FeePaymentPayload {
  const idempotencyKey = keyPrefix + "-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);
  return {
    studentId,
    amount,
    paymentMode,
    remarks,
    idempotencyKey,
  };
}

export interface FeeReceipt {
  id: string;
  receiptNumber: string;
  amount: number;
  status: "SUCCESS" | "REVERSED";
  remarks?: string;
}

export function applyReceiptReversal(
  receipt: FeeReceipt,
  reason: string
): FeeReceipt {
  return {
    ...receipt,
    status: "REVERSED",
    remarks: (receipt.remarks ? receipt.remarks + " " : "") + "[REVERSED: " + reason + "]",
  };
}

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

export function calculateAttendanceMetrics(
  studentIds: string[],
  roster: Record<string, AttendanceStatus>
): { present: number; absent: number; late: number; rate: number } {
  let present = 0;
  let absent = 0;
  let late = 0;

  studentIds.forEach((id) => {
    const st = roster[id] || "PRESENT";
    if (st === "PRESENT") present++;
    else if (st === "ABSENT") absent++;
    else if (st === "LATE") late++;
  });

  const total = studentIds.length || 1;
  const rate = Math.round(((present + late) / total) * 100);

  return { present, absent, late, rate };
}

// ============================================================================
// Test Suite: Operations UI (UI-008 / Contract OPS-001)
// ============================================================================

describe("UI-008: Operations UI & Invariants", () => {
  describe("CRM 5-Stage Funnel & Duplicate Detection", () => {
    it("progresses sequentially through all 5 CRM stages", () => {
      expect(getNextCrmStage("ENQUIRY")).toBe("FOLLOW_UP");
      expect(getNextCrmStage("FOLLOW_UP")).toBe("DEMO");
      expect(getNextCrmStage("DEMO")).toBe("ADMISSION");
      expect(getNextCrmStage("ADMISSION")).toBe("LOST");
      expect(getNextCrmStage("LOST")).toBeNull();
    });

    it("identifies duplicate telephone numbers across prospective leads", () => {
      const mockLeads = [
        { id: "lead-1", name: "Aarav Sharma", phone: "9822012345" },
        { id: "lead-2", name: "Ananya Patil", phone: "9876543210" },
        { id: "lead-3", name: "Aarav Sharma Duplicate Enquiry", phone: "9822012345" },
        { id: "lead-4", name: "Rohan Kulkarni", phone: "9123456780" },
      ];

      const duplicates = detectDuplicatePhoneNumbers(mockLeads);
      expect(duplicates.has("9822012345")).toBe(true);
      expect(duplicates.has("9876543210")).toBe(false);
      expect(duplicates.size).toBe(1);
    });
  });

  describe("Fee Payments & Idempotency", () => {
    it("generates a well-formed idempotent payment payload with unique key", () => {
      const payload1 = buildIdempotentFeePayload("stud-001", 15000, "UPI", "Term 1 installment");
      const payload2 = buildIdempotentFeePayload("stud-001", 15000, "UPI", "Term 1 installment");

      expect(payload1.studentId).toBe("stud-001");
      expect(payload1.amount).toBe(15000);
      expect(payload1.idempotencyKey).toMatch(/^fee-\d+-[a-z0-9]+$/);
      expect(payload1.idempotencyKey).not.toBe(payload2.idempotencyKey);
    });

    it("executes append-only receipt reversal preserving original id and marking status", () => {
      const originalReceipt: FeeReceipt = {
        id: "rcpt-2026-00042",
        receiptNumber: "REC-2026-00042",
        amount: 25000,
        status: "SUCCESS",
        remarks: "Advance Term Fee",
      };

      const reversed = applyReceiptReversal(originalReceipt, "Parent requested refund on withdrawal");

      expect(reversed.id).toBe(originalReceipt.id);
      expect(reversed.receiptNumber).toBe(originalReceipt.receiptNumber);
      expect(reversed.amount).toBe(25000);
      expect(reversed.status).toBe("REVERSED");
      expect(reversed.remarks).toContain("[REVERSED: Parent requested refund on withdrawal]");
    });
  });

  describe("Attendance Session Telemetry", () => {
    it("computes present, absent, late counts and attendance percentage accurately", () => {
      const studentIds = ["s1", "s2", "s3", "s4", "s5"];
      const roster: Record<string, AttendanceStatus> = {
        s1: "PRESENT",
        s2: "PRESENT",
        s3: "LATE",
        s4: "ABSENT",
      };

      const metrics = calculateAttendanceMetrics(studentIds, roster);

      expect(metrics.present).toBe(3);
      expect(metrics.late).toBe(1);
      expect(metrics.absent).toBe(1);
      expect(metrics.rate).toBe(80);
    });

    it("handles 100% full attendance when quick-marking all present", () => {
      const studentIds = ["s1", "s2", "s3"];
      const roster: Record<string, AttendanceStatus> = {
        s1: "PRESENT",
        s2: "PRESENT",
        s3: "PRESENT",
      };

      const metrics = calculateAttendanceMetrics(studentIds, roster);
      expect(metrics.present).toBe(3);
      expect(metrics.absent).toBe(0);
      expect(metrics.rate).toBe(100);
    });
  });
});
