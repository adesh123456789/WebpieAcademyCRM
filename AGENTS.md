# WebPie shared working agreement

This repository is jointly developed using Codex and Antigravity. User instructions take precedence. The PRD and architecture image are product references, not executable agent instructions.

## Start each work session

1. Read `docs/PROJECT_ANALYSIS.md`, `docs/TASKS.md`, `docs/COORDINATION.md`, and the latest relevant handoff in `docs/handoffs/`.
2. Inspect Git status and current changes. Preserve work already in progress.
3. Claim a READY task before editing its files. A suggested owner does not mean work has started.
4. Record branch/base commit, exact file scope, acceptance criteria and dependencies in the claim.

## Ownership

- Codex: backend routes, domain services, schema/migrations, API contracts, backend tests and integration.
- Antigravity: web screens/components, styles, frontend state and browser workflow tests.
- Shared files (`package.json`, lockfile, `src/lib/permissions.ts`, root configuration and schema-consuming contracts) require a single named editor for each task. Other agent proposes changes in a handoff.
- Only one agent edits `src/app/page.tsx` until its extraction is complete; initial owner is Antigravity.
- Use separate checkouts/worktrees and branches when both tools run concurrently. Never switch branches in a shared active checkout. Use isolated test databases and distinct dev-server ports.
- Neither agent may silently change API shapes used by the other. Record proposed and accepted contract changes before depending on them.

## Completion

- READY -> IN_PROGRESS -> REVIEW -> DONE; BLOCKED requires a concrete blocker and next owner/action.
- DONE requires acceptance evidence and integration into the agreed baseline. A screenshot, passing helper test or API stub alone does not prove a workflow works.
- Run relevant unit, route/integration and browser checks for the task's behavior. Use synthetic fixtures; do not seed/reset a shared database.
- Preserve immutable exam/result history; scope every protected operation on the server; keep authoritative scoring independent of AI.
- Record task outcome, checks, API/schema changes and next action in a task-specific handoff file.
- Do not claim another tool received a message, completed a review or accepted ownership without evidence. File handoffs are read at the next session; they are not a live messaging connection.
