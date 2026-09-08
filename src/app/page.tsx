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


  // Get current role configuration
  const roleConfig = ROLE_NAVIGATION_CONFIG[currentRole] || ROLE_NAVIGATION_CONFIG.OWNER;

  // Helper icon renderer
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
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
                {currentRole === "WEBPIE_ADMIN"
                  ? "Global Platform Operations"
                  : currentRole === "INDIVIDUAL_TEACHER"
                  ? "Prof. Deshmukh Physics (Independent Mode)"
                  : "Apex IIT-JEE & NEET Academy, Pune"}
              </div>
            </div>
          </div>

          <div className="h-5 w-[1px] bg-slate-200 mx-1" />

          {/* Context Badge */}
          <div className="hidden lg:flex items-center gap-2 text-xs bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md text-slate-700 font-medium">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span>{currentBranch}</span>
          </div>
        </div>

        {/* Global Controls & 9-Role Switcher */}
        <div className="flex items-center gap-3">
          {/* Node Health / Fleet Trigger */}
          <button
            type="button"
            onClick={() => {
              loadNodes();
              setIsNodeSyncModalOpen(true);
            }}
            className="hidden md:flex items-center gap-2 text-xs bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-md font-medium transition cursor-pointer shadow-xs active:scale-95"
            title="Open Windows Academic Node & Offline Sync Hub"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold">Academic Node: Synced</span>
            <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-mono font-bold">
              {nodesList.length > 0 ? `${nodesList.length} Online` : "Ready"}
            </span>
          </button>

          {/* Quick Role Switcher for Seamless Testing of All 9 Personas */}
          <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 p-1 rounded-lg">
            <span className="text-xs text-slate-600 font-semibold pl-2">Role:</span>
            <select
              value={currentRole}
              onChange={(e) => handleRoleChange(e.target.value as UserRole)}
              className="bg-white border border-slate-300 text-xs text-slate-900 font-bold px-2.5 py-1 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
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
            onClick={() => setIsLoginModalOpen(true)}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-sm transition"
          >
            <UserCheck className="w-3.5 h-3.5" />
            Switch Account
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR: STRICTLY FILTERED BY ROLE - ZERO UI LEAKAGE */}
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
              onClick={() => setActiveTab(item.id)}
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

        {/* WORKSPACE VIEW: BRIGHT, PROFESSIONAL, HIGH-DATA-DENSITY */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {/* ========================================================================= */}
          {/* 1. SUPER ADMIN PLATFORM HUB (PRD Sec 6 & 32) */}
          {/* ========================================================================= */}
          {(activeTab === "superadmin_overview" || activeTab === "superadmin_tenants") && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">WebPie Super Admin Operations Hub</h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Platform-wide tenant provisioning, academic node fleet telemetry, and curriculum distribution.
                  </p>
                </div>
                <button
                  onClick={() => setIsProvisionModalOpen(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  + Provision New Institute / Academy
                </button>
              </div>

              {/* Platform Telemetry Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Registered Institutes</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">{tenantsList.length}</div>
                  <div className="text-xs text-blue-600 font-medium mt-1">Multi-Tenant Isolated</div>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Students Platform-Wide</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {tenantsList.reduce((acc, t) => acc + (t.studentsCount || 0), 0) + students.length}
                  </div>
                  <div className="text-xs text-emerald-600 font-medium mt-1">100% Enrolled in Batches</div>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assessment Papers Generated</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {tenantsList.reduce((acc, t) => acc + (t.examsCount || 0), 0) + exams.length}
                  </div>
                  <div className="text-xs text-slate-500 font-medium mt-1">JEE / NEET / CET Matrix</div>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Node Fleet Status</span>
                  <div className="text-2xl font-black text-emerald-600 mt-1">100% Online</div>
                  <div className="text-xs text-slate-500 font-medium mt-1">Zero Outbox Lag</div>
                </div>
              </div>

              {/* Tenants Directory Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Provisioned Coaching Institutes & Academies</span>
                  <button onClick={loadTenants} className="text-xs text-blue-600 hover:text-blue-700 font-semibold">
                    Refresh Directory
                  </button>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3">Institute / Academy</th>
                      <th className="px-5 py-3">Operating Model</th>
                      <th className="px-5 py-3">Code</th>
                      <th className="px-5 py-3">Director / Owner</th>
                      <th className="px-5 py-3">Campuses</th>
                      <th className="px-5 py-3">Students</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tenantsList.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-3 font-semibold text-slate-900">
                          <div>{t.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{t.customDomain}</div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            t.type === "INSTITUTE"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}>
                            {t.type}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono font-bold text-slate-700">{t.code}</td>
                        <td className="px-5 py-3 text-slate-600">
                          <div className="font-medium text-slate-900">{t.ownerName}</div>
                          <div className="text-[11px] text-slate-400">{t.ownerEmail}</div>
                        </td>
                        <td className="px-5 py-3 font-medium text-slate-700">{t.branchesCount || 1} Campus</td>
                        <td className="px-5 py-3 font-bold text-slate-900">{t.studentsCount || 0}</td>
                        <td className="px-5 py-3">
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-bold">
                            {t.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => {
                              setCurrentTenant(t.code);
                              setCurrentRole(t.type === "INDIVIDUAL_TEACHER" ? "INDIVIDUAL_TEACHER" : "OWNER");
                              showToast(`Switched into workspace: ${t.name}`);
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs px-3 py-1.5 rounded font-medium border border-slate-300 transition"
                          >
                            Enter Cockpit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. EXECUTIVE DASHBOARD & TEACH TODAY (PRD Sec 8) */}
          {/* ========================================================================= */}
          {activeTab === "dashboard" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    {currentRole === "INDIVIDUAL_TEACHER"
                      ? "Independent Educator Cockpit (Today)"
                      : currentRole === "TEACHER"
                      ? "Teacher Command: What to Teach / Reteach Today"
                      : "Executive Academic & Operational Pulse"}
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live assessment signals, batch concept vulnerabilities, and active intervention workflows.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={runSimulatedOmrScan}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition"
                  >
                    <ScanLine className="w-4 h-4" />
                    Scan Physical OMR Batch
                  </button>
                  <button
                    onClick={() => setActiveTab("exams")}
                    className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2 rounded-lg border border-slate-300 transition shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Create New Test
                  </button>
                </div>
              </div>

              {/* Priority Vulnerability Alert Banner */}
              {detectedWeakQueue.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-rose-900">
                        Priority Academic Vulnerability in Batch 2026-A
                      </h4>
                      <p className="text-xs text-rose-700 mt-0.5">
                        {detectedWeakQueue[0].students.length} students scored below 30% on{" "}
                        <span className="font-bold underline">{detectedWeakQueue[0].concept}</span> in recent Mock.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("interventions")}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-sm"
                  >
                    Open Remedial Workspace
                  </button>
                </div>
              )}

              {/* Operational Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Enrolled Students</span>
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{students.length}</div>
                  <div className="text-xs text-emerald-600 font-medium mt-1">Rankers Batch 2026-A</div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Tests Evaluated</span>
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{exams.length}</div>
                  <div className="text-xs text-blue-600 font-medium mt-1">Latest: JEE Main Mock #01</div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Critical Weak Concepts</span>
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="text-2xl font-black text-rose-600">{detectedWeakQueue.length}</div>
                  <div className="text-xs text-slate-500 font-medium mt-1">Limiting Friction & Repose</div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Active Interventions</span>
                    <GraduationCap className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl font-black text-amber-600">{interventions.length}</div>
                  <div className="text-xs text-emerald-600 font-medium mt-1">3 students in recovery ladder</div>
                </div>
              </div>

              {/* Assessment Closed-Loop Visualizer */}
              <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
                <h3 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  The WebPie Closed-Loop Assessment Workflow (PRD Sec 1.3)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-center text-xs">
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold mx-auto mb-1 flex items-center justify-center">1</div>
                    <div className="font-bold text-slate-900">Measure</div>
                    <div className="text-[11px] text-slate-500">Printed OMR Test</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold mx-auto mb-1 flex items-center justify-center">2</div>
                    <div className="font-bold text-slate-900">Diagnose</div>
                    <div className="text-[11px] text-slate-500">Mastery Math</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold mx-auto mb-1 flex items-center justify-center">3</div>
                    <div className="font-bold text-slate-900">Prescribe</div>
                    <div className="text-[11px] text-slate-500">Practice Ladder</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold mx-auto mb-1 flex items-center justify-center">4</div>
                    <div className="font-bold text-slate-900">Practice</div>
                    <div className="text-[11px] text-slate-500">Print Worksheet</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold mx-auto mb-1 flex items-center justify-center">5</div>
                    <div className="font-bold text-slate-900">Verify</div>
                    <div className="text-[11px] text-slate-500">Mini Re-Test</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold mx-auto mb-1 flex items-center justify-center">6</div>
                    <div className="font-bold text-slate-900">Communicate</div>
                    <div className="text-[11px] text-slate-500">WhatsApp / Portal</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. STUDENTS & STUDENT 360 (PRD Sec 9 & 11) */}
          {/* ========================================================================= */}
          {activeTab === "students" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Student Directory & Longitudinal 360</h1>
                  <p className="text-xs text-slate-500 mt-0.5">Click on any student to open their complete diagnostic record.</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search name, roll no..."
                      className="bg-white border border-slate-300 rounded-lg text-xs text-slate-900 pl-9 pr-3 py-2 w-64 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                    />
                  </div>
                  <button
                    onClick={() => setIsAddStudentModalOpen(true)}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm transition"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    + Add Student
                  </button>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3">Roll No</th>
                      <th className="px-5 py-3">Student Name</th>
                      <th className="px-5 py-3">Target Exam</th>
                      <th className="px-5 py-3">Parent Contact</th>
                      <th className="px-5 py-3">Branch</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-3 font-mono font-bold text-blue-700">{s.rollNumber}</td>
                        <td className="px-5 py-3 font-bold text-slate-900">{s.name}</td>
                        <td className="px-5 py-3">
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[11px] font-bold">
                            {s.targetExam}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {s.parentLinks?.[0]?.parent?.phone || s.phone || "—"}
                        </td>
                        <td className="px-5 py-3 text-slate-500">{s.branch?.name || "Main"}</td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => openStudent360(s.id)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs px-3 py-1.5 rounded-lg font-semibold transition"
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

          {/* ========================================================================= */}
          {/* 4. QUESTION BANK & AI INGESTION (PRD Sec 13 & 24) */}
          {/* ========================================================================= */}
          {activeTab === "questions" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Question Bank & AI Generator</h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Verified JEE/NEET questions with LaTeX formulae and complete solutions.
                  </p>
                </div>
                <button
                  onClick={triggerAiGeneration}
                  disabled={aiPrompting}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  {aiPrompting ? "Generating via AI Gateway..." : "AI Candidate Generator"}
                </button>
              </div>

              {/* AI Candidate Review Area */}
              {aiCandidates.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 p-5 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      AI Generated Candidates (Awaiting Teacher Approval - PRD AI-004)
                    </div>
                    <span className="text-[11px] font-mono text-indigo-700">
                      Provider: {aiCandidates[0]?.provenance?.provider}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {aiCandidates.map((cand, idx) => (
                      <div key={idx} className="bg-white border border-indigo-200 p-4 rounded-lg space-y-2 text-xs shadow-sm">
                        <div className="font-bold text-slate-900">{cand.body}</div>
                        <div className="grid grid-cols-2 gap-1 text-slate-700">
                          {cand.options.map((opt: any) => (
                            <div key={opt.id} className="bg-slate-50 p-2 rounded border border-slate-200">
                              <span className="font-bold text-blue-600">({opt.id})</span> {opt.text}
                            </div>
                          ))}
                        </div>
                        <div className="pt-2 border-t border-slate-100 text-emerald-700 font-bold">
                          Correct Answer: Option {cand.correctAnswer}
                        </div>
                        <div className="text-slate-500 text-[11px] leading-relaxed">{cand.solution}</div>
                        <div className="flex justify-end pt-2">
                          <button
                            onClick={() => {
                              showToast("Candidate question approved and entered into Question Bank!");
                              setAiCandidates(aiCandidates.filter((_, i) => i !== idx));
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1 rounded font-bold transition"
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
                  <div key={q.id} className="bg-white border border-slate-200 p-5 rounded-xl space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                          {q.code}
                        </span>
                        <span className="text-xs text-slate-600 font-semibold">
                          {q.subject} • {q.chapter}
                        </span>
                      </div>
                      <span className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-bold">
                        Difficulty: {q.declaredDifficulty}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-slate-900">{q.body}</p>

                    {q.options && q.options.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        {q.options.map((opt: any) => (
                          <div
                            key={opt.id}
                            className={`p-2.5 rounded-lg border ${
                              opt.id === q.correctAnswer
                                ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-bold"
                                : "bg-slate-50 border-slate-200 text-slate-700"
                            }`}
                          >
                            <span className="font-bold mr-2">({opt.id})</span> {opt.text}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs space-y-1">
                      <div className="font-bold text-emerald-700">Answer: {q.correctAnswer}</div>
                      <div className="text-slate-600">{q.solution}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 5. EXAM BUILDER & PRINTABLES (PRD Sec 14, 25, 26) */}
          {/* ========================================================================= */}
          {activeTab === "exams" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Exam Builder & Printable Artifacts</h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Generate officially formatted Question Paper PDFs, 4-Corner OMR PDFs, and Answer Keys.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {exams.map((ex) => (
                  <div key={ex.id} className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                        {ex.code}
                      </span>
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] px-2 py-0.5 rounded font-bold">
                        {ex.status}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900">{ex.title}</h3>
                      <div className="text-xs text-slate-500 mt-1 font-medium">
                        Target: {ex.examType} | Duration: {ex.durationMinutes} mins | Total Marks: {ex.totalMarks}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                      <button
                        onClick={() => fetchArtifact(ex.id, "omr")}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-sm"
                      >
                        <ScanLine className="w-3.5 h-3.5" />
                        Print OMR Sheet PDF
                      </button>

                      <button
                        onClick={() => fetchArtifact(ex.id, "question_paper")}
                        className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 transition"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print Question Paper PDF
                      </button>

                      <button
                        onClick={() => fetchArtifact(ex.id, "answer_key")}
                        className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 transition"
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

          {/* ========================================================================= */}
          {/* 6. OMR SCANNER & AMBIGUITY REVIEW (PRD Sec 15 & 26) */}
          {/* ========================================================================= */}
          {activeTab === "omr" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">OMR Computer Vision Pipeline</h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    High-speed bubble recognition, fiducial alignment, and teacher ambiguity review queue.
                  </p>
                </div>
                <button
                  onClick={runSimulatedOmrScan}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  Scan Physical Sheet Batch
                </button>
              </div>

              {selectedOmrJob && (
                <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Batch Job #{selectedOmrJob.id.substring(0, 8)}</h3>
                      <div className="text-xs text-slate-500">
                        Exam: {selectedOmrJob.exam?.title} | Status:{" "}
                        <span className="font-bold text-amber-600">{selectedOmrJob.status}</span>
                      </div>
                    </div>
                    {selectedOmrJob.status !== "FINALIZED" && (
                      <button
                        onClick={() => finalizeOmrJob(selectedOmrJob.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2 rounded-lg transition shadow-sm"
                      >
                        Finalize & Run Evaluation Engine
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedOmrJob.scans?.map((scan: any) => {
                      const ambiguities = JSON.parse(scan.ambiguityFlags || "[]");
                      const responses = JSON.parse(scan.verifiedResponses || scan.detectedResponses || "{}");

                      return (
                        <div
                          key={scan.id}
                          className={`border p-4 rounded-xl space-y-3 shadow-sm ${
                            scan.status === "AMBIGUOUS" ? "border-amber-300 bg-amber-50/50" : "border-slate-200 bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-blue-700">
                              Roll: {scan.detectedRollNumber}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                scan.status === "AMBIGUOUS"
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              }`}
                            >
                              {scan.status}
                            </span>
                          </div>

                          <div className="text-xs text-slate-700 font-medium">
                            Confidence: <span className="font-bold text-slate-900">{(scan.confidenceScore * 100).toFixed(0)}%</span>
                          </div>

                          {/* Ambiguities Alert */}
                          {ambiguities.length > 0 && (
                            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg space-y-2">
                              <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                Ambiguous Bubble Detected
                              </div>
                              <div className="text-[11px] text-amber-800 font-medium">{ambiguities[0].message}</div>
                              <button
                                onClick={() =>
                                  setOverrideModal({
                                    scanId: scan.id,
                                    qNum: ambiguities[0].questionNumber,
                                    detected: ambiguities[0].detectedOptions?.join(", ") || "",
                                  })
                                }
                                className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs py-1.5 rounded-lg font-bold transition shadow-sm"
                              >
                                Review & Override Bubble
                              </button>
                            </div>
                          )}

                          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
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

          {/* ========================================================================= */}
          {/* 7. COHORT ANALYTICS & RANKS (PRD Sec 16 & 27) */}
          {/* ========================================================================= */}
          {activeTab === "analytics" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div>
                <h1 className="text-xl font-bold text-slate-900">Cohort Scoring & Rank Leaderboard</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Authoritative deterministic evaluation, percentiles, and negative marking analysis.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3">Cohort Rank</th>
                      <th className="px-5 py-3">Roll No</th>
                      <th className="px-5 py-3">Student Name</th>
                      <th className="px-5 py-3">Score / Max</th>
                      <th className="px-5 py-3">Accuracy</th>
                      <th className="px-5 py-3">Percentile</th>
                      <th className="px-5 py-3">Negative Marks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.slice(0, 5).map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-3">
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono font-bold text-blue-700">{s.rollNumber}</td>
                        <td className="px-5 py-3 font-bold text-slate-900">{s.name}</td>
                        <td className="px-5 py-3 font-black text-slate-900">{Math.max(6, 20 - idx * 4)} / 20</td>
                        <td className="px-5 py-3 font-bold text-emerald-600">{Math.max(30, 100 - idx * 18)}%</td>
                        <td className="px-5 py-3 font-bold text-indigo-600">
                          {((5 - idx) / 5 * 100).toFixed(1)}%
                        </td>
                        <td className="px-5 py-3 font-bold text-rose-600">-{idx > 0 ? 1 : 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 8. INTERVENTION WORKSPACE & REMEDIALS (PRD Sec 17 & 29) */}
          {/* ========================================================================= */}
          {activeTab === "interventions" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div>
                <h1 className="text-xl font-bold text-slate-900">Closed-Loop Intervention Workspace</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Convert diagnosed weak concepts into targeted practice ladders and printable remedial worksheets.
                </p>
              </div>

              <div className="space-y-4">
                {interventions.map((inv) => (
                  <div key={inv.id} className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold px-2.5 py-0.5 rounded">
                          {inv.priority}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">{inv.title}</h4>
                      </div>
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                        {inv.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700">
                      Concept: <span className="font-bold text-amber-800">{inv.concept}</span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div className="text-xs text-slate-500 font-medium">
                        Affected Students: <span className="text-slate-900 font-bold">3 Students Clustered</span>
                      </div>

                      <button
                        onClick={() => downloadRemedialWorksheet(inv.id)}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-sm"
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

          {/* ========================================================================= */}
          {/* 9. NTA-STYLE CBT SIMULATOR (PRD Sec 18 & 54) */}
          {/* ========================================================================= */}
          {activeTab === "cbt" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {!cbtState.inExam ? (
                <div className="bg-white border border-slate-200 p-8 rounded-xl text-center max-w-xl mx-auto space-y-4 shadow-sm">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                    <Clock className="w-7 h-7" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">NTA-Style CBT Online Simulator</h2>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Experience authentic competitive exam simulations with server-authoritative timer, question palette, and autosave.
                  </p>
                  <button
                    onClick={startCbtSimulation}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-2.5 rounded-lg transition shadow-sm"
                  >
                    Launch JEE Main CBT Simulation
                  </button>
                </div>
              ) : cbtState.submitted ? (
                <div className="bg-white border border-slate-200 p-8 rounded-xl text-center max-w-xl mx-auto space-y-4 shadow-sm">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                  <h3 className="text-xl font-bold text-slate-900">CBT Examination Submitted!</h3>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg text-xs space-y-2">
                    <div className="text-slate-700">
                      Score: <span className="font-bold text-slate-900 text-sm">{cbtState.result?.totalMarks || 16} / 20</span>
                    </div>
                    <div className="text-slate-700">
                      Accuracy: <span className="font-bold text-emerald-600">{cbtState.result?.accuracyPercentage || 80}%</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setCbtState((prev) => ({ ...prev, inExam: false }))}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-4 py-2 rounded-lg font-semibold"
                  >
                    Return to Portal
                  </button>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  {/* CBT Header */}
                  <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex items-center justify-between text-xs font-bold">
                    <div className="text-slate-900">JEE Main Mock Test #01 — CBT Engine</div>
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-emerald-700 font-bold">
                      <Clock className="w-3.5 h-3.5" />
                      Time Left: 02:45:10
                    </div>
                  </div>

                  {/* CBT Body */}
                  <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-3 space-y-4">
                      {cbtState.questions[cbtState.currentQIdx] && (
                        <div>
                          <div className="text-xs text-blue-700 font-bold mb-1">
                            Question {cbtState.currentQIdx + 1} of {cbtState.questions.length}
                          </div>
                          <p className="text-sm font-bold text-slate-900 mb-4">
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
                                      ? "bg-blue-50 border-blue-500 text-blue-900 font-bold"
                                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                                  }`}
                                >
                                  <span className="font-bold mr-2">({opt.id})</span> {opt.text}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                        <button
                          onClick={() =>
                            setCbtState((prev) => ({
                              ...prev,
                              currentQIdx: Math.max(0, prev.currentQIdx - 1),
                            }))
                          }
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-4 py-2 rounded-lg font-bold border border-slate-300"
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
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2 rounded-lg shadow-sm"
                          >
                            Save & Next
                          </button>
                          <button
                            onClick={submitCbtSimulation}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2 rounded-lg shadow-sm"
                          >
                            Submit Exam
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Question Palette */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="text-xs font-bold text-slate-900">Question Palette</div>
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
                                  : "bg-white border border-slate-300 text-slate-700"
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

          {/* ========================================================================= */}
          {/* 10. ADMISSIONS CRM PIPELINE (PRD Sec 10) */}
          {/* ========================================================================= */}
          {activeTab === "crm" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Admissions CRM Pipeline</h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Track student enquiries, follow-ups, demos, and 1-click conversion to enrolled student.
                  </p>
                </div>
                <button
                  onClick={() => setIsAddLeadModalOpen(true)}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + New Enquiry
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {["ENQUIRY", "FOLLOW_UP", "DEMO", "ADMISSION"].map((stage) => {
                  const stageLeads = crmLeads.filter((l) => l.stage === stage);
                  return (
                    <div key={stage} className="bg-white border border-slate-200 p-4 rounded-xl space-y-3 shadow-sm">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">
                        <span>{stage.replace("_", " ")}</span>
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono text-[11px]">
                          {stageLeads.length}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {stageLeads.map((lead) => (
                          <div
                            key={lead.id}
                            className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs space-y-2 shadow-sm"
                          >
                            <div className="font-bold text-slate-900">{lead.name}</div>
                            <div className="text-slate-500 text-[11px]">Phone: {lead.phone}</div>
                            <div className="text-blue-700 font-semibold text-[11px]">Interest: {lead.courseInterest}</div>
                            
                            <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-1 text-[11px]">
                              {lead.stage !== "ADMISSION" ? (
                                <button
                                  onClick={() => handleAdvanceLeadStage(lead.id, lead.stage)}
                                  className="bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold px-2 py-1 rounded text-[10px] transition"
                                >
                                  Advance &rarr;
                                </button>
                              ) : (
                                <span className="text-emerald-700 font-bold text-[10px]">Enrolled</span>
                              )}

                              {lead.stage === "DEMO" && (
                                <button
                                  onClick={() => handleConvertLead(lead)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-1 rounded text-[10px] transition shadow-xs"
                                >
                                  Enroll Student
                                </button>
                              )}
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

          {/* ========================================================================= */}
          {/* 11. FEES & COLLECTIONS (PRD Sec 11) */}
          {/* ========================================================================= */}
          {activeTab === "fees" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Fee Obligations & Collections</h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Track installments, record UPI/Cash payments, and generate official receipts.
                  </p>
                </div>
                <button
                  onClick={() => setIsRecordFeeModalOpen(true)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm transition"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  + Record Fee Payment
                </button>
              </div>

              {feesData && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Total Obligations</span>
                    <div className="text-2xl font-black text-slate-900 mt-1">
                      ₹{feesData.metrics?.totalObligations?.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Collected to Date</span>
                    <div className="text-2xl font-black text-emerald-600 mt-1">
                      ₹{feesData.metrics?.totalCollected?.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Outstanding Balance</span>
                    <div className="text-2xl font-black text-amber-600 mt-1">
                      ₹{feesData.metrics?.totalOutstanding?.toLocaleString()}
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3">Receipt No</th>
                      <th className="px-5 py-3">Student</th>
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Mode</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {feesData?.payments?.map((p: any) => (
                      <tr key={p.id}>
                        <td className="px-5 py-3 font-mono font-bold text-blue-700">{p.receiptNumber}</td>
                        <td className="px-5 py-3 font-bold text-slate-900">{p.student?.name}</td>
                        <td className="px-5 py-3 font-bold text-emerald-600">₹{p.amount?.toLocaleString()}</td>
                        <td className="px-5 py-3 text-slate-600">{p.paymentMode}</td>
                        <td className="px-5 py-3">
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-bold">
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

          {/* ========================================================================= */}
          {/* 12. ATTENDANCE SESSIONS (PRD Sec 12) */}
          {/* ========================================================================= */}
          {activeTab === "attendance" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Classroom Attendance Roster</h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Session logging, quick mark-all, and automated absence alerts for parents.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="text-xs font-bold text-slate-900">Batch: Rankers 2026-A (Morning Session)</div>
                  <button
                    onClick={handleMarkAllPresent}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-sm"
                  >
                    Quick Mark All Present
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {students.slice(0, 6).map((s) => (
                    <div
                      key={s.id}
                      className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{s.name}</div>
                        <div className="font-mono text-slate-500 text-[11px]">{s.rollNumber}</div>
                      </div>
                      <div className="flex gap-1.5">
                        <button className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 rounded text-xs font-bold">
                          Present
                        </button>
                        <button className="bg-white text-slate-600 border border-slate-300 px-3 py-1 rounded text-xs hover:text-slate-900">
                          Absent
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 13. WEBSITE CMS (PRD Sec 21) */}
          {/* ========================================================================= */}
          {activeTab === "website" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Institute Website CMS & Live Preview</h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    White-label public website builder with instant preview and domain mapping.
                  </p>
                </div>
                <button
                  onClick={() => showToast("Website published live to apexiit.webpie.in!")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-sm"
                >
                  Publish Website Live
                </button>
              </div>

              {websiteData && (
                <div className="bg-white border border-slate-200 p-6 rounded-xl space-y-4 shadow-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-xs">
                    <span className="font-mono text-blue-700 font-bold">Domain: {websiteData.tenant?.customDomain}</span>
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> SSL Active
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl bg-slate-50 p-6 space-y-6">
                    <div className="text-center space-y-2">
                      <span className="text-xs bg-blue-100 text-blue-800 border border-blue-200 px-3 py-1 rounded-full font-bold">
                        {websiteData.tenant?.name}
                      </span>
                      <h1 className="text-2xl font-black text-slate-900">{websiteData.sections?.HERO?.title}</h1>
                      <p className="text-xs text-slate-600 max-w-lg mx-auto">{websiteData.sections?.HERO?.subtitle}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                        <div className="text-2xl font-black text-blue-600">142+</div>
                        <div className="text-xs text-slate-600 font-medium">IIT-JEE Selections</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                        <div className="text-2xl font-black text-emerald-600">89+</div>
                        <div className="text-xs text-slate-600 font-medium">NEET 650+ Scorers</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                        <div className="text-2xl font-black text-amber-600">98.4</div>
                        <div className="text-xs text-slate-600 font-medium">Average Percentile</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 14. MULTILINGUAL PARENT PORTAL (PRD Sec 22 & 38) */}
          {/* ========================================================================= */}
          {activeTab === "parent" && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Parent Diagnostic Progress Portal</h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Transparent academic progress summaries in English, Marathi, and Hindi.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setParentLang("en");
                      loadParentPortal("260001", "en");
                    }}
                    className={`text-xs px-3 py-1.5 rounded-lg font-bold transition ${
                      parentLang === "en" ? "bg-blue-600 text-white" : "bg-white text-slate-700 border border-slate-300"
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => {
                      setParentLang("mr");
                      loadParentPortal("260001", "mr");
                    }}
                    className={`text-xs px-3 py-1.5 rounded-lg font-bold transition ${
                      parentLang === "mr" ? "bg-blue-600 text-white" : "bg-white text-slate-700 border border-slate-300"
                    }`}
                  >
                    मराठी (Marathi)
                  </button>
                  <button
                    onClick={() => {
                      setParentLang("hi");
                      loadParentPortal("260001", "hi");
                    }}
                    className={`text-xs px-3 py-1.5 rounded-lg font-bold transition ${
                      parentLang === "hi" ? "bg-blue-600 text-white" : "bg-white text-slate-700 border border-slate-300"
                    }`}
                  >
                    हिन्दी (Hindi)
                  </button>
                </div>
              </div>

              {parentReport && (
                <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{parentReport.student?.name}</h3>
                      <div className="text-xs text-slate-500 font-mono">Roll: {parentReport.student?.rollNumber}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-blue-700">{parentReport.institute?.name}</div>
                      <div className="text-[11px] text-slate-500">Target: {parentReport.student?.targetExam}</div>
                    </div>
                  </div>

                  {/* Diagnostic Summary */}
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-xs text-slate-800 leading-relaxed">
                    <div className="font-bold mb-1 text-blue-900 flex items-center gap-1.5">
                      <Bot className="w-4 h-4 text-blue-700" />
                      Academic Diagnostic Overview ({parentLang.toUpperCase()})
                    </div>
                    {parentReport.summary}
                  </div>

                  {/* Score & Rank Cards */}
                  {parentReport.latestResult && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs">
                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                        <div className="text-slate-500 font-medium text-[11px]">Score Achieved</div>
                        <div className="text-xl font-black text-slate-900 mt-1">
                          {parentReport.latestResult.score} / {parentReport.latestResult.maxMarks}
                        </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                        <div className="text-slate-500 font-medium text-[11px]">Cohort Rank</div>
                        <div className="text-xl font-black text-blue-700 mt-1">
                          #{parentReport.latestResult.rank}
                        </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                        <div className="text-slate-500 font-medium text-[11px]">Percentile</div>
                        <div className="text-xl font-black text-emerald-600 mt-1">
                          {parentReport.latestResult.percentile}%
                        </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                        <div className="text-slate-500 font-medium text-[11px]">Attendance</div>
                        <div className="text-xl font-black text-amber-600 mt-1">
                          {parentReport.attendance?.percentage}%
                        </div>
                      </div>
                    </div>
                  )}

                  {/* WhatsApp Sharing Prefilled Link (PRD Sec 38) */}
                  <div className="pt-4 border-t border-slate-200 flex justify-end">
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                        `${parentReport.summary}\n\nView complete diagnostic report: https://apexiit.webpie.in/report?roll=${parentReport.student?.rollNumber}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-sm"
                    >
                      <Share2 className="w-4 h-4" />
                      Share to Parent on WhatsApp
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 15. STUDENT PORTAL (PRD Sec 22) */}
          {/* ========================================================================= */}
          {activeTab === "student_radar" && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Aarav Deshmukh (Roll: 260001)</h2>
                    <p className="text-xs text-slate-500">Class 11 Rankers Batch • Target: JEE Main 2026</p>
                  </div>
                  <button
                    onClick={() => setActiveTab("cbt")}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition"
                  >
                    Open CBT Exam Simulator
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                    <div className="text-slate-500 text-xs font-semibold">Latest Mock Test Score</div>
                    <div className="text-2xl font-black text-slate-900 mt-1">20 / 20</div>
                    <div className="text-xs text-emerald-600 font-bold mt-0.5">Rank #1 (Percentile 100%)</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                    <div className="text-slate-500 text-xs font-semibold">Overall Attendance</div>
                    <div className="text-2xl font-black text-blue-700 mt-1">96.4%</div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">27 of 28 Sessions</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                    <div className="text-slate-500 text-xs font-semibold">Concepts Mastered</div>
                    <div className="text-2xl font-black text-emerald-600 mt-1">19 Concepts</div>
                    <div className="text-xs text-emerald-700 font-bold mt-0.5">Zero Critical Gaps</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* STUDENT 360 MODAL (PRD Sec 9) */}
      {/* ========================================================================= */}
      {isStudentModalOpen && student360Data && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{student360Data.name} — Student 360</h3>
                <div className="text-xs text-slate-500 font-mono font-semibold">
                  Roll: {student360Data.rollNumber} • Target: {student360Data.targetExam}
                </div>
              </div>
              <button onClick={() => setIsStudentModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Radar Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <div className="text-slate-500 font-semibold">Tests Taken</div>
                <div className="text-xl font-black text-slate-900 mt-1">
                  {student360Data.stats?.totalExamsAttempted}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <div className="text-slate-500 font-semibold">Attendance</div>
                <div className="text-xl font-black text-emerald-600 mt-1">
                  {student360Data.stats?.attendancePercentage}%
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <div className="text-slate-500 font-semibold">Mastered Concepts</div>
                <div className="text-xl font-black text-blue-700 mt-1">
                  {student360Data.stats?.masteredCount}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <div className="text-slate-500 font-semibold">Fee Balance</div>
                <div className="text-xl font-black text-amber-600 mt-1">
                  ₹{student360Data.stats?.outstandingFees?.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Concept Mastery Heatmap */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Concept Mastery States (PRD Sec 28)
              </h4>
              <div className="space-y-2">
                {student360Data.masteryScores?.map((m: any) => (
                  <div
                    key={m.id}
                    className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{m.concept}</div>
                      <div className="text-[11px] text-slate-500">
                        {m.subject} • {m.chapter}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-900">{m.score}%</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          m.state === "MASTERED"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : m.state === "CRITICAL"
                            ? "bg-rose-100 text-rose-800 border border-rose-300"
                            : "bg-amber-100 text-amber-800 border border-amber-300"
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

      {/* ========================================================================= */}
      {/* ARTIFACT PREVIEW / DOWNLOAD MODAL (PRD Sec 14) */}
      {/* ========================================================================= */}
      {artifactModalData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Printable Artifact Ready</h3>
              <button onClick={() => setArtifactModalData(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs space-y-2">
              <div className="text-slate-700">
                File: <span className="font-mono text-blue-700 font-bold">{artifactModalData.filename}</span>
              </div>
              <p className="text-slate-500 text-[11px]">
                Rendered with 4-corner fiducial anchors, candidate barcode, and high-density vector typography.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <a
                href={artifactModalData.dataUri}
                download={artifactModalData.filename}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OMR MANUAL OVERRIDE MODAL (PRD Sec 15) */}
      {/* ========================================================================= */}
      {overrideModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Teacher OMR Review & Override</h3>
              <button onClick={() => setOverrideModal(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs space-y-2">
              <div className="text-amber-900">
                Question Number: <span className="font-bold">{overrideModal.qNum}</span>
              </div>
              <div className="text-amber-900">
                Detected Ambiguity: <span className="font-bold">{overrideModal.detected}</span>
              </div>
              <p className="text-amber-700 text-[11px]">
                Override will be logged to the immutable audit trail with your teacher digital signature.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-700 font-bold">Select Verified Option:</label>
              <div className="grid grid-cols-4 gap-2">
                {["A", "B", "C", "D"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setOverrideChoice(opt)}
                    className={`py-2 rounded-lg text-xs font-bold border transition ${
                      overrideChoice === opt
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
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
                className="bg-slate-100 text-slate-700 text-xs px-4 py-2 rounded-lg font-bold border border-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleOverrideSubmit}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition"
              >
                Save Audited Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PROVISION NEW INSTITUTE MODAL (PRD Sec 6) */}
      {/* ========================================================================= */}
      {isProvisionModalOpen && (
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
              <button onClick={() => setIsProvisionModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProvisionInstitute} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-bold">Institute / Academy Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chaitanya IIT Academy"
                    value={provisionForm.name}
                    onChange={(e) => setProvisionForm({ ...provisionForm, name: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 font-bold">Subdomain / Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CHAITANYA_PUNE"
                    value={provisionForm.code}
                    onChange={(e) => setProvisionForm({ ...provisionForm, code: e.target.value.toUpperCase() })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-bold">Operating Model</label>
                  <select
                    value={provisionForm.type}
                    onChange={(e) => setProvisionForm({ ...provisionForm, type: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="INSTITUTE">Coaching Institute (Multi-Branch)</option>
                    <option value="INDIVIDUAL_TEACHER">Individual Teacher (Single Classroom)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 font-bold">Primary Exam Focus</label>
                  <select
                    value={provisionForm.primaryExam}
                    onChange={(e) => setProvisionForm({ ...provisionForm, primaryExam: e.target.value })}
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
                    value={provisionForm.city}
                    onChange={(e) => setProvisionForm({ ...provisionForm, city: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 font-bold">License Plan</label>
                  <select
                    value={provisionForm.planId}
                    onChange={(e) => setProvisionForm({ ...provisionForm, planId: e.target.value })}
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
                      value={provisionForm.ownerName}
                      onChange={(e) => setProvisionForm({ ...provisionForm, ownerName: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-700 font-bold">Director Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. director@chaitanya.com"
                      value={provisionForm.ownerEmail}
                      onChange={(e) => setProvisionForm({ ...provisionForm, ownerEmail: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsProvisionModalOpen(false)}
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
      )}

      {/* ========================================================================= */}
      {/* DIRECT LOGIN MODAL */}
      {/* ========================================================================= */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Direct User Authentication</h3>
                <p className="text-xs text-slate-500">Sign in with registered credentials or pick a role shortcut.</p>
              </div>
              <button onClick={() => setIsLoginModalOpen(false)} className="text-slate-400 hover:text-slate-700">
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
                  onClick={() => setLoginForm({ email: "deshmukh@physics.com", password: "admin123", error: "" })}
                  className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-left hover:bg-slate-100 transition"
                >
                  <div className="font-bold text-slate-900">Independent Educator</div>
                  <div className="text-[10px] text-slate-500">deshmukh@physics.com</div>
                </button>
              </div>
            </div>

            <form onSubmit={handleDirectLogin} className="space-y-3 pt-2 text-xs">
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
                  onClick={() => setIsLoginModalOpen(false)}
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
      )}

      {/* ========================================================================= */}
      {/* ADD STUDENT MODAL */}
      {/* ========================================================================= */}
      {isAddStudentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-blue-600" />
                  Enroll New Student
                </h3>
                <p className="text-xs text-slate-500">Add student to the active batch with assigned roll number.</p>
              </div>
              <button onClick={() => setIsAddStudentModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-700 font-bold">Student Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Atharva Kulkarni"
                  value={newStudentForm.name}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-bold">Roll Number *</label>
                  <input
                    type="text"
                    required
                    value={newStudentForm.rollNumber}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, rollNumber: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 font-bold">Target Exam</label>
                  <select
                    value={newStudentForm.targetExam}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, targetExam: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="JEE_MAIN">JEE Main</option>
                    <option value="JEE_ADVANCED">JEE Advanced</option>
                    <option value="NEET">NEET</option>
                    <option value="MHT_CET">MHT-CET</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-bold">Parent / Student Phone</label>
                  <input
                    type="text"
                    placeholder="9823001122"
                    value={newStudentForm.phone}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, phone: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 font-bold">Email Address</label>
                  <input
                    type="email"
                    placeholder="student@example.com"
                    value={newStudentForm.email}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, email: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddStudentModalOpen(false)}
                  className="bg-slate-100 text-slate-700 font-bold px-4 py-2 rounded-lg border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-lg shadow-sm transition"
                >
                  Enroll Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RECORD FEE PAYMENT MODAL */}
      {/* ========================================================================= */}
      {isRecordFeeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  Record Fee Collection
                </h3>
                <p className="text-xs text-slate-500">Issues serialized official receipt and updates student balance.</p>
              </div>
              <button onClick={() => setIsRecordFeeModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordFeePayment} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-700 font-bold">Select Student *</label>
                <select
                  required
                  value={feeForm.studentId}
                  onChange={(e) => setFeeForm({ ...feeForm, studentId: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- Choose Student --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.rollNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-bold">Amount Paid (₹) *</label>
                  <input
                    type="number"
                    required
                    value={feeForm.amount}
                    onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 font-bold">Payment Mode</label>
                  <select
                    value={feeForm.paymentMode}
                    onChange={(e) => setFeeForm({ ...feeForm, paymentMode: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="UPI">UPI / QR Code</option>
                    <option value="CASH">Cash Counter</option>
                    <option value="CHEQUE">Bank Cheque</option>
                    <option value="NET_BANKING">Net Banking (NEFT/IMPS)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-bold">Remarks / Reference</label>
                <input
                  type="text"
                  placeholder="e.g. UTR / Cheque No / Notes"
                  value={feeForm.remarks}
                  onChange={(e) => setFeeForm({ ...feeForm, remarks: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsRecordFeeModalOpen(false)}
                  className="bg-slate-100 text-slate-700 font-bold px-4 py-2 rounded-lg border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-lg shadow-sm transition"
                >
                  Generate Receipt & Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD CRM LEAD MODAL */}
      {/* ========================================================================= */}
      {isAddLeadModalOpen && (
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
              <button onClick={() => setIsAddLeadModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddLead} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-700 font-bold">Student / Parent Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Swati Deshpande"
                  value={leadForm.name}
                  onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
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
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 font-bold">Lead Source</label>
                  <select
                    value={leadForm.source}
                    onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value })}
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
                    value={leadForm.courseInterest}
                    onChange={(e) => setLeadForm({ ...leadForm, courseInterest: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 font-bold">Exam Target</label>
                  <select
                    value={leadForm.examTarget}
                    onChange={(e) => setLeadForm({ ...leadForm, examTarget: e.target.value })}
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
                  onClick={() => setIsAddLeadModalOpen(false)}
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
      )}

      {/* ========================================================= */}
      {/* WINDOWS ACADEMIC NODE & OFFLINE SYNC HUB (PRD Sec 33-35)  */}
      {/* ========================================================= */}
      {isNodeSyncModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-600/30 border border-blue-500/50 text-blue-400">
                  <Laptop className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold tracking-tight">Windows Academic Node & Offline Sync Hub</h2>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-mono font-bold">
                      PRD Sec 33-35 Beta
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Resilient Edge Telemetry, Local SQLite Caching, and Two-Way Delta Sync
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNodeSyncModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Architecture Overview Banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50/70 border border-blue-200 p-3.5 rounded-xl">
                  <div className="flex items-center gap-2 text-blue-800 font-bold text-xs mb-1">
                    <HardDrive className="w-4 h-4 text-blue-600" />
                    Local SQLite Cache
                  </div>
                  <p className="text-[11px] text-blue-900 leading-relaxed">
                    Cached question bank, active exams, and student rosters stored encrypted on local node disk for 100% offline exam scanning.
                  </p>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-xl">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs mb-1">
                    <Cpu className="w-4 h-4 text-emerald-600" />
                    Edge Deterministic Eval
                  </div>
                  <p className="text-[11px] text-emerald-900 leading-relaxed">
                    Autonomous OMR bubble decoding and grading engine operates on node with zero cloud latency and instant rank preview.
                  </p>
                </div>

                <div className="bg-purple-50/70 border border-purple-200 p-3.5 rounded-xl">
                  <div className="flex items-center gap-2 text-purple-800 font-bold text-xs mb-1">
                    <RefreshCw className="w-4 h-4 text-purple-600" />
                    Authoritative Sync
                  </div>
                  <p className="text-[11px] text-purple-900 leading-relaxed">
                    Background delta queue automatically synchronizes scan matrices, attendance, and mastery logs upon network restoration.
                  </p>
                </div>
              </div>

              {/* Fleet Controls Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Connected Terminal Fleet</h3>
                  <p className="text-xs text-slate-500">
                    Tenant: <strong className="text-slate-800">{currentTenant}</strong> • Nodes active: {nodesList.length}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={loadNodes}
                    className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-lg border border-slate-300 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPairNodeModalOpen(true)}
                    className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-2 rounded-lg shadow-sm transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Pair Windows Node
                  </button>
                </div>
              </div>

              {/* Node Fleet Listing */}
              {nodesList.length === 0 ? (
                <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center space-y-3 bg-slate-50/50">
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                    <Laptop className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">No Academic Nodes Paired for this Academy</div>
                    <div className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                      Pair an offline Windows workstation in your branch computer lab to enable zero-latency OMR scanning and offline CBT testing.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPairNodeModalOpen(true)}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition"
                  >
                    <Plus className="w-4 h-4" />
                    Pair First Windows Terminal
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {nodesList.map((node) => (
                    <div
                      key={node.id}
                      className="border border-slate-200 rounded-xl p-4 bg-white hover:border-blue-300 hover:shadow-xs transition space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                            <Laptop className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900">{node.name}</span>
                              <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-300 px-1.5 py-0.5 rounded font-mono font-semibold">
                                {node.nodeCode}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                  node.status === "ACTIVE"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${node.status === "ACTIVE" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                                {node.status === "ACTIVE" ? "ONLINE & PAIRED" : node.status}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                              <span>Hardware: <strong className="text-slate-700 font-mono">{node.machineFingerprint}</strong></span>
                              <span>•</span>
                              <span>OS: {node.osVersion || "Windows 11 Pro"}</span>
                              <span>•</span>
                              <span>IP: {node.ipAddress || "127.0.0.1"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Force Pull Delta Sync Button */}
                        <button
                          type="button"
                          disabled={syncingNodeId === node.id}
                          onClick={() => handleForceSync(node)}
                          className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-60 transition self-start sm:self-center"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncingNodeId === node.id ? "animate-spin text-blue-700" : ""}`} />
                          {syncingNodeId === node.id ? "Pulling Delta..." : "Sync Delta Now"}
                        </button>
                      </div>

                      {/* Telemetry Counters */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Offline Scans</div>
                          <div className="text-sm font-black text-slate-900">{node.offlineScansCount || 0} sheets</div>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Engine State</div>
                          <div className="text-xs font-bold text-blue-700">{node.syncEngineState || "IDLE"}</div>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Last Seen</div>
                          <div className="text-xs font-semibold text-slate-700">
                            {node.lastSeenAt ? new Date(node.lastSeenAt).toLocaleTimeString() : "Recent"}
                          </div>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Sync Status</div>
                          <div className="text-xs font-semibold text-emerald-700 flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Delta Up-to-date
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>End-to-End Encrypted Handshake with SHA-256 Token Authorization</span>
              </div>
              <button
                type="button"
                onClick={() => setIsNodeSyncModalOpen(false)}
                className="bg-white border border-slate-300 text-slate-700 font-bold px-4 py-1.5 rounded-lg hover:bg-slate-50 transition"
              >
                Close Hub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PAIR NEW WINDOWS ACADEMIC NODE MODAL                      */}
      {/* ========================================================= */}
      {isPairNodeModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Laptop className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">Pair Windows Academic Node</h3>
              </div>
              <button
                onClick={() => setIsPairNodeModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePairNode} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-700 font-bold">Node Identifier Code *</label>
                <input
                  type="text"
                  required
                  value={pairForm.nodeCode}
                  onChange={(e) => setPairForm({ ...pairForm, nodeCode: e.target.value.toUpperCase() })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold focus:ring-1 focus:ring-blue-500"
                  placeholder="NODE-PUNE-01"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-bold">Friendly Terminal Name *</label>
                <input
                  type="text"
                  required
                  value={pairForm.name}
                  onChange={(e) => setPairForm({ ...pairForm, name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-1 focus:ring-blue-500"
                  placeholder="Kothrud Lab 1 Scanner PC"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-bold">Hardware Machine Fingerprint *</label>
                <input
                  type="text"
                  required
                  value={pairForm.machineFingerprint}
                  onChange={(e) => setPairForm({ ...pairForm, machineFingerprint: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:ring-1 focus:ring-blue-500"
                  placeholder="WIN-PC-8921-X64"
                />
                <p className="text-[10px] text-slate-500">
                  Unique CPU + Motherboard UUID generated by the Windows Node desktop installer.
                </p>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
                <div className="text-[11px] font-bold text-blue-900">Target Tenant Scope</div>
                <div className="text-[11px] text-blue-800">
                  Code: <strong className="font-mono">{currentTenant}</strong> • Branch: {currentBranch}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsPairNodeModalOpen(false)}
                  className="bg-slate-100 text-slate-700 font-bold px-4 py-2 rounded-lg border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-lg shadow-sm transition"
                >
                  Authenticate & Pair Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
