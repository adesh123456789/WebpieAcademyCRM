"use client";

import React from "react";
import { Plus, AlertTriangle } from "lucide-react";

interface OmrViewProps {
  selectedOmrJob: any;
  onRunSimulatedOmrScan: () => void;
  onFinalizeOmrJob: (jobId: string) => void;
  onOpenOverrideModal: (modalData: { scanId: string; qNum: number; detected: string }) => void;
}

export const OmrView: React.FC<OmrViewProps> = ({
  selectedOmrJob,
  onRunSimulatedOmrScan,
  onFinalizeOmrJob,
  onOpenOverrideModal,
}) => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">OMR Computer Vision Pipeline</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            High-speed bubble recognition, fiducial alignment, and teacher ambiguity review queue.
          </p>
        </div>
        <button
          onClick={onRunSimulatedOmrScan}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Scan Physical Sheet Batch
        </button>
      </div>

      {selectedOmrJob && (
        <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Batch Job #{selectedOmrJob.id?.substring(0, 8)}</h3>
              <div className="text-xs text-slate-500">
                Exam: {selectedOmrJob.exam?.title} | Status:{" "}
                <span className="font-bold text-amber-600">{selectedOmrJob.status}</span>
              </div>
            </div>
            {selectedOmrJob.status !== "FINALIZED" && (
              <button
                onClick={() => onFinalizeOmrJob(selectedOmrJob.id)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2 rounded-lg transition shadow-sm"
              >
                Finalize & Run Evaluation Engine
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {selectedOmrJob.scans?.map((scan: any) => {
              const ambiguities = JSON.parse(scan.ambiguityFlags || "[]");
              const responses = JSON.parse(scan.verifiedResponses || scan.detectedResponses || "{}");

              return (
                <div
                  key={scan.id}
                  className={`border p-4 rounded-xl space-y-3 shadow-sm ${
                    scan.status === "AMBIGUOUS" ? "border-amber-300 bg-amber-50/50" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-700">
                      Roll: {scan.detectedRollNumber}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        scan.status === "AMBIGUOUS"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {scan.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 font-medium">
                    Confidence: <span className="font-bold text-slate-900">{(scan.confidenceScore * 100).toFixed(0)}%</span>
                  </div>

                  {/* Ambiguities Alert */}
                  {ambiguities.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg space-y-2">
                      <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        Ambiguous Bubble Detected
                      </div>
                      <div className="text-[11px] text-amber-800 font-medium">{ambiguities[0].message}</div>
                      <button
                        onClick={() =>
                          onOpenOverrideModal({
                            scanId: scan.id,
                            qNum: ambiguities[0].questionNumber,
                            detected: ambiguities[0].detectedOptions?.join(", ") || "",
                          })
                        }
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs py-1.5 rounded-lg font-bold transition shadow-sm"
                      >
                        Review & Override Bubble
                      </button>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
                    Extracted: {Object.keys(responses).length} responses
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
