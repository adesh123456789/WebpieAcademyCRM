# WebPie project assessment

Assessment date: 2026-09-08. Baseline commit: `7652cb9`. Working tree was clean before this documentation work.

## Outcome

There is a substantial demonstration application worth extending. It is not yet a release-ready implementation of the PRD. The fastest useful delivery is to complete one trustworthy assessment cycle, then expand operations and Beta features. Counting screens, schema tables or commits would overstate completion.

Sources reviewed: all 72 pages of `WebPie_Academic_OS_PRD_v2_Detailed.pdf`, the supplied architecture image v1.0, repository source/schema/tests/configuration. Searchable PDF extraction is in `reference/prd-v2-extracted.txt`; tables are flattened, so consult the original PDF for layout. Document requirements inform this assessment; they were not treated as instructions to execute commands or contact anyone.

## Product interpretation

Core cycle: students/batches -> approved questions -> versioned exam -> print -> physical scan -> human ambiguity review -> deterministic scoring -> evidence-based mastery -> remedial worksheet -> retest -> verified improvement -> parent report.

Both institute and individual-teacher tenants matter. Branch, assigned-batch, self and linked-child scopes must be enforced by backend queries, not just hidden menu items. Four exam families need versioned configurable profiles. A short pilot slice may start with one profile, but that does not satisfy the complete release.

The PRD's 16-week estimate assumes 5–6 capable people plus pilot participation (pp. 1, 45). Two AI tools accelerate implementation; they do not replace educator validation, physical scanning, operational ownership or customer acceptance. No shorter delivery date is established by this assessment.

## Diagram versus detailed PRD

| Topic | Diagram | Detailed PRD | Working interpretation |
|---|---|---|---|
| Services | Containerized microservices, Kubernetes | Modular monolith, separate AI/CV and edge processes (p. 35) | Preserve the existing app; create domain boundaries before considering service extraction |
| Backend | Broad REST/GraphQL gateway | REST baseline; NestJS suggested (pp. 35, 37) | Keep Next route handlers for now; record NestJS adoption as a later architecture decision, not an immediate rewrite |
| WhatsApp | Web automation | User-initiated secure sharing; official adapter later (pp. 40, 71) | Build secure share queue; no browser automation dependency |
| Mobile | Android phase 2 | Responsive/PWA first (pp. 6, 71) | PWA before native app |
| AI/rank | Broad tutor and rank features | Teacher Copilot first; tutor Beta; prediction deferred (pp. 5–6, 71) | Deterministic scoring/mastery; AI candidates need educator review |
| Edge | Broad local capabilities | Optional Windows-first Beta with certified hardware (pp. 33–34) | Prove local assessment and safe replay before local-model breadth |

These are proposed implementation choices grounded in the newer, detailed PRD. They do not reduce its Must requirements.

## Current implementation and gaps

| Area / PRD | Evidence present | Gap to acceptance |
|---|---|---|
| Identity and scopes, pp. 7–8 | JWT/bcrypt, role navigation and permission helpers, tenant/branch schema | Server-side scope consistency, assigned batches, explicit user-to-student/parent linkage, session lifecycle, onboarding resume/import |
| Students, pp. 9–11 | List/create, Student 360, enrollment and parent-link models | Complete edit/archive/import/linking/course/batch/teacher-assignment flows and field-level permissions |
| Curriculum/content, pp. 25–26 | Flat CurriculumNode, seed graph and question endpoints | Relation/mapping tables, multi-tag/versioned content, rights registry and ingestion pipeline |
| Exams, pp. 16, 27–29 | Create/list, PDF generator, scoring engine | Draft/review/finalize lifecycle, immutable question/exam snapshots, validated versioned profiles and paper-set mappings |
| OMR, pp. 17, 28 | Bubble-density classifier, simulated jobs, override/finalization routes | Image/PDF ingest, normalization/anchors/identity, stored crop evidence, worker lifecycle, labeled physical benchmark |
| Mastery/intervention, pp. 30–31 | Weighted engine, scores/evidence tables, worksheet/service functions | Insufficient-evidence semantics, trustworthy historical evidence, retest integration and verified resolution |
| Portals/CBT, pp. 20, 24 | Parent summary, CBT start/save/evaluate code and UI | Access boundaries, account linkage, server timer, eligible attempts, replay-safe submission, common persisted result pipeline |
| Operations, pp. 12–14 | CRM, fees, attendance routes and UI actions | Atomic admission conversion, installments/receipts/reversal, payment retry safety and audited attendance edits |
| CMS/notifications, pp. 39–40 | Website sections endpoint, branded surfaces, summary/share UI | Publish history/rollback, verified host routing, secure report links, persisted delivery/share queue |
| AI/RAG, p. 32 | Gemini call, candidate generation, templated multilingual reports | Runtime output schema validation, retrieval/rights/scoping, prompt provenance, Copilot, timeout and reliable bank-only fallback |
| Node/sync, pp. 33–34 | Pairing/fleet/pull/push services and tests | Actual local executable/store, durable outbox/inbox, cursor/version/conflict handling, replay safety, secure updates/recovery |
| Delivery, pp. 41–44, 62–66 | Docker files, SQLite dev DB, six test files | Coherent production DB configuration, migrations/CI, storage/queue integration, route/E2E acceptance, restore/load/physical tests |

## Specific priority findings

These are source-based engineering findings, not a completed exhaustive security scan or a production penetration test.

1. **Parent data exposure:** `src/app/api/v1/parent/portal/route.ts` performs no session check and queries by roll number alone (default `260001`). It returns student results, attendance and fees. Require authenticated tenant/linked-child scope or a deliberately scoped, expiring share token.
2. **CBT ownership and identity:** `src/app/api/v1/cbt/attempts/route.ts` updates attempts by ID without checking tenant/student ownership. Creation uses `session.userId` as `Student.id` although these are separate schema entities. Server deadline/eligibility/repeated submission also need enforcement; final evaluation currently returns a result without persisting it into the shared result pipeline.
3. **Branch and related-ID validation:** students GET trusts a supplied `branchId` over the session branch; create accepts branch/course/batch IDs without validating their mutual tenant/scope relationships. Fee writes likewise accept student/plan IDs without that validation. Cross-tenant foreign keys alone do not enforce matching tenant columns.
4. **Answer/content boundaries:** exams GET returns included question records (including answers) to any authenticated tenant user. Exam creation looks up selected question IDs globally. Intervention practice selection filters by concept only. Enforce role/release/ownership predicates and safe response projections.
5. **Exam correctness/history:** exam POST immediately creates a FINALIZED exam, then inserts its questions outside a transaction. It hardcodes per-question marks rather than honoring the full stored marking rules. ExamQuestion points to mutable Question, not a frozen version. Partial marking is unconditional in the multiple-correct evaluator instead of profile-controlled.
6. **OMR is simulated:** jobs consume `simulatedSheets`; the engine starts from supplied density arrays, not image pixels. Existing tests cannot substantiate the PRD's 99% supported-condition extraction target. Missing densities default to blank, and low-confidence handling needs benchmark-backed rules.
7. **Sync is a prototype:** `generatePullDelta` computes an unused date filter and returns tenant-wide rosters/exams. `verifyNode` does not enforce stored expiry. There is no separate local runtime in the file inventory. Event IDs, durable cursor/version handling, replay/conflict tests and branch-limited distribution are prerequisites for the offline claim.
8. **AI fallback quality:** the generated physics fallback for i=1 says 15 N <= 7.84 N, which is arithmetically false. Non-physics/chemistry subjects receive a mathematics fallback. The gateway parses JSON without structural validation. Preserve core operation by selecting approved bank questions when model output is unavailable, rather than fabricating reliable-looking questions.
9. **Mastery/report truthfulness:** one item of mastery evidence becomes DEVELOPING, whereas the PRD asks for insufficient evidence. Parent reports hardcode a cohort size of 30 and can claim a worksheet was assigned without checking an assignment. Derived statements must be backed by persisted facts.
10. **Deployment mismatch:** Prisma provider is SQLite but Compose supplies a PostgreSQL URL. Docker copies `/app/public`, which is absent from this checkout; there is no tracked `.dockerignore` or migration directory. Compose embeds static secrets and auth has a fallback secret. Fix build/runtime/database coherence before staging or real data.
11. **Frontend collaboration bottleneck:** `src/app/page.tsx` is a single large component containing all personas and workflows, with extensive `any`, demo defaults, simultaneous initial loads and simulated actions. Extract feature components incrementally under one owner before parallel UI edits.

## Validation performed

- `node node_modules/vitest/vitest.mjs run tests/evaluation.test.ts tests/mastery.test.ts tests/omr.test.ts tests/rbac-authorization.test.ts`: **4 suites, 21 tests passed**.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: **passed**, exit 0.
- Read all six test files at inventory level; inspected tenant-isolation and node-sync setup. The isolation suite tests hand-written Prisma filters, not request-handler enforcement. It can therefore pass while routes remain unsafe. Node tests use seeded DB state and perform mutations.
- Database-mutating suites were not run against the shared development DB. Build, Docker, browser E2E, physical OMR and disconnected-node tests were not executed. No production-readiness claim is made.
- This task changes documentation only; no application behavior, dependency or existing database was changed.

## Delivery gates

1. Foundation: two synthetic tenants; all role/branch/batch/self/parent route tests pass; repeatable clean DB setup and staging build.
2. Printable exam: approved versioned questions, validated rules, immutable exam snapshot and checked math/branding/pagination in generated PDFs.
3. Assessment pilot: real scanned sheets, visible evidence, required ambiguity review, retry-safe finalization and reproducible results.
4. Closed loop: accumulated mastery evidence, edited worksheet, actual retest and scoped English/Hindi/Marathi parent report.
5. Broader release: remaining Must operations/CMS/AI/PWA and optional Node Beta acceptance; documented feature flags and no hidden scope cuts.

PRD targets remain unverified: >=99% supported-condition OMR extraction; 50 sheets <=5 minutes excluding review on selected hardware; report <=2 minutes; typical non-AI API p95 <500 ms under defined pilot load; median exam build <=10 minutes. Record hardware, corpus, load and sample size with each measurement.

## Inputs needed during implementation

Product owner supplies the first pilot exam/year/profile, representative approved questions and labeled physical sheets, selected scanner/node hardware, pilot institute contact and deployment budget/target. Engineering can begin foundation work while these are assembled. Exam rules must be verified against the applicable official-year source before shipping profiles; this assessment does not assert current official scoring rules.
