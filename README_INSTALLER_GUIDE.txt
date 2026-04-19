================================================================================
PORTAL PERBAIKAN - PANDUAN INSTALASI v2 (FIX UNTUK PC LAIN)
================================================================================

MASALAH YANG DIPERBAIKI:
✓ CMD tiba-tiba tutup tanpa pesan error
✓ File ter-block oleh Windows  
✓ Permission issue (access denied)
✓ Python tidak bisa jalan


PETUNJUK INSTALASI DI PC LAIN:
================================================================================

LANGKAH 1: EXTRACT ZIP
---------- 
1. Dapatkan file: RepairPortalPortable-latest.zip
2. Klik kanan > Extract All
   ATAU drag/drop ke folder kosong
3. Tunggu proses extract selesai


LANGKAH 2: JALANKAN FIX_PERMISSIONS.bat (WAJIB!)
----------
Ini step PALING PENTING! Jangan skip!

1. Buka folder hasil extract
2. Cari: FIX_PERMISSIONS.bat  
3. Klik dua kali (double-click)
4. Command window akan terbuka
5. Tunggu semua step selesai
6. Jika muncul "SEMUA CEK BERHASIL!" berarti OK
7. Tutup window (tekan tombol apapun)


LANGKAH 3: JALANKAN JALANKAN_APP.bat
----------
Setelah FIX_PERMISSIONS berhasil:

1. Klik dua kali: JALANKAN_APP.bat
2. Command window akan terbuka (beberapa detik)
3. Browser akan otomatis terbuka ke aplikasi
4. Command window akan menutup

SELESAI! Aplikasi siap digunakan!


JIKA MASIH TIDAK BISA:
================================================================================

A. JALANKAN JALANKAN_APP_DEBUG.bat
--------- 
Untuk melihat detail error:

1. Klik dua kali: JALANKAN_APP_DEBUG.bat
2. Perhatikan pesan yang muncul
3. Di akhir akan ada file "DEBUG_LOG.txt"

Error yang mungkin:
+ Python tidak bisa dijalankan
  → Cek Antivirus, unblock python.exe
+ File tidak lengkap  
  → Extract ulang ZIP


B. JALANKAN MANUAL_START.bat
---------
Untuk test manual:

1. Klik dua kali: MANUAL_START.bat
2. Server akan jalan dan output terlihat
3. Tekan Ctrl+C untuk stop
4. Gunakan untuk debug masalah awal


SOLUSI CEPAT:
================================================================================

Problem: CMD tutup tanpa pesan
Solusi:
  1. Jalankan FIX_PERMISSIONS.bat
  2. Atau Properties > Unblock pada python.exe di folder runtime/

Problem: Python tidak dikenali
Solusi:
  1. Cek Windows Defender Quarantine
  2. Restore python.exe jika ada
  3. Jalankan FIX_PERMISSIONS.bat lagi

Problem: Permission Denied
Solusi:
  1. Ekstrak ke folder yang accessible (bukan Program Files)
  2. Coba C:\Apps\, D:\, atau Desktop
  3. Jalankan FIX_PERMISSIONS.bat

Problem: Port 8000 sudah terpakai
Solusi:
  1. Cek apakah aplikasi sudah jalan dari proses sebelumnya
  2. Gunakan: tasklist | findstr python
  3. Kill process: taskkill /PID [nomor] /F


STRUKTUR FILE:
================================================================================

Setelah extract, harus ada:

RepairPortalPortable/
├── JALANKAN_APP.bat           ← KLIK INI
├── FIX_PERMISSIONS.bat        ← JALANKAN INI DULU (WAJIB!)
├── JALANKAN_APP_DEBUG.bat     ← Debug jika error
├── MANUAL_START.bat           ← Test manual
├── install_app.bat
├── start_portable_server.bat  
├── backend.py
├── index.html
├── styles.css
├── app.backend.js
├── runtime/                   ← Python embedded
│   ├── python.exe
│   ├── python.dll
│   └── ... (banyak file)
└── ...

Jika TIDAK ada "runtime" folder = extract belum lengkap!


TIPS KEAMANAN:
================================================================================

1. ANTIVIRUS
   - Windows Defender atau Antivirus lain mungkin block python.exe
   - Check Quarantine / History
   - Restore python.exe
   - Add exception untuk RepairPortalPortable folder

2. FIREWALL
   - Windows Firewall mungkin block port 8000
   - Allow python.exe: Inbound Rules > New Rule

3. FOLDER PERMISSION
   - Extract ke folder yang bisa diakses oleh user
   - Hindari: Program Files, System32
   - Gunakan: C:\Apps\, D:\, Desktop


AKSES DARI PC LAIN DI JARINGAN:
================================================================================

Setelah aplikasi jalan:

DARI PC YANG MENJALANKAN APP:
  http://localhost:8000

DARI PC LAIN DI JARINGAN YANG SAMA:
  1. Cari IP address PC server
     - Buka Command Prompt
     - Ketik: ipconfig
     - Lihat IPv4 Address (misal: 192.168.1.100)
  
  2. Akses dari browser PC lain:
     http://192.168.1.100:8000


UNINSTALL:
================================================================================

1. Hapus folder RepairPortalPortable
2. Buka Startup folder:
   C:\Users\[username]\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup
3. Hapus file RepairPortalPortableStart.cmd

DESKTOP SHORTCUTS:
  - Hapus "Repair Portal Portable (Open).url"
  - Hapus "Repair Portal Portable (Start).cmd"


BANTUAN:
================================================================================

Jika masih error:
1. Jalankan JALANKAN_APP_DEBUG.bat
2. Salin isi DEBUG_LOG.txt
3. Screenshot error message
4. Hubungi tim support dengan informasi ini

Windows version: [system info]
Antivirus: [nama antivirus]
Error message: [output dari debug]


================================================================================
Versi: v2 (April 2026)
Update: Tambah FIX_PERMISSIONS, DEBUG mode, MANUAL_START untuk PC lain
================================================================================
