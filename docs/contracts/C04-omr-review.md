# C04 OMR jobs and review contract

**Producer:** Codex OMR API / Claude raster service  
**Consumer:** Antigravity UI-005

`POST /api/v1/omr/jobs` accepts multipart image/PDF uploads plus `{examId,batchId}`. The server resolves the tenant and finalized exam from the session, stores the original in object storage, creates a `PROCESSING` job, and returns `{job:{id,status:"PROCESSING",totalSheets,processedSheets,flaggedSheets}}`. Simulated density maps are test-only and are never accepted from an untrusted production client.

Multipart batches require 1–50 single-sheet PNG, JPEG, or PDF files. Each file is limited to 10 MiB, the batch to 100 MiB, and decoded images to 24 million pixels. Missing/unsupported/malformed or multi-page files return 400; size/count limits return 413. The entire batch is validated before creating the job or storing any original. PDF rasterization requires a PDF-capable decoder in the deployed runtime; an unsupported renderer returns 400 before job creation.

`GET /api/v1/omr/jobs/:id` returns a tenant-scoped job with scans: `{id,studentId,detectedRollNumber,status,confidenceScore,detectedResponses,verifiedResponses,ambiguityFlags,cropUrls}`. `cropUrls` are short-lived signed URLs; clients never receive filesystem paths or storage credentials. Scan statuses are `CONFIDENT`, `AMBIGUOUS`, `UNMATCHED`, `REJECTED`, or `OVERRIDDEN`.

`POST /api/v1/omr/scans/:id/override` accepts `{questionNumber,newResponse,reason,expectedVersion}`. It preserves detected and verified values, records actor/time/reason in an audit event, increments the scan revision, and returns the updated scan. Cross-tenant scans, invalid option values, stale revisions, and finalized jobs are rejected.

`POST /api/v1/omr/jobs/:id/finalize` accepts `{idempotencyKey,expectedVersion}`. It returns `{jobId,status:"FINALIZED",resultIds}` only when every scan is complete or explicitly overridden. Any `AMBIGUOUS`, `UNMATCHED`, `REJECTED`, or processing scan returns 409 with blocked scan IDs. Repeating an idempotency key returns the original result without duplicate `ExamResult` rows.

All routes return existing error envelopes with 401/403/404/409/422 status codes and echo `x-request-id`. Processing emits `omrJobStarted`, `omrSheetProcessed`, and `omrSheetRejected`; overrides emit `privilegedAction`. Upload and extraction failures leave a reviewable failed job and never create confident responses.
