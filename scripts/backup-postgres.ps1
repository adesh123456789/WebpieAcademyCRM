param([string]$BackupDir = "./backups")
$ErrorActionPreference = "Stop"
if (-not $env:POSTGRES_PASSWORD) { throw "POSTGRES_PASSWORD is required" }
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$dump = Join-Path $BackupDir "webpie-$stamp.dump"
$container = if ($env:POSTGRES_CONTAINER) { $env:POSTGRES_CONTAINER } else { "webpie-postgres" }
$user = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "webpie_admin" }
$db = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "webpie_academic_os" }
docker exec $container sh -c "PGPASSWORD='$($env:POSTGRES_PASSWORD)' pg_dump -Fc -U '$user' -d '$db'" | Set-Content -Encoding Byte -Path $dump
$hash = (Get-FileHash -Algorithm SHA256 $dump).Hash
"$hash  $dump" | Set-Content -Path "$dump.sha256"
Write-Output "Created $dump (SHA256 $hash)"
