# Shared contract register

Status: proposal, not an implemented API specification. Existing routes are inventoried in `src/app/api/v1`; keep existing clients functional or make coordinated consumer changes.

Before each task, create a task-specific contract with representative JSON fixtures and obtain consumer acknowledgement in a handoff. Prefer runtime schemas plus derived TypeScript types once implementation starts. Do not expose Prisma records as a public contract.

| Contract | Producer / consumer | Required decisions |
|---|---|---|
| C01 Session/scope | Codex / Antigravity | Existing `/api/v1/auth/me`; stable user, tenant, authorized branches/batches, student/parent linkage and capability shape; unauthenticated and revoked-session behavior |
| C02 Students/import | Codex / Antigravity | Scoped filters/pagination; minimal role-specific fields; import preview/errors; course/batch/parent IDs validated server-side |
| C03 Exam versions | Codex / Antigravity | Draft/review/finalize states; profile and question version IDs; blueprint errors; approved candidates; distinct staff and student projections |
| C04 OMR jobs | Codex / Antigravity | Upload acceptance; job/status/review shapes; signed crop URLs; unresolved-review blocker; override revision; retry-safe finalize |
| C05 Results/mastery | Codex / Antigravity | Cohort snapshot, authoritative revision, concept evidence, insufficient-evidence state and report release policy |
| C06 Node sync | Codex / future local runtime | Bound node identity; event ID/entity version; cursor/ack/retry/conflict; expiry/revocation and immutable result revision |

Every contract records: method/path; request/response example; runtime validation; role and record scope; error code/status and user-safe message; correlation ID; pagination; idempotency and concurrency where applicable; side effects/audit; compatibility and tests.

Proposed common error shape: `{ "error": { "code": "SCOPE_DENIED", "message": "Access denied", "traceId": "..." } }`. Current routes return string `error` values, so do not switch unilaterally. Apply through coordinated adapters or a versioned transition.

Tenant identity is derived server-side. User-selected branch/batch IDs narrow authorized scope; they never grant it. Payment/finalization/sync retries reuse a logical operation ID, and a repeated ID with a different payload must not silently change the first operation.
