# Codex + Antigravity + Claude coordination

## Operating model

The repository is the shared source of truth. Three agents work in parallel lanes:

- **Codex** owns backend/data correctness: API routes, domain engines, `prisma/**`, backend tests.
- **Antigravity** owns the frontend and browser experience.
- **Claude** owns platform/infra (CI/CD, Docker, deploy, observability), AI/CV/Edge code (AI Gateway, OMR engine internals, sync, Academic Node), and cross-lane QA (E2E golden-workflow, OMR benchmark corpus, release gates).

The product owner handles scope decisions and pilot acceptance. No agent has a live channel to another; every message is a committed file. An agent joins by opening this repository and reading the handoffs.

Use `TASKS.md` as the integration board, `contracts/README.md` for contract changes and `handoffs/<TASK-ID>-<AGENT>.md` for asynchronous messages. Each agent writes its own handoff file.

## Integration — rotating, per slice

No standing integrator. The agent whose lane a finished slice belongs to reviews it, runs integration checks, merges/cherry-picks it into `master`, and updates that task's board rows. Cross-lane slices name their integrator in the task handoff before work begins. Only the integrating agent edits a given task's board row; everyone else proposes status changes in their handoff. Reconcile the board at the start and end of every active session.

## Claim and handoff protocol

1. Inspect current branches/diffs and board. Work on an unclaimed READY task with satisfied dependencies.
2. Write a claim in a task-specific handoff: timestamp/timezone, owner, task, base commit, branch/worktree, exact files, expected output, dependencies. Send it through the user if no shared checkout is available, and wait for ownership acknowledgement before overlapping edits.
3. The next agent to touch the board acknowledges the claim and updates it.
4. Before changing an API, document method/path, request, response, authorization, errors and lifecycle effects in `docs/contracts/`. The consuming agent acknowledges the version or works with fixtures explicitly labeled as mock.
5. Keep changes small enough to review as one behavior. Send a handoff when blocked, when a contract changes, and when the task is ready for review. At session end always record resumable status.
6. Reviewer checks acceptance and changed behavior; the integrating agent merges the reviewed work, runs integration checks and updates baseline. No automatic production deployment is implied.

Use branches `codex/<task>-<summary>`, `antigravity/<task>-<summary>`, `claude/<task>-<summary>` in separate worktrees outside OneDrive where practical. Never share one branch-switching working directory during concurrent work. Each agent uses a separate database and server port (suggested: Codex 3000, Antigravity 3100, Claude 3200).

## Handoff template

```text
Task / owner:
Timestamp + timezone:
Status: CLAIM | IN_PROGRESS | BLOCKED | REVIEW | DONE
Base commit / branch / worktree:
Files owned or changed:
What works now:
API/schema/contract changes:
Checks run and exact results:
Acceptance evidence / screenshots or fixtures:
Known gaps / blockers:
Next action and recipient:
Review acknowledgement / integrated commit:
```

## Boundaries that keep work parallel

| Surface | Initial editor | Other agents' contribution |
|---|---|---|
| `src/app/api/**`, `src/lib/auth.ts`, domain engines (`src/lib/academic/**`, `src/lib/intervention/**`) | Codex | UI needs, request examples, issue reports |
| `prisma/**`, backend fixtures/tests | Codex | Required fields and edge cases; AI/OMR/sync table requests via handoff |
| `src/app/page.tsx`, layout/CSS, `src/components/**`, UI feature folders | Antigravity | Stable API shapes and backend issue reports |
| `.github/**`, `Dockerfile`, `docker-compose.yml`, `.dockerignore`, deploy/observability config | Claude | Runtime/env requirements; secret handling review |
| `src/lib/ai/**`, `src/lib/omr/**` (engine internals), `src/lib/sync/**`, Academic Node runtime | Claude | Contract shapes for routes that call these; deterministic-scoring boundary review |
| `tests/e2e/**`, `tests/omr-corpus/**`, release-gate checklists | Claude | Scenario coverage requests; fixture needs |
| `tests/**` (unit/route harness, `tests/support/**`) | Codex | New E2E/corpus subtrees added by Claude under named paths |
| `src/lib/permissions.ts`, `package.json`, lockfile, root config | Named task editor; default Codex | Proposed patch/request; no concurrent direct edits |
| `docs/contracts/**` | Producer agent per contract | Acknowledgements/proposals in agent handoffs |
| `docs/handoffs/*-codex.md` / `*-antigravity.md` / `*-claude.md` | Named agent | Review in own response file |

Initial order: Codex hardens access boundaries (SEC-001) and publishes contract C01. Antigravity extracts and rewires the shell (UI-001 DONE, UI-002 waits on C01). Claude establishes CI, build/deploy coherence and the OMR benchmark harness in parallel — none of which block on C01. A security fix can temporarily expose an honest forbidden/empty UI; do not restore insecure endpoints to keep a demo working.

## Planning cadence

At the start/end of each active session, reconcile claims and blockers in handoffs. Integrate after each accepted vertical slice; review scope and measured progress weekly with the product owner. No scheduled automation or background communication service is configured by this plan.
