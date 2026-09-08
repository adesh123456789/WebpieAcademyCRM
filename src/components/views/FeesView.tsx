"use client";

import React from "react";
import { CreditCard } from "lucide-react";

interface FeesViewProps {
  feesData: any;
  onOpenRecordFeeModal: () => void;
}

export const FeesView: React.FC<FeesViewProps> = ({ feesData, onOpenRecordFeeModal }) => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Fee Obligations & Collections</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track installments, record UPI/Cash payments, and generate official receipts.
          </p>
        </div>
        <button
          onClick={onOpenRecordFeeModal}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm transition"
        >
          <CreditCard className="w-3.5 h-3.5" />
          + Record Fee Payment
        </button>
      </div>

      {feesData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Total Obligations</span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              ₹{feesData.metrics?.totalObligations?.toLocaleString()}
            </div>
          </div>
          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Collected to Date</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              ₹{feesData.metrics?.totalCollected?.toLocaleString()}
            </div>
          </div>
          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Outstanding Balance</span>
            <div className="text-2xl font-black text-amber-600 mt-1">
              ₹{feesData.metrics?.totalOutstanding?.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-5 py-3">Receipt No</th>
              <th className="px-5 py-3">Student</th>
              <th className="px-5 py-3">Amount</th>
              <th className="px-5 py-3">Mode</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {feesData?.payments?.map((p: any) => (
              <tr key={p.id}>
                <td className="px-5 py-3 font-mono font-bold text-blue-700">{p.receiptNumber}</td>
                <td className="px-5 py-3 font-bold text-slate-900">{p.student?.name}</td>
                <td className="px-5 py-3 font-bold text-emerald-600">₹{p.amount?.toLocaleString()}</td>
                <td className="px-5 py-3 text-slate-600">{p.paymentMode}</td>
                <td className="px-5 py-3">
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-bold">
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
