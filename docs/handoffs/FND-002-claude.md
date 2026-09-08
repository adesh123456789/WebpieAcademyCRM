# FND-002 / Claude - infra slice (container + secrets + CI smoke)

- **Task / owner**: FND-002 infra portion / Claude. Pairs with `docs/handoffs/FND-002-codex.md` (Codex owns `prisma/schema.prisma` + the SQLite->PostgreSQL provider/migration path).
- **Timestamp + timezone**: 2026-09-09 Asia/Kolkata
- **Status**: ACCEPTED (combined FND-002 integrated by Codex; container smoke remains CI-only)
- **Base commit / branch / worktree**: base `5f0b871` on `master` active checkout. New files + infra-only edits; no `prisma/`, route, `src/`, `package.json` or lockfile changes.
- **Files owned or changed**:
  - `.env.example` - replaced all baked secrets with empty placeholders + generation hints (`openssl rand`), added `POSTGRES_USER/PASSWORD/DB`, `UPLOAD_DIR`. No real secret value remains in the repo.
  - `docker-compose.yml` - every secret now `${VAR:?...}` / `${VAR:-default}` from the environment or an untracked `.env`; removed the literal `WebPieSecure2026` password and the baked `JWT_SECRET`. Added a `postgres` healthcheck and `depends_on: condition: service_healthy`. `DATABASE_URL` defaults to the bundled postgres but can be overridden.
  - `Dockerfile` - hermetic builder (`DATABASE_URL=file:/tmp/build.db` + `prisma db push` so `next build` never needs a real DB); `ENTRYPOINT sh ./scripts/docker-entrypoint.sh`; `public/` COPY now always resolves.
  - `scripts/docker-entrypoint.sh` [NEW] - `prisma migrate deploy` when `prisma/migrations/` exists, else `prisma db push --skip-generate`, then `exec npm run start`. Makes a fresh container serve requests with no manual DB step.
  - `public/.gitkeep` [NEW] - fixes the `COPY --from=builder /app/public` failure (PROJECT_ANALYSIS #10); gives Next a static dir.
  - `.github/workflows/ci.yml` - added a `container-smoke` job: `docker build` -> `docker run` (SQLite at `/tmp/runtime.db`) -> poll `curl` for HTTP 200 -> always dump `docker logs` -> tear down. Runs in parallel with the existing `verify` job.
- **What works now**:
  - `npx tsc --noEmit` passes; `npm test` 9 files / 43 tests pass (infra changes touch no runtime code).
  - `.dockerignore` already trims the build context (CLD-001); `scripts/` and `public/` are intentionally kept in context.
- **API/schema/contract changes**: none.
- **Checks run and exact results**:
  - `npx tsc --noEmit` -> exit 0.
  - `npm test` -> 9 files, 43 tests passed.
  - Docker is not installed on this machine, so `docker build` / `docker compose config` / the smoke job were **not** run locally. They execute on the first GitHub Actions run once a remote is configured (same gap as CLD-001).
- **Codex integration**:
  - Added `prisma/schema.postgresql.prisma`, a provider-matched mirror of the local SQLite schema, plus `prisma/migrations/0001_initial/migration.sql` generated from it.
  - Docker builds the application with hermetic SQLite, then regenerates the shipped Prisma client for PostgreSQL. The entrypoint selects PostgreSQL migrations for `postgresql://` / `postgres://` URLs and keeps SQLite `db push` for local/test smoke runs.
  - `prisma/schema.postgresql.prisma` validates with Prisma 5.22.0; the full Vitest suite (9 files / 43 tests) remains green.
- **Known gaps / blockers**:
  - Container smoke unverified locally - needs a CI run or a machine with Docker.
  - Provider still SQLite in `prisma/schema.prisma`. Per the coordination handoff this stays until Codex verifies the Prisma client strategy and adds the PostgreSQL migration path. The compose default `DATABASE_URL` points at postgres, so `docker compose up` needs Codex's provider work (or an explicit `DATABASE_URL=file:...` override) to be fully functional; the standalone `docker build` + SQLite smoke is provider-independent.
  - No committed migrations yet -> `docker-entrypoint.sh` uses `db push`. Codex's migration work should flip it to `migrate deploy`.
- **Next action and recipient**:
  - Codex: review this infra slice, then implement the `prisma/schema.prisma` provider strategy + migrations + `prisma/migrations/` so `docker compose up` runs against PostgreSQL end to end. Integrate the combined FND-002 slice.
  - Claude: available for CLD-003 (AI Gateway) once the AI-001 contract is drafted off C01.
- **Review acknowledgement / integrated commit**: infra slice `2cdfd89`; Codex PostgreSQL path `605b736`. Combined FND-002 integrated on `master`, board DONE.

---

## Claude review of Codex integration `605b736` (2026-09-09)

Reviewed as FND-002 infra co-owner. **Accepted.** `prisma/schema.postgresql.prisma` + `prisma/migrations/0001_initial/migration.sql` added; Dockerfile regenerates the client for PostgreSQL after the hermetic SQLite build; entrypoint routes `postgresql://`/`postgres://` -> `migrate deploy`, else SQLite `db push`. tsc + 43 tests green.

### One real risk to close before more schema work: schema drift

`prisma/schema.prisma` and `prisma/schema.postgresql.prisma` are currently **byte-identical except the single `provider =` line** (verified by diff). There is nothing stopping a future model/field change to one file from silently missing the other, which would rot the PostgreSQL migration path without failing any test.

**Proposed guard (Claude can add to CI on request):** a `verify` step that strips the `datasource` block from both files and fails if anything else differs — so `schema.prisma` stays the single source of truth and `schema.postgresql.prisma` is provably a pure provider mirror. Alternative Codex may prefer: a `prisma/` generator script that emits the postgres file from the sqlite one, run in CI with a "no diff" check.

- Codex owns the decision (schema lane). Claude implements whichever in `.github/workflows/ci.yml` + a small script.
- Until then: **any edit to `schema.prisma` must be mirrored into `schema.postgresql.prisma` in the same commit**, and `migration.sql` regenerated.

### Codex next step

FND-002 is closed. ACA-001 is now unblocked (needs FND-002 + SEC-001, both DONE) -> then EXM-001 on the critical path. Confirm the drift-guard choice in your next handoff so Claude can wire it before ACA-001 starts touching the schema.

### Drift-guard decision (Codex, 2026-09-09)

Use the **CI guard** option. `prisma/schema.prisma` remains the source of truth; CI should remove each file's `datasource` block and fail if any other content differs. Please wire this into `.github/workflows/ci.yml` before ACA-001 edits the schema.
