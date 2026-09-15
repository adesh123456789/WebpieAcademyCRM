param([string]$BackupDir = "./backups")
$ErrorActionPreference = "Stop"
if (-not $env:POSTGRES_PASSWORD) { throw "POSTGRES_PASSWORD is required" }
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$dump = Join-Path $BackupDir "webpie-$stamp.dump"
$container = if ($env:POSTGRES_CONTAINER) { $env:POSTGRES_CONTAINER } else { "webpie-postgres" }
$user = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "webpie_admin" }
$db = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "webpie_academic_os" }
# Dump inside the container to a file, then `docker cp` it out - piping pg_dump's
# binary stdout through PowerShell's pipeline risks corruption (and
# `Set-Content -Encoding Byte`, needed to capture it as bytes at all, doesn't
# exist in PowerShell Core / pwsh, only Windows PowerShell 5.1 - this script
# needs to run on both). `-e PGPASSWORD=` passed straight to `docker exec`
# (not through an intermediate `sh -c "..."` string) avoids a second layer of
# shell-quoting entirely - see restore-postgres.ps1's history for why that
# nesting is a real trap once any argument needs an embedded quote.
docker exec -e "PGPASSWORD=$($env:POSTGRES_PASSWORD)" $container pg_dump -Fc -U $user -d $db -f /tmp/webpie-backup.dump
docker cp "${container}:/tmp/webpie-backup.dump" $dump
docker exec $container rm -f /tmp/webpie-backup.dump
$hash = (Get-FileHash -Algorithm SHA256 $dump).Hash
"$hash  $dump" | Set-Content -Path "$dump.sha256"
Write-Output "Created $dump (SHA256 $hash)"
