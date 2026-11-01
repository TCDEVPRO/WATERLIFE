/**
 * WATERLIFE - Reto Gamificado de Hidratación Estilo Duolingo
 */

const STORAGE_KEY = 'waterlife_app_data_v4';

const defaultState = {
  onboardingDone: false,
  goal: 2500,
  weight: 70,
  height: 175,
  todayIntake: 0,
  streak: 0,
  lastActiveDate: null,
  todayCompleted: false,
  canUndo: false,
  lastDrinkAmount: 0,
  customContainers: [],
  weeklyLogs: {},
  notificationsEnabled: false,
  lastNotificationTime: null
};

let appState = loadState();
let pendingStreakLostAnimation = false;
let previousStreakCount = 0;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...defaultState, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Error cargando estado:', e);
  }
  return { ...defaultState };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  } catch (e) {
    console.error('Error guardando estado:', e);
  }
}

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ==========================================
// Sonidos Web Audio API
// ==========================================
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
  if (!audioCtx && AudioContextClass) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playGlugSound() {
  try {
    initAudio();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(750, now + 0.12);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.14);
  } catch (e) {}
}

function playPopSound() {
  try {
    initAudio();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.08);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  } catch (e) {}
}

function playEpicFanfare() {
  try {
    initAudio();
    if (!audioCtx) return;

    const melody = [
      { f: 523.25, d: 0.14 },
      { f: 659.25, d: 0.14 },
      { f: 783.99, d: 0.14 },
      { f: 1046.50, d: 0.45 }
    ];

    let delay = 0;
    melody.forEach(item => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const start = audioCtx.currentTime + delay;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(item.f, start);

      gain.gain.setValueAtTime(0.3, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + item.d);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(start);
      osc.stop(start + item.d);

      delay += item.d;
    });
  } catch (e) {}
}

function playGlassShatterSound() {
  try {
    initAudio();
    if (!audioCtx) return;

    const bufferSize = audioCtx.sampleRate * 0.3;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = audioCtx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, audioCtx.currentTime);

    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    whiteNoise.start(now);
  } catch (e) {}
}

function playTickDownSound() {
  try {
    initAudio();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.04);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  } catch (e) {}
}

// Consejos
const hydrationTips = [
  "Tomar un vaso de agua al despertar activa tus órganos internos y el metabolismo.",
  "Tu cerebro es 75% agua. Mantenerte hidratado previene la fatiga mental y dolores de cabeza.",
  "El agua lubrica tus articulaciones y amortigua la columna vertebral durante el día.",
  "¿Sabías que tener sed ya es un síntoma de deshidratación? ¡Toma agua antes de sentir sed!",
  "Beber agua fría puede ayudarte a quemar un extra de calorías al regular tu temperatura corporal.",
  "El agua mantiene tu piel elástica, radiante y retrasa los signos de envejecimiento.",
  "Tomar agua antes de las comidas mejora tu digestión y ayuda a regular el apetito.",
  "¿Te sientes cansado por la tarde? Muchas veces la fatiga no es sueño, sino falta de agua.",
  "Estar bien hidratado mejora tu concentración y estado de ánimo hasta un 14%.",
  "El agua ayuda a tus riñones a filtrar toxinas y desechos del cuerpo eficientemente."
];

let lastTipIndex = -1;

function getRandomTip() {
  let nextIdx;
  do {
    nextIdx = Math.floor(Math.random() * hydrationTips.length);
  } while (nextIdx === lastTipIndex && hydrationTips.length > 1);

  lastTipIndex = nextIdx;
  return hydrationTips[nextIdx];
}

function changeTipWithAnimation() {
  playPopSound();
  const tipMsg = document.getElementById('mascotMessage');
  const sideTip = document.getElementById('sideTipText');
  const mascot = document.getElementById('mascotSvg');

  const newTip = getRandomTip();

  tipMsg.animate([
    { opacity: 0, transform: 'translateY(6px)' },
    { opacity: 1, transform: 'translateY(0)' }
  ], { duration: 250, easing: 'ease-out' });

  tipMsg.textContent = newTip;
  if (sideTip) sideTip.textContent = newTip;

  const mouth = document.getElementById('mascotMouth');
  if (mouth) {
    mouth.classList.remove('mouth-talking-active');
    void mouth.offsetWidth;
    mouth.classList.add('mouth-talking-active');
  }

  mascot.animate([
    { transform: 'scale(1) rotate(0deg)' },
    { transform: 'scale(1.15) rotate(5deg)' },
    { transform: 'scale(0.95) rotate(-4deg)' },
    { transform: 'scale(1) rotate(0deg)' }
  ], { duration: 400, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
}

function checkDayRollover() {
  const today = getTodayString();
  const yesterday = getYesterdayString();

  if (appState.lastActiveDate !== today) {
    if (appState.lastActiveDate) {
      if (!appState.weeklyLogs) appState.weeklyLogs = {};
      appState.weeklyLogs[appState.lastActiveDate] = {
        intake: appState.todayIntake,
        goal: appState.goal,
        completed: appState.todayCompleted
      };

      if ((appState.lastActiveDate !== yesterday || !appState.todayCompleted) && appState.streak > 0) {
        previousStreakCount = appState.streak;
        appState.streak = 0;
        pendingStreakLostAnimation = true;
      }
    }

    appState.todayIntake = 0;
    appState.todayCompleted = false;
    appState.canUndo = false;
    appState.lastActiveDate = today;
    saveState();
  }
}

// ==========================================
// ANIMACIÓN DE PÉRDIDA DE RACHA (TIEMPO TOTAL CONSTANTE)
// ==========================================
function triggerStreakLostAnimation(startDays) {
  const modal = document.getElementById('streakLostModal');
  const fallingGlass = document.getElementById('fallingGlass');
  const lostDisplay = document.getElementById('lostStreakDisplay');

  if (!modal) return;

  modal.classList.add('active');
  lostDisplay.textContent = startDays;

  // Ruptura del vaso idéntico
  setTimeout(() => {
    fallingGlass.classList.add('glass-shatter-anim');
    playGlassShatterSound();
  }, 350);

  // EL TIEMPO TOTAL ES CONSTANTE: Dura unos ~0.6s sin importar si son 5 o 365 días
  setTimeout(() => {
    let current = startDays;
    const totalDuration = 600; // 600 milisegundos totales de animación de resta
    const stepTime = Math.max(10, Math.floor(totalDuration / startDays));

    const interval = setInterval(() => {
      current--;
      if (current <= 0) {
        current = 0;
        clearInterval(interval);
      }
      lostDisplay.textContent = current;
      playTickDownSound();
    }, stepTime);
  }, 850);
}

// ==========================================
// NOTIFICACIONES CON OPCIÓN DE DESACTIVACIÓN
// ==========================================
function setupNotifications() {
  const notifBtn = document.getElementById('toggleNotificationsBtn');

  updateNotifUI();

  if (notifBtn) {
    notifBtn.addEventListener('click', () => {
      // Si ya están activadas, permite desactivar
      if (appState.notificationsEnabled) {
        appState.notificationsEnabled = false;
        saveState();
        updateNotifUI();
        alert("Notificaciones desactivadas.");
        return;
      }

      // Si están desactivadas, solicita permiso
      if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            appState.notificationsEnabled = true;
            saveState();
            updateNotifUI();
            sendDuolingoNotification("¡Notificaciones activadas! 💧", "Te recordaremos tomar agua para mantener tu racha viva 🔥");
          } else {
            alert("Debes permitir las notificaciones en tu navegador.");
          }
        });
      } else {
        alert("Tu navegador no soporta notificaciones.");
      }
    });
  }

  scheduleDuolingoReminders();
}

function updateNotifUI() {
  const notifBtn = document.getElementById('toggleNotificationsBtn');
  const notifStatus = document.getElementById('notifStatusText');

  if (!notifBtn) return;

  if (appState.notificationsEnabled && ('Notification' in window) && Notification.permission === 'granted') {
    notifBtn.innerHTML = '<span>🔕</span> Desactivar Notificaciones';
    notifBtn.style.backgroundColor = '#fecaca';
    notifBtn.style.color = '#991b1b';
    notifBtn.style.borderColor = '#fca5a5';
    if (notifStatus) notifStatus.textContent = "Notificaciones activadas 🔔";
  } else {
    notifBtn.innerHTML = '<span>🔔</span> Activar Notificaciones';
    notifBtn.style.backgroundColor = '#e0f2fe';
    notifBtn.style.color = '#0369a1';
    notifBtn.style.borderColor = '#7dd3fc';
    if (notifStatus) notifStatus.textContent = "Recibe alertas antes de perder tu racha";
  }
}

const duolingoMessages = [
  { title: "¡Gotita te extraña! 💧", body: "No has tomado agua en unas horas. ¡Toma un vaso para que tu racha no se apague!" },
  { title: "¡Mantén tu racha viva! 🔥", body: "Solo un par de tragos de agua te separan de cumplir tu meta de hoy." },
  { title: "¡Hora de un break acuático! 🥤", body: "Tu cerebro y tu cuerpo necesitan hidratación ahora mismo." }
];

function sendDuolingoNotification(customTitle, customBody) {
  if (appState.notificationsEnabled && ('Notification' in window) && Notification.permission === 'granted') {
    const randomMsg = duolingoMessages[Math.floor(Math.random() * duolingoMessages.length)];
    const title = customTitle || randomMsg.title;
    const body = customBody || randomMsg.body;

    const options = {
      body: body,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💧</text></svg>',
      vibrate: [200, 100, 200]
    };

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, options);
      });
    } else {
      new Notification(title, options);
    }
  }
}

function scheduleDuolingoReminders() {
  setInterval(() => {
    if (!appState.notificationsEnabled || appState.todayCompleted) return;

    const now = new Date();
    const currentHour = now.getHours();

    if (currentHour >= 9 && currentHour <= 21) {
      sendDuolingoNotification();
    }
  }, 1000 * 60 * 60 * 3);
}

// UI
function updateUI(animated = false) {
  const percent = Math.min(Math.round((appState.todayIntake / appState.goal) * 100), 100);
  const remaining = Math.max(0, appState.goal - appState.todayIntake);

  const currentIntakeEl = document.getElementById('currentIntake');
  if (currentIntakeEl) currentIntakeEl.textContent = appState.todayIntake.toLocaleString();

  const goalIntakeEl = document.getElementById('goalIntake');
  if (goalIntakeEl) goalIntakeEl.textContent = appState.goal.toLocaleString();

  const waterPercentageEl = document.getElementById('waterPercentage');
  if (waterPercentageEl) waterPercentageEl.textContent = `${percent}%`;

  ['mobileStreakCount', 'desktopStreakCount'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = appState.streak;
  });

  ['mobileNavPercent', 'desktopNavPercent'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = `${percent}%`;
  });

  const waterLiquid = document.getElementById('waterLiquid');
  if (waterLiquid) {
    waterLiquid.style.height = `${percent}%`;
  }

  const challengeBar = document.getElementById('challengeBarFill');
  if (challengeBar) {
    challengeBar.style.width = `${percent}%`;
  }

  const statusBadge = document.getElementById('statusBadge');
  if (statusBadge) {
    if (percent >= 100) {
      statusBadge.innerHTML = '🎉 <strong>¡Meta cumplida con éxito hoy!</strong>';
      statusBadge.style.background = '#dcfce7';
      statusBadge.style.color = '#15803d';
      statusBadge.style.borderColor = '#86efac';
    } else {
      statusBadge.innerHTML = `💧 Faltan <strong id="remainingIntake">${remaining.toLocaleString()}</strong> ml para la meta`;
      statusBadge.style.background = '#e0f2fe';
      statusBadge.style.color = '#0369a1';
      statusBadge.style.borderColor = '#bae6fd';
    }
  }

  const undoBtn = document.getElementById('undoBtn');
  if (undoBtn) {
    undoBtn.disabled = !appState.canUndo;
    if (appState.canUndo && appState.lastDrinkAmount > 0) {
      undoBtn.textContent = `↩️ Deshacer último registro (-${appState.lastDrinkAmount} ml)`;
      undoBtn.style.opacity = '1';
      undoBtn.style.pointerEvents = 'auto';
    } else {
      undoBtn.textContent = '↩️ Deshacer último registro (Solo 1 vez)';
      undoBtn.style.opacity = '0.35';
      undoBtn.style.pointerEvents = 'none';
    }
  }

  const sunglasses = document.getElementById('sunglasses');
  const mascotMouth = document.getElementById('mascotMouth');
  if (percent >= 100) {
    if (sunglasses) sunglasses.style.display = 'block';
    if (mascotMouth) mascotMouth.setAttribute('d', 'M65 110 Q80 132 95 110');
  } else {
    if (sunglasses) sunglasses.style.display = 'none';
    if (mascotMouth) mascotMouth.setAttribute('d', 'M70 114 Q80 126 90 114');
  }

  renderWeekPills();

  if (animated) {
    const mascot = document.getElementById('mascotSvg');
    if (mascot) {
      mascot.animate([
        { transform: 'scale(1)' },
        { transform: 'scale(1.15) rotate(4deg)' },
        { transform: 'scale(0.95) rotate(-3deg)' },
        { transform: 'scale(1)' }
      ], { duration: 400, easing: 'ease-out' });
    }
  }
}

function renderWeekPills() {
  const container = document.getElementById('weekPills');
  if (!container) return;

  container.innerHTML = '';
  const daysNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dayName = daysNames[d.getDay()];
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    const isToday = i === 0;
    const isCompleted = isToday 
      ? appState.todayCompleted 
      : (appState.weeklyLogs && appState.weeklyLogs[dateStr] && appState.weeklyLogs[dateStr].completed);

    const item = document.createElement('div');
    item.className = 'day-item';
    item.innerHTML = `
      <span class="day-label">${dayName}</span>
      <div class="day-circle ${isCompleted ? 'completed' : ''} ${isToday ? 'today' : ''}">
        ${isCompleted ? '✓' : (isToday ? '💧' : '·')}
      </div>
    `;
    container.appendChild(item);
  }
}

function logDrink(amount) {
  initAudio();
  playGlugSound();

  const tambo = document.querySelector('.tambo-container');
  if (tambo) {
    tambo.classList.remove('tambo-splash');
    void tambo.offsetWidth;
    tambo.classList.add('tambo-splash');
  }

  appState.todayIntake += amount;
  appState.lastDrinkAmount = amount;
  appState.canUndo = true;

  const reachedGoal = (appState.todayIntake >= appState.goal);
  const wasAlreadyCompleted = appState.todayCompleted;

  if (reachedGoal && !wasAlreadyCompleted) {
    appState.todayCompleted = true;
    appState.streak += 1;
    saveState();
    updateUI(true);
    triggerEpicCelebration();
  } else {
    saveState();
    updateUI(true);
  }
}

function undoLastDrink() {
  if (!appState.canUndo || !appState.lastDrinkAmount || appState.lastDrinkAmount <= 0) {
    alert("Solo puedes deshacer el último registro 1 sola vez.");
    return;
  }

  const toRemove = appState.lastDrinkAmount;
  appState.todayIntake = Math.max(0, appState.todayIntake - toRemove);
  appState.canUndo = false;
  appState.lastDrinkAmount = 0;

  if (appState.todayIntake < appState.goal && appState.todayCompleted) {
    appState.todayCompleted = false;
    appState.streak = Math.max(0, appState.streak - 1);
  }

  saveState();
  updateUI(false);
}

function triggerEpicCelebration() {
  const modal = document.getElementById('epicCelebration');
  const glassScene = document.getElementById('glassScene');
  const spinningGlass = document.getElementById('spinningGlass');
  const glassLiquid = document.getElementById('glassLiquid');
  const streakScene = document.getElementById('streakScene');
  const celebrationDaysCount = document.getElementById('celebrationDaysCount');

  streakScene.style.display = 'none';
  glassScene.style.display = 'flex';
  glassLiquid.style.height = '0%';
  spinningGlass.classList.remove('spinning-glass-anim');

  celebrationDaysCount.textContent = `${appState.streak} ${appState.streak === 1 ? 'DÍA' : 'DÍAS'}`;
  modal.classList.add('active');

  setTimeout(() => {
    glassLiquid.style.height = '100%';
  }, 300);

  setTimeout(() => {
    spinningGlass.classList.add('spinning-glass-anim');
  }, 1200);

  setTimeout(() => {
    glassScene.style.display = 'none';
    streakScene.style.display = 'flex';
    playEpicFanfare();

    if (typeof confetti === 'function') {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#0284c7', '#38bdf8', '#f97316', '#22c55e', '#ffffff']
      });
    }
  }, 2700);
}

function renderCustomButtons() {
  const buttonsGrid = document.getElementById('buttonsGrid');
  const addBtn = document.getElementById('openAddModalBtn');

  const oldCustoms = buttonsGrid.querySelectorAll('.custom-drink-btn');
  oldCustoms.forEach(btn => btn.remove());

  appState.customContainers.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'duo-btn custom-drink-btn';
    btn.style.borderColor = '#93c5fd';
    btn.style.boxShadow = '0 4px 0 #60a5fa';
    btn.innerHTML = `
      <div class="btn-icon">${item.icon || '🥤'}</div>
      <div class="btn-info">
        <span class="btn-title">${escapeHTML(item.name)}</span>
        <span class="btn-subtitle">+${item.amount} ml</span>
      </div>
    `;

    btn.addEventListener('click', () => logDrink(item.amount));
    buttonsGrid.insertBefore(btn, addBtn);
  });
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function calculateHydrationGoal(weight, height) {
  const base = weight * 35;
  const heightBonus = height > 175 ? 200 : 0;
  return Math.round(base + heightBonus);
}

function updateOnboardingPreview() {
  const w = parseFloat(document.getElementById('onboardingWeight').value) || 70;
  const h = parseFloat(document.getElementById('onboardingHeight').value) || 175;
  const res = calculateHydrationGoal(w, h);
  const liters = (res / 1000).toFixed(2);
  document.getElementById('onboardingResultPreview').textContent = `${res} ml (${liters} L)`;
}

function updateSettingsPreview() {
  const w = parseFloat(document.getElementById('inputWeight').value) || 70;
  const h = parseFloat(document.getElementById('inputHeight').value) || 175;
  const res = calculateHydrationGoal(w, h);
  const liters = (res / 1000).toFixed(2);
  document.getElementById('calcResultPreview').textContent = `${res} ml (${liters} L)`;
}

function initApp() {
  checkDayRollover();
  renderCustomButtons();
  updateUI();
  setupNotifications();

  if (pendingStreakLostAnimation && previousStreakCount > 0) {
    pendingStreakLostAnimation = false;
    setTimeout(() => {
      triggerStreakLostAnimation(previousStreakCount);
    }, 500);
  }

  const onboardingModal = document.getElementById('onboardingModal');
  if (!appState.onboardingDone && onboardingModal && !pendingStreakLostAnimation) {
    onboardingModal.classList.add('active');
    updateOnboardingPreview();
  }

  document.getElementById('closeStreakLostBtn')?.addEventListener('click', () => {
    document.getElementById('streakLostModal').classList.remove('active');
  });

  document.getElementById('testNotifBtn')?.addEventListener('click', () => {
    sendDuolingoNotification("🧪 Prueba de Notificación WATERLIFE", "¡Las alertas están funcionando perfectamente! 💧");
  });

  const onboardingTabCalc = document.getElementById('onboardingTabCalc');
  const onboardingTabManual = document.getElementById('onboardingTabManual');
  const onboardingCalcSection = document.getElementById('onboardingCalcSection');
  const onboardingManualSection = document.getElementById('onboardingManualSection');
  let currentOnboardingMode = 'calc';

  if (onboardingTabCalc && onboardingTabManual) {
    onboardingTabCalc.addEventListener('click', () => {
      onboardingTabCalc.classList.add('active');
      onboardingTabManual.classList.remove('active');
      onboardingCalcSection.classList.add('active');
      onboardingManualSection.classList.remove('active');
      currentOnboardingMode = 'calc';
    });

    onboardingTabManual.addEventListener('click', () => {
      onboardingTabManual.classList.add('active');
      onboardingTabCalc.classList.remove('active');
      onboardingManualSection.classList.add('active');
      onboardingCalcSection.classList.remove('active');
      currentOnboardingMode = 'manual';
    });
  }

  document.querySelectorAll('.goal-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.goal-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const val = chip.getAttribute('data-goal');
      const manualInput = document.getElementById('onboardingManualGoal');
      if (manualInput) manualInput.value = val;
    });
  });

  document.getElementById('onboardingWeight')?.addEventListener('input', updateOnboardingPreview);
  document.getElementById('onboardingHeight')?.addEventListener('input', updateOnboardingPreview);

  const finishOnboarding = (goal, weight, height) => {
    appState.goal = Math.max(500, goal || 2500);
    if (weight) appState.weight = weight;
    if (height) appState.height = height;
    appState.onboardingDone = true;
    saveState();
    updateUI();

    if (onboardingModal) {
      onboardingModal.classList.remove('active');
      onboardingModal.style.display = 'none';
    }
    initAudio();
    playGlugSound();
  };

  const onboardingSubmitBtn = document.getElementById('onboardingSubmitBtn');
  if (onboardingSubmitBtn) {
    onboardingSubmitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentOnboardingMode === 'calc') {
        const w = parseFloat(document.getElementById('onboardingWeight')?.value) || 70;
        const h = parseFloat(document.getElementById('onboardingHeight')?.value) || 175;
        const calculatedGoal = calculateHydrationGoal(w, h);
        finishOnboarding(calculatedGoal, w, h);
      } else {
        const manualGoal = parseInt(document.getElementById('onboardingManualGoal')?.value, 10) || 2500;
        finishOnboarding(manualGoal);
      }
    });
  }

  const onboardingSkipBtn = document.getElementById('onboardingSkipBtn');
  if (onboardingSkipBtn) {
    onboardingSkipBtn.addEventListener('click', (e) => {
      e.preventDefault();
      finishOnboarding(2500, 70, 175);
    });
  }

  document.getElementById('mascotWrapper').addEventListener('click', changeTipWithAnimation);
  document.getElementById('speechBubble').addEventListener('click', changeTipWithAnimation);

  document.querySelectorAll('.duo-btn[data-amount]').forEach(btn => {
    btn.addEventListener('click', () => {
      const amount = parseInt(btn.getAttribute('data-amount'), 10);
      logDrink(amount);
    });
  });

  document.getElementById('undoBtn').addEventListener('click', undoLastDrink);

  document.getElementById('closeCelebrationBtn').addEventListener('click', () => {
    document.getElementById('epicCelebration').classList.remove('active');
  });

  document.getElementById('navTipsBtn')?.addEventListener('click', changeTipWithAnimation);
  document.getElementById('navNotifBtn')?.addEventListener('click', () => {
    document.getElementById('toggleNotificationsBtn')?.click();
  });

  const openSettings = () => {
    document.getElementById('inputWeight').value = appState.weight;
    document.getElementById('inputHeight').value = appState.height;
    document.getElementById('inputManualGoal').value = appState.goal;
    updateSettingsPreview();
    document.getElementById('settingsModal').classList.add('active');
  };

  document.getElementById('navSettingsBtn')?.addEventListener('click', openSettings);
  document.getElementById('mobileSettingsBtn')?.addEventListener('click', openSettings);

  document.getElementById('resetOnboardingBtn')?.addEventListener('click', () => {
    document.getElementById('settingsModal')?.classList.remove('active');
    const onboardingModal = document.getElementById('onboardingModal');
    if (onboardingModal) {
      onboardingModal.style.display = 'flex';
      onboardingModal.classList.add('active');
      updateOnboardingPreview();
    }
  });

  document.getElementById('closeSettingsBtn')?.addEventListener('click', () => {
    document.getElementById('settingsModal').classList.remove('active');
  });

  const tabAuto = document.getElementById('tabAuto');
  const tabManual = document.getElementById('tabManual');
  const calcForm = document.getElementById('calcForm');
  const manualForm = document.getElementById('manualForm');

  tabAuto.addEventListener('click', () => {
    tabAuto.classList.add('active');
    tabManual.classList.remove('active');
    calcForm.classList.add('active');
    manualForm.classList.remove('active');
  });

  tabManual.addEventListener('click', () => {
    tabManual.classList.add('active');
    tabAuto.classList.remove('active');
    manualForm.classList.add('active');
    calcForm.classList.remove('active');
  });

  document.getElementById('inputWeight').addEventListener('input', updateSettingsPreview);
  document.getElementById('inputHeight').addEventListener('input', updateSettingsPreview);

  calcForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const w = parseFloat(document.getElementById('inputWeight').value);
    const h = parseFloat(document.getElementById('inputHeight').value);
    appState.weight = w;
    appState.height = h;
    appState.goal = calculateHydrationGoal(w, h);
    saveState();
    updateUI();
    document.getElementById('settingsModal').classList.remove('active');
  });

  manualForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const manualGoal = parseInt(document.getElementById('inputManualGoal').value, 10);
    if (manualGoal && manualGoal >= 500) {
      appState.goal = manualGoal;
      saveState();
      updateUI();
      document.getElementById('settingsModal').classList.remove('active');
    }
  });

  const addCustomModal = document.getElementById('addCustomModal');
  const openAddModalBtn = document.getElementById('openAddModalBtn');
  const closeAddModalBtn = document.getElementById('closeAddModalBtn');
  let selectedIcon = '🥤';

  openAddModalBtn.addEventListener('click', () => {
    document.getElementById('customName').value = '';
    document.getElementById('customAmount').value = '';
    addCustomModal.classList.add('active');
  });

  closeAddModalBtn.addEventListener('click', () => {
    addCustomModal.classList.remove('active');
  });

  document.querySelectorAll('.icon-choice').forEach(choice => {
    choice.addEventListener('click', () => {
      document.querySelectorAll('.icon-choice').forEach(c => c.classList.remove('active'));
      choice.classList.add('active');
      selectedIcon = choice.getAttribute('data-icon');
    });
  });

  document.getElementById('customDrinkForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('customName').value.trim();
    const amount = parseInt(document.getElementById('customAmount').value, 10);

    if (name && amount > 0) {
      appState.customContainers.push({ name, amount, icon: selectedIcon });
      saveState();
      renderCustomButtons();
      addCustomModal.classList.remove('active');
    }
  });

  [document.getElementById('settingsModal'), addCustomModal].forEach(modal => {
    if (!modal) return;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}