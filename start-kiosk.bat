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

REM Prefer the real msedge.exe at its standard install path over the
REM `msedge` App Execution Alias `where` would otherwise resolve to — that
REM alias is a thin stub, and has been unreliable at forwarding a full
REM --kiosk/--edge-kiosk-type/--user-data-dir combination through to the
REM real browser process on some Windows builds.
set "EDGE_EXE="
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "EDGE_EXE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not defined EDGE_EXE if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "EDGE_EXE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not defined EDGE_EXE (
  where msedge >nul 2>nul
  if not errorlevel 1 set "EDGE_EXE=msedge"
)

if not defined EDGE_EXE (
  echo Microsoft Edge wasn't found — opening in your default browser instead
  echo ^(no full-screen kiosk mode without Edge^).
  start "" http://localhost:3000
  goto :eof
)

REM If Edge is already running, --kiosk gets silently ignored and just
REM opens a normal window in that existing session — so close any open
REM Edge windows first to force a genuine fullscreen kiosk launch. This
REM closes anything else you had open in Edge; that's expected on a
REM dedicated kiosk device, less so if you sometimes browse normally on
REM this machine. Edge's background/renderer processes can take a moment
REM to fully release their lock on the profile, so wait a couple of
REM seconds after killing before launching the new instance.
taskkill /IM msedge.exe /F >nul 2>nul
timeout /t 2 /nobreak >nul

start "" "%EDGE_EXE%" --kiosk http://localhost:3000 --edge-kiosk-type=fullscreen --no-first-run --user-data-dir="%LOCALAPPDATA%\FamilyChoresKiosk"
