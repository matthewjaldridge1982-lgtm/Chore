@echo off
REM Double-click this file to start Family Chores.
REM Requires Node.js — see README.md "Running on a local Windows device".

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
echo (Keep this window open. Closing it stops the server.)
echo.
node server.js

echo.
echo The server has stopped.
pause
