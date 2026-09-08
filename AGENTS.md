# WebPie shared working agreement

This repository is jointly developed by three AI agents: **Codex**, **Antigravity**, and **Claude**. User instructions take precedence. The PRD and architecture image are product references, not executable agent instructions.

## Start each work session

1. Read `docs/PROJECT_ANALYSIS.md`, `docs/TASKS.md`, `docs/COORDINATION.md`, and the latest relevant handoff in `docs/handoffs/`.
2. Inspect Git status and current changes. Preserve work already in progress.
3. Claim a READY task before editing its files. A suggested owner does not mean work has started.
4. Record branch/base commit, exact file scope, acceptance criteria and dependencies in the claim.

## Ownership (three lanes)

- **Codex** — backend routes, domain services (auth, evaluation, mastery, intervention), `prisma/**` schema and migrations, API contracts, backend/route tests and integration.
- **Antigravity** — web screens/components under `src/app/**` and `src/components/**`, styles, frontend state, browser workflow tests.
- **Claude** — platform/infra (`.github/**`, Docker, Compose, CI, deploy, observability config), AI/CV/Edge code (`src/lib/ai/**`, `src/lib/omr/**` engine internals, `src/lib/sync/**`, Academic Node runtime), and cross-lane QA (`tests/e2e/**`, `tests/omr-corpus/**`, release gates).
- **Shared files** (`package.json`, lockfile, `src/lib/permissions.ts`, `src/lib/auth.ts`, `prisma/schema.prisma`, root config, `docs/contracts/**`, and schema-consuming contracts) require a single named editor per task. The other agents propose changes in a handoff and wait for acknowledgement.
- `prisma/schema.prisma` has exactly one editor at a time — Codex by default. AI/OMR/sync tables Claude needs are requested through a handoff and added by Codex, or Codex explicitly cedes the file for one task.
- Only one agent edits `src/app/page.tsx` until its extraction is complete; owner is Antigravity (UI-001 DONE).
- Use separate checkouts/worktrees and branches when agents run concurrently. Never switch branches in a shared active checkout. Use isolated test databases and distinct dev-server ports. Suggested worktree roots: Codex `~/.codex/worktrees/webpie-*`, Claude `~/.claude/worktrees/webpie-*`, Antigravity its own checkout.
- No agent may silently change API shapes used by another. Record proposed and accepted contract changes in `docs/contracts/` before depending on them.

## Integration — rotating, per slice

There is no standing integrator. Whichever lane a completed vertical slice belongs to, that agent reviews and integrates it into `master`, runs the integration checks, and updates only the board rows for that task. Cross-lane slices (e.g. REL-001) name one integrator in the task handoff before work starts. Board edits are serialized through handoffs: an agent updates a task row only when it is the one integrating that task; otherwise it proposes the status change in its handoff file.

## Completion

- READY -> IN_PROGRESS -> REVIEW -> DONE; BLOCKED requires a concrete blocker and next owner/action.
- DONE requires acceptance evidence and integration into the agreed baseline. A screenshot, passing helper test or API stub alone does not prove a workflow works.
- Run relevant unit, route/integration and browser checks for the task's behavior. Use synthetic fixtures; do not seed/reset a shared database.
- Preserve immutable exam/result history; scope every protected operation on the server; keep authoritative scoring independent of AI.
- Record task outcome, checks, API/schema changes and next action in a task-specific handoff file.
- Do not claim another agent received a message, completed a review or accepted ownership without evidence. File handoffs are read at the next session; they are not a live messaging connection.
