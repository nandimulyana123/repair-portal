const STORAGE_KEYS = {
  users: 'rrp-users',
  requests: 'rrp-requests',
  session: 'rrp-session',
  adminSeenAt: 'rrp-admin-seen-at',
  landingSettings: 'rrp-landing-settings',
  reportSettings: 'rrp-report-settings',
};

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 30000;

const STATUS_ORDER = ['Diajukan', 'Diproses', 'Selesai', 'Ditolak'];
const DEFAULT_MONTH = new Date().toISOString().slice(0, 7);
const DEFAULT_REPORT_SETTINGS = {
  letterhead: 'Nama Instansi / Rumah Sakit\nAlamat instansi / rumah sakit\nKota, Provinsi',
  signerName: 'Nama Penanda Tangan',
  signerRole: 'Jabatan Penanda Tangan',
  signerId: '',
};
const DEFAULT_LANDING_SETTINGS = {
  eyebrow: 'Localhost App',
  title: 'Portal Pengajuan Perbaikan',
  subtitle: 'Aplikasi lokal untuk user mengajukan perbaikan dan admin merekap laporan bulanan.',
  theme: 'teal',
};
const LANDING_THEME_MAP = {
  teal: {
    accent: '#7dd3fc',
    accentStrong: '#38bdf8',
    hero: 'linear-gradient(160deg, rgba(13, 24, 43, 0.95), rgba(8, 15, 29, 0.78))',
  },
  blue: {
    accent: '#93c5fd',
    accentStrong: '#60a5fa',
    hero: 'linear-gradient(160deg, rgba(9, 20, 44, 0.96), rgba(6, 12, 27, 0.82))',
  },
  green: {
    accent: '#86efac',
    accentStrong: '#34d399',
    hero: 'linear-gradient(160deg, rgba(8, 29, 27, 0.96), rgba(7, 16, 20, 0.82))',
  },
  amber: {
    accent: '#fcd34d',
    accentStrong: '#f59e0b',
    hero: 'linear-gradient(160deg, rgba(33, 23, 7, 0.96), rgba(18, 12, 6, 0.82))',
  },
};

const defaultUsers = [
  {
    username: 'admin',
    password: 'Admin123!',
    role: 'admin',
    name: 'Administrator',
  },
  {
    username: 'user',
    password: 'User123!',
    role: 'user',
    name: 'User Demo',
  },
];

const sampleRequests = [
  {
    id: 'PR-2026-004',
    user: 'user',
    name: 'User Demo',
    unit: 'Operasional',
    title: 'Lampu ruang rapat mati',
    category: 'Elektrikal',
    location: 'Lantai 2 - Ruang Rapat',
    priority: 'Tinggi',
    description: 'Lampu utama tidak menyala saat ruangan digunakan.',
    status: 'Selesai',
    note: 'Sudah diganti ballast dan lampu baru.',
    createdAt: '2026-04-02T09:00:00.000Z',
    updatedAt: '2026-04-03T14:30:00.000Z',
  },
  {
    id: 'PR-2026-005',
    user: 'user',
    name: 'User Demo',
    unit: 'Finance',
    title: 'AC ruang finance kurang dingin',
    category: 'AC & Pendingin',
    location: 'Lantai 1 - Finance',
    priority: 'Sedang',
    description: 'Udara dari AC sudah tidak terlalu dingin sejak seminggu terakhir.',
    status: 'Diproses',
    note: 'Teknisi dijadwalkan hari ini.',
    processReason: 'Menunggu teknisi datang dan pengecekan freon.',
    createdAt: '2026-04-10T10:15:00.000Z',
    updatedAt: '2026-04-12T11:20:00.000Z',
  },
  {
    id: 'PR-2026-006',
    user: 'admin',
    name: 'Administrator',
    unit: 'IT Support',
    title: 'Perbaikan jaringan printer',
    category: 'Jaringan & IT',
    location: 'Lantai 3 - Area Admin',
    priority: 'Rendah',
    description: 'Printer tidak terdeteksi di beberapa komputer kantor.',
    status: 'Diajukan',
    note: '',
    processReason: '',
    createdAt: '2026-04-13T08:40:00.000Z',
    updatedAt: '2026-04-13T08:40:00.000Z',
  },
];

const state = {
  users: [],
  requests: [],
  session: null,
  reportSettings: { ...DEFAULT_REPORT_SETTINGS },
  landingSettings: { ...DEFAULT_LANDING_SETTINGS },
  adminSeenAt: 0,
  lastAdminNotifCount: 0,
  loginAttempts: 0,
  loginLockUntil: 0,
};

const els = {};

document.addEventListener('DOMContentLoaded', () => {
  bindElements();
  seedStorage();
  loadState();
  bindEvents();
  renderApp();
});

function bindElements() {
  const ids = [
    'loginPage',
    'appPage',
    'loginForm',
    'loginUsername',
    'loginPassword',
    'togglePasswordBtn',
    'rememberSession',
    'quickAdminBtn',
    'quickUserBtn',
    'loginHint',
    'loginError',
    'logoutBtn',
    'requestTabBtn',
    'adminTabBtn',
    'adminNotifBadge',
    'adminNewAlert',
    'adminNewCount',
    'markAdminSeenBtn',
    'requestForm',
    'requestTitle',
    'requestCategory',
    'requestLocation',
    'requestUnit',
    'requestPriority',
    'requestDescription',
    'myRequestsTable',
    'myRequestCount',
    'adminRequestsTable',
    'adminStatusFilter',
    'adminMonthFilter',
    'adminSearch',
    'recapMonth',
    'recapTable',
    'recapTotal',
    'recapPending',
    'recapDone',
    'recapResolution',
    'categoryBreakdown',
    'recapCountBadge',
    'exportPdfBtn',
    'statTotal',
    'statPending',
    'statProgress',
    'statDone',
    'recentSummary',
    'latestTimeline',
    'currentMonthBadge',
    'toast',
    'adminReportForm',
    'landingSettingsForm',
    'landingEyebrow',
    'landingTitle',
    'landingSubtitle',
    'landingEyebrowInput',
    'landingTitleInput',
    'landingSubtitleInput',
    'landingThemeInput',
    'reportLetterhead',
    'reportSignerName',
    'reportSignerRole',
    'reportSignerId',
  ];

  ids.forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function seedStorage() {
  if (!localStorage.getItem(STORAGE_KEYS.users)) {
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(defaultUsers));
  }

  if (!localStorage.getItem(STORAGE_KEYS.requests)) {
    localStorage.setItem(STORAGE_KEYS.requests, JSON.stringify(sampleRequests));
  }

}

function loadState() {
  state.users = readStorage(STORAGE_KEYS.users, []);
  state.requests = normalizeRequests(readStorage(STORAGE_KEYS.requests, []));
  state.session = readSession();
  state.adminSeenAt = Number(localStorage.getItem(STORAGE_KEYS.adminSeenAt) || 0);
  state.landingSettings = readLandingSettings();
  state.reportSettings = readReportSettings();
}

function normalizeRequests(requests) {
  return requests.map((request) => ({
    ...request,
    unit: request.unit || 'Umum',
    processReason: request.processReason || '',
  }));
}

function bindEvents() {
  els.loginForm.addEventListener('submit', handleLogin);
  els.togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
  els.logoutBtn.addEventListener('click', handleLogout);
  els.markAdminSeenBtn.addEventListener('click', markAdminSeen);
  els.landingSettingsForm.addEventListener('submit', handleSaveLandingSettings);
  els.adminReportForm.addEventListener('submit', handleSaveReportSettings);
  els.requestForm.addEventListener('submit', handleRequestSubmit);
  els.adminStatusFilter.addEventListener('change', renderAdminTable);
  els.adminMonthFilter.addEventListener('change', renderAdminTable);
  els.adminSearch.addEventListener('input', renderAdminTable);
  els.recapMonth.addEventListener('change', renderRecap);
  els.exportPdfBtn.addEventListener('click', exportMonthlyPdf);

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      switchSection(target);
      document.querySelectorAll('.tab-btn').forEach((tab) => tab.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

function readStorage(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function readLandingSettings() {
  const saved = readStorage(STORAGE_KEYS.landingSettings, null);
  return {
    ...DEFAULT_LANDING_SETTINGS,
    ...(saved || {}),
  };
}

function writeLandingSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.landingSettings, JSON.stringify(settings));
}

function readReportSettings() {
  const saved = readStorage(STORAGE_KEYS.reportSettings, null);
  return {
    ...DEFAULT_REPORT_SETTINGS,
    ...(saved || {}),
  };
}

function writeReportSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.reportSettings, JSON.stringify(settings));
}

function readSession() {
  const persistent = readStorage(STORAGE_KEYS.session, null);
  if (persistent) {
    return persistent;
  }

  const sessionRaw = sessionStorage.getItem(STORAGE_KEYS.session);
  if (!sessionRaw) {
    return null;
  }

  try {
    return JSON.parse(sessionRaw);
  } catch {
    return null;
  }
}

function writeSession(session, remember) {
  const data = JSON.stringify(session);
  if (remember) {
    localStorage.setItem(STORAGE_KEYS.session, data);
    sessionStorage.removeItem(STORAGE_KEYS.session);
    return;
  }

  sessionStorage.setItem(STORAGE_KEYS.session, data);
  localStorage.removeItem(STORAGE_KEYS.session);
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.session);
  sessionStorage.removeItem(STORAGE_KEYS.session);
}

function togglePasswordVisibility() {
  const isHidden = els.loginPassword.type === 'password';
  els.loginPassword.type = isHidden ? 'text' : 'password';
  els.togglePasswordBtn.textContent = isHidden ? 'Sembunyi' : 'Lihat';
}

function handleLogin(event) {
  event.preventDefault();
  const now = Date.now();
  if (now < state.loginLockUntil) {
    const seconds = Math.ceil((state.loginLockUntil - now) / 1000);
    els.loginError.textContent = `Terlalu banyak percobaan login. Coba lagi dalam ${seconds} detik.`;
    return;
  }

  const username = els.loginUsername.value.trim().toLowerCase();
  const password = els.loginPassword.value;
  if (!username || !password) {
    els.loginError.textContent = 'Nama pengguna dan kata sandi wajib diisi.';
    return;
  }

  const user = state.users.find((item) => item.username.toLowerCase() === username && item.password === password);

  if (!user) {
    state.loginAttempts += 1;
    const remaining = MAX_LOGIN_ATTEMPTS - state.loginAttempts;
    if (remaining <= 0) {
      state.loginAttempts = 0;
      state.loginLockUntil = Date.now() + LOGIN_LOCK_MS;
      els.loginError.textContent = 'Akun dikunci sementara 30 detik karena terlalu banyak percobaan gagal.';
      return;
    }

    els.loginError.textContent = `Username atau password salah. Sisa percobaan: ${remaining}.`;
    return;
  }

  state.loginAttempts = 0;
  state.loginLockUntil = 0;
  state.session = {
    username: user.username,
    name: user.name,
    role: user.role === 'admin' ? 'admin' : 'user',
  };
  writeSession(state.session, els.rememberSession.checked);
  els.loginError.textContent = '';
  renderApp();
  switchSection('dashboardSection');
  highlightTab('dashboardSection');
}

function handleLogout() {
  state.session = null;
  clearSession();
  els.loginPassword.type = 'password';
  els.togglePasswordBtn.textContent = 'Lihat';
  renderApp();
}

function handleRequestSubmit(event) {
  event.preventDefault();
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return;
  }

  const now = new Date();
  const request = {
    id: buildRequestId(now),
    user: currentUser.username,
    name: currentUser.name,
    unit: els.requestUnit.value.trim(),
    title: els.requestTitle.value.trim(),
    category: els.requestCategory.value,
    location: els.requestLocation.value.trim(),
    priority: els.requestPriority.value,
    description: els.requestDescription.value.trim(),
    status: 'Diajukan',
    note: '',
    processReason: '',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  state.requests.unshift(request);
  writeStorage(STORAGE_KEYS.requests, state.requests);
  event.target.reset();
  els.requestPriority.value = 'Sedang';
  renderApp();
  switchSection('dashboardSection');
  highlightTab('dashboardSection');
}

function renderApp() {
  const user = getCurrentUser();
  const hasSession = Boolean(user);

  applyLandingTheme();
  renderLandingCopy();

  els.loginPage.classList.toggle('hidden', hasSession);
  els.appPage.classList.toggle('hidden', !hasSession);

  if (!hasSession) {
    els.loginHint.textContent = 'Tips: gunakan tombol isi akun untuk login cepat.';
    state.lastAdminNotifCount = 0;
    return;
  }

  const isAdmin = isAdminUser(user);
  els.adminTabBtn.classList.toggle('hidden', !isAdmin);
  els.adminTabBtn.style.display = isAdmin ? 'inline-flex' : 'none';
  els.requestTabBtn.classList.toggle('hidden', isAdmin);
  els.requestTabBtn.style.display = isAdmin ? 'none' : 'inline-flex';
  els.exportPdfBtn.classList.toggle('hidden', !isAdmin);
  els.exportPdfBtn.style.display = isAdmin ? 'inline-flex' : 'none';
  if (!isAdmin) {
    const adminSectionVisible = !document.getElementById('adminSection').classList.contains('hidden');
    if (adminSectionVisible) {
      switchSection('dashboardSection');
      highlightTab('dashboardSection');
    }
  } else {
    const requestSectionVisible = !document.getElementById('requestSection').classList.contains('hidden');
    if (requestSectionVisible) {
      switchSection('dashboardSection');
      highlightTab('dashboardSection');
    }
  }

  const month = DEFAULT_MONTH;
  els.adminMonthFilter.value ||= month;
  els.recapMonth.value ||= month;
  els.currentMonthBadge.textContent = formatMonthLabel(month);

  renderStats();
  renderSummary();
  renderTimeline();
  renderMyRequests();
  renderAdminTable();
  renderRecap();
  renderAdminNotification();
  renderLandingSettings();
  renderReportSettings();
}

function renderLandingCopy() {
  els.landingEyebrow.textContent = state.landingSettings.eyebrow;
  els.landingTitle.textContent = state.landingSettings.title;
  els.landingSubtitle.textContent = state.landingSettings.subtitle;
}

function renderLandingSettings() {
  if (!els.landingSettingsForm) {
    return;
  }

  els.landingEyebrowInput.value = state.landingSettings.eyebrow;
  els.landingTitleInput.value = state.landingSettings.title;
  els.landingSubtitleInput.value = state.landingSettings.subtitle;
  els.landingThemeInput.value = state.landingSettings.theme;
}

function handleSaveLandingSettings(event) {
  event.preventDefault();
  if (!isAdminUser(getCurrentUser())) {
    return;
  }

  state.landingSettings = {
    eyebrow: els.landingEyebrowInput.value.trim() || DEFAULT_LANDING_SETTINGS.eyebrow,
    title: els.landingTitleInput.value.trim() || DEFAULT_LANDING_SETTINGS.title,
    subtitle: els.landingSubtitleInput.value.trim() || DEFAULT_LANDING_SETTINGS.subtitle,
    theme: LANDING_THEME_MAP[els.landingThemeInput.value] ? els.landingThemeInput.value : DEFAULT_LANDING_SETTINGS.theme,
  };
  writeLandingSettings(state.landingSettings);
  renderApp();
  toast('Tampilan halaman depan sudah disimpan.');
}

function applyLandingTheme() {
  const theme = LANDING_THEME_MAP[state.landingSettings.theme] || LANDING_THEME_MAP.teal;
  document.documentElement.style.setProperty('--accent', theme.accent);
  document.documentElement.style.setProperty('--accent-strong', theme.accentStrong);
  document.documentElement.style.setProperty('--login-panel-bg', theme.hero);
}

function renderReportSettings() {
  if (!els.reportLetterhead) {
    return;
  }

  els.reportLetterhead.value = state.reportSettings.letterhead;
  els.reportSignerName.value = state.reportSettings.signerName;
  els.reportSignerRole.value = state.reportSettings.signerRole;
  els.reportSignerId.value = state.reportSettings.signerId;
}

function handleSaveReportSettings(event) {
  event.preventDefault();
  state.reportSettings = {
    letterhead: els.reportLetterhead.value.trim() || DEFAULT_REPORT_SETTINGS.letterhead,
    signerName: els.reportSignerName.value.trim() || DEFAULT_REPORT_SETTINGS.signerName,
    signerRole: els.reportSignerRole.value.trim() || DEFAULT_REPORT_SETTINGS.signerRole,
    signerId: els.reportSignerId.value.trim(),
  };
  writeReportSettings(state.reportSettings);
  toast('Pengaturan laporan PDF sudah disimpan.');
}

function getNewAdminRequestCount() {
  return state.requests.filter((request) => {
    const createdAt = new Date(request.createdAt).getTime();
    return request.status === 'Diajukan' && createdAt > state.adminSeenAt;
  }).length;
}

function renderAdminNotification() {
  const user = getCurrentUser();
  if (!isAdminUser(user)) {
    state.lastAdminNotifCount = 0;
    els.adminNotifBadge.classList.add('hidden');
    els.adminNewAlert.classList.add('hidden');
    return;
  }

  const count = getNewAdminRequestCount();
  if (count > state.lastAdminNotifCount) {
    toast(`Ada ${count} permintaan perbaikan baru.`);
  }
  state.lastAdminNotifCount = count;
  els.adminNotifBadge.textContent = String(count);
  els.adminNewCount.textContent = String(count);
  els.adminNotifBadge.classList.toggle('hidden', count < 1);
  els.adminNewAlert.classList.toggle('hidden', count < 1);
}

function markAdminSeen() {
  const user = getCurrentUser();
  if (!isAdminUser(user)) {
    return;
  }

  state.adminSeenAt = Date.now();
  localStorage.setItem(STORAGE_KEYS.adminSeenAt, String(state.adminSeenAt));
  renderAdminNotification();
}

function getCurrentUser() {
  if (!state.session) {
    return null;
  }

  return state.users.find((user) => user.username === state.session.username) || state.session;
}

function switchSection(sectionId) {
  ['dashboardSection', 'requestSection', 'adminSection', 'recapSection'].forEach((section) => {
    const element = document.getElementById(section);
    const shouldShow = section === sectionId;
    if (element) {
      const isAdminSection = section === 'adminSection';
      const user = getCurrentUser();
      element.classList.toggle('hidden', !shouldShow || (isAdminSection && !isAdminUser(user)));
    }
  });
}

function highlightTab(sectionId) {
  document.querySelectorAll('.tab-btn').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.target === sectionId);
  });
}

function renderStats() {
  const user = getCurrentUser();
  const relevantRequests = user?.role === 'admin'
    ? state.requests
    : state.requests.filter((request) => request.user === user.username);

  els.statTotal.textContent = relevantRequests.length;
  els.statPending.textContent = relevantRequests.filter((request) => request.status === 'Diajukan').length;
  els.statProgress.textContent = relevantRequests.filter((request) => request.status === 'Diproses').length;
  els.statDone.textContent = relevantRequests.filter((request) => request.status === 'Selesai').length;
}

function renderSummary() {
  const user = getCurrentUser();
  const relevantRequests = user?.role === 'admin'
    ? state.requests
    : state.requests.filter((request) => request.user === user.username);

  const urgent = relevantRequests
    .filter((request) => request.priority === 'Kritis' || request.priority === 'Tinggi')
    .slice(0, 4);

  els.recentSummary.innerHTML = urgent.length
    ? urgent.map((request) => `
        <div class="summary-item">
          <strong>${escapeHtml(request.title)}</strong>
          <p>${escapeHtml(request.location)} · ${escapeHtml(request.priority)} · ${escapeHtml(request.status)}</p>
        </div>
      `).join('')
    : '<div class="summary-item"><strong>Tidak ada pengajuan prioritas tinggi.</strong><p>Semua laporan sedang dalam kondisi normal.</p></div>';
}

function renderTimeline() {
  const latest = [...state.requests]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5);

  els.latestTimeline.innerHTML = latest
    .map((request) => `
      <article class="timeline-item">
        <div class="status-line">
          <strong>${escapeHtml(request.title)}</strong>
          <span class="status-pill ${statusClass(request.status)}">${escapeHtml(request.status)}</span>
        </div>
        <p>${escapeHtml(request.name)} · ${escapeHtml(request.location)}</p>
        <small>${formatDateTime(request.updatedAt)}</small>
      </article>
    `)
    .join('');
}

function renderMyRequests() {
  const user = getCurrentUser();
  const requests = state.requests.filter((request) => request.user === user.username);

  els.myRequestCount.textContent = requests.length;
  els.myRequestsTable.innerHTML = requests.length
    ? requests.map((request) => `
        <tr>
          <td>${formatDate(request.createdAt)}</td>
          <td>
            <strong>${escapeHtml(request.title)}</strong><br />
            <small>${escapeHtml(request.category)} · ${escapeHtml(request.location)}</small>
          </td>
          <td><span class="status-pill ${statusClass(request.status)}">${escapeHtml(request.status)}</span></td>
        </tr>
      `).join('')
    : '<tr><td colspan="3">Belum ada pengajuan.</td></tr>';
}

function renderAdminTable() {
  const user = getCurrentUser();
  if (!isAdminUser(user)) {
    els.adminRequestsTable.innerHTML = '';
    return;
  }

  const monthFilter = els.adminMonthFilter.value || 'all';
  const statusFilter = els.adminStatusFilter.value;
  const search = els.adminSearch.value.trim().toLowerCase();

  const filtered = state.requests.filter((request) => {
    const matchesMonth = monthFilter === 'all' || request.createdAt.startsWith(`${monthFilter}-`);
    const matchesStatus = statusFilter === 'active'
      ? request.status === 'Diajukan' || request.status === 'Diproses'
      : statusFilter === 'all' || request.status === statusFilter;
    const haystack = [request.title, request.location, request.name, request.category, request.unit, request.processReason].join(' ').toLowerCase();
    const matchesSearch = !search || haystack.includes(search);
    return matchesMonth && matchesStatus && matchesSearch;
  });

  els.adminRequestsTable.innerHTML = filtered.length
    ? filtered.map((request) => `
        <tr>
          <td>${escapeHtml(request.id)}</td>
          <td>${escapeHtml(request.name)}</td>
          <td>${escapeHtml(request.unit || '-')}</td>
          <td>
            <strong>${escapeHtml(request.title)}</strong><br />
            <small>${escapeHtml(request.category)} · ${escapeHtml(request.priority)}</small>
          </td>
          <td>${escapeHtml(request.location)}</td>
          <td><span class="status-pill ${statusClass(request.status)}">${escapeHtml(request.status)}</span></td>
          <td>
            ${renderReasonCell(request)}
          </td>
          <td>
            <div class="table-actions">
              ${STATUS_ORDER.map((status) => `
                <button class="mini-btn ${buttonTone(status)}" data-update-id="${request.id}" data-new-status="${status}" type="button">${status}</button>
              `).join('')}
              ${request.status === 'Diproses' ? `<button class="mini-btn" data-save-reason-id="${request.id}" type="button">Simpan Alasan</button>` : ''}
            </div>
          </td>
        </tr>
      `).join('')
    : '<tr><td colspan="8">Tidak ada data sesuai filter.</td></tr>';

  els.adminRequestsTable.querySelectorAll('[data-update-id]').forEach((button) => {
    button.addEventListener('click', () => {
      updateRequestStatus(button.dataset.updateId, button.dataset.newStatus);
    });
  });

  els.adminRequestsTable.querySelectorAll('[data-save-reason-id]').forEach((button) => {
    button.addEventListener('click', () => {
      saveProcessReason(button.dataset.saveReasonId);
    });
  });
}

function renderReasonCell(request) {
  const editable = request.status === 'Diproses';
  const value = escapeHtml(request.processReason || '');

  if (!editable && !request.processReason) {
    return '<span class="cell-muted">-</span>';
  }

  return `
    <textarea
      class="reason-input"
      data-reason-input="${request.id}"
      rows="3"
      ${editable ? '' : 'disabled'}
      placeholder="Isi alasan proses"
    >${value}</textarea>
  `;
}

function saveProcessReason(requestId) {
  const request = state.requests.find((item) => item.id === requestId);
  if (!request || !isAdminUser(getCurrentUser())) {
    return;
  }

  const input = els.adminRequestsTable.querySelector(`[data-reason-input="${requestId}"]`);
  if (!input) {
    return;
  }

  request.processReason = input.value.trim();
  request.updatedAt = new Date().toISOString();
  writeStorage(STORAGE_KEYS.requests, state.requests);
  renderApp();
  toast(`Alasan proses untuk ${request.id} sudah disimpan.`);
}

function renderRecap() {
  const month = els.recapMonth.value || DEFAULT_MONTH;
  const requests = state.requests.filter((request) => request.createdAt.startsWith(`${month}-`));

  els.recapTotal.textContent = requests.length;
  els.recapPending.textContent = requests.filter((request) => request.status === 'Diajukan').length;
  els.recapDone.textContent = requests.filter((request) => request.status === 'Selesai').length;
  els.recapResolution.textContent = formatAverageResolution(requests);
  els.recapCountBadge.textContent = `${requests.length} data`;
  els.recapTable.innerHTML = requests.length
    ? requests.map((request) => `
        <tr>
          <td>${formatDate(request.createdAt)}</td>
          <td>
            <strong>${escapeHtml(request.title)}</strong><br />
            <small>${escapeHtml(request.location)}</small>
          </td>
          <td>${escapeHtml(request.priority)}</td>
          <td><span class="status-pill ${statusClass(request.status)}">${escapeHtml(request.status)}</span></td>
        </tr>
      `).join('')
    : '<tr><td colspan="4">Belum ada laporan pada bulan ini.</td></tr>';

  renderCategoryBreakdown(requests);
}

function renderCategoryBreakdown(requests) {
  const total = requests.length || 1;
  const counts = requests.reduce((accumulator, request) => {
    accumulator[request.category] = (accumulator[request.category] || 0) + 1;
    return accumulator;
  }, {});

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  els.categoryBreakdown.innerHTML = sorted.length
    ? sorted.map(([category, count]) => `
        <div class="breakdown-item">
          <div>
            <strong>${escapeHtml(category)}</strong>
            <p>${count} pengajuan</p>
          </div>
          <div class="breakdown-meter" aria-hidden="true">
            <span style="width: ${Math.round((count / total) * 100)}%"></span>
          </div>
        </div>
      `).join('')
    : '<div class="breakdown-item"><div><strong>Belum ada data bulan ini</strong><p>Rekap kategori akan muncul setelah ada pengajuan.</p></div></div>';
}

function updateRequestStatus(requestId, newStatus) {
  const request = state.requests.find((item) => item.id === requestId);
  if (!request) {
    return;
  }

  const statusLabel = newStatus === 'Diajukan'
    ? 'Diajukan'
    : newStatus === 'Diproses'
      ? 'Sedang diproses'
      : newStatus === 'Selesai'
        ? 'Sudah selesai'
        : 'Ditolak';

  request.status = newStatus;
  request.note = newStatus === 'Selesai'
    ? 'Perbaikan sudah dituntaskan.'
    : request.note || '';
  request.updatedAt = new Date().toISOString();
  writeStorage(STORAGE_KEYS.requests, state.requests);
  if (isAdminUser(getCurrentUser())) {
    els.adminStatusFilter.value = 'active';
  }
  renderApp();
  toast(`Status laporan ${request.id} diperbarui menjadi ${statusLabel}.`);
}

function exportMonthlyPdf() {
  if (!isAdminUser(getCurrentUser())) {
    toast('Fitur PDF hanya untuk admin.');
    return;
  }

  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) {
    toast('Library PDF belum tersedia. Coba refresh halaman.');
    return;
  }

  const month = els.recapMonth.value || DEFAULT_MONTH;
  const rows = state.requests.filter((request) => request.createdAt.startsWith(`${month}-`));
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'legal' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginX = 12;

  const letterheadLines = (state.reportSettings.letterhead || DEFAULT_REPORT_SETTINGS.letterhead)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  letterheadLines.forEach((line, index) => {
    pdf.text(line, pageWidth / 2, 12 + (index * 6), { align: 'center' });
  });

  const dividerY = 12 + (letterheadLines.length * 6) + 2;
  pdf.setLineWidth(0.4);
  pdf.line(marginX, dividerY, pageWidth - marginX, dividerY);

  pdf.setFontSize(13);
  pdf.text('LAPORAN BULANAN PERMINTAAN PERBAIKAN', pageWidth / 2, dividerY + 8, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(`Periode: ${formatMonthLabel(month)}`, marginX, dividerY + 16);

  const summaryTop = dividerY + 22;
  const summaryBoxes = [
    { label: 'Total', value: String(rows.length) },
    { label: 'Diajukan', value: String(rows.filter((request) => request.status === 'Diajukan').length) },
    { label: 'Diproses', value: String(rows.filter((request) => request.status === 'Diproses').length) },
    { label: 'Selesai', value: String(rows.filter((request) => request.status === 'Selesai').length) },
  ];

  const boxWidth = (pageWidth - (marginX * 2) - 6) / 4;
  summaryBoxes.forEach((box, index) => {
    const x = marginX + (index * (boxWidth + 2));
    pdf.roundedRect(x, summaryTop, boxWidth, 16, 2, 2, 'S');
    pdf.setFontSize(9);
    pdf.text(box.label, x + 3, summaryTop + 5);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text(box.value, x + 3, summaryTop + 11);
    pdf.setFont('helvetica', 'normal');
  });

  const tableRows = rows.map((request, index) => [
    String(index + 1),
    formatDate(request.createdAt),
    request.id,
    request.name,
    request.unit || '-',
    request.title,
    request.category,
    request.priority,
    request.status,
    request.processReason || '-',
  ]);

  pdf.autoTable({
    startY: summaryTop + 22,
    tableWidth: pageWidth - (marginX * 2),
    head: [[
      'No',
      'Tanggal',
      'ID',
      'Pemohon',
      'Unit',
      'Judul',
      'Kategori',
      'Prioritas',
      'Status',
      'Alasan Proses',
    ]],
    body: tableRows,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      valign: 'middle',
      overflow: 'linebreak',
      minCellHeight: 6,
    },
    headStyles: {
      fillColor: [15, 27, 49],
      textColor: 255,
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 24 },
      2: { cellWidth: 28 },
      3: { cellWidth: 30 },
      4: { cellWidth: 28 },
      5: { cellWidth: 72 },
      6: { cellWidth: 32 },
      7: { cellWidth: 22 },
      8: { cellWidth: 20 },
      9: { cellWidth: 64 },
    },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    margin: { left: marginX, right: marginX },
    didDrawPage: () => {
      pdf.setFontSize(8);
      pdf.text(`Halaman ${String(pdf.getNumberOfPages())}`, pageWidth - marginX, pageHeight - 6, { align: 'right' });
    },
  });

  const signerY = pdf.lastAutoTable.finalY + 18;
  const signerX = pageWidth - 78;
  pdf.setFontSize(10);
  pdf.text('Mengetahui,', signerX, signerY);
  pdf.text(state.reportSettings.signerRole || DEFAULT_REPORT_SETTINGS.signerRole, signerX, signerY + 6);
  pdf.text('', signerX, signerY + 12);
  pdf.setFont('helvetica', 'bold');
  pdf.text(state.reportSettings.signerName || DEFAULT_REPORT_SETTINGS.signerName, signerX, signerY + 28);
  pdf.setFont('helvetica', 'normal');
  if (state.reportSettings.signerId) {
    pdf.text(`NIP/ID: ${state.reportSettings.signerId}`, signerX, signerY + 34);
  }

  pdf.save(`laporan-perbaikan-${month}.pdf`);
}

function formatAverageResolution(requests) {
  const completed = requests.filter((request) => request.status === 'Selesai' && request.updatedAt && request.createdAt);
  if (!completed.length) {
    return '0 hari';
  }

  const totalDays = completed.reduce((sum, request) => {
    const created = new Date(request.createdAt).getTime();
    const updated = new Date(request.updatedAt).getTime();
    const diffDays = Math.max(0, Math.round((updated - created) / 86400000));
    return sum + diffDays;
  }, 0);

  return `${(totalDays / completed.length).toFixed(1)} hari`;
}

function buildRequestId(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const counter = String(state.requests.length + 1).padStart(3, '0');
  return `PR-${date.getFullYear()}${month}${day}-${counter}`;
}

function formatDateTime(value) {
  const date = new Date(value);
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(value) {
  const date = new Date(value);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatMonthLabel(value) {
  const [year, month] = value.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });
}

function statusClass(status) {
  return `status-${status.toLowerCase()}`;
}

function buttonTone(status) {
  if (status === 'Selesai') {
    return 'success';
  }
  if (status === 'Diproses') {
    return 'warning';
  }
  if (status === 'Ditolak') {
    return 'danger';
  }
  return '';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function csvEscape(value) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove('hidden');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    els.toast.classList.add('hidden');
    els.toast.textContent = '';
  }, 2200);
}

function isAdminUser(user) {
  return Boolean(user && user.username === 'admin');
}
