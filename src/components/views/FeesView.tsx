"use client";

import React, { useState, useMemo } from "react";
import {
  CreditCard,
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  FileText,
  DollarSign,
  History,
} from "lucide-react";

interface FeesViewProps {
  feesData: any;
  onOpenRecordFeeModal: () => void;
  onOpenReverseModal?: (payment: any) => void;
}

export const FeesView: React.FC<FeesViewProps> = ({
  feesData,
  onOpenRecordFeeModal,
  onOpenReverseModal,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState("ALL");

  const payments = useMemo(() => {
    let list = feesData?.payments || [];
    if (filterMode !== "ALL") {
      list = list.filter((p: any) => p.paymentMode === filterMode || p.status === filterMode);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p: any) =>
          (p.receiptNumber || "").toLowerCase().includes(q) ||
          (p.student?.name || "").toLowerCase().includes(q) ||
          (p.student?.rollNumber || "").toLowerCase().includes(q) ||
          (p.transactionRef || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [feesData, filterMode, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Fee Obligations & Collections</h1>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              Contract OPS-001 Ledger
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Idempotent fee receipts, student obligation tracking, and audited append-only reversals.
          </p>
        </div>

        <button
          onClick={onOpenRecordFeeModal}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition"
        >
          <CreditCard className="w-3.5 h-3.5" />
          + Record Fee Collection
        </button>
      </div>

      {/* Overview Metrics Cards */}
      {feesData && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Obligations
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              ₹{feesData.metrics?.totalObligations?.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Enrolled Student Cohort Total</div>
          </div>
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              Collected to Date
            </span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              ₹{feesData.metrics?.totalCollected?.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Realized Accounting Inflow</div>
          </div>
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
              Outstanding Balance
            </span>
            <div className="text-2xl font-black text-amber-600 mt-1">
              ₹{feesData.metrics?.totalOutstanding?.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Pending Installment Collections</div>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search receipt, student, UTR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 font-medium focus:outline-none"
          >
            <option value="ALL">All Modes</option>
            <option value="UPI">UPI Payments</option>
            <option value="CASH">Cash Counter</option>
            <option value="CHEQUE">Cheque</option>
            <option value="REVERSED">Reversed Records</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Showing <strong>{payments.length}</strong> Transactions
        </div>
      </div>

      {/* Receipts Table with Reversal Action */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider border-b border-slate-200 font-bold">
              <tr>
                <th className="px-5 py-3.5">Receipt No</th>
                <th className="px-5 py-3.5">Student / Roll</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Mode</th>
                <th className="px-5 py-3.5">Reference / Notes</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Audit Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {payments.map((p: any) => {
                const isReversed = p.status === "REVERSED";

                return (
                  <tr key={p.id} className={isReversed ? "bg-slate-50/60 opacity-60" : "hover:bg-slate-50/70"}>
                    <td className="px-5 py-3.5 font-mono font-bold text-blue-700">
                      {p.receiptNumber}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{p.student?.name}</div>
                      <div className="text-[11px] font-mono text-slate-400">{p.student?.rollNumber}</div>
                    </td>
                    <td className="px-5 py-3.5 font-black text-slate-900 text-sm">
                      <span className={isReversed ? "line-through text-slate-400" : "text-emerald-700"}>
                        ₹{p.amount?.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 font-mono text-[11px]">{p.paymentMode}</td>
                    <td className="px-5 py-3.5 text-slate-500 text-[11px]">
                      {p.remarks || p.transactionRef || "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          isReversed
                            ? "bg-rose-100 text-rose-800 border-rose-300"
                            : "bg-emerald-100 text-emerald-800 border-emerald-300"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {!isReversed && onOpenReverseModal && (
                        <button
                          onClick={() => onOpenReverseModal(p)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition"
                          title="Append-only audited reversal"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Reverse
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {payments.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                    No fee payment receipts matching criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
