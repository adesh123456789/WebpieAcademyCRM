# EXM-001 implementation claim

Owner: Codex. Status: IN_PROGRESS.
Current slice: PATCH draft editing and review invalidation, limited to src/lib/exams/edit.ts, exams/[id]/route.ts, C03 and existing S3a assertions. No schema edits.
Scope: exam routes, src/lib/exams, Prisma mirrors and additive migrations if needed, existing golden-workflow E2E steps S3a/S3b. Existing OMR report changes are outside this claim.

First integration: atomic draft creation and blueprint validation. POST /api/v1/exams retains the existing questionIds payload and response envelope, but creates DRAFT, never an automatically FINALIZED exam. Invalid totals return 422; inaccessible references return 403 and create no records. Antigravity must use explicit review/finalize actions once those endpoints land. S4a remains gated on the shared printable geometry/raster round-trip.

Implemented draft slice: strict request schema, unique question selection, matching question/mark totals, tenant/private versus platform scope, tenant/branch batch validation, transaction for exam and all question links, collision-resistant exam codes, and persisted marking rules applied consistently to question links. Removed automatic CBT activation/finalization on creation.

S3b is live in the existing golden-workflow file, covering invalid totals, malformed marking, duplicate IDs, foreign batch references and no partial writes. S3-scope also checks absence of partial records.

Lifecycle follow-up: explicit review/finalize routes with optimistic exam versions, reviewed-content fingerprint, approval/scope checks, transactional QuestionVersion snapshots and audit, same-key retry response, and pinned-version reads in artifacts/list/CBT/OMR/results. Artifact access requires exams_manage. CBT start rejects drafts. No new schema fields or migration were required; existing QuestionVersion stores snapshots and the blueprint records their IDs.

S3a is now live and verifies lifecycle, retry behavior, audit count, answer-key stability after source edits, AI candidate rejection and stale-review rejection. TypeScript passes; full workspace suite: 16 files, 118 passing tests, 16 TODOs (includes Antigravity's concurrent node UI tests). No Prisma regeneration or shared database reset performed.

Remaining: exam-profile-specific rules, draft editing/re-review, backfill policy for legacy finalized exams without snapshots, concurrent PostgreSQL integration testing, and S4a shared printable geometry/raster round-trip. Legacy exams retain the existing mutable-source read behavior. EXM-001 stays IN_PROGRESS. Antigravity: create -> review(expectedVersion) -> finalize(expectedVersion,idempotencyKey); use a stable key per finalize action and handle 409 stale review/version responses. Editing/re-review UI must remain pending until the backend endpoint exists.

Follow-up: draft editing/re-review is now implemented. PATCH accepts partial create fields plus expectedVersion, preserves unspecified configuration, recalculates totals, validates question/batch scope and commits replacement links with audit in one transaction. Edits invalidate review and return DRAFT with an incremented version; FINALIZED is immutable. S3a covers finalized edit rejection, unauthorized replacement, marking/total changes, stale edit rejection and mandatory re-review. Antigravity can now wire PATCH and subsequent review with returned versions.

Validation for this edit slice: TypeScript passes; full suite 17 files, 126 passing tests, 32 TODOs (16 API/CBT plus 16 browser-spec placeholders). No additional API gate was closed; this expands S3a coverage.

Remaining gates are profile-specific rules, legacy snapshot backfill policy, PostgreSQL concurrency checks and S4a printed/raster geometry. The new browser-golden-workflow file adds 16 TODOs separately; its current live assertions use local constants rather than an actual browser, so they are not browser execution evidence.

Review acknowledgement: Claude approved EXM-001 (`REVIEW-exm-001-claude.md`). ACA question editing must increment `Question.version` whenever content changes; keeping the same version with a changed snapshot is intentionally rejected as `QUESTION_VERSION_CONFLICT`. The global/browser `crypto.randomUUID` difference is cosmetic and retained for now. Blueprint metadata remains JSON until a dedicated model is justified.

EVAL-001 started: `persistEvaluationResult` now preserves immutable ExamResult revisions and reuses an identical deterministic rerun. A changed score/question response creates the next version instead of mutating the prior row. OMR finalize uses this helper; CBT persistence remains queued for the common result-pipeline slice.
