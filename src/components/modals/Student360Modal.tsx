"use client";

import React from "react";
import { X } from "lucide-react";

interface Student360ModalProps {
  isOpen: boolean;
  student: any;
  onClose: () => void;
}

export function Student360Modal({
  isOpen,
  student,
  onClose,
}: Student360ModalProps) {
  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{student.name} — Student 360</h3>
            <div className="text-xs text-slate-500 font-mono font-semibold">
              Roll: {student.rollNumber} • Target: {student.targetExam}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Radar Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs">
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
            <div className="text-slate-500 font-semibold">Tests Taken</div>
            <div className="text-xl font-black text-slate-900 mt-1">
              {student.stats?.totalExamsAttempted}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
            <div className="text-slate-500 font-semibold">Attendance</div>
            <div className="text-xl font-black text-emerald-600 mt-1">
              {student.stats?.attendancePercentage}%
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
            <div className="text-slate-500 font-semibold">Mastered Concepts</div>
            <div className="text-xl font-black text-blue-700 mt-1">
              {student.stats?.masteredCount}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
            <div className="text-slate-500 font-semibold">Fee Balance</div>
            <div className="text-xl font-black text-amber-600 mt-1">
              ₹{student.stats?.outstandingFees?.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Concept Mastery Heatmap */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Concept Mastery States (PRD Sec 28)
          </h4>
          <div className="space-y-2">
            {student.masteryScores?.map((m: any) => (
              <div
                key={m.id}
                className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900">{m.concept}</div>
                  <div className="text-[11px] text-slate-500">
                    {m.subject} • {m.chapter}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900">{m.score}%</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      m.state === "MASTERED"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : m.state === "CRITICAL"
                        ? "bg-rose-100 text-rose-800 border border-rose-300"
                        : "bg-amber-100 text-amber-800 border border-amber-300"
                    }`}
                  >
                    {m.state}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
