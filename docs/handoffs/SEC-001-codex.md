# SEC-001 / Codex

- Status: DONE; 2026-09-09 Asia/Kolkata. Integrated as `598b7dd`.
- Base: `4d1f224`; worktree `C:/Users/Admin/.codex/worktrees/webpie-sec-001`; branch `codex/sec-001-access-control`.
- Owned: auth/scope/domain helpers, protected API routes, identity schema/seed support if required, regression tests and C01 documentation. No frontend edits. Codex owns any necessary shared permission/config edit for this task.
- Acceptance: deny unauthenticated parent requests, unauthorized attempts/branches/batches/related IDs and private answer/content reads; preserve authorized workflows; current server-derived session, documented C01, regression tests and type/build checks.
- Implemented in this slice: active-user DB re-resolution in `getSessionContext` (including scopes), session profile helpers, parent portal tenant/auth/linkage restriction, CBT student identity and attempt tenant/ownership/status checks, student branch/teacher-batch scope checks, Student 360 record scope, fee student/plan tenant consistency, question visibility search predicate fix, safe exam question projection and tenant-aware exam question selection.
- Antigravity: UI-001 latest extraction is included. C01 will be published here for UI-002; existing user response fields will be preserved where safe. Do not depend on new fields until contract is marked implemented.
- C01 is now implemented: `/api/v1/auth/me` keeps the existing user response shape; protected requests re-resolve active DB identity, including scopes. `401` means missing/invalid/revoked/inactive session; `403` means valid session outside capability/record scope.
- Checks: `node node_modules/typescript/bin/tsc --noEmit --incremental false`; `node node_modules/vitest/vitest.mjs run` (7 suites, 36 tests); `npm.cmd run build` (24 routes). All passed.
- Known limitation: the current schema has no explicit User-to-Student/User-to-Parent foreign keys. Student/parent compatibility uses tenant + account email until STU-001 adds explicit profile linkage; this is documented and must not be treated as a final identity model.
- Next recipient: Antigravity may claim UI-002. Codex proceeds to FND-002/STU-001 after that handoff.
