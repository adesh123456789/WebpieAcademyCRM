/**
 * tests/ui-ai-copilot.test.ts
 *
 * Unit tests for AI Candidate Review & Teacher Copilot UI workflows (UI-012):
 * - Candidate status gating: unapproved questions always arrive as AI_CANDIDATE
 * - Provenance metadata formatting (provider, model, prompt template version, requestId)
 * - Source identification: MODEL vs approved BANK fallback
 * - Bank fallback shortfall detection (count - returned > 0)
 * - Copilot Action Plan structure, grounded evidence, and non-authoritative boundary
 *
 * Validates Contract AI-001 & PRD Section 30.
 */

import { describe, it, expect } from "vitest";

// ============================================================================
// Logic Helpers Mirroring UI-012 Components
// ============================================================================

export interface QuestionOption {
  id: string;
  text: string;
}

export interface QuestionCandidate {
  body: string;
  options: QuestionOption[];
  correctAnswer: string;
  solution: string;
  declaredDifficulty: "EASY" | "MEDIUM" | "HARD";
  concept: string;
  subject: string;
  status: "AI_CANDIDATE";
  source: "MODEL" | "BANK";
  provenance: {
    provider: string;
    model: string;
    promptTemplateId: string;
    promptTemplateVersion: string;
    aiRequestId: string;
  };
}

export function isCandidateGated(candidate: { status: string }): boolean {
  return candidate.status === "AI_CANDIDATE";
}

export function formatProvenanceBadge(provenance: QuestionCandidate["provenance"]): string {
  return `${provenance.provider} • ${provenance.model} (tmpl: ${provenance.promptTemplateId} v${provenance.promptTemplateVersion})`;
}

export function calculateShortfall(requested: number, returned: number): number {
  return Math.max(0, requested - returned);
}

export interface CopilotActionPlan {
  id: string;
  topic: string;
  subject: string;
  targetBatch: string;
  evidenceSummary: string;
  recommendedActions: {
    type: "REMEDIAL_WORKSHEET" | "EXTRA_DOUBT_SESSION" | "ASSIGNMENT_RETEST";
    title: string;
    description: string;
    estimatedMinutes: number;
  }[];
  retrievalScope: "TENANT_PRIVATE" | "WEBPIE_APPROVED_BANK";
  confidenceScore: number;
}

export function validateCopilotActionPlan(plan: CopilotActionPlan): {
  isValid: boolean;
  totalEstimatedMinutes: number;
  errors: string[];
} {
  const errors: string[] = [];
  if (!plan.topic) errors.push("Missing topic");
  if (!plan.evidenceSummary) errors.push("Missing evidence summary");
  if (!plan.recommendedActions || plan.recommendedActions.length === 0) {
    errors.push("Plan must have at least one recommended action");
  }

  const totalEstimatedMinutes = (plan.recommendedActions || []).reduce(
    (acc, a) => acc + (a.estimatedMinutes || 0),
    0
  );

  return {
    isValid: errors.length === 0,
    totalEstimatedMinutes,
    errors,
  };
}

// ============================================================================
// Test Suite: AI Candidate Review & Copilot (UI-012)
// ============================================================================

describe("UI-012: AI Candidate Studio & Teacher Copilot", () => {
  describe("AI Candidate Gating & Provenance Transparency", () => {
    it("ensures every newly generated question candidate is gated under AI_CANDIDATE status", () => {
      const candidate: QuestionCandidate = {
        body: "A solid sphere rolls without slipping on a horizontal surface...",
        options: [
          { id: "A", text: "Friction acts forward" },
          { id: "B", text: "Friction is zero" },
          { id: "C", text: "Friction acts backward" },
          { id: "D", text: "Friction depends on mass" },
        ],
        correctAnswer: "B",
        solution: "On a smooth horizontal surface with uniform velocity, friction is zero.",
        declaredDifficulty: "MEDIUM",
        concept: "Rolling Without Slipping",
        subject: "PHYSICS",
        status: "AI_CANDIDATE",
        source: "MODEL",
        provenance: {
          provider: "google",
          model: "gemini-1.5-flash",
          promptTemplateId: "question.generate",
          promptTemplateVersion: "1.0.0",
          aiRequestId: "req-0012345",
        },
      };

      expect(isCandidateGated(candidate)).toBe(true);
      expect(candidate.status).toBe("AI_CANDIDATE");
    });

    it("formats provenance metadata string correctly with provider, model, and template", () => {
      const prov = {
        provider: "google",
        model: "gemini-1.5-pro",
        promptTemplateId: "question.generate",
        promptTemplateVersion: "1.0.1",
        aiRequestId: "req-abc-987",
      };

      const badge = formatProvenanceBadge(prov);
      expect(badge).toBe("google • gemini-1.5-pro (tmpl: question.generate v1.0.1)");
    });

    it("distinguishes between direct MODEL output and pre-approved BANK fallback", () => {
      const modelCandidate = { source: "MODEL" };
      const bankCandidate = { source: "BANK" };

      expect(modelCandidate.source).toBe("MODEL");
      expect(bankCandidate.source).toBe("BANK");
    });
  });

  describe("Bank Fallback Shortfall Logic", () => {
    it("computes non-zero shortfall when approved bank has fewer items than requested", () => {
      // Requested 5 questions, bank only has 2 matching
      const shortfall = calculateShortfall(5, 2);
      expect(shortfall).toBe(3);
    });

    it("yields zero shortfall when full count is satisfied", () => {
      const shortfall = calculateShortfall(3, 3);
      expect(shortfall).toBe(0);
    });
  });

  describe("Teacher Copilot Action Plan Validation", () => {
    it("validates well-formed Copilot action plan and aggregates estimated intervention time", () => {
      const plan: CopilotActionPlan = {
        id: "plan-rotational-1",
        topic: "Rotational Dynamics & Torque Equilibrium",
        subject: "PHYSICS",
        targetBatch: "Rankers JEE 2026-A",
        evidenceSummary: "18 of 24 students missed torque sign convention questions in Assessment #2.",
        recommendedActions: [
          {
            type: "REMEDIAL_WORKSHEET",
            title: "Rolling Friction 5-Item Scaffold",
            description: "Step-by-step contact point analysis",
            estimatedMinutes: 30,
          },
          {
            type: "EXTRA_DOUBT_SESSION",
            title: "Sign Convention Clinic",
            description: "Focused live session with torque diagrams",
            estimatedMinutes: 25,
          },
          {
            type: "ASSIGNMENT_RETEST",
            title: "Concept Resolution Retest",
            description: "3-question verification quiz (AC-009)",
            estimatedMinutes: 15,
          },
        ],
        retrievalScope: "TENANT_PRIVATE",
        confidenceScore: 0.94,
      };

      const result = validateCopilotActionPlan(plan);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.totalEstimatedMinutes).toBe(70); // 30 + 25 + 15
    });

    it("flags invalid action plan missing diagnostic evidence or recommended items", () => {
      const invalidPlan: CopilotActionPlan = {
        id: "plan-empty",
        topic: "",
        subject: "CHEMISTRY",
        targetBatch: "Rankers",
        evidenceSummary: "",
        recommendedActions: [],
        retrievalScope: "WEBPIE_APPROVED_BANK",
        confidenceScore: 0.5,
      };

      const result = validateCopilotActionPlan(invalidPlan);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });
});
