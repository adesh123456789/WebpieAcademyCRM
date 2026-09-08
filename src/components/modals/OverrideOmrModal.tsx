"use client";

import React from "react";
import { X } from "lucide-react";

interface OverrideOmrModalProps {
  overrideModal: { scanId: string; qNum: number; detected: string } | null;
  overrideChoice: string;
  setOverrideChoice: (choice: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function OverrideOmrModal({
  overrideModal,
  overrideChoice,
  setOverrideChoice,
  onClose,
  onSubmit,
}: OverrideOmrModalProps) {
  if (!overrideModal) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="font-bold text-slate-900 text-base">Teacher OMR Review & Override</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs space-y-2">
          <div className="text-amber-900">
            Question Number: <span className="font-bold">{overrideModal.qNum}</span>
          </div>
          <div className="text-amber-900">
            Detected Ambiguity: <span className="font-bold">{overrideModal.detected}</span>
          </div>
          <p className="text-amber-700 text-[11px]">
            Override will be logged to the immutable audit trail with your teacher digital signature.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-slate-700 font-bold">Select Verified Option:</label>
          <div className="grid grid-cols-4 gap-2">
            {["A", "B", "C", "D"].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setOverrideChoice(opt)}
                className={`py-2 rounded-lg text-xs font-bold border transition ${
                  overrideChoice === opt
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                Option {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-100 text-slate-700 text-xs px-4 py-2 rounded-lg font-bold border border-slate-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition"
          >
            Save Audited Override
          </button>
        </div>
      </div>
    </div>
  );
}
