param(
    [int]$Port = 8000,
    [string]$BindHost = '0.0.0.0',
    [string]$TaskName = 'RepairPortalServer'
)

$ErrorActionPreference = 'Stop'

function Write-Section {
    param([string]$Text)
    Write-Host "`n=== $Text ===" -ForegroundColor Cyan
}

function Get-PythonLauncher {
    $py = Get-Command py -ErrorAction SilentlyContinue
    if ($py) {
        return 'py'
    }

    $python = Get-Command python -ErrorAction SilentlyContinue
    if ($python) {
        return 'python'
    }

    return $null
}

function Ensure-FirewallRule {
    param([int]$LocalPort)

    $ruleName = "RepairPortal-TCP-$LocalPort"
    $exists = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if ($exists) {
        Write-Host "Firewall rule sudah ada: $ruleName"
        return
    }

    New-NetFirewallRule `
        -DisplayName $ruleName `
        -Direction Inbound `
        -Action Allow `
        -Protocol TCP `
        -LocalPort $LocalPort | Out-Null

    Write-Host "Firewall rule dibuat: $ruleName"
}

function Ensure-Shortcut {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Directory
    )

    if (-not (Test-Path $Directory)) {
        return
    }

    $path = Join-Path $Directory "$Name.url"
    $content = @(
        '[InternetShortcut]',
        "URL=$Url"
    )
    try {
        Set-Content -Path $path -Value $content -Encoding ASCII
        Write-Host "Shortcut dibuat: $path"
    } catch {
        Write-Warning "Gagal membuat shortcut di $Directory. Detail: $($_.Exception.Message)"
    }
}

function Ensure-StartupFallback {
    param(
        [string]$ScriptPath,
        [int]$LocalPort,
        [string]$LocalBindHost
    )

    $startupDir = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup'
    if (-not (Test-Path $startupDir)) {
        New-Item -ItemType Directory -Path $startupDir -Force | Out-Null
    }

    $cmdPath = Join-Path $startupDir 'RepairPortalServer.cmd'
    $line = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ScriptPath`" -Port $LocalPort -BindHost $LocalBindHost"
    Set-Content -Path $cmdPath -Value $line -Encoding ASCII
    Write-Host "Fallback startup dibuat: $cmdPath"
}

Write-Section 'Validasi lingkungan'

$appDir = $PSScriptRoot
$backendPath = Join-Path $appDir 'backend.py'
$startScriptPath = Join-Path $appDir 'start_server.ps1'
$urlScriptPath = Join-Path $appDir 'show_app_urls.ps1'

if (-not (Test-Path $backendPath)) {
    throw "File backend tidak ditemukan: $backendPath"
}

if (-not (Test-Path $startScriptPath)) {
    throw "File start script tidak ditemukan: $startScriptPath"
}

$pythonLauncher = Get-PythonLauncher
if (-not $pythonLauncher) {
    throw 'Python launcher tidak ditemukan. Install Python dulu lalu ulangi installer.'
}
Write-Host "Python launcher: $pythonLauncher"

Write-Section 'Konfigurasi firewall'
try {
    Ensure-FirewallRule -LocalPort $Port
} catch {
    Write-Warning "Gagal membuat firewall rule otomatis. Jalankan installer sebagai Administrator. Detail: $($_.Exception.Message)"
}

Write-Section 'Konfigurasi auto-start saat login'

$taskCommand = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "{0}" -Port {1} -BindHost {2}' -f $startScriptPath, $Port, $BindHost

schtasks /Create /SC ONLOGON /TN $TaskName /TR $taskCommand /F | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Scheduled task dibuat/diupdate: $TaskName"
} else {
    Write-Warning "Scheduled task gagal dibuat (kemungkinan butuh Administrator). Mengaktifkan fallback startup user..."
    Ensure-StartupFallback -ScriptPath $startScriptPath -LocalPort $Port -LocalBindHost $BindHost
}

Write-Section 'Menjalankan server sekarang'
Start-Process -FilePath 'powershell.exe' -WindowStyle Hidden -ArgumentList @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $startScriptPath,
    '-Port', "$Port",
    '-BindHost', $BindHost
)

Write-Section 'Membuat shortcut aplikasi'
$localUrl = "http://localhost:$Port"
$userDesktop = [Environment]::GetFolderPath('Desktop')
$publicDesktop = Join-Path $env:PUBLIC 'Desktop'
Ensure-Shortcut -Name 'Repair Portal (Local)' -Url $localUrl -Directory $userDesktop
Ensure-Shortcut -Name 'Repair Portal (Local)' -Url $localUrl -Directory $publicDesktop

Write-Section 'Informasi akses'
Write-Host "Aplikasi lokal: $localUrl"
if (Test-Path $urlScriptPath) {
    & $urlScriptPath -Port $Port
}

Write-Host "`nInstalasi selesai. User/admin lain di jaringan yang sama dapat akses via IP WiFi perangkat ini pada port $Port." -ForegroundColor Green