"use client";

import React from "react";
import { X } from "lucide-react";

interface DirectLoginModalProps {
  isOpen: boolean;
  loginForm: { email: string; password: string; error: string };
  setLoginForm: React.Dispatch<React.SetStateAction<any>>;
  onClose: () => void;
  onSubmit: (e?: React.FormEvent) => void;
}

export function DirectLoginModal({
  isOpen,
  loginForm,
  setLoginForm,
  onClose,
  onSubmit,
}: DirectLoginModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Direct User Authentication</h3>
            <p className="text-xs text-slate-500">Sign in with registered credentials or pick a role shortcut.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Demo Fill Buttons */}
        <div className="space-y-1.5">
          <label className="text-[11px] text-slate-500 uppercase font-bold">Quick Switch Personas:</label>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setLoginForm({ email: "superadmin@webpie.in", password: "superadmin123", error: "" })}
              className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-left hover:bg-slate-100 transition"
            >
              <div className="font-bold text-slate-900">Super Admin</div>
              <div className="text-[10px] text-slate-500">superadmin@webpie.in</div>
            </button>
            <button
              type="button"
              onClick={() => setLoginForm({ email: "owner@apexiit.com", password: "admin123", error: "" })}
              className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-left hover:bg-slate-100 transition"
            >
              <div className="font-bold text-slate-900">Institute Owner</div>
              <div className="text-[10px] text-slate-500">owner@apexiit.com</div>
            </button>
            <button
              type="button"
              onClick={() => setLoginForm({ email: "teacher.physics@apexiit.com", password: "admin123", error: "" })}
              className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-left hover:bg-slate-100 transition"
            >
              <div className="font-bold text-slate-900">Physics Lead</div>
              <div className="text-[10px] text-slate-500">teacher.physics@...</div>
            </button>
            <button
              type="button"
              onClick={() => setLoginForm({ email: "admissions@apexiit.com", password: "admin123", error: "" })}
              className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-left hover:bg-slate-100 transition"
            >
              <div className="font-bold text-slate-900">Admissions Counsellor</div>
              <div className="text-[10px] text-slate-500">admissions@apexiit.com</div>
            </button>
            <button
              type="button"
              onClick={() => setLoginForm({ email: "accounts@apexiit.com", password: "admin123", error: "" })}
              className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-left hover:bg-slate-100 transition"
            >
              <div className="font-bold text-slate-900">Accountant / Finance</div>
              <div className="text-[10px] text-slate-500">accounts@apexiit.com</div>
            </button>
            <button
              type="button"
              onClick={() => setLoginForm({ email: "deshmukh@physics.com", password: "admin123", error: "" })}
              className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-left hover:bg-slate-100 transition"
            >
              <div className="font-bold text-slate-900">Independent Educator</div>
              <div className="text-[10px] text-slate-500">deshmukh@physics.com</div>
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-3 pt-2 text-xs">
          {loginForm.error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2 rounded-lg text-xs font-medium">
              {loginForm.error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-slate-700 font-bold">Email Address</label>
            <input
              type="email"
              required
              value={loginForm.email}
              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-700 font-bold">Password</label>
            <input
              type="password"
              required
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-bold border border-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-lg shadow-sm transition"
            >
              Sign In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
