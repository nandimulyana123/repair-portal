@echo off
setlocal
set "APP_DIR=%~dp0"
set "PY_EXE=%APP_DIR%runtime\python.exe"
if not exist "%PY_EXE%" (
  echo Runtime Python tidak ditemukan.
  pause
  exit /b 1
)
set "HOST=192.168.80.130"
set "PORT=8000"
cd /d "%APP_DIR%"
"%PY_EXE%" backend.py
endlocal
