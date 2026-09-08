"use client";

import React from "react";
import { X, UserPlus } from "lucide-react";

interface AddLeadModalProps {
  isOpen: boolean;
  form: {
    name: string;
    phone: string;
    source: string;
    courseInterest: string;
    examTarget: string;
  };
  setForm: React.Dispatch<React.SetStateAction<any>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function AddLeadModal({
  isOpen,
  form,
  setForm,
  onClose,
  onSubmit,
}: AddLeadModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-600" />
              Capture New Admission Enquiry
            </h3>
            <p className="text-xs text-slate-500">Enters lead into the CRM pipeline for follow-up.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="text-slate-700 font-bold">Student / Parent Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Swati Deshpande"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-slate-700 font-bold">Phone Number *</label>
              <input
                type="text"
                required
                placeholder="9822001144"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-700 font-bold">Lead Source</label>
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="WALK_IN">Walk-in Inquiry</option>
                <option value="PHONE">Phone Call</option>
                <option value="WEBSITE">Website Form</option>
                <option value="REFERRAL">Student Referral</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-slate-700 font-bold">Course of Interest</label>
              <input
                type="text"
                value={form.courseInterest}
                onChange={(e) => setForm({ ...form, courseInterest: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-700 font-bold">Exam Target</label>
              <select
                value={form.examTarget}
                onChange={(e) => setForm({ ...form, examTarget: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="JEE_MAIN">JEE Main</option>
                <option value="NEET">NEET</option>
                <option value="MHT_CET">MHT-CET</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-100 text-slate-700 font-bold px-4 py-2 rounded-lg border border-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-lg shadow-sm transition"
            >
              Add to CRM Pipeline
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
