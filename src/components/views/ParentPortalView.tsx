"use client";

import React, { useState } from "react";
import {
  Bot,
  Share2,
  Download,
  Users,
  Award,
  CalendarCheck,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  ExternalLink,
  ChevronDown,
} from "lucide-react";

export interface ParentPortalViewProps {
  parentReport: any;
  parentLang: "en" | "hi" | "mr";
  onSelectParentLang: (lang: "en" | "hi" | "mr") => void;
  linkedStudents?: any[];
  selectedRoll?: string;
  onSelectStudent?: (roll: string) => void;
  onOpenShareModal?: () => void;
  onDownloadReportPdf?: () => void;
}

export const ParentPortalView: React.FC<ParentPortalViewProps> = ({
  parentReport,
  parentLang,
  onSelectParentLang,
  linkedStudents = [],
  selectedRoll = "260001",
  onSelectStudent,
  onOpenShareModal,
  onDownloadReportPdf,
}) => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header & Child Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Parent Diagnostic Progress Portal</h1>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              Contract REP-001 Verified
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent, truthful academic diagnostic facts for guardians in English, Marathi, and Hindi.
          </p>
        </div>

        {/* Linked Children Switcher (Contract REP-001: strictly isolated to linked children) */}
        {linkedStudents.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Student:</span>
            <select
              aria-label="Select Linked Child"
              value={selectedRoll}
              onChange={(e) => onSelectStudent && onSelectStudent(e.target.value)}
              className="text-xs font-bold bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {linkedStudents.map((child) => (
                <option key={child.id || child.rollNumber} value={child.rollNumber}>
                  {child.name} (Roll: {child.rollNumber})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Language Toggle Bar */}
      <div className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-2xl shadow-sm">
        <span className="text-xs font-bold text-slate-700">Preferred Report Language:</span>
        <div className="flex gap-2">
          <button
            onClick={() => onSelectParentLang("en")}
            className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition ${
              parentLang === "en"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            English
          </button>
          <button
            onClick={() => onSelectParentLang("mr")}
            className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition ${
              parentLang === "mr"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            मराठी (Marathi)
          </button>
          <button
            onClick={() => onSelectParentLang("hi")}
            className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition ${
              parentLang === "hi"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            हिन्दी (Hindi)
          </button>
        </div>
      </div>

      {parentReport ? (
        <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-6 shadow-sm">
          {/* Student Profile Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">{parentReport.student?.name}</h3>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200 font-mono">
                  Roll: {parentReport.student?.rollNumber}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Target Stream: <strong className="text-slate-800">{parentReport.student?.targetExam || "JEE / NEET"}</strong>
              </div>
            </div>
            <div className="sm:text-right">
              <div className="text-xs font-bold text-blue-700">{parentReport.institute?.name}</div>
              <div className="text-[11px] text-slate-400 font-mono">Institute Code: {parentReport.institute?.code}</div>
            </div>
          </div>

          {/* Diagnostic Fact Summary Strip */}
          <div className="bg-blue-50/70 border border-blue-200 p-5 rounded-2xl text-xs text-slate-800 leading-relaxed space-y-2">
            <div className="font-bold text-blue-950 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-700" />
                Truthful Multilingual Fact Summary ({parentLang.toUpperCase()})
              </span>
              <span className="text-[10px] bg-blue-200/70 text-blue-900 font-mono font-bold px-2 py-0.5 rounded">
                Server-Generated Facts
              </span>
            </div>
            <p className="text-slate-700 font-medium">{parentReport.summary}</p>
          </div>

          {/* Latest Exam Result Indicators */}
          {parentReport.latestResult && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-500" />
                  Latest Evaluation: {parentReport.latestResult.examTitle || "Periodic Benchmark"}
                </h4>
                <span className="text-slate-500 font-mono text-[11px]">
                  Accuracy: <strong className="text-emerald-700">{parentReport.latestResult.accuracy}%</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                  <div className="text-slate-500 font-medium text-[11px]">Score Achieved</div>
                  <div className="text-xl font-black text-slate-900 mt-1">
                    {parentReport.latestResult.score}{" "}
                    <span className="text-xs font-normal text-slate-400">/ {parentReport.latestResult.maxMarks || 100}</span>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                  <div className="text-slate-500 font-medium text-[11px]">Cohort Rank</div>
                  <div className="text-xl font-black text-blue-700 mt-1">
                    #{parentReport.latestResult.rank}
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                  <div className="text-slate-500 font-medium text-[11px]">Percentile</div>
                  <div className="text-xl font-black text-emerald-600 mt-1">
                    {parentReport.latestResult.percentile}%
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                  <div className="text-slate-500 font-medium text-[11px]">Attendance</div>
                  <div className="text-xl font-black text-amber-600 mt-1">
                    {parentReport.attendance?.percentage}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Concept Health Diagnosis (Strong vs Weak) */}
          {parentReport.conceptHealth && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-xl space-y-2">
                <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Mastered Concepts (Strong Areas)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {parentReport.conceptHealth.strong?.length > 0 ? (
                    parentReport.conceptHealth.strong.map((c: string) => (
                      <span
                        key={c}
                        className="text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded font-medium"
                      >
                        {c}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-500 italic">No mastered concepts recorded yet</span>
                  )}
                </div>
              </div>

              <div className="bg-rose-50/60 border border-rose-200 p-4 rounded-xl space-y-2">
                <div className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  Target Focus Areas (Intervention Ladders)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {parentReport.conceptHealth.weak?.length > 0 ? (
                    parentReport.conceptHealth.weak.map((c: string) => (
                      <span
                        key={c}
                        className="text-[11px] bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded font-medium"
                      >
                        {c}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-500 italic">No weak concepts flagged</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Fee Balance Snapshot */}
          {parentReport.fees && (
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-500" />
                <span className="font-medium text-slate-700">Tuition & Exam Ledger Balance:</span>
              </div>
              <div className="space-x-3 font-mono">
                <span className="text-slate-500">Paid: ₹{parentReport.fees.paid?.toLocaleString()}</span>
                <span
                  className={`font-bold ${
                    parentReport.fees.due > 0 ? "text-amber-700" : "text-emerald-700"
                  }`}
                >
                  Due: ₹{parentReport.fees.due?.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Sharing & Download Actions (Contract REP-001) */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              Published reports expire based on your security token settings.
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onDownloadReportPdf}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl border border-slate-300 transition"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </button>

              <button
                type="button"
                onClick={onOpenShareModal}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2 rounded-xl shadow-sm transition"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share Verified Link
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2">
          <div className="text-xs font-bold text-slate-700">No Diagnostic Report Available</div>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
            Please verify student roll number or confirm linked child permissions with your institute administrator.
          </p>
        </div>
      )}
    </div>
  );
};
