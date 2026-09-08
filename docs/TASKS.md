# Shared delivery board

Analysis baseline: `7652cb9`; FND-001 implementation base: `263f4ba`. Owners below are proposed lanes unless recorded in Claims. READY tasks may be claimed; BACKLOG tasks wait for their dependencies. Estimates are relative S/M/L task sizes, not delivery promises. Split L items into independently testable slices before implementation.

Three lanes: **Codex** (backend/data/schema/API), **Antigravity** (UI), **Claude** (platform/infra + AI/CV/Edge + cross-lane QA). Owner reassignments to Claude on rows below (FND-002, OMR-001, SYN-001, EDGE-001, AI-001, REL-001) and the new CLD-* rows are proposed pending Codex/Antigravity acknowledgement in their next handoff. Integration is rotating per slice — see `COORDINATION.md`.

| ID | Priority / size | Owner | Status | Dependencies | Deliverable and acceptance |
|---|---|---|---|---|---|
| DOC-001 | P1 / M | Codex | DONE | — | Read PRD/repo, record gaps, board and handoff process; this documentation task |
| FND-001 | P0 / M | Codex | DONE | — | Isolated per-suite DBs and synthetic fixture world; real handler tests; 36 tests pass, TypeScript passes, inherited DB target remains untouched. See docs/TESTING.md |
| UI-001 | P1 / M | Antigravity | DONE | — | Extract shell/navigation/common feedback from page.tsx; preserve behavior; no backend changes; verify desktop/mobile navigation and dialogs |
| SEC-001 | P0 / L | Codex | DONE | FND-001 | Server-resolved active sessions; parent/CBT/student/fee/exam/question scope checks and C01 published. Commit `598b7dd`; full tests/build pass. Remaining explicit profile-FK migration is tracked under STU-001. |
| UI-002 | P1 / M | Antigravity | DONE | UI-001, C01 acknowledged | Session-driven role shell, real login/logout, authorized navigation and 401/403 states; contract C01 session verification, LoginView, and honest 403 guard. Handoff docs/handoffs/UI-002-antigravity.md |
| CLD-001 | P0 / S | Claude | DONE | — | CI workflow (`.github/workflows/ci.yml`): install, prisma generate + db push, tsc noEmit, vitest, next build on every PR/push; `.dockerignore` to shrink build context. Integrated into master |
| CLD-002 | P1 / M | Claude | DONE | — | OMR benchmark corpus harness under `tests/omr-corpus/**`: zod fixture schema, `runCorpus` metrics + markdown report, 11 synthetic labelled sheets across the PRD 26.3 matrix, vitest suite with safety invariants + regression ceilings. Baseline on simulated engine recorded in `tests/omr-corpus/REPORT.md` (accuracy 88.46%, review 14.74%, false-confidence 1.28%, silent-miss 7.69%, 2/2 unsupported sheets leak CONFIDENT). 41/41 tests + tsc pass. Handoff `docs/handoffs/CLD-002-claude.md` |
| FND-002 | P0 / M | Claude + Codex | DONE | FND-001, CLD-001 | Separate cloud PostgreSQL/local SQLite plan, reviewed migrations, clean build/Compose configuration, secret handling, `Dockerfile` `public/` fix and CI extension. PostgreSQL provider mirror, initial migration, provider-aware entrypoint, and production Prisma client generation are integrated; Docker smoke remains CI-only. |
| UI-003 | P1 / L | Antigravity | BACKLOG | UI-002, C02 acknowledged | Student/import/parent-link/batch workflows and resumable onboarding; malformed/duplicate CSV and empty states verified |
| ACA-001 | P1 / L | Codex | BACKLOG | FND-002, SEC-001 | Versioned graph mappings/questions/tags/source rights, tenant-private content; historical content survives edits, no cross-tenant selection |
| EXM-001 | P0 / L | Codex | BACKLOG | ACA-001 | C03; validated profile/blueprint, draft/review/transactional finalize and immutable snapshots; no unapproved AI candidates or invalid totals |
| UI-004 | P1 / L | Antigravity | BACKLOG | UI-001, C03 acknowledged | Seven-step exam wizard, bank selection, review and artifact preview; invalid blueprint cannot finalize; loading/failure/retry states |
| EVAL-001 | P0 / M | Codex | BACKLOG | EXM-001 | Explicit configurable partial marking, strict numerical inputs, versioned tie/cohort rules and immutable revisions; golden vectors/replay/answer-key correction |
| OMR-001 | P1 / L | Claude + Codex | IN_PROGRESS | EXM-001, FND-002, CLD-002 | Safety slice integrated: stray/faint marks and unsupported-sheet fail-safe fixed in `114070c`; real raster/PDF/anchor worker remains. Claude owns CV internals + corpus; Codex owns job routes and object storage |
| UI-005 | P1 / L | Antigravity | BACKLOG | UI-001, C04 acknowledged | Upload/progress/unmatched/crop-review controls; actual crop shown, correction tracked, pending review blocks finalization |
| OMR-002 | P0 / M | Codex | BACKLOG | OMR-001, EVAL-001 | Retry-safe review/finalize/evaluate transaction/job path with audit and revision guards; duplicate finalize produces one logical result |
| INT-001 | P1 / L | Codex | BACKLOG | OMR-002 | C05; historical mastery and insufficient-evidence handling, scoped ladders, persisted retest verification; AC-008/009, recompute and no evidence duplication |
| UI-006 | P1 / L | Antigravity | BACKLOG | UI-003, C05 acknowledged | Student/batch results, evidence drill-down, worksheet edit/preview and before/after retest; every label linked to evidence |
| REP-001 | P1 / M | Codex | BACKLOG | SEC-001, INT-001 | Linked-child portal, published reports, truthful multilingual summaries, expiring/revocable share links and share queue; AC-010 and report data assertions |
| UI-007 | P1 / M | Antigravity | BACKLOG | UI-002, REP-001 contract | Mobile parent/student portal, child switcher, report download and user-initiated share; inaccessible child never appears |
| OPS-001 | P1 / L | Codex | BACKLOG | STU-001 | Atomic CRM conversion, finance ledger/idempotency/receipt/reversal and audited attendance/absence tasks; AC-012/017 |
| UI-008 | P1 / L | Antigravity | BACKLOG | UI-003, OPS-001 contracts | Real CRM follow-up/admission, fees/receipt/reversal and attendance session flows; duplicates and errors visible |
| CMS-001 | P1 / L | Codex | BACKLOG | SEC-001, FND-002 | Safe section content, publish versions/rollback, verified custom-host mapping and public result selection; AC-016/privacy checks |
| UI-009 | P1 / M | Antigravity | BACKLOG | UI-001, CMS-001 contract | Section editor/preview/publish/rollback/domain status, responsive public presentation |
| CBT-001 | P1 / L | Codex | BACKLOG | SEC-001, EVAL-001 | Eligibility/server clock/autosave/reconnect/idempotent submit into common results, tenant flag; AC-011 and duplicate submission |
| UI-010 | P1 / L | Antigravity | BACKLOG | UI-002, CBT-001 contract | CBT timer/palette/review/clear/resume and responsive/PWA baseline; disconnect/reconnect and server expiry browser tests |
| SYN-001 | P0 / L | Claude + Codex | BACKLOG | EVAL-001, FND-002 | C06; bounded node auth, branch-scoped delta, event IDs/outbox/inbox/cursors/conflict revisions; replay/order/revocation tests. Claude owns `src/lib/sync/**` + event model; Codex owns sync route handlers and `prisma` sync tables |
| EDGE-001 | P1 / L | Claude | BACKLOG | SYN-001, OMR-002 | Windows runtime/local store, secure secrets, signed update/rollback, disk guard; real offline scan/evaluate/reconnect, AC-013/014/020 |
| UI-011 | P1 / M | Antigravity | BACKLOG | UI-001, C06 acknowledged | Node pairing/status/queue/failure/conflict views driven by actual state |
| AI-001 | P1 / L | Claude | BACKLOG | ACA-001, SEC-001 | Output schemas/provenance/timeouts, approved source retrieval, bank fallback and scoped Copilot actions; AC-003/015/018; remove invalid generator fallback. Split into CLD-003 (gateway hardening) plus Copilot tool scoping |
| UI-012 | P1 / M | Antigravity | BACKLOG | UI-001, AI-001 contract | Candidate review and Copilot evidence/action preview; uncertainty/fallback visible; Tutor only behind Beta flag |
| REL-001 | P0 / L | Claude (integrator) + Codex + Antigravity + product owner | BACKLOG | Core slice above, CLD-004 | Integrated teacher/parent E2E, OMR corpus metrics, load/restore/rollback, pilot teacher timing and sign-off; PRD p. 66 gates recorded |

### First implementation wave

- **Codex**: FND-001 (DONE) -> SEC-001 (DONE, C01 published) -> FND-002 coordination -> STU-001/ACA-001 and backend critical path EXM/EVAL/OMR routes.
- **Antigravity**: UI-001 (DONE) -> UI-002 (DONE) -> UI-003+.
- **Claude**: CLD-001 (CI) and CLD-002 (OMR corpus harness) now — neither blocks on C01 or on schema. Then FND-002 with Codex (Claude drives Compose/CI/Docker; Codex owns `prisma/schema.prisma` and the SQLite->Postgres provider switch — never a simultaneous schema migration while another backend task changes schema). Then CLD-003 once the AI-001 contract lands.

UI fixtures may proceed before endpoints, but fixture work is never labeled integrated functionality. After foundation, prioritize EXM/OMR/EVAL/INT/REP over operations/CMS/CBT/edge/AI breadth. All remaining Must work stays in the release board. Select hardware adapters, tutor and native Android only after the core gate and an explicit scoped task.

## Claims


| Task | Owner | Claimed At | Base Commit | File Scope | Status | Next Checkpoint |
|---|---|---|---|---|---|---|
| UI-001 | Antigravity | 2026-09-08 23:25 Asia/Kolkata | `59f658c` | `src/app/page.tsx`, `src/components/**` | DONE | Complete; handoff written to docs/handoffs/UI-001-antigravity.md |
| FND-001 | Codex | 2026-09-08 23:30 Asia/Kolkata | `263f4ba` | `vitest.config.ts`, `tests/**`, `docs/TESTING.md`, board and own handoff | DONE | SEC-001 and C01; code developed in separate codex/fnd-001-isolated-tests worktree |
| SEC-001 | Codex | 2026-09-09 00:05 Asia/Kolkata | `4d1f224` | auth/scope/domain helpers, protected API routes, regression tests, C01 doc | DONE | Integrated `598b7dd`; C01 published; explicit profile-FK migration remains STU-001 |
| CLD-001 | Claude | 2026-09-09 Asia/Kolkata | `4d1f224` | `.github/workflows/ci.yml`, `.dockerignore`, own handoff | DONE | Fast-forward integrated into master by Antigravity; handoff docs/handoffs/ACK-claude-antigravity.md |
| CLD-002 | Claude | 2026-09-09 Asia/Kolkata | `2983b1e` | `tests/omr-corpus/**`, own handoff, own board rows | DONE | Codex carve-out ack in `docs/handoffs/ACK-claude-codex.md`; integrated by Claude; baseline `tests/omr-corpus/REPORT.md` |
| FND-002 | Codex + Claude | 2026-09-09 Asia/Kolkata | `2cdfd89` + Codex integration | Claude: Docker/Compose/CI/observability; Codex: Prisma/provider/migration review; `docs/handoffs/FND-002-claude.md` | DONE | PostgreSQL provider path and initial migration integrated; entrypoint selects migrations for PostgreSQL and db push for SQLite; tests and TypeScript checks pass. Container smoke awaits a remote CI runner because Docker is unavailable locally. |
| OMR-001 | Codex + Claude | 2026-09-09 01:05 Asia/Kolkata | `82db1fd` | `src/lib/omr/omr-engine.ts`, OMR finalize route, corpus runner/baseline/report, `.gitignore`; `docs/handoffs/OMR-001-codex.md` | IN_PROGRESS | Safety logic integrated `114070c`; Claude review and real raster implementation remain |
| UI-002 | Antigravity | 2026-09-09 00:50 Asia/Kolkata | `2983b1e` | `src/app/page.tsx`, `src/components/shell/**`, `src/components/auth/**` | DONE | Complete; handoff docs/handoffs/UI-002-antigravity.md; 9 test files / 43 tests pass, Next.js build passes |
