# EVAL-001 Codex Handoff

Status: IN_PROGRESS — deterministic profile policy slice landed.

## Delivered

- `ExamQuestionConfig` accepts an optional `multipleCorrectPolicy` with explicit `partialMarks` and `wrongMarks`.
- `DeterministicEvaluationEngine.gradeResponse` and `evaluateCohort` consume that policy while preserving the legacy default when no profile is supplied.
- OMR finalize reads `exam.markingRules.multipleCorrectPolicy` and passes it into cohort evaluation.
- CBT attempt finalization reads the same persisted marking rule and uses the shared evaluator.
- Added EVAL-004 coverage for partial and wrong selections under a profile matrix.

Validation: `npx vitest run tests/evaluation.test.ts` (6 passed); `npx tsc --noEmit` (pass).

## Remaining EVAL-001 work

- Complete versioned answer-key/profile revision audit and reproducible rerun coverage.
- Confirm rank/percentile tie and cohort rules against the golden vectors.
- Wire any remaining common result-pipeline consumers to the same evaluator options.

The explicit policy shape is ready for Claude to use when completing EVAL-001 and for downstream OMR-002/INT-001 integration.
