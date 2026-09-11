# Tarikeler Dev Server Watchdog
# Restarts the TarikelerDevServer task if nothing is listening on port 3000.
# Task Scheduler trigger: every minute (TarikelerDevWatchdog).
# Log: site\dev-watchdog.log
$ErrorActionPreference = "SilentlyContinue"
$log = "C:\Users\TARIKELER\Documents\Projelerim\Tarnak\site\dev-watchdog.log"
$port = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($port) {
    # Port open — dev server is running
    if (Test-Path $log) {
        $last = Get-Content $log -Tail 1
        if ($last -notmatch "OK") { "OK - dev server up ($(Get-Date -Format 'HH:mm:ss'))" | Add-Content $log }
    }
    exit 0
}
# Port closed — dev server died. Restart the task (stop first, then run).
"DOWN - dev server not found ($(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')) - restarting" | Add-Content $log
schtasks /End /TN TarikelerDevServer 2>$null
Start-Sleep -Seconds 2
schtasks /Run /TN TarikelerDevServer 2>$null | Out-Null
"RESTART triggered" | Add-Content $log
exit 0