# WebPie Academic Intelligence OS (PRD v2.0)

> **Multi-Tenant, Offline-First Operating System for Coaching Institutes & Teachers**
> Maharashtra-First Focus: JEE Main, JEE Advanced, NEET, and MHT-CET.

---

## 🌟 Executive Overview & Core Loop

WebPie Academic OS digitizes the information layer around coaching institutes without disrupting the physical classroom model. Built strictly around the closed-loop cycle:

$$\text{Measure} \longrightarrow \text{Diagnose} \longrightarrow \text{Prescribe} \longrightarrow \text{Practice} \longrightarrow \text{Verify} \longrightarrow \text{Communicate}$$

1. **Measure**: Teacher builds and prints test papers & 4-corner fiducial OMR sheets.
2. **OMR Vision**: Physical answer sheets are scanned/uploaded; the computer vision engine classifies bubble densities, identifies candidates, and safely flags ambiguities (double-marks, partial fills).
3. **Deterministic Evaluation**: Authoritative, reproducible scoring engine applies official exam profile rules (+4/-1, JEE Advanced partial scoring matrix, NEET, MHT-CET) and calculates cohort ranks and percentiles.
4. **Mastery Diagnosis**: Deterministic multi-factor weighted mastery algorithm ($Accuracy \times Difficulty \times Recency \times Confidence$) pinpoints exact weak concepts.
5. **Remedial Prescription**: Generates 3-tier practice ladders (Foundation $\to$ Application $\to$ Exam-level) and 1-click printable remedial worksheet PDFs.
6. **Communicate**: Multilingual parent reports in **English, Marathi, and Hindi** with direct WhatsApp sharing links.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js v18+ (tested on Node v24.14.0)
- npm v10+
- SQLite (default zero-friction local mode) or PostgreSQL 18

### 1. Installation
```bash
npm install
```

### 2. Database Sync & Seed
```bash
# Push schema to local database
npx prisma db push

# Seed realistic demo data (Tenants, Teachers, Students, Questions, Exams, Interventions, CRM, Fees)
node scripts/seed.js
```

### 3. Run Automated Tests
```bash
# Run all Vitest suites (Tenant Isolation, Evaluation, Mastery, OMR Vision)
npm run test
```

### 4. Launch Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🔑 Seeded Demo Logins & Tenant Scopes

| Tenant / Mode | Role | Email | Password | Primary Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Apex IIT-JEE Academy** (Institute) | Institute Owner | `owner@apexiit.com` | `admin123` | All branches, full financials, CRM, exams |
| **Apex IIT-JEE Academy** | Physics Teacher | `teacher.physics@apexiit.com` | `admin123` | Assigned batches, test builder, OMR review, remedial worksheets |
| **Apex IIT-JEE Academy** | Student | `student@apexiit.com` | `student123` | Roll `260001`, CBT simulator, Student 360 |
| **Apex IIT-JEE Academy** | Parent | `parent@apexiit.com` | `parent123` | Linked child reports (English/Marathi/Hindi) |
| **Prof. Deshmukh Physics** (Teacher Mode) | Individual Teacher | `deshmukh@physics.com` | `admin123` | Simplified navigation, single branch, rapid tests |

---

## 🏗️ Production Deployment (Docker & Cloud)

### Option A: Docker Compose (All-in-One)
```bash
# Start WebPie OS + PostgreSQL 18 + Redis
docker-compose up -d --build
```

### Option B: Cloud Deployment (Vercel + Supabase / AWS RDS)
1. Push this repository to GitHub.
2. Link project to **Vercel** or deploy to a Linux VPS (Ubuntu 24.04).
3. Set Environment Variables:
   - `DATABASE_URL`: Your production PostgreSQL connection string (`postgresql://user:pass@host:5432/webpie?schema=public`)
   - `JWT_SECRET`: Secure random 256-bit string
   - `NEXT_PUBLIC_APP_URL`: `https://your-institute-domain.com`
   - `GEMINI_API_KEY`: *(Optional)* For AI Question Generator & Teacher Copilot

---

## 🧪 Automated Verification Suite

Run individual test suites to inspect core engine behaviors:
- `npm run test:isolation` — Enforces zero cross-tenant data leaks and branch scoping.
- `npm run test:evaluation` — Asserts deterministic scoring vectors for JEE Main, NEET, and MHT-CET.
- `npm run test:mastery` — Asserts deterministic weighted mastery calculations and state thresholds.
- `npm run test:omr` — Validates bubble density classification and ambiguity queuing.

---

*WebPie-Tech Private Limited © 2026. Confidential & Proprietary.*
