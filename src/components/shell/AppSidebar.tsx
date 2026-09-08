"use client";

import React from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  UserPlus,
  FileText,
  ScanLine,
  Award,
  Layers,
  GraduationCap,
  CalendarCheck,
  CreditCard,
  Globe,
  BookOpen,
  PhoneCall,
  Activity,
  Receipt,
  Cpu,
  ShieldAlert,
  Compass,
  FileEdit,
  LineChart,
  Clock,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { UserRole, ROLE_NAVIGATION_CONFIG } from "@/lib/permissions";

interface AppSidebarProps {
  currentRole: UserRole;
  activeTab: string;
  onSelectTab: (tabId: string) => void;
}

export function AppSidebar({
  currentRole,
  activeTab,
  onSelectTab,
}: AppSidebarProps) {
  const roleConfig = ROLE_NAVIGATION_CONFIG[currentRole] || ROLE_NAVIGATION_CONFIG.OWNER;

  const renderNavIcon = (iconName: string) => {
    const props = { className: "w-4 h-4" };
    switch (iconName) {
      case "LayoutDashboard": return <LayoutDashboard {...props} />;
      case "Building2": return <Building2 {...props} />;
      case "Users": return <Users {...props} />;
      case "UserPlus": return <UserPlus {...props} />;
      case "FileText": return <FileText {...props} />;
      case "ScanLine": return <ScanLine {...props} />;
      case "Award": return <Award {...props} />;
      case "Layers": return <Layers {...props} />;
      case "GraduationCap": return <GraduationCap {...props} />;
      case "CalendarCheck": return <CalendarCheck {...props} />;
      case "CreditCard": return <CreditCard {...props} />;
      case "Globe": return <Globe {...props} />;
      case "BookOpen": return <BookOpen {...props} />;
      case "PhoneCall": return <PhoneCall {...props} />;
      case "Activity": return <Activity {...props} />;
      case "Receipt": return <Receipt {...props} />;
      case "Cpu": return <Cpu {...props} />;
      case "ShieldAlert": return <ShieldAlert {...props} />;
      case "Compass": return <Compass {...props} />;
      case "FileEdit": return <FileEdit {...props} />;
      case "LineChart": return <LineChart {...props} />;
      case "Clock": return <Clock {...props} />;
      case "Share2": return <Share2 {...props} />;
      default: return <BookOpen {...props} />;
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col p-3 gap-1 overflow-y-auto shrink-0 shadow-sm">
      {/* Role Header Banner */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg mb-2">
        <div className="text-[11px] uppercase font-bold tracking-wider text-blue-700 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          {roleConfig.title}
        </div>
        <div className="text-[11px] text-slate-500 mt-0.5 font-medium leading-tight">
          {roleConfig.subtitle}
        </div>
      </div>

      <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase px-3 py-1.5">
        Navigation
      </div>

      {/* Render ONLY items allowed for this role */}
      {roleConfig.navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelectTab(item.id)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === item.id
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {renderNavIcon(item.icon)}
            <span>{item.label}</span>
          </div>
          {item.badge && (
            <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold">
              {item.badge}
            </span>
          )}
        </button>
      ))}

      {/* Quick Context Switcher for Individual Teacher Mode Notice */}
      {currentRole === "INDIVIDUAL_TEACHER" && (
        <div className="mt-auto p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 leading-relaxed">
          <span className="font-bold block text-[11px] uppercase tracking-wide text-emerald-900 mb-1">
            Independent Mode
          </span>
          All job roles (Tests, Grading, Fees, Attendance, WhatsApp) unified into a single streamlined cockpit.
        </div>
      )}
    </aside>
  );
}
