@echo off
setlocal
cd /d "%~dp0"

where pnpm >nul 2>nul
if errorlevel 1 (
  echo [start-all] pnpm not found in PATH. Install it first: npm install -g pnpm
  pause
  exit /b 1
)

if not exist node_modules (
  echo [start-all] Installing dependencies...
  call pnpm install
  if errorlevel 1 (
    echo [start-all] pnpm install failed.
    pause
    exit /b 1
  )
)

echo [start-all] Starting API server (port 3001)...
start "API :3001" cmd /k "pnpm --filter @workspace/api-server run dev"

echo [start-all] Starting Admin (port 5174)...
start "Admin :5174" cmd /k "pnpm --filter @workspace/admin run dev"

echo [start-all] Starting Portfolio (port 5173)...
start "Portfolio :5173" cmd /k "pnpm --filter @workspace/portfolio run dev"

echo.
echo [start-all] All services started in separate windows:
echo   Portfolio : http://localhost:5173
echo   Admin     : http://localhost:5174
echo   API       : http://localhost:3001
echo.
echo Close each window, or run stop-all.bat to kill all services.
endlocal
