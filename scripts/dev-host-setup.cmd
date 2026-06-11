@echo off
REM -------------------------------------------------------------------------
REM arsvine-realm local dev launcher — double-click friendly entry point.
REM
REM Windows doesn't execute .ps1 files on double-click (defaults to Notepad).
REM This .cmd wrapper launches the real script via PowerShell 7 or 5.1.
REM
REM Usage:
REM   double-click this file                   -> hosts + dev server
REM   or run from cmd/powershell:
REM     .\scripts\dev-host-setup.cmd              (same as above)
REM     .\scripts\dev-host-setup.cmd -HostsOnly  (hosts only, no server)
REM     .\scripts\dev-host-setup.cmd -Remove     (clean up hosts entry)
REM -------------------------------------------------------------------------

setlocal
cd /d "%~dp0.."

REM Prefer pwsh.exe (PowerShell 7). Fall back to powershell.exe (5.1).
where pwsh.exe >nul 2>&1
if %ERRORLEVEL% equ 0 (
    pwsh.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\dev-host-setup.ps1" %*
) else (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\dev-host-setup.ps1" %*
)

exit /b %ERRORLEVEL%