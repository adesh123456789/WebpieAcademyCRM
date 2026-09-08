"use client";

import React from "react";
import {
  ScanLine,
  Plus,
  AlertTriangle,
  Users,
  FileText,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";
import { UserRole } from "@/lib/permissions";

interface DashboardViewProps {
  currentRole: UserRole;
  detectedWeakQueue: any[];
  students: any[];
  exams: any[];
  interventions: any[];
  runSimulatedOmrScan: () => void;
  onNavigateTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentRole,
  detectedWeakQueue,
  students,
  exams,
  interventions,
  runSimulatedOmrScan,
  onNavigateTab,
}) => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {currentRole === "INDIVIDUAL_TEACHER"
              ? "Independent Educator Cockpit (Today)"
              : currentRole === "TEACHER"
              ? "Teacher Command: What to Teach / Reteach Today"
              : "Executive Academic & Operational Pulse"}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Live assessment signals, batch concept vulnerabilities, and active intervention workflows.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={runSimulatedOmrScan}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition"
          >
            <ScanLine className="w-4 h-4" />
            Scan Physical OMR Batch
          </button>
          <button
            onClick={() => onNavigateTab("exams")}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2 rounded-lg border border-slate-300 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create New Test
          </button>
        </div>
      </div>

      {/* Priority Vulnerability Alert Banner */}
      {detectedWeakQueue.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-rose-900">
                Priority Academic Vulnerability in Batch 2026-A
              </h4>
              <p className="text-xs text-rose-700 mt-0.5">
                {detectedWeakQueue[0].students.length} students scored below 30% on{" "}
                <span className="font-bold underline">{detectedWeakQueue[0].concept}</span> in recent Mock.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab("interventions")}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-sm"
          >
            Open Remedial Workspace
          </button>
        </div>
      )}

      {/* Operational Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Enrolled Students</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{students.length}</div>
          <div className="text-xs text-emerald-600 font-medium mt-1">Rankers Batch 2026-A</div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Tests Evaluated</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{exams.length}</div>
          <div className="text-xs text-blue-600 font-medium mt-1">Latest: JEE Main Mock #01</div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Critical Weak Concepts</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600">{detectedWeakQueue.length}</div>
          <div className="text-xs text-slate-500 font-medium mt-1">Limiting Friction & Repose</div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Interventions</span>
            <GraduationCap className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600">{interventions.length}</div>
          <div className="text-xs text-emerald-600 font-medium mt-1">3 students in recovery ladder</div>
        </div>
      </div>

      {/* Assessment Closed-Loop Visualizer */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        <h3 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          The WebPie Closed-Loop Assessment Workflow (PRD Sec 1.3)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-center text-xs">
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold mx-auto mb-1 flex items-center justify-center">1</div>
            <div className="font-bold text-slate-900">Measure</div>
            <div className="text-[11px] text-slate-500">Printed OMR Test</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold mx-auto mb-1 flex items-center justify-center">2</div>
            <div className="font-bold text-slate-900">Diagnose</div>
            <div className="text-[11px] text-slate-500">Mastery Math</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold mx-auto mb-1 flex items-center justify-center">3</div>
            <div className="font-bold text-slate-900">Prescribe</div>
            <div className="text-[11px] text-slate-500">Practice Ladder</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold mx-auto mb-1 flex items-center justify-center">4</div>
            <div className="font-bold text-slate-900">Practice</div>
            <div className="text-[11px] text-slate-500">Print Worksheet</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold mx-auto mb-1 flex items-center justify-center">5</div>
            <div className="font-bold text-slate-900">Verify</div>
            <div className="text-[11px] text-slate-500">Mini Re-Test</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold mx-auto mb-1 flex items-center justify-center">6</div>
            <div className="font-bold text-slate-900">Communicate</div>
            <div className="text-[11px] text-slate-500">WhatsApp / Portal</div>
          </div>
        </div>
      </div>
    </div>
  );
};
