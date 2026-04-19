const DEFAULT_LANDING_SETTINGS = {
  eyebrow: 'Sistem Internal',
  title: 'Portal Pengajuan Perbaikan',
  subtitle: 'Sistem resmi untuk pengajuan, pemantauan, dan rekap perbaikan di lingkungan kerja.',
  theme: 'teal',
};

const DEFAULT_REPORT_SETTINGS = {
  letterhead: 'Nama Instansi / Rumah Sakit\nAlamat instansi / rumah sakit\nKota, Provinsi',
  signerName: 'Nama Penanda Tangan',
  signerRole: 'Jabatan Penanda Tangan',
  signerId: '',
};

const THEME_MAP = {
  teal: {
    accent: '#7dd3fc',
    accentStrong: '#38bdf8',
    hero: 'linear-gradient(180deg, rgba(10, 17, 30, 0.98), rgba(9, 16, 29, 0.9))',
  },
  blue: {
    accent: '#93c5fd',
    accentStrong: '#60a5fa',
    hero: 'linear-gradient(180deg, rgba(10, 18, 38, 0.98), rgba(8, 13, 27, 0.9))',
  },
  green: {
    accent: '#86efac',
    accentStrong: '#34d399',
    hero: 'linear-gradient(180deg, rgba(8, 22, 20, 0.98), rgba(7, 16, 20, 0.9))',
  },
  amber: {
    accent: '#fcd34d',
    accentStrong: '#f59e0b',
    hero: 'linear-gradient(180deg, rgba(25, 18, 7, 0.98), rgba(13, 11, 7, 0.9))',
  },
};

const STATUS_ORDER = ['Diajukan', 'Diproses', 'Selesai', 'Ditolak'];
const DEFAULT_MONTH = new Date().toISOString().slice(0, 7);

const state = {
  user: null,
  users: [],
  auditLogs: [],
  auditPage: 1,
  auditPageSize: 10,
  requests: [],
  landingSettings: { ...DEFAULT_LANDING_SETTINGS },
  reportSettings: { ...DEFAULT_REPORT_SETTINGS },
  adminNotificationCount: 0,
  lastAdminNotificationCount: 0,
  adminPollHandle: null,
};

const els = {};

document.addEventListener('DOMContentLoaded', async () => {
  bindElements();
  bindEvents();
  await bootstrap();
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
    'adminUsersTable',
    'auditLogsTable',
    'exportAuditCsvBtn',
    'exportAuditPdfBtn',
    'auditPrevPageBtn',
    'auditNextPageBtn',
    'auditPageInfo',
    'auditAdminFilter',
    'auditActionFilter',
    'auditDateFilter',
    'createUserForm',
    'newUsername',
    'newName',
    'newRole',
    'newPassword',
    'generateNewPasswordBtn',
    'resetSystemBtn',
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
    'recapTrendChart',
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
    'landingEyebrow',
    'landingTitle',
    'landingSubtitle',
    'landingSettingsForm',
    'landingEyebrowInput',
    'landingTitleInput',
    'landingSubtitleInput',
    'landingThemeInput',
    'adminReportForm',
    'reportLetterhead',
    'reportSignerName',
    'reportSignerRole',
    'reportSignerId',
  ];

  ids.forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function bindEvents() {
  els.loginForm.addEventListener('submit', handleLogin);
  els.togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
  els.logoutBtn.addEventListener('click', handleLogout);
  els.requestForm.addEventListener('submit', handleRequestSubmit);
  els.markAdminSeenBtn.addEventListener('click', handleMarkAdminSeen);
  els.landingSettingsForm.addEventListener('submit', handleSaveLandingSettings);
  els.adminReportForm.addEventListener('submit', handleSaveReportSettings);
  els.createUserForm.addEventListener('submit', handleCreateUser);
  els.generateNewPasswordBtn.addEventListener('click', handleGenerateNewUserPassword);
  els.resetSystemBtn.addEventListener('click', handleResetSystem);
  els.adminStatusFilter.addEventListener('change', renderAdminTable);
  els.adminMonthFilter.addEventListener('change', renderAdminTable);
  els.adminSearch.addEventListener('input', renderAdminTable);
  els.auditAdminFilter.addEventListener('input', handleAuditFilterChange);
  els.auditActionFilter.addEventListener('change', handleAuditFilterChange);
  els.auditDateFilter.addEventListener('change', handleAuditFilterChange);
  els.auditPrevPageBtn.addEventListener('click', handleAuditPrevPage);
  els.auditNextPageBtn.addEventListener('click', handleAuditNextPage);
  els.exportAuditCsvBtn.addEventListener('click', exportAuditCsv);
  els.exportAuditPdfBtn.addEventListener('click', exportAuditPdf);
  els.recapMonth.addEventListener('change', renderRecap);
  els.exportPdfBtn.addEventListener('click', exportMonthlyPdf);

  document.querySelectorAll('.tab-btn').forEach((button) => {
    button.addEventListener('click', () => {
      switchSection(button.dataset.target);
      setActiveTab(button.dataset.target);
    });
  });
}

async function bootstrap() {
  await migrateLegacyDataIfNeeded();
  applyLandingTheme(state.landingSettings.theme);
  renderLandingCopy();
  setLoginMode(true);

  try {
    const data = await apiGet('/api/bootstrap');
    state.user = data.user || null;
    state.landingSettings = { ...DEFAULT_LANDING_SETTINGS, ...(data.landingSettings || {}) };
    state.reportSettings = { ...DEFAULT_REPORT_SETTINGS, ...(data.reportSettings || {}) };
    state.adminNotificationCount = Number(data.adminNotificationCount || 0);
    state.lastAdminNotificationCount = state.adminNotificationCount;

    applyLandingTheme(state.landingSettings.theme);
    renderLandingCopy();
    renderLandingSettings();
    renderReportSettings();

    if (state.user) {
      await loadAppData();
      setLoginMode(false);
      renderApp();
      startAdminPolling();
      return;
    }

    setLoginMode(true);
  } catch (error) {
    console.error(error);
    toast('Gagal memuat aplikasi. Coba refresh halaman.');
    setLoginMode(true);
  }
}

async function migrateLegacyDataIfNeeded() {
  const migrationFlag = localStorage.getItem('rrp-migrated-to-backend-v1');
  const hasLegacy = [
    'rrp-users',
    'rrp-requests',
    'rrp-session',
    'rrp-landing-settings',
    'rrp-report-settings',
    'rrp-admin-seen-at',
  ].some((key) => Boolean(localStorage.getItem(key)));

  if (migrationFlag || !hasLegacy) {
    return;
  }

  const legacyUsers = safeJsonParse(localStorage.getItem('rrp-users'), []);
  const legacyRequests = safeJsonParse(localStorage.getItem('rrp-requests'), []);
  const legacyLanding = safeJsonParse(localStorage.getItem('rrp-landing-settings'), null);
  const legacyReport = safeJsonParse(localStorage.getItem('rrp-report-settings'), null);
  const legacyAdminSeenAt = localStorage.getItem('rrp-admin-seen-at') || '';

  await apiPost('/api/migrate-legacy', {
    users: Array.isArray(legacyUsers) ? legacyUsers : [],
    requests: Array.isArray(legacyRequests) ? legacyRequests : [],
    landingSettings: legacyLanding && typeof legacyLanding === 'object' ? legacyLanding : undefined,
    reportSettings: legacyReport && typeof legacyReport === 'object' ? legacyReport : undefined,
    adminSeenAt: legacyAdminSeenAt,
  });

  localStorage.setItem('rrp-migrated-to-backend-v1', '1');

  const legacySession = safeJsonParse(localStorage.getItem('rrp-session'), null);
  if (legacySession?.username && Array.isArray(legacyUsers)) {
    const match = legacyUsers.find((item) => item && item.username === legacySession.username && item.password);
    if (match) {
      try {
        await apiPost('/api/login', {
          username: match.username,
          password: match.password,
          remember: true,
        });
      } catch {
        // Ignore failed auto-login restore.
      }
    }
  }

  ['rrp-users', 'rrp-requests', 'rrp-session', 'rrp-landing-settings', 'rrp-report-settings', 'rrp-admin-seen-at'].forEach((key) => {
    localStorage.removeItem(key);
  });
}

async function loadAppData() {
  const requestsResponse = await apiGet('/api/requests');
  state.requests = normalizeRequests(requestsResponse.requests || []);

  if (isAdminUser()) {
    const notificationsResponse = await apiGet('/api/admin/notifications');
    state.adminNotificationCount = Number(notificationsResponse.count || 0);
    state.lastAdminNotificationCount = state.adminNotificationCount;

    const reportResponse = await apiGet('/api/report-settings');
    state.reportSettings = { ...DEFAULT_REPORT_SETTINGS, ...(reportResponse.reportSettings || {}) };

    const usersResponse = await apiGet('/api/users');
    state.users = usersResponse.users || [];

    const logsResponse = await apiGet('/api/audit-logs');
    state.auditLogs = logsResponse.logs || [];
    state.auditPage = 1;
    return;
  }

  state.users = [];
  state.auditLogs = [];
  state.auditPage = 1;
}

function normalizeRequests(requests) {
  return requests.map((request) => ({
    ...request,
    processReason: request.processReason || '',
    note: request.note || '',
    unit: request.unit || 'Umum',
  }));
}

function safeJsonParse(raw, fallback) {
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function setLoginMode(showLogin) {
  els.loginPage.classList.toggle('hidden', !showLogin);
  els.appPage.classList.toggle('hidden', showLogin);
}

function applyLandingTheme(themeName) {
  const theme = THEME_MAP[themeName] || THEME_MAP.teal;
  document.documentElement.style.setProperty('--accent', theme.accent);
  document.documentElement.style.setProperty('--accent-strong', theme.accentStrong);
  document.documentElement.style.setProperty('--login-panel-bg', theme.hero);
}

function renderLandingCopy() {
  els.landingEyebrow.textContent = state.landingSettings.eyebrow;
  els.landingTitle.textContent = state.landingSettings.title;
  els.landingSubtitle.textContent = state.landingSettings.subtitle;
}

function renderLandingSettings() {
  els.landingEyebrowInput.value = state.landingSettings.eyebrow;
  els.landingTitleInput.value = state.landingSettings.title;
  els.landingSubtitleInput.value = state.landingSettings.subtitle;
  els.landingThemeInput.value = state.landingSettings.theme;
}

function renderReportSettings() {
  els.reportLetterhead.value = state.reportSettings.letterhead;
  els.reportSignerName.value = state.reportSettings.signerName;
  els.reportSignerRole.value = state.reportSettings.signerRole;
  els.reportSignerId.value = state.reportSettings.signerId;
}

function renderUsersTable() {
  if (!isAdminUser()) {
    els.adminUsersTable.innerHTML = '';
    return;
  }

  els.adminUsersTable.innerHTML = state.users.length
    ? state.users.map((user) => `
        <tr>
          <td>${escapeHtml(user.username)}</td>
          <td>${escapeHtml(user.name)}</td>
          <td>${escapeHtml(user.role)}</td>
          <td>
            <span class="status-pill ${user.active ? 'status-selesai' : 'status-ditolak'}">${user.active ? 'Aktif' : 'Nonaktif'}</span>
          </td>
          <td>${formatDateTime(user.created_at)}</td>
          <td>
            <div class="table-actions">
              <button class="mini-btn" data-reset-password="${escapeHtml(user.username)}" type="button">Ubah Password</button>
              <button class="mini-btn warning" data-reset-password-random="${escapeHtml(user.username)}" type="button">Password Acak</button>
              <button class="mini-btn ${user.active ? 'danger' : 'success'}" data-toggle-active="${escapeHtml(user.username)}" data-next-active="${user.active ? '0' : '1'}" type="button">${user.active ? 'Nonaktifkan' : 'Aktifkan'}</button>
              <button class="mini-btn danger" data-delete-user="${escapeHtml(user.username)}" type="button">Hapus</button>
            </div>
          </td>
        </tr>
      `).join('')
    : '<tr><td colspan="6">Belum ada pengguna.</td></tr>';

  els.adminUsersTable.querySelectorAll('[data-reset-password]').forEach((button) => {
    button.addEventListener('click', () => handleResetUserPassword(button.dataset.resetPassword, false));
  });

  els.adminUsersTable.querySelectorAll('[data-reset-password-random]').forEach((button) => {
    button.addEventListener('click', () => handleResetUserPassword(button.dataset.resetPasswordRandom, true));
  });

  els.adminUsersTable.querySelectorAll('[data-toggle-active]').forEach((button) => {
    button.addEventListener('click', () => handleToggleUserActive(button.dataset.toggleActive, button.dataset.nextActive === '1'));
  });

  els.adminUsersTable.querySelectorAll('[data-delete-user]').forEach((button) => {
    button.addEventListener('click', () => handleDeleteUser(button.dataset.deleteUser));
  });
}

function renderAuditLogs() {
  if (!isAdminUser()) {
    els.auditLogsTable.innerHTML = '';
    return;
  }

  const adminFilter = (els.auditAdminFilter.value || '').trim().toLowerCase();
  const actionFilter = els.auditActionFilter.value || 'all';
  const dateFilter = els.auditDateFilter.value || '';

  const filtered = getFilteredAuditLogs(adminFilter, actionFilter, dateFilter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / state.auditPageSize));
  state.auditPage = Math.min(Math.max(1, state.auditPage), totalPages);
  const start = (state.auditPage - 1) * state.auditPageSize;
  const pageRows = filtered.slice(start, start + state.auditPageSize);

  els.auditLogsTable.innerHTML = pageRows.length
    ? pageRows.map((log) => `
        <tr>
          <td>${formatDateTime(log.created_at)}</td>
          <td>${escapeHtml(log.actor_username || 'system')}</td>
          <td>${escapeHtml(formatActionLabel(log.action))}</td>
          <td>${escapeHtml(log.target || '-')}</td>
          <td>${escapeHtml(log.details || '-')}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="5">Belum ada audit log.</td></tr>';

  els.auditPageInfo.textContent = `Halaman ${state.auditPage} / ${totalPages}`;
  els.auditPrevPageBtn.disabled = state.auditPage <= 1;
  els.auditNextPageBtn.disabled = state.auditPage >= totalPages;
}

function getFilteredAuditLogs(adminFilter, actionFilter, dateFilter) {
  return state.auditLogs.filter((log) => {
    const matchesAdmin = !adminFilter || String(log.actor_username || '').toLowerCase().includes(adminFilter);
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesDate = !dateFilter || String(log.created_at || '').startsWith(dateFilter);
    return matchesAdmin && matchesAction && matchesDate;
  });
}

function handleAuditFilterChange() {
  state.auditPage = 1;
  renderAuditLogs();
}

function handleAuditPrevPage() {
  if (state.auditPage <= 1) {
    return;
  }
  state.auditPage -= 1;
  renderAuditLogs();
}

function handleAuditNextPage() {
  state.auditPage += 1;
  renderAuditLogs();
}

function renderApp() {
  const admin = isAdminUser();
  setLoginMode(false);

  els.adminTabBtn.classList.toggle('hidden', !admin);
  els.adminTabBtn.style.display = admin ? 'inline-flex' : 'none';
  els.requestTabBtn.classList.toggle('hidden', admin);
  els.requestTabBtn.style.display = admin ? 'none' : 'inline-flex';
  els.exportPdfBtn.classList.toggle('hidden', !admin);
  els.exportPdfBtn.style.display = admin ? 'inline-flex' : 'none';

  if (admin) {
    const requestVisible = !document.getElementById('requestSection').classList.contains('hidden');
    if (requestVisible) {
      switchSection('dashboardSection');
      setActiveTab('dashboardSection');
    }
  }

  els.recapMonth.value ||= DEFAULT_MONTH;
  els.currentMonthBadge.textContent = formatMonthLabel(els.recapMonth.value);

  renderStats();
  renderSummary();
  renderTimeline();
  renderMyRequests();
  renderAdminTable();
  renderUsersTable();
  renderAuditLogs();
  renderRecap();
  renderLandingSettings();
  renderReportSettings();
  renderAdminNotification();
  maybeShowEndOfMonthReminder();
}

function handleResetAdminFilters() {
  if (!isAdminUser()) {
    return;
  }

  els.adminStatusFilter.value = 'all';
  els.adminMonthFilter.value = '';
  els.adminSearch.value = '';
  renderAdminTable();
  toast('Filter admin sudah direset.');
}

function isEndOfMonth(date) {
  const tomorrow = new Date(date);
  tomorrow.setDate(date.getDate() + 1);
  return tomorrow.getMonth() !== date.getMonth();
}

function maybeShowEndOfMonthReminder() {
  if (!isAdminUser() || !isEndOfMonth(new Date())) {
    return;
  }

  const todayKey = `rrp-eom-reminder-${new Date().toISOString().slice(0, 10)}`;
  if (localStorage.getItem(todayKey) === '1') {
    return;
  }
  localStorage.setItem(todayKey, '1');

  const confirmed = window.confirm('Hari ini akhir bulan. Reset filter admin ke default sekarang?');
  if (confirmed) {
    handleResetAdminFilters();
  } else {
    toast('Pengingat akhir bulan: filter admin bisa direset kapan saja.');
  }
}

function startAdminPolling() {
  stopAdminPolling();
  if (!isAdminUser()) {
    return;
  }
  state.adminPollHandle = setInterval(async () => {
    try {
      const data = await apiGet('/api/admin/notifications');
      state.adminNotificationCount = Number(data.count || 0);
      if (state.adminNotificationCount > state.lastAdminNotificationCount) {
        toast(`Ada ${state.adminNotificationCount} permintaan perbaikan baru.`);
        playAdminNotificationSound();
      }
      state.lastAdminNotificationCount = state.adminNotificationCount;
      renderAdminNotification();

      if (!isAdminSectionActive()) {
        return;
      }

      const requestsResponse = await apiGet('/api/requests');
      state.requests = normalizeRequests(requestsResponse.requests || []);
      renderStats();
      renderSummary();
      renderTimeline();
      renderAdminTable();
      renderRecap();
    } catch (error) {
      console.error(error);
    }
  }, 2000);
}

function stopAdminPolling() {
  if (state.adminPollHandle) {
    clearInterval(state.adminPollHandle);
    state.adminPollHandle = null;
  }
}

function renderAdminNotification() {
  if (!isAdminUser()) {
    els.adminNotifBadge.classList.add('hidden');
    els.adminNewAlert.classList.add('hidden');
    return;
  }
  els.adminNotifBadge.textContent = String(state.adminNotificationCount);
  els.adminNewCount.textContent = String(state.adminNotificationCount);
  els.adminNotifBadge.classList.toggle('hidden', state.adminNotificationCount < 1);
  els.adminNewAlert.classList.toggle('hidden', state.adminNotificationCount < 1);
}

function renderStats() {
  const relevant = getRelevantRequests();
  els.statTotal.textContent = relevant.length;
  els.statPending.textContent = relevant.filter((request) => request.status === 'Diajukan').length;
  els.statProgress.textContent = relevant.filter((request) => request.status === 'Diproses').length;
  els.statDone.textContent = relevant.filter((request) => request.status === 'Selesai').length;
}

function renderSummary() {
  const relevant = getRelevantRequests();
  const urgent = relevant
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
    .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt))
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
  const relevant = getRelevantRequests();
  els.myRequestCount.textContent = relevant.length;
  els.myRequestsTable.innerHTML = relevant.length
    ? relevant.map((request) => `
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
  if (!isAdminUser()) {
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
          <td>${renderReasonCell(request)}</td>
          <td>
            <div class="table-actions">
              ${STATUS_ORDER.map((status) => `<button class="mini-btn ${buttonTone(status)}" data-update-id="${request.id}" data-new-status="${status}" type="button">${status}</button>`).join('')}
              ${request.status === 'Diproses' ? `<button class="mini-btn" data-save-reason-id="${request.id}" type="button">Simpan Alasan</button>` : ''}
            </div>
          </td>
        </tr>
      `).join('')
    : '<tr><td colspan="8">Tidak ada data sesuai filter.</td></tr>';

  els.adminRequestsTable.querySelectorAll('[data-update-id]').forEach((button) => {
    button.addEventListener('click', () => handleUpdateRequestStatus(button.dataset.updateId, button.dataset.newStatus));
  });

  els.adminRequestsTable.querySelectorAll('[data-save-reason-id]').forEach((button) => {
    button.addEventListener('click', () => handleSaveProcessReason(button.dataset.saveReasonId));
  });
}

function renderReasonCell(request) {
  if (request.status === 'Diproses') {
    return `
      <textarea class="reason-input" data-reason-input="${request.id}" rows="3" placeholder="Isi alasan proses">${escapeHtml(request.processReason || '')}</textarea>
    `;
  }

  return request.processReason
    ? `<span class="cell-muted">${escapeHtml(request.processReason)}</span>`
    : '<span class="cell-muted">-</span>';
}

function renderRecap() {
  const month = els.recapMonth.value || DEFAULT_MONTH;
  const relevant = getRelevantRequests().filter((request) => request.createdAt.startsWith(`${month}-`));

  els.recapTotal.textContent = relevant.length;
  els.recapPending.textContent = relevant.filter((request) => request.status === 'Diajukan').length;
  els.recapDone.textContent = relevant.filter((request) => request.status === 'Selesai').length;
  els.recapResolution.textContent = formatAverageResolution(relevant);
  els.recapCountBadge.textContent = `${relevant.length} data`;

  els.recapTable.innerHTML = relevant.length
    ? relevant.map((request) => `
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

  renderCategoryBreakdown(relevant);
  renderMonthlyTrendChart(month);
}

function renderMonthlyTrendChart(selectedMonth) {
  const endDate = parseMonthInput(selectedMonth);
  if (!endDate) {
    els.recapTrendChart.innerHTML = '<div class="cell-muted">Data grafik belum tersedia.</div>';
    return;
  }

  const series = buildMonthlySeries(endDate, 6);
  const maxTotal = Math.max(1, ...series.map((item) => item.total));

  els.recapTrendChart.innerHTML = series.map((item) => {
    const totalHeight = Math.max(4, Math.round((item.total / maxTotal) * 150));
    const doneHeight = item.done > 0 ? Math.max(4, Math.round((item.done / maxTotal) * 150)) : 4;
    return `
      <div class="chart-col" title="${escapeHtml(item.label)} | total: ${item.total}, selesai: ${item.done}">
        <div class="chart-value">${item.total}</div>
        <div class="chart-bars">
          <div class="bar-total" style="height:${totalHeight}px"></div>
          <div class="bar-done" style="height:${doneHeight}px"></div>
        </div>
        <div class="chart-label">${escapeHtml(item.shortLabel)}</div>
      </div>
    `;
  }).join('');
}

function buildMonthlySeries(endDate, count) {
  const relevantAll = getRelevantRequests();
  const result = [];

  for (let index = count - 1; index >= 0; index -= 1) {
    const current = new Date(endDate.getFullYear(), endDate.getMonth() - index, 1);
    const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
    const monthRequests = relevantAll.filter((request) => request.createdAt.startsWith(`${monthKey}-`));
    result.push({
      monthKey,
      total: monthRequests.length,
      done: monthRequests.filter((request) => request.status === 'Selesai').length,
      label: current.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
      shortLabel: current.toLocaleDateString('id-ID', { month: 'short' }),
    });
  }

  return result;
}

function parseMonthInput(value) {
  const parts = String(value || '').split('-').map(Number);
  if (parts.length !== 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) {
    return null;
  }
  return new Date(parts[0], parts[1] - 1, 1);
}

function renderCategoryBreakdown(requests) {
  const total = requests.length || 1;
  const counts = requests.reduce((accumulator, request) => {
    accumulator[request.category] = (accumulator[request.category] || 0) + 1;
    return accumulator;
  }, {});

  const sorted = Object.entries(counts).sort((left, right) => right[1] - left[1]);

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

function getRelevantRequests() {
  if (isAdminUser()) {
    return [...state.requests];
  }
  return state.requests.filter((request) => request.username === state.user?.username);
}

async function handleLogin(event) {
  event.preventDefault();
  const username = els.loginUsername.value.trim();
  const password = els.loginPassword.value;
  if (!username || !password) {
    els.loginError.textContent = 'Nama pengguna dan kata sandi wajib diisi.';
    return;
  }

  try {
    const response = await apiPost('/api/login', { username, password, remember: els.rememberSession.checked });
    state.user = response.user;
    await loadAppData();
    setLoginMode(false);
    renderApp();
    switchSection('dashboardSection');
    setActiveTab('dashboardSection');
    startAdminPolling();
    els.loginError.textContent = '';
  } catch (error) {
    els.loginError.textContent = error.message || 'Login gagal.';
  }
}

async function handleLogout() {
  try {
    await apiPost('/api/logout', {});
  } catch (error) {
    console.error(error);
  }

  state.user = null;
  state.users = [];
  state.auditLogs = [];
  state.requests = [];
  state.adminNotificationCount = 0;
  state.lastAdminNotificationCount = 0;

  stopAdminPolling();
  setLoginMode(true);
  renderLandingCopy();
  renderAdminNotification();

  els.loginPassword.value = '';
  els.loginUsername.value = '';
  setActiveTab('dashboardSection');
  switchSection('dashboardSection');
}

async function handleRequestSubmit(event) {
  event.preventDefault();
  if (!state.user) {
    return;
  }

  const payload = {
    title: els.requestTitle.value.trim(),
    category: els.requestCategory.value,
    location: els.requestLocation.value.trim(),
    unit: els.requestUnit.value.trim(),
    priority: els.requestPriority.value,
    description: els.requestDescription.value.trim(),
  };

  try {
    await apiPost('/api/requests', payload);
    event.target.reset();
    els.requestPriority.value = 'Sedang';
    await loadAppData();
    renderApp();
    switchSection('dashboardSection');
    setActiveTab('dashboardSection');
    toast('Pengajuan berhasil dikirim.');
  } catch (error) {
    toast(error.message || 'Gagal mengirim pengajuan.');
  }
}

async function handleCreateUser(event) {
  event.preventDefault();
  if (!isAdminUser()) {
    return;
  }

  const password = els.newPassword.value;
  const passwordError = getPasswordValidationMessage(password);
  if (passwordError) {
    toast(passwordError);
    return;
  }

  try {
    await apiPost('/api/users', {
      username: els.newUsername.value.trim(),
      name: els.newName.value.trim(),
      role: els.newRole.value,
      password,
    });

    event.target.reset();
    els.newRole.value = 'user';
    await loadAppData();
    renderApp();
    switchSection('adminSection');
    setActiveTab('adminSection');
    toast('Pengguna baru berhasil dibuat.');
  } catch (error) {
    toast(error.message || 'Gagal membuat pengguna baru.');
  }
}

function handleGenerateNewUserPassword() {
  const password = generateStrongPassword();
  els.newPassword.value = password;
  window.prompt('Password acak (salin sekarang, hanya ditampilkan sekali):', password);
}

async function handleResetSystem() {
  if (!isAdminUser()) {
    return;
  }

  const confirmed = window.confirm('Reset database akan menghapus data saat ini dan mengembalikan data awal. Lanjutkan?');
  if (!confirmed) {
    return;
  }

  try {
    await apiPost('/api/admin/reset-db', {});
    toast('Database berhasil direset. Silakan login kembali.');
    await handleLogout();
    await bootstrap();
  } catch (error) {
    toast(error.message || 'Gagal mereset database.');
  }
}

async function handleResetUserPassword(username, useRandom = false) {
  if (!isAdminUser() || !username) {
    return;
  }

  let nextPassword = '';
  if (useRandom) {
    nextPassword = generateStrongPassword();
    window.prompt(`Password acak baru untuk ${username} (salin sekarang, hanya ditampilkan sekali):`, nextPassword);
  } else {
    const manualPassword = window.prompt(`Masukkan password baru untuk ${username} (min 8, huruf besar+kecil, angka, simbol):`, '');
    if (manualPassword === null) {
      return;
    }
    nextPassword = manualPassword.trim();
  }

  if (!nextPassword) {
    return;
  }

  const passwordError = getPasswordValidationMessage(nextPassword);
  if (passwordError) {
    toast(passwordError);
    return;
  }

  try {
    await apiPatch(`/api/users/${encodeURIComponent(username)}/password`, {
      password: nextPassword,
    });
    await loadAppData();
    renderApp();
    switchSection('adminSection');
    setActiveTab('adminSection');
    toast(`Password untuk ${username} berhasil diperbarui.`);
  } catch (error) {
    toast(error.message || 'Gagal mengubah password pengguna.');
  }
}

function exportAuditCsv() {
  if (!isAdminUser()) {
    return;
  }

  const adminFilter = (els.auditAdminFilter.value || '').trim().toLowerCase();
  const actionFilter = els.auditActionFilter.value || 'all';
  const dateFilter = els.auditDateFilter.value || '';
  const rows = getFilteredAuditLogs(adminFilter, actionFilter, dateFilter);
  if (!rows.length) {
    toast('Tidak ada audit log untuk diekspor.');
    return;
  }

  const header = ['Waktu', 'Admin', 'Aksi', 'Target', 'Detail'];
  const csvLines = [header.join(',')];
  rows.forEach((log) => {
    const line = [
      formatDateTime(log.created_at),
      log.actor_username || 'system',
      formatActionLabel(log.action),
      log.target || '-',
      log.details || '-',
    ].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',');
    csvLines.push(line);
  });

  downloadBlob(new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' }), `audit-log-${new Date().toISOString().slice(0, 10)}.csv`);
}

function exportAuditPdf() {
  if (!isAdminUser()) {
    return;
  }

  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) {
    toast('Library PDF belum tersedia. Coba refresh halaman.');
    return;
  }

  const adminFilter = (els.auditAdminFilter.value || '').trim().toLowerCase();
  const actionFilter = els.auditActionFilter.value || 'all';
  const dateFilter = els.auditDateFilter.value || '';
  const rows = getFilteredAuditLogs(adminFilter, actionFilter, dateFilter);
  if (!rows.length) {
    toast('Tidak ada audit log untuk diekspor.');
    return;
  }

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.text('LAPORAN AUDIT LOG ADMIN', 14, 14);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`Total data: ${rows.length}`, 14, 20);

  pdf.autoTable({
    startY: 24,
    head: [['Waktu', 'Admin', 'Aksi', 'Target', 'Detail']],
    body: rows.map((log) => [
      formatDateTime(log.created_at),
      log.actor_username || 'system',
      formatActionLabel(log.action),
      log.target || '-',
      log.details || '-',
    ]),
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [15, 27, 49],
      textColor: 255,
    },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 28 },
      2: { cellWidth: 40 },
      3: { cellWidth: 34 },
      4: { cellWidth: 130 },
    },
    margin: { left: 10, right: 10 },
  });

  pdf.save(`audit-log-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function handleDeleteUser(username) {
  if (!isAdminUser() || !username) {
    return;
  }

  const confirmed = window.confirm(`Hapus user ${username} secara permanen?`);
  if (!confirmed) {
    return;
  }

  try {
    await apiDelete(`/api/users/${encodeURIComponent(username)}`);
    await loadAppData();
    renderApp();
    switchSection('adminSection');
    setActiveTab('adminSection');
    toast(`User ${username} berhasil dihapus.`);
  } catch (error) {
    toast(error.message || 'Gagal menghapus user.');
  }
}

async function handleToggleUserActive(username, active) {
  if (!isAdminUser() || !username) {
    return;
  }

  const confirmed = window.confirm(`${active ? 'Aktifkan' : 'Nonaktifkan'} akun ${username}?`);
  if (!confirmed) {
    return;
  }

  try {
    await apiPatch(`/api/users/${encodeURIComponent(username)}`, { active });
    await loadAppData();
    renderApp();
    switchSection('adminSection');
    setActiveTab('adminSection');
    toast(`Akun ${username} berhasil di${active ? 'aktifkan' : 'nonaktifkan'}.`);
  } catch (error) {
    toast(error.message || 'Gagal mengubah status akun.');
  }
}

async function handleSaveLandingSettings(event) {
  event.preventDefault();
  if (!isAdminUser()) {
    return;
  }

  const payload = {
    eyebrow: els.landingEyebrowInput.value.trim(),
    title: els.landingTitleInput.value.trim(),
    subtitle: els.landingSubtitleInput.value.trim(),
    theme: els.landingThemeInput.value,
  };

  try {
    const response = await apiPatch('/api/landing-settings', payload);
    state.landingSettings = { ...DEFAULT_LANDING_SETTINGS, ...(response.landingSettings || {}) };
    applyLandingTheme(state.landingSettings.theme);
    renderLandingCopy();
    renderLandingSettings();
    toast('Tampilan halaman depan sudah disimpan.');
  } catch (error) {
    toast(error.message || 'Gagal menyimpan tampilan.');
  }
}

async function handleSaveReportSettings(event) {
  event.preventDefault();
  if (!isAdminUser()) {
    return;
  }

  const payload = {
    letterhead: els.reportLetterhead.value.trim(),
    signerName: els.reportSignerName.value.trim(),
    signerRole: els.reportSignerRole.value.trim(),
    signerId: els.reportSignerId.value.trim(),
  };

  try {
    const response = await apiPatch('/api/report-settings', payload);
    state.reportSettings = { ...DEFAULT_REPORT_SETTINGS, ...(response.reportSettings || {}) };
    renderReportSettings();
    toast('Pengaturan laporan PDF sudah disimpan.');
  } catch (error) {
    toast(error.message || 'Gagal menyimpan laporan.');
  }
}

async function handleUpdateRequestStatus(requestId, newStatus) {
  if (!isAdminUser()) {
    return;
  }

  try {
    await apiPatch(`/api/requests/${encodeURIComponent(requestId)}`, {
      status: newStatus,
      note: getRequestNoteForStatus(newStatus),
    });
    await loadAppData();
    renderApp();
    switchSection('adminSection');
    setActiveTab('adminSection');
    toast(`Status permintaan ${requestId} diperbarui ke ${newStatus}.`);
  } catch (error) {
    toast(error.message || 'Gagal memperbarui status.');
  }
}

async function handleSaveProcessReason(requestId) {
  if (!isAdminUser()) {
    return;
  }

  const textarea = els.adminRequestsTable.querySelector(`[data-reason-input="${requestId}"]`);
  if (!textarea) {
    return;
  }

  try {
    await apiPatch(`/api/requests/${encodeURIComponent(requestId)}`, {
      processReason: textarea.value.trim(),
    });
    await loadAppData();
    renderApp();
    switchSection('adminSection');
    setActiveTab('adminSection');
    toast('Alasan proses berhasil disimpan.');
  } catch (error) {
    toast(error.message || 'Gagal menyimpan alasan.');
  }
}

async function handleMarkAdminSeen() {
  if (!isAdminUser()) {
    return;
  }

  try {
    await apiPost('/api/admin/seen', {});
    state.adminNotificationCount = 0;
    state.lastAdminNotificationCount = 0;
    renderAdminNotification();
    toast('Notifikasi baru ditandai sudah dilihat.');
  } catch (error) {
    toast(error.message || 'Gagal memperbarui notifikasi.');
  }
}

function exportMonthlyPdf() {
  if (!isAdminUser()) {
    toast('Fitur PDF hanya untuk admin.');
    return;
  }

  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) {
    toast('Library PDF belum tersedia. Coba refresh halaman.');
    return;
  }

  const month = els.recapMonth.value || DEFAULT_MONTH;
  const requests = state.requests.filter((request) => request.createdAt.startsWith(`${month}-`));
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
    { label: 'Total', value: String(requests.length) },
    { label: 'Diajukan', value: String(requests.filter((request) => request.status === 'Diajukan').length) },
    { label: 'Diproses', value: String(requests.filter((request) => request.status === 'Diproses').length) },
    { label: 'Selesai', value: String(requests.filter((request) => request.status === 'Selesai').length) },
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

  const tableRows = requests.map((request, index) => [
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
  pdf.text(state.reportSettings.signerName || DEFAULT_REPORT_SETTINGS.signerName, signerX, signerY + 28);
  pdf.setFont('helvetica', 'normal');
  if (state.reportSettings.signerId) {
    pdf.text(`NIP/ID: ${state.reportSettings.signerId}`, signerX, signerY + 34);
  }

  pdf.save(`laporan-perbaikan-${month}.pdf`);
}

function getRequestNoteForStatus(status) {
  if (status === 'Diproses') {
    return 'Sedang diproses oleh tim terkait.';
  }
  if (status === 'Selesai') {
    return 'Perbaikan sudah dituntaskan.';
  }
  if (status === 'Ditolak') {
    return 'Permintaan tidak dapat diproses.';
  }
  return 'Permintaan telah diajukan.';
}

function isAdminUser() {
  return Boolean(state.user && state.user.role === 'admin');
}

function switchSection(sectionId) {
  ['dashboardSection', 'requestSection', 'adminSection', 'recapSection'].forEach((section) => {
    const element = document.getElementById(section);
    const shouldShow = section === sectionId;
    const isAdminSection = section === 'adminSection';
    element.classList.toggle('hidden', !shouldShow || (isAdminSection && !isAdminUser()));
  });
}

function isAdminSectionActive() {
  const adminSection = document.getElementById('adminSection');
  return Boolean(adminSection) && !adminSection.classList.contains('hidden');
}

function setActiveTab(sectionId) {
  document.querySelectorAll('.tab-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.target === sectionId);
  });
}

function statusClass(status) {
  return `status-${status.toLowerCase()}`;
}

function formatActionLabel(action) {
  const map = {
    CREATE_USER: 'Buat Pengguna',
    RESET_PASSWORD: 'Ubah Password User',
    SET_USER_ACTIVE: 'Ubah Status User',
    DELETE_USER: 'Hapus User',
    UPDATE_REQUEST: 'Perbarui Permintaan',
    RESET_DATABASE: 'Reset Database',
  };
  return map[action] || action;
}

function generateStrongPassword(length = 12) {
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const digits = '23456789';
  const symbols = '!@#$%^&*-_+=';
  const all = lower + upper + digits + symbols;

  const required = [
    lower[Math.floor(Math.random() * lower.length)],
    upper[Math.floor(Math.random() * upper.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];

  while (required.length < length) {
    required.push(all[Math.floor(Math.random() * all.length)]);
  }

  for (let index = required.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [required[index], required[swapIndex]] = [required[swapIndex], required[index]];
  }

  return required.join('');
}

function getPasswordValidationMessage(password) {
  if (password.length < 8) {
    return 'Password minimal 8 karakter.';
  }
  if (/\s/.test(password)) {
    return 'Password tidak boleh mengandung spasi.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password harus mengandung huruf kecil.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password harus mengandung huruf besar.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password harus mengandung angka.';
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password harus mengandung simbol.';
  }
  return '';
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

function formatAverageResolution(requests) {
  const completed = requests.filter((request) => request.status === 'Selesai');
  if (!completed.length) {
    return '0 hari';
  }
  const totalDays = completed.reduce((sum, request) => {
    const created = new Date(request.createdAt).getTime();
    const updated = new Date(request.updatedAt).getTime();
    return sum + Math.max(0, Math.round((updated - created) / 86400000));
  }, 0);
  return `${(totalDays / completed.length).toFixed(1)} hari`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove('hidden');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    els.toast.classList.add('hidden');
    els.toast.textContent = '';
  }, 2500);
}

async function apiGet(path) {
  const response = await fetch(path, { credentials: 'include' });
  return parseApiResponse(response);
}

async function apiPost(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseApiResponse(response);
}

async function apiPatch(path, body) {
  const response = await fetch(path, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseApiResponse(response);
}

async function apiDelete(path) {
  const response = await fetch(path, {
    method: 'DELETE',
    credentials: 'include',
  });
  return parseApiResponse(response);
}

async function parseApiResponse(response) {
  const contentType = response.headers.get('Content-Type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : null;
  if (!response.ok) {
    const error = new Error(payload?.error || `Request failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

function togglePasswordVisibility() {
  const hidden = els.loginPassword.type === 'password';
  els.loginPassword.type = hidden ? 'text' : 'password';
  els.togglePasswordBtn.textContent = hidden ? 'Sembunyi' : 'Lihat';

}

function playAdminNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioContext.currentTime;

    const playTone = (start, frequency, duration) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);

      gainNode.gain.setValueAtTime(0.0001, start);
      gainNode.gain.exponentialRampToValueAtTime(0.08, start + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    };

    playTone(now, 880, 0.12);
    playTone(now + 0.16, 1174, 0.12);
  } catch (error) {
    console.debug('Notification sound blocked by browser policy.', error);
  }
}

function getPasswordValidationMessage(password) {
  if (password.length < 8) {
    return 'Password minimal 8 karakter.';
  }
  if (/\s/.test(password)) {
    return 'Password tidak boleh mengandung spasi.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password harus mengandung huruf kecil.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password harus mengandung huruf besar.';
  }
  if (!/\d/.test(password)) {
    return 'Password harus mengandung angka.';
  }
  if (!/[^\w]/.test(password)) {
    return 'Password harus mengandung simbol.';
  }
  return null;
}

function generateStrongPassword() {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const symbols = '!@#$%^&*()-_=+[]{}|;:,.<>?';

  let password = '';
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  const allChars = lowercase + uppercase + digits + symbols;
  for (let i = 0; i < 8; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  return password.split('').sort(() => Math.random() - 0.5).join('');
}
