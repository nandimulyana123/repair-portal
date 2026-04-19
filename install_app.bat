@echo off
setlocal EnableExtensions EnableDelayedExpansion
set "APP_DIR=%~dp0"
set "PORT=8000"
set "SERVER_IP=192.168.80.130"
set "SERVER_MASK=255.255.255.0"
set "SERVER_GATEWAY=192.168.80.1"
set "SERVER_DNS1=192.168.80.1"
set "SERVER_DNS2=8.8.8.8"
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "DESKTOP_DIR=%USERPROFILE%\Desktop"
set "START_CMD=%APPDATA%\RepairPortalPortableStart.cmd"
set "OPEN_URL_LOCAL=%DESKTOP_DIR%\Repair Portal Portable (Open Local).url"
set "OPEN_URL_LAN=%DESKTOP_DIR%\Repair Portal Portable (Open Server LAN).url"
set "LAUNCH_CMD=%DESKTOP_DIR%\Jalankan Portal.cmd"
set "START_CMD_DESKTOP=%DESKTOP_DIR%\Repair Portal Portable (Start).cmd"
set "SHARE_LINK_FILE=%DESKTOP_DIR%\Repair Portal Link Server.txt"
set "FINAL_LINK=http://%SERVER_IP%:%PORT%"
set "LAN_IP_CURRENT="
set "INSTALL_LOG=%DESKTOP_DIR%\RepairPortalPortable-install.log"
cls
echo ============================================================
echo  REPAIR PORTAL PORTABLE
echo ============================================================
echo Instalasi dimulai... > "%INSTALL_LOG%"
echo Log: %INSTALL_LOG%
echo.
set "IS_ADMIN=0"
net session >nul 2>nul && set "IS_ADMIN=1"
echo Status admin: %IS_ADMIN%
if "%IS_ADMIN%"=="1" (
  for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 ^| Where-Object {$_.IPAddress -like '192.168.80.*' -and $_.InterfaceAlias -notlike '*Loopback*'} ^| Select-Object -First 1 -ExpandProperty InterfaceAlias)"`) do set "TARGET_IFACE=%%I"
  if defined TARGET_IFACE (
    netsh interface ip set address name="!TARGET_IFACE!" static %SERVER_IP% %SERVER_MASK% %SERVER_GATEWAY% 1 >nul 2>nul
    netsh interface ip set dns name="!TARGET_IFACE!" static %SERVER_DNS1% primary >nul 2>nul
    netsh interface ip add dns name="!TARGET_IFACE!" %SERVER_DNS2% index=2 >nul 2>nul
  )
)
for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 ^| Where-Object {$_.IPAddress -notlike '169.254.*' -and $_.IPAddress -ne '127.0.0.1'} ^| Select-Object -First 1 -ExpandProperty IPAddress)"`) do set "LAN_IP_CURRENT=%%I"
if not defined LAN_IP_CURRENT set "LAN_IP_CURRENT=%SERVER_IP%"
set "FINAL_LINK=http://%LAN_IP_CURRENT%:%PORT%"
if not exist "%STARTUP_DIR%" mkdir "%STARTUP_DIR%" >nul 2>nul
> "%START_CMD%" echo @echo off
>> "%START_CMD%" echo cd /d "%APP_DIR%"
>> "%START_CMD%" echo call "%APP_DIR%start_portable_server.bat"
copy /Y "%START_CMD%" "%STARTUP_DIR%\RepairPortalPortableStart.cmd" >nul
> "%OPEN_URL_LOCAL%" echo [InternetShortcut]
>> "%OPEN_URL_LOCAL%" echo URL=http://localhost:%PORT%
> "%OPEN_URL_LAN%" echo [InternetShortcut]
>> "%OPEN_URL_LAN%" echo URL=%FINAL_LINK%
> "%LAUNCH_CMD%" echo @echo off
>> "%LAUNCH_CMD%" echo cd /d "%APP_DIR%"
>> "%LAUNCH_CMD%" echo call "%APP_DIR%start_portable_server.bat"
>> "%LAUNCH_CMD%" echo timeout /t 4 /nobreak ^>nul
>> "%LAUNCH_CMD%" echo start "" "http://localhost:%PORT%"
> "%SHARE_LINK_FILE%" echo Link server untuk PC lain:
>> "%SHARE_LINK_FILE%" echo %FINAL_LINK%
>> "%SHARE_LINK_FILE%" echo.
>> "%SHARE_LINK_FILE%" echo Cadangan (target static): http://%SERVER_IP%:%PORT%
> "%START_CMD_DESKTOP%" echo @echo off
>> "%START_CMD_DESKTOP%" echo cd /d "%APP_DIR%"
>> "%START_CMD_DESKTOP%" echo call "%APP_DIR%start_portable_server.bat"
netsh advfirewall firewall add rule name="RepairPortal 8000" dir=in action=allow protocol=TCP localport=%PORT% profile=private >nul 2>nul
start "Repair Portal Portable" "%APP_DIR%start_portable_server.bat"
timeout /t 4 /nobreak >nul
powershell -NoProfile -Command "try { Invoke-WebRequest -Uri 'http://127.0.0.1:%PORT%' -TimeoutSec 3 ^| Out-Null; exit 0 } catch { exit 1 }" >nul 2>nul
if errorlevel 1 (
  echo WARNING: Server belum merespons. Coba jalankan ulang sebagai Administrator.
)
start "" "http://localhost:%PORT%"
echo Instalasi portable selesai dan aplikasi dibuka otomatis.
echo - Shortcut desktop dibuat (Open Local, Open Server LAN, dan Start).
echo - Startup otomatis user dibuat.
echo - Akses lokal: http://localhost:%PORT%
echo - Akses server LAN: %FINAL_LINK%
echo Selesai. Link server: %FINAL_LINK% >> "%INSTALL_LOG%"
for /f "tokens=1* delims=:" %%A in ('ipconfig ^| findstr /R /C:"IPv4 Address"') do (
  set "LAN_IP=%%B"
  setlocal EnableDelayedExpansion
  set "LAN_IP=!LAN_IP: =!"
  echo - Akses LAN: http://!LAN_IP!:%PORT%
  endlocal
)
echo.
echo Tekan tombol apapun untuk menutup jendela ini...
pause >nul
timeout /t 2 /nobreak >nul
endlocal
