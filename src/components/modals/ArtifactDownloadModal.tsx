"use client";

import React from "react";
import { X, Download } from "lucide-react";

interface ArtifactDownloadModalProps {
  artifactData: { filename: string; dataUri: string } | null;
  onClose: () => void;
}

export function ArtifactDownloadModal({
  artifactData,
  onClose,
}: ArtifactDownloadModalProps) {
  if (!artifactData) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="font-bold text-slate-900 text-base">Printable Artifact Ready</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs space-y-2">
          <div className="text-slate-700">
            File: <span className="font-mono text-blue-700 font-bold">{artifactData.filename}</span>
          </div>
          <p className="text-slate-500 text-[11px]">
            Rendered with 4-corner fiducial anchors, candidate barcode, and high-density vector typography.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <a
            href={artifactData.dataUri}
            download={artifactData.filename}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </a>
        </div>
      </div>
    </div>
  );
}
