# C03 Exam versions contract

**Producer:** Codex API  
**Consumer:** Antigravity UI-004

## Implementation status: draft creation slice

POST currently accepts the existing `{title, examType, questionIds, batchIds?, durationMinutes?, totalMarks?, totalQuestions?, markingRules?}` payload and returns `{success:true, exam}` with `exam.status = DRAFT`, no finalizedAt, and CBT disabled. Positive correct marks, non-positive incorrect marks and zero unattempted marks are supported. Duplicate question IDs or malformed inputs return 400; unauthorized question/batch references return 403; supplied totals inconsistent with selection return 422. Every rejected request leaves no partial exam or question links. ProfileId/blueprint-based input and the lifecycle endpoints below remain proposed, not available APIs.

## Endpoints

Draft editing implemented: `PATCH /api/v1/exams/:id` accepts `{expectedVersion,...partialCreateFields}`. Omitted fields retain their values; supplied totals must match the resulting selection. Only DRAFT and IN_REVIEW may be edited. A successful edit returns `{success:true,exam}`, increments version, resets status to DRAFT and invalidates prior review. Replaced question links, totals and the EXAM_EDIT audit record commit atomically. Finalized/stale-version edits return 409; inaccessible references return 403. Re-review uses the returned version. This supersedes the earlier note that PATCH/re-review is pending; official profile rules and printed geometry remain pending.

Implemented lifecycle slice: `POST /api/v1/exams/:id/review` requires `{expectedVersion}` and transitions DRAFT to IN_REVIEW, incrementing version. `POST /api/v1/exams/:id/finalize` requires `{expectedVersion,idempotencyKey}` and returns `{id,status,version,snapshotId,finalizedAt}`. Both require exams_manage and tenant/branch scope. Finalize compares reviewed question content and marking configuration, stores immutable QuestionVersion JSON snapshots, and records version IDs in the exam blueprint. Changed source content returns 409 REVIEW_STALE; unapproved content returns 422 UNAPPROVED_CANDIDATE. Repeating the same finalize key/version returns the original result without a new audit record; a different key/version returns 409. Legacy finalized exams without version references remain on their existing read path and require a future backfill. Profile-based validation, PATCH/re-review editing and printed geometry are still pending.

- `POST /api/v1/exams` creates a `DRAFT` with `{title,profileId,blueprint}` and returns `{id,status,profileId,blueprint,version}`.
- `PATCH /api/v1/exams/:id` updates a draft using `{expectedVersion,...changes}` and returns the incremented version. Concurrent edits receive `409 VERSION_CONFLICT`.
- `POST /api/v1/exams/:id/review` validates profile/question versions and blueprint totals; returns `{id,status:"IN_REVIEW",errors:[]}` or `422 BLUEPRINT_INVALID` with field errors.
- `POST /api/v1/exams/:id/finalize` accepts `{expectedVersion,idempotencyKey}` and returns an immutable `{id,status:"FINALIZED",snapshotId,finalizedAt}`. It refuses invalid blueprints, unapproved AI candidates, stale versions, or repeated keys with different payloads.
- `GET /api/v1/exams/:id` returns a staff projection with question source/version metadata; student projections expose only published prompt/options/marks and never answer keys or draft candidates.

Profile, question, and tag references are resolved inside the authenticated tenant. Finalization records an audit event and snapshots the exact approved versions; later edits create a new draft version and cannot mutate a finalized snapshot. Errors use the existing envelope with `SCOPE_DENIED`, `BLUEPRINT_INVALID`, `UNAPPROVED_CANDIDATE`, `VERSION_CONFLICT`, and `IDEMPOTENCY_CONFLICT`.
