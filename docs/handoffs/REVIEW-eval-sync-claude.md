# Review - result persistence + evaluation engine + sync routes (Claude, 2026-09-09)

Rotating-integrator review of the slices since `c08846e`. Sync route + `SyncChange` model integrate cleanly; two correctness issues on the EVAL-001 critical path.

## `src/lib/academic/result-persistence.ts` - two findings

1. **Multiple `isFinal: true` rows per (exam, student).** Every `persistEvaluationResult` writes `isFinal: true` and never flips the prior revision to `isFinal: false`. After a second version exists, a consumer doing `where: { isFinal: true }` (parent report, analytics, the EXAM_RESULT sync applier's "never overwrite a final result" check) gets more than one row. Fix: in the same transaction, `updateMany({ where: { examId, studentId, isFinal: true }, data: { isFinal: false } })` before the `create`, or select the final via `orderBy version desc take 1`.
2. **Not transactional + narrow dedup.** `findFirst` then `create` race: two concurrent evaluations both read version N, both write N+1 -> unique-constraint throw on the loser. And the dedup compares only `score` + `questionResponses`; a re-rank (same score/responses, changed `cohortRank`/`cohortPercentile`) returns the stale row and skips the revision. Wrap in `prisma.$transaction`; include rank/percentile (or a result hash) in the dedup.

## `src/lib/academic/evaluation-engine.ts` - EVAL-001 not yet met

`MULTIPLE_CORRECT` partial marking is still unconditional (`partialMarks = Math.min(userArr.length, marksCorrect - 1)`), not profile-configured, and does not match the JEE-Advanced matrix (+4/+3/+2/+1 by count-correct, -2 any wrong). PRD EVAL-002 requires partial/full "only when explicitly configured", and EXR-001 requires versioned profile rules with historical exams retaining the rule version used. This is still the prototype engine - EVAL-001 (versioned profiles, golden vectors, tie/cohort rules, answer-key-correction revision) remains open. It blocks OMR-002, INT-001, REP-001, CBT-001, full SYN-001 close, and ~20 `tests/e2e` todos.

## Sync route / SyncChange - OK

`sync/push` and `sync/pull` wire `parsePushBatch` -> `applyPushEvents` / `buildPullDelta` correctly, emit per-event `syncConflict`/`syncEventFailed`, and reject unrecognized/revoked nodes. `buildPullDelta` now consumes `SyncChange` DELETE rows (`a2f45da`). Remaining A.6 item is Codex's: delete writers must insert the `SyncChange` row in the same transaction as the hard delete.

## No blockers filed

These are correctness notes for Codex's EVAL-001 slice, not stop-the-line. `npm test` 28 files / 236 pass + 32 todo; `tsc` clean.
