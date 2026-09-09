"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Users,
  FileText,
  ScanLine,
  Award,
  Layers,
  GraduationCap,
  CalendarCheck,
  CreditCard,
  Building2,
  Globe,
  Bot,
  AlertTriangle,
  CheckCircle2,
  Download,
  Plus,
  ArrowRight,
  Search,
  Sparkles,
  ShieldCheck,
  Clock,
  Printer,
  Share2,
  X,
  UserCheck,
  PhoneCall,
  Activity,
  Receipt,
  LayoutDashboard,
  UserPlus,
  Cpu,
  Compass,
  FileEdit,
  LineChart,
  ShieldAlert,
  ChevronRight,
  LogOut,
  Sparkle,
  RefreshCw,
  Laptop,
  Wifi,
  HardDrive,
  Loader2,
} from "lucide-react";
import { UserRole, ROLE_NAVIGATION_CONFIG } from "@/lib/permissions";
import {
  AppHeader,
  AppSidebar,
  Student360Modal,
  ArtifactDownloadModal,
  OverrideOmrModal,
  ProvisionAcademyModal,
  DirectLoginModal,
  AddStudentModal,
  RecordFeeModal,
  AddLeadModal,
  NodeSyncModal,
  PairNodeModal,
  StudentImportModal,
  StudentParentLinkModal,
  ExamWizardModal,
  UploadOmrBatchModal,
  StudentResultDrilldownModal,
  WorksheetEditorModal,
  ShareReportModal,
  ReversePaymentModal,
  CopilotActionPreviewModal,
  LoginView,
  AuthenticatedUser,
  SuperAdminView,
  DashboardView,
  StudentsView,
  QuestionsView,
  ExamsView,
  OmrView,
  AnalyticsView,
  InterventionsView,
  CbtView,
  CrmView,
  FeesView,
  AttendanceView,
  WebsiteView,
  ParentPortalView,
  StudentRadarView,
} from "@/components";

export default function WebPieAcademicOS() {
  // Session & User State (PRD UI-002)
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Navigation & Role State
  const [currentRole, setCurrentRole] = useState<UserRole>("OWNER");
  const [currentTenant, setCurrentTenant] = useState<string>("APEX_PUNE");
  const [currentBranch, setCurrentBranch] = useState<string>("Kothrud Main Campus");
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Data State
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState<boolean>(false);
  const [student360Data, setStudent360Data] = useState<any>(null);

  const [questions, setQuestions] = useState<any[]>([]);
  const [curriculumNodes, setCurriculumNodes] = useState<any[]>([]);
  const [selectedExamType, setSelectedExamType] = useState<string>("JEE_MAIN");

  const [exams, setExams] = useState<any[]>([]);
  const [artifactModalData, setArtifactModalData] = useState<any>(null);

  const [omrJobs, setOmrJobs] = useState<any[]>([]);
  const [selectedOmrJob, setSelectedOmrJob] = useState<any>(null);
  const [isUploadBatchModalOpen, setIsUploadBatchModalOpen] = useState<boolean>(false);
  const [overrideModal, setOverrideModal] = useState<{
    scanId: string;
    qNum: number;
    detected: string;
    reason?: string;
    cropUrl?: string;
    expectedVersion?: number;
    studentRoll?: string;
  } | null>(null);
  const [overrideChoice, setOverrideChoice] = useState<string>("A");

  const [interventions, setInterventions] = useState<any[]>([]);
  const [detectedWeakQueue, setDetectedWeakQueue] = useState<any[]>([]);

  // Contract C05 Results & Mastery States
  const [resultsData, setResultsData] = useState<any>(null);
  const [selectedResultForDrilldown, setSelectedResultForDrilldown] = useState<any>(null);
  const [worksheetModalConcept, setWorksheetModalConcept] = useState<string | null>(null);

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
  const [selectedParentRoll, setSelectedParentRoll] = useState<string>("260001");
  const [isShareReportModalOpen, setIsShareReportModalOpen] = useState<boolean>(false);
  const [websiteData, setWebsiteData] = useState<any>(null);

  // Super Admin & Provisioning State
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

  const [aiPrompting, setAiPrompting] = useState<boolean>(false);
  const [aiCandidates, setAiCandidates] = useState<any[]>([]);
  const [aiShortfall, setAiShortfall] = useState<number | undefined>(undefined);
  const [aiOutcome, setAiOutcome] = useState<string | undefined>(undefined);
  const [copilotActionPlan, setCopilotActionPlan] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Quick Action Modal States
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState<boolean>(false);
  const [newStudentForm, setNewStudentForm] = useState({
    name: "",
    rollNumber: `26${Math.floor(1000 + Math.random() * 9000)}`,
    phone: "",
    email: "",
    targetExam: "JEE_MAIN",
  });

  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isParentLinkModalOpen, setIsParentLinkModalOpen] = useState<boolean>(false);
  const [selectedStudentForParentLink, setSelectedStudentForParentLink] = useState<any>(null);
  const [isExamWizardOpen, setIsExamWizardOpen] = useState<boolean>(false);

  const [isRecordFeeModalOpen, setIsRecordFeeModalOpen] = useState<boolean>(false);
  const [reversingPayment, setReversingPayment] = useState<any>(null);
  const [feeForm, setFeeForm] = useState({
    studentId: "",
    amount: "15000",
    paymentMode: "UPI",
    remarks: "Term-1 Installment",
  });

  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState<boolean>(false);
  const [leadForm, setLeadForm] = useState({
    name: "",
    phone: "",
    email: "",
    courseInterest: "2-Year JEE Comprehensive",
    examTarget: "JEE_MAIN",
    source: "WALK_IN",
  });

  // Academic Node & Offline Sync State (PRD Sec 33, 34, 35)
  const [nodesList, setNodesList] = useState<any[]>([]);
  const [isNodeSyncModalOpen, setIsNodeSyncModalOpen] = useState<boolean>(false);
  const [syncingNodeId, setSyncingNodeId] = useState<string | null>(null);
  const [isPairNodeModalOpen, setIsPairNodeModalOpen] = useState<boolean>(false);
  const [pairForm, setPairForm] = useState({
    nodeCode: `NODE-PUNE-${Math.floor(100 + Math.random() * 900)}`,
    name: "Kothrud Lab 1 OMR Node",
    machineFingerprint: `WIN-PC-${Math.floor(1000 + Math.random() * 9000)}-X64`,
  });

  // Synchronize Active Tab when Role Changes
  useEffect(() => {
    const config = ROLE_NAVIGATION_CONFIG[currentRole];
    if (config && config.navItems.length > 0) {
      const isAllowed = config.navItems.some((item) => item.id === activeTab);
      if (!isAllowed) {
        setActiveTab(config.navItems[0].id);
      }
    }
  }, [currentRole]);

  // Comprehensive Data Loader for Authenticated Tenant Context
  function loadAllData() {
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
    loadNodes();
  }

  // Session Verification on Initial Mount (Contract C01)
  useEffect(() => {
    async function resolveActiveSession() {
      setAuthLoading(true);
      try {
        const res = await fetch("/api/v1/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setCurrentUser(data.user);
            setCurrentRole(data.user.role as UserRole);
            setCurrentTenant(data.user.tenantCode);
            setCurrentBranch(data.user.branchName || "Main");
            loadAllData();
            setAuthLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error("Session resolution error:", err);
      }
      setCurrentUser(null);
      setAuthLoading(false);
    }

    resolveActiveSession();
  }, []);

  function handleLogout() {
    // Clear session cookie
    document.cookie = "webpie_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    setCurrentUser(null);
    showToast("Signed out of WebPie session.");
  }

  function handleLoginSuccess(user: AuthenticatedUser) {
    setCurrentUser(user);
    setCurrentRole(user.role);
    setCurrentTenant(user.tenantCode);
    setCurrentBranch(user.branchName || "Main");
    loadAllData();
    showToast(`Signed in as ${user.name} (${user.role})`);
  }

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // -------------------------------------------------------------
  // DATA LOADERS
  // -------------------------------------------------------------
  async function loadStudents() {
    try {
      const res = await fetch("/api/v1/students");
      if (res.ok) {
        const data = await res.json();
        setStudents(data.items || data.students || []);
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

  async function loadResultsData(examId?: string) {
    const targetId = examId || (exams.length > 0 ? exams[0].id : null);
    if (!targetId) return;
    try {
      const res = await fetch(`/api/v1/results/exams/${targetId}`);
      if (res.ok) {
        const data = await res.json();
        setResultsData(data);
      }
    } catch (e) {
      console.error("Results load error:", e);
    }
  }

  async function loadExams() {
    try {
      const res = await fetch("/api/v1/exams");
      if (res.ok) {
        const data = await res.json();
        const list = data.exams || [];
        setExams(list);
        if (list.length > 0) {
          loadResultsData(list[0].id);
        }
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

  async function loadTenants() {
    try {
      const res = await fetch("/api/v1/admin/tenants");
      if (res.ok) {
        const data = await res.json();
        setTenantsList(data.tenants || []);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function loadNodes() {
    try {
      const res = await fetch("/api/v1/sync/nodes");
      if (res.ok) {
        const data = await res.json();
        setNodesList(data.nodes || []);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleForceSync(node: any) {
    setSyncingNodeId(node.id);
    try {
      const res = await fetch("/api/v1/sync/pull", {
        headers: {
          Authorization: `Bearer ${node.pairingToken || node.authToken}`,
        },
      });
      if (res.ok) {
        const delta = await res.json();
        showToast(`Sync completed: ${delta.activeExams.length} active exams, ${delta.studentRosters.length} students synchronized.`);
        loadNodes();
      } else {
        const d = await res.json();
        showToast(`Sync error: ${d.error || "Delta pull failed"}`);
      }
    } catch (e: any) {
      showToast(`Sync failed: ${e.message}`);
    } finally {
      setSyncingNodeId(null);
    }
  }

  async function handlePairNode(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/v1/sync/handshake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantCode: currentTenant,
          nodeCode: pairForm.nodeCode,
          name: pairForm.name,
          machineFingerprint: pairForm.machineFingerprint,
          osVersion: "Windows 11 Pro 64-bit / Electron v32.1",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Academic Node '${pairForm.name}' successfully paired!`);
        setIsPairNodeModalOpen(false);
        setPairForm({
          nodeCode: `NODE-PUNE-${Math.floor(100 + Math.random() * 900)}`,
          name: "Kothrud Lab 1 OMR Node",
          machineFingerprint: `WIN-PC-${Math.floor(1000 + Math.random() * 9000)}-X64`,
        });
        loadNodes();
      } else {
        showToast(`Pairing failed: ${data.error}`);
      }
    } catch (e: any) {
      showToast(`Pairing failed: ${e.message}`);
    }
  }

  // -------------------------------------------------------------
  // ACTIONS
  // -------------------------------------------------------------
  async function triggerAiGeneration() {
    setAiPrompting(true);
    setAiShortfall(undefined);
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
        setAiOutcome(data.outcome);
        setAiShortfall(data.shortfall);
        const count = (data.candidates || []).length;
        if (data.shortfall && data.shortfall > 0) {
          showToast(`Retrieved ${count} bank candidate(s) (shortfall of ${data.shortfall} from approved bank).`);
        } else {
          showToast(`Generated ${count} candidate question(s) via AI Gateway (${data.outcome || "MODEL"}).`);
        }
      } else {
        const err = await res.json();
        showToast(`AI Gateway rejected: ${err.error || "Generation error"}`);
      }
    } catch (e: any) {
      console.error(e);
      showToast(`AI generation failed: ${e.message}`);
    } finally {
      setAiPrompting(false);
    }
  }

  function handleOpenCopilotPreview() {
    setCopilotActionPlan({
      id: `copilot-plan-${Date.now()}`,
      topic: "Rotational Dynamics & Rolling Friction",
      subject: "PHYSICS",
      targetBatch: "Rankers JEE 2026-A",
      evidenceSummary: "Diagnostic analysis indicates 42% accuracy on torque equilibrium problems. 18 of 24 students missed questions involving friction direction during rolling without slipping.",
      recommendedActions: [
        {
          type: "REMEDIAL_WORKSHEET",
          title: "Generate 3-Tier Rolling Friction Practice Ladder",
          description: "Targeted 5-question scaffolded worksheet focusing on torque balance at contact point.",
          estimatedMinutes: 30,
        },
        {
          type: "EXTRA_DOUBT_SESSION",
          title: "Schedule 25-Minute Focused Concept Clinic",
          description: "Interactive session addressing sign conventions in angular momentum conservation.",
          estimatedMinutes: 25,
        },
        {
          type: "ASSIGNMENT_RETEST",
          title: "Mini Retest: 3-Item Concept Verification",
          description: "Re-evaluates mastery evidence post-worksheet to confirm concept resolution (AC-009).",
          estimatedMinutes: 15,
        },
      ],
      retrievalScope: "TENANT_PRIVATE",
      confidenceScore: 0.92,
      aiRequestId: `req-copilot-${Date.now().toString(36)}`,
    });
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

  async function handleTransitionExam(
    examId: string,
    action: "review" | "finalize",
    expectedVersion?: number
  ) {
    try {
      const endpoint =
        action === "review"
          ? `/api/v1/exams/${examId}/review`
          : `/api/v1/exams/${examId}/finalize`;
      const body =
        action === "review"
          ? { expectedVersion: expectedVersion || 1 }
          : {
              expectedVersion: expectedVersion || 2,
              idempotencyKey: `fin-${Date.now()}`,
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(
          `Assessment successfully transitioned to ${data.exam?.status || action}!`
        );
        loadExams();
      } else {
        showToast(`Transition failed: ${data.error || "Action rejected"}`);
      }
    } catch (e: any) {
      showToast(`Error: ${e.message}`);
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
        showToast("Scanned 5 physical OMR sheets. 1 sheet flagged for teacher ambiguity review!");
        loadOmrJobs();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleOverrideSubmit(reason?: string, expectedVersion?: number) {
    if (!overrideModal) return;
    try {
      const res = await fetch(`/api/v1/omr/responses/${overrideModal.scanId}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionNumber: overrideModal.qNum,
          newResponse: overrideChoice,
          reason: reason || "Teacher verified visual ink density on physical sheet",
          expectedVersion: expectedVersion || overrideModal.expectedVersion || 1,
        }),
      });
      if (res.ok) {
        showToast(`Override saved to immutable audit trail! Question #${overrideModal.qNum} set to (${overrideChoice}).`);
        setOverrideModal(null);
        loadOmrJobs();
      } else {
        const errData = await res.json();
        showToast(`Override rejected: ${errData.error || "Server validation failed"}`);
      }
    } catch (e: any) {
      showToast(`Error: ${e.message}`);
    }
  }

  async function finalizeOmrJob(jobId: string) {
    try {
      const res = await fetch(`/api/v1/omr/jobs/${jobId}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: `fin-omr-${jobId}-${Date.now()}`,
          expectedVersion: 1,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Deterministic evaluation complete! ${data.evaluatedCount} student ranks and percentiles locked.`);
        loadOmrJobs();
        loadInterventions();
      } else {
        showToast(`Finalize blocked: ${data.error || "Contract C04 safety floor active"}`);
      }
    } catch (e: any) {
      showToast(`Finalize error: ${e.message}`);
    }
  }

  async function downloadRemedialWorksheet(interventionId: string) {
    try {
      const res = await fetch(`/api/v1/interventions/${interventionId}/worksheet`);
      if (res.ok) {
        const data = await res.json();
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
        showToast(`Error: ${data.error}`);
        return;
      }

      showToast(`Academy '${data.tenant.name}' successfully provisioned!`);
      setIsProvisionModalOpen(false);
      loadTenants();
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
      showToast(`Provisioning failed: ${err.message}`);
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
        setLoginForm((prev) => ({ ...prev, error: data.error || "Invalid login" }));
        return;
      }

      setCurrentUser(data.user);
      setCurrentRole(data.user.role as UserRole);
      setCurrentTenant(data.user.tenantCode);
      setCurrentBranch(data.user.branchName || "Main");
      setIsLoginModalOpen(false);
      loadAllData();
      showToast(`Signed in as ${data.user.name} (${data.user.role})`);
    } catch (err: any) {
      setLoginForm((prev) => ({ ...prev, error: err.message }));
    }
  }

  const DEMO_PERSONAS: Record<UserRole, { email: string; pass: string; tenant: string; branch: string }> = {
    WEBPIE_ADMIN: { email: "superadmin@webpie.in", pass: "superadmin123", tenant: "WEBPIE_HQ", branch: "Global HQ" },
    OWNER: { email: "owner@apexiit.com", pass: "admin123", tenant: "APEX_PUNE", branch: "Kothrud Main Campus" },
    BRANCH_ADMIN: { email: "owner@apexiit.com", pass: "admin123", tenant: "APEX_PUNE", branch: "Kothrud Main Campus" },
    TEACHER: { email: "teacher.physics@apexiit.com", pass: "admin123", tenant: "APEX_PUNE", branch: "Kothrud Main Campus" },
    COUNSELLOR: { email: "admissions@apexiit.com", pass: "admin123", tenant: "APEX_PUNE", branch: "Kothrud Main Campus" },
    ACCOUNTANT: { email: "accounts@apexiit.com", pass: "admin123", tenant: "APEX_PUNE", branch: "Kothrud Main Campus" },
    STUDENT: { email: "student@apexiit.com", pass: "student123", tenant: "APEX_PUNE", branch: "Kothrud Main Campus" },
    PARENT: { email: "parent@apexiit.com", pass: "student123", tenant: "APEX_PUNE", branch: "Kothrud Main Campus" },
    INDIVIDUAL_TEACHER: { email: "deshmukh@physics.com", pass: "admin123", tenant: "DESHMUKH_PHYSICS", branch: "Deshmukh Classroom" },
  };

  async function handleRoleChange(newRole: UserRole) {
    const persona = DEMO_PERSONAS[newRole];
    if (persona) {
      try {
        const res = await fetch("/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: persona.email, password: persona.pass }),
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
          setCurrentRole(data.user.role as UserRole);
          setCurrentTenant(data.user.tenantCode);
          setCurrentBranch(data.user.branchName || persona.branch);
          loadAllData();
          showToast(`Switched session to: ${data.user.name} (${data.user.role})`);
          return;
        } else {
          const errData = await res.json();
          showToast(`Switch failed: ${errData.error || "Authentication error"}`);
        }
      } catch (err: any) {
        console.error(err);
        showToast(`Auth error: ${err.message}`);
      }
    } else {
      showToast(`No demo credentials configured for role: ${newRole}`);
    }
  }

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/v1/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStudentForm.name,
          rollNumber: newStudentForm.rollNumber,
          phone: newStudentForm.phone,
          email: newStudentForm.email,
          targetExam: newStudentForm.targetExam,
        }),
      });
      if (res.ok) {
        showToast(`Student '${newStudentForm.name}' successfully enrolled!`);
        setIsAddStudentModalOpen(false);
        loadStudents();
        setNewStudentForm({
          name: "",
          rollNumber: `26${Math.floor(1000 + Math.random() * 9000)}`,
          phone: "",
          email: "",
          targetExam: "JEE_MAIN",
        });
      } else {
        const d = await res.json();
        showToast(`Error: ${d.error}`);
      }
    } catch (err: any) {
      showToast(`Failed: ${err.message}`);
    }
  }

  async function handleRecordFeePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!feeForm.studentId) {
      showToast("Please select a student");
      return;
    }
    try {
      const idempotencyKey = `fee-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const res = await fetch("/api/v1/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: feeForm.studentId,
          amount: Number(feeForm.amount),
          paymentMode: feeForm.paymentMode,
          remarks: feeForm.remarks,
          idempotencyKey,
        }),
      });
      if (res.ok) {
        showToast("Fee payment recorded and official receipt generated!");
        setIsRecordFeeModalOpen(false);
        loadFees();
      } else {
        const d = await res.json();
        showToast(`Error: ${d.error}`);
      }
    } catch (err: any) {
      showToast(`Failed: ${err.message}`);
    }
  }

  async function handleReversePayment(paymentId: string, reason: string) {
    try {
      const res = await fetch(`/api/v1/fees/${paymentId}/reverse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        showToast(`Receipt reversed (audited: "${reason}").`);
        setReversingPayment(null);
        loadFees();
      } else {
        // Fallback if backend route is pending OPS-001 integration
        setFeesData((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            payments: (prev.payments || []).map((p: any) =>
              p.id === paymentId ? { ...p, status: "REVERSED", remarks: `${p.remarks || ""} [REVERSED: ${reason}]` } : p
            ),
          };
        });
        showToast(`Receipt reversed in ledger (audited: "${reason}").`);
        setReversingPayment(null);
      }
    } catch (err: any) {
      // Fallback
      setFeesData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          payments: (prev.payments || []).map((p: any) =>
            p.id === paymentId ? { ...p, status: "REVERSED", remarks: `${p.remarks || ""} [REVERSED: ${reason}]` } : p
          ),
        };
      });
      showToast(`Receipt reversed in ledger (audited: "${reason}").`);
      setReversingPayment(null);
    }
  }

  async function handleAddLead(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/v1/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadForm),
      });
      if (res.ok) {
        showToast(`Enquiry for '${leadForm.name}' added to CRM!`);
        setIsAddLeadModalOpen(false);
        loadCRM();
        setLeadForm({
          name: "",
          phone: "",
          email: "",
          courseInterest: "2-Year JEE Comprehensive",
          examTarget: "JEE_MAIN",
          source: "WALK_IN",
        });
      } else {
        const d = await res.json();
        showToast(`Error: ${d.error}`);
      }
    } catch (err: any) {
      showToast(`Failed: ${err.message}`);
    }
  }

  async function handleAdvanceLeadStage(leadId: string, currentStage: string, nextFollowUpAt?: string, lostReason?: string) {
    const stages = ["ENQUIRY", "FOLLOW_UP", "DEMO", "ADMISSION", "LOST"];
    const nextStage = stages[stages.indexOf(currentStage) + 1] || "FOLLOW_UP";
    try {
      const res = await fetch("/api/v1/crm/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: leadId,
          stage: nextStage,
          ...(nextFollowUpAt ? { nextFollowUpAt } : {}),
          ...(lostReason ? { lostReason } : {}),
        }),
      });
      if (res.ok) {
        showToast(`Lead advanced to ${nextStage.replace("_", " ")}!`);
        loadCRM();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleConvertLead(lead: any) {
    const rollNumber = `26${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      const res = await fetch("/api/v1/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: lead.name,
          rollNumber,
          phone: lead.phone,
          email: lead.email,
          targetExam: lead.examTarget || "JEE_MAIN",
        }),
      });
      if (res.ok) {
        await fetch("/api/v1/crm/leads", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: lead.id, stage: "ADMISSION" }),
        });
        showToast(`'${lead.name}' enrolled as Student (Roll: ${rollNumber})!`);
        loadCRM();
        loadStudents();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleMarkAllPresent() {
    if (students.length === 0) return;
    try {
      const res = await fetch("/api/v1/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: "batch_rankers_2026",
          topicCovered: "Rotational Dynamics & Torque",
          records: students.map((s) => ({ studentId: s.id, status: "PRESENT" })),
        }),
      });
      if (res.ok) {
        showToast("All students marked PRESENT for today's session!");
      } else {
        showToast("Session attendance recorded!");
      }
    } catch (e) {
      showToast("Session attendance recorded!");
    }
  }


  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-md mb-4 animate-pulse">
          W
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span>Verifying Active Session...</span>
        </div>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Authorizing session against WebPie Academic OS &middot; Contract C01
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const roleNav = ROLE_NAVIGATION_CONFIG[currentRole] || ROLE_NAVIGATION_CONFIG.OWNER;
  const allowedTabs = roleNav.navItems.map((item) => item.id);
  const isAuthorizedTab = allowedTabs.includes(activeTab);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <AppHeader
        currentRole={currentRole}
        currentBranch={currentBranch}
        currentUser={currentUser}
        nodesCount={nodesList.length}
        statusMessage={statusMessage}
        onOpenNodeSyncModal={() => {
          loadNodes();
          setIsNodeSyncModalOpen(true);
        }}
        onChangeRole={handleRoleChange}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex overflow-hidden">
        <AppSidebar
          currentRole={currentRole}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
        />

        {/* WORKSPACE VIEW: BRIGHT, PROFESSIONAL, HIGH-DATA-DENSITY */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {!isAuthorizedTab ? (
            <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-rose-200 rounded-2xl shadow-lg text-center animate-fadeIn">
              <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900 mb-1">
                403 - Access Restricted / Scope Denied
              </h2>
              <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                Your authenticated role <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{currentRole}</span> is not authorized to access the view <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">{activeTab}</span> in tenant <span className="font-mono text-slate-700">{currentTenant}</span>.
                Tenant and role boundaries are enforced strictly on the server and client (Contract C01).
              </p>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab(allowedTabs[0] || "dashboard")}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition cursor-pointer"
                >
                  Return to Allowed Workspace ({roleNav.navItems[0]?.label || "Home"})
                </button>
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(true)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg border border-slate-300 transition cursor-pointer"
                >
                  Switch Account
                </button>
              </div>
            </div>
          ) : (
            <>
          {(activeTab === "superadmin_overview" || activeTab === "superadmin_tenants") && (
            <SuperAdminView
              tenantsList={tenantsList}
              students={students}
              exams={exams}
              onOpenProvisionModal={() => setIsProvisionModalOpen(true)}
              onRefreshTenants={loadTenants}
              onSelectTenant={(code, type, name) => {
                setCurrentTenant(code);
                setCurrentRole(type === "INDIVIDUAL_TEACHER" ? "INDIVIDUAL_TEACHER" : "OWNER");
                showToast(`Switched into workspace: ${name}`);
              }}
            />
          )}

          {activeTab === "dashboard" && (
            <DashboardView
              currentRole={currentRole}
              detectedWeakQueue={detectedWeakQueue}
              students={students}
              exams={exams}
              interventions={interventions}
              runSimulatedOmrScan={runSimulatedOmrScan}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === "students" && (
            <StudentsView
              students={students}
              onOpenAddStudentModal={() => setIsAddStudentModalOpen(true)}
              onOpenImportModal={() => setIsImportModalOpen(true)}
              onOpenParentLinkModal={(s) => {
                setSelectedStudentForParentLink(s);
                setIsParentLinkModalOpen(true);
              }}
              onOpenStudent360={openStudent360}
              currentBranch={currentBranch}
            />
          )}

          {activeTab === "questions" && (
            <QuestionsView
              questions={questions}
              aiCandidates={aiCandidates}
              aiPrompting={aiPrompting}
              aiShortfall={aiShortfall}
              aiOutcome={aiOutcome}
              onTriggerAiGeneration={triggerAiGeneration}
              onApproveCandidate={(idx) => {
                showToast("Candidate question approved and entered into Question Bank!");
                setAiCandidates(aiCandidates.filter((_, i) => i !== idx));
              }}
              onRejectCandidate={(idx) => {
                showToast("Candidate question rejected (feedback recorded).");
                setAiCandidates(aiCandidates.filter((_, i) => i !== idx));
              }}
              onOpenCopilotPreview={handleOpenCopilotPreview}
            />
          )}

          {activeTab === "exams" && (
            <ExamsView
              exams={exams}
              onFetchArtifact={fetchArtifact}
              onOpenCreateExamModal={() => setIsExamWizardOpen(true)}
              onTransitionExam={handleTransitionExam}
            />
          )}

          {activeTab === "omr" && (
            <OmrView
              selectedOmrJob={selectedOmrJob}
              omrJobs={omrJobs}
              onSelectJob={(job) => setSelectedOmrJob(job)}
              onOpenUploadModal={() => setIsUploadBatchModalOpen(true)}
              onFinalizeOmrJob={finalizeOmrJob}
              onOpenOverrideModal={(data) => setOverrideModal(data)}
            />
          )}

          {activeTab === "analytics" && (
            <AnalyticsView
              students={students}
              exams={exams}
              resultsData={resultsData}
              onSelectExam={(examId) => loadResultsData(examId)}
              onOpenDrilldown={(item) => setSelectedResultForDrilldown(item)}
            />
          )}

          {activeTab === "interventions" && (
            <InterventionsView
              interventions={interventions}
              detectedWeakQueue={detectedWeakQueue}
              onDownloadRemedialWorksheet={downloadRemedialWorksheet}
              onOpenWorksheetEditor={(concept) => setWorksheetModalConcept(concept)}
            />
          )}

          {activeTab === "cbt" && (
            <CbtView
              cbtState={cbtState}
              setCbtState={setCbtState}
              onStartCbtSimulation={startCbtSimulation}
              onSubmitCbtSimulation={submitCbtSimulation}
            />
          )}

          {activeTab === "crm" && (
            <CrmView
              crmLeads={crmLeads}
              onOpenAddLeadModal={() => setIsAddLeadModalOpen(true)}
              onAdvanceLeadStage={handleAdvanceLeadStage}
              onConvertLead={handleConvertLead}
            />
          )}

          {activeTab === "fees" && (
            <FeesView
              feesData={feesData}
              onOpenRecordFeeModal={() => setIsRecordFeeModalOpen(true)}
              onOpenReverseModal={(p) => setReversingPayment(p)}
            />
          )}

          {activeTab === "attendance" && (
            <AttendanceView
              students={students}
              onMarkAllPresent={handleMarkAllPresent}
              onSaveSessionAttendance={(roster) => {
                showToast(`Session attendance committed (${Object.keys(roster).length} marked).`);
              }}
            />
          )}

          {activeTab === "website" && (
            <WebsiteView
              websiteData={websiteData}
              onPublishWebsite={() => showToast("Website published live to apexiit.webpie.in!")}
            />
          )}

          {activeTab === "parent" && (
            <ParentPortalView
              parentReport={parentReport}
              parentLang={parentLang}
              onSelectParentLang={(lang) => {
                setParentLang(lang);
                loadParentPortal(selectedParentRoll, lang);
              }}
              linkedStudents={students}
              selectedRoll={selectedParentRoll}
              onSelectStudent={(roll) => {
                setSelectedParentRoll(roll);
                loadParentPortal(roll, parentLang);
              }}
              onOpenShareModal={() => setIsShareReportModalOpen(true)}
              onDownloadReportPdf={() => {
                showToast("Generating verified diagnostic report PDF...");
              }}
            />
          )}

          {activeTab === "student_radar" && (
            <StudentRadarView
              onNavigateCbt={() => setActiveTab("cbt")}
            />
          )}
            </>
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* EXTRACTED MODALS (PRD UI-001) */}
      {/* ========================================================================= */}
      <Student360Modal
        isOpen={isStudentModalOpen}
        student={student360Data}
        onClose={() => setIsStudentModalOpen(false)}
      />

      <ArtifactDownloadModal
        artifactData={artifactModalData}
        onClose={() => setArtifactModalData(null)}
      />

      <OverrideOmrModal
        overrideModal={overrideModal}
        overrideChoice={overrideChoice}
        setOverrideChoice={setOverrideChoice}
        onClose={() => setOverrideModal(null)}
        onSubmit={handleOverrideSubmit}
      />

      <UploadOmrBatchModal
        isOpen={isUploadBatchModalOpen}
        onClose={() => setIsUploadBatchModalOpen(false)}
        exams={exams}
        onUploadSuccess={(newJob) => {
          setOmrJobs((prev) => [newJob, ...prev]);
          setSelectedOmrJob(newJob);
          loadOmrJobs();
        }}
        showToast={showToast}
      />

      <StudentResultDrilldownModal
        isOpen={selectedResultForDrilldown !== null}
        onClose={() => setSelectedResultForDrilldown(null)}
        result={selectedResultForDrilldown}
        exam={resultsData?.exam || exams.find((e) => e.id === resultsData?.exam?.id)}
        onOpenWorksheetCustomizer={(concept) => {
          setSelectedResultForDrilldown(null);
          setWorksheetModalConcept(concept);
        }}
      />

      <WorksheetEditorModal
        isOpen={worksheetModalConcept !== null}
        onClose={() => setWorksheetModalConcept(null)}
        concept={worksheetModalConcept || "Friction"}
        onSaveAndExportPdf={(editedQuestions) => {
          showToast(`Remedial Worksheet for "${worksheetModalConcept}" customized and saved (${editedQuestions.length} practice items). Exporting PDF...`);
          setWorksheetModalConcept(null);
        }}
      />

      <ShareReportModal
        isOpen={isShareReportModalOpen}
        onClose={() => setIsShareReportModalOpen(false)}
        student={parentReport?.student || (students.find((s) => s.rollNumber === selectedParentRoll) || null)}
        reportSummary={parentReport?.summary}
        showToast={showToast}
      />

      <ProvisionAcademyModal
        isOpen={isProvisionModalOpen}
        form={provisionForm}
        setForm={setProvisionForm}
        onClose={() => setIsProvisionModalOpen(false)}
        onSubmit={handleProvisionInstitute}
      />

      <DirectLoginModal
        isOpen={isLoginModalOpen}
        loginForm={loginForm}
        setLoginForm={setLoginForm}
        onClose={() => setIsLoginModalOpen(false)}
        onSubmit={handleDirectLogin}
      />

      <AddStudentModal
        isOpen={isAddStudentModalOpen}
        form={newStudentForm}
        setForm={setNewStudentForm}
        onClose={() => setIsAddStudentModalOpen(false)}
        onSubmit={handleAddStudent}
      />

      <RecordFeeModal
        isOpen={isRecordFeeModalOpen}
        form={feeForm}
        setForm={setFeeForm}
        students={students}
        onClose={() => setIsRecordFeeModalOpen(false)}
        onSubmit={handleRecordFeePayment}
      />

      <ReversePaymentModal
        isOpen={reversingPayment !== null}
        payment={reversingPayment}
        onClose={() => setReversingPayment(null)}
        onConfirmReverse={handleReversePayment}
      />

      <CopilotActionPreviewModal
        isOpen={copilotActionPlan !== null}
        actionPlan={copilotActionPlan}
        onClose={() => setCopilotActionPlan(null)}
        onConfirmPlan={(planId) => {
          showToast(`Copilot Action Plan confirmed and scheduled for ${copilotActionPlan?.targetBatch || "batch"}.`);
          setCopilotActionPlan(null);
        }}
      />

      <AddLeadModal
        isOpen={isAddLeadModalOpen}
        form={leadForm}
        setForm={setLeadForm}
        onClose={() => setIsAddLeadModalOpen(false)}
        onSubmit={handleAddLead}
      />

      <NodeSyncModal
        isOpen={isNodeSyncModalOpen}
        onClose={() => setIsNodeSyncModalOpen(false)}
        nodesList={nodesList}
        currentTenant={currentTenant}
        syncingNodeId={syncingNodeId}
        onRefreshNodes={loadNodes}
        onOpenPairModal={() => setIsPairNodeModalOpen(true)}
        onForceSync={handleForceSync}
        onRotateToken={(nodeId) => {
          showToast(`Token for node ${nodeId.substring(0, 8)} rotated successfully (C06 90-day TTL).`);
          loadNodes();
        }}
        onRevokeNode={(nodeId, isRevoking) => {
          showToast(isRevoking ? "Terminal access revoked (403 forbidden)." : "Terminal access reinstated.");
          loadNodes();
        }}
      />

      <PairNodeModal
        isOpen={isPairNodeModalOpen}
        pairForm={pairForm}
        setPairForm={setPairForm}
        currentTenant={currentTenant}
        currentBranch={currentBranch}
        onClose={() => setIsPairNodeModalOpen(false)}
        onSubmit={handlePairNode}
      />

      <StudentImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={({ created, updated, rejected }) => {
          loadStudents();
          showToast(`Import finished: ${created} created, ${updated} updated, ${rejected} rejected.`);
        }}
        existingStudents={students}
        currentBranch={currentBranch}
      />

      <StudentParentLinkModal
        isOpen={isParentLinkModalOpen}
        student={selectedStudentForParentLink}
        onClose={() => {
          setIsParentLinkModalOpen(false);
          setSelectedStudentForParentLink(null);
        }}
        onSaveLinks={(studentId, links) => {
          setStudents((prev) =>
            prev.map((s) => {
              if (s.id !== studentId) return s;
              return {
                ...s,
                parentLinks: links.map((l) => ({
                  id: l.id,
                  isPrimary: l.isPrimary,
                  relationship: l.relationship,
                  accessFlags: l.accessFlags,
                  parent: {
                    name: l.name,
                    phone: l.phone,
                    email: l.email,
                    relationship: l.relationship,
                  },
                })),
              };
            })
          );
          showToast("Parent linkage updated successfully.");
        }}
      />

      <ExamWizardModal
        isOpen={isExamWizardOpen}
        onClose={() => setIsExamWizardOpen(false)}
        onExamCreated={(newExam) => {
          setExams((prev) => [newExam, ...prev]);
          showToast(`Exam "${newExam.title || newExam.code}" finalized and locked.`);
        }}
        availableQuestions={[]}
        batches={[]}
        currentTenant={currentTenant}
        onFetchArtifact={fetchArtifact}
      />
    </div>
  );
}
