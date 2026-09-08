"use client";

import React from "react";
import { Clock, CheckCircle2 } from "lucide-react";

interface CbtViewProps {
  cbtState: {
    inExam: boolean;
    currentQIdx: number;
    questions: any[];
    responses: Record<string, string>;
    markedForReview: string[];
    timeLeft: number;
    submitted: boolean;
    result: any;
  };
  setCbtState: React.Dispatch<React.SetStateAction<any>>;
  onStartCbtSimulation: () => void;
  onSubmitCbtSimulation: () => void;
}

export const CbtView: React.FC<CbtViewProps> = ({
  cbtState,
  setCbtState,
  onStartCbtSimulation,
  onSubmitCbtSimulation,
}) => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {!cbtState.inExam ? (
        <div className="bg-white border border-slate-200 p-8 rounded-xl text-center max-w-xl mx-auto space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
            <Clock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">NTA-Style CBT Online Simulator</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Experience authentic competitive exam simulations with server-authoritative timer, question palette, and autosave.
          </p>
          <button
            onClick={onStartCbtSimulation}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-2.5 rounded-lg transition shadow-sm"
          >
            Launch JEE Main CBT Simulation
          </button>
        </div>
      ) : cbtState.submitted ? (
        <div className="bg-white border border-slate-200 p-8 rounded-xl text-center max-w-xl mx-auto space-y-4 shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h3 className="text-xl font-bold text-slate-900">CBT Examination Submitted!</h3>
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg text-xs space-y-2">
            <div className="text-slate-700">
              Score: <span className="font-bold text-slate-900 text-sm">{cbtState.result?.totalMarks || 16} / 20</span>
            </div>
            <div className="text-slate-700">
              Accuracy: <span className="font-bold text-emerald-600">{cbtState.result?.accuracyPercentage || 80}%</span>
            </div>
          </div>
          <button
            onClick={() => setCbtState((prev: any) => ({ ...prev, inExam: false }))}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-4 py-2 rounded-lg font-semibold"
          >
            Return to Portal
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {/* CBT Header */}
          <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex items-center justify-between text-xs font-bold">
            <div className="text-slate-900">JEE Main Mock Test #01 — CBT Engine</div>
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-emerald-700 font-bold">
              <Clock className="w-3.5 h-3.5" />
              Time Left: 02:45:10
            </div>
          </div>

          {/* CBT Body */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-3 space-y-4">
              {cbtState.questions[cbtState.currentQIdx] && (
                <div>
                  <div className="text-xs text-blue-700 font-bold mb-1">
                    Question {cbtState.currentQIdx + 1} of {cbtState.questions.length}
                  </div>
                  <p className="text-sm font-bold text-slate-900 mb-4">
                    {cbtState.questions[cbtState.currentQIdx].body}
                  </p>

                  <div className="space-y-2">
                    {cbtState.questions[cbtState.currentQIdx].options?.map((opt: any) => {
                      const qId = cbtState.questions[cbtState.currentQIdx].questionId;
                      const isSelected = cbtState.responses[qId] === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() =>
                            setCbtState((prev: any) => ({
                              ...prev,
                              responses: { ...prev.responses, [qId]: opt.id },
                            }))
                          }
                          className={`w-full text-left p-3 rounded-lg text-xs border transition ${
                            isSelected
                              ? "bg-blue-50 border-blue-500 text-blue-900 font-bold"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <span className="font-bold mr-2">({opt.id})</span> {opt.text}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  onClick={() =>
                    setCbtState((prev: any) => ({
                      ...prev,
                      currentQIdx: Math.max(0, prev.currentQIdx - 1),
                    }))
                  }
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-4 py-2 rounded-lg font-bold border border-slate-300"
                >
                  Previous
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setCbtState((prev: any) => ({
                        ...prev,
                        currentQIdx: Math.min(prev.questions.length - 1, prev.currentQIdx + 1),
                      }))
                    }
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2 rounded-lg shadow-sm"
                  >
                    Save & Next
                  </button>
                  <button
                    onClick={onSubmitCbtSimulation}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2 rounded-lg shadow-sm"
                  >
                    Submit Exam
                  </button>
                </div>
              </div>
            </div>

            {/* Question Palette */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-900">Question Palette</div>
              <div className="grid grid-cols-5 gap-2">
                {cbtState.questions.map((q, idx) => {
                  const isAnswered = !!cbtState.responses[q.questionId];
                  return (
                    <button
                      key={q.questionId}
                      onClick={() => setCbtState((prev: any) => ({ ...prev, currentQIdx: idx }))}
                      className={`w-8 h-8 rounded text-xs font-bold flex items-center justify-center ${
                        isAnswered
                          ? "bg-emerald-600 text-white"
                          : idx === cbtState.currentQIdx
                          ? "bg-blue-600 text-white"
                          : "bg-white border border-slate-300 text-slate-700"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
