# PostgreSQL backup and restore drill

The production database is backed up with `scripts/backup-postgres.ps1` to a timestamped custom-format dump. The script refuses to run without `POSTGRES_PASSWORD`, writes outside the repository when `BACKUP_DIR` is supplied, and emits a SHA-256 checksum.

To restore, provision an isolated PostgreSQL database and run `scripts/restore-postgres.ps1 -DumpPath <dump> -Database <database>`. The restore script uses `pg_restore --clean --if-exists`, then verifies connectivity and reports table counts. Never restore over production during a drill.

Quarterly drill evidence must record the dump timestamp, checksum, restore target, migration version, row-count spot checks, and operator. A release cannot mark the Data gate `MET` until a drill has completed successfully against a disposable database.
