"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  UserPlus,
  FileSpreadsheet,
  Users,
  Filter,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Phone,
  ShieldCheck,
  Download,
  AlertCircle,
  Sparkles,
} from "lucide-react";

export interface StudentRecord {
  id: string;
  name: string;
  rollNumber: string;
  email?: string;
  phone?: string;
  targetExam?: string;
  targetYear?: number;
  status?: string;
  branch?: { id?: string; name: string } | string;
  branchId?: string;
  enrollments?: Array<{
    batch?: { id?: string; name: string; code?: string };
    batchId?: string;
    course?: { name: string };
  }>;
  parentLinks?: Array<{
    id?: string;
    isPrimary?: boolean;
    relationship?: string;
    accessFlags?: string | { reports?: boolean; attendance?: boolean; fees?: boolean };
    parent?: {
      id?: string;
      name?: string;
      phone?: string;
      email?: string;
      relationship?: string;
    };
  }>;
}

interface StudentsViewProps {
  students: StudentRecord[];
  onOpenAddStudentModal: () => void;
  onOpenImportModal?: () => void;
  onOpenParentLinkModal?: (student: StudentRecord) => void;
  onOpenStudent360: (studentId: string) => void;
  currentBranch?: string;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students = [],
  onOpenAddStudentModal,
  onOpenImportModal,
  onOpenParentLinkModal,
  onOpenStudent360,
  currentBranch = "Main Campus",
}) => {
  // Filters state (Contract C02 parameters)
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExam, setSelectedExam] = useState<string>("ALL");
  const [selectedBatch, setSelectedBatch] = useState<string>("ALL");
  const [page, setPage] = useState<number>(1);
  const pageSize = 15;

  // Extract distinct batches from students for the batch filter
  const availableBatches = useMemo(() => {
    const batchSet = new Set<string>();
    students.forEach((s) => {
      s.enrollments?.forEach((e) => {
        if (e.batch?.name) batchSet.add(e.batch.name);
      });
    });
    return Array.from(batchSet);
  }, [students]);

  // Client filtering adhering to C02 query semantics
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Search term matching name, roll number, or phone
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        s.name?.toLowerCase().includes(term) ||
        s.rollNumber?.toLowerCase().includes(term) ||
        s.phone?.includes(term) ||
        s.email?.toLowerCase().includes(term);

      if (!matchesSearch) return false;

      // Target exam filter
      if (selectedExam !== "ALL" && s.targetExam !== selectedExam) {
        return false;
      }

      // Batch filter
      if (selectedBatch !== "ALL") {
        const isInBatch = s.enrollments?.some((e) => e.batch?.name === selectedBatch);
        if (!isInBatch) return false;
      }

      return true;
    });
  }, [students, searchTerm, selectedExam, selectedBatch]);

  // Pagination calculation
  const totalItems = filteredStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredStudents.slice(startIndex, startIndex + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  function handleResetFilters() {
    setSearchTerm("");
    setSelectedExam("ALL");
    setSelectedBatch("ALL");
    setPage(1);
  }

  function handleExportCsv() {
    if (students.length === 0) return;
    const headers = "Roll Number,Name,Target Exam,Phone,Email,Branch,Primary Parent,Parent Phone\n";
    const rows = students
      .map((s) => {
        const primaryLink =
          s.parentLinks?.find((l) => l.isPrimary) || s.parentLinks?.[0];
        const parentName = primaryLink?.parent?.name || "";
        const parentPhone = primaryLink?.parent?.phone || "";
        const branchName =
          typeof s.branch === "string" ? s.branch : s.branch?.name || "Main";
        return `"${s.rollNumber}","${s.name}","${s.targetExam || ""}","${s.phone || ""}","${
          s.email || ""
        }","${branchName}","${parentName}","${parentPhone}"`;
      })
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `webpie_roster_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // -------------------------------------------------------------
  // EMPTY STATE 1: ACADEMY ONBOARDING (0 total students enrolled)
  // -------------------------------------------------------------
  if (students.length === 0) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs text-center space-y-6">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <GraduationCap className="w-9 h-9" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              Onboarding: Student Directory Setup
            </div>
            <h2 className="text-xl font-black text-slate-900">
              Welcome to WebPie Academic OS
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              No students are currently registered for this institute. Get started in minutes by
              importing your existing student roster via CSV or enrolling individual students.
            </p>
          </div>

          {/* Quick onboarding action cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
            {/* CSV Import card */}
            <div
              onClick={() => onOpenImportModal?.()}
              className="border-2 border-blue-200 hover:border-blue-500 bg-blue-50/30 hover:bg-blue-50/70 rounded-xl p-5 cursor-pointer transition space-y-2 group shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider group-hover:translate-x-0.5 transition">
                  Recommended &rarr;
                </span>
              </div>
              <div className="font-bold text-sm text-slate-900">Bulk CSV Roster Import</div>
              <p className="text-xs text-slate-500">
                Upload your existing Excel or CSV student list with auto roll validation, batch mapping,
                and parent links.
              </p>
            </div>

            {/* Manual Enroll card */}
            <div
              onClick={onOpenAddStudentModal}
              className="border border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50 rounded-xl p-5 cursor-pointer transition space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-slate-600 group-hover:translate-x-0.5 transition">
                  Manual Entry &rarr;
                </span>
              </div>
              <div className="font-bold text-sm text-slate-900">Single Student Enrollment</div>
              <p className="text-xs text-slate-500">
                Enroll a single student, specify target competitive exam, roll number, and initial batch.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ACTIVE DIRECTORY VIEW (Contract C02 + Longitudinal 360)
  // -------------------------------------------------------------
  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Student Directory & Longitudinal 360</h1>
            <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-slate-200">
              {students.length} Total Enrolled
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage student rosters, parent communication links, and longitudinal diagnostic records.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-2 rounded-lg shadow-2xs transition cursor-pointer"
            title="Export roster as CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Roster</span>
          </button>

          {onOpenImportModal && (
            <button
              type="button"
              onClick={onOpenImportModal}
              className="flex items-center gap-1.5 bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 text-xs font-bold px-3.5 py-2 rounded-lg shadow-2xs transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Import CSV Roster</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenAddStudentModal}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm transition cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Add Student</span>
          </button>
        </div>
      </div>

      {/* Filter Bar (Contract C02 params) */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-col md:flex-row md:items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name, roll number, or phone..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 pl-9 pr-3 py-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
          />
        </div>

        {/* Target Exam dropdown */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={selectedExam}
            onChange={(e) => {
              setSelectedExam(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg px-2.5 py-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Target Exams</option>
            <option value="JEE_MAIN">JEE Main</option>
            <option value="JEE_ADVANCED">JEE Advanced</option>
            <option value="NEET">NEET</option>
            <option value="MHT_CET">MHT-CET</option>
          </select>
        </div>

        {/* Batch dropdown (if batches exist) */}
        {availableBatches.length > 0 && (
          <select
            value={selectedBatch}
            onChange={(e) => {
              setSelectedBatch(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg px-2.5 py-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Batches</option>
            {availableBatches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        )}

        {/* Reset filters button if active */}
        {(searchTerm || selectedExam !== "ALL" || selectedBatch !== "ALL") && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-bold px-2 py-1.5 rounded hover:bg-slate-100 transition"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      {/* Roster Table or Filter Empty State */}
      {paginatedStudents.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
          <div className="font-bold text-slate-800 text-sm">No students match your active filters</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search query, target exam, or batch selection to view matching students.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider border-b border-slate-200 font-bold">
                <tr>
                  <th className="px-5 py-3">Roll No</th>
                  <th className="px-5 py-3">Student Name</th>
                  <th className="px-5 py-3">Target Exam / Batch</th>
                  <th className="px-5 py-3">Parent Link & WhatsApp</th>
                  <th className="px-5 py-3">Branch</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedStudents.map((s) => {
                  const primaryParent =
                    s.parentLinks?.find((l) => l.isPrimary) || s.parentLinks?.[0];
                  const parentCount = s.parentLinks?.length || 0;
                  const branchDisplay =
                    typeof s.branch === "string" ? s.branch : s.branch?.name || currentBranch;
                  const batchDisplay = s.enrollments?.[0]?.batch?.name;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-3 font-mono font-bold text-blue-700">
                        {s.rollNumber}
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-bold text-slate-900">{s.name}</div>
                        {s.phone && (
                          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {s.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold">
                            {s.targetExam || "JEE_MAIN"}
                          </span>
                        </div>
                        {batchDisplay && (
                          <div className="text-[10px] text-slate-500 mt-0.5">{batchDisplay}</div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {primaryParent ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-800 font-bold">
                                {primaryParent.parent?.name || "Guardian"}
                              </span>
                              <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold">
                                {primaryParent.relationship || "PARENT"}
                              </span>
                              {parentCount > 1 && (
                                <span className="text-[9px] text-blue-600 font-bold">
                                  +{parentCount - 1}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {primaryParent.parent?.phone || "No phone"}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No parent linked</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs">{branchDisplay}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {onOpenParentLinkModal && (
                            <button
                              type="button"
                              onClick={() => onOpenParentLinkModal(s)}
                              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs px-2.5 py-1.5 rounded-lg font-semibold transition flex items-center gap-1 shadow-2xs"
                              title="Manage Parent Links"
                            >
                              <Users className="w-3.5 h-3.5 text-slate-500" />
                              <span className="hidden sm:inline">Parents</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenStudent360(s.id)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs px-3 py-1.5 rounded-lg font-bold transition shadow-2xs"
                          >
                            Student 360
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* C02 Pagination Controls */}
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing{" "}
              <span className="font-bold text-slate-900">
                {(currentPage - 1) * pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-bold text-slate-900">
                {Math.min(currentPage * pageSize, totalItems)}
              </span>{" "}
              of <span className="font-bold text-slate-900">{totalItems}</span> students
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-slate-900">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
