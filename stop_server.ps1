$ErrorActionPreference = 'SilentlyContinue'

$processes = Get-CimInstance Win32_Process |
    Where-Object { $_.CommandLine -like '*backend.py*' }

if (-not $processes) {
    Write-Host 'Tidak ada proses backend.py yang berjalan.'
    exit 0
}

foreach ($process in $processes) {
    Stop-Process -Id $process.ProcessId -Force
}

Write-Host 'Server berhasil dihentikan.'