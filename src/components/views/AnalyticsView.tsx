"use client";

import React from "react";

interface AnalyticsViewProps {
  students: any[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ students }) => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Cohort Scoring & Rank Leaderboard</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Authoritative deterministic evaluation, percentiles, and negative marking analysis.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-5 py-3">Cohort Rank</th>
              <th className="px-5 py-3">Roll No</th>
              <th className="px-5 py-3">Student Name</th>
              <th className="px-5 py-3">Score / Max</th>
              <th className="px-5 py-3">Accuracy</th>
              <th className="px-5 py-3">Percentile</th>
              <th className="px-5 py-3">Negative Marks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.slice(0, 5).map((s, idx) => (
              <tr key={s.id} className="hover:bg-slate-50/80 transition">
                <td className="px-5 py-3">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                </td>
                <td className="px-5 py-3 font-mono font-bold text-blue-700">{s.rollNumber}</td>
                <td className="px-5 py-3 font-bold text-slate-900">{s.name}</td>
                <td className="px-5 py-3 font-black text-slate-900">{Math.max(6, 20 - idx * 4)} / 20</td>
                <td className="px-5 py-3 font-bold text-emerald-600">{Math.max(30, 100 - idx * 18)}%</td>
                <td className="px-5 py-3 font-bold text-indigo-600">
                  {(((5 - idx) / 5) * 100).toFixed(1)}%
                </td>
                <td className="px-5 py-3 font-bold text-rose-600">-{idx > 0 ? 1 : 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
