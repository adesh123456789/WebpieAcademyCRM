"use client";

import React from "react";
import { Download } from "lucide-react";

interface InterventionsViewProps {
  interventions: any[];
  onDownloadRemedialWorksheet: (id: string) => void;
}

export const InterventionsView: React.FC<InterventionsViewProps> = ({
  interventions,
  onDownloadRemedialWorksheet,
}) => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Closed-Loop Intervention Workspace</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Convert diagnosed weak concepts into targeted practice ladders and printable remedial worksheets.
        </p>
      </div>

      <div className="space-y-4">
        {interventions.map((inv) => (
          <div key={inv.id} className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold px-2.5 py-0.5 rounded">
                  {inv.priority}
                </span>
                <h4 className="font-bold text-slate-900 text-sm">{inv.title}</h4>
              </div>
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                {inv.status}
              </span>
            </div>

            <div className="text-xs text-slate-700">
              Concept: <span className="font-bold text-amber-800">{inv.concept}</span>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div className="text-xs text-slate-500 font-medium">
                Affected Students: <span className="text-slate-900 font-bold">3 Students Clustered</span>
              </div>

              <button
                onClick={() => onDownloadRemedialWorksheet(inv.id)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Download Printable Remedial Worksheet PDF
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
