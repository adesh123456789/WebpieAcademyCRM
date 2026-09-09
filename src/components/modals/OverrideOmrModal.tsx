"use client";

import React, { useState } from "react";
import { X, ShieldAlert, CheckCircle2, History, AlertTriangle, UserCheck } from "lucide-react";

export interface OverrideOmrModalProps {
  overrideModal: {
    scanId: string;
    qNum: number;
    detected: string;
    reason?: string;
    cropUrl?: string;
    expectedVersion?: number;
    studentRoll?: string;
  } | null;
  overrideChoice: string;
  setOverrideChoice: (choice: string) => void;
  onClose: () => void;
  onSubmit: (reason: string, expectedVersion: number) => void;
}

export const OVERRIDE_PRESET_REASONS = [
  "Legitimate mark verified by physical sheet inspection",
  "Teacher erasure correction (secondary mark erased)",
  "Paper fold / scanner artifact defect",
  "Faint pencil stroke confirmed by student",
  "Double bubble correction (accidental slip)",
  "Student wrote clear marginal correction",
];

export function OverrideOmrModal({
  overrideModal,
  overrideChoice,
  setOverrideChoice,
  onClose,
  onSubmit,
}: OverrideOmrModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>(OVERRIDE_PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>("");
  const [expectedVersion] = useState<number>(overrideModal?.expectedVersion || 1);

  if (!overrideModal) return null;

  const handleSave = () => {
    const finalReason = customReason.trim() ? customReason.trim() : selectedReason;
    onSubmit(finalReason, expectedVersion);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="override-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 id="override-modal-title" className="font-bold text-slate-900 text-base">
                Teacher OMR Review & Override
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Contract C04 Audit-Preserving Optimistic Concurrency
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ambiguity and Roll Info */}
        <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-amber-900">
              Target Roll: <span className="font-mono font-bold">{overrideModal.studentRoll || "Unknown"}</span>
            </div>
            <div className="text-amber-900">
              Question Number: <span className="font-bold text-sm">#{overrideModal.qNum}</span>
            </div>
          </div>
          <div className="text-amber-900 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <span>Detected Status: <strong className="font-mono">{overrideModal.detected || "AMBIGUOUS"}</strong></span>
          </div>
          {overrideModal.reason && (
            <div className="text-[11px] text-amber-800 font-medium italic">
              Classifier note: {overrideModal.reason}
            </div>
          )}
        </div>

        {/* Signed Bubble Crop Visual Evidence (PRD Sec 26 & Contract C04) */}
        <div className="space-y-1.5">
          <label className="text-xs text-slate-700 font-bold block">
            Visual Bubble Crop Evidence:
          </label>
          <div className="bg-slate-900 rounded-xl p-3 flex flex-col items-center justify-center text-center relative overflow-hidden border border-slate-700">
            {overrideModal.cropUrl ? (
              <img
                src={overrideModal.cropUrl}
                alt={"Question " + overrideModal.qNum + " OMR bubble crop"}
                className="max-h-28 object-contain rounded border border-slate-700 bg-white"
              />
            ) : (
              <div className="py-4 px-6 text-center space-y-2">
                <div className="flex items-center justify-center gap-3">
                  {["A", "B", "C", "D"].map((opt) => {
                    const isDetected = overrideModal.detected.includes(opt);
                    return (
                      <div key={opt} className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-slate-400 font-mono font-bold">{opt}</span>
                        <div
                          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center font-bold text-xs transition ${
                            isDetected
                              ? "bg-slate-200 border-slate-400 text-slate-900 shadow-inner"
                              : "bg-white border-slate-500 text-slate-400"
                          }`}
                        >
                          {isDetected ? "●" : "○"}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  Synthesized Crop Matrix [Q{overrideModal.qNum}]: Density Analysis Trace
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Verified Option Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-700 font-bold">Select Verified Intent:</label>
            <span className="text-[11px] text-slate-500 font-medium">
              Current selection: <span className="font-bold text-blue-600 font-mono">{overrideChoice || "None"}</span>
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {["A", "B", "C", "D", "BLANK"].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setOverrideChoice(opt)}
                className={`py-2 rounded-lg text-xs font-bold border transition flex flex-col items-center justify-center gap-0.5 ${
                  overrideChoice === opt
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span>{opt}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Teacher Audit Reason Presets */}
        <div className="space-y-2">
          <label htmlFor="audit-reason-preset" className="text-xs text-slate-700 font-bold block">
            Audited Justification:
          </label>
          <select
            id="audit-reason-preset"
            aria-label="Audited Justification"
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {OVERRIDE_PRESET_REASONS.map((r, i) => (
              <option key={i} value={r}>
                {r}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Or type custom audit note..."
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Audit Trail Immutable Guarantee */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2 text-[11px] text-slate-600">
          <History className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
          <div className="leading-snug">
            <span className="font-bold text-slate-800">C04 Audit Trail Protection:</span> Overrides
            persist original detected density and log educator identity, epoch timestamp, and justification.
            Scan version will increment to v{expectedVersion + 1}.
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-4 py-2 rounded-lg font-bold border border-slate-300 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!overrideChoice}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition"
          >
            <UserCheck className="w-4 h-4" />
            Save Audited Override
          </button>
        </div>
      </div>
    </div>
  );
}
