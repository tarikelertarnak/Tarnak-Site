$ErrorActionPreference = 'Continue'
# Kendi konumundan turetilir — klasor yeniden adlandirilsa bile calisir.
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$site = Join-Path $root 'site'
$log = Join-Path $root 'dev-run.log'
Push-Location $site
& (Join-Path $site 'node_modules\.bin\next.cmd') dev --turbopack *> $log
Pop-Location