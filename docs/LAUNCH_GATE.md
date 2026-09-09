# Launch gate - go / no-go tracker (REL-001)

Living scorecard for the PRD Section 64 (p.66) launch gates and the Section 3.3 / 41 KPIs, mapped to concrete evidence in this repo. Owned by the REL-001 group (Claude integrator + Codex + Antigravity + product owner). Update on every slice that moves a row.

**Status legend**: `MET` (evidence present and green) · `PARTIAL` (in progress / API layer only / policy met but target unmeasured) · `NOT MET` · `MANUAL` (needs a pilot institute, real hardware, physical sheets, or a product/ops owner - cannot be closed by code).

Snapshot: baseline `7652cb9` -> `6c587bc` (INT-001 + REP-001 landed) (2026-09-09). `npm test`: 34 files, 290 pass, 24 todo. `tsc` clean.

## 1. PRD Section 64 gates

| Gate | Go condition | Evidence | Status |
|---|---|---|---|
| Golden workflow | Real pilot exam completes end to end without an open P0/P1 | API layer S1-S12 has no remaining todos: assigned-batch scope, exam lifecycle, sampler-aligned branded OMR artifact, OMR review/finalize, deterministic revisions, mastery/intervention/retest, and versioned reports are green. Browser layer remains partial and a real pilot run is MANUAL. | PARTIAL |
| Scoring | Validated deterministic test vectors pass | `tests/evaluation.test.ts` and golden S8a/S8b are green: profile-configured marking (`67cd310`), deterministic rank/percentile reruns, immutable result versions (`4a70c01`), and audited answer-key correction revisions (`33fb1fe`). | MET |
| OMR | Supported-condition benchmark meets target, OR an explicit safe review policy is approved | Safe review policy is implemented and tested: `tests/omr-corpus/` baseline (false-confidence 0%, silent-miss 0%, 0/2 unsupported sheets leak CONFIDENT after `114070c`); raster front-end `tests/omr-corpus/raster.test.ts` (fiducials, deskew, REJECTED/UNMATCHED fail-safe); finalize blocked while review pending (`e90b4b4`/`db37941`). The >=99% target itself is UNMEASURED - needs a labelled physical corpus (MANUAL) and the real PNG/PDF decoder (OMR-001 backend half). | PARTIAL |
| Security | Tenant isolation + critical RBAC tests pass | `tests/tenant-isolation.test.ts`, `tests/rbac-authorization.test.ts`, `tests/routes-foundation.test.ts` green; e2e AC-001 (cross-tenant results), AC-010 (parent scope), AC-015 (AI retrieval scope), AC-018 (Copilot scope) all live + green; server-side scope enforcement (`598b7dd`). Third-party penetration test: MANUAL. | MET (test layer) |
| Data | Backup / restore tested | Postgres provider mirror + migrations `0001`-`0009` (FND-002); repeatable dump/restore scripts and drill procedure in `scripts/backup-postgres.ps1`, `scripts/restore-postgres.ps1`, and `docs/ops/backup-restore.md`. **A disposable restore drill still must be executed and evidenced.** | NOT MET |
| Sync | Offline / reconnect scenarios pass on the pilot node | `tests/e2e/offline-node.e2e.test.ts`, `offline-session.e2e.test.ts`, `sync-node.e2e.test.ts` green - pair -> offline ingest + local eval -> reconnect drains through the real `/sync/push` -> idempotent replay -> stale/conflict retained -> token rotation -> revoked node rejected (AC-013/AC-014 at the API layer). Signed transport + encrypted secrets (`f0f5ef1`, `6c68017`). Real Windows hardware node + a full outage drill: MANUAL. | PARTIAL |
| AI | No AI dependency for authoritative scoring; scope / grounding tests pass | `AIGateway` never produces marks/rank/mastery; fabricated-question fallback deleted, bank/template fallback only (CLD-003); `tests/ai-gateway.test.ts` AC-003 (candidate gating), AC-007 (works with keys unset), AC-015 (tenant retrieval scope), AC-018 (Copilot scope) green; runtime zod output validation + `AIRequest` provenance. | MET |
| Support | Runbooks, monitoring, escalation owner assigned | Observability: `src/lib/observability/**` structured logs + `SIGNALS` catalog (6 dashboards + alert thresholds), `observedRoute` wrapper on protected routes; initial triage/recovery procedures in `docs/ops/support-runbook.md`. **A named owner and monitoring backend wiring are still required.** | PARTIAL |
| Training | Pilot staff execute the workflow without engineering assistance | Not started. | MANUAL |
| Schedule rule | If a gate fails in Week 15-16, the affected Beta feature is flagged off rather than weakening the core gate | Feature-flag surface exists for CBT / Copilot / node; policy not yet exercised. | N/A (rule) |

## 2. P0 / P1 defect ledger (Section 60.3 - these block release)

| # | Severity | Description | Status |
|---|---|---|---|
| - | - | None open. | - |

Recently closed by review: cross-tenant question leak in exam draft (`draft.ts`), AI bank fallback (`bank-fallback.ts`), and `InterventionService.createIntervention` (`2bb4c8c`); parent portal unauthenticated (SEC-001); OMR_SCAN sync schema mismatch (`f0f5ef1`); OMR finalize permanently blocked after review (`db37941`).

## 3. KPI targets (Section 3.3 / 41) - measurement plan

| KPI | Target | Measured by | Current |
|---|---|---|---|
| OMR extraction accuracy | >= 99% of supported-condition bubbles pre-review | Labelled physical corpus through the real raster worker; `runCorpus()` metrics | UNMEASURED (synthetic corpus only; simulated engine baseline recorded) |
| Ambiguity safety (false confidence) | Near zero | `tests/omr-corpus/` `falseConfidenceRate` ceiling | 0% on the synthetic corpus |
| Exam build time | Median <= 10 min | Pilot instrumentation (time-on-task) | UNMEASURED |
| Report latency | Finalize -> report available <= 2 min | Pilot instrumentation / job telemetry | UNMEASURED |
| Tenant isolation failures | 0 in the test suite | `tests/tenant-isolation.test.ts` + e2e AC-001/010/015/018 | 0 |
| API p95 (non-AI) | < 500 ms under pilot load | Load test (not built) + `SIGNALS.apiLatency` | UNMEASURED |
| OMR throughput | 50 sheets <= 5 min on pilot hardware (excl. review) | Pilot hardware run | UNMEASURED |
| Teacher activation | >= 80% of pilot teachers complete the golden workflow | Pilot funnel (`SIGNALS.goldenStepCompleted`) | UNMEASURED |

## 4. Golden-loop E2E meter

`tests/e2e/**` `it.todo` count is the API-layer completion signal. **24 -> 0** closes the API side of the "Golden workflow" gate (browser E2E is a separate track).

| Blocking task | Remaining `it.todo` (API + browser) |
|---|---|
| OMR-001 (backend) | API S4a is green; real multipart PNG/PDF decoding, object-storage upload, and browser crop-review remain |
| OMR-002 | (browser only) retry-safe finalize UI with UI-005 |
| CBT-001 | server clock, autosave/reconnect, eligibility, common result pipeline (4) |
| REP-001 | done - S12a/S12b live (`6c587bc`); browser parent-portal flow (with UI-007) remains |

## 5. Items that need the product owner / pilot (MANUAL)

- A pilot institute + a real first exam / year / profile and representative approved questions.
- A labelled physical OMR corpus (capture / print / mark conditions) with expected responses.
- Selected scanner + Windows node hardware for the throughput and offline drills.
- Backup + tested restore procedure; a load test harness and target profile.
- Runbooks, monitoring backend, and a named escalation owner.
- Role training for owner / admin / teacher / accountant / counsellor, and the Week-16 go/no-go sign-off.
