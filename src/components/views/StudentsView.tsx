"use client";

import React, { useState } from "react";
import { Search, UserPlus } from "lucide-react";

interface StudentsViewProps {
  students: any[];
  onOpenAddStudentModal: () => void;
  onOpenStudent360: (studentId: string) => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  onOpenAddStudentModal,
  onOpenStudent360,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredStudents = students.filter(
    (s) =>
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Student Directory & Longitudinal 360</h1>
          <p className="text-xs text-slate-500 mt-0.5">Click on any student to open their complete diagnostic record.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, roll no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg text-xs text-slate-900 pl-9 pr-3 py-2 w-64 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
            />
          </div>
          <button
            onClick={onOpenAddStudentModal}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            + Add Student
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-5 py-3">Roll No</th>
              <th className="px-5 py-3">Student Name</th>
              <th className="px-5 py-3">Target Exam</th>
              <th className="px-5 py-3">Parent Contact</th>
              <th className="px-5 py-3">Branch</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStudents.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/80 transition">
                <td className="px-5 py-3 font-mono font-bold text-blue-700">{s.rollNumber}</td>
                <td className="px-5 py-3 font-bold text-slate-900">{s.name}</td>
                <td className="px-5 py-3">
                  <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[11px] font-bold">
                    {s.targetExam}
                  </span>
                </td>
                <td className="px-5 py-3 text-slate-600">
                  {s.parentLinks?.[0]?.parent?.phone || s.phone || "—"}
                </td>
                <td className="px-5 py-3 text-slate-500">{s.branch?.name || "Main"}</td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => onOpenStudent360(s.id)}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs px-3 py-1.5 rounded-lg font-semibold transition"
                  >
                    View Student 360
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
