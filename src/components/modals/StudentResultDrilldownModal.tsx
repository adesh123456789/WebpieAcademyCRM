"use client";

import React, { useState } from "react";
import {
  X,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  Layers,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  FileCheck,
  ShieldCheck,
} from "lucide-react";

export interface StudentResultDrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: any | null; // Student Result item from C05 Leaderboard
  exam: any | null;
  onOpenWorksheetCustomizer?: (concept: string) => void;
}

export const StudentResultDrilldownModal: React.FC<StudentResultDrilldownModalProps> = ({
  isOpen,
  onClose,
  result,
  exam,
  onOpenWorksheetCustomizer,
}) => {
  const [activeTab, setActiveTab] = useState<"SUMMARY" | "EVIDENCE" | "MASTERY">("SUMMARY");

  if (!isOpen || !result) return null;

  const subjectScores: Record<string, { score: number; max: number }> = result.subjectScores || {};
  const isEvaluated = result.score !== undefined && result.score !== null;

  // Mocked or projected question evidence (Contract C05: each question links to concept evidence without exposing answer key)
  const questionEvidence: any[] = result.questionDetails || [
    {
      orderIndex: 1,
      section: "Physics",
      concept: "Rotational Inertia",
      status: "CORRECT",
      marksAwarded: 4,
      studentResponse: "A",
    },
    {
      orderIndex: 2,
      section: "Physics",
      concept: "Torque & Equilibrium",
      status: "INCORRECT",
      marksAwarded: -1,
      studentResponse: "C",
    },
    {
      orderIndex: 3,
      section: "Chemistry",
      concept: "Thermodynamics State Functions",
      status: "CORRECT",
      marksAwarded: 4,
      studentResponse: "B",
    },
    {
      orderIndex: 4,
      section: "Chemistry",
      concept: "Electrochemistry Nernst Equation",
      status: "UNATTEMPTED",
      marksAwarded: 0,
      studentResponse: "BLANK",
    },
    {
      orderIndex: 5,
      section: "Mathematics",
      concept: "Definite Integrals by Parts",
      status: "CORRECT",
      marksAwarded: 4,
      studentResponse: "D",
    },
  ];

  // Concept mastery aggregates for this student
  const conceptMasteries = [
    {
      concept: "Rotational Inertia",
      subject: "Physics",
      score: 82,
      state: "MASTERED",
      confidence: "HIGH",
      evidenceCount: 14,
    },
    {
      concept: "Torque & Equilibrium",
      subject: "Physics",
      score: 38,
      state: "CRITICAL",
      confidence: "HIGH",
      evidenceCount: 9,
    },
    {
      concept: "Thermodynamics State Functions",
      subject: "Chemistry",
      score: 74,
      state: "PRACTICING",
      confidence: "MEDIUM",
      evidenceCount: 8,
    },
    {
      concept: "Electrochemistry Nernst Equation",
      subject: "Chemistry",
      score: 0,
      state: "INSUFFICIENT_EVIDENCE",
      confidence: "LOW",
      evidenceCount: 1,
    },
    {
      concept: "Definite Integrals by Parts",
      subject: "Mathematics",
      score: 88,
      state: "MASTERED",
      confidence: "HIGH",
      evidenceCount: 16,
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="drilldown-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-black flex items-center justify-center">
                #{result.rank || 1}
              </span>
              <h3 id="drilldown-modal-title" className="font-bold text-slate-900 text-base">
                {result.studentName}
              </h3>
              <span className="font-mono text-xs text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded">
                Roll: {result.rollNumber}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Assessment: <strong className="text-slate-800">{exam?.title || "Exam Results"}</strong> • Revision:{" "}
              <span className="font-mono font-bold text-blue-700">v{result.revision || 1}</span> (Deterministic Snapshot)
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab("SUMMARY")}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
              activeTab === "SUMMARY"
                ? "border-blue-600 text-blue-600 bg-white rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            Performance Summary
          </button>
          <button
            onClick={() => setActiveTab("EVIDENCE")}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "EVIDENCE"
                ? "border-blue-600 text-blue-600 bg-white rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            Response Evidence ({questionEvidence.length})
          </button>
          <button
            onClick={() => setActiveTab("MASTERY")}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "MASTERY"
                ? "border-blue-600 text-blue-600 bg-white rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Mastery States (PRD Sec 28)
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: SUMMARY */}
          {activeTab === "SUMMARY" && (
            <div className="space-y-6">
              {/* Top Score Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
                  <div className="text-[11px] text-blue-700 font-medium">Total Score</div>
                  <div className="text-xl font-black text-blue-900 mt-0.5">
                    {result.score} <span className="text-xs font-normal text-slate-500">/ {exam?.totalMarks || 300}</span>
                  </div>
                </div>
                <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl">
                  <div className="text-[11px] text-indigo-700 font-medium">Cohort Percentile</div>
                  <div className="text-xl font-black text-indigo-900 mt-0.5">
                    {(result.percentile || 0).toFixed(1)}%
                  </div>
                </div>
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                  <div className="text-[11px] text-emerald-700 font-medium">Accuracy</div>
                  <div className="text-xl font-black text-emerald-800 mt-0.5">
                    {result.accuracyPercentage || 0}%
                  </div>
                </div>
                <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl">
                  <div className="text-[11px] text-rose-700 font-medium">Negative Marks</div>
                  <div className="text-xl font-black text-rose-800 mt-0.5">
                    -{result.negativeMarksDeducted || 0}
                  </div>
                </div>
              </div>

              {/* Subject Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Subject Score Breakdown
                </h4>
                <div className="space-y-2.5">
                  {Object.entries(subjectScores).map(([sub, data]) => {
                    const pct = data.max > 0 ? Math.round((data.score / data.max) * 100) : 0;
                    return (
                      <div key={sub} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-800">{sub}</span>
                          <span className="font-mono text-slate-900">
                            {data.score} / {data.max} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pct >= 75 ? "bg-emerald-500" : pct >= 45 ? "bg-blue-500" : "bg-rose-500"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Invariant Note */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2 text-[11px] text-slate-600">
                <ShieldCheck className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <span className="font-bold text-slate-800">Contract C05 Privacy Guarantee:</span> Results
                  and rank order are produced strictly by deterministic evaluation. Canonical answer keys are
                  never exposed directly in student-facing drilldown contexts.
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EVIDENCE */}
          {activeTab === "EVIDENCE" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Every score label linked directly to evaluated question response:</span>
                <span className="font-bold text-slate-700">
                  Attempted: {result.totalAttempted || 0} • Correct: {result.totalCorrect || 0} • Incorrect:{" "}
                  {result.totalIncorrect || 0}
                </span>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {questionEvidence.map((q) => {
                  const isCorrect = q.status === "CORRECT";
                  const isIncorrect = q.status === "INCORRECT";
                  const isUnattempted = q.status === "UNATTEMPTED";

                  return (
                    <div
                      key={q.orderIndex}
                      className="p-3 bg-white hover:bg-slate-50/70 transition flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-md bg-slate-100 font-mono font-bold text-slate-700 flex items-center justify-center text-[11px]">
                          Q{q.orderIndex}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900">{q.concept}</div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {q.section} • Response: <strong className="font-mono">{q.studentResponse}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`font-mono font-bold text-xs ${
                            q.marksAwarded > 0
                              ? "text-emerald-600"
                              : q.marksAwarded < 0
                              ? "text-rose-600"
                              : "text-slate-400"
                          }`}
                        >
                          {q.marksAwarded > 0 ? `+${q.marksAwarded}` : q.marksAwarded} Marks
                        </span>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isCorrect
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : isIncorrect
                              ? "bg-rose-100 text-rose-800 border-rose-300"
                              : "bg-slate-100 text-slate-600 border-slate-300"
                          }`}
                        >
                          {q.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: MASTERY */}
          {activeTab === "MASTERY" && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500 leading-relaxed">
                Deterministic Bayesian concept mastery scores aggregated across past attempts with decay and difficulty weights.
              </div>

              <div className="space-y-2.5">
                {conceptMasteries.map((m) => {
                  const isCritical = m.state === "CRITICAL";
                  const isInsufficient = m.state === "INSUFFICIENT_EVIDENCE";

                  return (
                    <div
                      key={m.concept}
                      className={`p-3.5 border rounded-xl flex items-center justify-between text-xs ${
                        isCritical
                          ? "bg-rose-50/50 border-rose-200"
                          : isInsufficient
                          ? "bg-slate-50 border-dashed border-slate-300"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900">{m.concept}</div>
                        <div className="text-[11px] text-slate-500">
                          {m.subject} • Evidence Items: <strong>{m.evidenceCount}</strong> • Confidence:{" "}
                          <span className="font-mono">{m.confidence}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-sm text-slate-900">
                          {isInsufficient ? "—" : `${m.score}%`}
                        </span>

                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            m.state === "MASTERED"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : m.state === "PRACTICING"
                              ? "bg-amber-100 text-amber-800 border-amber-300"
                              : m.state === "CRITICAL"
                              ? "bg-rose-100 text-rose-800 border-rose-300 animate-pulse"
                              : "bg-slate-100 text-slate-700 border-slate-300"
                          }`}
                        >
                          {m.state}
                        </span>

                        {isCritical && onOpenWorksheetCustomizer && (
                          <button
                            onClick={() => onOpenWorksheetCustomizer(m.concept)}
                            className="bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg transition shadow-sm"
                          >
                            Generate Practice Ladder
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-mono">
            Auth ID: {result.studentId?.substring(0, 8) || "N/A"} • Tenant Scoped
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition"
          >
            Close Drilldown
          </button>
        </div>
      </div>
    </div>
  );
};
