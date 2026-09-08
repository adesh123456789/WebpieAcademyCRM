"use client";

import React from "react";
import { X, CreditCard } from "lucide-react";

interface RecordFeeModalProps {
  isOpen: boolean;
  form: {
    studentId: string;
    amount: string;
    paymentMode: string;
    remarks: string;
  };
  setForm: React.Dispatch<React.SetStateAction<any>>;
  students: any[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function RecordFeeModal({
  isOpen,
  form,
  setForm,
  students,
  onClose,
  onSubmit,
}: RecordFeeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Record Fee Collection
            </h3>
            <p className="text-xs text-slate-500">Issues serialized official receipt and updates student balance.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="text-slate-700 font-bold">Select Student *</label>
            <select
              required
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">-- Choose Student --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.rollNumber})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-slate-700 font-bold">Amount Paid (₹) *</label>
              <input
                type="number"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-700 font-bold">Payment Mode</label>
              <select
                value={form.paymentMode}
                onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="UPI">UPI / QR Code</option>
                <option value="CASH">Cash Counter</option>
                <option value="CHEQUE">Bank Cheque</option>
                <option value="NET_BANKING">Net Banking (NEFT/IMPS)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-slate-700 font-bold">Remarks / Reference</label>
            <input
              type="text"
              placeholder="e.g. UTR / Cheque No / Notes"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-100 text-slate-700 font-bold px-4 py-2 rounded-lg border border-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-lg shadow-sm transition"
            >
              Generate Receipt & Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
