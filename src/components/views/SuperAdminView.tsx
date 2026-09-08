"use client";

import React from "react";
import { Plus } from "lucide-react";

interface SuperAdminViewProps {
  tenantsList: any[];
  students: any[];
  exams: any[];
  onOpenProvisionModal: () => void;
  onRefreshTenants: () => void;
  onSelectTenant: (code: string, type: string, name: string) => void;
}

export const SuperAdminView: React.FC<SuperAdminViewProps> = ({
  tenantsList,
  students,
  exams,
  onOpenProvisionModal,
  onRefreshTenants,
  onSelectTenant,
}) => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">WebPie Super Admin Operations Hub</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Platform-wide tenant provisioning, academic node fleet telemetry, and curriculum distribution.
          </p>
        </div>
        <button
          onClick={onOpenProvisionModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          + Provision New Institute / Academy
        </button>
      </div>

      {/* Platform Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Registered Institutes</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{tenantsList.length}</div>
          <div className="text-xs text-blue-600 font-medium mt-1">Multi-Tenant Isolated</div>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Students Platform-Wide</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {tenantsList.reduce((acc, t) => acc + (t.studentsCount || 0), 0) + students.length}
          </div>
          <div className="text-xs text-emerald-600 font-medium mt-1">100% Enrolled in Batches</div>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assessment Papers Generated</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {tenantsList.reduce((acc, t) => acc + (t.examsCount || 0), 0) + exams.length}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-1">JEE / NEET / CET Matrix</div>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Node Fleet Status</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">100% Online</div>
          <div className="text-xs text-slate-500 font-medium mt-1">Zero Outbox Lag</div>
        </div>
      </div>

      {/* Tenants Directory Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900">Provisioned Coaching Institutes & Academies</span>
          <button onClick={onRefreshTenants} className="text-xs text-blue-600 hover:text-blue-700 font-semibold">
            Refresh Directory
          </button>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-5 py-3">Institute / Academy</th>
              <th className="px-5 py-3">Operating Model</th>
              <th className="px-5 py-3">Code</th>
              <th className="px-5 py-3">Director / Owner</th>
              <th className="px-5 py-3">Campuses</th>
              <th className="px-5 py-3">Students</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tenantsList.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50/80 transition">
                <td className="px-5 py-3 font-semibold text-slate-900">
                  <div>{t.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono">{t.customDomain}</div>
                </td>
                <td className="px-5 py-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    t.type === "INSTITUTE"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}>
                    {t.type}
                  </span>
                </td>
                <td className="px-5 py-3 font-mono font-bold text-slate-700">{t.code}</td>
                <td className="px-5 py-3 text-slate-600">
                  <div className="font-medium text-slate-900">{t.ownerName}</div>
                  <div className="text-[11px] text-slate-400">{t.ownerEmail}</div>
                </td>
                <td className="px-5 py-3 font-medium text-slate-700">{t.branchesCount || 1} Campus</td>
                <td className="px-5 py-3 font-bold text-slate-900">{t.studentsCount || 0}</td>
                <td className="px-5 py-3">
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-bold">
                    {t.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => onSelectTenant(t.code, t.type, t.name)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs px-3 py-1.5 rounded font-medium border border-slate-300 transition"
                  >
                    Enter Cockpit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
