"use client";

import React, { useState } from "react";
import {
  KeyRound,
  Lock,
  Mail,
  Building2,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Loader2,
} from "lucide-react";
import { UserRole } from "@/lib/permissions";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  tenantId: string;
  tenantName: string;
  tenantType: string;
  tenantCode: string;
  branchId?: string | null;
  branchName?: string;
}

interface LoginViewProps {
  onLoginSuccess: (user: AuthenticatedUser) => void;
}

interface QuickPersona {
  role: UserRole;
  title: string;
  name: string;
  email: string;
  pass: string;
  tenantCode?: string;
  badge: string;
  badgeColor: string;
}

const QUICK_PERSONAS: QuickPersona[] = [
  {
    role: "OWNER",
    title: "Institute Owner",
    name: "Dr. Rajesh Sharma",
    email: "owner@apexiit.com",
    pass: "admin123",
    badge: "Apex Academy",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    role: "TEACHER",
    title: "Physics Lead (HOD)",
    name: "Prof. Vinod Kulkarni",
    email: "teacher.physics@apexiit.com",
    pass: "admin123",
    badge: "Faculty",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    role: "COUNSELLOR",
    title: "Admissions Counsellor",
    name: "Pooja Patil",
    email: "admissions@apexiit.com",
    pass: "admin123",
    badge: "CRM",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    role: "ACCOUNTANT",
    title: "Finance & Accounts",
    name: "Sanjay Joshi",
    email: "accounts@apexiit.com",
    pass: "admin123",
    badge: "Ledger",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    role: "INDIVIDUAL_TEACHER",
    title: "Independent Educator",
    name: "Prof. Satish Deshmukh",
    email: "deshmukh@physics.com",
    pass: "admin123",
    badge: "Independent Mode",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
  },
  {
    role: "WEBPIE_ADMIN",
    title: "WebPie Super Admin",
    name: "Platform HQ Admin",
    email: "superadmin@webpie.in",
    pass: "superadmin123",
    badge: "Root HQ",
    badgeColor: "bg-slate-100 text-slate-800 border-slate-300",
  },
];

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState("owner@apexiit.com");
  const [password, setPassword] = useState("admin123");
  const [tenantCode, setTenantCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function performLogin(targetEmail: string, targetPass: string, targetTenant?: string) {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail.trim(),
          password: targetPass,
          tenantCode: targetTenant?.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Authentication failed. Please verify your credentials.");
        setIsLoading(false);
        return;
      }

      if (data.user) {
        onLoginSuccess(data.user);
      } else {
        setErrorMessage("Invalid response from authentication service.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error. Please check connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    performLogin(email, password, tenantCode);
  }

  function handlePersonaClick(persona: QuickPersona) {
    setEmail(persona.email);
    setPassword(persona.pass);
    if (persona.tenantCode) {
      setTenantCode(persona.tenantCode);
    } else {
      setTenantCode("");
    }
    performLogin(persona.email, persona.pass, persona.tenantCode);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white font-black text-xl shadow-md mb-3">
          W
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          WebPie Academic OS
        </h1>
        <p className="mt-1 text-xs font-medium text-slate-500">
          Maharashtra-First Academic Operating System &middot; v2.0-PROD
        </p>
      </div>

      {/* Main Container */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl px-4 sm:px-0">
        <div className="bg-white border border-slate-200 py-8 px-6 shadow-xl rounded-2xl sm:px-10">
          <div className="border-b border-slate-100 pb-5 mb-6">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-600" />
              Sign In to Your Workspace
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter your registered institute credentials or select a verified test persona below.
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs font-medium flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">Authentication error: </span>
                {errorMessage}
              </div>
            </div>
          )}

          {/* Real Credentials Form */}
          <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@academy.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Institute / Tenant Code <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={tenantCode}
                  onChange={(e) => setTenantCode(e.target.value)}
                  placeholder="e.g. APEX_PUNE or DESHMUKH_PHYSICS"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating Session...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Session</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick-Auth Section for Verified Personas */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Quick-Select Verified Personas
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Real DB Auth &middot; Contract C01</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Click any role to automatically authenticate with seeded credentials and establish an active server session:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {QUICK_PERSONAS.map((persona) => (
                <button
                  key={persona.email}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handlePersonaClick(persona)}
                  className="text-left p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 bg-slate-50/60 transition group cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900 group-hover:text-blue-700 transition">
                      {persona.title}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${persona.badgeColor}`}>
                      {persona.badge}
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-700">{persona.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">{persona.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-slate-400">
          Multi-Tenant Academic OS &bull; Offline-Capable &bull; Deterministic Evaluation
        </div>
      </div>
    </div>
  );
}
