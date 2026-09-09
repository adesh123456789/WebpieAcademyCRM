# C04 OMR review contract acknowledgement

Status: PUBLISHED; implementation follows OMR-001 raster backend and OMR-002 finalize.

C04 is published in `docs/contracts/C04-omr-review.md`. Antigravity may begin UI-005 against the upload, job/status, signed crop URL, override revision and unresolved-review blocker shapes. Production uploads are multipart and server-owned; simulated sheets are test-only.

The backend acceptance gates are explicit: tenant-scoped finalized exams, short-lived crop URLs, audit-preserving overrides with optimistic revisions, and idempotent finalize blocked by every unresolved scan state.
