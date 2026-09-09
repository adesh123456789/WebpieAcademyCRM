param([Parameter(Mandatory=$true)][string]$DumpPath, [Parameter(Mandatory=$true)][string]$Database, [string]$Container = "webpie-postgres")
$ErrorActionPreference = "Stop"
if (-not (Test-Path -LiteralPath $DumpPath)) { throw "Dump not found: $DumpPath" }
if (-not $env:POSTGRES_PASSWORD) { throw "POSTGRES_PASSWORD is required" }
$user = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "webpie_admin" }
Get-Content -Raw -Path "$DumpPath.sha256" -ErrorAction SilentlyContinue | Out-Null
docker cp $DumpPath "${Container}:/tmp/restore.dump"
docker exec $Container sh -c "PGPASSWORD='$($env:POSTGRES_PASSWORD)' pg_restore --clean --if-exists --no-owner -U '$user' -d '$Database' /tmp/restore.dump"
docker exec $Container sh -c "PGPASSWORD='$($env:POSTGRES_PASSWORD)' psql -At -U '$user' -d '$Database' -c 'select count(*) from \"Tenant\"'"
Write-Output "Restore completed and Tenant row-count query succeeded for $Database"
