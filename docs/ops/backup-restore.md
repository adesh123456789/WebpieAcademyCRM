# PostgreSQL backup and restore drill

The production database is backed up with `scripts/backup-postgres.ps1` to a timestamped custom-format dump. The script refuses to run without `POSTGRES_PASSWORD`, writes outside the repository when `BACKUP_DIR` is supplied, and emits a SHA-256 checksum.

To restore, provision an isolated PostgreSQL database and run `scripts/restore-postgres.ps1 -DumpPath <dump> -Database <database>`. The restore script uses `pg_restore --clean --if-exists`, then verifies connectivity and reports table counts. Never restore over production during a drill.

Quarterly drill evidence must record the dump timestamp, checksum, restore target, migration version, row-count spot checks, and operator. A release cannot mark the Data gate `MET` until a drill has completed successfully against a disposable database.

## Automated drill (`.github/workflows/restore-drill.yml`)

The drill runs for real in CI, not just as a manual runbook: a disposable `postgres:16-alpine` container is started, the postgresql schema mirror is pushed and seeded with realistic demo data (`npm run prisma:seed`), row counts are recorded for `Tenant`/`Branch`/`Student`/`Exam`/`ExamResult`, `scripts/backup-postgres.ps1` runs a real dump, the database is dropped and recreated empty (simulating loss), `scripts/restore-postgres.ps1` restores it, and the row counts are re-checked and must match exactly. The container is removed either way. Runs on every push to `master`, on `workflow_dispatch`, and quarterly on a schedule (`0 3 1 */3 *`).

Evidence (the dump, its checksum, and both row-count files) is uploaded as a 90-day workflow artifact, and a summary table (timestamp, schema version/commit, dump, checksum, restore target, operator) is written to the run's job summary. Find it under the `restore-drill` workflow's runs in the Actions tab; the artifact name is `restore-drill-evidence-<run id>`.
