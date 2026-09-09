"use client";

import React from "react";
import { X, Laptop, ShieldCheck, Sparkles, Building2 } from "lucide-react";

interface PairNodeModalProps {
  isOpen: boolean;
  pairForm: {
    nodeCode: string;
    name: string;
    machineFingerprint: string;
    branchCode?: string;
  };
  setPairForm: React.Dispatch<React.SetStateAction<any>>;
  currentTenant: string;
  currentBranch: string;
  branches?: Array<{ id: string; name: string; code: string }>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function PairNodeModal({
  isOpen,
  pairForm,
  setPairForm,
  currentTenant,
  currentBranch,
  branches = [],
  onClose,
  onSubmit,
}: PairNodeModalProps) {
  if (!isOpen) return null;

  const handleGenerateFingerprint = () => {
    const randomHex = Math.random().toString(16).substring(2, 10).toUpperCase();
    setPairForm((prev: any) => ({
      ...prev,
      machineFingerprint: `WIN-UUID-${randomHex}-X64`,
    }));
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-400">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">Pair Windows Academic Node</h3>
              <p className="text-[11px] text-slate-400">Contract C06 &bull; Edge Workstation Authentication</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4 text-xs">
          {/* Node Code */}
          <div className="space-y-1">
            <label className="text-slate-700 font-bold">Node Identifier Code *</label>
            <input
              type="text"
              required
              value={pairForm.nodeCode}
              onChange={(e) =>
                setPairForm({ ...pairForm, nodeCode: e.target.value.toUpperCase() })
              }
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="NODE-PUNE-01"
            />
            <p className="text-[10px] text-slate-500">Unique alphanumeric terminal tag in your academy.</p>
          </div>

          {/* Friendly Name */}
          <div className="space-y-1">
            <label className="text-slate-700 font-bold">Friendly Terminal Name *</label>
            <input
              type="text"
              required
              value={pairForm.name}
              onChange={(e) => setPairForm({ ...pairForm, name: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Kothrud Lab 1 Scanner PC"
            />
          </div>

          {/* Hardware Machine Fingerprint */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-slate-700 font-bold">Hardware Machine Fingerprint *</label>
              <button
                type="button"
                onClick={handleGenerateFingerprint}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Generate UUID
              </button>
            </div>
            <input
              type="text"
              required
              value={pairForm.machineFingerprint}
              onChange={(e) =>
                setPairForm({ ...pairForm, machineFingerprint: e.target.value })
              }
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="WIN-PC-8921-X64"
            />
            <p className="text-[10px] text-slate-500">
              Unique motherboard / CPU UUID bound to this terminal to prevent token duplication.
            </p>
          </div>

          {/* Branch Assignment (C06 Section 4) */}
          {branches.length > 0 && (
            <div className="space-y-1">
              <label className="text-slate-700 font-bold flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                Assigned Branch (Branch-Scoped Delta)
              </label>
              <select
                value={pairForm.branchCode || ""}
                onChange={(e) =>
                  setPairForm({ ...pairForm, branchCode: e.target.value })
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Branches / Main Campus</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.code}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500">
                Pull deltas will synchronize only students and batches enrolled in this branch.
              </p>
            </div>
          )}

          {/* Security & TTL Notice */}
          <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-1 text-xs">
            <div className="font-bold text-blue-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              90-Day Pairing Token Security
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              Paired nodes receive an encrypted SHA-256 token valid for 90 days. Terminals can be rotated or revoked at any time from the Sync Hub.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-lg border border-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-lg shadow-xs transition"
            >
              Authenticate & Pair Terminal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
