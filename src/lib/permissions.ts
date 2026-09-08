export type UserRole =
  | "WEBPIE_ADMIN"
  | "OWNER"
  | "BRANCH_ADMIN"
  | "TEACHER"
  | "COUNSELLOR"
  | "ACCOUNTANT"
  | "STUDENT"
  | "PARENT"
  | "INDIVIDUAL_TEACHER";

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: string;
}

export const ROLE_NAVIGATION_CONFIG: Record<UserRole, { title: string; subtitle: string; navItems: NavItem[] }> = {
  WEBPIE_ADMIN: {
    title: "WebPie Platform Operations",
    subtitle: "Global SaaS & Fleet Administration",
    navItems: [
      { id: "superadmin_overview", label: "Platform Overview", icon: "LayoutDashboard" },
      { id: "superadmin_tenants", label: "Institutes & Academies", icon: "Building2" },
      { id: "superadmin_curriculum", label: "Global Curriculum Packs", icon: "Layers" },
      { id: "superadmin_nodes", label: "Academic Node Fleet", icon: "Cpu" },
      { id: "superadmin_logs", label: "Security & Audit Logs", icon: "ShieldAlert" },
    ],
  },
  OWNER: {
    title: "Institute Executive Cockpit",
    subtitle: "Multi-Branch Operations & Academic Intelligence",
    navItems: [
      { id: "dashboard", label: "Executive Dashboard", icon: "LayoutDashboard" },
      { id: "students", label: "Student Directory & 360", icon: "Users" },
      { id: "crm", label: "Admissions CRM", icon: "UserPlus" },
      { id: "fees", label: "Fees & Collections", icon: "CreditCard" },
      { id: "attendance", label: "Attendance Logs", icon: "CalendarCheck" },
      { id: "curriculum", label: "Academic Graph", icon: "Layers" },
      { id: "questions", label: "Question Bank & AI", icon: "BookOpen" },
      { id: "exams", label: "Exam Builder & Print", icon: "FileText" },
      { id: "omr", label: "OMR Scanner & Review", icon: "ScanLine" },
      { id: "analytics", label: "Cohort Analytics", icon: "Award" },
      { id: "interventions", label: "Intervention Workspace", icon: "GraduationCap" },
      { id: "website", label: "Institute Website CMS", icon: "Globe" },
    ],
  },
  BRANCH_ADMIN: {
    title: "Campus Operations Console",
    subtitle: "Daily Branch Management & Rosters",
    navItems: [
      { id: "dashboard", label: "Campus Dashboard", icon: "LayoutDashboard" },
      { id: "students", label: "Batch Rosters", icon: "Users" },
      { id: "attendance", label: "Session Attendance", icon: "CalendarCheck" },
      { id: "exams", label: "Scheduled Exams", icon: "FileText" },
      { id: "omr", label: "OMR Scan Ingestion", icon: "ScanLine" },
      { id: "fees", label: "Fee Counter", icon: "CreditCard" },
      { id: "crm", label: "Campus Inquiries", icon: "UserPlus" },
    ],
  },
  TEACHER: {
    title: "Teacher Academic Studio",
    subtitle: "Assessment, Diagnosis & Remediation",
    navItems: [
      { id: "dashboard", label: "Teach Today", icon: "LayoutDashboard" },
      { id: "students", label: "Assigned Batches", icon: "Users" },
      { id: "curriculum", label: "Academic Graph", icon: "Layers" },
      { id: "questions", label: "Question Bank & AI", icon: "BookOpen" },
      { id: "exams", label: "Exam Builder & Print", icon: "FileText" },
      { id: "omr", label: "OMR Processing Queue", icon: "ScanLine" },
      { id: "analytics", label: "Results & Ranks", icon: "Award" },
      { id: "interventions", label: "Remedial Worksheets", icon: "GraduationCap" },
    ],
  },
  COUNSELLOR: {
    title: "Admissions CRM Portal",
    subtitle: "Lead Conversion & Follow-Up Workflow",
    navItems: [
      { id: "crm", label: "CRM Pipeline (Kanban)", icon: "UserPlus" },
      { id: "crm_followups", label: "Today's Follow-ups", icon: "PhoneCall" },
      { id: "students", label: "Enrolled Students", icon: "Users" },
    ],
  },
  ACCOUNTANT: {
    title: "Finance & Accounts Counter",
    subtitle: "Fee Plans, Collections & Audited Receipts",
    navItems: [
      { id: "fees", label: "Fee Collection Counter", icon: "CreditCard" },
      { id: "fees_plans", label: "Student Fee Plans", icon: "Receipt" },
      { id: "fees_defaulters", label: "Outstanding Dues", icon: "AlertCircle" },
      { id: "students", label: "Student Directory", icon: "Users" },
    ],
  },
  STUDENT: {
    title: "Student Learning Portal",
    subtitle: "Concept Mastery & Exam Simulations",
    navItems: [
      { id: "student_radar", label: "My Learning Radar", icon: "Compass" },
      { id: "student_results", label: "Exam History & Reports", icon: "Award" },
      { id: "cbt", label: "NTA-Style CBT Simulator", icon: "Clock" },
      { id: "student_practice", label: "Remedial Practice", icon: "FileEdit" },
      { id: "student_finance", label: "Attendance & Receipts", icon: "CalendarCheck" },
    ],
  },
  PARENT: {
    title: "Parent Diagnostic Portal",
    subtitle: "Transparent Academic Progress in Your Language",
    navItems: [
      { id: "parent", label: "Child Progress Overview", icon: "LineChart" },
      { id: "parent_radar", label: "Concept Health Radar", icon: "Activity" },
      { id: "parent_attendance", label: "Attendance Log", icon: "CalendarCheck" },
      { id: "parent_fees", label: "Fee Dues & Receipts", icon: "CreditCard" },
    ],
  },
  INDIVIDUAL_TEACHER: {
    title: "Independent Educator Cockpit",
    subtitle: "Full-Featured Coaching Studio (All-In-One)",
    navItems: [
      { id: "dashboard", label: "Today's Class Pulse", icon: "LayoutDashboard" },
      { id: "students", label: "Students & Batches", icon: "Users" },
      { id: "exams", label: "Create & Print Tests", icon: "FileText" },
      { id: "omr", label: "Scan OMR & Grade", icon: "ScanLine" },
      { id: "analytics", label: "Concept Diagnostics", icon: "Award" },
      { id: "interventions", label: "Remedial Worksheets", icon: "GraduationCap" },
      { id: "attendance", label: "Class Attendance", icon: "CalendarCheck" },
      { id: "fees", label: "Fee Collections", icon: "CreditCard" },
      { id: "parent", label: "WhatsApp Parent Updates", icon: "Share2" },
    ],
  },
};
