@echo off
setlocal
for /f "tokens=2 delims==;" %%A in ('wmic process where "CommandLine like '%%backend.py%%'" get ProcessId /value ^| find "="') do taskkill /PID %%A /F >nul 2>nul
echo Server stop command selesai.
endlocal
