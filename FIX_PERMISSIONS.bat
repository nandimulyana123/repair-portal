@echo off
REM ===================================================================
REM FIX_PERMISSIONS.bat
REM Script untuk mengatasi masalah permission dan file yang ter-blok
REM Jalankan ini PERTAMA KALI setelah extract ZIP di PC lain
REM ===================================================================

setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo ============================================================
echo  REPAIR PORTAL - FIX PERMISSIONS + UNBLOCK FILES
echo ============================================================
echo.
echo Lokasi: %CD%
echo.

REM Check if PowerShell is available for unblocking files
echo [STEP 1] Mencek PowerShell...
powershell -NoProfile -Command "exit" >nul 2>&1
if errorlevel 1 (
    echo WARNING: PowerShell tidak tersedia, tapi coba lanjut...
    goto CHECK_ENV
)

echo OK - PowerShell tersedia
echo.

REM Unblock downloaded ZIP files and all contents
echo [STEP 2] Melepas blok file (Unblock-File)...
cd /d "%~dp0"
for /r . %%F in (*.zip *.exe *.dll *.pyd) do (
    echo   - Unblocking: %%F
    powershell -NoProfile -Command "Unblock-File -Path '%%F' -ErrorAction SilentlyContinue" 2>nul
)
echo OK
echo.

REM Check if Python runtime exists
:CHECK_ENV
echo [STEP 3] Cek ketersediaan Python runtime...
if not exist "%~dp0runtime\python.exe" (
    echo ERROR: runtime\python.exe TIDAK DITEMUKAN!
    echo.
    echo Solusi: Extract ulang ZIP, pastikan lengkap
    echo.
    pause
    exit /b 1
)
echo OK - runtime\python.exe ditemukan
echo.

REM Test if Python can actually run
echo [STEP 4] Test menjalankan Python...
"%~dp0runtime\python.exe" --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python tidak bisa dijalankan!
    echo.
    echo Kemungkinan masalah:
    echo - Antivirus mengquarantine runtime/python.exe
    echo - Permission issue
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%A in ('"%~dp0runtime\python.exe" --version 2^>^&1') do echo   - %%A
echo OK
echo.

REM Check if file-file aplikasi ada
echo [STEP 5] Cek file aplikasi...
if not exist "%~dp0backend.py" (
    echo ERROR: backend.py tidak ditemukan!
    pause
    exit /b 1
)
if not exist "%~dp0start_portable_server.bat" (
    echo ERROR: start_portable_server.bat tidak ditemukan!
    pause
    exit /b 1
)
echo OK - File aplikasi lengkap
echo.

echo ============================================================
echo  SEMUA CEK BERHASIL!
echo ============================================================
echo.
echo Sekarang Anda bisa:
echo.
echo  1. Klik 2x JALANKAN_APP.bat (normal mode)
echo  2. Setelah itu, aplikasi akan otomatis terbuka
echo.
echo ATAU debugging jika error:
echo.
echo  - Jalankan JALANKAN_APP_DEBUG.bat (lihat detail error)
echo  - Jalankan MANUAL_START.bat (test server manual)
echo.
pause
endlocal
