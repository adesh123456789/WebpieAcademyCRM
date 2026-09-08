"use client";

import React from "react";
import { Plus } from "lucide-react";

interface CrmViewProps {
  crmLeads: any[];
  onOpenAddLeadModal: () => void;
  onAdvanceLeadStage: (leadId: string, currentStage: string) => void;
  onConvertLead: (lead: any) => void;
}

export const CrmView: React.FC<CrmViewProps> = ({
  crmLeads,
  onOpenAddLeadModal,
  onAdvanceLeadStage,
  onConvertLead,
}) => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Admissions CRM Pipeline</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track student enquiries, follow-ups, demos, and 1-click conversion to enrolled student.
          </p>
        </div>
        <button
          onClick={onOpenAddLeadModal}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" />
          + New Enquiry
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {["ENQUIRY", "FOLLOW_UP", "DEMO", "ADMISSION"].map((stage) => {
          const stageLeads = crmLeads.filter((l) => l.stage === stage);
          return (
            <div key={stage} className="bg-white border border-slate-200 p-4 rounded-xl space-y-3 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">
                <span>{stage.replace("_", " ")}</span>
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono text-[11px]">
                  {stageLeads.length}
                </span>
              </div>

              <div className="space-y-2">
                {stageLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs space-y-2 shadow-sm"
                  >
                    <div className="font-bold text-slate-900">{lead.name}</div>
                    <div className="text-slate-500 text-[11px]">Phone: {lead.phone}</div>
                    <div className="text-blue-700 font-semibold text-[11px]">Interest: {lead.courseInterest}</div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-1 text-[11px]">
                      {lead.stage !== "ADMISSION" ? (
                        <button
                          onClick={() => onAdvanceLeadStage(lead.id, lead.stage)}
                          className="bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold px-2 py-1 rounded text-[10px] transition"
                        >
                          Advance &rarr;
                        </button>
                      ) : (
                        <span className="text-emerald-700 font-bold text-[10px]">Enrolled</span>
                      )}

                      {lead.stage === "DEMO" && (
                        <button
                          onClick={() => onConvertLead(lead)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-1 rounded text-[10px] transition shadow-xs"
                        >
                          Enroll Student
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
