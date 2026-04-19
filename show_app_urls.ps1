param(
    [int]$Port = 8000
)

$ErrorActionPreference = 'SilentlyContinue'

$ips = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
        $_.IPAddress -notlike '169.254.*' -and
        $_.IPAddress -ne '127.0.0.1' -and
        $_.PrefixOrigin -ne 'WellKnown'
    } |
    Select-Object -ExpandProperty IPAddress -Unique

if (-not $ips) {
    Write-Host 'IP LAN tidak terdeteksi otomatis. Cek dengan perintah ipconfig.'
    exit 0
}

Write-Host 'Akses dari perangkat lain (WiFi/LAN yang sama):'
foreach ($ip in $ips) {
    Write-Host "- http://${ip}:$Port"
}