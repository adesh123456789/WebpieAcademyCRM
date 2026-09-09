# C03 Exam versions contract

**Producer:** Codex API  
**Consumer:** Antigravity UI-004

## Implementation status: draft creation slice

POST currently accepts the existing `{title, examType, questionIds, batchIds?, durationMinutes?, totalMarks?, totalQuestions?, markingRules?}` payload and returns `{success:true, exam}` with `exam.status = DRAFT`, no finalizedAt, and CBT disabled. Positive correct marks, non-positive incorrect marks and zero unattempted marks are supported. Duplicate question IDs or malformed inputs return 400; unauthorized question/batch references return 403; supplied totals inconsistent with selection return 422. Every rejected request leaves no partial exam or question links. ProfileId/blueprint-based input and the lifecycle endpoints below remain proposed, not available APIs.

## Endpoints

- `POST /api/v1/exams` creates a `DRAFT` with `{title,profileId,blueprint}` and returns `{id,status,profileId,blueprint,version}`.
- `PATCH /api/v1/exams/:id` updates a draft using `{expectedVersion,...changes}` and returns the incremented version. Concurrent edits receive `409 VERSION_CONFLICT`.
- `POST /api/v1/exams/:id/review` validates profile/question versions and blueprint totals; returns `{id,status:"IN_REVIEW",errors:[]}` or `422 BLUEPRINT_INVALID` with field errors.
- `POST /api/v1/exams/:id/finalize` accepts `{expectedVersion,idempotencyKey}` and returns an immutable `{id,status:"FINALIZED",snapshotId,finalizedAt}`. It refuses invalid blueprints, unapproved AI candidates, stale versions, or repeated keys with different payloads.
- `GET /api/v1/exams/:id` returns a staff projection with question source/version metadata; student projections expose only published prompt/options/marks and never answer keys or draft candidates.

Profile, question, and tag references are resolved inside the authenticated tenant. Finalization records an audit event and snapshots the exact approved versions; later edits create a new draft version and cannot mutate a finalized snapshot. Errors use the existing envelope with `SCOPE_DENIED`, `BLUEPRINT_INVALID`, `UNAPPROVED_CANDIDATE`, `VERSION_CONFLICT`, and `IDEMPOTENCY_CONFLICT`.
