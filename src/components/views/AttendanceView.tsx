"use client";

import React, { useState, useMemo } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Search,
  Check,
  ShieldCheck,
} from "lucide-react";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

interface AttendanceViewProps {
  students: any[];
  onMarkAllPresent: () => void;
  onSaveSessionAttendance?: (records: Record<string, AttendanceStatus>) => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  students,
  onMarkAllPresent,
  onSaveSessionAttendance,
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedBatch, setSelectedBatch] = useState("Rankers 2026-A");
  const [searchQuery, setSearchQuery] = useState("");

  // Attendance state mapping studentId -> PRESENT | ABSENT | LATE
  const [roster, setRoster] = useState<Record<string, AttendanceStatus>>({});

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(
      (s) => (s.name || "").toLowerCase().includes(q) || (s.rollNumber || "").toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;

    students.forEach((s) => {
      const st = roster[s.id] || "PRESENT";
      if (st === "PRESENT") present++;
      else if (st === "ABSENT") absent++;
      else if (st === "LATE") late++;
    });

    const total = students.length || 1;
    const rate = Math.round(((present + late) / total) * 100);

    return { present, absent, late, rate };
  }, [students, roster]);

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setRoster((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleQuickMarkAll = () => {
    const allP: Record<string, AttendanceStatus> = {};
    students.forEach((s) => {
      allP[s.id] = "PRESENT";
    });
    setRoster(allP);
    onMarkAllPresent();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Classroom Attendance Roster</h1>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200">
              Contract OPS-001 Sessions
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Session logging, real-time presence telemetry, and parent absence alert triggers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            aria-label="Attendance Session Date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 font-semibold focus:outline-none"
          />
          <button
            onClick={handleQuickMarkAll}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-sm"
          >
            Mark All Present
          </button>
        </div>
      </div>

      {/* Overview Statistics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Session Attendance Rate</div>
          <div className="text-2xl font-black text-slate-900 mt-0.5">{stats.rate}%</div>
        </div>
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="text-[11px] font-bold text-emerald-700 uppercase">Present</div>
          <div className="text-2xl font-black text-emerald-600 mt-0.5">{stats.present}</div>
        </div>
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="text-[11px] font-bold text-rose-700 uppercase">Absent</div>
          <div className="text-2xl font-black text-rose-600 mt-0.5">{stats.absent}</div>
        </div>
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="text-[11px] font-bold text-amber-700 uppercase">Late Entry</div>
          <div className="text-2xl font-black text-amber-600 mt-0.5">{stats.late}</div>
        </div>
      </div>

      {/* Main Roster Container */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
            <span>Batch: {selectedBatch}</span>
            <span className="font-mono text-slate-400">({students.length} Enrolled)</span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search student or roll..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Student Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredStudents.map((s) => {
            const currentStatus = roster[s.id] || "PRESENT";

            return (
              <div
                key={s.id}
                className={`border rounded-xl p-3.5 flex items-center justify-between text-xs transition shadow-sm ${
                  currentStatus === "PRESENT"
                    ? "bg-emerald-50/30 border-emerald-200"
                    : currentStatus === "ABSENT"
                    ? "bg-rose-50/40 border-rose-200"
                    : "bg-amber-50/30 border-amber-200"
                }`}
              >
                <div>
                  <div className="font-bold text-slate-900">{s.name}</div>
                  <div className="font-mono text-slate-500 text-[11px]">Roll: {s.rollNumber}</div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setStatus(s.id, "PRESENT")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
                      currentStatus === "PRESENT"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    Present
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus(s.id, "LATE")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
                      currentStatus === "LATE"
                        ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    Late
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus(s.id, "ABSENT")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
                      currentStatus === "ABSENT"
                        ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    Absent
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer save action */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            Session records are immutable and link to the student's 360 attendance record.
          </div>
          {onSaveSessionAttendance && (
            <button
              onClick={() => onSaveSessionAttendance(roster)}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-sm"
            >
              Commit Session Roster
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
