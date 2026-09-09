"use client";

import React from "react";
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  X,
  BookOpen,
  Calendar,
  CheckCircle2,
  FileText,
  Clock,
  ArrowRight,
} from "lucide-react";

export interface CopilotActionPlan {
  id: string;
  topic: string;
  subject: string;
  targetBatch: string;
  evidenceSummary: string;
  recommendedActions: {
    type: "REMEDIAL_WORKSHEET" | "EXTRA_DOUBT_SESSION" | "ASSIGNMENT_RETEST";
    title: string;
    description: string;
    estimatedMinutes: number;
  }[];
  retrievalScope: "TENANT_PRIVATE" | "WEBPIE_APPROVED_BANK";
  confidenceScore: number;
  aiRequestId?: string;
}

interface CopilotActionPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionPlan: CopilotActionPlan | null;
  onConfirmPlan: (planId: string) => void;
}

export const CopilotActionPreviewModal: React.FC<CopilotActionPreviewModalProps> = ({
  isOpen,
  onClose,
  actionPlan,
  onConfirmPlan,
}) => {
  if (!isOpen || !actionPlan) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-200" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Teacher Copilot — Action Plan Preview</h2>
              <p className="text-[11px] text-indigo-200">
                Ground-truth academic diagnosis & structured intervention roadmap
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-indigo-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Boundary Notice */}
          <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Educator Boundary (Contract AI-001):</span> Copilot recommendations are purely assistive. Authoritative student scoring, rank calculation, and official grade records are strictly deterministic and require human verification.
            </div>
          </div>

          {/* Context Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">Target Focus Area</span>
              <span className="bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded text-[10px]">
                Confidence: {Math.round(actionPlan.confidenceScore * 100)}%
              </span>
            </div>
            <div className="text-sm font-bold text-slate-900">{actionPlan.topic}</div>
            <div className="text-slate-600 flex items-center gap-3 text-[11px]">
              <span>Subject: <strong>{actionPlan.subject}</strong></span>
              <span>•</span>
              <span>Batch: <strong>{actionPlan.targetBatch}</strong></span>
              <span>•</span>
              <span>Retrieval Scope: <strong className="font-mono text-indigo-700">{actionPlan.retrievalScope}</strong></span>
            </div>
          </div>

          {/* Ground-truth Evidence */}
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              Grounded Diagnostic Evidence
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 leading-relaxed">
              {actionPlan.evidenceSummary}
            </div>
          </div>

          {/* Action Items */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Proposed Remedial Interventions ({actionPlan.recommendedActions.length})
            </div>

            <div className="space-y-2">
              {actionPlan.recommendedActions.map((act, i) => (
                <div
                  key={i}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 text-xs space-y-1 hover:border-indigo-300 transition shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                        {i + 1}
                      </span>
                      {act.title}
                    </div>
                    <span className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                      <Clock className="w-3 h-3 text-slate-400" />
                      ~{act.estimatedMinutes} mins
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] pl-7">{act.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Provenance ID */}
          {actionPlan.aiRequestId && (
            <div className="text-[10px] font-mono text-slate-400 text-right">
              Audit Provenance Ref: {actionPlan.aiRequestId}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-4 py-2"
          >
            Dismiss
          </button>
          <button
            onClick={() => onConfirmPlan(actionPlan.id)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm transition"
          >
            Confirm & Schedule Roadmap
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
