# EXM-001 implementation claim

Owner: Codex. Status: IN_PROGRESS.
Scope: exam routes, src/lib/exams, Prisma mirrors and additive migrations if needed, existing golden-workflow E2E steps S3a/S3b. Existing OMR report changes are outside this claim.

First integration: atomic draft creation and blueprint validation. POST /api/v1/exams retains the existing questionIds payload and response envelope, but creates DRAFT, never an automatically FINALIZED exam. Invalid totals return 422; inaccessible references return 403 and create no records. Antigravity must use explicit review/finalize actions once those endpoints land. S4a remains gated on the shared printable geometry/raster round-trip.

Implemented draft slice: strict request schema, unique question selection, matching question/mark totals, tenant/private versus platform scope, tenant/branch batch validation, transaction for exam and all question links, collision-resistant exam codes, and persisted marking rules applied consistently to question links. Removed automatic CBT activation/finalization on creation.

S3b is live in the existing golden-workflow file, covering invalid totals, malformed marking, duplicate IDs, foreign batch references and no partial writes. S3-scope also checks absence of partial records.

Lifecycle follow-up: explicit review/finalize routes with optimistic exam versions, reviewed-content fingerprint, approval/scope checks, transactional QuestionVersion snapshots and audit, same-key retry response, and pinned-version reads in artifacts/list/CBT/OMR/results. Artifact access requires exams_manage. CBT start rejects drafts. No new schema fields or migration were required; existing QuestionVersion stores snapshots and the blueprint records their IDs.

S3a is now live and verifies lifecycle, retry behavior, audit count, answer-key stability after source edits, AI candidate rejection and stale-review rejection. TypeScript passes; full workspace suite: 16 files, 118 passing tests, 16 TODOs (includes Antigravity's concurrent node UI tests). No Prisma regeneration or shared database reset performed.

Remaining: exam-profile-specific rules, draft editing/re-review, backfill policy for legacy finalized exams without snapshots, concurrent PostgreSQL integration testing, and S4a shared printable geometry/raster round-trip. Legacy exams retain the existing mutable-source read behavior. EXM-001 stays IN_PROGRESS. Antigravity: create -> review(expectedVersion) -> finalize(expectedVersion,idempotencyKey); use a stable key per finalize action and handle 409 stale review/version responses. Editing/re-review UI must remain pending until the backend endpoint exists.
