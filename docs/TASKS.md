# Shared delivery board

Baseline: `7652cb9`, assessed 2026-09-08. Owners below are proposed lanes, not accepted claims. Only DOC-001 is complete. READY tasks may be claimed; BACKLOG tasks wait for their dependencies. Estimates are relative S/M/L task sizes, not delivery promises. Split L items into independently testable slices before implementation.

| ID | Priority / size | Owner | Status | Dependencies | Deliverable and acceptance |
|---|---|---|---|---|---|
| DOC-001 | P1 / M | Codex | DONE | — | Read PRD/repo, record gaps, board and handoff process; this documentation task |
| FND-001 | P0 / M | Codex | READY | — | Isolated synthetic DB factory, route harness and repeatable baseline; no shared DB mutation, two tenants/two branches and all identity relationships |
| UI-001 | P1 / M | Antigravity | DONE | — | Extract shell/navigation/common feedback from page.tsx; preserve behavior; no backend changes; verify desktop/mobile navigation and dialogs |
| SEC-001 | P0 / L | Codex | BACKLOG | FND-001 | C01; authenticate parent reports, explicit identity links, CBT ownership, branch/batch/related-ID checks and safe exam/content projections; negative route tests plus legitimate access |
| UI-002 | P1 / M | Antigravity | BACKLOG | UI-001, C01 acknowledged | Session-driven role shell, real login/logout, authorized navigation and 401/403 states; remove production reliance on demo persona credentials |
| FND-002 | P0 / M | Codex | BACKLOG | FND-001 | Separate cloud PostgreSQL/local SQLite plan, reviewed migrations, clean build/Compose configuration, secret handling, .dockerignore and CI; fresh isolated install/migrate/build smoke passes |
| STU-001 | P1 / L | Codex | BACKLOG | SEC-001, FND-002 | C02; courses/batches/assignments, parent links, student edit/archive/import with preview/error output; AC-002 and scope tests |
| UI-003 | P1 / L | Antigravity | BACKLOG | UI-002, C02 acknowledged | Student/import/parent-link/batch workflows and resumable onboarding; malformed/duplicate CSV and empty states verified |
| ACA-001 | P1 / L | Codex | BACKLOG | FND-002, SEC-001 | Versioned graph mappings/questions/tags/source rights, tenant-private content; historical content survives edits, no cross-tenant selection |
| EXM-001 | P0 / L | Codex | BACKLOG | ACA-001 | C03; validated profile/blueprint, draft/review/transactional finalize and immutable snapshots; no unapproved AI candidates or invalid totals |
| UI-004 | P1 / L | Antigravity | BACKLOG | UI-001, C03 acknowledged | Seven-step exam wizard, bank selection, review and artifact preview; invalid blueprint cannot finalize; loading/failure/retry states |
| EVAL-001 | P0 / M | Codex | BACKLOG | EXM-001 | Explicit configurable partial marking, strict numerical inputs, versioned tie/cohort rules and immutable revisions; golden vectors/replay/answer-key correction |
| OMR-001 | P1 / L | Codex | BACKLOG | EXM-001, FND-002 | C04; actual image/PDF storage/worker, normalization/anchors/identity/density/crops; labeled real-sheet fixture report with safe rejection |
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
| SYN-001 | P0 / L | Codex | BACKLOG | EVAL-001, FND-002 | C06; bounded node auth, branch-scoped delta, event IDs/outbox/inbox/cursors/conflict revisions; replay/order/revocation tests |
| EDGE-001 | P1 / L | Codex | BACKLOG | SYN-001, OMR-002 | Windows runtime/local store, secure secrets, signed update/rollback, disk guard; real offline scan/evaluate/reconnect, AC-013/014/020 |
| UI-011 | P1 / M | Antigravity | BACKLOG | UI-001, C06 acknowledged | Node pairing/status/queue/failure/conflict views driven by actual state |
| AI-001 | P1 / L | Codex | BACKLOG | ACA-001, SEC-001 | Output schemas/provenance/timeouts, approved source retrieval, bank fallback and scoped Copilot actions; AC-003/015/018; remove invalid generator fallback |
| UI-012 | P1 / M | Antigravity | BACKLOG | UI-001, AI-001 contract | Candidate review and Copilot evidence/action preview; uncertainty/fallback visible; Tutor only behind Beta flag |
| REL-001 | P0 / L | Codex + Antigravity + product owner | BACKLOG | Core slice above | Integrated teacher/parent E2E, OMR corpus metrics, load/restore/rollback, pilot teacher timing and sign-off; PRD p. 66 gates recorded |

## First implementation wave

Codex claims FND-001, then SEC-001. Antigravity claims UI-001, then UI-002 after C01 acknowledgement. FND-002 follows in Codex's lane; do not attempt a simultaneous schema migration while another backend task changes schema. UI fixtures may proceed before endpoints, but fixture work is never labeled integrated functionality.

After foundation, prioritize EXM/OMR/EVAL/INT/REP over operations/CMS/CBT/edge/AI breadth. All remaining Must work stays in the release board. Select hardware adapters, tutor and native Android only after the core gate and an explicit scoped task.

## Claims

| Task | Owner | Claimed At | Base Commit | File Scope | Status | Next Checkpoint |
|---|---|---|---|---|---|---|
| UI-001 | Antigravity | 2026-09-08 23:25 Asia/Kolkata | `59f658c` | `src/app/page.tsx`, `src/components/**` | DONE | Complete; handoff written to docs/handoffs/UI-001-antigravity.md |

