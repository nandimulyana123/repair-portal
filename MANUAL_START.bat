@echo off
REM ===================================================================
REM MANUAL_START.bat
REM Jalankan server secara manual - berguna untuk testing
REM ===================================================================

setlocal
cls

echo.
echo ============================================================
echo  REPAIR PORTAL - MANUAL START (TESTING MODE)
echo ============================================================
echo.

cd /d "%~dp0"
echo Direktori: %CD%
echo.

echo [CHECK] Python...
"%CD%\runtime\python.exe" --version
if errorlevel 1 (
    echo ERROR: Python tidak jalan!
    pause
    exit /b 1
)
echo OK
echo.

echo [START] Server Port 8000
echo.
echo Akses dari PC ini: http://localhost:8000
echo.
echo Tekan Ctrl+C untuk stop
echo.
echo ============================================================
echo.

cd /d "%~dp0"
"%CD%\runtime\python.exe" backend.py

endlocal
