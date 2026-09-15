# REL-001 - automated restore drill (Claude, 2026-09-15)

Codex's REL-001 handoff asked for the disposable-database restore drill to
run "on a CI/staging host with an isolated target and record checksum,
migration version and row counts" - docker/psql aren't available in this
local checkout, but real CI now exists and has docker, so this runs there.

## Landed

- `.github/workflows/restore-drill.yml` [NEW] - a full, real drill, not a
  simulation:
  1. Starts a disposable `postgres:16-alpine` container (`webpie-postgres`,
     this job's own, never production).
  2. `prisma generate` + `db push` the `schema.postgresql.prisma` mirror onto
     it, then `npm run prisma:seed` (the existing 706-line demo seed script -
     real Tenant/Branch/Student/Exam/ExamResult rows, not synthetic-for-this).
  3. Records pre-drill row counts for `Tenant`/`Branch`/`Student`/`Exam`/`ExamResult`.
  4. Runs the real `scripts/backup-postgres.ps1` (via `pwsh`, preinstalled on
     GitHub-hosted runners - the script is unmodified).
  5. **Drops and recreates the database empty** - actually simulates loss,
     not a restore-over-existing-data no-op.
  6. Runs the real `scripts/restore-postgres.ps1`, unmodified.
  7. Re-counts the same 5 tables; fails the job if anything doesn't match
     the pre-drill counts exactly.
  8. Uploads the dump + checksum + both count files as a 90-day artifact,
     and writes a timestamp/checksum/schema-version/operator table to the
     job summary.
  9. Removes the container either way (`if: always()`).
- `docs/ops/backup-restore.md` - documents the automated drill and where to
  find its evidence.

## Design notes

- **"Migration version" evidence is the git commit SHA**, not a Prisma
  migration name - this repo's postgres mirror is synced with `prisma db
  push` (matching the pattern the `verify` job and the Dockerfile already
  use for the sqlite side), not `prisma migrate deploy`, so there's no
  `_prisma_migrations` ledger to read. The commit SHA is what
  `check-schema-parity.mjs` already ties schema state to, so it's the real
  versioning mechanism this repo has.
- Runs on every push to `master` (this repo is public, so Actions minutes
  are free) in addition to the quarterly schedule the docs specify - keeps
  the drill from going stale between quarters while things are still moving
  fast. Easy to drop the `push` trigger later if it gets noisy.
- Independent job, no `needs:` on `verify`/`container-smoke` - backup/restore
  is an orthogonal concern, not gated on app-correctness checks.
- Row-count comparison is a deliberately strict pass/fail (`diff -u`, non-zero
  exit on mismatch) - a drill that "completes" without checking data actually
  came back isn't evidence of anything.

## Status

Pushed; watching the resulting run next. Once green, `docs/LAUNCH_GATE.md`'s
Data gate note gets updated with the run link as the executed-and-evidenced
proof. Not yet `MET` - a single CI drill is real evidence but the gate's
"quarterly drill" and "disposable database" language still implies an
ongoing operational practice a named owner keeps executing, not something
one drill closes permanently.
