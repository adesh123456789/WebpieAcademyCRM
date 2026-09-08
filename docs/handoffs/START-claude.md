# Claude starting handoff

Prepared by Claude on 2026-09-09, Asia/Kolkata. Baseline `4d1f224`.

The user asked all three agents — Codex, Antigravity and Claude — to build WebPie cooperatively and fast, cutting tasks into parallel lanes with file-based communication. This handoff is a file for Codex and Antigravity to read; it is not evidence of a live connection or an accepted lane.

## Lane proposal (needs your acknowledgement)

Claude takes a third lane so Codex stays on the backend critical path and Antigravity stays on UI:

- **Claude owns**: platform/infra (`.github/**`, `Dockerfile`, `docker-compose.yml`, `.dockerignore`, CI, deploy, observability config); AI/CV/Edge code (`src/lib/ai/**`, `src/lib/omr/**` engine internals, `src/lib/sync/**`, Academic Node runtime); cross-lane QA (`tests/e2e/**`, `tests/omr-corpus/**`, release-gate checklists).
- **Unchanged**: Codex owns `src/app/api/**`, domain engines, `prisma/**`, `src/lib/auth.ts`, the `tests/` unit/route harness and `tests/support/**`. Antigravity owns `src/app/**` + `src/components/**` UI.
- **Shared, one editor per task**: `prisma/schema.prisma` (Codex only — Claude requests AI/OMR/sync tables via handoff), `src/lib/permissions.ts`, `package.json`/lock, root config, `docs/contracts/**`.
- **Integration is rotating per slice** (see updated `COORDINATION.md`): the lane that owns a finished slice reviews and merges it and updates only that task's board rows.

`AGENTS.md`, `docs/COORDINATION.md` and `docs/TASKS.md` are updated to reflect this. Board owner reassignments (FND-002, OMR-001, SYN-001, EDGE-001, AI-001, REL-001) and new CLD-* rows are marked proposed until you acknowledge in your next handoff.

## What Claude is starting now (no dependency on C01 or schema)

- **CLD-001**: CI workflow + `.dockerignore`. New files only — `.github/workflows/ci.yml` runs `npm ci`, `prisma generate`, `prisma db push`, `tsc --noEmit`, `npm test`, `npm run build` on every PR/push. No edits to `package.json`, `prisma/schema.prisma` or any route. Claim in `docs/handoffs/CLD-001-claude.md`.
- **CLD-002**: OMR benchmark corpus harness under a new `tests/omr-corpus/**` subtree — labeled-fixture format + accuracy/review-rate/false-confidence runner. Test-only. Needs Codex to acknowledge the `tests/` path carve-out (Claude will not touch `tests/support/**` or existing suites).

## What Claude will NOT touch

Prisma schema, API route handlers, `src/lib/auth.ts`, `src/lib/permissions.ts`, `src/app/**`, `src/components/**`, `package.json`/lockfile, `scripts/seed.js`, the shared dev database, and existing test suites. Any need there goes through a handoff request to the owning lane.

## Known gaps Claude's lane targets (from PROJECT_ANALYSIS.md)

#6 OMR is simulated (density arrays, not pixels) — CLD-002 then OMR-001. #7 sync is a prototype (no durable outbox/inbox/cursors, no local runtime) — SYN-001/EDGE-001. #8 AI fallback fabricates wrong questions, no output-schema validation — CLD-003. #10 SQLite/Postgres deploy mismatch, no `.dockerignore`/migrations/CI, secrets in Compose — CLD-001 then FND-002.

## Next action and recipient

Codex and Antigravity: acknowledge or amend the Claude lane in your next handoff. Codex: confirm the `tests/omr-corpus/**` path carve-out for CLD-002, and whether SEC-001 will add any `src/lib/ai/**` change (affects CLD-003 timing). Claude proceeds with CLD-001 (new files only, zero shared-file risk) regardless.
