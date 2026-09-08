# CLD-004 / Claude - E2E golden-workflow harness

- **Task / owner**: CLD-004 (E2E golden-workflow harness) / Claude
- **Timestamp + timezone**: 2026-09-09 Asia/Kolkata
- **Status**: DONE (Claude-owned test-only slice; `tests/e2e/**` carve-out, same as `tests/omr-corpus/**`)
- **Base**: `a909b19` on `master`.

## Files

- `tests/e2e/support/harness.ts` [NEW] - `call(handler, path, opts)` invokes a real route handler with a real `NextRequest` (params passed as `{ params }`, Next 14/15 compatible), returns `{ status, body, headers, raw }`; `loginAs(email, tenantCode)` logs in through the real handler and returns the session cookie token; re-exports `createTestWorld`.
- `tests/e2e/golden-workflow.e2e.test.ts` [NEW] - the PRD critical path in order: auth -> students -> exam builder -> artifacts -> OMR -> evaluation -> results -> mastery -> intervention -> retest -> parent report. 13 live `it`, 14 `it.todo`.
- `tests/e2e/cbt-ownership.e2e.test.ts` [NEW] - AC-011: 4 live `it` (own-tenant start, cross-tenant save denied, idempotent start, no double-submit), 4 `it.todo` (server clock, autosave/reconnect, eligibility, common result pipeline).
- `tests/e2e/README.md` [NEW] - how to read it; the `todo`->`it` conversion rule.

Picked up by `npm test` and CI (`*.e2e.test.ts` matches `tests/**/*.test.ts`). No `tests/support/**` or existing-suite edits.

## What is proven end to end today (17 live assertions)

- Teacher login -> tenant-scoped session; teacher lists tenant students.
- Teacher creates an exam from an approved question; a counsellor cannot (403); a cross-tenant question is rejected (400/403).
- Exam artifact endpoint responds for a real exam (no 500).
- OMR job creation rejects unauthenticated; finalizing a missing job does not 500 (Codex 409/404 guard).
- Results endpoint returns the tenant's exam; **teacher A cannot read tenant B's exam results (AC-001)** - no title leak.
- **Parent opens their linked child's portal; cannot open an unlinked child (AC-010)** - no name leak.
- CBT: student starts on own tenant's exam; another tenant's user cannot save into that attempt; start is idempotent; a submitted attempt cannot be resubmitted (409).
- No exam question is ever linked cross-tenant.

## Launch-gate map (18 `it.todo`, each labelled with its blocking task)

| Blocking task | todo steps |
|---|---|
| STU-001 | assigned-batch-only student visibility |
| EXM-001 | draft->review->transactional finalize; immutable snapshot; blueprint validation; branded/paginated PDF + scannable fiducial |
| OMR-001 | real image/PDF ingest, anchors, identity, per-bubble confidence; review with cropped evidence + audited override |
| OMR-002 | retry-safe finalize blocked while review pending; one logical result per batch |
| EVAL-001 | deterministic scoring, negative marking, rank/percentile snapshot, reproducible re-run; audited answer-key revision |
| INT-001 | MasteryEvidence -> weakness (insufficient-evidence handling); 3-tier ladder + printable worksheet; retest recompute; unverified-until-retest (AC-009) |
| REP-001 | versioned published report; scoped expiring share link; multilingual summary on persisted facts; real cohort size (not hardcoded 30) |
| CBT-001 | server clock expiry; autosave + reconnect restore (AC-011); eligibility/attempt-limit; CBT result in common pipeline |

**This is the REL-001 progress meter.** As each task lands, convert its `it.todo(...)` line(s) to real `it(...)` in the same PR - do not fork the file; keep the `Sn` numbering.

## Checks

- `npx tsc --noEmit` -> exit 0.
- `npm test` -> 13 files / 75 pass + 18 todo. Added 2 files; no existing test changed.

## Next

- Owning agents: when your task lands, flip its `it.todo`s in `tests/e2e/`.
- Claude: SYN-001 (`src/lib/sync/**` + event model) is the next Claude-lane task but is blocked on EVAL-001 + FND-002; FND-002 is done, so SYN-001 unblocks when EVAL-001 lands. Until then Claude can extend the OMR corpus with real labelled sheets once OMR-001 raster work starts, or wire `AIFeedback` telemetry.
