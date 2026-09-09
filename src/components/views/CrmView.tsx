"use client";

import React, { useState, useMemo } from "react";
import {
  Plus,
  ArrowRight,
  UserCheck,
  Calendar,
  AlertCircle,
  Clock,
  Phone,
  BookOpen,
  Search,
  XCircle,
  Filter,
} from "lucide-react";

export type CrmStage = "ENQUIRY" | "FOLLOW_UP" | "DEMO" | "ADMISSION" | "LOST";

export const CRM_STAGES: { key: CrmStage; label: string; color: string }[] = [
  { key: "ENQUIRY", label: "New Enquiry", color: "border-blue-300 bg-blue-50/50" },
  { key: "FOLLOW_UP", label: "Follow-Up Scheduled", color: "border-indigo-300 bg-indigo-50/50" },
  { key: "DEMO", label: "Demo Attended", color: "border-amber-300 bg-amber-50/50" },
  { key: "ADMISSION", label: "Admitted & Enrolled", color: "border-emerald-300 bg-emerald-50/50" },
  { key: "LOST", label: "Lost / Closed", color: "border-slate-300 bg-slate-50/50" },
];

interface CrmViewProps {
  crmLeads: any[];
  onOpenAddLeadModal: () => void;
  onAdvanceLeadStage: (leadId: string, currentStage: string, nextFollowUpAt?: string, lostReason?: string) => void;
  onConvertLead: (lead: any) => void;
}

export const CrmView: React.FC<CrmViewProps> = ({
  crmLeads,
  onOpenAddLeadModal,
  onAdvanceLeadStage,
  onConvertLead,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStageFilter, setActiveStageFilter] = useState<string>("ALL");

  // Duplicate phone/email detection (Contract OPS-001)
  const duplicatePhones = useMemo(() => {
    const counts: Record<string, number> = {};
    crmLeads.forEach((l) => {
      if (l.phone) counts[l.phone] = (counts[l.phone] || 0) + 1;
    });
    return new Set(Object.keys(counts).filter((p) => counts[p] > 1));
  }, [crmLeads]);

  const filteredLeads = useMemo(() => {
    return crmLeads.filter((l) => {
      if (activeStageFilter !== "ALL" && l.stage !== activeStageFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (l.name || "").toLowerCase().includes(q) ||
        (l.phone || "").toLowerCase().includes(q) ||
        (l.courseInterest || "").toLowerCase().includes(q)
      );
    });
  }, [crmLeads, activeStageFilter, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Admissions CRM Pipeline</h1>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200">
              Contract OPS-001
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            5-stage conversion funnel: Enquiry &rarr; Follow-Up &rarr; Demo &rarr; Admission &rarr; Lost.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={onOpenAddLeadModal}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            + New Enquiry
          </button>
        </div>
      </div>

      {/* Duplicate Warning Strip */}
      {duplicatePhones.size > 0 && (
        <div className="bg-amber-50 border border-amber-300 p-3 rounded-xl text-xs text-amber-900 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Duplicate Contact Warning:</strong> {duplicatePhones.size} phone number(s) appear across multiple leads. Check contact history before scheduling duplicate demos.
          </span>
        </div>
      )}

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
        {CRM_STAGES.map((stageObj) => {
          const stageLeads = filteredLeads.filter((l) => (l.stage || "ENQUIRY") === stageObj.key);

          return (
            <div
              key={stageObj.key}
              className="bg-white border border-slate-200 p-3.5 rounded-2xl space-y-3 shadow-sm flex flex-col justify-between min-h-[500px]"
            >
              <div>
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="text-xs font-black text-slate-800 tracking-tight">{stageObj.label}</span>
                  <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                    {stageLeads.length}
                  </span>
                </div>

                {/* Lead Cards List */}
                <div className="space-y-2.5 mt-3">
                  {stageLeads.map((lead) => {
                    const isDuplicate = lead.phone && duplicatePhones.has(lead.phone);

                    return (
                      <div
                        key={lead.id}
                        className={`border rounded-xl p-3 text-xs space-y-2.5 transition shadow-sm hover:shadow ${
                          stageObj.key === "ADMISSION"
                            ? "bg-emerald-50/40 border-emerald-200"
                            : stageObj.key === "LOST"
                            ? "bg-slate-50 border-slate-200 opacity-75"
                            : "bg-slate-50/60 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              {lead.name}
                              {isDuplicate && (
                                <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">
                                  DUP
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {lead.phone}
                            </div>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-600 bg-white border border-slate-200 p-1.5 rounded-md space-y-0.5">
                          <div className="font-semibold text-blue-700">{lead.courseInterest || "General Course"}</div>
                          <div className="text-slate-400 text-[10px]">Source: {lead.source || "Walk-In"}</div>
                        </div>

                        {/* Action Buttons based on stage */}
                        <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                          {lead.stage === "ENQUIRY" && (
                            <button
                              onClick={() => onAdvanceLeadStage(lead.id, "ENQUIRY")}
                              className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-1 px-2 rounded text-[11px] transition flex items-center justify-center gap-1"
                            >
                              Schedule Follow-Up &rarr;
                            </button>
                          )}

                          {lead.stage === "FOLLOW_UP" && (
                            <button
                              onClick={() => onAdvanceLeadStage(lead.id, "FOLLOW_UP")}
                              className="w-full bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold py-1 px-2 rounded text-[11px] transition flex items-center justify-center gap-1"
                            >
                              Book Demo Class &rarr;
                            </button>
                          )}

                          {lead.stage === "DEMO" && (
                            <div className="w-full grid grid-cols-2 gap-1.5">
                              <button
                                onClick={() => onConvertLead(lead)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-1 px-2 rounded text-[10px] transition flex items-center justify-center gap-1 shadow-xs"
                              >
                                <UserCheck className="w-3 h-3" />
                                Admit Student
                              </button>
                              <button
                                onClick={() => onAdvanceLeadStage(lead.id, "DEMO", undefined, "Declined fee structure")}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-1 px-1 rounded text-[10px] transition text-center"
                              >
                                Mark Lost
                              </button>
                            </div>
                          )}

                          {lead.stage === "ADMISSION" && (
                            <span className="w-full text-center text-emerald-800 font-black text-[10px] bg-emerald-100 py-0.5 rounded">
                              ✓ Enrolled in Cohort
                            </span>
                          )}

                          {lead.stage === "LOST" && (
                            <span className="w-full text-center text-slate-500 font-medium text-[10px]">
                              Closed / Dropped
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {stageLeads.length === 0 && (
                    <div className="py-8 text-center text-[11px] text-slate-400 italic">
                      No leads in this stage
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
