
// App State Variables
let timerInterval = null;
let targetEndTime = null;
let pausedRemainingTime = null;
let isRunning = false;
let isPaused = false;
let currentMode = 'datetime'; // 'datetime' or 'duration'
let soundEnabled = true;

// HTML Elements
const daysEl = document.getElementById('card-days');
const hoursEl = document.getElementById('card-hours');
const minutesEl = document.getElementById('card-minutes');
const secondsEl = document.getElementById('card-seconds');

const statusBadge = document.getElementById('status-badge');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');

const btnStart = document.getElementById('btn-start');
const targetDatetimeInput = document.getElementById('target-datetime');
const displayContainer = document.getElementById('display-container');

const inputHours = document.getElementById('input-hours');
const inputMinutes = document.getElementById('input-minutes');
const inputSeconds = document.getElementById('input-seconds');

// Set default minimum date/time picker to right now
function setInitialDatetime() {
    const now = new Date();
    // Default preset +1 Hour from now
    now.setHours(now.getHours() + 1);

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    targetDatetimeInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Mode Switching UI
function switchMode(mode) {
    currentMode = mode;
    const tabDatetime = document.getElementById('tab-datetime');
    const tabDuration = document.getElementById('tab-duration');
    const modeDatetime = document.getElementById('mode-datetime');
    const modeDuration = document.getElementById('mode-duration');

    if (mode === 'datetime') {
        tabDatetime.className = "flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-300 bg-indigo-600 text-white shadow-md";
        tabDuration.className = "flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-300 text-gray-400 hover:text-white";
        modeDatetime.classList.remove('hidden');
        modeDuration.classList.add('hidden');
    } else {
        tabDuration.className = "flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-300 bg-indigo-600 text-white shadow-md";
        tabDatetime.className = "flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-300 text-gray-400 hover:text-white";
        modeDuration.classList.remove('hidden');
        modeDatetime.classList.add('hidden');
    }
    if (!isRunning && !isPaused) {
        resetDisplayValues();
    }
}

// Web Audio API Alarm Sound (no external files needed)
function playAlarmSound() {
    if (!soundEnabled) return;
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        const playBeep = (freq, time, duration) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime + time);
            gain.gain.setValueAtTime(0.3, audioCtx.currentTime + time);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + time + duration);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start(audioCtx.currentTime + time);
            osc.stop(audioCtx.currentTime + time + duration);
        };

        // Play pleasant multi-chime alarm
        playBeep(523.25, 0, 0.2); // C5
        playBeep(659.25, 0.2, 0.2); // E5
        playBeep(783.99, 0.4, 0.2); // G5
        playBeep(1046.50, 0.6, 0.4); // C6
    } catch (e) {
        console.log('Audio playback prevented:', e);
    }
}

function toggleTimer() {
    if (isRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
}

function startTimer() {
    if (isPaused && pausedRemainingTime !== null) {
        // Resume from paused state
        targetEndTime = Date.now() + pausedRemainingTime;
        pausedRemainingTime = null;
    } else {
        // Fresh start based on active mode
        if (currentMode === 'datetime') {
            const selectedVal = targetDatetimeInput.value;
            if (!selectedVal) {
                showTemporaryStatus("Please choose a valid Date & Time!", "error");
                return;
            }
            targetEndTime = new Date(selectedVal).getTime();

            if (isNaN(targetEndTime) || targetEndTime <= Date.now()) {
                showTemporaryStatus("Please select a future time!", "error");
                return;
            }
        } else {
            // Duration mode
            const h = parseInt(inputHours.value) || 0;
            const m = parseInt(inputMinutes.value) || 0;
            const s = parseInt(inputSeconds.value) || 0;

            const totalMs = ((h * 3600) + (m * 60) + s) * 1000;

            if (totalMs <= 0) {
                showTemporaryStatus("Please set a valid duration!", "error");
                return;
            }
            targetEndTime = Date.now() + totalMs;
        }
    }

    isRunning = true;
    isPaused = false;

    // Remove alarm visual style if previously active
    displayContainer.classList.remove('alarm-active');

    // UI Button state update
    btnStart.innerHTML = `<i class="fa-solid fa-pause text-sm"></i> <span>Pause Timer</span>`;
    btnStart.className = "flex-1 sm:flex-none px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2";

    updateStatusBadge("running", "Timer Running");

    // Execute immediately, then set 1-second tick interval
    updateCountdown();
    clearInterval(timerInterval);
    timerInterval = setInterval(updateCountdown, 1000);
}

function pauseTimer() {
    if (!isRunning) return;

    clearInterval(timerInterval);
    isRunning = false;
    isPaused = true;

    pausedRemainingTime = targetEndTime - Date.now();

    btnStart.innerHTML = `<i class="fa-solid fa-play text-sm"></i> <span>Resume Timer</span>`;
    btnStart.className = "flex-1 sm:flex-none px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2";

    updateStatusBadge("paused", "Timer Paused");
}

function resetTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    isPaused = false;
    pausedRemainingTime = null;
    displayContainer.classList.remove('alarm-active');

    btnStart.innerHTML = `<i class="fa-solid fa-play text-sm"></i> <span>Start Timer</span>`;
    btnStart.className = "flex-1 sm:flex-none px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2";

    updateStatusBadge("ready", "Ready to Start");
    resetDisplayValues();
}

function clearTimer() {
    resetTimer();
    inputHours.value = '';
    inputMinutes.value = '';
    inputSeconds.value = '';
    setInitialDatetime();
}

function updateCountdown() {
    const now = Date.now();
    const timeDiff = targetEndTime - now;

    if (timeDiff <= 0) {
        // Countdown Finished
        clearInterval(timerInterval);
        isRunning = false;
        isPaused = false;
        pausedRemainingTime = null;

        updateCardValues(0, 0, 0, 0);
        updateStatusBadge("completed", "Time's Up!");

        // Trigger Visual Alarm Glow & Sound
        displayContainer.classList.add('alarm-active');
        playAlarmSound();

        // Trigger Confetti effect
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }

        btnStart.innerHTML = `<i class="fa-solid fa-play text-sm"></i> <span>Start Timer</span>`;
        btnStart.className = "flex-1 sm:flex-none px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2";
        return;
    }

    // Calculations
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

    updateCardValues(days, hours, minutes, seconds);
}

function updateCardValues(d, h, m, s) {
    setCardText(daysEl, d);
    setCardText(hoursEl, h);
    setCardText(minutesEl, m);
    setCardText(secondsEl, s);
}

function setCardText(element, val) {
    const formatted = String(val).padStart(2, '0');
    if (element.innerText !== formatted) {
        element.innerText = formatted;
        element.classList.remove('number-change');
        void element.offsetWidth; // Trigger reflow for animation
        element.classList.add('number-change');
    }
}

function resetDisplayValues() {
    updateCardValues(0, 0, 0, 0);
}

function updateStatusBadge(state, text) {
    statusText.innerText = text;

    if (state === "running") {
        statusDot.className = "w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse";
        statusBadge.className = "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
    } else if (state === "paused") {
        statusDot.className = "w-2.5 h-2.5 rounded-full bg-amber-400";
        statusBadge.className = "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20";
    } else if (state === "completed") {
        statusDot.className = "w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping";
        statusBadge.className = "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-rose-500/20 text-rose-300 border border-rose-500/40";
    } else {
        statusDot.className = "w-2.5 h-2.5 rounded-full bg-gray-400";
        statusBadge.className = "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-slate-800/80 text-gray-300 border border-slate-700/60 shadow-inner";
    }
}

function showTemporaryStatus(msg, type = "info") {
    const origText = statusText.innerText;
    statusText.innerText = msg;
    statusBadge.className = "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30";
    statusDot.className = "w-2.5 h-2.5 rounded-full bg-rose-400";

    setTimeout(() => {
        if (!isRunning && !isPaused) {
            updateStatusBadge("ready", "Ready to Start");
        } else if (isRunning) {
            updateStatusBadge("running", "Timer Running");
        }
    }, 3000);
}

// Quick Presets
function applyPreset(type) {
    resetTimer();

    if (type === 'newyear') {
        switchMode('datetime');
        const nextYear = new Date().getFullYear() + 1;
        targetDatetimeInput.value = `${nextYear}-01-01T00:00`;
        startTimer();
        return;
    }

    switchMode('duration');
    inputHours.value = '';
    inputMinutes.value = '';
    inputSeconds.value = '';

    if (type === '5m') inputMinutes.value = 5;
    if (type === '10m') inputMinutes.value = 10;
    if (type === '30m') inputMinutes.value = 30;
    if (type === '1h') inputHours.value = 1;

    startTimer();
}

// Toggle Sound Settings
function toggleSound() {
    soundEnabled = !soundEnabled;
    const soundIcon = document.getElementById('sound-icon');
    const soundText = document.getElementById('sound-text');
    if (soundEnabled) {
        soundIcon.className = "fa-solid fa-volume-high text-indigo-400";
        soundText.innerText = "Sound: Enabled";
    } else {
        soundIcon.className = "fa-solid fa-volume-xmark text-gray-500";
        soundText.innerText = "Sound: Muted";
    }
}

// On Load Initialization
window.onload = function () {
    setInitialDatetime();
    resetDisplayValues();
};
