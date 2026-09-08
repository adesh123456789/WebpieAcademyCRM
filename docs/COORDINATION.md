# Codex + Antigravity coordination

## Operating model

The repository is the shared source of truth. Codex owns backend/data correctness and integration; Antigravity owns the frontend and browser experience. The product owner handles scope decisions and pilot acceptance. Neither agent has been contacted externally in this task. Antigravity must open this repository and read the handoff to participate.

Use `TASKS.md` as the integration board, `contracts/README.md` for contract changes and `handoffs/<TASK-ID>-<AGENT>.md` for asynchronous messages. Each agent writes its own handoff file; the integrator updates the central board from those files to avoid simultaneous board edits.

## Claim and handoff protocol

1. Inspect current branches/diffs and board. Work on an unclaimed READY task with satisfied dependencies.
2. Write a claim in a task-specific handoff: timestamp/timezone, owner, task, base commit, branch/worktree, exact files, expected output, dependencies. In separate worktrees make the claim visible in the agreed shared coordination checkout before starting. If that channel is unavailable, send the handoff through the user and wait for ownership acknowledgement before overlapping edits.
3. The integrator acknowledges the claim and updates the board. Existing exclusive lane ownership permits work in non-overlapping files; shared files require explicit editor agreement.
4. Before changing an API, document method/path, request, response, authorization, errors and lifecycle effects. The consuming agent acknowledges the version or works with fixtures explicitly labeled as mock.
5. Keep changes small enough to review as one behavior. Send a handoff when blocked, when a contract changes, and when the task is ready for review. At session end always record resumable status.
6. Reviewer checks acceptance and changed behavior; integrator merges/cherry-picks the reviewed work, runs integration checks and updates baseline. No automatic production deployment is implied.

Use branches `codex/<task>-<summary>` and `antigravity/<task>-<summary>` in separate worktrees outside OneDrive where practical. Never share one branch-switching working directory during concurrent work. Do not create these until implementation begins and the active checkout situation is known. Each agent uses a separate database and server port.

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

| Surface | Initial editor | Other agent's contribution |
|---|---|---|
| `src/app/api/**`, `src/lib/**` except shared permission presentation | Codex | UI needs and request examples |
| `prisma/**`, backend fixtures/tests | Codex | Required fields and edge cases |
| `src/app/page.tsx`, layout/CSS, future `src/components/**`, UI feature folders | Antigravity | Stable API shapes and backend issue reports |
| `src/lib/permissions.ts`, package/lock/config files | Named task editor; initially Codex | Proposed patch/request; no concurrent direct edits |
| `docs/contracts/**`, central task board | Codex integrator | Acknowledgements/proposals in agent handoffs |
| `docs/handoffs/*-codex.md` / `*-antigravity.md` | Named agent | Review in own response file |

Initial order: Codex establishes isolated fixtures and fixes access boundaries while Antigravity extracts the existing shell with behavior preserved. Then both integrate the student/exam contract slice, followed by OMR and reports. A security fix can temporarily expose an honest forbidden/empty UI; do not restore insecure endpoints to keep a demo working.

## Planning cadence

At the start/end of each active session, reconcile claims and blockers. Integrate after each accepted vertical slice; review scope and measured progress weekly with the product owner. No scheduled automation or background communication service is configured by this plan.
