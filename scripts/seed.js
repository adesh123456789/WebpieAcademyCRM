const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting WebPie Academic OS Database Seeding...");

  // 1. Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.syncQueueItem.deleteMany();
  await prisma.academicNode.deleteMany();
  await prisma.cBTAttempt.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.feePayment.deleteMany();
  await prisma.feeInstallment.deleteMany();
  await prisma.feePlan.deleteMany();
  await prisma.cRMLead.deleteMany();
  await prisma.intervention.deleteMany();
  await prisma.masteryEvidence.deleteMany();
  await prisma.masteryScore.deleteMany();
  await prisma.examResult.deleteMany();
  await prisma.oMRScan.deleteMany();
  await prisma.oMRJob.deleteMany();
  await prisma.examQuestion.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.question.deleteMany();
  await prisma.curriculumNode.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.studentParentLink.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.student.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.course.deleteMany();
  await prisma.websiteSection.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.tenant.deleteMany();

  const defaultPasswordHash = await bcrypt.hash("admin123", 10);
  const studentPasswordHash = await bcrypt.hash("student123", 10);
  const superAdminPasswordHash = await bcrypt.hash("superadmin123", 10);

  // 1b. Create Platform Root Tenant & Super Admin
  const platformTenant = await prisma.tenant.create({
    data: {
      name: "WebPie Platform Operations",
      code: "WEBPIE_HQ",
      type: "PLATFORM",
      status: "ACTIVE",
      planId: "ENTERPRISE_PLATFORM",
      locale: "en",
      timezone: "Asia/Kolkata",
      primaryColor: "#4f46e5",
      customDomain: "admin.webpie.in",
      domainVerified: true,
    },
  });

  const platformBranch = await prisma.branch.create({
    data: {
      tenantId: platformTenant.id,
      code: "HQ",
      name: "Global HQ",
      city: "Pune",
    },
  });

  await prisma.user.create({
    data: {
      tenantId: platformTenant.id,
      branchId: platformBranch.id,
      name: "WebPie Super Admin",
      email: "superadmin@webpie.in",
      phone: "+91 9999988888",
      passwordHash: superAdminPasswordHash,
      role: "WEBPIE_ADMIN",
    },
  });

  // 2. Create Tenant 1: Apex IIT-JEE & NEET Academy (Full Institute)
  const tenant1 = await prisma.tenant.create({
    data: {
      name: "Apex IIT-JEE & NEET Academy",
      code: "APEX_PUNE",
      type: "INSTITUTE",
      status: "ACTIVE",
      planId: "PRO_INSTITUTE",
      locale: "en",
      timezone: "Asia/Kolkata",
      primaryColor: "#1870f5",
      customDomain: "apexiit.webpie.in",
      domainVerified: true,
    },
  });

  // 3. Create Tenant 2: Prof. Deshmukh Physics Classes (Individual Teacher Mode)
  const tenant2 = await prisma.tenant.create({
    data: {
      name: "Prof. Deshmukh Physics Classes",
      code: "DESHMUKH_PHYSICS",
      type: "INDIVIDUAL_TEACHER",
      status: "ACTIVE",
      planId: "TEACHER_PRO",
      locale: "mr",
      timezone: "Asia/Kolkata",
      primaryColor: "#059669",
    },
  });

  // 4. Create Branches for Tenant 1
  const branchKothrud = await prisma.branch.create({
    data: {
      tenantId: tenant1.id,
      code: "KOTHRUD",
      name: "Kothrud Main Campus",
      address: "Paud Road, Kothrud",
      city: "Pune",
      contact: "+91 9823001122",
    },
  });

  const branchCamp = await prisma.branch.create({
    data: {
      tenantId: tenant1.id,
      code: "CAMP",
      name: "Camp City Centre Branch",
      address: "MG Road, Camp",
      city: "Pune",
      contact: "+91 9823001133",
    },
  });

  // Implicit branch for Individual Teacher
  const branchDeshmukh = await prisma.branch.create({
    data: {
      tenantId: tenant2.id,
      code: "MAIN",
      name: "Deshmukh Classroom",
      city: "Aurangabad",
    },
  });

  // 5. Create Users for Tenant 1
  const ownerUser = await prisma.user.create({
    data: {
      tenantId: tenant1.id,
      branchId: branchKothrud.id,
      name: "Dr. Rajesh Sharma",
      email: "owner@apexiit.com",
      phone: "9823001122",
      passwordHash: defaultPasswordHash,
      role: "OWNER",
    },
  });

  const teacherUser = await prisma.user.create({
    data: {
      tenantId: tenant1.id,
      branchId: branchKothrud.id,
      name: "Prof. Vinod Kulkarni (Physics HOD)",
      email: "teacher.physics@apexiit.com",
      phone: "9823001144",
      passwordHash: defaultPasswordHash,
      role: "TEACHER",
    },
  });

  const accountantUser = await prisma.user.create({
    data: {
      tenantId: tenant1.id,
      branchId: branchKothrud.id,
      name: "Sanjay Joshi (Accounts)",
      email: "accounts@apexiit.com",
      phone: "9823001155",
      passwordHash: defaultPasswordHash,
      role: "ACCOUNTANT",
    },
  });

  const counsellorUser = await prisma.user.create({
    data: {
      tenantId: tenant1.id,
      branchId: branchKothrud.id,
      name: "Pooja Patil (Admissions)",
      email: "admissions@apexiit.com",
      phone: "9823001166",
      passwordHash: defaultPasswordHash,
      role: "COUNSELLOR",
    },
  });

  // Individual Teacher User
  await prisma.user.create({
    data: {
      tenantId: tenant2.id,
      branchId: branchDeshmukh.id,
      name: "Prof. Satish Deshmukh",
      email: "deshmukh@physics.com",
      phone: "9822009988",
      passwordHash: defaultPasswordHash,
      role: "OWNER",
    },
  });

  // 6. Create Courses & Batches for Apex Institute
  const courseJee = await prisma.course.create({
    data: {
      tenantId: tenant1.id,
      name: "2-Year Comprehensive JEE Main & Advanced 2026",
      code: "JEE-2026-REG",
      examType: "JEE_MAIN",
      gradeClass: "11",
      academicYear: "2025-2026",
    },
  });

  const batchRankers = await prisma.batch.create({
    data: {
      tenantId: tenant1.id,
      branchId: branchKothrud.id,
      courseId: courseJee.id,
      name: "Rankers Batch (Morning)",
      code: "RB-2026-A",
      schedule: "Mon-Sat 07:30 AM - 11:30 AM",
    },
  });

  // 7. Seed Students & Parents
  const studentNames = [
    { name: "Aarav Deshmukh", roll: "260001", target: "JEE_MAIN", phone: "9100000001" },
    { name: "Ananya Joshi", roll: "260002", target: "JEE_MAIN", phone: "9100000002" },
    { name: "Rohan Patil", roll: "260003", target: "JEE_MAIN", phone: "9100000003" },
    { name: "Sneha Kulkarni", roll: "260004", target: "JEE_MAIN", phone: "9100000004" },
    { name: "Aditya Shinde", roll: "260005", target: "JEE_MAIN", phone: "9100000005" },
    { name: "Tanvi Pawar", roll: "260006", target: "JEE_MAIN", phone: "9100000006" },
    { name: "Siddharth Gaikwad", roll: "260007", target: "JEE_MAIN", phone: "9100000007" },
    { name: "Isha More", roll: "260008", target: "JEE_MAIN", phone: "9100000008" },
    { name: "Omkar Jadhav", roll: "260009", target: "JEE_MAIN", phone: "9100000009" },
    { name: "Pranav Bhosale", roll: "260010", target: "JEE_MAIN", phone: "9100000010" },
  ];

  const createdStudents = [];

  for (const s of studentNames) {
    const student = await prisma.student.create({
      data: {
        tenantId: tenant1.id,
        branchId: branchKothrud.id,
        rollNumber: s.roll,
        name: s.name,
        email: `${s.roll.toLowerCase()}@apexiit.student.com`,
        phone: s.phone,
        targetExam: s.target,
        targetYear: 2026,
        school: "Fergusson Junior College",
      },
    });

    const parent = await prisma.parent.create({
      data: {
        tenantId: tenant1.id,
        name: `Parent of ${s.name}`,
        phone: `98${s.phone.substring(2)}`,
        email: `parent.${s.roll}@gmail.com`,
        relationship: "FATHER",
      },
    });

    await prisma.studentParentLink.create({
      data: {
        studentId: student.id,
        parentId: parent.id,
        isPrimary: true,
        accessFlags: JSON.stringify({ fees: true, reports: true, attendance: true }),
      },
    });

    await prisma.enrollment.create({
      data: {
        studentId: student.id,
        courseId: courseJee.id,
        batchId: batchRankers.id,
        status: "ACTIVE",
      },
    });

    // Fee plan
    const feePlan = await prisma.feePlan.create({
      data: {
        tenantId: tenant1.id,
        studentId: student.id,
        grossAmount: 120000,
        discountAmount: 10000,
        scholarshipAmount: 10000,
        netAmount: 100000,
      },
    });

    await prisma.feeInstallment.create({
      data: {
        feePlanId: feePlan.id,
        installmentNumber: 1,
        dueDate: new Date(Date.now() - 30 * 86400000),
        amount: 50000,
        paidAmount: 50000,
        status: "PAID",
      },
    });

    await prisma.feePayment.create({
      data: {
        tenantId: tenant1.id,
        studentId: student.id,
        feePlanId: feePlan.id,
        receiptNumber: `REC-2026-${s.roll}`,
        amount: 50000,
        paymentMode: "UPI",
        transactionRef: `UPI-REF-${s.roll}-9981`,
        status: "SUCCESS",
        collectedById: accountantUser.id,
      },
    });

    createdStudents.push(student);
  }

  // 8. Seed Questions
  const questionsData = [
    {
      code: "Q-PHY-001",
      subject: "PHYSICS",
      chapter: "Laws of Motion",
      topic: "Friction",
      concept: "Limiting Friction & Angle of Repose",
      type: "SINGLE_CORRECT",
      declaredDifficulty: "MEDIUM",
      body: "A block of mass $m = 4\\text{ kg}$ is resting on a horizontal rough surface with static friction coefficient $\\mu_s = 0.5$. What minimum horizontal force is required to start the motion? (Take $g = 9.8\\text{ m/s}^2$)",
      options: JSON.stringify([
        { id: "A", text: "19.6 N" },
        { id: "B", text: "39.2 N" },
        { id: "C", text: "9.8 N" },
        { id: "D", text: "4.9 N" },
      ]),
      correctAnswer: JSON.stringify("A"),
      solution: "Limiting friction force is given by $f_L = \\mu_s N = \\mu_s m g = 0.5 \\times 4 \\times 9.8 = 19.6\\text{ N}$.",
      source: "PYQ",
      sourceExam: "JEE_MAIN_2023",
      status: "VERIFIED",
    },
    {
      code: "Q-PHY-002",
      subject: "PHYSICS",
      chapter: "Kinematics",
      topic: "Motion in 1D",
      concept: "Equations of Motion & Relative Velocity",
      type: "SINGLE_CORRECT",
      declaredDifficulty: "EASY",
      body: "A particle starts from rest with a constant acceleration $a = 2\\text{ m/s}^2$. What distance does it cover during the 3rd second of its motion?",
      options: JSON.stringify([
        { id: "A", text: "5 m" },
        { id: "B", text: "9 m" },
        { id: "C", text: "6 m" },
        { id: "D", text: "3 m" },
      ]),
      correctAnswer: JSON.stringify("A"),
      solution: "$S_n = u + \\frac{a}{2}(2n - 1)$. Here $u = 0, a = 2, n = 3$. Hence $S_3 = 0 + \\frac{2}{2}(2(3) - 1) = 5\\text{ m}$.",
      source: "PYQ",
      sourceExam: "JEE_MAIN_2022",
      status: "VERIFIED",
    },
    {
      code: "Q-CHEM-001",
      subject: "CHEMISTRY",
      chapter: "Chemical Bonding & Molecular Structure",
      topic: "VSEPR & Hybridization",
      concept: "Bond Order, Magnetic Behavior & Dipole Moments",
      type: "SINGLE_CORRECT",
      declaredDifficulty: "MEDIUM",
      body: "According to Molecular Orbital Theory, which of the following species has bond order equal to zero and does not exist?",
      options: JSON.stringify([
        { id: "A", text: "$\\text{Be}_2$" },
        { id: "B", text: "$\\text{B}_2$" },
        { id: "C", text: "$\\text{C}_2$" },
        { id: "D", text: "$\\text{N}_2$" },
      ]),
      correctAnswer: JSON.stringify("A"),
      solution: "For $\\text{Be}_2$ (8 electrons): $\\sigma_{1s}^2 \\sigma_{1s}^{*2} \\sigma_{2s}^2 \\sigma_{2s}^{*2}$. Bond order = $(4 - 4)/2 = 0$. Hence it does not exist under ordinary conditions.",
      source: "PYQ",
      sourceExam: "JEE_MAIN_2024",
      status: "VERIFIED",
    },
    {
      code: "Q-MATH-001",
      subject: "MATHEMATICS",
      chapter: "Limits, Continuity & Differentiability",
      topic: "Limits & L'Hopital's Rule",
      concept: "Indeterminate Forms & Continuity at a Point",
      type: "SINGLE_CORRECT",
      declaredDifficulty: "HARD",
      body: "Evaluate the limit $\\lim_{x \\to 0} \\frac{e^{2x} - 1 - 2x}{x^2}$.",
      options: JSON.stringify([
        { id: "A", text: "2" },
        { id: "B", text: "1" },
        { id: "C", text: "4" },
        { id: "D", text: "0" },
      ]),
      correctAnswer: JSON.stringify("A"),
      solution: "Using series expansion: $e^{2x} = 1 + 2x + \\frac{(2x)^2}{2!} + \\dots = 1 + 2x + 2x^2 + O(x^3)$. Therefore, $\\lim_{x \\to 0} \\frac{2x^2}{x^2} = 2$.",
      source: "PYQ",
      sourceExam: "JEE_MAIN_2023",
      status: "VERIFIED",
    },
    {
      code: "Q-PHY-003",
      subject: "PHYSICS",
      chapter: "Work, Energy & Power",
      topic: "Work-Energy Theorem",
      concept: "Conservation of Mechanical Energy",
      type: "NUMERICAL",
      declaredDifficulty: "MEDIUM",
      body: "A bullet of mass $0.02\\text{ kg}$ travelling horizontally with a speed of $200\\text{ m/s}$ penetrates into a fixed wooden block to a depth of $0.2\\text{ m}$. Calculate the average resistive force exerted by the wood in Newtons.",
      options: JSON.stringify([]),
      correctAnswer: JSON.stringify("2000"),
      numericalTolerance: 10,
      solution: "By Work-Energy Theorem: $W = \\Delta K \\implies -F \\times d = 0 - \\frac{1}{2}mv^2 \\implies F = \\frac{0.02 \\times 200^2}{2 \\times 0.2} = \\frac{800}{0.4} = 2000\\text{ N}$.",
      source: "PYQ",
      sourceExam: "JEE_MAIN_2024",
      status: "VERIFIED",
    },
  ];

  const createdQuestions = [];
  for (const q of questionsData) {
    const question = await prisma.question.create({
      data: {
        tenantId: tenant1.id,
        ownerScope: "PLATFORM",
        ...q,
      },
    });
    createdQuestions.push(question);
  }

  // 9. Create Exam
  const exam = await prisma.exam.create({
    data: {
      tenantId: tenant1.id,
      branchId: branchKothrud.id,
      title: "JEE Main Major Mock Test #01",
      code: "JEE-2026-MOCK-01",
      examType: "JEE_MAIN",
      batchIds: JSON.stringify([batchRankers.id]),
      durationMinutes: 180,
      totalMarks: 20,
      totalQuestions: 5,
      status: "EVALUATED",
      blueprint: JSON.stringify({
        sections: [
          { subject: "PHYSICS", count: 3, marks: 12 },
          { subject: "CHEMISTRY", count: 1, marks: 4 },
          { subject: "MATHEMATICS", count: 1, marks: 4 },
        ],
      }),
      markingRules: JSON.stringify({ correct: 4, incorrect: -1, unattempted: 0 }),
      isCbtEnabled: true,
      finalizedAt: new Date(),
    },
  });

  // Link questions to exam
  for (let i = 0; i < createdQuestions.length; i++) {
    await prisma.examQuestion.create({
      data: {
        examId: exam.id,
        questionId: createdQuestions[i].id,
        sectionName: `${createdQuestions[i].subject} Section`,
        orderIndex: i + 1,
        marksCorrect: 4,
        marksIncorrect: createdQuestions[i].type === "NUMERICAL" ? 0 : -1,
        paperSet: "A",
      },
    });
  }

  // 10. Seed Exam Results & Mastery Scores
  // Give top scores to first few, struggling scores to lower students to populate weak concepts
  const mockResponses = [
    { roll: "260001", responses: { [createdQuestions[0].id]: "A", [createdQuestions[1].id]: "A", [createdQuestions[2].id]: "A", [createdQuestions[3].id]: "A", [createdQuestions[4].id]: "2000" }, score: 20 },
    { roll: "260002", responses: { [createdQuestions[0].id]: "A", [createdQuestions[1].id]: "A", [createdQuestions[2].id]: "A", [createdQuestions[3].id]: "B", [createdQuestions[4].id]: "2000" }, score: 15 },
    { roll: "260003", responses: { [createdQuestions[0].id]: "B", [createdQuestions[1].id]: "A", [createdQuestions[2].id]: "A", [createdQuestions[3].id]: "A", [createdQuestions[4].id]: "1800" }, score: 11 },
    { roll: "260004", responses: { [createdQuestions[0].id]: "C", [createdQuestions[1].id]: "A", [createdQuestions[2].id]: "B", [createdQuestions[3].id]: "A", [createdQuestions[4].id]: "" }, score: 6 },
    { roll: "260005", responses: { [createdQuestions[0].id]: "B", [createdQuestions[1].id]: "C", [createdQuestions[2].id]: "A", [createdQuestions[3].id]: "B", [createdQuestions[4].id]: "2000" }, score: 6 },
  ];

  for (let i = 0; i < mockResponses.length; i++) {
    const item = mockResponses[i];
    const student = createdStudents.find((s) => s.rollNumber === item.roll);
    if (!student) continue;

    await prisma.examResult.create({
      data: {
        tenantId: tenant1.id,
        examId: exam.id,
        studentId: student.id,
        batchId: batchRankers.id,
        score: item.score,
        maximumMarks: 20,
        accuracyPercentage: Math.max(0, (item.score / 20) * 100),
        totalAttempted: 5,
        totalCorrect: Math.max(1, Math.round((item.score + 5) / 5)),
        totalIncorrect: 5 - Math.max(1, Math.round((item.score + 5) / 5)),
        totalUnattempted: 0,
        negativeMarksDeducted: 1,
        cohortRank: i + 1,
        cohortPercentile: ((mockResponses.length - i) / mockResponses.length) * 100,
        subjectScores: JSON.stringify({
          PHYSICS: { score: item.score > 10 ? 12 : 6, max: 12, attempted: 3, correct: item.score > 10 ? 3 : 1 },
          CHEMISTRY: { score: 4, max: 4, attempted: 1, correct: 1 },
          MATHEMATICS: { score: item.score > 15 ? 4 : -1, max: 4, attempted: 1, correct: item.score > 15 ? 1 : 0 },
        }),
        questionResponses: JSON.stringify(item.responses),
        isFinal: true,
      },
    });

    // Populate Mastery
    const frictionCorrect = item.responses[createdQuestions[0].id] === "A";
    await prisma.masteryScore.create({
      data: {
        tenantId: tenant1.id,
        studentId: student.id,
        subject: "PHYSICS",
        chapter: "Laws of Motion",
        concept: "Limiting Friction & Angle of Repose",
        score: frictionCorrect ? 85.0 : 25.0,
        state: frictionCorrect ? "MASTERED" : "CRITICAL",
        confidence: 0.85,
        totalAttempts: 3,
        correctAttempts: frictionCorrect ? 3 : 1,
      },
    });

    await prisma.masteryEvidence.create({
      data: {
        tenantId: tenant1.id,
        studentId: student.id,
        concept: "Limiting Friction & Angle of Repose",
        examId: exam.id,
        questionId: createdQuestions[0].id,
        wasCorrect: frictionCorrect,
        difficultyWeight: 1.5,
        recencyWeight: 1.0,
      },
    });
  }

  // 11. Seed Active Intervention for Limiting Friction
  await prisma.intervention.create({
    data: {
      tenantId: tenant1.id,
      branchId: branchKothrud.id,
      title: "Targeted Remedial Sprint: Limiting Friction & Friction Angle",
      concept: "Limiting Friction & Angle of Repose",
      studentIds: JSON.stringify(["260003", "260004", "260005"]),
      priority: "CRITICAL",
      status: "ASSIGNED",
      practiceLadder: JSON.stringify([
        { tier: "Foundation", q: "Definition and calculation of normal reaction on inclined planes" },
        { tier: "Application", q: "Block on block friction with external horizontal force" },
        { tier: "Exam-Level", q: "Minimum force required to prevent sliding on rough vertical wall" },
      ]),
      beforeMasteryAvg: 28.5,
      createdById: teacherUser.id,
    },
  });

  // 12. Seed CRM Pipeline Leads
  const leadStages = [
    { name: "Sameer Deshpande", phone: "9823112233", stage: "ENQUIRY", course: "JEE 2-Year", source: "WEBSITE" },
    { name: "Vaishnavi Kulkarni", phone: "9823112244", stage: "FOLLOW_UP", course: "NEET Dropper", source: "WALK_IN" },
    { name: "Gaurav More", phone: "9823112255", stage: "DEMO", course: "MHT-CET Crash", source: "REFERRAL" },
    { name: "Sanika Shinde", phone: "9823112266", stage: "ADMISSION", course: "JEE 2-Year", source: "WALK_IN" },
  ];

  for (const l of leadStages) {
    await prisma.cRMLead.create({
      data: {
        tenantId: tenant1.id,
        branchId: branchKothrud.id,
        name: l.name,
        phone: l.phone,
        email: `${l.name.toLowerCase().replace(" ", ".")}@gmail.com`,
        source: l.source,
        stage: l.stage,
        courseInterest: l.course,
        counsellorId: counsellorUser.id,
        nextFollowUpAt: new Date(Date.now() + 86400000),
      },
    });
  }

  // 13. Seed Institute Website CMS Sections (PRD Sec 21)
  const websiteSections = [
    {
      sectionKey: "HERO",
      title: "Pioneering Academic Excellence for JEE, NEET & MHT-CET",
      subtitle: "Pune's Most Trusted Offline Coaching Powered by Real-Time Academic Intelligence.",
      content: JSON.stringify({
        ctaPrimary: "Enroll for 2026 Batch",
        ctaSecondary: "Download Prospectus",
        stats: [
          { label: "Selections in IITs", value: "142+" },
          { label: "NEET 650+ Scorers", value: "89+" },
          { label: "Average Percentile", value: "98.4" },
        ],
      }),
      orderIndex: 1,
    },
    {
      sectionKey: "ABOUT",
      title: "Why Apex Academy?",
      subtitle: "Preserving classroom mentorship while eliminating learning blindspots.",
      content: JSON.stringify({
        description: "Apex Academy bridges traditional disciplined classroom teaching with state-of-the-art diagnostic assessment loops. Every test your child takes is analyzed at the concept level, followed by instant targeted remedial worksheets.",
      }),
      orderIndex: 2,
    },
    {
      sectionKey: "COURSES",
      title: "Flagship Classroom Programs",
      subtitle: "Rigorous preparation tailored for competitive entrance examinations.",
      content: JSON.stringify({
        courses: [
          { title: "2-Year JEE Apex Super-30", target: "JEE Main & Advanced 2026", duration: "24 Months" },
          { title: "Target NEET Rankers Program", target: "NEET (UG) 2026", duration: "12 Months" },
          { title: "MHT-CET Pinnacle Fast-Track", target: "Engineering / Pharmacy CET", duration: "6 Months" },
        ],
      }),
      orderIndex: 3,
    },
  ];

  for (const ws of websiteSections) {
    await prisma.websiteSection.create({
      data: {
        tenantId: tenant1.id,
        ...ws,
      },
    });
  }

  // 14. Seed Academic Nodes for Offline OMR / Terminal Sync (PRD Sec 33-35)
  await prisma.academicNode.create({
    data: {
      tenantId: tenant1.id,
      branchId: branchKothrud.id,
      nodeCode: "NODE-APEX-01",
      name: "Apex Kothrud Main Exam Terminal",
      machineFingerprint: "WIN-PC-9821-X64-APEX",
      pairingToken: "node_apex_live_token_77a8b9",
      ipAddress: "192.168.1.45",
      osVersion: "Windows 11 Pro 64-bit (Build 22631)",
      status: "ONLINE",
      syncEngineState: "IDLE",
      offlineScansCount: 48,
      lastSeenAt: new Date(),
      lastSyncAt: new Date(),
    },
  });

  await prisma.academicNode.create({
    data: {
      tenantId: tenant2.id,
      nodeCode: "NODE-DESH-01",
      name: "Deshmukh Classroom Tablet Station",
      machineFingerprint: "WIN-TAB-1102-X64-DESH",
      pairingToken: "node_desh_live_token_44c1d2",
      ipAddress: "192.168.2.18",
      osVersion: "Windows 11 Home 64-bit",
      status: "ONLINE",
      syncEngineState: "IDLE",
      offlineScansCount: 15,
      lastSeenAt: new Date(),
      lastSyncAt: new Date(),
    },
  });
  console.log(" Academic Nodes seeded: NODE-APEX-01, NODE-DESH-01");

  console.log(" Seeding completed successfully!");
  console.log("Credentials seeded:");
  console.log("Owner: owner@apexiit.com / admin123");
  console.log("Teacher: teacher.physics@apexiit.com / admin123");
  console.log("Student: student@apexiit.com / student123");
  console.log("Individual Teacher: deshmukh@physics.com / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
