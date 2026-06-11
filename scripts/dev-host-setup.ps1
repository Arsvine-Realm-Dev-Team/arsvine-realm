# arsvine-realm local dev launcher.
#
# What it does:
#   1. (Self-elevate to Administrator if needed.)
#   2. Add `127.0.0.1  dev.arsvine.com` to the Windows hosts file
#      so the COS *.arsvine.com Referer whitelist accepts local pages.
#   3. Run `node server.js` (the same entry as `npm run dev`) directly,
#      streaming its output here. We bypass npm.cmd because Ctrl+C only
#      kills the cmd.exe wrapper, leaving node.exe orphaned on port 3000.
#   4. On Ctrl+C / normal exit / script termination:
#      - Stop the dev server (graceful taskkill, then /F fallback,
#        then port-3000 sweep as a last resort).
#      - Remove the hosts entry that this script added (won't remove an
#        entry that was already there before the script ran).
#      - Flush DNS cache.
#
# Usage:
#   Double-click this file (preferably via dev-host-setup.cmd), OR run:
#     .\scripts\dev-host-setup.ps1                 # default: hosts + dev server
#     .\scripts\dev-host-setup.ps1 -HostsOnly      # only add hosts, no server
#     .\scripts\dev-host-setup.ps1 -Remove         # remove hosts entry and exit
#
# Notes:
#   - Window close (X) bypasses finally; use -Remove to clean up afterwards.
#   - A daily backup of the hosts file is written next to it the first time
#     the script edits it on any given day.
#   - Cleanup includes a port-3000 sweep so any orphan node.exe gets killed.

param(
    [switch]$Remove,
    [switch]$HostsOnly
)

$ErrorActionPreference = 'Stop'

$Hostname  = 'dev.arsvine.com'
$IP        = '127.0.0.1'
$DevPort   = 3000
$HostsPath = "$env:windir\System32\drivers\etc\hosts"
$Marker    = "$IP`t$Hostname`t# arsvine-realm local dev"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$EntryRegex  = "^\s*\d{1,3}(\.\d{1,3}){3}\s+$([regex]::Escape($Hostname))(\s|$)"

# --- Self-elevate ---------------------------------------------------------

$currentPrincipal = New-Object Security.Principal.WindowsPrincipal(
    [Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "Elevating to Administrator..." -ForegroundColor Yellow
    # Prefer PowerShell 7 (pwsh.exe, modern console). Fall back to Windows
    # PowerShell 5.1 (powershell.exe) if pwsh isn't on PATH.
    $shell = if (Get-Command pwsh.exe -ErrorAction SilentlyContinue) { 'pwsh.exe' } else { 'powershell.exe' }
    $argList = @('-NoExit', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`"")
    if ($Remove)    { $argList += '-Remove' }
    if ($HostsOnly) { $argList += '-HostsOnly' }
    try {
        Start-Process $shell -ArgumentList $argList -Verb RunAs | Out-Null
    } catch {
        Write-Host "Failed to elevate: $_" -ForegroundColor Red
        Read-Host "Press Enter to close"
        exit 1
    }
    exit 0
}

# --- Hosts helpers --------------------------------------------------------

function Test-HostsEntry {
    $lines = Get-Content $HostsPath
    return ($lines | Where-Object { $_ -match $EntryRegex }).Count -gt 0
}

function Backup-HostsOnce {
    $backupPath = "$HostsPath.bak.$(Get-Date -Format yyyyMMdd)"
    if (-not (Test-Path $backupPath)) {
        Copy-Item $HostsPath $backupPath
        Write-Host "Backup: $backupPath" -ForegroundColor DarkGray
    }
}

function Add-HostsEntry {
    if (Test-HostsEntry) { return $false }   # already present, we did NOT add
    Backup-HostsOnce
    $lines = Get-Content $HostsPath
    $newLines = @($lines) + $Marker
    [System.IO.File]::WriteAllLines($HostsPath, $newLines, [System.Text.Encoding]::ASCII)
    ipconfig /flushdns | Out-Null
    Write-Host "Added: $Marker" -ForegroundColor Green
    return $true                              # we added it -> we own removal
}

function Remove-HostsEntry {
    if (-not (Test-HostsEntry)) {
        Write-Host "No entry for $Hostname found." -ForegroundColor DarkGray
        return
    }
    Backup-HostsOnce
    $lines = Get-Content $HostsPath
    $newLines = $lines | Where-Object { $_ -notmatch $EntryRegex }
    [System.IO.File]::WriteAllLines($HostsPath, $newLines, [System.Text.Encoding]::ASCII)
    ipconfig /flushdns | Out-Null
    Write-Host "Removed $Hostname from hosts." -ForegroundColor Green
}

# --- Port helpers ---------------------------------------------------------

function Get-PortListenerPid {
    param([int]$Port)
    $line = netstat -ano | Select-String -Pattern "^\s+TCP\s+\S+:$Port\s+\S+\s+LISTENING\s+(\d+)\s*$" | Select-Object -First 1
    if ($line -and $line.Matches[0].Groups[1].Value) {
        return [int]$line.Matches[0].Groups[1].Value
    }
    return $null
}

function Stop-PortListener {
    param([int]$Port)
    $orphanPid = Get-PortListenerPid -Port $Port
    if ($orphanPid) {
        Write-Host "Port $Port still held by PID $orphanPid; force-killing..." -ForegroundColor DarkYellow
        & taskkill /F /T /PID $orphanPid 2>$null | Out-Null
    }
}

# --- Subcommand: -Remove (manual cleanup) ---------------------------------

if ($Remove) {
    Remove-HostsEntry
    Read-Host "Press Enter to close"
    exit 0
}

# --- Add hosts entry ------------------------------------------------------

$weAdded = Add-HostsEntry
if (-not $weAdded) {
    Write-Host "Entry for $Hostname already present. Will NOT remove it on exit." -ForegroundColor Yellow
}

# --- Subcommand: -HostsOnly (no dev server) -------------------------------

if ($HostsOnly) {
    Write-Host ""
    Write-Host "Hosts entry active. Open another shell and run npm run dev yourself." -ForegroundColor Cyan
    Write-Host "Press Enter here to remove the hosts entry and exit." -ForegroundColor Yellow
    Read-Host
    if ($weAdded) { Remove-HostsEntry }
    exit 0
}

# --- Default: also launch the dev server ---------------------------------

# Sanity: refuse to start if something already holds port 3000 (e.g. a
# previous crashed run left an orphan). Tell the user to clean it up.
$preExisting = Get-PortListenerPid -Port $DevPort
if ($preExisting) {
    Write-Host ""
    Write-Host "Port $DevPort is already in use (PID $preExisting)." -ForegroundColor Red
    Write-Host "Run this script with -Remove to clean hosts, then kill that PID:" -ForegroundColor Yellow
    Write-Host "  taskkill /F /PID $preExisting" -ForegroundColor Yellow
    if ($weAdded) { Remove-HostsEntry }
    Read-Host "Press Enter to close"
    exit 1
}

Write-Host ""
Write-Host "Starting dev server (node server.js) in $ProjectRoot" -ForegroundColor Cyan
Write-Host "Open: http://${Hostname}:${DevPort}" -ForegroundColor Cyan
Write-Host "Note: first compile can take 10-30s. Wait for `"> Ready on http://localhost:${DevPort}`"." -ForegroundColor DarkGray
Write-Host "Press Ctrl+C to stop the server and (if we added it) remove the hosts entry." -ForegroundColor Yellow
Write-Host ""

$proc = $null
try {
    # IMPORTANT: launch node.exe directly (not npm.cmd). npm.cmd is a cmd.exe
    # wrapper -- Ctrl+C only kills the wrapper, leaving node.exe orphaned on
    # port 3000. Bypassing npm gives us a direct PID for clean shutdown.
    $proc = Start-Process -FilePath 'node.exe' `
                          -ArgumentList 'server.js' `
                          -WorkingDirectory $ProjectRoot `
                          -NoNewWindow `
                          -PassThru

    # Block here until the dev server exits OR Ctrl+C bubbles up to us.
    # Wait-Process throws PipelineStoppedException on Ctrl+C, which jumps to finally.
    Wait-Process -Id $proc.Id
}
finally {
    Write-Host ""
    if ($proc -and -not $proc.HasExited) {
        Write-Host "Stopping dev server (PID $($proc.Id))..." -ForegroundColor Yellow
        # /T = whole tree. Try graceful first.
        & taskkill /T /PID $proc.Id 2>$null | Out-Null
        $waited = 0
        while (-not $proc.HasExited -and $waited -lt 3000) {
            Start-Sleep -Milliseconds 200; $waited += 200
        }
        if (-not $proc.HasExited) {
            Write-Host "Graceful stop timed out, forcing..." -ForegroundColor DarkYellow
            & taskkill /F /T /PID $proc.Id 2>$null | Out-Null
        }
    }
    # Belt-and-suspenders: even if $proc tracking failed (orphan handle,
    # PID wrap, etc.), sweep port 3000 so we never leak a listener.
    Stop-PortListener -Port $DevPort
    if ($weAdded) {
        Remove-HostsEntry
    } else {
        Write-Host "Hosts entry was pre-existing; leaving it in place." -ForegroundColor DarkGray
    }
    Write-Host ""
    Write-Host "Done. Press Enter to close." -ForegroundColor Green
    Read-Host
}
