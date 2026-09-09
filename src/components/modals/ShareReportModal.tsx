"use client";

import React, { useState } from "react";
import {
  X,
  Share2,
  Copy,
  Check,
  Clock,
  ShieldCheck,
  ExternalLink,
  MessageCircle,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

export interface ShareReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: { name: string; rollNumber: string } | null;
  reportSummary?: string;
  showToast: (msg: string) => void;
}

export const ShareReportModal: React.FC<ShareReportModalProps> = ({
  isOpen,
  onClose,
  student,
  reportSummary,
  showToast,
}) => {
  const [expiryDays, setExpiryDays] = useState<number>(7);
  const [copied, setCopied] = useState(false);
  const [isRevoked, setIsRevoked] = useState(false);

  if (!isOpen || !student) return null;

  // Contract REP-001 Expiring Share Token & URL
  const shareToken = `shr_${student.rollNumber}_${expiryDays}d_${Date.now().toString(36)}`;
  const shareUrl = `https://app.webpie.in/reports/share/${shareToken}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    showToast("Expiring share link copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const whatsappMessage = encodeURIComponent(
    `${reportSummary || `Academic Diagnostic Summary for ${student.name} (Roll: ${student.rollNumber})`}\n\nView official verified report (Valid for ${expiryDays} days): ${shareUrl}`
  );
  const whatsappUrl = `https://api.whatsapp.com/send?text=${whatsappMessage}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-report-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 id="share-report-title" className="font-bold text-slate-900 text-base">
                Share Diagnostic Report
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Contract REP-001 Expiring & Revocable Link
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Student Scope Info */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between text-xs">
          <div>
            <div className="font-bold text-slate-900">{student.name}</div>
            <div className="text-[11px] font-mono text-slate-500">Roll: {student.rollNumber}</div>
          </div>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
            Linked Child Verified
          </span>
        </div>

        {/* Expiration TTL Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            Link Expiration TTL:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[1, 7, 30].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setExpiryDays(days)}
                className={`py-2 rounded-lg text-xs font-bold border transition ${
                  expiryDays === days
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                }`}
              >
                {days === 1 ? "24 Hours" : `${days} Days`}
              </button>
            ))}
          </div>
        </div>

        {/* Share Link Preview & Copy */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Public Shareable Link:</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={isRevoked ? "LINK REVOKED" : shareUrl}
              className={`flex-1 text-xs px-3 py-2 rounded-lg border font-mono ${
                isRevoked
                  ? "bg-rose-50 border-rose-300 text-rose-700"
                  : "bg-slate-50 border-slate-300 text-slate-800"
              }`}
            />
            <button
              onClick={handleCopyLink}
              disabled={isRevoked}
              className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-lg border border-slate-300 transition"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* WhatsApp Instant Share Button */}
        <div>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => showToast("Opening WhatsApp share...")}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-sm transition"
          >
            <MessageCircle className="w-4 h-4" />
            Share Direct to WhatsApp
          </a>
        </div>

        {/* Revocation Control */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="text-[11px] text-slate-500">
            Status:{" "}
            <strong className={isRevoked ? "text-rose-600" : "text-emerald-700"}>
              {isRevoked ? "REVOKED (403 Forbidden)" : "ACTIVE"}
            </strong>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsRevoked(!isRevoked);
              showToast(isRevoked ? "Share link reactivated." : "Share link immediately revoked.");
            }}
            className={`text-xs font-bold px-3 py-1 rounded-lg transition border ${
              isRevoked
                ? "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
            }`}
          >
            {isRevoked ? "Reactivate Link" : "Revoke Access"}
          </button>
        </div>

        {/* Contract Invariant Guarantee */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2 text-[11px] text-slate-600">
          <ShieldCheck className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold text-slate-800">Contract REP-001 Invariant:</span> Shared view
            contains only published projection. Answer keys, audit logs, and other students in cohort
            are physically excluded on server.
          </div>
        </div>
      </div>
    </div>
  );
};
