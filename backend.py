from __future__ import annotations

import hashlib
import json
import mimetypes
import os
import secrets
import sqlite3
import threading
import time
from datetime import datetime, timedelta, timezone
from http import cookies
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / 'repair-portal.db'
BACKUP_DIR = BASE_DIR / 'backups'
SESSION_COOKIE = 'repair_portal_session'
DEFAULT_THEME = 'teal'
BACKUP_RETENTION_DAYS = max(1, int(os.environ.get('BACKUP_RETENTION_DAYS', '14')))
BACKUP_CHECK_INTERVAL_SECONDS = max(60, int(os.environ.get('BACKUP_CHECK_INTERVAL_SECONDS', '300')))

DEFAULT_LANDING_SETTINGS = {
    'eyebrow': 'Sistem Internal',
    'title': 'Portal Pengajuan Perbaikan',
    'subtitle': 'Sistem resmi untuk pengajuan, pemantauan, dan rekap perbaikan di lingkungan kerja.',
    'theme': DEFAULT_THEME,
}

DEFAULT_REPORT_SETTINGS = {
    'letterhead': 'Nama Instansi / Rumah Sakit\nAlamat instansi / rumah sakit\nKota, Provinsi',
    'signerName': 'Nama Penanda Tangan',
    'signerRole': 'Jabatan Penanda Tangan',
    'signerId': '',
}

DEFAULT_USERS = [
    {
        'username': 'admin',
        'password': 'Admin123!',
        'role': 'admin',
        'name': 'Administrator',
    },
    {
        'username': 'user',
        'password': 'User123!',
        'role': 'user',
        'name': 'User Demo',
    },
]

DEFAULT_REQUESTS = [
    {
        'id': 'PR-20260402-001',
        'username': 'user',
        'name': 'User Demo',
        'unit': 'Operasional',
        'title': 'Lampu ruang rapat mati',
        'category': 'PC',
        'location': 'Lantai 2 - Ruang Rapat',
        'priority': 'Tinggi',
        'description': 'Lampu utama tidak menyala saat ruangan digunakan.',
        'status': 'Selesai',
        'note': 'Sudah diganti ballast dan lampu baru.',
        'processReason': 'Perbaikan kabel dan lampu telah diselesaikan.',
        'createdAt': '2026-04-02T09:00:00Z',
        'updatedAt': '2026-04-03T14:30:00Z',
    },
    {
        'id': 'PR-20260410-002',
        'username': 'user',
        'name': 'User Demo',
        'unit': 'Finance',
        'title': 'Internet ruang finance lambat',
        'category': 'Internet/WiFi',
        'location': 'Lantai 1 - Finance',
        'priority': 'Sedang',
        'description': 'Koneksi lambat pada jam kerja.',
        'status': 'Diproses',
        'note': 'Teknisi dijadwalkan hari ini.',
        'processReason': 'Menunggu pengecekan router utama dan jalur kabel.',
        'createdAt': '2026-04-10T10:15:00Z',
        'updatedAt': '2026-04-12T11:20:00Z',
    },
    {
        'id': 'PR-20260413-003',
        'username': 'admin',
        'name': 'Administrator',
        'unit': 'IT Support',
        'title': 'Printer area admin offline',
        'category': 'Printer',
        'location': 'Lantai 3 - Area Admin',
        'priority': 'Rendah',
        'description': 'Printer tidak terdeteksi di beberapa komputer kantor.',
        'status': 'Diajukan',
        'note': '',
        'processReason': '',
        'createdAt': '2026-04-13T08:40:00Z',
        'updatedAt': '2026-04-13T08:40:00Z',
    },
]

THEME_MAP = {
    'teal': {
        'accent': '#7dd3fc',
        'accentStrong': '#38bdf8',
        'hero': 'linear-gradient(180deg, rgba(10, 17, 30, 0.98), rgba(9, 16, 29, 0.9))',
    },
    'blue': {
        'accent': '#93c5fd',
        'accentStrong': '#60a5fa',
        'hero': 'linear-gradient(180deg, rgba(10, 18, 38, 0.98), rgba(8, 13, 27, 0.9))',
    },
    'green': {
        'accent': '#86efac',
        'accentStrong': '#34d399',
        'hero': 'linear-gradient(180deg, rgba(8, 22, 20, 0.98), rgba(7, 16, 20, 0.9))',
    },
    'amber': {
        'accent': '#fcd34d',
        'accentStrong': '#f59e0b',
        'hero': 'linear-gradient(180deg, rgba(25, 18, 7, 0.98), rgba(13, 11, 7, 0.9))',
    },
}

STATUS_VALUES = {'Diajukan', 'Diproses', 'Selesai', 'Ditolak'}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso_now() -> str:
    return utc_now().replace(microsecond=0).isoformat().replace('+00:00', 'Z')


def parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    normalized = value.replace('Z', '+00:00')
    try:
        return datetime.fromisoformat(normalized)
    except ValueError:
        return None


def hash_password(password: str, salt_hex: str | None = None) -> tuple[str, str]:
    salt = bytes.fromhex(salt_hex) if salt_hex else secrets.token_bytes(16)
    derived = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 120_000)
    return salt.hex(), derived.hex()


def verify_password(password: str, salt_hex: str, hash_hex: str) -> bool:
    _, candidate = hash_password(password, salt_hex)
    return secrets.compare_digest(candidate, hash_hex)


def row_to_dict(row: sqlite3.Row | None) -> dict | None:
    return dict(row) if row is not None else None


def db() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute('PRAGMA foreign_keys = ON')
    return connection


def init_db() -> None:
    connection = db()
    cursor = connection.cursor()
    cursor.execute(
        '''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
            active INTEGER NOT NULL DEFAULT 1,
            password_salt TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        '''
    )
    cursor.execute(
        '''
        CREATE TABLE IF NOT EXISTS requests (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            unit TEXT NOT NULL,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            location TEXT NOT NULL,
            priority TEXT NOT NULL,
            description TEXT NOT NULL,
            status TEXT NOT NULL,
            note TEXT NOT NULL DEFAULT '',
            process_reason TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        '''
    )
    cursor.execute(
        '''
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
        '''
    )
    cursor.execute(
        '''
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            expires_at TEXT NOT NULL,
            remember INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        '''
    )
    cursor.execute(
        '''
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            actor_user_id INTEGER,
            actor_username TEXT NOT NULL,
            action TEXT NOT NULL,
            target TEXT NOT NULL DEFAULT '',
            details TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            FOREIGN KEY(actor_user_id) REFERENCES users(id) ON DELETE SET NULL
        )
        '''
    )

    ensure_schema(cursor)

    seed_users(cursor)
    seed_settings(cursor)
    seed_requests(cursor)
    connection.commit()
    connection.close()


def ensure_schema(cursor: sqlite3.Cursor) -> None:
    user_columns = [row['name'] for row in cursor.execute("PRAGMA table_info(users)").fetchall()]
    if 'active' not in user_columns:
        cursor.execute('ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1')


def seed_users(cursor: sqlite3.Cursor) -> None:
    existing = cursor.execute('SELECT COUNT(*) AS total FROM users').fetchone()['total']
    if existing:
        return

    now = iso_now()
    for user in DEFAULT_USERS:
        salt_hex, hash_hex = hash_password(user['password'])
        cursor.execute(
            'INSERT INTO users (username, name, role, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            (user['username'], user['name'], user['role'], salt_hex, hash_hex, now),
        )


def validate_username(username: str) -> bool:
    if len(username) < 3 or len(username) > 40:
        return False
    allowed = set('abcdefghijklmnopqrstuvwxyz0123456789._-')
    return all(char in allowed for char in username)


def validate_password_strength(password: str) -> str | None:
    if len(password) < 8:
        return 'Password minimal 8 karakter.'
    if any(char.isspace() for char in password):
        return 'Password tidak boleh mengandung spasi.'
    if not any(char.islower() for char in password):
        return 'Password harus mengandung huruf kecil.'
    if not any(char.isupper() for char in password):
        return 'Password harus mengandung huruf besar.'
    if not any(char.isdigit() for char in password):
        return 'Password harus mengandung angka.'
    if not any(not char.isalnum() for char in password):
        return 'Password harus mengandung simbol.'
    return None


def seed_settings(cursor: sqlite3.Cursor) -> None:
    defaults = {
        'landing_settings': DEFAULT_LANDING_SETTINGS,
        'report_settings': DEFAULT_REPORT_SETTINGS,
    }
    for key, payload in defaults.items():
        row = cursor.execute('SELECT key FROM settings WHERE key = ?', (key,)).fetchone()
        if row is None:
            cursor.execute('INSERT INTO settings (key, value) VALUES (?, ?)', (key, json.dumps(payload)))

    row = cursor.execute('SELECT key FROM settings WHERE key = ?', ('admin_seen_at',)).fetchone()
    if row is None:
        cursor.execute('INSERT INTO settings (key, value) VALUES (?, ?)', ('admin_seen_at', '1970-01-01T00:00:00Z'))


def seed_requests(cursor: sqlite3.Cursor) -> None:
    existing = cursor.execute('SELECT COUNT(*) AS total FROM requests').fetchone()['total']
    if existing:
        return

    user_rows = cursor.execute('SELECT id, username FROM users').fetchall()
    users = {row['username']: row['id'] for row in user_rows}
    for request in DEFAULT_REQUESTS:
        cursor.execute(
            '''
            INSERT INTO requests (
                id, user_id, name, unit, title, category, location, priority,
                description, status, note, process_reason, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''',
            (
                request['id'],
                users[request['username']],
                request['name'],
                request['unit'],
                request['title'],
                request['category'],
                request['location'],
                request['priority'],
                request['description'],
                request['status'],
                request['note'],
                request['processReason'],
                request['createdAt'],
                request['updatedAt'],
            ),
        )


def get_setting(connection: sqlite3.Connection, key: str, default: dict) -> dict:
    row = connection.execute('SELECT value FROM settings WHERE key = ?', (key,)).fetchone()
    if row is None:
        return default.copy()
    try:
        payload = json.loads(row['value'])
    except json.JSONDecodeError:
        payload = {}
    merged = default.copy()
    merged.update(payload if isinstance(payload, dict) else {})
    return merged


def set_setting(connection: sqlite3.Connection, key: str, value: dict) -> None:
    connection.execute(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        (key, json.dumps(value)),
    )


def get_admin_seen_at(connection: sqlite3.Connection) -> datetime:
    row = connection.execute('SELECT value FROM settings WHERE key = ?', ('admin_seen_at',)).fetchone()
    if row is None:
        return datetime(1970, 1, 1, tzinfo=timezone.utc)
    raw_value = row['value']
    try:
        decoded = json.loads(raw_value)
        if isinstance(decoded, dict):
            raw_value = str(decoded.get('value', raw_value))
    except json.JSONDecodeError:
        pass
    parsed = parse_iso(raw_value)
    return parsed or datetime(1970, 1, 1, tzinfo=timezone.utc)


def set_admin_seen_at(connection: sqlite3.Connection, value: str) -> None:
    connection.execute(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        ('admin_seen_at', value),
    )


def cleanup_sessions(connection: sqlite3.Connection) -> None:
    now = iso_now()
    connection.execute('DELETE FROM sessions WHERE expires_at <= ?', (now,))


def get_current_user(handler: 'RepairPortalHandler', connection: sqlite3.Connection) -> dict | None:
    token = handler.cookie_value(SESSION_COOKIE)
    if not token:
        return None
    row = connection.execute(
        '''
        SELECT s.token, s.expires_at, s.remember, u.id, u.username, u.name, u.role, u.active
        FROM sessions s
        INNER JOIN users u ON u.id = s.user_id
        WHERE s.token = ?
        ''',
        (token,),
    ).fetchone()
    if row is None:
        return None
    expires_at = parse_iso(row['expires_at'])
    if expires_at is None or expires_at <= utc_now():
        connection.execute('DELETE FROM sessions WHERE token = ?', (token,))
        connection.commit()
        return None
    if int(row['active']) != 1:
        connection.execute('DELETE FROM sessions WHERE token = ?', (token,))
        connection.commit()
        return None
    return {
        'id': row['id'],
        'username': row['username'],
        'name': row['name'],
        'role': row['role'],
    }


def issue_session(connection: sqlite3.Connection, user_id: int, remember: bool) -> tuple[str, str]:
    token = secrets.token_urlsafe(32)
    expires = utc_now() + (timedelta(days=30) if remember else timedelta(days=1))
    expires_iso = expires.replace(microsecond=0).isoformat().replace('+00:00', 'Z')
    connection.execute(
        'INSERT INTO sessions (token, user_id, expires_at, remember, created_at) VALUES (?, ?, ?, ?, ?)',
        (token, user_id, expires_iso, 1 if remember else 0, iso_now()),
    )
    return token, expires_iso


def revoke_session(connection: sqlite3.Connection, token: str | None) -> None:
    if token:
        connection.execute('DELETE FROM sessions WHERE token = ?', (token,))


class RepairPortalHandler(SimpleHTTPRequestHandler):
    server_version = 'RepairPortal/1.0'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    def log_message(self, format: str, *args) -> None:  # noqa: A003
        return

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header('Allow', 'GET, POST, PATCH, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith('/api/'):
            self.handle_api_get(parsed.path)
            return
        if parsed.path == '/':
            self.serve_file('index.html')
            return
        self.serve_static(parsed.path)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith('/api/'):
            self.handle_api_post(parsed.path)
            return
        self.send_error(405)

    def do_PATCH(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith('/api/'):
            self.handle_api_patch(parsed.path)
            return
        self.send_error(405)

    def do_DELETE(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith('/api/'):
            self.handle_api_delete(parsed.path)
            return
        self.send_error(405)

    def serve_static(self, path: str) -> None:
        safe_path = path.lstrip('/')
        file_path = (BASE_DIR / safe_path).resolve()
        if not str(file_path).startswith(str(BASE_DIR)) or not file_path.exists() or not file_path.is_file():
            self.send_error(404)
            return
        self.serve_path(file_path)

    def serve_file(self, relative_path: str) -> None:
        file_path = BASE_DIR / relative_path
        if not file_path.exists():
            self.send_error(404)
            return
        self.serve_path(file_path)

    def serve_path(self, file_path: Path) -> None:
        content = file_path.read_bytes()
        self.send_response(200)
        self.send_header('Content-Type', mimetypes.guess_type(str(file_path))[0] or 'application/octet-stream')
        self.send_header('Content-Length', str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def cookie_value(self, name: str) -> str | None:
        header = self.headers.get('Cookie')
        if not header:
            return None
        jar = cookies.SimpleCookie()
        jar.load(header)
        morsel = jar.get(name)
        return morsel.value if morsel else None

    def set_cookie(self, name: str, value: str, expires: str | None = None, max_age: int | None = None) -> None:
        cookie = cookies.SimpleCookie()
        cookie[name] = value
        cookie[name]['path'] = '/'
        cookie[name]['httponly'] = True
        cookie[name]['samesite'] = 'Lax'
        if expires:
            cookie[name]['expires'] = expires
        if max_age is not None:
            cookie[name]['max-age'] = str(max_age)
        for morsel in cookie.values():
            self.send_header('Set-Cookie', morsel.OutputString())

    def clear_cookie(self, name: str) -> None:
        cookie = cookies.SimpleCookie()
        cookie[name] = ''
        cookie[name]['path'] = '/'
        cookie[name]['httponly'] = True
        cookie[name]['samesite'] = 'Lax'
        cookie[name]['max-age'] = '0'
        cookie[name]['expires'] = 'Thu, 01 Jan 1970 00:00:00 GMT'
        for morsel in cookie.values():
            self.send_header('Set-Cookie', morsel.OutputString())

    def read_json(self) -> dict:
        length = int(self.headers.get('Content-Length', '0'))
        if length <= 0:
            return {}
        raw = self.rfile.read(length).decode('utf-8')
        if not raw.strip():
            return {}
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            return {}
        return payload if isinstance(payload, dict) else {}

    def send_json(self, payload: dict, status: int = 200) -> None:
        data = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(data)

    def handle_api_get(self, path: str) -> None:
        connection = db()
        cleanup_sessions(connection)
        user = get_current_user(self, connection)

        if path == '/api/bootstrap':
            landing = get_setting(connection, 'landing_settings', DEFAULT_LANDING_SETTINGS)
            payload: dict = {
                'user': user,
                'landingSettings': landing,
            }
            if user and user['role'] == 'admin':
                payload['reportSettings'] = get_setting(connection, 'report_settings', DEFAULT_REPORT_SETTINGS)
                payload['adminNotificationCount'] = count_admin_notifications(connection)
            self.send_json(payload)
            connection.close()
            return

        if path == '/api/me':
            self.send_json({'user': user})
            connection.close()
            return

        if path == '/api/landing-settings':
            self.send_json({'landingSettings': get_setting(connection, 'landing_settings', DEFAULT_LANDING_SETTINGS)})
            connection.close()
            return

        if path == '/api/report-settings':
            if not self.require_admin(user):
                connection.close()
                return
            self.send_json({'reportSettings': get_setting(connection, 'report_settings', DEFAULT_REPORT_SETTINGS)})
            connection.close()
            return

        if path == '/api/users':
            if not self.require_admin(user):
                connection.close()
                return
            users = connection.execute(
                'SELECT username, name, role, active, created_at FROM users ORDER BY created_at ASC'
            ).fetchall()
            self.send_json({'users': [dict(row) for row in users]})
            connection.close()
            return

        if path == '/api/audit-logs':
            if not self.require_admin(user):
                connection.close()
                return
            self.send_json({'logs': fetch_audit_logs(connection)})
            connection.close()
            return

        if path == '/api/requests':
            if not user:
                self.send_json({'error': 'Unauthorized'}, status=401)
                connection.close()
                return
            rows = fetch_requests(connection, user)
            self.send_json({'requests': rows})
            connection.close()
            return

        if path == '/api/admin/notifications':
            if not self.require_admin(user):
                connection.close()
                return
            self.send_json({'count': count_admin_notifications(connection)})
            connection.close()
            return

        self.send_error(404)
        connection.close()

    def handle_api_post(self, path: str) -> None:
        connection = db()
        cleanup_sessions(connection)
        user = get_current_user(self, connection)
        payload = self.read_json()

        if path == '/api/migrate-legacy':
            migrated = migrate_legacy_payload(connection, payload)
            connection.commit()
            self.send_json({'ok': True, 'migrated': migrated})
            connection.close()
            return

        if path == '/api/admin/reset-db':
            if not self.require_admin(user):
                connection.close()
                return
            reset_database_data(connection)
            write_audit_log(
                connection,
                user,
                action='RESET_DATABASE',
                target='system',
                details='Database dikembalikan ke data awal.',
            )
            connection.commit()
            self.send_json({'ok': True})
            connection.close()
            return

        if path == '/api/users':
            if not self.require_admin(user):
                connection.close()
                return
            try:
                created = create_user(connection, payload, actor_user=user)
            except ValueError as error:
                self.send_json({'error': str(error)}, status=400)
                connection.close()
                return
            connection.commit()
            self.send_json({'user': created}, status=201)
            connection.close()
            return

        if path == '/api/login':
            username = str(payload.get('username', '')).strip().lower()
            password = str(payload.get('password', ''))
            remember = bool(payload.get('remember', False))
            row = connection.execute('SELECT * FROM users WHERE lower(username) = ?', (username,)).fetchone()
            if row is None or not verify_password(password, row['password_salt'], row['password_hash']):
                self.send_json({'error': 'Username atau password salah.'}, status=401)
                connection.close()
                return
            if int(row['active']) != 1:
                self.send_json({'error': 'Akun nonaktif. Hubungi admin.'}, status=403)
                connection.close()
                return
            token, _expires_iso = issue_session(connection, row['id'], remember)
            connection.commit()
            self.send_response(200)
            self.set_cookie(SESSION_COOKIE, token, max_age=30 * 24 * 60 * 60 if remember else None)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            body = json.dumps({'user': {'id': row['id'], 'username': row['username'], 'name': row['name'], 'role': row['role']}}).encode('utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            connection.close()
            return

        if path == '/api/logout':
            token = self.cookie_value(SESSION_COOKIE)
            revoke_session(connection, token)
            connection.commit()
            self.send_response(200)
            self.clear_cookie(SESSION_COOKIE)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            body = json.dumps({'ok': True}).encode('utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            connection.close()
            return

        if path == '/api/requests':
            if not user:
                self.send_json({'error': 'Unauthorized'}, status=401)
                connection.close()
                return
            try:
                created = create_request(connection, user, payload)
            except ValueError as error:
                self.send_json({'error': str(error)}, status=400)
                connection.close()
                return
            connection.commit()
            self.send_json({'request': created}, status=201)
            connection.close()
            return

        if path == '/api/admin/seen':
            if not self.require_admin(user):
                connection.close()
                return
            set_admin_seen_at(connection, iso_now())
            connection.commit()
            self.send_json({'ok': True})
            connection.close()
            return

        self.send_error(404)
        connection.close()

    def handle_api_patch(self, path: str) -> None:
        connection = db()
        cleanup_sessions(connection)
        user = get_current_user(self, connection)
        payload = self.read_json()

        if path == '/api/landing-settings':
            if not self.require_admin(user):
                connection.close()
                return
            landing = {
                'eyebrow': str(payload.get('eyebrow', DEFAULT_LANDING_SETTINGS['eyebrow'])).strip() or DEFAULT_LANDING_SETTINGS['eyebrow'],
                'title': str(payload.get('title', DEFAULT_LANDING_SETTINGS['title'])).strip() or DEFAULT_LANDING_SETTINGS['title'],
                'subtitle': str(payload.get('subtitle', DEFAULT_LANDING_SETTINGS['subtitle'])).strip() or DEFAULT_LANDING_SETTINGS['subtitle'],
                'theme': str(payload.get('theme', DEFAULT_LANDING_SETTINGS['theme'])).strip() if str(payload.get('theme', DEFAULT_LANDING_SETTINGS['theme'])).strip() in THEME_MAP else DEFAULT_LANDING_SETTINGS['theme'],
            }
            set_setting(connection, 'landing_settings', landing)
            connection.commit()
            self.send_json({'landingSettings': landing})
            connection.close()
            return

        if path == '/api/report-settings':
            if not self.require_admin(user):
                connection.close()
                return
            report = {
                'letterhead': str(payload.get('letterhead', DEFAULT_REPORT_SETTINGS['letterhead'])).strip() or DEFAULT_REPORT_SETTINGS['letterhead'],
                'signerName': str(payload.get('signerName', DEFAULT_REPORT_SETTINGS['signerName'])).strip() or DEFAULT_REPORT_SETTINGS['signerName'],
                'signerRole': str(payload.get('signerRole', DEFAULT_REPORT_SETTINGS['signerRole'])).strip() or DEFAULT_REPORT_SETTINGS['signerRole'],
                'signerId': str(payload.get('signerId', '')).strip(),
            }
            set_setting(connection, 'report_settings', report)
            connection.commit()
            self.send_json({'reportSettings': report})
            connection.close()
            return

        if path.startswith('/api/users/') and path.endswith('/password'):
            if not self.require_admin(user):
                connection.close()
                return
            username = unquote(path[len('/api/users/'):-len('/password')]).strip().lower().strip('/')
            try:
                updated = update_user_password(connection, username, str(payload.get('password', '')).strip(), actor_user=user)
            except ValueError as error:
                self.send_json({'error': str(error)}, status=400)
                connection.close()
                return
            connection.commit()
            self.send_json({'user': updated})
            connection.close()
            return

        if path.startswith('/api/users/'):
            if not self.require_admin(user):
                connection.close()
                return
            username = unquote(path[len('/api/users/'):]).strip().lower().strip('/')
            if not username:
                self.send_json({'error': 'Username tidak valid.'}, status=400)
                connection.close()
                return
            try:
                updated = set_user_active(connection, username, bool(payload.get('active', True)), actor_user=user)
            except ValueError as error:
                self.send_json({'error': str(error)}, status=400)
                connection.close()
                return
            connection.commit()
            self.send_json({'user': updated})
            connection.close()
            return

        if path.startswith('/api/requests/'):
            if not self.require_admin(user):
                connection.close()
                return
            request_id = path.rsplit('/', 1)[-1]
            updated = update_request(connection, request_id, payload, actor_user=user)
            if updated is None:
                self.send_json({'error': 'Not found'}, status=404)
                connection.close()
                return
            connection.commit()
            self.send_json({'request': updated})
            connection.close()
            return

        self.send_error(404)
        connection.close()

    def handle_api_delete(self, path: str) -> None:
        connection = db()
        cleanup_sessions(connection)
        user = get_current_user(self, connection)

        if path == '/api/logout':
            token = self.cookie_value(SESSION_COOKIE)
            revoke_session(connection, token)
            connection.commit()
            self.send_response(200)
            self.clear_cookie(SESSION_COOKIE)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            body = json.dumps({'ok': True}).encode('utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            connection.close()
            return

        if path.startswith('/api/users/'):
            if not self.require_admin(user):
                connection.close()
                return
            username = unquote(path[len('/api/users/'):]).strip().lower().strip('/')
            if not username:
                self.send_json({'error': 'Username tidak valid.'}, status=400)
                connection.close()
                return
            try:
                deleted = delete_user(connection, username, actor_user=user)
            except ValueError as error:
                self.send_json({'error': str(error)}, status=400)
                connection.close()
                return
            connection.commit()
            self.send_json({'ok': True, 'user': deleted})
            connection.close()
            return

        self.send_error(404)
        connection.close()

    def require_admin(self, user: dict | None) -> bool:
        if not user or user.get('role') != 'admin':
            self.send_json({'error': 'Forbidden'}, status=403)
            return False
        return True


def fetch_requests(connection: sqlite3.Connection, user: dict) -> list[dict]:
    if user['role'] == 'admin':
        rows = connection.execute(
            '''
            SELECT r.*, u.username
            FROM requests r
            INNER JOIN users u ON u.id = r.user_id
            ORDER BY r.created_at DESC
            '''
        ).fetchall()
    else:
        rows = connection.execute(
            '''
            SELECT r.*, u.username
            FROM requests r
            INNER JOIN users u ON u.id = r.user_id
            WHERE u.id = ?
            ORDER BY r.created_at DESC
            ''',
            (user['id'],),
        ).fetchall()
    return [normalize_request_row(row) for row in rows]


def normalize_request_row(row: sqlite3.Row) -> dict:
    return {
        'id': row['id'],
        'username': row['username'],
        'name': row['name'],
        'unit': row['unit'],
        'title': row['title'],
        'category': row['category'],
        'location': row['location'],
        'priority': row['priority'],
        'description': row['description'],
        'status': row['status'],
        'note': row['note'],
        'processReason': row['process_reason'],
        'createdAt': row['created_at'],
        'updatedAt': row['updated_at'],
    }


def create_request(connection: sqlite3.Connection, user: dict, payload: dict) -> dict:
    required = ['title', 'category', 'location', 'unit', 'priority', 'description']
    for key in required:
        if not str(payload.get(key, '')).strip():
            raise ValueError(f'Missing field: {key}')

    request = {
        'id': payload.get('id') or generate_request_id(connection),
        'user_id': user['id'],
        'name': user['name'],
        'unit': str(payload['unit']).strip(),
        'title': str(payload['title']).strip(),
        'category': str(payload['category']).strip(),
        'location': str(payload['location']).strip(),
        'priority': str(payload['priority']).strip(),
        'description': str(payload['description']).strip(),
        'status': 'Diajukan',
        'note': '',
        'process_reason': '',
        'created_at': iso_now(),
        'updated_at': iso_now(),
    }

    connection.execute(
        '''
        INSERT INTO requests (
            id, user_id, name, unit, title, category, location, priority,
            description, status, note, process_reason, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''',
        (
            request['id'],
            request['user_id'],
            request['name'],
            request['unit'],
            request['title'],
            request['category'],
            request['location'],
            request['priority'],
            request['description'],
            request['status'],
            request['note'],
            request['process_reason'],
            request['created_at'],
            request['updated_at'],
        ),
    )
    return {
        'id': request['id'],
        'username': user['username'],
        'name': request['name'],
        'unit': request['unit'],
        'title': request['title'],
        'category': request['category'],
        'location': request['location'],
        'priority': request['priority'],
        'description': request['description'],
        'status': request['status'],
        'note': request['note'],
        'processReason': request['process_reason'],
        'createdAt': request['created_at'],
        'updatedAt': request['updated_at'],
    }


def migrate_legacy_payload(connection: sqlite3.Connection, payload: dict) -> dict:
    users_payload = payload.get('users') if isinstance(payload.get('users'), list) else []
    requests_payload = payload.get('requests') if isinstance(payload.get('requests'), list) else []
    landing_settings = payload.get('landingSettings') if isinstance(payload.get('landingSettings'), dict) else None
    report_settings = payload.get('reportSettings') if isinstance(payload.get('reportSettings'), dict) else None
    admin_seen_at = str(payload.get('adminSeenAt', '')).strip()

    connection.execute('DELETE FROM sessions')
    connection.execute('DELETE FROM requests')
    connection.execute('DELETE FROM users')

    user_map: dict[str, int] = {}
    now = iso_now()
    for item in users_payload:
        if not isinstance(item, dict):
            continue
        username = str(item.get('username', '')).strip().lower()
        name = str(item.get('name', '')).strip()
        role = str(item.get('role', 'user')).strip()
        if not username or not name or role not in {'admin', 'user'}:
            continue

        password_salt = str(item.get('password_salt', '')).strip()
        password_hash = str(item.get('password_hash', '')).strip()
        plain_password = str(item.get('password', '')).strip()

        if not password_salt or not password_hash:
            if plain_password:
                password_salt, password_hash = hash_password(plain_password)
            else:
                password_salt, password_hash = hash_password('User123!')

        connection.execute(
            '''
            INSERT INTO users (username, name, role, password_salt, password_hash, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ''',
            (username, name, role, password_salt, password_hash, now),
        )
        user_map[username] = connection.execute('SELECT id FROM users WHERE username = ?', (username,)).fetchone()['id']

    if not user_map:
        seed_users(connection.cursor())
        rows = connection.execute('SELECT id, username FROM users').fetchall()
        user_map = {row['username']: row['id'] for row in rows}

    for item in requests_payload:
        if not isinstance(item, dict):
            continue
        username = str(item.get('username', item.get('user', 'user'))).strip().lower()
        user_id = user_map.get(username)
        if user_id is None:
            continue

        request_id = str(item.get('id', '')).strip() or generate_request_id(connection)
        connection.execute(
            '''
            INSERT INTO requests (
                id, user_id, name, unit, title, category, location, priority,
                description, status, note, process_reason, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''',
            (
                request_id,
                user_id,
                str(item.get('name', '')).strip() or 'User',
                str(item.get('unit', '')).strip() or 'Umum',
                str(item.get('title', '')).strip(),
                str(item.get('category', '')).strip(),
                str(item.get('location', '')).strip(),
                str(item.get('priority', 'Sedang')).strip(),
                str(item.get('description', '')).strip(),
                str(item.get('status', 'Diajukan')).strip(),
                str(item.get('note', '')).strip(),
                str(item.get('processReason', item.get('process_reason', ''))).strip(),
                str(item.get('createdAt', item.get('created_at', now))).strip(),
                str(item.get('updatedAt', item.get('updated_at', now))).strip(),
            ),
        )

    if landing_settings:
        merged_landing = DEFAULT_LANDING_SETTINGS.copy()
        merged_landing.update({k: v for k, v in landing_settings.items() if k in merged_landing})
        if merged_landing['theme'] not in THEME_MAP:
            merged_landing['theme'] = DEFAULT_THEME
        set_setting(connection, 'landing_settings', merged_landing)

    if report_settings:
        merged_report = DEFAULT_REPORT_SETTINGS.copy()
        merged_report.update({k: v for k, v in report_settings.items() if k in merged_report})
        set_setting(connection, 'report_settings', merged_report)

    if admin_seen_at:
        set_admin_seen_at(connection, admin_seen_at)

    return {
        'users': len(users_payload),
        'requests': len(requests_payload),
        'landingSettings': bool(landing_settings),
        'reportSettings': bool(report_settings),
    }


def update_request(connection: sqlite3.Connection, request_id: str, payload: dict, actor_user: dict | None = None) -> dict | None:
    row = connection.execute(
        '''
        SELECT r.*, u.username
        FROM requests r
        INNER JOIN users u ON u.id = r.user_id
        WHERE r.id = ?
        ''',
        (request_id,),
    ).fetchone()
    if row is None:
        return None

    status = str(payload.get('status', row['status'])).strip()
    if status not in STATUS_VALUES:
        status = row['status']

    note = str(payload.get('note', row['note'])).strip()
    process_reason = str(payload.get('processReason', row['process_reason'])).strip()

    connection.execute(
        '''
        UPDATE requests
        SET status = ?, note = ?, process_reason = ?, updated_at = ?
        WHERE id = ?
        ''',
        (status, note, process_reason, iso_now(), request_id),
    )

    if actor_user and (status != row['status'] or note != row['note'] or process_reason != row['process_reason']):
        write_audit_log(
            connection,
            actor_user,
            action='UPDATE_REQUEST',
            target=request_id,
            details=f"status:{row['status']}->{status}; reason_len:{len(process_reason)}",
        )

    updated = connection.execute(
        '''
        SELECT r.*, u.username
        FROM requests r
        INNER JOIN users u ON u.id = r.user_id
        WHERE r.id = ?
        ''',
        (request_id,),
    ).fetchone()
    return normalize_request_row(updated)


def create_user(connection: sqlite3.Connection, payload: dict, actor_user: dict | None = None) -> dict:
    username = str(payload.get('username', '')).strip().lower()
    name = str(payload.get('name', '')).strip()
    role = str(payload.get('role', 'user')).strip().lower()
    password = str(payload.get('password', '')).strip()

    if not validate_username(username):
        raise ValueError('Username hanya boleh huruf kecil, angka, titik, strip, dan underscore (3-40 karakter).')
    if len(name) < 3:
        raise ValueError('Nama minimal 3 karakter.')
    if role not in {'admin', 'user'}:
        raise ValueError('Role tidak valid.')
    password_error = validate_password_strength(password)
    if password_error:
        raise ValueError(password_error)

    exists = connection.execute('SELECT id FROM users WHERE username = ?', (username,)).fetchone()
    if exists:
        raise ValueError('Username sudah digunakan.')

    salt_hex, hash_hex = hash_password(password)
    created_at = iso_now()
    connection.execute(
        'INSERT INTO users (username, name, role, active, password_salt, password_hash, created_at) VALUES (?, ?, ?, 1, ?, ?, ?)',
        (username, name, role, salt_hex, hash_hex, created_at),
    )
    if actor_user:
        write_audit_log(
            connection,
            actor_user,
            action='CREATE_USER',
            target=username,
            details=f'role={role}',
        )
    return {
        'username': username,
        'name': name,
        'role': role,
        'active': 1,
        'created_at': created_at,
    }


def update_user_password(connection: sqlite3.Connection, username: str, new_password: str, actor_user: dict) -> dict:
    if not validate_username(username):
        raise ValueError('Username tidak valid.')
    password_error = validate_password_strength(new_password)
    if password_error:
        raise ValueError(password_error)

    row = connection.execute(
        'SELECT username, name, role, active, created_at FROM users WHERE username = ?',
        (username,),
    ).fetchone()
    if row is None:
        raise ValueError('Pengguna tidak ditemukan.')

    salt_hex, hash_hex = hash_password(new_password)
    connection.execute(
        'UPDATE users SET password_salt = ?, password_hash = ? WHERE username = ?',
        (salt_hex, hash_hex, username),
    )
    write_audit_log(connection, actor_user, action='RESET_PASSWORD', target=username, details='Password diubah oleh admin.')

    return {
        'username': row['username'],
        'name': row['name'],
        'role': row['role'],
        'active': row['active'],
        'created_at': row['created_at'],
    }


def set_user_active(connection: sqlite3.Connection, username: str, active: bool, actor_user: dict) -> dict:
    if not validate_username(username):
        raise ValueError('Username tidak valid.')

    row = connection.execute(
        'SELECT id, username, name, role, active, created_at FROM users WHERE username = ?',
        (username,),
    ).fetchone()
    if row is None:
        raise ValueError('Pengguna tidak ditemukan.')

    desired = 1 if active else 0
    current = int(row['active'])
    if current == desired:
        return {
            'username': row['username'],
            'name': row['name'],
            'role': row['role'],
            'active': current,
            'created_at': row['created_at'],
        }

    if row['username'] == actor_user['username'] and desired == 0:
        raise ValueError('Admin tidak bisa menonaktifkan akun sendiri.')

    if row['role'] == 'admin' and desired == 0:
        remaining_admin = connection.execute(
            "SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND active = 1 AND username != ?",
            (username,),
        ).fetchone()
        if int(remaining_admin['total']) < 1:
            raise ValueError('Minimal harus ada satu admin aktif.')

    connection.execute('UPDATE users SET active = ? WHERE username = ?', (desired, username))
    write_audit_log(
        connection,
        actor_user,
        action='SET_USER_ACTIVE',
        target=username,
        details=f'active={desired}',
    )

    return {
        'username': row['username'],
        'name': row['name'],
        'role': row['role'],
        'active': desired,
        'created_at': row['created_at'],
    }


def delete_user(connection: sqlite3.Connection, username: str, actor_user: dict) -> dict:
    if not validate_username(username):
        raise ValueError('Username tidak valid.')

    row = connection.execute(
        'SELECT id, username, name, role, active, created_at FROM users WHERE username = ?',
        (username,),
    ).fetchone()
    if row is None:
        raise ValueError('Pengguna tidak ditemukan.')

    if row['username'] == actor_user['username']:
        raise ValueError('Admin tidak bisa menghapus akun sendiri.')

    if row['role'] == 'admin' and int(row['active']) == 1:
        remaining_admin = connection.execute(
            "SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND active = 1 AND username != ?",
            (username,),
        ).fetchone()
        if int(remaining_admin['total']) < 1:
            raise ValueError('Minimal harus ada satu admin aktif.')

    request_count = connection.execute(
        'SELECT COUNT(*) AS total FROM requests WHERE user_id = ?',
        (row['id'],),
    ).fetchone()
    if int(request_count['total']) > 0:
        raise ValueError('Pengguna punya riwayat pengajuan. Nonaktifkan akun saja agar data tetap aman.')

    connection.execute('DELETE FROM sessions WHERE user_id = ?', (row['id'],))
    connection.execute('DELETE FROM users WHERE id = ?', (row['id'],))
    write_audit_log(
        connection,
        actor_user,
        action='DELETE_USER',
        target=username,
        details='Akun pengguna dihapus permanen.',
    )

    return {
        'username': row['username'],
        'name': row['name'],
        'role': row['role'],
        'active': row['active'],
        'created_at': row['created_at'],
    }


def fetch_audit_logs(connection: sqlite3.Connection, limit: int = 100) -> list[dict]:
    rows = connection.execute(
        '''
        SELECT id, actor_username, action, target, details, created_at
        FROM audit_logs
        ORDER BY id DESC
        LIMIT ?
        ''',
        (limit,),
    ).fetchall()
    return [dict(row) for row in rows]


def write_audit_log(
    connection: sqlite3.Connection,
    actor_user: dict | None,
    action: str,
    target: str = '',
    details: str = '',
) -> None:
    actor_id = actor_user.get('id') if actor_user else None
    actor_username = actor_user.get('username', 'system') if actor_user else 'system'
    connection.execute(
        '''
        INSERT INTO audit_logs (actor_user_id, actor_username, action, target, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ''',
        (actor_id, actor_username, action, target, details, iso_now()),
    )


def reset_database_data(connection: sqlite3.Connection) -> None:
    connection.execute('DELETE FROM sessions')
    connection.execute('DELETE FROM requests')
    connection.execute('DELETE FROM users')
    connection.execute('DELETE FROM settings')

    cursor = connection.cursor()
    seed_users(cursor)
    seed_settings(cursor)
    seed_requests(cursor)


def generate_request_id(connection: sqlite3.Connection) -> str:
    today = utc_now().strftime('%Y%m%d')
    row = connection.execute("SELECT COUNT(*) AS total FROM requests WHERE created_at LIKE ?", (f'{today}%',)).fetchone()
    counter = int(row['total']) + 1
    return f'PR-{today}-{counter:03d}'


def count_admin_notifications(connection: sqlite3.Connection) -> int:
    seen_at = get_admin_seen_at(connection)
    rows = connection.execute(
        '''
        SELECT COUNT(*) AS total
        FROM requests
        WHERE status = 'Diajukan' AND created_at > ?
        ''',
        (seen_at.replace(microsecond=0).isoformat().replace('+00:00', 'Z'),),
    ).fetchone()
    return int(rows['total'])


def ensure_backup_dir() -> None:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)


def daily_backup_path(now: datetime | None = None) -> Path:
    current = now or datetime.now()
    return BACKUP_DIR / f'repair-portal-{current.strftime("%Y%m%d")}.db'


def create_db_backup(backup_path: Path) -> None:
    backup_path.parent.mkdir(parents=True, exist_ok=True)
    source = sqlite3.connect(DB_PATH)
    destination = sqlite3.connect(backup_path)
    try:
        source.backup(destination)
    finally:
        destination.close()
        source.close()


def prune_old_backups(retention_days: int) -> None:
    if retention_days < 1:
        return

    threshold = datetime.now() - timedelta(days=retention_days)
    for file_path in BACKUP_DIR.glob('repair-portal-*.db'):
        try:
            modified_at = datetime.fromtimestamp(file_path.stat().st_mtime)
            if modified_at < threshold:
                file_path.unlink(missing_ok=True)
        except OSError:
            continue


def run_daily_backup_cycle() -> None:
    ensure_backup_dir()

    today_backup = daily_backup_path()
    if not today_backup.exists():
        create_db_backup(today_backup)
        print(f'[backup] Created daily backup: {today_backup.name}')

    prune_old_backups(BACKUP_RETENTION_DAYS)


def backup_worker() -> None:
    while True:
        try:
            run_daily_backup_cycle()
        except Exception as error:  # noqa: BLE001
            print(f'[backup] Error during backup cycle: {error}')
        time.sleep(BACKUP_CHECK_INTERVAL_SECONDS)


def start_backup_scheduler() -> None:
    worker = threading.Thread(target=backup_worker, name='daily-backup-worker', daemon=True)
    worker.start()


def main() -> None:
    init_db()
    start_backup_scheduler()
    host = os.environ.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', '8000'))
    try:
        server = ThreadingHTTPServer((host, port), RepairPortalHandler)
    except OSError as error:
        if host != '0.0.0.0':
            fallback_host = '0.0.0.0'
            print(f'[network] Gagal bind ke {host}:{port} ({error}). Fallback ke {fallback_host}:{port}.')
            host = fallback_host
            server = ThreadingHTTPServer((host, port), RepairPortalHandler)
        else:
            raise
    print(f'Serving on http://{host}:{port}')
    server.serve_forever()


if __name__ == '__main__':
    main()
