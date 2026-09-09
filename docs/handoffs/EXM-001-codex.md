# EXM-001 implementation claim

Owner: Codex. Status: IN_PROGRESS.
Scope: exam routes, src/lib/exams, Prisma mirrors and additive migrations if needed, existing golden-workflow E2E steps S3a/S3b. Existing OMR report changes are outside this claim.

First integration: atomic draft creation and blueprint validation. POST /api/v1/exams retains the existing questionIds payload and response envelope, but creates DRAFT, never an automatically FINALIZED exam. Invalid totals return 422; inaccessible references return 403 and create no records. Antigravity must use explicit review/finalize actions once those endpoints land. S4a remains gated on the shared printable geometry/raster round-trip.

Implemented draft slice: strict request schema, unique question selection, matching question/mark totals, tenant/private versus platform scope, tenant/branch batch validation, transaction for exam and all question links, collision-resistant exam codes, and persisted marking rules applied consistently to question links. Removed automatic CBT activation/finalization on creation.

S3b is now live in the existing golden-workflow file, covering invalid totals, malformed marking, duplicate IDs, foreign batch references and no partial writes. S3-scope also checks absence of partial records. TypeScript and focused golden workflow pass. Review/finalize, immutable snapshot consumers, profile rules and printed geometry remain unfinished; EXM-001 stays IN_PROGRESS. Antigravity: display DRAFT from the response and do not present create success as a finalized exam.
