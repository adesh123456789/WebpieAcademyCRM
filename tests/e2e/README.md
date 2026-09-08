# End-to-end harness (CLD-004)

Walks the PRD golden loop through the **real Next route handlers**, in order,
against one synthetic tenant from `createTestWorld()`. Complements
`tests/routes-foundation.test.ts` (single-handler smoke) - these suites thread a
session token and IDs across many handlers like a browser would.

Owned by the Claude lane (cross-lane QA). Runs under `npm test` and CI
(`*.e2e.test.ts` matches the `tests/**/*.test.ts` glob). Reads `tests/support/**`
but never edits it.

## Files

| File | Covers |
|---|---|
| `support/harness.ts` | `call(handler, path, opts)`, `loginAs(email, tenantCode)`, re-exports `createTestWorld` |
| `golden-workflow.e2e.test.ts` | auth -> students -> exam -> artifacts -> OMR -> evaluation -> results -> mastery -> intervention -> retest -> parent report |
| `cbt-ownership.e2e.test.ts` | AC-011 - CBT attempt ownership, idempotent submit, (todo) server clock |

## Reading the results

- **`it`** - behaviour verifiable against today's routes (auth, tenant/parent
  scope, permission gates, "endpoint is wired and doesn't 500").
- **`it.todo`** - a golden-loop step whose backend is not built yet. The label
  names the blocking task (`EXM-001`, `OMR-001`, `OMR-002`, `EVAL-001`,
  `INT-001`, `REP-001`, `CBT-001`, `STU-001`).

The count of `todo` vs `passing` is the **REL-001 launch-gate progress meter**:
every `todo` that turns into a passing `it` is one step of the real teacher
workflow proven end to end. When all `todo`s are live, REL-001's "golden workflow
completes without P0/P1" gate is met at the API layer (browser E2E is separate).

## Extending

When a blocking task lands, convert its `it.todo(...)` line(s) into real `it(...)`
assertions in the same PR - do not add a parallel test file. Keep step order and
the `Sn` numbering stable so the diff shows exactly which gate moved.
