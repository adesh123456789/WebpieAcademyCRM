"use client";

import React from "react";
import { Building2, UserCheck, CheckCircle2, LogOut, User as UserIcon } from "lucide-react";
import { UserRole } from "@/lib/permissions";
import { AuthenticatedUser } from "@/components/auth/LoginView";

interface AppHeaderProps {
  currentRole: UserRole;
  currentBranch: string;
  currentUser?: AuthenticatedUser | null;
  nodesCount: number;
  statusMessage: string | null;
  onOpenNodeSyncModal: () => void;
  onChangeRole: (newRole: UserRole) => void;
  onOpenLoginModal: () => void;
  onLogout: () => void;
}

export function AppHeader({
  currentRole,
  currentBranch,
  currentUser,
  nodesCount,
  statusMessage,
  onOpenNodeSyncModal,
  onChangeRole,
  onOpenLoginModal,
  onLogout,
}: AppHeaderProps) {
  return (
    <>
      {/* TOAST NOTIFICATION */}
      {statusMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl border border-slate-700 flex items-center gap-3 text-xs font-medium animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* TOP HEADER: BRIGHT, PROFESSIONAL, HIGH-CONTRAST */}
      <header className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        {/* Brand & Identity */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-sm text-white shadow-sm">
              W
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-2">
                WebPie Academic OS
                <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-mono font-medium">
                  v2.0-PROD
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {currentUser?.tenantName ||
                  (currentRole === "WEBPIE_ADMIN"
                    ? "Global Platform Operations"
                    : currentRole === "INDIVIDUAL_TEACHER"
                    ? "Prof. Deshmukh Physics (Independent Mode)"
                    : "Apex IIT-JEE & NEET Academy, Pune")}
              </div>
            </div>
          </div>

          <div className="h-5 w-[1px] bg-slate-200 mx-1" />

          {/* Context Badge */}
          <div className="hidden lg:flex items-center gap-2 text-xs bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md text-slate-700 font-medium">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span>{currentUser?.branchName || currentBranch}</span>
          </div>
        </div>

        {/* Global Controls & Authenticated User Context */}
        <div className="flex items-center gap-3">
          {/* Node Health / Fleet Trigger */}
          <button
            type="button"
            onClick={onOpenNodeSyncModal}
            className="hidden md:flex items-center gap-2 text-xs bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-md font-medium transition cursor-pointer shadow-xs active:scale-95"
            title="Open Windows Academic Node & Offline Sync Hub"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold">Academic Node: Synced</span>
            <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-mono font-bold">
              {nodesCount > 0 ? `${nodesCount} Online` : "Ready"}
            </span>
          </button>

          {/* Authenticated User Capsule */}
          {currentUser && (
            <div className="hidden xl:flex items-center gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                {currentUser.name.charAt(0)}
              </div>
              <div className="leading-none">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  {currentUser.name}
                  <span className="text-[9px] bg-slate-200 text-slate-700 px-1 py-0.5 rounded font-mono font-bold uppercase">
                    {currentUser.role}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">{currentUser.email}</div>
              </div>
            </div>
          )}

          {/* Quick Role Re-Auth Selector for Seamless Testing */}
          <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 p-1 rounded-lg">
            <span className="text-xs text-slate-600 font-semibold pl-2">Role:</span>
            <select
              value={currentRole}
              onChange={(e) => onChangeRole(e.target.value as UserRole)}
              className="bg-white border border-slate-300 text-xs text-slate-900 font-bold px-2.5 py-1 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="WEBPIE_ADMIN">1. Super Admin (WebPie HQ)</option>
              <option value="OWNER">2. Institute Owner</option>
              <option value="BRANCH_ADMIN">3. Branch Admin</option>
              <option value="TEACHER">4. Teacher (Academic Lead)</option>
              <option value="COUNSELLOR">5. Admissions Counsellor</option>
              <option value="ACCOUNTANT">6. Accountant (Finance)</option>
              <option value="STUDENT">7. Student Portal</option>
              <option value="PARENT">8. Parent Portal</option>
              <option value="INDIVIDUAL_TEACHER">9. Individual Teacher (All-In-One)</option>
            </select>
          </div>

          {/* Direct Login Modal Trigger */}
          <button
            onClick={onOpenLoginModal}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-sm transition cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Switch Account</span>
          </button>

          {/* Real Session Logout */}
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition cursor-pointer shadow-2xs active:scale-95"
            title="Sign out of current authenticated session"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>
    </>
  );
}
