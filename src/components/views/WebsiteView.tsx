"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";

interface WebsiteViewProps {
  websiteData: any;
  onPublishWebsite: () => void;
}

export const WebsiteView: React.FC<WebsiteViewProps> = ({ websiteData, onPublishWebsite }) => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Institute Website CMS & Live Preview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            White-label public website builder with instant preview and domain mapping.
          </p>
        </div>
        <button
          onClick={onPublishWebsite}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-sm"
        >
          Publish Website Live
        </button>
      </div>

      {websiteData && (
        <div className="bg-white border border-slate-200 p-6 rounded-xl space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-xs">
            <span className="font-mono text-blue-700 font-bold">Domain: {websiteData.tenant?.customDomain}</span>
            <span className="text-emerald-600 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> SSL Active
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl bg-slate-50 p-6 space-y-6">
            <div className="text-center space-y-2">
              <span className="text-xs bg-blue-100 text-blue-800 border border-blue-200 px-3 py-1 rounded-full font-bold">
                {websiteData.tenant?.name}
              </span>
              <h1 className="text-2xl font-black text-slate-900">{websiteData.sections?.HERO?.title}</h1>
              <p className="text-xs text-slate-600 max-w-lg mx-auto">{websiteData.sections?.HERO?.subtitle}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="text-2xl font-black text-blue-600">142+</div>
                <div className="text-xs text-slate-600 font-medium">IIT-JEE Selections</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="text-2xl font-black text-emerald-600">89+</div>
                <div className="text-xs text-slate-600 font-medium">NEET 650+ Scorers</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="text-2xl font-black text-amber-600">98.4</div>
                <div className="text-xs text-slate-600 font-medium">Average Percentile</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
