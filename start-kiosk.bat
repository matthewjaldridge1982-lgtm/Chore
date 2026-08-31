@echo off
REM Double-click this for everyday family use: starts the server in the
REM background, then opens Microsoft Edge full-screen with no address bar,
REM tabs, or menu — so the Surface Go becomes a dedicated chore board that
REM anyone can walk up and tap.
REM
REM For troubleshooting (to see server logs, or if Edge/kiosk isn't
REM available) use start.bat instead — it opens a normal browser tab.
REM
REM To get out of kiosk mode: Alt+F4 closes the Edge window. The server
REM keeps running in its own minimized window; close that separately (or
REM just leave it running) when you're done.

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found on this computer.
  echo.
  echo Install it first, then run this again:
  echo   - Download from https://nodejs.org ^(choose the LTS version^), or
  echo   - In PowerShell, run: winget install OpenJS.NodeJS.LTS
  echo.
  pause
  exit /b 1
)

echo Starting Family Chores...
start "Family Chores Server" /min cmd /k node server.js

REM Give the server a moment to come up before pointing a browser at it.
timeout /t 2 /nobreak >nul

where msedge >nul 2>nul
if errorlevel 1 (
  echo Microsoft Edge wasn't found — opening in your default browser instead
  echo ^(no full-screen kiosk mode without Edge^).
  start "" http://localhost:3000
) else (
  start "" msedge --kiosk http://localhost:3000 --edge-kiosk-type=fullscreen --no-first-run
)
