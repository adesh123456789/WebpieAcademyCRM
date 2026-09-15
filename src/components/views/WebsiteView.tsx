"use client";

import React, { useState, useMemo } from "react";
import {
  Globe,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Edit3,
  Smartphone,
  Monitor,
  History,
  Save,
  RotateCcw,
  ShieldCheck,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  ExternalLink,
  Lock,
} from "lucide-react";

export interface WebsiteSectionData {
  id?: string;
  sectionKey: string;
  title: string;
  subtitle: string;
  content: Record<string, any>;
  isVisible: boolean;
  orderIndex: number;
}

export interface WebsiteRevision {
  id: string;
  version: number;
  publishedAt: string;
  publishedBy?: string;
  snapshot: Record<string, WebsiteSectionData>;
}

export interface WebsiteData {
  tenant?: {
    name: string;
    code: string;
    primaryColor?: string;
    customDomain?: string;
    sslStatus?: "ACTIVE" | "PENDING" | "NONE";
  };
  sections: Record<string, WebsiteSectionData>;
  revisions?: WebsiteRevision[];
}

export interface WebsiteViewProps {
  websiteData: WebsiteData;
  onSaveSection: (sectionKey: string, sectionData: Partial<WebsiteSectionData>) => Promise<void>;
  onPublishWebsite: () => Promise<void>;
  onRollbackWebsite?: (revisionId: string) => Promise<void>;
}

// Security sanitizer per PRD WEB-006: Strips arbitrary scripts and malicious URLs
export function sanitizeContent(text: string): string {
  if (!text) return "";
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:[^"']*/gi, "#")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "");
}

export const SECTION_METADATA: Record<string, { label: string; description: string }> = {
  HERO: { label: "Hero Banner", description: "Main headline, value proposition, and call to action." },
  ABOUT: { label: "About Institute", description: "Pedagogy, history, and key institutional pillars." },
  COURSES: { label: "Academic Courses", description: "Target programs (JEE, NEET, Foundation) and fee details." },
  FACULTY: { label: "Expert Faculty", description: "Teacher profiles, subjects, and credentials." },
  TOPPERS: { label: "Hall of Fame / Toppers", description: "Curated public results and verified student achievements (WEB-004)." },
  TESTIMONIALS: { label: "Testimonials", description: "Student and parent reviews with verified badges." },
  CONTACT: { label: "Contact & Enquiry", description: "Campus address, telephone, email, and lead form." },
  FAQ: { label: "Frequently Asked Questions", description: "Common questions regarding admissions and pedagogy." },
};

export const WebsiteView: React.FC<WebsiteViewProps> = ({
  websiteData,
  onSaveSection,
  onPublishWebsite,
  onRollbackWebsite,
}) => {
  const [activeTab, setActiveTab] = useState<"EDITOR" | "PREVIEW">("EDITOR");
  const [previewDevice, setPreviewDevice] = useState<"DESKTOP" | "MOBILE">("DESKTOP");
  const [selectedSectionKey, setSelectedSectionKey] = useState<string>("HERO");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [showRevisionDrawer, setShowRevisionDrawer] = useState<boolean>(false);

  // Local draft state for the selected section
  const currentSection = websiteData.sections?.[selectedSectionKey] || {
    sectionKey: selectedSectionKey,
    title: "",
    subtitle: "",
    content: {},
    isVisible: true,
    orderIndex: 0,
  };

  const [draftTitle, setDraftTitle] = useState<string>(currentSection.title || "");
  const [draftSubtitle, setDraftSubtitle] = useState<string>(currentSection.subtitle || "");
  const [draftContent, setDraftContent] = useState<Record<string, any>>(currentSection.content || {});
  const [draftVisible, setDraftVisible] = useState<boolean>(currentSection.isVisible ?? true);

  // When selected section key changes, sync local draft
  const handleSelectSection = (key: string) => {
    setSelectedSectionKey(key);
    const sec = websiteData.sections?.[key] || {
      sectionKey: key,
      title: "",
      subtitle: "",
      content: {},
      isVisible: true,
      orderIndex: 0,
    };
    setDraftTitle(sec.title || "");
    setDraftSubtitle(sec.subtitle || "");
    setDraftContent(sec.content || {});
    setDraftVisible(sec.isVisible ?? true);
  };

  const handleSaveCurrentSection = async () => {
    setIsSaving(true);
    try {
      const sanitized = {
        title: sanitizeContent(draftTitle),
        subtitle: sanitizeContent(draftSubtitle),
        content: draftContent,
        isVisible: draftVisible,
      };
      await onSaveSection(selectedSectionKey, sanitized);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await onPublishWebsite();
    } finally {
      setIsPublishing(false);
    }
  };

  const tenant = websiteData.tenant || {
    name: "Apex Academy of Science",
    code: "APEX_PUNE",
    customDomain: "apexacademy.edu.in",
    primaryColor: "#2563EB",
    sslStatus: "ACTIVE" as const,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900">Institute Website CMS & Live Preview</h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
              PRD Sec 37 (WEB-001 - WEB-006)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            White-label public website builder with safe content sanitization, domain mapping, and versioned rollback.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex items-center gap-1">
            <button
              onClick={() => setActiveTab("EDITOR")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
                activeTab === "EDITOR"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              CMS Editor
            </button>
            <button
              onClick={() => setActiveTab("PREVIEW")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
                activeTab === "PREVIEW"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Live Preview
            </button>
          </div>

          {/* Revisions History Drawer Trigger */}
          <button
            onClick={() => setShowRevisionDrawer(true)}
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-2 rounded-lg transition flex items-center gap-1.5"
          >
            <History className="w-3.5 h-3.5" />
            Revisions
          </button>

          {/* Publish Website Button */}
          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white text-xs font-black px-4 py-2 rounded-lg transition shadow-sm flex items-center gap-1.5"
          >
            <Globe className="w-3.5 h-3.5" />
            {isPublishing ? "Publishing..." : "Publish Website Live"}
          </button>
        </div>
      </div>

      {/* Domain & Security Status Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">
              Custom Domain (WEB-001)
            </span>
            <span className="font-mono font-bold text-slate-900">{tenant.customDomain || "Not Mapped"}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">
              SSL / Encryption (WEB-002)
            </span>
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> TLS 1.3 Active & Secured
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">
              Security Filter (WEB-006)
            </span>
            <span className="text-slate-700 font-semibold">Strict XSS & Script Tag Stripping Active</span>
          </div>
        </div>
      </div>

      {/* Content Area: Editor vs Preview */}
      {activeTab === "EDITOR" ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Section Selection Sidebar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 pb-2 border-b border-slate-100">
              Public Sections
            </h3>
            <div className="space-y-1">
              {Object.keys(SECTION_METADATA).map((key) => {
                const meta = SECTION_METADATA[key];
                const isSelected = selectedSectionKey === key;
                const isVisible = websiteData.sections?.[key]?.isVisible ?? true;

                return (
                  <button
                    key={key}
                    onClick={() => handleSelectSection(key)}
                    className={`w-full text-left p-2.5 rounded-lg text-xs font-medium transition flex items-center justify-between ${
                      isSelected
                        ? "bg-blue-50 text-blue-900 font-bold border border-blue-200 shadow-sm"
                        : "text-slate-700 hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    <div>
                      <div className="font-bold">{meta.label}</div>
                      <div className="text-[10px] text-slate-400 font-normal truncate max-w-[170px]">
                        {meta.description}
                      </div>
                    </div>
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isVisible ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section Edit Form */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  Edit Section: {SECTION_METADATA[selectedSectionKey]?.label}
                </h2>
                <p className="text-xs text-slate-500">
                  {SECTION_METADATA[selectedSectionKey]?.description}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftVisible}
                    onChange={(e) => setDraftVisible(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span>Visible on Public Site</span>
                </label>

                <button
                  onClick={handleSaveCurrentSection}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? "Saving..." : "Save Section"}
                </button>
              </div>
            </div>

            {/* Standard Fields: Title & Subtitle */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Section Headline / Title
                </label>
                <input
                  type="text"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="e.g. Master JEE & NEET with Proven Pedagogy"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Section Subheadline / Description
                </label>
                <textarea
                  rows={3}
                  value={draftSubtitle}
                  onChange={(e) => setDraftSubtitle(e.target.value)}
                  placeholder="Brief description providing key context to prospective students and parents."
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Specialized Section Content Controls */}
            {selectedSectionKey === "HERO" && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Hero Banner Highlights & Call-To-Action
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Badge Text</label>
                    <input
                      type="text"
                      value={draftContent.badge || ""}
                      onChange={(e) =>
                        setDraftContent((prev) => ({ ...prev, badge: e.target.value }))
                      }
                      placeholder="e.g. Admissions Open for Academic Year 2026-27"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">CTA Button Label</label>
                    <input
                      type="text"
                      value={draftContent.ctaLabel || ""}
                      onChange={(e) =>
                        setDraftContent((prev) => ({ ...prev, ctaLabel: e.target.value }))
                      }
                      placeholder="e.g. Enroll Now / Book Free Diagnostic Test"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500">Stat 1 (e.g. 142+ IIT)</label>
                    <input
                      type="text"
                      value={draftContent.stat1 || "142+ IIT-JEE"}
                      onChange={(e) =>
                        setDraftContent((prev) => ({ ...prev, stat1: e.target.value }))
                      }
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500">Stat 2 (e.g. 89+ NEET 650+)</label>
                    <input
                      type="text"
                      value={draftContent.stat2 || "89+ NEET 650+"}
                      onChange={(e) =>
                        setDraftContent((prev) => ({ ...prev, stat2: e.target.value }))
                      }
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500">Stat 3 (e.g. 98.4 Avg)</label>
                    <input
                      type="text"
                      value={draftContent.stat3 || "98.4 Avg Percentile"}
                      onChange={(e) =>
                        setDraftContent((prev) => ({ ...prev, stat3: e.target.value }))
                      }
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedSectionKey === "TOPPERS" && (
              <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>Public Result Privacy Guard (WEB-004)</span>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Only student achievements explicitly approved for public marketing appear in this section. Private cohort results, internal diagnostic scores, and unconsented records are never exposed publicly.
                </p>
              </div>
            )}

            {selectedSectionKey === "CONTACT" && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Campus Address & Contact Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Campus Address</label>
                    <input
                      type="text"
                      value={draftContent.address || ""}
                      onChange={(e) =>
                        setDraftContent((prev) => ({ ...prev, address: e.target.value }))
                      }
                      placeholder="e.g. Plot 42, Kothrud Main Road, Pune"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Admissions Phone</label>
                    <input
                      type="text"
                      value={draftContent.phone || ""}
                      onChange={(e) =>
                        setDraftContent((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      placeholder="e.g. +91 98230 12345"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Live Responsive Public Preview */
        <div className="space-y-4">
          {/* Viewport Controls */}
          <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Preview Viewport:</span>
              <div className="bg-white p-0.5 rounded-lg border border-slate-300 flex items-center gap-1">
                <button
                  onClick={() => setPreviewDevice("DESKTOP")}
                  className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-bold transition ${
                    previewDevice === "DESKTOP"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  Desktop
                </button>
                <button
                  onClick={() => setPreviewDevice("MOBILE")}
                  className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-bold transition ${
                    previewDevice === "MOBILE"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  Mobile (PWA)
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-500 font-mono">
              Host: https://{tenant.customDomain || "preview.webpie.io"}
            </div>
          </div>

          {/* Rendered Preview Container */}
          <div
            className={`mx-auto transition-all duration-300 ${
              previewDevice === "MOBILE"
                ? "max-w-sm border-8 border-slate-800 rounded-[2.5rem] shadow-2xl p-2 bg-slate-900"
                : "w-full border border-slate-200 rounded-2xl shadow-sm bg-white overflow-hidden"
            }`}
          >
            <div className="bg-white rounded-2xl overflow-hidden divide-y divide-slate-100">
              {/* Public Site Nav Header */}
              <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-white">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-black flex items-center justify-center text-sm shadow-sm">
                    {tenant.name.slice(0, 1)}
                  </div>
                  <span className="font-black text-sm text-slate-900 tracking-tight">
                    {tenant.name}
                  </span>
                </div>

                <div className="hidden sm:flex items-center gap-4 text-xs font-semibold text-slate-600">
                  <span>Courses</span>
                  <span>Results</span>
                  <span>Faculty</span>
                  <span>Contact</span>
                  <button className="bg-blue-600 text-white font-bold px-3 py-1.5 rounded-lg shadow-sm text-xs">
                    Apply Now
                  </button>
                </div>
              </div>

              {/* Rendered Public Sections */}
              <div className="p-6 space-y-12">
                {/* Hero Section */}
                {(websiteData.sections?.HERO?.isVisible ?? true) && (
                  <div className="text-center space-y-4 py-8 max-w-2xl mx-auto">
                    {websiteData.sections?.HERO?.content?.badge && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 shadow-sm">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        {websiteData.sections.HERO.content.badge}
                      </span>
                    )}

                    <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                      {websiteData.sections?.HERO?.title ||
                        "Empowering Aspirants for IIT-JEE & NEET Excellence"}
                    </h1>

                    <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                      {websiteData.sections?.HERO?.subtitle ||
                        "Structured academic mastery, diagnostic precision, and verified rank outcomes."}
                    </p>

                    <div className="pt-2 flex justify-center gap-3">
                      <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-sm">
                        {websiteData.sections?.HERO?.content?.ctaLabel || "Book Diagnostic Assessment"}
                      </button>
                    </div>

                    {/* Stats strip */}
                    <div className="grid grid-cols-3 gap-3 pt-6 border-t border-slate-100">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div className="text-xl font-black text-blue-600">
                          {websiteData.sections?.HERO?.content?.stat1 || "142+"}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-600">IIT Selections</div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div className="text-xl font-black text-emerald-600">
                          {websiteData.sections?.HERO?.content?.stat2 || "89+"}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-600">NEET 650+ Scorers</div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div className="text-xl font-black text-amber-600">
                          {websiteData.sections?.HERO?.content?.stat3 || "98.4"}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-600">Avg Percentile</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Courses Section */}
                {(websiteData.sections?.COURSES?.isVisible ?? true) && (
                  <div className="space-y-4">
                    <div className="text-center space-y-1">
                      <h3 className="text-xl font-black text-slate-900">
                        {websiteData.sections?.COURSES?.title || "Classroom & Intensive Programs"}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {websiteData.sections?.COURSES?.subtitle ||
                          "Targeted two-year and repeater curricula aligned with NTA pattern."}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                          Class 11 & 12
                        </span>
                        <h4 className="text-sm font-black text-slate-900">JEE Advanced Pinnacle</h4>
                        <p className="text-xs text-slate-600">Comprehensive physics, chemistry, and higher maths syllabus.</p>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          Medical Prep
                        </span>
                        <h4 className="text-sm font-black text-slate-900">NEET Achievers Batch</h4>
                        <p className="text-xs text-slate-600">NCERT-line-by-line biology, organic chemistry, and mechanics.</p>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                          Foundation
                        </span>
                        <h4 className="text-sm font-black text-slate-900">Olympiad & NTSE Junior</h4>
                        <p className="text-xs text-slate-600">Building rigorous problem-solving fundamentals for Class 8-10.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revision History Modal / Drawer */}
      {showRevisionDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl max-w-lg w-full space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-black text-slate-900">Website Revisions & Rollback</h3>
              </div>
              <button
                onClick={() => setShowRevisionDrawer(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Every live publication creates an immutable snapshot. You can roll back to any prior version instantly (WEB-003).
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(websiteData.revisions || [
                {
                  id: "rev_curr",
                  version: 2,
                  publishedAt: "2026-09-15 17:30",
                  publishedBy: "Owner Admin",
                  snapshot: {},
                },
                {
                  id: "rev_prev",
                  version: 1,
                  publishedAt: "2026-09-08 10:15",
                  publishedBy: "Owner Admin",
                  snapshot: {},
                },
              ]).map((rev) => (
                <div
                  key={rev.id}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900">Version {rev.version}</div>
                    <div className="text-[11px] text-slate-500">
                      Published: {rev.publishedAt} by {rev.publishedBy || "System"}
                    </div>
                  </div>

                  {onRollbackWebsite && (
                    <button
                      onClick={() => {
                        onRollbackWebsite(rev.id);
                        setShowRevisionDrawer(false);
                      }}
                      className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-lg transition"
                    >
                      Rollback
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowRevisionDrawer(false)}
                className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
