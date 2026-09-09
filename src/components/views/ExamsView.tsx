"use client";

import React, { useState, useMemo } from "react";
import {
  ScanLine,
  Printer,
  ShieldCheck,
  Plus,
  Search,
  Filter,
  RotateCcw,
  BookOpen,
  Calendar,
  Clock,
  Award,
  Layers,
  Sparkles,
  Check,
  CheckCircle2,
} from "lucide-react";

export interface ExamRecord {
  id: string;
  code: string;
  title: string;
  examType: string;
  durationMinutes: number;
  totalMarks: number;
  totalQuestions?: number;
  status: "DRAFT" | "IN_REVIEW" | "FINALIZED";
  version?: number;
  isCbtEnabled?: boolean;
  finalizedAt?: string;
  createdAt?: string;
  examQuestions?: any[];
  examResults?: any[];
}

interface ExamsViewProps {
  exams: ExamRecord[];
  onFetchArtifact: (examId: string, type: "omr" | "question_paper" | "answer_key") => void;
  onOpenCreateExamModal?: () => void;
  onTransitionExam?: (examId: string, action: "review" | "finalize", expectedVersion?: number) => void;
}

export const ExamsView: React.FC<ExamsViewProps> = ({
  exams = [],
  onFetchArtifact,
  onOpenCreateExamModal,
  onTransitionExam,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Filtered exams
  const filteredExams = useMemo(() => {
    return exams.filter((ex) => {
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        ex.title?.toLowerCase().includes(term) ||
        ex.code?.toLowerCase().includes(term);

      if (!matchesSearch) return false;

      if (selectedType !== "ALL" && ex.examType !== selectedType) {
        return false;
      }

      if (selectedStatus !== "ALL" && ex.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [exams, searchTerm, selectedType, selectedStatus]);

  function handleResetFilters() {
    setSearchTerm("");
    setSelectedType("ALL");
    setSelectedStatus("ALL");
  }

  // -------------------------------------------------------------
  // EMPTY STATE 1: No assessments created yet
  // -------------------------------------------------------------
  if (exams.length === 0) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-10">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs text-center space-y-6">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Layers className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              Exam Builder & Printable Artifacts (UI-004)
            </div>
            <h2 className="text-xl font-black text-slate-900">
              No Assessments Created Yet
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Assemble officially formatted Question Papers, 4-Corner OMR Bubble Sheets, and Master
              Answer Keys using the seven-step Exam Wizard.
            </p>
          </div>

          {onOpenCreateExamModal && (
            <div>
              <button
                type="button"
                onClick={onOpenCreateExamModal}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Launch 7-Step Exam Wizard
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ACTIVE DIRECTORY VIEW
  // -------------------------------------------------------------
  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Exam Builder & Printable Artifacts</h1>
            <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-slate-200">
              {exams.length} Total Assessments
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Assemble curriculum blueprints, generate 4-Corner OMR bubble sheets, and print verified question papers.
          </p>
        </div>

        {onOpenCreateExamModal && (
          <button
            type="button"
            onClick={onOpenCreateExamModal}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Assessment</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-col md:flex-row md:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by test title or exam code (e.g. JEE-EXAM-001)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 pl-9 pr-3 py-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
          />
        </div>

        {/* Profile Filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg px-2.5 py-2 focus:bg-white"
          >
            <option value="ALL">All Exam Profiles</option>
            <option value="JEE_MAIN">JEE Main</option>
            <option value="JEE_ADVANCED">JEE Advanced</option>
            <option value="NEET">NEET UG</option>
            <option value="MHT_CET">MHT-CET</option>
          </select>
        </div>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg px-2.5 py-2 focus:bg-white"
        >
          <option value="ALL">All Statuses</option>
          <option value="FINALIZED">Finalized & Locked</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="DRAFT">Draft</option>
        </select>

        {/* Reset button */}
        {(searchTerm || selectedType !== "ALL" || selectedStatus !== "ALL") && (
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

      {/* Grid of Exams or Filter Empty */}
      {filteredExams.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
          <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
          <div className="font-bold text-slate-800 text-sm">No assessments match your filters</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try resetting your search query or selecting a different exam profile filter.
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredExams.map((ex) => (
            <div
              key={ex.id}
              className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 shadow-2xs hover:shadow-sm transition"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
                  {ex.code}
                </span>
                <span
                  className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                    ex.status === "FINALIZED"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : ex.status === "IN_REVIEW"
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  {ex.status}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 leading-snug">{ex.title}</h3>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-2 flex-wrap">
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <Award className="w-3.5 h-3.5 text-blue-600" />
                    {ex.examType}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {ex.durationMinutes} mins
                  </span>
                  <span>•</span>
                  <span>
                    Total: <strong className="text-slate-900">{ex.totalMarks} Marks</strong>
                  </span>
                  {ex.totalQuestions && (
                    <>
                      <span>•</span>
                      <span>{ex.totalQuestions} Questions</span>
                    </>
                  )}
                </div>
              </div>

              {/* Artifact & Lifecycle Actions */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                {/* DRAFT -> IN_REVIEW action */}
                {ex.status === "DRAFT" && onTransitionExam && (
                  <button
                    type="button"
                    onClick={() => onTransitionExam(ex.id, "review", ex.version || 1)}
                    className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-2xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                    Submit for Review
                  </button>
                )}

                {/* IN_REVIEW -> FINALIZED action */}
                {ex.status === "IN_REVIEW" && onTransitionExam && (
                  <button
                    type="button"
                    onClick={() => onTransitionExam(ex.id, "finalize", ex.version || 2)}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-2xs cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Finalize & Lock Snapshot
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onFetchArtifact(ex.id, "omr")}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-2xs cursor-pointer"
                >
                  <ScanLine className="w-3.5 h-3.5" />
                  Print OMR Sheet
                </button>

                <button
                  type="button"
                  onClick={() => onFetchArtifact(ex.id, "question_paper")}
                  className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 transition shadow-2xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  Question Paper
                </button>

                <button
                  type="button"
                  onClick={() => onFetchArtifact(ex.id, "answer_key")}
                  className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 transition shadow-2xs cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                  Answer Key
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
