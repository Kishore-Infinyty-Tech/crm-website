@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Infinyty CRM launcher
cd /d "%~dp0"
set "ROOT=%~dp0"

echo.
echo  ==========================================
echo    Infinyty CRM  -  starting up
echo  ==========================================
echo.

rem ---------- 1. Python 3.10 or newer ----------
set "PY="
py -3 -c "import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)" >nul 2>&1
if not errorlevel 1 set "PY=py -3"
if not defined PY (
  python -c "import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)" >nul 2>&1
  if not errorlevel 1 set "PY=python"
)
if not defined PY goto :install_python

rem ---------- 2. Node.js 20 or newer ----------
set "NODE_OK="
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)" >nul 2>&1
if not errorlevel 1 set "NODE_OK=1"
if not defined NODE_OK goto :install_node

rem ---------- 3. Backend: virtual environment + packages ----------
cd /d "%ROOT%backend"
if exist ".venv\Scripts\python.exe" (
  ".venv\Scripts\python.exe" -c "import sys" >nul 2>&1
  if errorlevel 1 rmdir /s /q ".venv"
)
if not exist ".venv\Scripts\python.exe" (
  echo [1/4] Creating the Python environment...
  %PY% -m venv .venv
  if errorlevel 1 goto :fail
)
echo [1/4] Installing backend packages...
".venv\Scripts\python.exe" -m pip install --disable-pip-version-check -q -r requirements.txt
if errorlevel 1 goto :fail

rem ---------- 4. Database settings ----------
if not exist ".env" (
  echo.
  echo  No database settings found. Paste the Neon connection string
  echo  ^(it starts with postgresql://^) and press Enter.
  set "DBURL="
  set /p "DBURL=DATABASE_URL: "
  if not defined DBURL goto :fail
  > ".env" echo DATABASE_URL=!DBURL!
  >> ".env" echo DEBUG=1
  >> ".env" echo APP_URL=http://localhost:3000
  echo  Saved to backend\.env
)

rem ---------- 5. Frontend packages ----------
cd /d "%ROOT%frontend"
echo [2/4] Installing website packages. The first run can take a few minutes...
call npm install --no-audit --no-fund --loglevel=error
if errorlevel 1 goto :fail

rem ---------- 6. Start both servers ----------
echo [3/4] Starting the servers...
netstat -ano | findstr /R /C:":8001 .*LISTENING" >nul
if errorlevel 1 (
  start "Infinyty CRM - API" /D "%ROOT%backend" /min cmd /k ".venv\Scripts\python.exe manage.py runserver 127.0.0.1:8001 --noreload"
) else (
  echo      API is already running.
)
netstat -ano | findstr /R /C:":3000 .*LISTENING" >nul
if errorlevel 1 (
  start "Infinyty CRM - Website" /D "%ROOT%frontend" /min cmd /k "npm run dev"
) else (
  echo      Website is already running.
)

rem ---------- 7. Wait until the website answers, then open it ----------
echo [4/4] Waiting for the website to be ready. The first page can take a minute...
powershell -NoProfile -Command "$u='http://127.0.0.1:3000/login'; for($i=0;$i -lt 90;$i++){ try{ Invoke-WebRequest $u -UseBasicParsing -TimeoutSec 5 | Out-Null; exit 0 } catch { Start-Sleep -Seconds 2 } }; exit 1"
if errorlevel 1 goto :slow

start "" http://localhost:3000
echo.
echo  Infinyty CRM is open in your browser:  http://localhost:3000
echo.
echo  Keep the two minimized windows open while you use it.
echo  To stop everything, double-click stop.bat.
echo.
timeout /t 8 >nul
exit /b 0

:install_python
echo  Python 3.10 or newer was not found.
where winget >nul 2>&1
if errorlevel 1 (
  echo  Please install Python from https://www.python.org/downloads/
  echo  Tick "Add python.exe to PATH" during setup, then run start.bat again.
  start "" https://www.python.org/downloads/
  pause
  exit /b 1
)
echo  Installing Python with winget. Accept any prompt that appears...
winget install -e --id Python.Python.3.12 --accept-package-agreements --accept-source-agreements
echo.
echo  Python is installed. Close this window and double-click start.bat again.
pause
exit /b 0

:install_node
echo  Node.js 20 or newer was not found.
where winget >nul 2>&1
if errorlevel 1 (
  echo  Please install the LTS version from https://nodejs.org/
  echo  then run start.bat again.
  start "" https://nodejs.org/
  pause
  exit /b 1
)
echo  Installing Node.js with winget. Accept any prompt that appears...
winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
echo.
echo  Node.js is installed. Close this window and double-click start.bat again.
pause
exit /b 0

:slow
echo.
echo  The website is taking longer than expected. Look at the minimized
echo  "Infinyty CRM - Website" window for errors, then try http://localhost:3000
pause
exit /b 1

:fail
echo.
echo  Something went wrong while setting up. Read the message above,
echo  fix it, and run start.bat again.
pause
exit /b 1
