# Portal Pengajuan Perbaikan

Aplikasi localhost sederhana untuk mengelola pengajuan perbaikan antara user dan admin. Data disimpan di SQLite lewat backend Python, jadi login dan seluruh data tidak lagi bergantung pada browser.

## Fitur

- Login admin/user dengan session cookie (HttpOnly)
- Password tersimpan aman dengan hash PBKDF2
- Form pengajuan perbaikan + unit + prioritas
- Dashboard status pengajuan
- Panel admin untuk ubah status dan alasan proses
- Rekap bulanan dan export PDF
- Pengaturan tampilan halaman depan oleh admin
- Pengaturan kop surat dan penandatangan laporan PDF
- Manajemen pengguna dari panel admin
- Admin dapat mengubah password pengguna langsung dari tabel manajemen pengguna.
- Admin dapat mengaktifkan/nonaktifkan akun pengguna tanpa menghapus data historis.
- Admin dapat menghapus user secara permanen jika user tidak memiliki riwayat pengajuan.
- Admin dapat melihat audit log perubahan penting (buat user, ubah password, status user, update request, reset database).
- Audit log dapat difilter per admin, jenis aksi, dan tanggal di UI.
- Audit log mendukung pagination di UI agar data besar tetap nyaman dibaca.
- Audit log dapat diekspor ke CSV dan PDF sesuai filter aktif.
- Kebijakan password admin/user: minimal 8 karakter, wajib huruf besar, huruf kecil, angka, dan simbol.
- Admin dapat generate password acak kuat (sekali tampil) untuk pembuatan/reset akun.
- Reset database ke data awal dari panel admin
- Migrasi otomatis data lama localStorage ke SQLite (sekali)

- Admin: `admin` / `Admin123!`
- User: `user` / `User123!`

## Cara Menjalankan

Jalankan backend Python dari folder `repair-portal`:

```bash
py backend.py
```

Lalu buka:

```text
http://localhost:8000
```

Manual book operasional:

```text
http://localhost:8000/manualbook.html
```

Jika Anda memakai VS Code, buka `index.html` lalu jalankan backend Python.

## Instal Sekali, Pakai Langsung (Windows)

Untuk mode siap pakai di jaringan (user/admin akses via IP WiFi), cukup jalankan:

```bat
install_app.bat
```

Installer otomatis akan:

- Menyiapkan auto-start server saat login Windows (tanpa task scheduler)
- Menjalankan server pada `0.0.0.0:8000`
- Membuat shortcut desktop `Repair Portal (Open)` dan `Repair Portal (Start)`
- Menyimpan startup file di folder user agar tetap jalan setelah Windows login

Script operasional tambahan:

- Start manual: `start_server.ps1`
- Stop server: `stop_server.ps1`
- Lihat URL LAN: `show_app_urls.ps1`

Catatan: komputer tujuan tetap perlu Python terpasang. Jika Python belum ada, installer akan berhenti dengan pesan jelas.

## Portable Tanpa Install Python (Opsi 1)

Untuk membuat paket portable yang sudah membawa Python runtime:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\build_portable.ps1
```

Hasil build ada di folder:

```text
dist\RepairPortalPortable
```

Di PC tujuan, cukup jalankan:

```bat
install_app.bat
```

yang ada di dalam folder `dist\RepairPortalPortable`.

Untuk versi paling mudah bagi user non-teknis, klik:

```bat
JALANKAN_APP.bat
```

File ini akan menjalankan instalasi + membuka aplikasi otomatis di browser.

## Paket ZIP Siap Kirim (Opsi 2)

Untuk langsung membuat file ZIP portable:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\build_portable_zip.ps1
```

Hasil ZIP ada di folder `dist\` dengan nama seperti:

```text
RepairPortalPortable-YYYYMMDD-HHMMSS.zip
```

## Catatan

- Login sudah memakai cookie session dan password tersimpan dengan hash PBKDF2.
- Data ada di file `repair-portal.db`.
- Backup database harian otomatis dibuat ke folder `backups/` saat backend berjalan.
- Retensi backup default 14 hari (bisa diubah dengan env `BACKUP_RETENTION_DAYS`).
- Library PDF sudah disimpan lokal di folder `vendor/` (bisa offline).
- Untuk reset data demo, hapus file database tersebut lalu jalankan backend lagi.
