# Progress snapshot - 2026-09-09 (Claude)

Baseline `7652cb9` (09-08 21:35) -> `74277c4` (09-09 10:08). Shared read for Codex and Antigravity; not a task claim.

## How much is done

Task/commit counts overstate completion (per `PROJECT_ANALYSIS.md`), so three lenses:

| Lens | Estimate |
|---|---|
| By task count | 14 / 35 DONE + 2 partial ~= **~43%** |
| By the 5 release gates, weighted | **~35% of a releasable product** |
| Foundation / safety scaffolding | **~85-90%** |

Release-gate breakdown:

| Gate | State | ~% |
|---|---|---|
| 1. Foundation (tenancy, isolation, test harness, CI, deploy config) | SEC-001 + FND-001/002 + CLD-001/002b done | ~90% |
| 2. Printable exam (versioned questions, validated rules, immutable snapshot, checked PDF) | ACA-001 done, EXM-001 in progress | ~35% |
| 3. Assessment pilot (real scans, evidence, retry-safe finalize, reproducible scoring) | OMR safety + raster front-end done; no PNG/PDF decoder, no EVAL-001, no OMR-002 | ~25% |
| 4. Closed loop (mastery -> worksheet -> retest -> scoped parent report) | not started (INT-001, REP-001 backlog) | ~5% |
| 5. Broader release (ops/CMS/AI/PWA + node beta) | AI gateway hardened, C06 drafted+acked; CRM/fees/CMS still demo | ~15% |

Expensive-to-retrofit work (tenant isolation, deterministic-scoring boundary, AI-never-authoritative, OMR fail-safe, schema-parity guard, CI) is disproportionately done -> the project is **more de-risked than feature-complete**. `tests/e2e/` currently has **18 `it.todo`** = the honest "not proven end-to-end yet" count.

## Velocity with 3-lane cooperation

- ~12.5 h wall-clock, ~40 commits, 3 agents in parallel lanes.
- Since Claude joined (00:22): ~13 vertical slices + 6 contracts. Roughly **3 slices/hour** across the team when active.
- **Zero merge conflicts, zero rework.** Lane boundaries + file handoffs + contract-before-implementation held. Schema-parity guard already caught its first near-drift.
- Effective throughput ~= **3-4x a single competent engineer** on this codebase, because backend / UI / platform rarely touch the same files.

## What this speed does NOT cover

Pilot institute, physically scanned OMR sheets, browser E2E, load/restore drills, hardware-specific node testing, production deploy - the PRD p.66 gates, none AI-accelerable. The remaining critical path **EVAL-001 -> OMR-002 -> INT-001 -> REP-001** is sequential and dependency-chained, so parallelism helps less from here and per-hour velocity will drop.

## Current lane status

- **Codex** — EXM-001 IN_PROGRESS (critical path). Queued follow-ups: OMR-001 backend half (PNG/PDF decoder, job-route wiring + object storage, geometry tied to the artifact PDF), C06 additive schema + route integration (acked with amendments, waits on EVAL-001), CLD-003 shim removal on route migration (done in `a909b19` - shims can be deleted).
- **Antigravity** — UI-004 DONE. Next: UI-005 (OMR review) once C04 lands, UI-006/UI-007 gated on EVAL/REP. Browser E2E for REL-001 should mirror the `Sn` step order in `tests/e2e/golden-workflow.e2e.test.ts`.
- **Claude** — CLD-001/002/002b/003/004 done, FND-002 infra done, OMR-001 raster front-end done, AI-001 + C06 contracts published/acked. Blocked on EVAL-001 for SYN-001; will fold C06 amendments into the contract and propose `src/lib/sync/**` service signatures next, and add real labelled `GrayscaleImage` fixtures once the decoder exists.

## The one number to watch

`tests/e2e/` `it.todo` count: **18 -> 0** is the golden-loop completion meter. Each flips to a live `it` when its owning task lands (EXM/OMR/EVAL/INT/REP/CBT/STU-001).
