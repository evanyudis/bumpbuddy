/**
 * Expecting Baby G — App.js v2
 * iOS 26 Liquid Glass Revamp
 * Full feature set with pattern detection, theme manager, and settings
 */

'use strict';

/* ========================
   STORAGE KEYS & DEFAULTS
   ======================== */
const KEYS = {
  CONTRACTIONS: 'ebg_contractions_v2',
  MOVEMENTS:    'ebg_movements_v2',
  SYMPTOMS:     'ebg_symptoms_v2',
  CHECKLIST:    'ebg_checklist_v2',
  SETTINGS:     'ebg_settings_v2',
  THEME:        'ebg_theme',
  LEGACY:       ['bumpbuddy_contractions', 'bumpbuddy_movements', 'bumpbuddy_symptoms', 'bumpbuddy_checklist']
};

const DEFAULT_SETTINGS = {
  dueDate: '2026-04-14',
  userName: '',
  babyName: '',
  gender: 'girl',
  partnerPhone: '',
  doctorPhone: '',
  hospitalName: '',
  hospitalPhone: '',
  onboardingCompleted: false,
};

/* ========================
   APP STATE
   ======================== */
let state = {
  contractions: [],
  movements: [],
  symptoms: [],
  checklist: {},
  settings: { ...DEFAULT_SETTINGS },
  timer: {
    active: false,
    startTime: null,
    intervalId: null,
    currentIntensity: 'sedang',
  },
  warningDismissed: false,
  criticalShown: false,
  criticalDismissedAt: null,
};

/* ========================
   DATA MIGRATION
   ======================== */
function migrateData() {
  KEYS.LEGACY.forEach(legacyKey => {
    const raw = localStorage.getItem(legacyKey);
    if (!raw) return;
    const newKey = legacyKey.replace('bumpbuddy_', 'ebg_').replace(/^ebg_/, 'ebg_') + '_v2';
    if (!localStorage.getItem(newKey)) {
      localStorage.setItem(newKey, raw);
    }
    localStorage.removeItem(legacyKey);
  });
}

/* ========================
   DATA PERSISTENCE
   ======================== */
function saveData() {
  localStorage.setItem(KEYS.CONTRACTIONS, JSON.stringify(state.contractions));
  localStorage.setItem(KEYS.MOVEMENTS,    JSON.stringify(state.movements));
  localStorage.setItem(KEYS.SYMPTOMS,     JSON.stringify(state.symptoms));
  localStorage.setItem(KEYS.CHECKLIST,    JSON.stringify(state.checklist));
  localStorage.setItem(KEYS.SETTINGS,     JSON.stringify(state.settings));
}

function loadData() {
  migrateData();

  const safeJSON = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  };

  state.contractions = safeJSON(KEYS.CONTRACTIONS, []);
  state.movements    = safeJSON(KEYS.MOVEMENTS, []);
  state.symptoms     = safeJSON(KEYS.SYMPTOMS, []);
  state.checklist    = safeJSON(KEYS.CHECKLIST, {});
  state.settings     = { ...DEFAULT_SETTINGS, ...safeJSON(KEYS.SETTINGS, {}) };
}

/* ========================
   HAPTIC FEEDBACK
   ======================== */
function haptic(type = 'light') {
  if (!('vibrate' in navigator)) return;
  const patterns = {
    light:   [10],
    medium:  [20],
    heavy:   [30],
    success: [10, 50, 10],
    error:   [30, 50, 30],
    double:  [15, 40, 15],
  };
  navigator.vibrate(patterns[type] ?? [10]);
}

/* ========================
   TOAST NOTIFICATIONS
   ======================== */
function showToast(message, duration = 2600) {
  const container = document.getElementById('toast-container');
  container.innerHTML = ''; // Clear existing toasts
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

/* ========================
   THEME MANAGER
   ======================== */
let sysThemeMatcher = window.matchMedia('(prefers-color-scheme: dark)');

function initTheme() {
  const saved = localStorage.getItem(KEYS.THEME) || 'system';
  applyTheme(saved, false);
  
  sysThemeMatcher.addEventListener('change', () => {
    if (localStorage.getItem(KEYS.THEME) === 'system') {
      applyTheme('system', true);
    }
  });
}

function applyTheme(theme, animate = true) {
  const html = document.documentElement;
  if (animate) html.style.transition = 'background 0.3s, color 0.3s';
  
  let actualTheme = theme;
  if (theme === 'system') {
    actualTheme = sysThemeMatcher.matches ? 'dark' : 'light';
  }
  
  html.setAttribute('data-theme', actualTheme);
  localStorage.setItem(KEYS.THEME, theme);
  updateThemeUI(theme);
  
  if (animate) setTimeout(() => html.style.transition = '', 400);
}

function updateThemeUI(theme) {
  document.querySelectorAll('.segment-btn').forEach(btn => {
    if (btn.dataset.themeVal === theme) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

/* ========================
   ONBOARDING & DYNAMIC PREFS
   ======================== */
function applyUserSettingsUI() {
  // Safe update for DOM nodes
  const safeSetTxt = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };

  const { userName, babyName, gender } = state.settings;
  
  // Set text
  safeSetTxt('ui-baby-name', babyName || 'Bayi');

  // Set gender theme
  document.documentElement.setAttribute('data-gender', gender);
}

function initOnboarding() {
  const overlay = document.getElementById('onboarding-overlay');
  if (!overlay) return;

  // Check if onboarding is needed
  if (!state.settings.onboardingCompleted) {
    overlay.classList.remove('hidden');

    // Pre-fill existing defaults if any
    const dueInput = document.getElementById('onboard-due-date');
    const momInput = document.getElementById('onboard-mother-name');
    const babyInput = document.getElementById('onboard-baby-name');
    
    if (dueInput) dueInput.value = state.settings.dueDate;
    if (momInput) momInput.value = state.settings.userName;
    if (babyInput) babyInput.value = state.settings.babyName;

    let selectedGender = 'girl';
    const genderOpts = document.querySelectorAll('.gender-option');
    genderOpts.forEach(btn => {
      btn.addEventListener('click', () => {
        genderOpts.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedGender = btn.dataset.obGender;
        haptic('light');
        // Preview theme
        document.documentElement.setAttribute('data-gender', selectedGender);
      });
    });

    document.getElementById('btn-finish-onboarding').addEventListener('click', () => {
      // Validate
      if (dueInput && dueInput.value) state.settings.dueDate = dueInput.value;
      if (momInput && momInput.value) state.settings.userName = momInput.value;
      if (babyInput && babyInput.value) state.settings.babyName = babyInput.value;
      state.settings.gender = selectedGender;
      state.settings.onboardingCompleted = true;

      saveData();
      applyUserSettingsUI();
      updateCountdown();

      // Fancy exit
      haptic('success');
      overlay.style.opacity = '0';
      overlay.style.filter = 'blur(10px)';
      overlay.style.pointerEvents = 'none';
      setTimeout(() => overlay.classList.add('hidden'), 500);
      showToast('🎉 Selamat datang, persiapan dimulai!');
    });
  } else {
    applyUserSettingsUI();
  }
}

/* ========================
   DUE DATE COUNTDOWN
   ======================== */
function updateCountdown() {
  const target = new Date(state.settings.dueDate + 'T00:00:00');
  const now = new Date();
  const diff = target - now;

  const dateDisplay = document.getElementById('hero-date-display');
  if (dateDisplay) {
    dateDisplay.textContent = target.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  if (diff <= 0) {
    setCountdown('00', '00', '00', '00');
    const heroWeek = document.getElementById('hero-week');
    if (heroWeek) heroWeek.textContent = `🎉 Selamat atas kelahiran ${state.settings.babyName || 'Bayimu'}!`;
    return;
  }

  const days    = Math.floor(diff / 86400000);
  const hours   = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000)  / 60000);
  const seconds = Math.floor((diff % 60000)    / 1000);

  setCountdown(
    String(days).padStart(2, '0'),
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0')
  );

  // Pregnancy week calculation
  const conception = new Date(target);
  conception.setDate(conception.getDate() - 280);
  const weekMs = now - conception;
  const week = Math.floor(weekMs / (7 * 86400000));
  const day  = Math.floor((weekMs % (7 * 86400000)) / 86400000);
  const heroWeek = document.getElementById('hero-week');
  if (heroWeek && week > 0 && week <= 42) {
    heroWeek.textContent = `✨ Minggu ${week}, Hari ${day} kehamilan`;
  }
}

function setCountdown(d, h, m, s) {
  document.getElementById('cd-days').textContent = d;
  document.getElementById('cd-hours').textContent = h;
  document.getElementById('cd-minutes').textContent = m;
  document.getElementById('cd-seconds').textContent = s;
}

/* ========================
   TAB NAVIGATION
   ======================== */
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
      haptic('light');
    });
  });
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tabName)
  );
  document.querySelectorAll('.panel').forEach(p =>
    p.classList.toggle('active', p.id === `panel-${tabName}`)
  );
}

/* ========================
   CONTRACTION TIMER
   ======================== */
function initContractionTimer() {
  const btnToggle  = document.getElementById('btn-contraction-toggle');
  const btnReset   = document.getElementById('btn-contraction-reset');
  const btnClear   = document.getElementById('btn-clear-contractions');
  const btnDismissWarning = document.getElementById('btn-dismiss-warning');

  btnToggle.addEventListener('click', toggleContractionTimer);
  btnReset.addEventListener('click', resetContractionTimer);
  btnClear.addEventListener('click', () => {
    if (confirm('Hapus semua riwayat kontraksi?')) {
      state.contractions = [];
      saveData();
      renderContractionLog();
      updateContractionStats();
      checkLaborPattern();
    }
  });

  if (btnDismissWarning) {
    btnDismissWarning.addEventListener('click', () => {
      document.getElementById('labor-alert-warning').classList.add('hidden');
      state.warningDismissed = true;
    });
  }

  document.querySelectorAll('.intensity-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.intensity-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.timer.currentIntensity = btn.dataset.val;
      haptic('light');
    });
  });

  // Critical overlay dismiss
  document.getElementById('btn-dismiss-critical').addEventListener('click', () => {
    document.getElementById('critical-overlay').classList.add('hidden');
    state.criticalDismissedAt = Date.now();
    haptic('medium');
  });

  renderContractionLog();
  updateContractionStats();
}

function toggleContractionTimer() {
  if (state.timer.active) {
    stopContraction();
  } else {
    startContraction();
  }
}

function startContraction() {
  state.timer.active = true;
  state.timer.startTime = Date.now();

  const btn     = document.getElementById('btn-contraction-toggle');
  const btnText = document.getElementById('btn-contraction-text');
  const display = document.getElementById('timer-display');
  const subtitle = document.getElementById('timer-subtitle');

  btn.classList.remove('pulse-anim');
  btn.classList.add('recording');
  btnText.textContent = 'BERHENTI';
  display.classList.add('active');
  if (subtitle) subtitle.textContent = 'Kontraksi berlangsung...';
  document.getElementById('btn-contraction-reset').style.display = 'none';
  document.getElementById('intensity-picker').classList.remove('hidden');

  haptic('medium');

  state.timer.intervalId = setInterval(() => {
    const elapsed = Date.now() - state.timer.startTime;
    const m = Math.floor(elapsed / 60000);
    const s = Math.floor((elapsed % 60000) / 1000);
    document.getElementById('timer-display').textContent =
      `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }, 500);
}

function stopContraction() {
  if (!state.timer.active) return;

  const duration = Date.now() - state.timer.startTime;
  clearInterval(state.timer.intervalId);
  state.timer.active = false;

  // Calculate interval from previous
  let interval = null;
  if (state.contractions.length > 0) {
    const last = state.contractions[0];
    interval = state.timer.startTime - last.startTime;
  }

  const contraction = {
    id: Date.now(),
    startTime: state.timer.startTime,
    duration: duration,
    intensity: state.timer.currentIntensity,
    interval: interval,
  };

  state.contractions.unshift(contraction);
  saveData();

  // Reset UI
  const btn     = document.getElementById('btn-contraction-toggle');
  const btnText = document.getElementById('btn-contraction-text');
  const display = document.getElementById('timer-display');
  const subtitle = document.getElementById('timer-subtitle');
  const resetBtn = document.getElementById('btn-contraction-reset');

  btn.classList.remove('recording');
  btn.classList.add('pulse-anim');
  btnText.textContent = 'MULAI';
  display.classList.remove('active');
  document.getElementById('intensity-picker').classList.add('hidden');
  resetBtn.style.display = 'inline-flex';

  const dSec = Math.round(duration / 1000);
  display.textContent = `${String(Math.floor(dSec/60)).padStart(2,'0')}:${String(dSec%60).padStart(2,'0')}`;
  if (subtitle) subtitle.textContent = `Durasi: ${formatDuration(duration)} • Tersimpan ✓`;

  haptic('success');
  showToast(`✓ Kontraksi ${formatDuration(duration)} dicatat`);

  renderContractionLog();
  updateContractionStats();
  checkLaborPattern();
}

function resetContractionTimer() {
  clearInterval(state.timer.intervalId);
  state.timer.active = false;
  state.timer.startTime = null;

  document.getElementById('timer-display').textContent = '00:00';
  document.getElementById('timer-display').classList.remove('active');
  document.getElementById('btn-contraction-text').textContent = 'MULAI';
  document.getElementById('btn-contraction-toggle').classList.remove('recording');
  document.getElementById('btn-contraction-toggle').classList.add('pulse-anim');
  document.getElementById('btn-contraction-reset').style.display = 'none';
  document.getElementById('intensity-picker').classList.add('hidden');
  const subtitle = document.getElementById('timer-subtitle');
  if (subtitle) subtitle.textContent = 'Tekan mulai saat kontraksi dimulai';
  haptic('light');
}

function updateContractionStats() {
  const statsDiv = document.getElementById('contraction-stats');
  if (state.contractions.length === 0) {
    statsDiv.classList.add('hidden');
    return;
  }
  statsDiv.classList.remove('hidden');

  const avgDuration = state.contractions.reduce((a, c) => a + c.duration, 0) / state.contractions.length;
  const withInterval = state.contractions.filter(c => c.interval !== null);
  const avgInterval = withInterval.length > 0
    ? withInterval.reduce((a, c) => a + c.interval, 0) / withInterval.length
    : null;

  document.getElementById('stat-avg-duration').textContent = formatDuration(avgDuration);
  document.getElementById('stat-avg-interval').textContent = avgInterval ? formatDuration(avgInterval) : '--';
  document.getElementById('stat-count').textContent = state.contractions.length;
}

function renderContractionLog() {
  const container = document.getElementById('contraction-log');
  container.innerHTML = '';

  if (state.contractions.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      </div>
      <div class="empty-state-title">Belum ada kontraksi</div>
      <div class="empty-state-desc">Tekan MULAI saat kamu mulai merasakan kontraksi pertama.</div>
    </div>`;
    return;
  }

  state.contractions.forEach((c, idx) => {
    const intervalSec = c.interval !== null ? c.interval / 1000 : null;
    let intervalBadge = '';
    if (intervalSec !== null) {
      const iMin = Math.floor(intervalSec / 60);
      const iSec = Math.round(intervalSec % 60);
      const label = `${iMin}m ${iSec}s`;
      const cls = intervalSec < 240 ? 'badge-red' : intervalSec < 300 ? 'badge-amber' : 'badge-green';
      intervalBadge = `<span class="log-item-badge ${cls}">${label}</span>`;
    }

    const item = document.createElement('div');
    item.className = 'log-item';
    item.dataset.id = c.id;
    item.innerHTML = `
      <span class="log-item-num">${state.contractions.length - idx}</span>
      <div class="log-item-body">
        <div class="log-item-title">${formatTime(c.startTime)} · ${formatDuration(c.duration)}</div>
        <div class="log-item-meta">
          <span class="log-item-badge badge-${c.intensity}" style="margin-right:4px;">${c.intensity}</span>
          ${intervalSec !== null ? `Jarak: ${intervalBadge}` : 'Kontraksi pertama'}
        </div>
      </div>
      <button class="log-item-delete" data-delete="contraction" data-id="${c.id}" aria-label="Hapus">✕</button>
    `;
    container.appendChild(item);
  });

  container.querySelectorAll('[data-delete="contraction"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      state.contractions = state.contractions.filter(c => c.id !== id);
      saveData();
      renderContractionLog();
      updateContractionStats();
      checkLaborPattern();
      haptic('light');
    });
  });
}

/* ========================
   LABOR PATTERN DETECTION
   ======================== */
function analyzeContractionPattern(contractions) {
  const TEN_MIN_MS = 10 * 60 * 1000;
  const now = Date.now();

  // Contractions that started within the last 10 minutes
  const recent = contractions.filter(c => now - c.startTime < TEN_MIN_MS);
  if (recent.length < 3) return null;

  // Sort ascending by start time
  const sorted = [...recent].sort((a, b) => a.startTime - b.startTime);

  // Calculate intervals between adjacent contractions
  const intervals = [];
  for (let i = 1; i < sorted.length; i++) {
    intervals.push(sorted[i].startTime - sorted[i - 1].startTime);
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const avgDuration = sorted.reduce((a, c) => a + c.duration, 0) / sorted.length;

  // RED ALERT: Active labor (4+ contractions, <4 min intervals, >45s duration)
  if (sorted.length >= 4 && avgInterval < 4 * 60 * 1000 && avgDuration > 45 * 1000) {
    return {
      level: 'critical',
      count: sorted.length,
      avgInterval,
      avgDuration,
      title: 'Waktunya ke RS!',
      message: 'Kontraksi sudah teratur dan kuat. Segera hubungi dokter atau pergi ke rumah sakit.',
    };
  }

  // AMBER WARNING: Early labor (3+ contractions, <5 min intervals)
  if (sorted.length >= 3 && avgInterval < 5 * 60 * 1000) {
    return {
      level: 'warning',
      count: sorted.length,
      avgInterval,
      avgDuration,
      title: 'Perhatian',
      message: 'Kontraksi mulai sering. Terus pantau dan siapkan diri untuk ke RS.',
    };
  }

  return null;
}

function checkLaborPattern() {
  const result = analyzeContractionPattern(state.contractions);
  const warningEl  = document.getElementById('labor-alert-warning');
  const criticalEl = document.getElementById('critical-overlay');

  // Clear both if no pattern
  if (!result) {
    warningEl.classList.add('hidden');
    state.warningDismissed = false;
    return;
  }

  const iMin = Math.round(result.avgInterval / 60000);
  const iSec = Math.round((result.avgInterval % 60000) / 1000);
  const dSec = Math.round(result.avgDuration / 1000);

  if (result.level === 'critical') {
    warningEl.classList.add('hidden');

    // Only show critical overlay if not recently dismissed (30 min cool-down)
    const cooldown = 30 * 60 * 1000;
    const dismissed = state.criticalDismissedAt;
    if (!dismissed || (Date.now() - dismissed > cooldown)) {
      // Update modal stats
      document.getElementById('crit-count').textContent   = result.count;
      document.getElementById('crit-interval').textContent = `${iMin}m ${iSec}s`;
      document.getElementById('crit-duration').textContent = `${dSec}s`;

      // Update contact links from settings
      const partnerPhone  = state.settings.partnerPhone;
      const doctorPhone   = state.settings.doctorPhone;
      const partnerBtn = document.getElementById('crit-partner-btn');
      const doctorBtn  = document.getElementById('crit-doctor-btn');

      if (partnerBtn) partnerBtn.href = partnerPhone ? `tel:${partnerPhone}` : '#';
      if (doctorBtn)  doctorBtn.href  = doctorPhone  ? `https://wa.me/${doctorPhone.replace(/\D/g,'')}` : '#';

      criticalEl.classList.remove('hidden');
      haptic('error');
      // Auto-hide critical after 30 minutes
      setTimeout(() => {
        criticalEl.classList.add('hidden');
        state.criticalDismissedAt = Date.now();
      }, cooldown);
    }

  } else if (result.level === 'warning') {
    criticalEl.classList.add('hidden');
    if (!state.warningDismissed) {
      document.getElementById('alert-warning-title').textContent = result.title;
      document.getElementById('alert-warning-desc').textContent  = result.message;
      warningEl.classList.remove('hidden');
      haptic('double');
    }
  }
}

/* ========================
   BABY MOVEMENTS
   ======================== */
function initMovements() {
  document.getElementById('btn-kick').addEventListener('click', logKick);
  document.getElementById('btn-undo-kick').addEventListener('click', undoKick);
  document.getElementById('btn-clear-movements').addEventListener('click', () => {
    if (confirm('Hapus semua riwayat gerakan?')) {
      state.movements = [];
      saveData();
      renderMovementLog();
      updateMovementStats();
    }
  });

  renderMovementLog();
  updateMovementStats();
}

function logKick() {
  const movement = { id: Date.now(), timestamp: Date.now() };
  state.movements.unshift(movement);
  saveData();

  haptic('success');
  // Bounce animation on kick count
  const countEl = document.getElementById('kick-count');
  countEl.classList.remove('kick-bounce');
  void countEl.offsetWidth; // reflow
  countEl.classList.add('kick-bounce');
  setTimeout(() => countEl.classList.remove('kick-bounce'), 500);

  updateMovementStats();
  renderMovementLog();
  showToast('👣 Gerakan bayi dicatat!');
}

function undoKick() {
  if (state.movements.length === 0) { showToast('Tidak ada gerakan untuk dibatalkan'); return; }
  state.movements.shift();
  saveData();
  haptic('light');
  updateMovementStats();
  renderMovementLog();
  showToast('↩️ Gerakan terakhir dibatalkan');
}

function updateMovementStats() {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const weekStart  = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7);

  const todayCount = state.movements.filter(m => m.timestamp >= todayStart.getTime()).length;
  const weekCount  = state.movements.filter(m => m.timestamp >= weekStart.getTime()).length;

  document.getElementById('kick-count').textContent       = todayCount;
  document.getElementById('stat-kicks-today').textContent = todayCount;
  document.getElementById('stat-kicks-week').textContent  = weekCount;

  // Goal bar
  const pct = Math.min(100, (todayCount / 10) * 100);
  document.getElementById('kick-goal-fill').style.width = pct + '%';

  const hint = document.getElementById('kick-hint-text');
  if (hint) {
    if (todayCount >= 10) {
      hint.textContent = `🎉 Target tercapai! ${state.settings.babyName || 'Bayimu'} aktif hari ini.`;
    } else {
      hint.textContent = `${10 - todayCount} gerakan lagi untuk mencapai target harian`;
    }
  }
}

function renderMovementLog() {
  const container = document.getElementById('movement-log');
  container.innerHTML = '';

  if (state.movements.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3s-1 1-1 4a12 12 0 0 0 12 12c3 0 4-1 4-4s-1-4-1-4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M22 12h-2"/><path d="M4 12H2"/><path d="M19 19l-1-1"/><path d="M6 6L5 5"/><path d="M19 5l-1 1"/><path d="M6 18l-1 1"/></svg>
      </div>
      <div class="empty-state-title">Pantau gerakan bayi</div>
      <div class="empty-state-desc">Ketuk tombol tendangan setiap kali kamu merasa si kecil bergerak.</div>
    </div>`;
    return;
  }

  state.movements.slice(0, 30).forEach((m, idx) => {
    const item = document.createElement('div');
    item.className = 'log-item';
    item.innerHTML = `
      <span class="log-item-num">${state.movements.length - idx}</span>
      <div class="log-item-body">
        <div class="log-item-title">Gerakan terdeteksi</div>
        <div class="log-item-meta">${formatTime(m.timestamp)}, ${formatDate(m.timestamp)}</div>
      </div>
      <span class="log-item-badge badge-green">👣</span>
    `;
    container.appendChild(item);
  });
}

/* ========================
   SYMPTOMS
   ======================== */
function initSymptoms() {
  document.querySelectorAll('.symptom-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      logSymptom(btn.dataset.symptom);
      btn.classList.add('symptom-flash');
      setTimeout(() => btn.classList.remove('symptom-flash'), 650);
      haptic('light');
    });
  });

  document.getElementById('btn-clear-symptoms').addEventListener('click', () => {
    if (confirm('Hapus semua riwayat gejala?')) {
      state.symptoms = [];
      saveData();
      renderSymptomLog();
    }
  });

  renderSymptomLog();
}

function logSymptom(name) {
  const entry = { id: Date.now(), name, timestamp: Date.now() };
  state.symptoms.unshift(entry);
  saveData();
  renderSymptomLog();
  showToast(`${name} dicatat ✓`);
}

function renderSymptomLog() {
  const container = document.getElementById('symptom-log');
  container.innerHTML = '';

  if (state.symptoms.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
      </div>
      <div class="empty-state-title">Riwayat gejala kosong</div>
      <div class="empty-state-desc">Catatan gejala akan muncul di sini untuk memudahkan konsultasi dokter.</div>
    </div>`;
    return;
  }

  state.symptoms.slice(0, 40).forEach((s, idx) => {
    const item = document.createElement('div');
    item.className = 'log-item';
    item.innerHTML = `
      <span class="log-item-num">${idx + 1}</span>
      <div class="log-item-body">
        <div class="log-item-title">${s.name}</div>
        <div class="log-item-meta">${formatTime(s.timestamp)}, ${formatDate(s.timestamp)}</div>
      </div>
      <button class="log-item-delete" data-delete="symptom" data-id="${s.id}" aria-label="Hapus">✕</button>
    `;
    container.appendChild(item);
  });

  container.querySelectorAll('[data-delete="symptom"]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.symptoms = state.symptoms.filter(s => s.id !== Number(btn.dataset.id));
      saveData();
      renderSymptomLog();
      haptic('light');
    });
  });
}

/* ========================
   HOSPITAL BAG
   ======================== */
function initBag() {
  // Restore checklist state
  document.querySelectorAll('[data-bag]').forEach(chk => {
    chk.checked = !!state.checklist[chk.dataset.bag];
    chk.addEventListener('change', (e) => {
      state.checklist[chk.dataset.bag] = chk.checked;
      saveData();
      updateBagProgress();
      if (chk.checked) {
        haptic('medium');
        const rect = e.target.getBoundingClientRect();
        createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      } else {
        haptic('light');
      }
    });
  });

  // Category toggles
  document.querySelectorAll('.bag-cat-title').forEach(title => {
    title.addEventListener('click', () => {
      const listId = title.dataset.toggle;
      const list = document.getElementById(listId);
      if (!list) return;
      const collapsed = list.classList.toggle('collapsed-list');
      title.classList.toggle('collapsed', collapsed);
      haptic('light');
    });
  });

  updateBagProgress();
}

function createConfetti(x, y) {
  const colors = ['var(--success)', 'var(--accent)', 'var(--warning)', 'var(--teal)'];
  for (let i = 0; i < 10; i++) {
    const el = document.createElement('div');
    el.className = 'particle';
    el.style.left = (x - 3) + 'px';
    el.style.top = (y - 3) + 'px';
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    
    const angle = Math.random() * Math.PI * 2;
    const velocity = 15 + Math.random() * 20; // Reduced velocity so it doesn't fly out of view instantly
    const tx = Math.cos(angle) * velocity;
    const ty = Math.sin(angle) * velocity - 10;
    
    el.style.setProperty('--tx', `${tx}px`);
    el.style.setProperty('--ty', `${ty}px`);
    
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 800);
  }
}

function updateBagProgress() {
  const allItems = document.querySelectorAll('[data-bag]');
  const total    = allItems.length;
  const checked  = document.querySelectorAll('[data-bag]:checked').length;
  const pct      = total > 0 ? Math.round((checked / total) * 100) : 0;

  document.getElementById('bag-progress-fill').style.width = pct + '%';
  document.getElementById('bag-progress-text').textContent = pct + '%';

  if (pct === 100 && total > 0) {
    showToast('🎉 Tas RS sudah siap! 100% terpenuhi!');
    haptic('success');
  }

  // Update per-category counts
  const categories = { dokumen: 5, ibu: 9, bayi: 7, pendamping: 4 };
  Object.entries(categories).forEach(([cat, max]) => {
    const catChecked = document.querySelectorAll(`#cat-${cat} [data-bag]:checked`).length;
    const countEl = document.getElementById(`count-${cat}`);
    if (countEl) countEl.textContent = `${catChecked}/${max}`;
  });
}

/* ========================
   SETTINGS
   ======================== */
function initSettings() {
  // Populate fields
  const safe = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  safe('setting-due-date',      state.settings.dueDate);
  safe('setting-name',          state.settings.userName);
  safe('setting-baby-name',     state.settings.babyName);
  safe('setting-partner-phone', state.settings.partnerPhone);
  safe('setting-doctor-phone',  state.settings.doctorPhone);
  safe('setting-hospital-name', state.settings.hospitalName);
  safe('setting-hospital-phone',state.settings.hospitalPhone);

  const genderSelect = document.getElementById('setting-gender');
  if (genderSelect) genderSelect.value = state.settings.gender || 'girl';

  // Theme toggle in settings
  document.querySelectorAll('.segment-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      applyTheme(e.target.dataset.themeVal);
      haptic('medium');
    });
  });

  // Listen for settings changes
  const onSettingsChange = () => {
    state.settings.dueDate       = document.getElementById('setting-due-date')?.value || state.settings.dueDate;
    state.settings.userName       = document.getElementById('setting-name')?.value || '';
    state.settings.babyName       = document.getElementById('setting-baby-name')?.value || '';
    state.settings.partnerPhone   = document.getElementById('setting-partner-phone')?.value || '';
    state.settings.doctorPhone    = document.getElementById('setting-doctor-phone')?.value || '';
    state.settings.hospitalName   = document.getElementById('setting-hospital-name')?.value || '';
    state.settings.hospitalPhone  = document.getElementById('setting-hospital-phone')?.value || '';
    
    if (genderSelect) state.settings.gender = genderSelect.value;

    saveData();
    applyUserSettingsUI();
    haptic('light');
  };

  ['setting-due-date', 'setting-name', 'setting-baby-name', 'setting-gender', 'setting-partner-phone','setting-doctor-phone',
   'setting-hospital-name', 'setting-hospital-phone'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', onSettingsChange);
  });

  // Export data
  document.getElementById('btn-export-data').addEventListener('click', exportData);

  // Clear all
  document.getElementById('btn-clear-all-data').addEventListener('click', () => {
    if (confirm('Hapus SEMUA data aplikasi? Ini tidak dapat dibatalkan.')) {
      if (confirm('Yakin? Semua kontraksi, gerakan, dan gejala akan hilang.')) {
        Object.values(KEYS).forEach(k => { if (typeof k === 'string') localStorage.removeItem(k); });
        location.reload();
      }
    }
  });
}

function exportData() {
  const data = {
    exportedAt: new Date().toISOString(),
    contractions: state.contractions,
    movements:    state.movements,
    symptoms:     state.symptoms,
    checklist:    state.checklist,
    settings:     state.settings,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `expecting-baby-g-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📤 Data berhasil diekspor');
  haptic('success');
}

/* ========================
   HELPER UTILITIES
   ======================== */
function formatDuration(ms) {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m === 0) return `${s}d`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}d`;
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

/* ========================
   MAIN INIT
   ======================== */
function init() {
  loadData();
  initTheme();
  initOnboarding();
  initTabs();
  initContractionTimer();
  initMovements();
  initSymptoms();
  initBag();
  initSettings();

  // Start countdown
  updateCountdown();
  setInterval(updateCountdown, 1000);

  // Pattern check on load (resume state)
  checkLaborPattern();



  // Online / offline status
  window.addEventListener('online',  () => showToast('✅ Terhubung ke internet'));
  window.addEventListener('offline', () => showToast('📵 Mode offline — data tetap aman'));
}

document.addEventListener('DOMContentLoaded', init);
