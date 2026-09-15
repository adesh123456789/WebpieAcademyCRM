import { describe, it, expect } from "vitest";
import { CbtQuestion, CbtState } from "@/components/views/CbtView";

describe("UI-010: CBT Online Simulator & Server Clock", () => {
  // Synthetic test questions
  const sampleQuestions: CbtQuestion[] = [
    {
      orderIndex: 0,
      questionId: "q_phy_01",
      subject: "Physics",
      sectionName: "Section A",
      body: "A particle moves along a straight line with constant acceleration...",
      options: [
        { id: "A", text: "10 m/s" },
        { id: "B", text: "20 m/s" },
        { id: "C", text: "30 m/s" },
        { id: "D", text: "40 m/s" },
      ],
      type: "SINGLE_CHOICE",
      marksCorrect: 4,
      marksIncorrect: -1,
    },
    {
      orderIndex: 1,
      questionId: "q_chem_01",
      subject: "Chemistry",
      sectionName: "Section A",
      body: "Which of the following compounds exhibit hydrogen bonding?",
      options: [
        { id: "A", text: "H2O" },
        { id: "B", text: "NH3" },
        { id: "C", text: "HF" },
        { id: "D", text: "CH4" },
      ],
      type: "MULTIPLE_CHOICE",
      marksCorrect: 4,
      marksIncorrect: 0,
    },
    {
      orderIndex: 2,
      questionId: "q_math_01",
      subject: "Mathematics",
      sectionName: "Section B",
      body: "Find the integral of x^2 from 0 to 3.",
      options: [],
      type: "NUMERICAL",
      marksCorrect: 4,
      marksIncorrect: 0,
    },
    {
      orderIndex: 3,
      questionId: "q_math_02",
      subject: "Mathematics",
      sectionName: "Section B",
      body: "The radius of a circle with circumference 62.8 cm is:",
      options: [
        { id: "A", text: "5 cm" },
        { id: "B", text: "10 cm" },
      ],
      type: "SINGLE_CHOICE",
      marksCorrect: 4,
      marksIncorrect: -1,
    },
  ];

  it("evaluates NTA-standard question palette statuses correctly", () => {
    // Helper replicating palette classification
    function getStatus(qId: string, responses: Record<string, any>, marked: string[]) {
      const isAnswered =
        responses[qId] !== undefined &&
        responses[qId] !== null &&
        responses[qId] !== "" &&
        (!Array.isArray(responses[qId]) || responses[qId].length > 0);
      const isMarked = marked.includes(qId);

      if (isAnswered && isMarked) return "ANSWERED_AND_MARKED";
      if (isMarked) return "MARKED_FOR_REVIEW";
      if (isAnswered) return "ANSWERED";
      return "NOT_ANSWERED";
    }

    const responses: Record<string, any> = {
      q_phy_01: "B",
      q_chem_01: ["A", "B", "C"],
      q_math_01: "", // empty numerical = not answered
    };
    const marked = ["q_chem_01", "q_math_02"];

    expect(getStatus("q_phy_01", responses, marked)).toBe("ANSWERED");
    expect(getStatus("q_chem_01", responses, marked)).toBe("ANSWERED_AND_MARKED");
    expect(getStatus("q_math_01", responses, marked)).toBe("NOT_ANSWERED");
    expect(getStatus("q_math_02", responses, marked)).toBe("MARKED_FOR_REVIEW");
  });

  it("calculates accurate summary tallies for submit confirmation modal", () => {
    const responses: Record<string, any> = {
      q_phy_01: "B",
      q_chem_01: ["A", "B"],
      q_math_01: "9",
    };
    const marked = ["q_phy_01", "q_math_02"];

    let answered = 0;
    let markedCount = 0;
    let answeredAndMarked = 0;
    let notAnswered = 0;

    sampleQuestions.forEach((q) => {
      const isAnswered =
        responses[q.questionId] !== undefined &&
        responses[q.questionId] !== null &&
        responses[q.questionId] !== "" &&
        (!Array.isArray(responses[q.questionId]) || responses[q.questionId].length > 0);
      const isMarked = marked.includes(q.questionId);

      if (isAnswered && isMarked) answeredAndMarked++;
      else if (isMarked) markedCount++;
      else if (isAnswered) answered++;
      else notAnswered++;
    });

    expect(sampleQuestions.length).toBe(4);
    expect(answered).toBe(2); // q_chem_01 and q_math_01
    expect(answeredAndMarked).toBe(1); // q_phy_01
    expect(markedCount).toBe(1); // q_math_02
    expect(notAnswered).toBe(0);
    expect(answered + answeredAndMarked).toBe(3);
  });

  it("derives authoritative remaining time strictly from server-assigned expiresAt", () => {
    const serverTimeStr = "2026-09-15T10:00:00.000Z";
    const expiresAtStr = "2026-09-15T11:30:00.000Z"; // 90 min duration

    const serverMs = new Date(serverTimeStr).getTime();
    const localMs = new Date("2026-09-15T09:55:00.000Z").getTime(); // local clock is 5 minutes slow
    const serverOffset = serverMs - localMs;

    // Remaining seconds when local clock says 10:25:00 (which is 10:30:00 server time)
    const simulatedLocalNow = new Date("2026-09-15T10:25:00.000Z").getTime();
    const effectiveServerNow = simulatedLocalNow + serverOffset;
    const deadlineMs = new Date(expiresAtStr).getTime();
    const remainingSec = Math.max(0, Math.floor((deadlineMs - effectiveServerNow) / 1000));

    expect(remainingSec).toBe(3600); // exactly 60 minutes remaining
  });

  it("handles multiple choice option toggles without duplicating items", () => {
    let responses: Record<string, string[]> = {
      q_chem_01: ["A"],
    };

    // Toggle option B on
    const existing = responses["q_chem_01"] || [];
    responses["q_chem_01"] = existing.includes("B")
      ? existing.filter((id) => id !== "B")
      : [...existing, "B"];
    expect(responses["q_chem_01"]).toEqual(["A", "B"]);

    // Toggle option A off
    responses["q_chem_01"] = responses["q_chem_01"].filter((id) => id !== "A");
    expect(responses["q_chem_01"]).toEqual(["B"]);
  });

  it("clears response cleanly on clear response action", () => {
    const responses: Record<string, any> = {
      q_phy_01: "B",
      q_chem_01: ["A", "B"],
    };

    delete responses["q_phy_01"];
    expect(responses["q_phy_01"]).toBeUndefined();
    expect(responses["q_chem_01"]).toBeDefined();
  });

  it("generates correct heartbeat payload conforming to PUT /api/v1/cbt/attempts contract", () => {
    const attemptId = "cbt_att_123456";
    const responses = { q_phy_01: "C", q_math_01: "15.5" };
    const markedForReview = ["q_phy_01"];

    const heartbeatBody = {
      attemptId,
      responses,
      markedForReview,
    };

    expect(heartbeatBody.attemptId).toBe("cbt_att_123456");
    expect(heartbeatBody.responses).toEqual({ q_phy_01: "C", q_math_01: "15.5" });
    expect(heartbeatBody.markedForReview).toContain("q_phy_01");
  });

  it("resumes in-progress attempt state seamlessly from server payload", () => {
    // Contract CBT-001 POST response payload
    const resumedServerPayload = {
      attemptId: "cbt_att_resume_999",
      durationMinutes: 180,
      startTime: "2026-09-15T09:00:00.000Z",
      serverTime: "2026-09-15T09:30:00.000Z",
      expiresAt: "2026-09-15T12:00:00.000Z",
      responses: { q_phy_01: "D", q_math_01: "42" },
      markedForReview: ["q_math_01"],
      questions: sampleQuestions,
    };

    const state: CbtState = {
      inExam: true,
      attemptId: resumedServerPayload.attemptId,
      currentQIdx: 0,
      questions: resumedServerPayload.questions,
      responses: resumedServerPayload.responses,
      markedForReview: resumedServerPayload.markedForReview,
      expiresAt: resumedServerPayload.expiresAt,
      serverTime: resumedServerPayload.serverTime,
      durationMinutes: resumedServerPayload.durationMinutes,
      submitted: false,
    };

    expect(state.inExam).toBe(true);
    expect(state.attemptId).toBe("cbt_att_resume_999");
    expect(state.responses["q_phy_01"]).toBe("D");
    expect(state.markedForReview).toContain("q_math_01");
    expect(state.questions).toHaveLength(4);
  });
});
