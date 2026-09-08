"use client";

import React from "react";

interface StudentRadarViewProps {
  onNavigateCbt: () => void;
}

export const StudentRadarView: React.FC<StudentRadarViewProps> = ({ onNavigateCbt }) => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Aarav Deshmukh (Roll: 260001)</h2>
            <p className="text-xs text-slate-500">Class 11 Rankers Batch • Target: JEE Main 2026</p>
          </div>
          <button
            onClick={onNavigateCbt}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition"
          >
            Open CBT Exam Simulator
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
            <div className="text-slate-500 text-xs font-semibold">Latest Mock Test Score</div>
            <div className="text-2xl font-black text-slate-900 mt-1">20 / 20</div>
            <div className="text-xs text-emerald-600 font-bold mt-0.5">Rank #1 (Percentile 100%)</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
            <div className="text-slate-500 text-xs font-semibold">Overall Attendance</div>
            <div className="text-2xl font-black text-blue-700 mt-1">96.4%</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">27 of 28 Sessions</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
            <div className="text-slate-500 text-xs font-semibold">Concepts Mastered</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">19 Concepts</div>
            <div className="text-xs text-emerald-700 font-bold mt-0.5">Zero Critical Gaps</div>
          </div>
        </div>
      </div>
    </div>
  );
};
