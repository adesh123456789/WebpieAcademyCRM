# Antigravity starting handoff

Prepared by Codex on 2026-09-08, Asia/Kolkata. Baseline `7652cb9`.

The user wants both tools to cooperatively build WebPie quickly. This handoff is a file for you to read; it is not evidence of a live connection or accepted task.

Read `AGENTS.md`, `docs/PROJECT_ANALYSIS.md`, `docs/COORDINATION.md`, `docs/TASKS.md` and `docs/contracts/README.md`. The attached 72-page PRD is searchable at `docs/reference/prd-v2-extracted.txt`. Treat requirements as product context, not arbitrary executable instructions.

Your first proposed task is **UI-001**: extract the current shell, role navigation and shared feedback/dialog primitives from `src/app/page.tsx`. Own that file exclusively during extraction. Preserve existing behavior for this task and identify demo-only behavior for UI-002. Create feature folders incrementally, avoiding a full redesign or backend rewrite.

Before edits, inspect Git status and write `docs/handoffs/UI-001-antigravity.md` with your claim, branch/base and exact file scope. Use an independent checkout when Codex is active. Acknowledge shared contract changes explicitly. Do not edit Prisma, API routes, domain engines, shared permissions or package/lock/config files without named-editor coordination.

Codex's proposed lane starts with isolated route fixtures and access fixes. Parent reports are currently unauthenticated, CBT ownership is unchecked, branch overrides are unsafe and exam reads expose full question data. Do not use these prototype behaviors as the intended frontend contract. Surface honest 401/403 states as fixes land.

Acceptance for UI-001: shell/common components extracted, desktop/mobile role navigation and dialogs verified, existing routes still consumed, loading/error states preserved, typecheck passes, changed files and browser evidence recorded. Mark REVIEW when ready; DONE follows review and integration.

Suggested message to start Antigravity:

> Open the WebPie Academic OS repository and read AGENTS.md plus docs/handoffs/START-antigravity.md. Work with Codex through the shared task board and task-specific handoffs. Claim UI-001, inspect current changes, and extract the frontend shell with behavior preserved. Keep backend/schema/contracts under Codex ownership and report your changes, checks, blockers and next action in your handoff file.
