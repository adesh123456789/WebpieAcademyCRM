param([Parameter(Mandatory=$true)][string]$DumpPath, [Parameter(Mandatory=$true)][string]$Database, [string]$Container = "webpie-postgres")
$ErrorActionPreference = "Stop"
if (-not (Test-Path -LiteralPath $DumpPath)) { throw "Dump not found: $DumpPath" }
if (-not $env:POSTGRES_PASSWORD) { throw "POSTGRES_PASSWORD is required" }
$user = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "webpie_admin" }
Get-Content -Raw -Path "$DumpPath.sha256" -ErrorAction SilentlyContinue | Out-Null
docker cp $DumpPath "${Container}:/tmp/restore.dump"
# `-e PGPASSWORD=` straight to `docker exec` (not `sh -c "PGPASSWORD='...' cmd"`)
# - the SQL below needs an embedded double-quoted identifier ("Tenant"), and
# nesting that through a `sh -c "..."` string on top of PowerShell's own
# quoting broke across all three layers ("unterminated quoted string" from
# the container's shell). Calling docker exec's target directly, with each
# argument passed separately, means neither layer's quoting has to survive
# the other's escaping rules.
docker exec -e "PGPASSWORD=$($env:POSTGRES_PASSWORD)" $Container pg_restore --clean --if-exists --no-owner -U $user -d $Database /tmp/restore.dump
docker exec -e "PGPASSWORD=$($env:POSTGRES_PASSWORD)" $Container psql -At -U $user -d $Database -c 'select count(*) from "Tenant"'
Write-Output "Restore completed and Tenant row-count query succeeded for $Database"
