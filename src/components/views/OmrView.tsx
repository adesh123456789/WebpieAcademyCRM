"use client";

import React, { useState, useMemo } from "react";
import {
  Plus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  UploadCloud,
  FileCheck,
  ShieldCheck,
  RotateCcw,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  Layers,
  Sparkles,
} from "lucide-react";

export type OmrFilterTab = "ALL" | "REVIEW_NEEDED" | "CONFIDENT" | "OVERRIDDEN" | "UNMATCHED" | "REJECTED";

interface OmrViewProps {
  selectedOmrJob: any;
  omrJobs: any[];
  onSelectJob: (job: any) => void;
  onOpenUploadModal: () => void;
  onFinalizeOmrJob: (jobId: string) => void;
  onOpenOverrideModal: (modalData: {
    scanId: string;
    qNum: number;
    detected: string;
    reason?: string;
    cropUrl?: string;
    expectedVersion?: number;
    studentRoll?: string;
  }) => void;
}

export const OmrView: React.FC<OmrViewProps> = ({
  selectedOmrJob,
  omrJobs,
  onSelectJob,
  onOpenUploadModal,
  onFinalizeOmrJob,
  onOpenOverrideModal,
}) => {
  const [activeFilter, setActiveFilter] = useState<OmrFilterTab>("ALL");
  const [searchRoll, setSearchRoll] = useState<string>("");

  // Scan collections and metrics
  const scans: any[] = useMemo(() => selectedOmrJob?.scans || [], [selectedOmrJob]);

  const metrics = useMemo(() => {
    let confident = 0;
    let ambiguous = 0;
    let unmatched = 0;
    let rejected = 0;
    let overridden = 0;

    scans.forEach((s) => {
      const st = s.status?.toUpperCase() || "CONFIDENT";
      if (st === "CONFIDENT") confident++;
      else if (st === "AMBIGUOUS") ambiguous++;
      else if (st === "UNMATCHED") unmatched++;
      else if (st === "REJECTED") rejected++;
      else if (st === "OVERRIDDEN") overridden++;
    });

    const unresolvedCount = ambiguous + unmatched + rejected;
    const isFinalizeBlocked = unresolvedCount > 0 || (selectedOmrJob && selectedOmrJob.status === "PROCESSING");

    return {
      total: scans.length,
      confident,
      ambiguous,
      unmatched,
      rejected,
      overridden,
      unresolvedCount,
      isFinalizeBlocked,
      completionRate: scans.length > 0 ? Math.round(((confident + overridden) / scans.length) * 100) : 0,
    };
  }, [scans, selectedOmrJob]);

  // Filtered scans
  const filteredScans = useMemo(() => {
    return scans.filter((s) => {
      const st = s.status?.toUpperCase() || "CONFIDENT";
      const rollMatch = !searchRoll || (s.detectedRollNumber || "").toLowerCase().includes(searchRoll.toLowerCase());
      if (!rollMatch) return false;

      if (activeFilter === "ALL") return true;
      if (activeFilter === "REVIEW_NEEDED") return st === "AMBIGUOUS" || st === "UNMATCHED" || st === "REJECTED";
      if (activeFilter === "CONFIDENT") return st === "CONFIDENT";
      if (activeFilter === "OVERRIDDEN") return st === "OVERRIDDEN";
      if (activeFilter === "UNMATCHED") return st === "UNMATCHED";
      if (activeFilter === "REJECTED") return st === "REJECTED";
      return true;
    });
  }, [scans, activeFilter, searchRoll]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Ingestion Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">OMR Computer Vision Pipeline</h1>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200">
              Contract C04
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            300 DPI fiducial deskew, dark-mark thresholding, optimistic overrides, and zero-leakage evaluation gates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {omrJobs && omrJobs.length > 1 && (
            <select
              aria-label="Select Ingested Job"
              value={selectedOmrJob?.id || ""}
              onChange={(e) => {
                const found = omrJobs.find((j) => j.id === e.target.value);
                if (found) onSelectJob(found);
              }}
              className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {omrJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  Batch #{j.id.substring(0, 8)} ({j.status})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={onOpenUploadModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition"
          >
            <UploadCloud className="w-4 h-4" />
            Upload Sheet Batch
          </button>
        </div>
      </div>

      {/* Main Job Workspace */}
      {selectedOmrJob ? (
        <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-6 shadow-sm">
          {/* Job Telemetry Strip & C04 Finalize Floor */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="font-mono font-black text-slate-900 text-base">
                  Batch Job #{selectedOmrJob.id?.substring(0, 8)}
                </span>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                    selectedOmrJob.status === "FINALIZED"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : selectedOmrJob.status === "REVIEW_REQUIRED"
                      ? "bg-amber-100 text-amber-800 border-amber-300 animate-pulse"
                      : "bg-blue-100 text-blue-800 border-blue-300"
                  }`}
                >
                  {selectedOmrJob.status}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                Exam: <strong className="text-slate-800">{selectedOmrJob.exam?.title || "Assessment"}</strong> | Batch Tag:{" "}
                <span className="font-mono font-medium">{selectedOmrJob.batchId || "Primary"}</span>
              </div>
            </div>

            {/* Finalize Action & Safety Guard Indicator */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {selectedOmrJob.status !== "FINALIZED" ? (
                <div className="flex items-center gap-2">
                  <button
                    disabled={metrics.isFinalizeBlocked}
                    onClick={() => onFinalizeOmrJob(selectedOmrJob.id)}
                    title={
                      metrics.isFinalizeBlocked
                        ? "Blocked: Contract C04 requires all ambiguous, unmatched, and rejected sheets to be resolved."
                        : "Ready to run deterministic evaluation"
                    }
                    className={`flex items-center gap-2 text-xs font-black px-5 py-2.5 rounded-xl transition shadow-sm ${
                      metrics.isFinalizeBlocked
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Finalize & Run Evaluation Engine
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Evaluation Engine Locked & Complete
                </div>
              )}
            </div>
          </div>

          {/* C04 Safety Floor Banner when Blocked */}
          {metrics.isFinalizeBlocked && selectedOmrJob.status !== "FINALIZED" && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-amber-950 flex items-center gap-1.5">
                  <span>Contract C04 Finalization Safety Floor Active</span>
                  <span className="bg-amber-200 text-amber-900 text-[10px] px-1.5 py-0.2 rounded font-mono">
                    {metrics.unresolvedCount} Unresolved
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800 font-medium">
                  The evaluation engine is mathematically blocked. Every sheet in state{" "}
                  <strong>AMBIGUOUS</strong> ({metrics.ambiguous}), <strong>UNMATCHED</strong> ({metrics.unmatched}), or{" "}
                  <strong>REJECTED</strong> ({metrics.rejected}) must be reviewed and explicitly overridden before rank
                  cohort computation can be guaranteed.
                </p>
              </div>
            </div>
          )}

          {/* Telemetry Progress Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-[11px] text-slate-500 font-medium">Total Sheets</div>
              <div className="text-xl font-black text-slate-900 mt-0.5">{metrics.total}</div>
            </div>
            <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
              <div className="text-[11px] text-emerald-700 font-medium">Confident</div>
              <div className="text-xl font-black text-emerald-800 mt-0.5">{metrics.confident}</div>
            </div>
            <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl">
              <div className="text-[11px] text-amber-700 font-medium">Ambiguous</div>
              <div className="text-xl font-black text-amber-800 mt-0.5">{metrics.ambiguous}</div>
            </div>
            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
              <div className="text-[11px] text-blue-700 font-medium">Overridden</div>
              <div className="text-xl font-black text-blue-800 mt-0.5">{metrics.overridden}</div>
            </div>
            <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl col-span-2 sm:col-span-1">
              <div className="text-[11px] text-rose-700 font-medium">Unmatched / Rejected</div>
              <div className="text-xl font-black text-rose-800 mt-0.5">
                {metrics.unmatched + metrics.rejected}
              </div>
            </div>
          </div>

          {/* Visual Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Ingestion & Review Progress</span>
              <span className="font-mono text-slate-900">{metrics.completionRate}% Verified</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${(metrics.confident / (metrics.total || 1)) * 100}%` }}
                title="Confident"
              />
              <div
                className="bg-blue-500 h-full transition-all duration-300"
                style={{ width: `${(metrics.overridden / (metrics.total || 1)) * 100}%` }}
                title="Overridden"
              />
              <div
                className="bg-amber-400 h-full transition-all duration-300"
                style={{ width: `${(metrics.ambiguous / (metrics.total || 1)) * 100}%` }}
                title="Ambiguous"
              />
              <div
                className="bg-rose-500 h-full transition-all duration-300"
                style={{ width: `${((metrics.unmatched + metrics.rejected) / (metrics.total || 1)) * 100}%` }}
                title="Unmatched or Rejected"
              />
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setActiveFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeFilter === "ALL"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All Scans ({metrics.total})
              </button>
              <button
                onClick={() => setActiveFilter("REVIEW_NEEDED")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeFilter === "REVIEW_NEEDED"
                    ? "bg-amber-600 text-white"
                    : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Review Needed ({metrics.unresolvedCount})
              </button>
              <button
                onClick={() => setActiveFilter("CONFIDENT")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeFilter === "CONFIDENT"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Confident ({metrics.confident})
              </button>
              <button
                onClick={() => setActiveFilter("OVERRIDDEN")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeFilter === "OVERRIDDEN"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Overridden ({metrics.overridden})
              </button>
            </div>

            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Search by Roll Number..."
                value={searchRoll}
                onChange={(e) => setSearchRoll(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Scans Grid */}
          {filteredScans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredScans.map((scan: any) => {
                let ambiguities: any[] = [];
                try {
                  ambiguities = JSON.parse(scan.ambiguityFlags || "[]");
                } catch {
                  ambiguities = [];
                }

                let responses: Record<string, any> = {};
                try {
                  responses = JSON.parse(scan.verifiedResponses || scan.detectedResponses || "{}");
                } catch {
                  responses = {};
                }

                const status = scan.status?.toUpperCase() || "CONFIDENT";
                const isAmbiguous = status === "AMBIGUOUS";
                const isUnmatched = status === "UNMATCHED";
                const isRejected = status === "REJECTED";
                const isOverridden = status === "OVERRIDDEN";
                const isConfident = status === "CONFIDENT";

                return (
                  <div
                    key={scan.id}
                    className={`border rounded-2xl p-4 space-y-3.5 shadow-sm transition hover:shadow ${
                      isAmbiguous
                        ? "border-amber-300 bg-amber-50/40"
                        : isUnmatched || isRejected
                        ? "border-rose-300 bg-rose-50/40"
                        : isOverridden
                        ? "border-blue-300 bg-blue-50/30"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-slate-900">
                          Roll: {scan.detectedRollNumber || "Unrecognized"}
                        </span>
                        {scan.studentId && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                            Enrolled
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          isConfident
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : isAmbiguous
                            ? "bg-amber-100 text-amber-800 border-amber-200 font-black"
                            : isOverridden
                            ? "bg-blue-100 text-blue-800 border-blue-200"
                            : "bg-rose-100 text-rose-800 border-rose-200 font-black"
                        }`}
                      >
                        {status}
                      </span>
                    </div>

                    {/* Confidence Meter */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                        <span>Recognition Confidence</span>
                        <span
                          className={`font-mono font-bold ${
                            scan.confidenceScore >= 0.85
                              ? "text-emerald-700"
                              : scan.confidenceScore >= 0.6
                              ? "text-amber-700"
                              : "text-rose-700"
                          }`}
                        >
                          {Math.round((scan.confidenceScore || 0) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full ${
                            scan.confidenceScore >= 0.85
                              ? "bg-emerald-500"
                              : scan.confidenceScore >= 0.6
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                          style={{ width: `${Math.min(100, Math.round((scan.confidenceScore || 0) * 100))}%` }}
                        />
                      </div>
                    </div>

                    {/* Ambiguity Card or Unmatched Notice */}
                    {ambiguities.length > 0 && (
                      <div className="bg-amber-100/70 border border-amber-300 p-3 rounded-xl space-y-2">
                        <div className="text-xs font-bold text-amber-950 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                            Question #{ambiguities[0].questionNumber || 1} Flagged
                          </span>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-bold">
                            {ambiguities[0].reason || "Ambiguity"}
                          </span>
                        </div>
                        <div className="text-[11px] text-amber-900 font-medium">
                          {ambiguities[0].message || "Detected overlapping density or double fill."}
                        </div>

                        {/* Interactive Review & Override Trigger */}
                        <button
                          onClick={() =>
                            onOpenOverrideModal({
                              scanId: scan.id,
                              qNum: ambiguities[0].questionNumber || 1,
                              detected: ambiguities[0].detectedOptions?.join(", ") || "Double Mark",
                              reason: ambiguities[0].message,
                              cropUrl: ambiguities[0].cropUrl || scan.sheetImageUrl,
                              studentRoll: scan.detectedRollNumber,
                            })
                          }
                          className="w-full flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs py-2 rounded-lg font-bold transition shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Review & Override Crop
                        </button>
                      </div>
                    )}

                    {/* Unmatched Roll Notice */}
                    {isUnmatched && (
                      <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl space-y-2 text-xs text-rose-900">
                        <div className="font-bold flex items-center gap-1.5 text-rose-950">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          Unmatched Student Roll
                        </div>
                        <p className="text-[11px] text-rose-800 leading-snug">
                          Roll number <span className="font-mono font-bold">{scan.detectedRollNumber}</span> was not
                          found in active batch enrollments.
                        </p>
                        <button
                          onClick={() =>
                            onOpenOverrideModal({
                              scanId: scan.id,
                              qNum: 1,
                              detected: "UNMATCHED_ROLL",
                              reason: "Student roll number unverified in cohort",
                              studentRoll: scan.detectedRollNumber,
                            })
                          }
                          className="w-full text-xs font-bold text-rose-800 bg-rose-100 hover:bg-rose-200 py-1.5 rounded-lg transition"
                        >
                          Reassign Student ID
                        </button>
                      </div>
                    )}

                    {/* Extracted stats & Overridden indicator */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>Responses Extracted: {Object.keys(responses).length}</span>
                      {isOverridden && (
                        <span className="text-blue-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-blue-600" />
                          Teacher Audited
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2">
              <FileCheck className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-xs font-bold text-slate-700">No OMR Scans Match Filter</div>
              <p className="text-[11px] text-slate-500">
                Try switching filter tabs or clearing the roll number search query.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4 shadow-sm max-w-xl mx-auto">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-200">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">No OMR Scanning Batch Ingested</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Upload physical sheets or scanned PDF bundles to initiate the fiducial deskew, dark-mark detection, and
              teacher review queue.
            </p>
          </div>
          <button
            onClick={onOpenUploadModal}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Upload First Physical Batch
          </button>
        </div>
      )}
    </div>
  );
};
