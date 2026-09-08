"use client";

import React from "react";
import { ScanLine, Printer, ShieldCheck } from "lucide-react";

interface ExamsViewProps {
  exams: any[];
  onFetchArtifact: (examId: string, type: "omr" | "question_paper" | "answer_key") => void;
}

export const ExamsView: React.FC<ExamsViewProps> = ({ exams, onFetchArtifact }) => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Exam Builder & Printable Artifacts</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate officially formatted Question Paper PDFs, 4-Corner OMR PDFs, and Answer Keys.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {exams.map((ex) => (
          <div key={ex.id} className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                {ex.code}
              </span>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] px-2 py-0.5 rounded font-bold">
                {ex.status}
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">{ex.title}</h3>
              <div className="text-xs text-slate-500 mt-1 font-medium">
                Target: {ex.examType} | Duration: {ex.durationMinutes} mins | Total Marks: {ex.totalMarks}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
              <button
                onClick={() => onFetchArtifact(ex.id, "omr")}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-sm"
              >
                <ScanLine className="w-3.5 h-3.5" />
                Print OMR Sheet PDF
              </button>

              <button
                onClick={() => onFetchArtifact(ex.id, "question_paper")}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Question Paper PDF
              </button>

              <button
                onClick={() => onFetchArtifact(ex.id, "answer_key")}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 transition"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Answer Key
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
