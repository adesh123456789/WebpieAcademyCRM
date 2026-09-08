"use client";

import React from "react";
import { Sparkles } from "lucide-react";

interface QuestionsViewProps {
  questions: any[];
  aiCandidates: any[];
  aiPrompting: boolean;
  onTriggerAiGeneration: () => void;
  onApproveCandidate: (index: number) => void;
}

export const QuestionsView: React.FC<QuestionsViewProps> = ({
  questions,
  aiCandidates,
  aiPrompting,
  onTriggerAiGeneration,
  onApproveCandidate,
}) => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Question Bank & AI Generator</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified JEE/NEET questions with LaTeX formulae and complete solutions.
          </p>
        </div>
        <button
          onClick={onTriggerAiGeneration}
          disabled={aiPrompting}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          {aiPrompting ? "Generating via AI Gateway..." : "AI Candidate Generator"}
        </button>
      </div>

      {/* AI Candidate Review Area */}
      {aiCandidates.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              AI Generated Candidates (Awaiting Teacher Approval - PRD AI-004)
            </div>
            <span className="text-[11px] font-mono text-indigo-700">
              Provider: {aiCandidates[0]?.provenance?.provider}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aiCandidates.map((cand, idx) => (
              <div key={idx} className="bg-white border border-indigo-200 p-4 rounded-lg space-y-2 text-xs shadow-sm">
                <div className="font-bold text-slate-900">{cand.body}</div>
                <div className="grid grid-cols-2 gap-1 text-slate-700">
                  {cand.options?.map((opt: any) => (
                    <div key={opt.id} className="bg-slate-50 p-2 rounded border border-slate-200">
                      <span className="font-bold text-blue-600">({opt.id})</span> {opt.text}
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-slate-100 text-emerald-700 font-bold">
                  Correct Answer: Option {cand.correctAnswer}
                </div>
                <div className="text-slate-500 text-[11px] leading-relaxed">{cand.solution}</div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => onApproveCandidate(idx)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1 rounded font-bold transition"
                  >
                    Approve Candidate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verified Questions List */}
      <div className="space-y-4">
        {questions.map((q) => (
          <div key={q.id} className="bg-white border border-slate-200 p-5 rounded-xl space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                  {q.code}
                </span>
                <span className="text-xs text-slate-600 font-semibold">
                  {q.subject} • {q.chapter}
                </span>
              </div>
              <span className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-bold">
                Difficulty: {q.declaredDifficulty}
              </span>
            </div>

            <p className="text-sm font-semibold text-slate-900">{q.body}</p>

            {q.options && q.options.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {q.options.map((opt: any) => (
                  <div
                    key={opt.id}
                    className={`p-2.5 rounded-lg border ${
                      opt.id === q.correctAnswer
                        ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    <span className="font-bold mr-2">({opt.id})</span> {opt.text}
                  </div>
                ))}
              </div>
            )}

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs space-y-1">
              <div className="font-bold text-emerald-700">Answer: {q.correctAnswer}</div>
              <div className="text-slate-600">{q.solution}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
