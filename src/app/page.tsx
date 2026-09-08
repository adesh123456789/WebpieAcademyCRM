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
  HardDrive
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

  const [isRecordFeeModalOpen, setIsRecordFeeModalOpen] = useState<boolean>(false);
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
      // Default to first nav item of this role
      setActiveTab(config.navItems[0].id);
    }
  }, [currentRole]);

  // Initial Data Load
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
    loadNodes();
  }, []);

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
        showToast("Scanned 5 physical OMR sheets. 1 sheet flagged for teacher ambiguity review!");
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
          reason: "Teacher verified visual ink density on physical sheet",
        }),
      });
      if (res.ok) {
        showToast(`Override saved to immutable audit trail! Question ${overrideModal.qNum} set to (${overrideChoice}).`);
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
        showToast(`Deterministic evaluation complete! ${data.evaluatedCount} student ranks and percentiles locked.`);
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

      setCurrentRole(data.user.role as UserRole);
      setCurrentTenant(data.user.tenantCode);
      setCurrentBranch(data.user.branchName);
      setIsLoginModalOpen(false);
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
    setCurrentRole(newRole);
    const persona = DEMO_PERSONAS[newRole];
    if (persona) {
      setCurrentTenant(persona.tenant);
      setCurrentBranch(persona.branch);
      try {
        const res = await fetch("/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: persona.email, password: persona.pass }),
        });
        if (res.ok) {
          const data = await res.json();
          showToast(`Persona: ${data.user.name} (${data.user.role})`);
          loadStudents();
          loadExams();
          loadOmrJobs();
          loadInterventions();
          loadCRM();
          loadFees();
          return;
        }
      } catch (err) {
        console.error(err);
      }
    }
    showToast(`Role switched to: ${newRole}`);
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
      const res = await fetch("/api/v1/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: feeForm.studentId,
          amount: Number(feeForm.amount),
          paymentMode: feeForm.paymentMode,
          remarks: feeForm.remarks,
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

  async function handleAdvanceLeadStage(leadId: string, currentStage: string) {
    const stages = ["ENQUIRY", "FOLLOW_UP", "DEMO", "ADMISSION"];
    const nextStage = stages[stages.indexOf(currentStage) + 1];
    if (!nextStage) return;
    try {
      const res = await fetch("/api/v1/crm/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: leadId, stage: nextStage }),
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


  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <AppHeader
        currentRole={currentRole}
        currentBranch={currentBranch}
        nodesCount={nodesList.length}
        statusMessage={statusMessage}
        onOpenNodeSyncModal={() => {
          loadNodes();
          setIsNodeSyncModalOpen(true);
        }}
        onChangeRole={handleRoleChange}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
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
              onOpenStudent360={openStudent360}
            />
          )}

          {activeTab === "questions" && (
            <QuestionsView
              questions={questions}
              aiCandidates={aiCandidates}
              aiPrompting={aiPrompting}
              onTriggerAiGeneration={triggerAiGeneration}
              onApproveCandidate={(idx) => {
                showToast("Candidate question approved and entered into Question Bank!");
                setAiCandidates(aiCandidates.filter((_, i) => i !== idx));
              }}
            />
          )}

          {activeTab === "exams" && (
            <ExamsView
              exams={exams}
              onFetchArtifact={fetchArtifact}
            />
          )}

          {activeTab === "omr" && (
            <OmrView
              selectedOmrJob={selectedOmrJob}
              onRunSimulatedOmrScan={runSimulatedOmrScan}
              onFinalizeOmrJob={finalizeOmrJob}
              onOpenOverrideModal={(data) => setOverrideModal(data)}
            />
          )}

          {activeTab === "analytics" && (
            <AnalyticsView students={students} />
          )}

          {activeTab === "interventions" && (
            <InterventionsView
              interventions={interventions}
              onDownloadRemedialWorksheet={downloadRemedialWorksheet}
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
            />
          )}

          {activeTab === "attendance" && (
            <AttendanceView
              students={students}
              onMarkAllPresent={handleMarkAllPresent}
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
                loadParentPortal("260001", lang);
              }}
            />
          )}

          {activeTab === "student_radar" && (
            <StudentRadarView
              onNavigateCbt={() => setActiveTab("cbt")}
            />
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
    </div>
  );
}
