"use client";

import React, { useState } from "react";
import { X, AlertOctagon, RotateCcw, ShieldCheck, History } from "lucide-react";

export interface ReversePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: {
    id: string;
    receiptNumber: string;
    amount: number;
    student?: { name: string; rollNumber: string };
  } | null;
  onConfirmReverse: (paymentId: string, reason: string) => void;
}

export const REVERSAL_REASONS = [
  "Cheque bounced / failed clearance",
  "Erroneous double entry / duplicate collection",
  "Incorrect student account selected",
  "Admission cancellation & fee refund",
  "Bank chargeback / disputed UPI transfer",
];

export const ReversePaymentModal: React.FC<ReversePaymentModalProps> = ({
  isOpen,
  onClose,
  payment,
  onConfirmReverse,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(REVERSAL_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>("");

  if (!isOpen || !payment) return null;

  const handleConfirm = () => {
    const finalReason = customReason.trim() ? customReason.trim() : selectedReason;
    onConfirmReverse(payment.id, finalReason);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reverse-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <AlertOctagon className="w-4 h-4" />
            </div>
            <div>
              <h3 id="reverse-modal-title" className="font-bold text-slate-900 text-base">
                Reverse Fee Collection
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Contract OPS-001 Append-Only Audit Trail
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

        {/* Receipt Details */}
        <div className="bg-rose-50/70 border border-rose-200 p-4 rounded-xl text-xs space-y-2 text-rose-900">
          <div className="flex items-center justify-between">
            <span>Receipt: <strong className="font-mono">{payment.receiptNumber}</strong></span>
            <span className="font-black text-rose-800 text-sm">₹{payment.amount?.toLocaleString()}</span>
          </div>
          {payment.student && (
            <div className="text-[11px] text-rose-800">
              Student: <strong>{payment.student.name}</strong> ({payment.student.rollNumber})
            </div>
          )}
        </div>

        {/* Reversal Reason */}
        <div className="space-y-2">
          <label htmlFor="reversal-reason-select" className="text-xs font-bold text-slate-700 block">
            Audited Reason for Reversal:
          </label>
          <select
            id="reversal-reason-select"
            aria-label="Audited Reason for Reversal"
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
          >
            {REVERSAL_REASONS.map((r, i) => (
              <option key={i} value={r}>
                {r}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Or type specific transaction notes..."
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
          />
        </div>

        {/* Append-only Guarantee */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2 text-[11px] text-slate-600">
          <History className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
          <div className="leading-snug">
            <span className="font-bold text-slate-800">Append-Only Invariant (OPS-001):</span> The original
            receipt record is preserved for accounting compliance. A negative reversal ledger item is
            appended, restoring the student's outstanding balance.
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
            onClick={handleConfirm}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition"
          >
            <RotateCcw className="w-4 h-4" />
            Confirm Reversal
          </button>
        </div>
      </div>
    </div>
  );
};
