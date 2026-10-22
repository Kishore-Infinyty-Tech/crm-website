@echo off
setlocal EnableExtensions
title Stop Infinyty CRM
echo Stopping Infinyty CRM...
powershell -NoProfile -Command "foreach($port in 3000,8001){ Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | ForEach-Object { taskkill /PID $_.OwningProcess /T /F | Out-Null } }"
echo Done. The website and API are stopped.
timeout /t 3 >nul
