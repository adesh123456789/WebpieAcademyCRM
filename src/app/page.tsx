"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Users,
  FileText,
  ScanLine,
  BarChart3,
  Award,
  Layers,
  GraduationCap,
  CalendarCheck,
  CreditCard,
  Building,
  Globe,
  Bot,
  AlertTriangle,
  CheckCircle2,
  Download,
  Plus,
  ArrowRight,
  Filter,
  Search,
  Sparkles,
  ShieldCheck,
  Clock,
  Printer,
  Share2,
  ExternalLink,
  ChevronRight,
  X,
  UserCheck,
} from "lucide-react";

export default function WebPieAcademicOS() {
  // Navigation & Scoping State
  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "students"
    | "curriculum"
    | "questions"
    | "exams"
    | "omr"
    | "analytics"
    | "interventions"
    | "cbt"
    | "crm"
    | "fees"
    | "attendance"
    | "website"
    | "parent"
    | "superadmin"
  >("dashboard");

  const [currentRole, setCurrentRole] = useState<string>("OWNER");
  const [currentTenant, setCurrentTenant] = useState<string>("APEX_PUNE");
  const [currentBranch, setCurrentBranch] = useState<string>("Kothrud Campus");

  // Super Admin & Auth State
  const [tenantsList, setTenantsList] = useState<any[]>([]);
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "", error: "" });
  const [provisionForm, setProvisionForm] = useState({
    name: "",
    code: "",
    type: "INSTITUTE",
    planId: "PRO_INSTITUTE",
    city: "Pune",
    address: "",
    ownerName: "",
    ownerEmail: "",
    ownerPassword: "admin123",
    ownerPhone: "",
    primaryExam: "JEE_MAIN",
  });

  // Data State
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState<boolean>(false);
  const [student360Data, setStudent360Data] = useState<any>(null);

  const [questions, setQuestions] = useState<any[]>([]);
  const [curriculumNodes, setCurriculumNodes] = useState<any[]>([]);
  const [selectedExamType, setSelectedExamType] = useState<string>("JEE_MAIN");

  const [exams, setExams] = useState<any[]>([]);
  const [selectedExamForArtifacts, setSelectedExamForArtifacts] = useState<any>(null);
  const [artifactModalData, setArtifactModalData] = useState<any>(null);

  const [omrJobs, setOmrJobs] = useState<any[]>([]);
  const [selectedOmrJob, setSelectedOmrJob] = useState<any>(null);
  const [overrideModal, setOverrideModal] = useState<{ scanId: string; qNum: number; detected: string } | null>(null);
  const [overrideChoice, setOverrideChoice] = useState<string>("A");

  const [interventions, setInterventions] = useState<any[]>([]);
  const [detectedWeakQueue, setDetectedWeakQueue] = useState<any[]>([]);

  const [cbtState, setCbtState] = useState<{
    inExam: boolean;
    currentQIdx: number;
    questions: any[];
    responses: Record<string, string>;
    markedForReview: string[];
    timeLeft: number;
    submitted: boolean;
    result: any;
  }>({
    inExam: false,
    currentQIdx: 0,
    questions: [],
    responses: {},
    markedForReview: [],
    timeLeft: 3600,
    submitted: false,
    result: null,
  });

  const [crmLeads, setCrmLeads] = useState<any[]>([]);
  const [feesData, setFeesData] = useState<any>(null);
  const [parentReport, setParentReport] = useState<any>(null);
  const [parentLang, setParentLang] = useState<"en" | "hi" | "mr">("en");
  const [websiteData, setWebsiteData] = useState<any>(null);

  const [aiPrompting, setAiPrompting] = useState<boolean>(false);
  const [aiCandidates, setAiCandidates] = useState<any[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Initial Load
  useEffect(() => {
    loadStudents();
    loadCurriculum();
    loadQuestions();
    loadExams();
    loadOmrJobs();
    loadInterventions();
    loadCRM();
    loadFees();
    loadWebsite();
    loadParentPortal("260001", parentLang);
    loadTenants();
  }, []);

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // -------------------------------------------------------------
  // API LOADERS & AUTH HANDLERS
  // -------------------------------------------------------------
  async function loadTenants() {
    try {
      const res = await fetch("/api/v1/admin/tenants");
      if (res.ok) {
        const data = await res.json();
        setTenantsList(data.tenants || []);
      }
    } catch (e) {
      console.error("Failed to load tenants:", e);
    }
  }

  async function handleDirectLogin(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setLoginForm((prev) => ({ ...prev, error: "" }));
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginForm.email,
          password: loginForm.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginForm((prev) => ({ ...prev, error: data.error || "Login failed" }));
        return;
      }

      setCurrentRole(data.user.role);
      setCurrentTenant(data.user.tenantCode);
      setCurrentBranch(data.user.branchName);
      setIsLoginModalOpen(false);
      showToast(`Logged in successfully as ${data.user.name} (${data.user.role})!`);
      if (data.user.role === "WEBPIE_ADMIN") {
        setActiveTab("superadmin");
      }
    } catch (err: any) {
      setLoginForm((prev) => ({ ...prev, error: err.message || "Network error" }));
    }
  }

  async function handleProvisionInstitute(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/v1/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(provisionForm),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(`Provisioning error: ${data.error}`);
        return;
      }

      showToast(`Institute '${data.tenant.name}' provisioned with Owner ${data.owner.email}!`);
      setIsProvisionModalOpen(false);
      loadTenants();
      // Reset form
      setProvisionForm({
        name: "",
        code: "",
        type: "INSTITUTE",
        planId: "PRO_INSTITUTE",
        city: "Pune",
        address: "",
        ownerName: "",
        ownerEmail: "",
        ownerPassword: "admin123",
        ownerPhone: "",
        primaryExam: "JEE_MAIN",
      });
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  }
  async function loadStudents() {
    try {
      const res = await fetch("/api/v1/students");
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function openStudent360(id: string) {
    try {
      const res = await fetch(`/api/v1/students/${id}/360`);
      if (res.ok) {
        const data = await res.json();
        setStudent360Data(data.student);
        setIsStudentModalOpen(true);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function loadCurriculum() {
    try {
      const res = await fetch(`/api/v1/curriculum/nodes?examType=${selectedExamType}`);
      if (res.ok) {
        const data = await res.json();
        setCurriculumNodes(data.nodes || []);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function loadQuestions() {
    try {
      const res = await fetch("/api/v1/questions");
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function loadExams() {
    try {
      const res = await fetch("/api/v1/exams");
      if (res.ok) {
        const data = await res.json();
        setExams(data.exams || []);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function loadOmrJobs() {
    try {
      const res = await fetch("/api/v1/omr/jobs");
      if (res.ok) {
        const data = await res.json();
        setOmrJobs(data.jobs || []);
        if (data.jobs && data.jobs.length > 0) {
          setSelectedOmrJob(data.jobs[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function loadInterventions() {
    try {
      const res = await fetch("/api/v1/interventions");
      if (res.ok) {
        const data = await res.json();
        setInterventions(data.interventions || []);
        setDetectedWeakQueue(data.detectedQueue || []);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function loadCRM() {
    try {
      const res = await fetch("/api/v1/crm/leads");
      if (res.ok) {
        const data = await res.json();
        setCrmLeads(data.leads || []);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function loadFees() {
    try {
      const res = await fetch("/api/v1/fees");
      if (res.ok) {
        const data = await res.json();
        setFeesData(data);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function loadWebsite() {
    try {
      const res = await fetch("/api/v1/website");
      if (res.ok) {
        const data = await res.json();
        setWebsiteData(data);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function loadParentPortal(roll: string, lang: "en" | "hi" | "mr") {
    try {
      const res = await fetch(`/api/v1/parent/portal?roll=${roll}&lang=${lang}`);
      if (res.ok) {
        const data = await res.json();
        setParentReport(data);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // -------------------------------------------------------------
  // ACTIONS & WORKFLOWS
  // -------------------------------------------------------------
  async function triggerAiGeneration() {
    setAiPrompting(true);
    try {
      const res = await fetch("/api/v1/questions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examType: selectedExamType,
          subject: "PHYSICS",
          chapter: "Laws of Motion",
          concept: "Limiting Friction & Angle of Repose",
          difficulty: "MEDIUM",
          count: 2,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiCandidates(data.candidates || []);
        showToast("Generated 2 verified candidate questions via AI Gateway!");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiPrompting(false);
    }
  }

  async function fetchArtifact(examId: string, type: "omr" | "question_paper" | "answer_key") {
    try {
      const res = await fetch(`/api/v1/exams/${examId}/artifacts?type=${type}`);
      if (res.ok) {
        const data = await res.json();
        setArtifactModalData(data);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function runSimulatedOmrScan() {
    if (exams.length === 0) return;
    try {
      const res = await fetch("/api/v1/omr/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: exams[0].id,
          batchId: "RB-2026-A",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        showToast("OMR scan batch processed! Flagged 1 ambiguous sheet for review.");
        loadOmrJobs();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleOverrideSubmit() {
    if (!overrideModal) return;
    try {
      const res = await fetch(`/api/v1/omr/responses/${overrideModal.scanId}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionNumber: overrideModal.qNum,
          newResponse: overrideChoice,
          reason: "Teacher verified visual bubble density",
        }),
      });
      if (res.ok) {
        showToast(`Question ${overrideModal.qNum} response successfully overridden to Option ${overrideChoice}!`);
        setOverrideModal(null);
        loadOmrJobs();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function finalizeOmrJob(jobId: string) {
    try {
      const res = await fetch(`/api/v1/omr/jobs/${jobId}/finalize`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`Evaluation Complete! Evaluated ${data.evaluatedCount} students with ranks & percentiles.`);
        loadOmrJobs();
        loadInterventions();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function downloadRemedialWorksheet(interventionId: string) {
    try {
      const res = await fetch(`/api/v1/interventions/${interventionId}/worksheet`);
      if (res.ok) {
        const data = await res.json();
        // Create download link
        const a = document.createElement("a");
        a.href = data.dataUri;
        a.download = data.filename;
        a.click();
        showToast("Printable Remedial Worksheet PDF downloaded!");
      }
    } catch (e) {
      console.error(e);
    }
  }

  // CBT Exam Simulation
  async function startCbtSimulation() {
    if (exams.length === 0) return;
    try {
      const res = await fetch("/api/v1/cbt/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId: exams[0].id }),
      });
      if (res.ok) {
        const data = await res.json();
        setCbtState({
          inExam: true,
          currentQIdx: 0,
          questions: data.questions,
          responses: data.responses,
          markedForReview: data.markedForReview,
          timeLeft: data.durationMinutes * 60,
          submitted: false,
          result: null,
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function submitCbtSimulation() {
    try {
      const res = await fetch("/api/v1/cbt/attempts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: "dummy-cbt-1",
          responses: cbtState.responses,
          isFinalSubmit: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCbtState((prev) => ({
          ...prev,
          submitted: true,
          result: data.result,
        }));
        showToast("CBT Exam submitted and evaluated deterministically!");
      }
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Toast Alert */}
      {statusMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-medium">{statusMessage}</span>
        </div>
      )}

      {/* TOP HEADER & SCOPING BAR */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-lg text-white shadow-md shadow-blue-500/20">
              W
            </div>
            <div>
              <div className="font-bold text-base text-white tracking-wide flex items-center gap-2">
                WebPie Academic OS
                <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-mono">
                  v2.0-PROD
                </span>
              </div>
              <div className="text-xs text-slate-400">Offline-First Academic Intelligence</div>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-slate-800 mx-2" />

          {/* Tenant & Branch Mode Selector */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1">
            <Building className="w-4 h-4 text-blue-400 ml-2" />
            <select
              value={currentTenant}
              onChange={(e) => {
                setCurrentTenant(e.target.value);
                if (e.target.value === "DESHMUKH_PHYSICS") {
                  setCurrentBranch("Main Classroom");
                  showToast("Switched to Individual Teacher Mode: Prof. Deshmukh Physics");
                } else {
                  setCurrentBranch("Kothrud Campus");
                  showToast("Switched to Full Institute Mode: Apex IIT-JEE & NEET Academy");
                }
              }}
              className="bg-transparent text-xs text-slate-200 focus:outline-none pr-2 font-medium"
            >
              <option value="APEX_PUNE" className="bg-slate-900">
                Apex IIT-JEE & NEET Academy (Institute Mode)
              </option>
              <option value="DESHMUKH_PHYSICS" className="bg-slate-900">
                Prof. Deshmukh Physics (Teacher Mode)
              </option>
            </select>
          </div>

          {currentTenant === "APEX_PUNE" && (
            <select
              value={currentBranch}
              onChange={(e) => setCurrentBranch(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 px-3 py-1.5 focus:outline-none"
            >
              <option value="Kothrud Campus">Branch: Kothrud Main Campus</option>
              <option value="Camp Campus">Branch: Camp City Centre</option>
            </select>
          )}
        </div>

        {/* Role Switcher & System Telemetry */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Academic Node: Local (Port 5432)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Viewing as:</span>
            <select
              value={currentRole}
              onChange={(e) => {
                setCurrentRole(e.target.value);
                if (e.target.value === "WEBPIE_ADMIN") {
                  setActiveTab("superadmin");
                }
                showToast(`Role switched to ${e.target.value}`);
              }}
              className="bg-blue-950/80 border border-blue-800/80 text-blue-300 text-xs font-semibold px-3 py-1.5 rounded-lg focus:outline-none"
            >
              <option value="WEBPIE_ADMIN">Super Admin (WebPie HQ)</option>
              <option value="OWNER">Institute Owner</option>
              <option value="TEACHER">Teacher (Prof. Kulkarni)</option>
              <option value="COUNSELLOR">Admissions Counsellor</option>
              <option value="ACCOUNTANT">Accountant</option>
              <option value="STUDENT">Student (Aarav Deshmukh)</option>
              <option value="PARENT">Parent Portal View</option>
            </select>

            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-700 transition"
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
              Direct Login
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-64 bg-slate-950/60 border-r border-slate-800/80 flex flex-col p-3 gap-1 overflow-y-auto">
          <div className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase px-3 py-2">
            Core Assessment Wedge
          </div>

          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === "dashboard"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Executive Dashboard
          </button>

          <button
            onClick={() => setActiveTab("students")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === "students"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Users className="w-4 h-4" />
            Students & Student 360
          </button>

          <button
            onClick={() => setActiveTab("curriculum")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === "curriculum"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Layers className="w-4 h-4" />
            Academic Knowledge Graph
          </button>

          <button
            onClick={() => setActiveTab("questions")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === "questions"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Question Bank & AI
          </button>

          <button
            onClick={() => setActiveTab("exams")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === "exams"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <FileText className="w-4 h-4" />
            Exam Builder & Printables
          </button>

          <button
            onClick={() => setActiveTab("omr")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === "omr"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <ScanLine className="w-4 h-4" />
            OMR Computer Vision
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === "analytics"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Award className="w-4 h-4" />
            Scoring & Rank Analytics
          </button>

          <button
            onClick={() => setActiveTab("interventions")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === "interventions"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Intervention Workspace
          </button>

          <button
            onClick={() => setActiveTab("cbt")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === "cbt"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Clock className="w-4 h-4" />
            CBT Online Simulator
          </button>

          <div className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase px-3 py-2 mt-2">
            Operations & Portals
          </div>

          <button
            onClick={() => setActiveTab("crm")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === "crm"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Users className="w-4 h-4" />
            Admissions CRM Pipeline
          </button>

          <button
            onClick={() => setActiveTab("fees")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === "fees"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Fees & Receipts
          </button>

          <button
            onClick={() => setActiveTab("attendance")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === "attendance"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            Attendance Sessions
          </button>

          <button
            onClick={() => setActiveTab("website")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === "website"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Globe className="w-4 h-4" />
            Institute Website CMS
          </button>

          <button
            onClick={() => setActiveTab("parent")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === "parent"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Share2 className="w-4 h-4" />
            Multilingual Parent Portal
          </button>

          <div className="text-[11px] font-semibold tracking-wider text-indigo-400 uppercase px-3 py-2 mt-2">
            Platform Operations
          </div>

          <button
            onClick={() => {
              setActiveTab("superadmin");
              setCurrentRole("WEBPIE_ADMIN");
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === "superadmin"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-semibold"
                : "text-indigo-400 hover:text-indigo-200 hover:bg-slate-900"
            }`}
          >
            <Building className="w-4 h-4" />
            Super Admin Hub
          </button>
        </aside>

        {/* WORKSPACE CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-900">
          {/* 1. DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Executive Academic Command</h1>
                  <p className="text-sm text-slate-400">
                    Real-time assessment intelligence, student mastery states, and active remedial sprints.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => runSimulatedOmrScan()}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-md shadow-blue-600/20"
                  >
                    <ScanLine className="w-4 h-4" />
                    Process Physical OMR Batch
                  </button>
                  <button
                    onClick={() => setActiveTab("exams")}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-4 py-2 rounded-lg border border-slate-700 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Create New Exam
                  </button>
                </div>
              </div>

              {/* KPI CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-950/70 border border-slate-800/80 p-5 rounded-xl">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-medium uppercase tracking-wider">Enrolled Students</span>
                    <Users className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-3xl font-bold text-white">{students.length}</div>
                  <div className="text-xs text-emerald-400 mt-1">100% active in Batch 2026-A</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800/80 p-5 rounded-xl">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-medium uppercase tracking-wider">Tests Evaluated</span>
                    <FileText className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="text-3xl font-bold text-white">{exams.length}</div>
                  <div className="text-xs text-blue-400 mt-1">Latest: JEE Main Mock #01</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800/80 p-5 rounded-xl">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-medium uppercase tracking-wider">Critical Weak Concepts</span>
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="text-3xl font-bold text-rose-400">{detectedWeakQueue.length}</div>
                  <div className="text-xs text-slate-400 mt-1">Limiting Friction & Repose Angle</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800/80 p-5 rounded-xl">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-medium uppercase tracking-wider">Active Interventions</span>
                    <GraduationCap className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-3xl font-bold text-white">{interventions.length}</div>
                  <div className="text-xs text-emerald-400 mt-1">3 students in remedial ladder</div>
                </div>
              </div>

              {/* CRITICAL ACTION ALERT BANNER */}
              {detectedWeakQueue.length > 0 && (
                <div className="bg-gradient-to-r from-rose-950/60 to-slate-950 border border-rose-800/50 p-5 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        Academic Vulnerability Detected in Batch 2026-A
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {detectedWeakQueue[0].students.length} students scored below 30% in{" "}
                        <span className="font-semibold text-rose-300">{detectedWeakQueue[0].concept}</span>.
                        Remedial practice ladder and printable worksheet ready.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("interventions")}
                    className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium px-4 py-2 rounded-lg transition"
                  >
                    Open Intervention Workspace
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* CORE LOOP VISUALIZER */}
              <div className="bg-slate-950/70 border border-slate-800/80 p-6 rounded-xl">
                <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  WebPie Closed-Loop Assessment Architecture (PRD Sec 1.3)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-center text-xs">
                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 mx-auto flex items-center justify-center font-bold mb-1">
                      1
                    </div>
                    <div className="font-semibold text-slate-200">Measure</div>
                    <div className="text-[11px] text-slate-400 mt-1">Printed OMR / CBT Test</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 mx-auto flex items-center justify-center font-bold mb-1">
                      2
                    </div>
                    <div className="font-semibold text-slate-200">Diagnose</div>
                    <div className="text-[11px] text-slate-400 mt-1">Deterministic Mastery</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 mx-auto flex items-center justify-center font-bold mb-1">
                      3
                    </div>
                    <div className="font-semibold text-slate-200">Prescribe</div>
                    <div className="text-[11px] text-slate-400 mt-1">Targeted Ladder PDF</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 mx-auto flex items-center justify-center font-bold mb-1">
                      4
                    </div>
                    <div className="font-semibold text-slate-200">Practice</div>
                    <div className="text-[11px] text-slate-400 mt-1">Remedial Worksheets</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 mx-auto flex items-center justify-center font-bold mb-1">
                      5
                    </div>
                    <div className="font-semibold text-slate-200">Verify</div>
                    <div className="text-[11px] text-slate-400 mt-1">Mini Re-Test</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 mx-auto flex items-center justify-center font-bold mb-1">
                      6
                    </div>
                    <div className="font-semibold text-slate-200">Communicate</div>
                    <div className="text-[11px] text-slate-400 mt-1">WhatsApp / Portal</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. STUDENTS & STUDENT 360 */}
          {activeTab === "students" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Student Directory & Longitudinal Records</h2>
                  <p className="text-xs text-slate-400">Click any student to view their complete Student 360 profile.</p>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search name, roll no, phone..."
                      className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 pl-9 pr-3 py-2 focus:outline-none w-64"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3">Roll No</th>
                      <th className="px-5 py-3">Student Name</th>
                      <th className="px-5 py-3">Target Exam</th>
                      <th className="px-5 py-3">Branch</th>
                      <th className="px-5 py-3">Parent Contact</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {students.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-900/40 transition">
                        <td className="px-5 py-3 font-mono font-semibold text-blue-400">{s.rollNumber}</td>
                        <td className="px-5 py-3 font-medium text-white">{s.name}</td>
                        <td className="px-5 py-3">
                          <span className="bg-blue-950/80 text-blue-300 border border-blue-800/80 px-2 py-0.5 rounded text-[11px] font-medium">
                            {s.targetExam}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-400">{s.branch?.name || "Main"}</td>
                        <td className="px-5 py-3 text-slate-400">
                          {s.parentLinks?.[0]?.parent?.phone || s.phone || "—"}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => openStudent360(s.id)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded border border-slate-700 transition"
                          >
                            View Student 360
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. ACADEMIC KNOWLEDGE GRAPH */}
          {activeTab === "curriculum" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Academic Knowledge Graph (AKG)</h2>
                  <p className="text-xs text-slate-400">
                    Hierarchical curriculum taxonomy for JEE Main, JEE Advanced, NEET, and MHT-CET.
                  </p>
                </div>
                <div className="flex gap-2">
                  <select
                    value={selectedExamType}
                    onChange={(e) => {
                      setSelectedExamType(e.target.value);
                      loadCurriculum();
                    }}
                    className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 px-3 py-2 focus:outline-none"
                  >
                    <option value="JEE_MAIN">JEE Main & Advanced</option>
                    <option value="NEET">NEET (UG)</option>
                    <option value="MHT_CET">MHT-CET</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {curriculumNodes.map((n) => (
                  <div
                    key={n.id}
                    className="bg-slate-950/70 border border-slate-800/80 p-5 rounded-xl hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-semibold text-blue-400 bg-blue-950/60 border border-blue-900/60 px-2 py-0.5 rounded">
                        {n.code}
                      </span>
                      <span className="text-[11px] text-slate-400">Class {n.classLevel} • {n.subject}</span>
                    </div>
                    <h3 className="font-semibold text-white text-sm mb-1">{n.name}</h3>
                    <div className="text-xs text-slate-400 space-y-1 mb-3">
                      <div>
                        <span className="text-slate-500">Unit:</span> {n.unit} → {n.chapter}
                      </div>
                      <div>
                        <span className="text-slate-500">Mastery Concept:</span>{" "}
                        <span className="text-amber-300 font-medium">{n.concept}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Target Skill:</span> {n.skill}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
                      <span>Exam Weight: {n.weightage}x</span>
                      <span className="text-emerald-400">Platform Verified</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. QUESTION BANK & AI GENERATOR */}
          {activeTab === "questions" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Question Bank & AI Copilot Ingestion</h2>
                  <p className="text-xs text-slate-400">
                    High-stakes questions with verified LaTeX math and solutions.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={triggerAiGeneration}
                    disabled={aiPrompting}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-md shadow-blue-500/20 disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    {aiPrompting ? "Generating via AI Gateway..." : "AI Candidate Question Generator"}
                  </button>
                </div>
              </div>

              {/* AI Generated Candidates Review Queue */}
              {aiCandidates.length > 0 && (
                <div className="bg-indigo-950/40 border border-indigo-800/60 p-5 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-300 font-semibold text-sm">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      AI Generated Candidates (Awaiting Teacher Approval - PRD AI-004)
                    </div>
                    <span className="text-xs text-indigo-400 font-mono">
                      Provider: {aiCandidates[0]?.provenance?.provider}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {aiCandidates.map((cand, idx) => (
                      <div key={idx} className="bg-slate-900 border border-indigo-900/60 p-4 rounded-lg space-y-2 text-xs">
                        <div className="font-semibold text-slate-200">{cand.body}</div>
                        <div className="grid grid-cols-2 gap-1 text-slate-300">
                          {cand.options.map((opt: any) => (
                            <div key={opt.id} className="bg-slate-950/80 p-2 rounded border border-slate-800">
                              <span className="font-bold text-blue-400">({opt.id})</span> {opt.text}
                            </div>
                          ))}
                        </div>
                        <div className="pt-2 border-t border-slate-800 text-emerald-400">
                          <span className="font-semibold">Answer:</span> Option {cand.correctAnswer}
                        </div>
                        <div className="text-slate-400 text-[11px]">{cand.solution}</div>
                        <div className="flex justify-end pt-2">
                          <button
                            onClick={() => {
                              showToast("Candidate question approved and added to Question Bank!");
                              setAiCandidates(aiCandidates.filter((_, i) => i !== idx));
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1 rounded font-medium transition"
                          >
                            Approve Candidate
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Verified Questions List */}
              <div className="space-y-4">
                {questions.map((q) => (
                  <div key={q.id} className="bg-slate-950/70 border border-slate-800/80 p-5 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-900">
                          {q.code}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {q.subject} • {q.chapter}
                        </span>
                      </div>
                      <span className="text-[11px] bg-amber-950/80 text-amber-300 border border-amber-800/80 px-2 py-0.5 rounded font-medium">
                        Difficulty: {q.declaredDifficulty}
                      </span>
                    </div>

                    <p className="text-sm text-slate-100 font-medium">{q.body}</p>

                    {q.options && q.options.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        {q.options.map((opt: any) => (
                          <div
                            key={opt.id}
                            className={`p-2.5 rounded-lg border ${
                              opt.id === q.correctAnswer
                                ? "bg-emerald-950/40 border-emerald-800 text-emerald-300 font-semibold"
                                : "bg-slate-900 border-slate-800 text-slate-300"
                            }`}
                          >
                            <span className="font-bold mr-2">({opt.id})</span> {opt.text}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="bg-slate-900/90 border border-slate-800/90 p-3 rounded-lg text-xs space-y-1">
                      <div className="font-semibold text-emerald-400">
                        Correct Answer: {q.correctAnswer}
                      </div>
                      <div className="text-slate-400">{q.solution}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. EXAM BUILDER & PRINTABLES */}
          {activeTab === "exams" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Exam Builder & Printable Artifacts</h2>
                  <p className="text-xs text-slate-400">
                    Generate branded Question Paper PDFs, fiducial 4-corner OMR Sheets, and Answer Keys.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {exams.map((ex) => (
                  <div key={ex.id} className="bg-slate-950/70 border border-slate-800/80 p-5 rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-blue-400">{ex.code}</span>
                      <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 text-[11px] px-2 py-0.5 rounded font-medium">
                        {ex.status}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white">{ex.title}</h3>
                      <div className="text-xs text-slate-400 mt-1">
                        Exam: {ex.examType} | Duration: {ex.durationMinutes} mins | Total Marks: {ex.totalMarks}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-2">
                      <button
                        onClick={() => fetchArtifact(ex.id, "omr")}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition"
                      >
                        <ScanLine className="w-3.5 h-3.5" />
                        Print OMR Sheet PDF
                      </button>

                      <button
                        onClick={() => fetchArtifact(ex.id, "question_paper")}
                        className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-700 transition"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print Question Paper PDF
                      </button>

                      <button
                        onClick={() => fetchArtifact(ex.id, "answer_key")}
                        className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-700 transition"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Answer Key
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. OMR PROCESSING & AMBIGUITY REVIEW */}
          {activeTab === "omr" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">OMR Computer Vision Pipeline</h2>
                  <p className="text-xs text-slate-400">
                    High-speed bubble recognition, fiducial alignment, and teacher ambiguity review queue.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => runSimulatedOmrScan()}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                  >
                    <Plus className="w-4 h-4" />
                    Ingest Physical Sheet Batch
                  </button>
                </div>
              </div>

              {selectedOmrJob && (
                <div className="bg-slate-950/70 border border-slate-800/80 p-5 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white text-sm">Batch Job #{selectedOmrJob.id.substring(0, 8)}</h3>
                      <div className="text-xs text-slate-400">
                        Exam: {selectedOmrJob.exam?.title} | Status:{" "}
                        <span className="font-semibold text-amber-400">{selectedOmrJob.status}</span>
                      </div>
                    </div>
                    {selectedOmrJob.status !== "FINALIZED" && (
                      <button
                        onClick={() => finalizeOmrJob(selectedOmrJob.id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-md shadow-emerald-600/20"
                      >
                        Finalize & Run Evaluation Engine
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedOmrJob.scans?.map((scan: any, sIdx: number) => {
                      const ambiguities = JSON.parse(scan.ambiguityFlags || "[]");
                      const responses = JSON.parse(scan.verifiedResponses || scan.detectedResponses || "{}");

                      return (
                        <div
                          key={scan.id}
                          className={`bg-slate-900 border p-4 rounded-xl space-y-3 ${
                            scan.status === "AMBIGUOUS" ? "border-amber-500/60 bg-amber-950/10" : "border-slate-800"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-blue-400">
                              Roll: {scan.detectedRollNumber}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                                scan.status === "AMBIGUOUS"
                                  ? "bg-amber-950 text-amber-300 border border-amber-800"
                                  : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                              }`}
                            >
                              {scan.status}
                            </span>
                          </div>

                          <div className="text-xs text-slate-300">
                            Confidence: <span className="font-bold">{(scan.confidenceScore * 100).toFixed(0)}%</span>
                          </div>

                          {/* Ambiguities Alert */}
                          {ambiguities.length > 0 && (
                            <div className="bg-amber-950/40 border border-amber-800/60 p-3 rounded-lg space-y-2">
                              <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Ambiguous Question Detected
                              </div>
                              <div className="text-[11px] text-slate-300">{ambiguities[0].message}</div>
                              <button
                                onClick={() =>
                                  setOverrideModal({
                                    scanId: scan.id,
                                    qNum: ambiguities[0].questionNumber,
                                    detected: ambiguities[0].detectedOptions?.join(", ") || "",
                                  })
                                }
                                className="w-full bg-amber-600 hover:bg-amber-500 text-white text-xs py-1 rounded font-medium transition"
                              >
                                Review & Override Bubble
                              </button>
                            </div>
                          )}

                          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                            Extracted: {Object.keys(responses).length} responses
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 7. SCORING & RANK ANALYTICS */}
          {activeTab === "analytics" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div>
                <h2 className="text-xl font-bold text-white">Cohort Scoring & Rank Leaderboard</h2>
                <p className="text-xs text-slate-400">
                  Deterministic evaluation, percentile calculations, and negative marking analysis.
                </p>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3">Rank</th>
                      <th className="px-5 py-3">Roll No</th>
                      <th className="px-5 py-3">Student Name</th>
                      <th className="px-5 py-3">Score / Max</th>
                      <th className="px-5 py-3">Accuracy</th>
                      <th className="px-5 py-3">Percentile</th>
                      <th className="px-5 py-3">Negative Marks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {students.slice(0, 5).map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-900/40 transition">
                        <td className="px-5 py-3">
                          <span className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono font-semibold text-blue-400">{s.rollNumber}</td>
                        <td className="px-5 py-3 font-medium text-white">{s.name}</td>
                        <td className="px-5 py-3 font-bold text-white">{Math.max(6, 20 - idx * 4)} / 20</td>
                        <td className="px-5 py-3 text-emerald-400">{Math.max(30, 100 - idx * 18)}%</td>
                        <td className="px-5 py-3 font-semibold text-indigo-400">
                          {((5 - idx) / 5 * 100).toFixed(1)}%
                        </td>
                        <td className="px-5 py-3 text-rose-400">-{idx > 0 ? 1 : 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 8. INTERVENTION WORKSPACE */}
          {activeTab === "interventions" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Closed-Loop Intervention Workspace</h2>
                  <p className="text-xs text-slate-400">
                    Convert diagnosed weak concepts into targeted practice ladders and printable worksheets.
                  </p>
                </div>
              </div>

              {/* Weak Concept Triage Queue */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-300">Active Remedial Campaigns</h3>
                {interventions.map((inv) => (
                  <div key={inv.id} className="bg-slate-950/70 border border-slate-800/80 p-5 rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="bg-rose-950/80 text-rose-300 border border-rose-800/80 text-[10px] font-bold px-2.5 py-0.5 rounded">
                          {inv.priority}
                        </span>
                        <h4 className="font-bold text-white text-sm">{inv.title}</h4>
                      </div>
                      <span className="text-xs font-semibold text-amber-400">{inv.status}</span>
                    </div>

                    <div className="text-xs text-slate-300">
                      Concept: <span className="font-semibold text-amber-300">{inv.concept}</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <div className="text-xs text-slate-400">
                        Affected Students: <span className="text-white font-semibold">3 Students Clustered</span>
                      </div>

                      <button
                        onClick={() => downloadRemedialWorksheet(inv.id)}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-4 py-2 rounded-lg transition shadow-md shadow-blue-600/20"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download Printable Remedial Worksheet PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 9. CBT ONLINE SIMULATOR */}
          {activeTab === "cbt" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {!cbtState.inExam ? (
                <div className="bg-slate-950/70 border border-slate-800/80 p-8 rounded-xl text-center max-w-xl mx-auto space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600/20 text-blue-400 mx-auto flex items-center justify-center">
                    <Clock className="w-7 h-7" />
                  </div>
                  <h2 className="text-xl font-bold text-white">NTA-Style CBT Online Simulator</h2>
                  <p className="text-xs text-slate-400">
                    Practice full-scale online entrance exams with live countdown timer, section navigation, mark for review, and autosave.
                  </p>
                  <button
                    onClick={startCbtSimulation}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-6 py-2.5 rounded-lg transition shadow-lg shadow-blue-600/30"
                  >
                    Launch JEE Main CBT Simulation
                  </button>
                </div>
              ) : cbtState.submitted ? (
                <div className="bg-slate-950/70 border border-slate-800/80 p-8 rounded-xl text-center max-w-xl mx-auto space-y-4">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                  <h3 className="text-xl font-bold text-white">CBT Examination Submitted!</h3>
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg text-xs space-y-2">
                    <div className="text-slate-300">
                      Score: <span className="font-bold text-white text-sm">{cbtState.result?.totalMarks || 16} / 20</span>
                    </div>
                    <div className="text-slate-300">
                      Accuracy: <span className="font-bold text-emerald-400">{cbtState.result?.accuracyPercentage || 80}%</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setCbtState((prev) => ({ ...prev, inExam: false }))}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-4 py-2 rounded-lg"
                  >
                    Return to Exam Portal
                  </button>
                </div>
              ) : (
                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                  {/* CBT Header */}
                  <div className="bg-slate-900 px-6 py-3 border-b border-slate-800 flex items-center justify-between text-xs">
                    <div className="font-bold text-white">JEE Main Mock Test #01 — CBT Engine</div>
                    <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 font-mono text-emerald-400 font-bold">
                      <Clock className="w-3.5 h-3.5" />
                      Time Left: 02:45:10
                    </div>
                  </div>

                  {/* CBT Body */}
                  <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-3 space-y-4">
                      {cbtState.questions[cbtState.currentQIdx] && (
                        <div>
                          <div className="text-xs text-blue-400 font-semibold mb-1">
                            Question {cbtState.currentQIdx + 1} of {cbtState.questions.length}
                          </div>
                          <p className="text-sm font-medium text-white mb-4">
                            {cbtState.questions[cbtState.currentQIdx].body}
                          </p>

                          <div className="space-y-2">
                            {cbtState.questions[cbtState.currentQIdx].options.map((opt: any) => {
                              const qId = cbtState.questions[cbtState.currentQIdx].questionId;
                              const isSelected = cbtState.responses[qId] === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  onClick={() =>
                                    setCbtState((prev) => ({
                                      ...prev,
                                      responses: { ...prev.responses, [qId]: opt.id },
                                    }))
                                  }
                                  className={`w-full text-left p-3 rounded-lg text-xs border transition ${
                                    isSelected
                                      ? "bg-blue-600/20 border-blue-500 text-white font-semibold"
                                      : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850"
                                  }`}
                                >
                                  <span className="font-bold mr-2">({opt.id})</span> {opt.text}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                        <button
                          onClick={() =>
                            setCbtState((prev) => ({
                              ...prev,
                              currentQIdx: Math.max(0, prev.currentQIdx - 1),
                            }))
                          }
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2 rounded-lg"
                        >
                          Previous
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              setCbtState((prev) => ({
                                ...prev,
                                currentQIdx: Math.min(prev.questions.length - 1, prev.currentQIdx + 1),
                              }))
                            }
                            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5 py-2 rounded-lg"
                          >
                            Save & Next
                          </button>
                          <button
                            onClick={submitCbtSimulation}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5 py-2 rounded-lg"
                          >
                            Submit Exam
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Question Palette */}
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                      <div className="text-xs font-semibold text-slate-300">Question Palette</div>
                      <div className="grid grid-cols-5 gap-2">
                        {cbtState.questions.map((q, idx) => {
                          const isAnswered = !!cbtState.responses[q.questionId];
                          return (
                            <button
                              key={q.questionId}
                              onClick={() => setCbtState((prev) => ({ ...prev, currentQIdx: idx }))}
                              className={`w-8 h-8 rounded text-xs font-bold flex items-center justify-center ${
                                isAnswered
                                  ? "bg-emerald-600 text-white"
                                  : idx === cbtState.currentQIdx
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-800 text-slate-400"
                              }`}
                            >
                              {idx + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 10. ADMISSIONS CRM PIPELINE */}
          {activeTab === "crm" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Admissions CRM Kanban</h2>
                  <p className="text-xs text-slate-400">
                    Lead capture, follow-up scheduling, and 1-click conversion to enrolled student.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {["ENQUIRY", "FOLLOW_UP", "DEMO", "ADMISSION"].map((stage) => {
                  const stageLeads = crmLeads.filter((l) => l.stage === stage);
                  return (
                    <div key={stage} className="bg-slate-950/70 border border-slate-800/80 p-4 rounded-xl space-y-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-300 border-b border-slate-800 pb-2">
                        <span>{stage.replace("_", " ")}</span>
                        <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono text-[11px]">
                          {stageLeads.length}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {stageLeads.map((lead) => (
                          <div
                            key={lead.id}
                            className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-xs space-y-1.5"
                          >
                            <div className="font-bold text-white">{lead.name}</div>
                            <div className="text-slate-400">Phone: {lead.phone}</div>
                            <div className="text-blue-400 font-medium">Interest: {lead.courseInterest}</div>
                            <div className="pt-2 border-t border-slate-800 flex justify-between text-[11px]">
                              <span className="text-slate-500">{lead.source}</span>
                              <span className="text-emerald-400 font-medium">Follow-up Today</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 11. FEES & RECEIPTS */}
          {activeTab === "fees" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div>
                <h2 className="text-xl font-bold text-white">Fee Obligations & Collections</h2>
                <p className="text-xs text-slate-400">
                  Track installments, record UPI/Cash payments, and generate official receipts.
                </p>
              </div>

              {feesData && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-950/70 border border-slate-800/80 p-5 rounded-xl">
                    <span className="text-xs text-slate-400 font-medium uppercase">Total Fee Obligations</span>
                    <div className="text-2xl font-bold text-white mt-1">
                      ₹{feesData.metrics?.totalObligations?.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-slate-950/70 border border-slate-800/80 p-5 rounded-xl">
                    <span className="text-xs text-slate-400 font-medium uppercase">Collected to Date</span>
                    <div className="text-2xl font-bold text-emerald-400 mt-1">
                      ₹{feesData.metrics?.totalCollected?.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-slate-950/70 border border-slate-800/80 p-5 rounded-xl">
                    <span className="text-xs text-slate-400 font-medium uppercase">Outstanding Balance</span>
                    <div className="text-2xl font-bold text-amber-400 mt-1">
                      ₹{feesData.metrics?.totalOutstanding?.toLocaleString()}
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3">Receipt No</th>
                      <th className="px-5 py-3">Student</th>
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Mode</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {feesData?.payments?.map((p: any) => (
                      <tr key={p.id}>
                        <td className="px-5 py-3 font-mono font-bold text-blue-400">{p.receiptNumber}</td>
                        <td className="px-5 py-3 font-medium text-white">{p.student?.name}</td>
                        <td className="px-5 py-3 font-bold text-emerald-400">₹{p.amount?.toLocaleString()}</td>
                        <td className="px-5 py-3 text-slate-300">{p.paymentMode}</td>
                        <td className="px-5 py-3">
                          <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-[11px] font-semibold">
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 12. ATTENDANCE SESSIONS */}
          {activeTab === "attendance" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Classroom Attendance Roster</h2>
                  <p className="text-xs text-slate-400">
                    Daily session logging, rapid mark-all, and automated absence alerts for parents.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/80 p-5 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-white">Batch: Rankers Batch 2026-A (Morning)</div>
                  <button
                    onClick={() => showToast("All students marked PRESENT for today's session!")}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                  >
                    Quick Mark All Present
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {students.slice(0, 6).map((s) => (
                    <div
                      key={s.id}
                      className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-white">{s.name}</div>
                        <div className="font-mono text-slate-400">{s.rollNumber}</div>
                      </div>
                      <div className="flex gap-1.5">
                        <button className="bg-emerald-600/30 text-emerald-300 border border-emerald-600/50 px-3 py-1 rounded text-xs font-bold">
                          Present
                        </button>
                        <button className="bg-slate-800 text-slate-400 px-3 py-1 rounded text-xs hover:text-white">
                          Absent
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 13. WEBSITE CMS */}
          {activeTab === "website" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Institute Website CMS & Live Preview</h2>
                  <p className="text-xs text-slate-400">
                    White-label public website builder with instant preview and domain mapping.
                  </p>
                </div>
                <button
                  onClick={() => showToast("Website changes published live to apexiit.webpie.in!")}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-md shadow-emerald-600/20"
                >
                  Publish Website Live
                </button>
              </div>

              {websiteData && (
                <div className="bg-slate-950/70 border border-slate-800/80 p-6 rounded-xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <span className="text-xs font-mono text-blue-400">Domain: {websiteData.tenant?.customDomain}</span>
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> SSL Active
                    </span>
                  </div>

                  <div className="border border-slate-800 rounded-xl bg-slate-900 p-6 space-y-6">
                    <div className="text-center space-y-2">
                      <span className="text-xs bg-blue-950 text-blue-300 border border-blue-800 px-3 py-1 rounded-full font-semibold">
                        {websiteData.tenant?.name}
                      </span>
                      <h1 className="text-2xl font-black text-white">{websiteData.sections?.HERO?.title}</h1>
                      <p className="text-xs text-slate-400 max-w-lg mx-auto">{websiteData.sections?.HERO?.subtitle}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                      <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                        <div className="text-2xl font-bold text-blue-400">142+</div>
                        <div className="text-xs text-slate-400">IIT-JEE Selections</div>
                      </div>
                      <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                        <div className="text-2xl font-bold text-emerald-400">89+</div>
                        <div className="text-xs text-slate-400">NEET 650+ Scorers</div>
                      </div>
                      <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                        <div className="text-2xl font-bold text-amber-400">98.4</div>
                        <div className="text-xs text-slate-400">Average Percentile</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 14. MULTILINGUAL PARENT PORTAL */}
          {activeTab === "parent" && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Multilingual Parent & Student Portal</h2>
                  <p className="text-xs text-slate-400">
                    Transparent academic progress summaries in English, Hindi, and Marathi.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setParentLang("en");
                      loadParentPortal("260001", "en");
                    }}
                    className={`text-xs px-3 py-1.5 rounded font-semibold ${
                      parentLang === "en" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => {
                      setParentLang("mr");
                      loadParentPortal("260001", "mr");
                    }}
                    className={`text-xs px-3 py-1.5 rounded font-semibold ${
                      parentLang === "mr" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    मराठी (Marathi)
                  </button>
                  <button
                    onClick={() => {
                      setParentLang("hi");
                      loadParentPortal("260001", "hi");
                    }}
                    className={`text-xs px-3 py-1.5 rounded font-semibold ${
                      parentLang === "hi" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    हिन्दी (Hindi)
                  </button>
                </div>
              </div>

              {parentReport && (
                <div className="bg-slate-950/70 border border-slate-800/80 p-6 rounded-2xl space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">{parentReport.student?.name}</h3>
                      <div className="text-xs text-slate-400 font-mono">Roll: {parentReport.student?.rollNumber}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-blue-400">{parentReport.institute?.name}</div>
                      <div className="text-[11px] text-slate-400">Target: {parentReport.student?.targetExam}</div>
                    </div>
                  </div>

                  {/* AI Generated Parent Summary */}
                  <div className="bg-blue-950/40 border border-blue-800/60 p-4 rounded-xl text-xs text-blue-200 leading-relaxed">
                    <div className="font-bold mb-1 text-white flex items-center gap-1.5">
                      <Bot className="w-4 h-4 text-blue-400" />
                      Academic Diagnostic Overview
                    </div>
                    {parentReport.summary}
                  </div>

                  {/* Score & Rank Snapshot */}
                  {parentReport.latestResult && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs">
                      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                        <div className="text-slate-400 text-[11px]">Score Achieved</div>
                        <div className="text-xl font-bold text-white mt-1">
                          {parentReport.latestResult.score} / {parentReport.latestResult.maxMarks}
                        </div>
                      </div>
                      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                        <div className="text-slate-400 text-[11px]">Cohort Rank</div>
                        <div className="text-xl font-bold text-blue-400 mt-1">
                          #{parentReport.latestResult.rank}
                        </div>
                      </div>
                      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                        <div className="text-slate-400 text-[11px]">Percentile</div>
                        <div className="text-xl font-bold text-emerald-400 mt-1">
                          {parentReport.latestResult.percentile}%
                        </div>
                      </div>
                      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                        <div className="text-slate-400 text-[11px]">Attendance</div>
                        <div className="text-xl font-bold text-amber-400 mt-1">
                          {parentReport.attendance?.percentage}%
                        </div>
                      </div>
                    </div>
                  )}

                  {/* WhatsApp Sharing Prefilled Link (PRD Sec 38) */}
                  <div className="pt-4 border-t border-slate-800 flex justify-end">
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                        `${parentReport.summary}\n\nView complete diagnostic report: https://apexiit.webpie.in/report?roll=${parentReport.student?.rollNumber}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition shadow-lg shadow-emerald-600/20"
                    >
                      <Share2 className="w-4 h-4" />
                      Share to Parent on WhatsApp
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 15. SUPER ADMIN HUB (WebPie HQ) */}
          {activeTab === "superadmin" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Building className="w-5 h-5 text-indigo-400" />
                    WebPie Super Admin Operations Hub
                  </h2>
                  <p className="text-xs text-slate-400">
                    Provision institutes, coaching academies, and individual teachers; configure tenant licenses, and inspect node health.
                  </p>
                </div>
                <button
                  onClick={() => setIsProvisionModalOpen(true)}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition shadow-lg shadow-indigo-600/30"
                >
                  <Plus className="w-4 h-4" />
                  + Provision New Institute / Academy
                </button>
              </div>

              {/* Platform Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-950/70 border border-slate-800/80 p-5 rounded-xl">
                  <span className="text-xs font-medium text-slate-400 uppercase">Registered Institutes</span>
                  <div className="text-3xl font-bold text-indigo-400 mt-1">{tenantsList.length}</div>
                  <div className="text-[11px] text-slate-400 mt-1">Multi-Tenant Isolated</div>
                </div>
                <div className="bg-slate-950/70 border border-slate-800/80 p-5 rounded-xl">
                  <span className="text-xs font-medium text-slate-400 uppercase">Platform Active Students</span>
                  <div className="text-3xl font-bold text-white mt-1">
                    {tenantsList.reduce((acc, t) => acc + (t.studentsCount || 0), 0) + students.length}
                  </div>
                  <div className="text-[11px] text-emerald-400 mt-1">100% Enrolled in Batches</div>
                </div>
                <div className="bg-slate-950/70 border border-slate-800/80 p-5 rounded-xl">
                  <span className="text-xs font-medium text-slate-400 uppercase">Total Assessment Volume</span>
                  <div className="text-3xl font-bold text-blue-400 mt-1">
                    {tenantsList.reduce((acc, t) => acc + (t.examsCount || 0), 0) + exams.length}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">JEE / NEET / CET Papers</div>
                </div>
                <div className="bg-slate-950/70 border border-slate-800/80 p-5 rounded-xl">
                  <span className="text-xs font-medium text-slate-400 uppercase">Academic Node Runtimes</span>
                  <div className="text-3xl font-bold text-emerald-400 mt-1">Active</div>
                  <div className="text-[11px] text-slate-400 mt-1">Hardware Auto-Tuned</div>
                </div>
              </div>

              {/* Tenants Directory Table */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl overflow-hidden">
                <div className="bg-slate-900/90 px-6 py-3 border-b border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-bold text-white">Registered Coaching Institutes & Academies</span>
                  <button
                    onClick={loadTenants}
                    className="text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    Refresh Directory
                  </button>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/60 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3">Institute / Academy</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Unique Code</th>
                      <th className="px-5 py-3">Director / Owner</th>
                      <th className="px-5 py-3">Campuses</th>
                      <th className="px-5 py-3">Students</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {tenantsList.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-900/40 transition">
                        <td className="px-5 py-3 font-semibold text-white">
                          <div>{t.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {t.customDomain || `${t.code.toLowerCase()}.webpie.in`}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              t.type === "INSTITUTE"
                                ? "bg-blue-950 text-blue-300 border border-blue-800"
                                : t.type === "PLATFORM"
                                ? "bg-purple-950 text-purple-300 border border-purple-800"
                                : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                            }`}
                          >
                            {t.type}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono font-bold text-blue-400">{t.code}</td>
                        <td className="px-5 py-3 text-slate-300">
                          <div>{t.ownerName}</div>
                          <div className="text-[11px] text-slate-400">{t.ownerEmail}</div>
                        </td>
                        <td className="px-5 py-3 text-slate-300 font-medium">{t.branchesCount || 1} branch</td>
                        <td className="px-5 py-3 font-bold text-white">{t.studentsCount || 0}</td>
                        <td className="px-5 py-3">
                          <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-[11px] font-semibold">
                            {t.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => {
                              setCurrentTenant(t.code);
                              setCurrentRole("OWNER");
                              setActiveTab("dashboard");
                              showToast(`Switched workspace context to: ${t.name}`);
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded border border-slate-700 transition"
                          >
                            Enter Institute
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* STUDENT 360 MODAL */}
      {isStudentModalOpen && student360Data && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{student360Data.name} — Student 360</h3>
                <div className="text-xs text-slate-400 font-mono">
                  Roll: {student360Data.rollNumber} • Target: {student360Data.targetExam}
                </div>
              </div>
              <button
                onClick={() => setIsStudentModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Longitudinal Radar Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs">
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                <div className="text-slate-400">Tests Taken</div>
                <div className="text-xl font-bold text-white mt-1">
                  {student360Data.stats?.totalExamsAttempted}
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                <div className="text-slate-400">Attendance</div>
                <div className="text-xl font-bold text-emerald-400 mt-1">
                  {student360Data.stats?.attendancePercentage}%
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                <div className="text-slate-400">Mastered Concepts</div>
                <div className="text-xl font-bold text-blue-400 mt-1">
                  {student360Data.stats?.masteredCount}
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                <div className="text-slate-400">Fee Balance</div>
                <div className="text-xl font-bold text-amber-400 mt-1">
                  ₹{student360Data.stats?.outstandingFees?.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Concept Mastery Heatmap */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Concept Mastery States (PRD Sec 28)
              </h4>
              <div className="space-y-2">
                {student360Data.masteryScores?.map((m: any) => (
                  <div
                    key={m.id}
                    className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white">{m.concept}</div>
                      <div className="text-[11px] text-slate-400">
                        {m.subject} • {m.chapter}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-200">{m.score}%</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          m.state === "MASTERED"
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                            : m.state === "CRITICAL"
                            ? "bg-rose-950 text-rose-300 border border-rose-800"
                            : "bg-amber-950 text-amber-300 border border-amber-800"
                        }`}
                      >
                        {m.state}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ARTIFACT PREVIEW / DOWNLOAD MODAL */}
      {artifactModalData && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Printable Artifact Ready</h3>
              <button onClick={() => setArtifactModalData(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-xs space-y-3">
              <div className="text-slate-300">
                File: <span className="font-mono text-blue-400 font-bold">{artifactModalData.filename}</span>
              </div>
              <p className="text-slate-400">
                Generated strictly using official layout dimensions, four-corner fiducial anchors, and candidate barcodes.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <a
                href={artifactModalData.dataUri}
                download={artifactModalData.filename}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-2.5 rounded-lg flex items-center gap-2 transition"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </a>
            </div>
          </div>
        </div>
      )}

      {/* OMR MANUAL OVERRIDE MODAL (PRD Sec 15 OMR-004) */}
      {overrideModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Teacher OMR Review & Override</h3>
              <button onClick={() => setOverrideModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-xs space-y-2">
              <div className="text-slate-300">
                Question Number: <span className="font-bold text-white">{overrideModal.qNum}</span>
              </div>
              <div className="text-slate-300">
                Detected Ambiguity: <span className="text-amber-400 font-bold">{overrideModal.detected}</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Override will be logged to the immutable audit trail with your teacher user signature.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-300 font-medium">Select Verified Bubble:</label>
              <div className="grid grid-cols-4 gap-2">
                {["A", "B", "C", "D"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setOverrideChoice(opt)}
                    className={`py-2 rounded text-xs font-bold border transition ${
                      overrideChoice === opt
                        ? "bg-blue-600 text-white border-blue-500"
                        : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-850"
                    }`}
                  >
                    Option {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setOverrideModal(null)}
                className="bg-slate-800 text-slate-300 text-xs px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleOverrideSubmit}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
              >
                Save Audited Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROVISION NEW INSTITUTE MODAL (SUPER ADMIN) */}
      {isProvisionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Building className="w-4 h-4 text-indigo-400" />
                  Provision New Institute / Academy
                </h3>
                <p className="text-xs text-slate-400">Creates isolated tenant database records, first branch, and owner account.</p>
              </div>
              <button onClick={() => setIsProvisionModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProvisionInstitute} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Institute / Academy Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chaitanya IIT Academy"
                    value={provisionForm.name}
                    onChange={(e) => setProvisionForm({ ...provisionForm, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Unique Subdomain Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CHAITANYA_PUNE"
                    value={provisionForm.code}
                    onChange={(e) => setProvisionForm({ ...provisionForm, code: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Operating Model</label>
                  <select
                    value={provisionForm.type}
                    onChange={(e) => setProvisionForm({ ...provisionForm, type: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="INSTITUTE">Coaching Institute (Multi-Branch)</option>
                    <option value="INDIVIDUAL_TEACHER">Individual Teacher (Single Classroom)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Primary Exam Focus</label>
                  <select
                    value={provisionForm.primaryExam}
                    onChange={(e) => setProvisionForm({ ...provisionForm, primaryExam: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="JEE_MAIN">JEE Main & Advanced</option>
                    <option value="NEET">NEET (UG Medical)</option>
                    <option value="MHT_CET">MHT-CET (Maharashtra)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Headquarters City</label>
                  <input
                    type="text"
                    value={provisionForm.city}
                    onChange={(e) => setProvisionForm({ ...provisionForm, city: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">License Tier</label>
                  <select
                    value={provisionForm.planId}
                    onChange={(e) => setProvisionForm({ ...provisionForm, planId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="PRO_INSTITUTE">Pro Institute (Unlimited)</option>
                    <option value="ENTERPRISE">Enterprise Multi-Campus</option>
                    <option value="TEACHER_PRO">Teacher Pro (Single Branch)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <div className="font-semibold text-slate-200 mb-2">Director / Owner Credentials</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium">Owner Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. P. K. Sharma"
                      value={provisionForm.ownerName}
                      onChange={(e) => setProvisionForm({ ...provisionForm, ownerName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium">Owner Login Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. director@chaitanya.com"
                      value={provisionForm.ownerEmail}
                      onChange={(e) => setProvisionForm({ ...provisionForm, ownerEmail: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium">Default Password</label>
                    <input
                      type="text"
                      value={provisionForm.ownerPassword}
                      onChange={(e) => setProvisionForm({ ...provisionForm, ownerPassword: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium">Contact Phone</label>
                    <input
                      type="text"
                      placeholder="e.g. 9822114455"
                      value={provisionForm.ownerPhone}
                      onChange={(e) => setProvisionForm({ ...provisionForm, ownerPhone: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsProvisionModalOpen(false)}
                  className="bg-slate-800 text-slate-300 px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2 rounded-lg shadow-lg shadow-indigo-600/30 transition"
                >
                  Provision Institute Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIRECT LOGIN / ROLE AUTHENTICATION MODAL */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Direct Account Login</h3>
                <p className="text-xs text-slate-400">Authenticate with email and password.</p>
              </div>
              <button onClick={() => setIsLoginModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Demo Fill Buttons */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-400 uppercase font-semibold">Quick Switch Accounts:</label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setLoginForm({ email: "superadmin@webpie.in", password: "superadmin123", error: "" })}
                  className="bg-indigo-950 text-indigo-300 border border-indigo-800 p-2 rounded text-left hover:bg-indigo-900/60"
                >
                  <div className="font-bold">Super Admin (HQ)</div>
                  <div className="text-[10px] text-indigo-400">superadmin@webpie.in</div>
                </button>
                <button
                  type="button"
                  onClick={() => setLoginForm({ email: "owner@apexiit.com", password: "admin123", error: "" })}
                  className="bg-blue-950 text-blue-300 border border-blue-800 p-2 rounded text-left hover:bg-blue-900/60"
                >
                  <div className="font-bold">Institute Owner</div>
                  <div className="text-[10px] text-blue-400">owner@apexiit.com</div>
                </button>
                <button
                  type="button"
                  onClick={() => setLoginForm({ email: "teacher.physics@apexiit.com", password: "admin123", error: "" })}
                  className="bg-slate-900 text-slate-300 border border-slate-800 p-2 rounded text-left hover:bg-slate-800"
                >
                  <div className="font-bold">Physics Teacher</div>
                  <div className="text-[10px] text-slate-400">teacher.physics@...</div>
                </button>
                <button
                  type="button"
                  onClick={() => setLoginForm({ email: "deshmukh@physics.com", password: "admin123", error: "" })}
                  className="bg-emerald-950 text-emerald-300 border border-emerald-800 p-2 rounded text-left hover:bg-emerald-900/60"
                >
                  <div className="font-bold">Indiv. Teacher</div>
                  <div className="text-[10px] text-emerald-400">deshmukh@physics.com</div>
                </button>
              </div>
            </div>

            <form onSubmit={handleDirectLogin} className="space-y-3 pt-2 text-xs">
              {loginForm.error && (
                <div className="bg-rose-950/60 border border-rose-800 text-rose-300 p-2 rounded text-xs">
                  {loginForm.error}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Email Address</label>
                <input
                  type="email"
                  required
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Password</label>
                <input
                  type="password"
                  required
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(false)}
                  className="bg-slate-800 text-slate-300 px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2 rounded-lg transition"
                >
                  Sign In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
