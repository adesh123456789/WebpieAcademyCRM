"use client";

import React from "react";

interface AttendanceViewProps {
  students: any[];
  onMarkAllPresent: () => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  students,
  onMarkAllPresent,
}) => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Classroom Attendance Roster</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Session logging, quick mark-all, and automated absence alerts for parents.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="text-xs font-bold text-slate-900">Batch: Rankers 2026-A (Morning Session)</div>
          <button
            onClick={onMarkAllPresent}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-sm"
          >
            Quick Mark All Present
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {students.slice(0, 6).map((s) => (
            <div
              key={s.id}
              className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center justify-between text-xs"
            >
              <div>
                <div className="font-bold text-slate-900">{s.name}</div>
                <div className="font-mono text-slate-500 text-[11px]">{s.rollNumber}</div>
              </div>
              <div className="flex gap-1.5">
                <button className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 rounded text-xs font-bold">
                  Present
                </button>
                <button className="bg-white text-slate-600 border border-slate-300 px-3 py-1 rounded text-xs hover:text-slate-900">
                  Absent
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
