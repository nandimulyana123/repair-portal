param(
    [int]$Port = 8000,
    [string]$BindHost = '0.0.0.0'
)

$ErrorActionPreference = 'Stop'

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

$pythonLauncher = Get-PythonLauncher
if (-not $pythonLauncher) {
    throw 'Python launcher tidak ditemukan. Install Python terlebih dahulu.'
}

$appDir = $PSScriptRoot
Set-Location $appDir

$existing = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like '*backend.py*' }

if ($existing) {
    Write-Host 'Backend sudah berjalan. Script tidak menjalankan instance baru.'
    exit 0
}

$env:HOST = $BindHost
$env:PORT = "$Port"

if ($pythonLauncher -eq 'py') {
    & py backend.py
} else {
    & python backend.py
}