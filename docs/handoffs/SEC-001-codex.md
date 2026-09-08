# SEC-001 / Codex

- Status: IN_PROGRESS; 2026-09-08 Asia/Kolkata.
- Base: `4d1f224`; worktree `C:/Users/Admin/.codex/worktrees/webpie-sec-001`; branch `codex/sec-001-access-control`.
- Owned: auth/scope/domain helpers, protected API routes, identity schema/seed support if required, regression tests and C01 documentation. No frontend edits. Codex owns any necessary shared permission/config edit for this task.
- Acceptance: deny unauthenticated parent requests, unauthorized attempts/branches/batches/related IDs and private answer/content reads; preserve authorized workflows; current server-derived session, documented C01, regression tests and type/build checks.
- Implemented in this slice: active-user DB re-resolution in `getSessionContext` (including scopes), session profile helpers, parent portal tenant/auth/linkage restriction, CBT student identity and attempt tenant/ownership/status checks, student branch/teacher-batch scope checks, Student 360 record scope, fee student/plan tenant consistency, question visibility search predicate fix, safe exam question projection and tenant-aware exam question selection.
- Antigravity: UI-001 latest extraction is included. C01 will be published here for UI-002; existing user response fields will be preserved where safe. Do not depend on new fields until contract is marked implemented.
