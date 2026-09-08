"use client";

import React from "react";
import { X, Building2 } from "lucide-react";

interface ProvisionAcademyModalProps {
  isOpen: boolean;
  form: {
    name: string;
    code: string;
    type: string;
    planId: string;
    city: string;
    address: string;
    ownerName: string;
    ownerEmail: string;
    ownerPassword: string;
    ownerPhone: string;
    primaryExam: string;
  };
  setForm: React.Dispatch<React.SetStateAction<any>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ProvisionAcademyModal({
  isOpen,
  form,
  setForm,
  onClose,
  onSubmit,
}: ProvisionAcademyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Provision New Institute / Academy
            </h3>
            <p className="text-xs text-slate-500">Creates isolated tenant partition, campus, and owner account.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-slate-700 font-bold">Institute / Academy Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Chaitanya IIT Academy"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-700 font-bold">Subdomain / Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. CHAITANYA_PUNE"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-slate-700 font-bold">Operating Model</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="INSTITUTE">Coaching Institute (Multi-Branch)</option>
                <option value="INDIVIDUAL_TEACHER">Individual Teacher (Single Classroom)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-slate-700 font-bold">Primary Exam Focus</label>
              <select
                value={form.primaryExam}
                onChange={(e) => setForm({ ...form, primaryExam: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="JEE_MAIN">JEE Main & Advanced</option>
                <option value="NEET">NEET (UG Medical)</option>
                <option value="MHT_CET">MHT-CET (Maharashtra)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-slate-700 font-bold">Headquarters City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-700 font-bold">License Plan</label>
              <select
                value={form.planId}
                onChange={(e) => setForm({ ...form, planId: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="PRO_INSTITUTE">Pro Institute (Unlimited)</option>
                <option value="ENTERPRISE">Enterprise Multi-Campus</option>
                <option value="TEACHER_PRO">Teacher Pro (Single Branch)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <div className="font-bold text-slate-900 mb-2">Director / Owner Credentials</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-700 font-bold">Director Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. P. K. Rao"
                  value={form.ownerName}
                  onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-700 font-bold">Director Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. director@chaitanya.com"
                  value={form.ownerEmail}
                  onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
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
              Provision Institute Now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
