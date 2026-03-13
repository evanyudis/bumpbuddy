/* ===================================
   BumpBuddy — App Logic
   Pregnancy Companion (Indonesian)
   =================================== */

(function () {
  'use strict';

  // ─── CONFIG ─────────────────────────
  const DUE_DATE = new Date('2026-04-14T00:00:00+07:00');
  const STORAGE_KEYS = {
    contractions: 'bb_contractions',
    movements: 'bb_movements',
    symptoms: 'bb_symptoms',
    bag: 'bb_bag',
  };

  // ─── STATE ──────────────────────────
  let contractionTimer = null;
  let contractionStart = null;
  let contractionSeconds = 0;
  let selectedIntensity = 'sedang';

  // ─── HELPERS ────────────────────────
  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }

  function load(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  }
  function save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  function fmtTime(date) {
    return new Date(date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }
  function fmtDate(date) {
    return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function fmtDuration(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}d`;
  }
  function padZ(n) { return String(n).padStart(2, '0'); }

  function toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    $('#toast-container').appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  // ─── COUNTDOWN ──────────────────────
  function updateCountdown() {
    const now = new Date();
    let diff = DUE_DATE - now;
    if (diff < 0) diff = 0;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    $('#cd-days').textContent = days;
    $('#cd-hours').textContent = padZ(hours);
    $('#cd-minutes').textContent = padZ(minutes);
    $('#cd-seconds').textContent = padZ(seconds);

    // Calculate weeks
    const conceptionEst = new Date(DUE_DATE);
    conceptionEst.setDate(conceptionEst.getDate() - 280);
    const weeksDiff = (now - conceptionEst) / (1000 * 60 * 60 * 24 * 7);
    const weeks = Math.floor(weeksDiff);
    const daysExtra = Math.floor((weeksDiff - weeks) * 7);

    if (weeks >= 0 && weeks <= 42) {
      $('#hero-week').textContent = `Minggu ${weeks}, Hari ${daysExtra} 🌸`;
    } else {
      $('#hero-week').textContent = '';
    }
  }

  // ─── TABS ───────────────────────────
  function initTabs() {
    $$('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        $$('.panel').forEach(p => p.classList.remove('active'));
        $(`#panel-${btn.dataset.tab}`).classList.add('active');
      });
    });
  }

  // ─── CONTRACTION TIMER ──────────────
  function initContractions() {
    const btnToggle = $('#btn-contraction-toggle');
    const btnReset = $('#btn-contraction-reset');
    const display = $('#timer-display');
    const btnText = $('#btn-contraction-text');
    const intensityPicker = $('#intensity-picker');

    // Intensity buttons
    $$('.intensity-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.intensity-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedIntensity = btn.dataset.val;
      });
    });

    btnToggle.addEventListener('click', () => {
      if (!contractionTimer) {
        // START
        contractionStart = Date.now();
        contractionSeconds = 0;
        display.classList.add('active');
        btnToggle.classList.add('recording');
        btnText.textContent = 'Stop';
        btnReset.style.display = 'none';
        intensityPicker.classList.remove('hidden');
        if (navigator.vibrate) navigator.vibrate(50);
        contractionTimer = setInterval(() => {
          contractionSeconds = Math.floor((Date.now() - contractionStart) / 1000);
          const m = Math.floor(contractionSeconds / 60);
          const s = contractionSeconds % 60;
          display.textContent = `${padZ(m)}:${padZ(s)}`;
        }, 250);
      } else {
        // STOP — save contraction
        clearInterval(contractionTimer);
        contractionTimer = null;
        display.classList.remove('active');
        btnToggle.classList.remove('recording');
        btnText.textContent = 'Mulai';
        intensityPicker.classList.add('hidden');
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        
        const entry = {
          id: Date.now(),
          start: contractionStart,
          duration: contractionSeconds,
          intensity: selectedIntensity,
        };

        const data = load(STORAGE_KEYS.contractions);
        data.unshift(entry);
        save(STORAGE_KEYS.contractions, data);

        toast(`Kontraksi dicatat: ${fmtDuration(contractionSeconds)}`);
        renderContractions();
        checkLaborPattern();

        // Reset display after short delay
        setTimeout(() => {
          display.textContent = '00:00';
          btnReset.style.display = 'none';
        }, 600);
      }
    });

    btnReset.addEventListener('click', () => {
      clearInterval(contractionTimer);
      contractionTimer = null;
      contractionSeconds = 0;
      display.textContent = '00:00';
      display.classList.remove('active');
      btnToggle.classList.remove('recording');
      btnText.textContent = 'Mulai';
      btnReset.style.display = 'none';
      intensityPicker.classList.add('hidden');
    });

    $('#btn-clear-contractions').addEventListener('click', () => {
      if (confirm('Hapus semua data kontraksi?')) {
        save(STORAGE_KEYS.contractions, []);
        renderContractions();
        $('#labor-alert').classList.add('hidden');
        toast('Data kontraksi dihapus');
      }
    });

    renderContractions();
    checkLaborPattern();
  }

  function renderContractions() {
    const data = load(STORAGE_KEYS.contractions);
    const container = $('#contraction-log');
    const stats = $('#contraction-stats');

    if (data.length === 0) {
      container.innerHTML = '<p class="empty-state">Belum ada data kontraksi. Tekan "Mulai" untuk memulai.</p>';
      stats.classList.add('hidden');
      return;
    }

    stats.classList.remove('hidden');

    // Stats
    const durations = data.map(d => d.duration);
    const avgDur = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    $('#stat-avg-duration').textContent = fmtDuration(avgDur);
    $('#stat-count').textContent = data.length;

    if (data.length > 1) {
      const intervals = [];
      for (let i = 0; i < data.length - 1; i++) {
        const gap = Math.abs(data[i].start - data[i + 1].start) / 1000;
        intervals.push(gap);
      }
      const avgInt = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
      const im = Math.floor(avgInt / 60);
      const is2 = avgInt % 60;
      $('#stat-avg-interval').textContent = `${im}m ${is2 < 10 ? '0' : ''}${is2}d`;
    } else {
      $('#stat-avg-interval').textContent = '--';
    }

    // List (show latest 20)
    const shown = data.slice(0, 20);
    container.innerHTML = shown.map((c, i) => {
      let intervalText = '';
      if (i < data.length - 1) {
        const gap = Math.abs(c.start - data[i + 1].start) / 1000;
        intervalText = `Jarak: ${fmtDuration(Math.round(gap))}`;
      }
      return `
        <div class="log-item">
          <span class="log-item-icon">⏱️</span>
          <div class="log-item-body">
            <div class="log-item-title">${fmtDuration(c.duration)}</div>
            <div class="log-item-meta">${fmtTime(c.start)}${intervalText ? ' · ' + intervalText : ''}</div>
          </div>
          <span class="log-item-badge badge-${c.intensity}">${c.intensity}</span>
        </div>
      `;
    }).join('');
  }

  function checkLaborPattern() {
    const data = load(STORAGE_KEYS.contractions);
    const alertBanner = $('#labor-alert');
    const alertTitle = $('#alert-title');
    const alertDesc = $('#alert-desc');

    // Need at least 3 contractions in last 10 minutes
    const now = Date.now();
    const tenMinsMs = 10 * 60 * 1000;
    const recent = data.filter(c => (now - c.start) < tenMinsMs);

    if (recent.length < 3) {
      alertBanner.classList.add('hidden');
      return;
    }

    // Calculate avg interval and duration for the recent contractions
    const intervals = [];
    for (let i = 0; i < recent.length - 1; i++) {
        intervals.push(Math.abs(recent[i].start - recent[i + 1].start) / 1000);
    }

    const avgInterval = intervals.length ? intervals.reduce((a, b) => a + b, 0) / intervals.length : Infinity;
    const avgDuration = recent.length ? recent.reduce((a, c) => a + c.duration, 0) / recent.length : 0;

    // Red alert: 4+ contractions in 10 min, avg interval < 4 min, avg duration > 45 sec
    if (recent.length >= 4 && avgInterval < 240 && avgDuration > 45) {
      alertBanner.classList.remove('hidden');
      alertBanner.style.background = 'linear-gradient(135deg, rgba(232, 107, 107, 0.25) 0%, rgba(245, 192, 109, 0.10) 100%)';
      alertBanner.style.borderColor = 'var(--danger)';
      alertTitle.textContent = 'Waktunya ke RS!';
      alertTitle.style.color = 'var(--danger)';
      alertDesc.textContent = 'Kontraksi Anda sudah sangat dekat (jarak < 4 menit) dan kuat. Segera hubungi dokter atau ke RS.';
      $('.emergency-btn').style.display = 'inline-block';
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]);
    }
    // Amber warning: 3+ contractions in 10 min, interval < 5 min
    else if (recent.length >= 3 && avgInterval < 300) {
      alertBanner.classList.remove('hidden');
      alertBanner.style.background = 'linear-gradient(135deg, rgba(245, 192, 109, 0.25) 0%, rgba(232, 164, 200, 0.10) 100%)';
      alertBanner.style.borderColor = 'var(--warning)';
      alertTitle.textContent = 'Pola kontraksi terdeteksi';
      alertTitle.style.color = 'var(--warning)';
      alertDesc.textContent = 'Kontraksi Anda teratur (< 5 menit). Bersiaplah dan perhatikan letak gerak bayi.';
      $('.emergency-btn').style.display = 'none';
    } 
    else {
      alertBanner.classList.add('hidden');
    }
  }

  // ─── BABY MOVEMENTS ────────────────
  function initMovements() {
    const btnKick = $('#btn-kick');
    const kickCount = $('#kick-count');

    btnKick.addEventListener('click', () => {
      const data = load(STORAGE_KEYS.movements);
      data.unshift({ id: Date.now(), time: Date.now() });
      save(STORAGE_KEYS.movements, data);

      // Animate
      kickCount.classList.remove('kick-bounce');
      void kickCount.offsetWidth; // trigger reflow
      kickCount.classList.add('kick-bounce');
      if (navigator.vibrate) navigator.vibrate(40);

      toast('Gerakan bayi dicatat! 👶');
      renderMovements();
    });

    $('#btn-clear-movements').addEventListener('click', () => {
      if (confirm('Hapus semua data gerakan?')) {
        save(STORAGE_KEYS.movements, []);
        renderMovements();
        toast('Data gerakan dihapus');
      }
    });

    renderMovements();
  }

  function renderMovements() {
    const data = load(STORAGE_KEYS.movements);
    const container = $('#movement-log');

    // Today's count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTs = today.getTime();
    const todayKicks = data.filter(d => d.time >= todayTs).length;

    // Week count
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekKicks = data.filter(d => d.time >= weekAgo).length;

    $('#kick-count').textContent = todayKicks;
    $('#stat-kicks-today').textContent = todayKicks;
    $('#stat-kicks-week').textContent = weekKicks;

    if (data.length === 0) {
      container.innerHTML = '<p class="empty-state">Belum ada data gerakan. Tekan tombol di atas untuk mencatat.</p>';
      return;
    }

    // Group by day, show latest 15
    const shown = data.slice(0, 15);
    container.innerHTML = shown.map(d => `
      <div class="log-item">
        <span class="log-item-icon">👣</span>
        <div class="log-item-body">
          <div class="log-item-title">Gerakan Bayi</div>
          <div class="log-item-meta">${fmtTime(d.time)} · ${fmtDate(d.time)}</div>
        </div>
      </div>
    `).join('');
  }

  // ─── SYMPTOMS ───────────────────────
  function initSymptoms() {
    $$('.symptom-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const data = load(STORAGE_KEYS.symptoms);
        data.unshift({
          id: Date.now(),
          symptom: btn.dataset.symptom,
          time: Date.now(),
        });
        save(STORAGE_KEYS.symptoms, data);

        // Animate
        btn.classList.remove('symptom-flash');
        void btn.offsetWidth;
        btn.classList.add('symptom-flash');

        toast(`${btn.dataset.symptom} dicatat`);
        renderSymptoms();
      });
    });

    $('#btn-clear-symptoms').addEventListener('click', () => {
      if (confirm('Hapus semua data gejala?')) {
        save(STORAGE_KEYS.symptoms, []);
        renderSymptoms();
        toast('Data gejala dihapus');
      }
    });

    renderSymptoms();
  }

  function renderSymptoms() {
    const data = load(STORAGE_KEYS.symptoms);
    const container = $('#symptom-log');

    if (data.length === 0) {
      container.innerHTML = '<p class="empty-state">Belum ada gejala dicatat.</p>';
      return;
    }

    const emojiMap = {
      'Mual': '🤢', 'Pusing': '😵', 'Nyeri Punggung': '🔙', 'Kram Perut': '😖',
      'Bengkak': '🦶', 'Sakit Kepala': '🤕', 'Kelelahan': '😴', 'Insomnia': '🌙',
      'Heartburn': '🔥', 'Sesak Napas': '💨', 'Sering BAK': '🚽', 'Mood Swing': '😢',
    };

    const shown = data.slice(0, 20);
    container.innerHTML = shown.map(s => `
      <div class="log-item">
        <span class="log-item-icon">${emojiMap[s.symptom] || '📝'}</span>
        <div class="log-item-body">
          <div class="log-item-title">${s.symptom}</div>
          <div class="log-item-meta">${fmtTime(s.time)} · ${fmtDate(s.time)}</div>
        </div>
      </div>
    `).join('');
  }

  // ─── HOSPITAL BAG ──────────────────
  function initBag() {
    const savedBag = load(STORAGE_KEYS.bag);
    const allCheckboxes = $$('#bag-checklist input[type="checkbox"]');

    // Restore state
    savedBag.forEach(key => {
      const el = document.querySelector(`input[data-bag="${key}"]`);
      if (el) el.checked = true;
    });

    // Listen for changes
    allCheckboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        const checked = [];
        allCheckboxes.forEach(c => { if (c.checked) checked.push(c.dataset.bag); });
        save(STORAGE_KEYS.bag, checked);
        updateBagProgress();
      });
    });

    // Category collapse
    $$('.bag-cat-title').forEach(title => {
      title.addEventListener('click', () => {
        const list = $(`#${title.dataset.toggle}`);
        title.classList.toggle('collapsed');
        list.classList.toggle('collapsed-list');
      });
    });

    updateBagProgress();
  }

  function updateBagProgress() {
    const all = $$('#bag-checklist input[type="checkbox"]');
    const checked = $$('#bag-checklist input[type="checkbox"]:checked');
    const pct = all.length ? Math.round((checked.length / all.length) * 100) : 0;

    $('#bag-progress-fill').style.width = `${pct}%`;
    $('#bag-progress-text').textContent = `${pct}%`;
  }

  // ─── INIT ──────────────────────────
  function init() {
    updateCountdown();
    setInterval(updateCountdown, 1000);
    initTabs();
    initContractions();
    initMovements();
    initSymptoms();
    initBag();

    // Offline status detection
    window.addEventListener('offline', () => toast('Anda sedang offline. Data tetap aman.'));
    window.addEventListener('online', () => toast('Kembali online!'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
