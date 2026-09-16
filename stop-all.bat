@echo off
setlocal
echo [stop-all] Stopping services listening on ports 5173, 5174, 3001...

powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 5173,5174,3001 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { $p = Get-Process -Id $_ -ErrorAction SilentlyContinue; Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue; if ($p) { Write-Host ('  Stopped ' + $p.ProcessName + ' (PID ' + $_ + ')') } }"

echo [stop-all] Done.
pause
endlocal
