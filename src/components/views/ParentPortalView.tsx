"use client";

import React from "react";
import { Bot, Share2 } from "lucide-react";

interface ParentPortalViewProps {
  parentReport: any;
  parentLang: "en" | "hi" | "mr";
  onSelectParentLang: (lang: "en" | "hi" | "mr") => void;
}

export const ParentPortalView: React.FC<ParentPortalViewProps> = ({
  parentReport,
  parentLang,
  onSelectParentLang,
}) => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Parent Diagnostic Progress Portal</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent academic progress summaries in English, Marathi, and Hindi.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onSelectParentLang("en")}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition ${
              parentLang === "en" ? "bg-blue-600 text-white" : "bg-white text-slate-700 border border-slate-300"
            }`}
          >
            English
          </button>
          <button
            onClick={() => onSelectParentLang("mr")}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition ${
              parentLang === "mr" ? "bg-blue-600 text-white" : "bg-white text-slate-700 border border-slate-300"
            }`}
          >
            मराठी (Marathi)
          </button>
          <button
            onClick={() => onSelectParentLang("hi")}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition ${
              parentLang === "hi" ? "bg-blue-600 text-white" : "bg-white text-slate-700 border border-slate-300"
            }`}
          >
            हिन्दी (Hindi)
          </button>
        </div>
      </div>

      {parentReport && (
        <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{parentReport.student?.name}</h3>
              <div className="text-xs text-slate-500 font-mono">Roll: {parentReport.student?.rollNumber}</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-blue-700">{parentReport.institute?.name}</div>
              <div className="text-[11px] text-slate-500">Target: {parentReport.student?.targetExam}</div>
            </div>
          </div>

          {/* Diagnostic Summary */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-xs text-slate-800 leading-relaxed">
            <div className="font-bold mb-1 text-blue-900 flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-blue-700" />
              Academic Diagnostic Overview ({parentLang.toUpperCase()})
            </div>
            {parentReport.summary}
          </div>

          {/* Score & Rank Cards */}
          {parentReport.latestResult && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <div className="text-slate-500 font-medium text-[11px]">Score Achieved</div>
                <div className="text-xl font-black text-slate-900 mt-1">
                  {parentReport.latestResult.score} / {parentReport.latestResult.maxMarks}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <div className="text-slate-500 font-medium text-[11px]">Cohort Rank</div>
                <div className="text-xl font-black text-blue-700 mt-1">
                  #{parentReport.latestResult.rank}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <div className="text-slate-500 font-medium text-[11px]">Percentile</div>
                <div className="text-xl font-black text-emerald-600 mt-1">
                  {parentReport.latestResult.percentile}%
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <div className="text-slate-500 font-medium text-[11px]">Attendance</div>
                <div className="text-xl font-black text-amber-600 mt-1">
                  {parentReport.attendance?.percentage}%
                </div>
              </div>
            </div>
          )}

          {/* WhatsApp Sharing Prefilled Link (PRD Sec 38) */}
          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                `${parentReport.summary}\n\nView complete diagnostic report: https://apexiit.webpie.in/report?roll=${parentReport.student?.rollNumber}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-sm"
            >
              <Share2 className="w-4 h-4" />
              Share to Parent on WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
