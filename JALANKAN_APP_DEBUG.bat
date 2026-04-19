@echo off
REM ===================================================================
REM JALANKAN_APP_DEBUG.bat
REM Debug version dengan detail error reporting
REM Gunakan ini jika JALANKAN_APP.bat tidak berjalan
REM ===================================================================

setlocal enabledelayedexpansion
cls

echo.
echo ============================================================
echo  REPAIR PORTAL - DEBUG MODE
echo ============================================================
echo.

cd /d "%~dp0"
echo Folder: %CD%
echo.

set "DEBUG_LOG=%CD%\DEBUG_LOG.txt"
(
    echo DEBUG LOG - %date% %time%
    echo Folder: %CD%
    echo.
) > "%DEBUG_LOG%"

echo [CHECK 1] Python runtime...
if not exist "%CD%\runtime\python.exe" (
    echo ERROR: python.exe tidak ditemukan di runtime\
    echo.
    pause
    exit /b 1
)
echo OK
echo.

echo [CHECK 2] Test Python...
"%CD%\runtime\python.exe" --version 1>>"%DEBUG_LOG%" 2>&1
if errorlevel 1 (
    echo ERROR: Python tidak bisa dijalankan!
    echo Kemungkinan: Antivirus block, permission issue
    echo.
    pause
    exit /b 1
)
"%CD%\runtime\python.exe" --version
echo OK
echo.

echo [CHECK 3] File aplikasi...
if not exist "%CD%\backend.py" (
    echo ERROR: backend.py tidak ditemukan!
    pause
    exit /b 1
)
echo OK
echo.

echo [RUN] Menjalankan installer...
call "%CD%\install_app.bat" 1>>"%DEBUG_LOG%" 2>&1

if errorlevel 1 (
    echo.
    echo ERROR saat instalasi!
    echo Lihat: %DEBUG_LOG%
    echo.
    pause
    exit /b %errorlevel%
)

echo.
echo Sukses! Log: %DEBUG_LOG%
pause
endlocal
