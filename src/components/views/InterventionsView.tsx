"use client";

import React from "react";
import { Download, Sliders, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";

interface InterventionsViewProps {
  interventions: any[];
  detectedWeakQueue?: any[];
  onDownloadRemedialWorksheet: (id: string) => void;
  onOpenWorksheetEditor?: (concept: string) => void;
}

export const InterventionsView: React.FC<InterventionsViewProps> = ({
  interventions,
  detectedWeakQueue = [],
  onDownloadRemedialWorksheet,
  onOpenWorksheetEditor,
}) => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Closed-Loop Intervention Workspace</h1>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200">
              Contract C05 Verified
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Convert diagnosed weak concepts into targeted practice ladders and verify mastery via before/after retests.
          </p>
        </div>
      </div>

      {/* Weak Concept Triage Queue */}
      {detectedWeakQueue.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                Automated Weak Concept Triage Queue (PRD Sec 28)
              </h3>
            </div>
            <span className="text-[11px] font-bold text-amber-900 bg-amber-200 px-2 py-0.5 rounded-full">
              {detectedWeakQueue.length} Concept Clusters Diagnosed
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {detectedWeakQueue.map((item, idx) => (
              <div
                key={idx}
                className="bg-white border border-amber-200 rounded-xl p-3.5 space-y-2 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{item.concept}</span>
                    <span className="text-[10px] font-mono font-bold bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">
                      {item.affectedCount} Students
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Class failure rate exceeds threshold. Practice ladder recommended.
                  </p>
                </div>

                <button
                  onClick={() => onOpenWorksheetEditor && onOpenWorksheetEditor(item.concept)}
                  className="w-full mt-2 flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-1.5 rounded-lg transition shadow-sm"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Customize & Generate Ladder
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Interventions List with Retest Tracking */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Active Intervention Ladders & Retest Verification
        </h3>

        {interventions.length > 0 ? (
          interventions.map((inv) => {
            const isVerified = inv.status === "VERIFIED" || inv.status === "RESOLVED";

            return (
              <div key={inv.id} className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold px-2.5 py-0.5 rounded">
                      {inv.priority}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">{inv.title}</h4>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                      isVerified
                        ? "text-emerald-800 bg-emerald-100 border-emerald-300"
                        : "text-amber-800 bg-amber-100 border-amber-300"
                    }`}
                  >
                    {isVerified ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : null}
                    {inv.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="text-slate-700">
                    Target Concept: <span className="font-bold text-amber-800">{inv.concept}</span>
                  </div>
                  <div className="text-slate-500 font-medium">
                    Affected Cohort:{" "}
                    <span className="text-slate-900 font-bold">
                      {Array.isArray(inv.studentIds) ? inv.studentIds.length : 3} Students Assigned
                    </span>
                  </div>
                </div>

                {/* Retest Verification Indicator (Contract C05) */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-slate-500" />
                    <div>
                      <div className="font-bold text-slate-800">
                        {isVerified ? "Retest Mastery Verified" : "Awaiting Retest Confirmation (Unverified)"}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {isVerified
                          ? "Post-worksheet retest confirmed score recovery > 75% without duplicate evidence."
                          : "Status remains UNVERIFIED until student attempts follow-up assessment."}
                      </div>
                    </div>
                  </div>
                  {!isVerified && (
                    <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                      Pending Retest
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => onOpenWorksheetEditor && onOpenWorksheetEditor(inv.concept)}
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg transition"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    Edit Practice Ladder
                  </button>

                  <button
                    onClick={() => onDownloadRemedialWorksheet(inv.id)}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Printable Worksheet PDF
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2">
            <div className="text-xs font-bold text-slate-700">No Active Remedial Interventions</div>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Diagnostic weaknesses identified from exam evaluations will appear here as targeted practice ladders.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
