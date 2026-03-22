// ============================================================
//  Anagramus — localStorage helpers
// ============================================================

const STORAGE_KEY = "anagramus_data";

const DEFAULT_STATE = {
  // --- Stats (daily only) ---
  streak: 0,
  bestStreak: 0,
  perfectDays: 0,
  totalSolved: 0,

  // --- Today's daily state ---
  lastPlayedDate: null,   // "YYYY-MM-DD"
  dailyCompleted: false,
  dailyFailed: false,
  dailyPuzzleNumber: null,
  dailyResult: null,      // stored share string
  dailyHints: 0,
  dailyTime: 0,           // seconds
  dailyRoundsWon: 0,
};

function getLocalDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* storage full or unavailable */ }
}

// ── Public helpers ───────────────────────────────────────────

function getStats() {
  return loadData();
}

/** Call when the player successfully completes the full daily puzzle */
function recordDailyWin({ puzzleNumber, hints, timeSeconds, roundsWon }) {
  const data = loadData();
  const today = getLocalDate();

  // Avoid double-counting
  if (data.lastPlayedDate === today && data.dailyCompleted) return;

  // Streak logic
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,"0")}-${String(yesterday.getDate()).padStart(2,"0")}`;

  if (data.lastPlayedDate === yStr) {
    data.streak += 1;
  } else if (data.lastPlayedDate !== today) {
    data.streak = 1; // streak broken
  }
  if (data.streak > data.bestStreak) data.bestStreak = data.streak;

  data.totalSolved += 1;
  if (hints === 0) data.perfectDays += 1;

  data.lastPlayedDate = today;
  data.dailyCompleted = true;
  data.dailyFailed = false;
  data.dailyPuzzleNumber = puzzleNumber;
  data.dailyHints = hints;
  data.dailyTime = timeSeconds;
  data.dailyRoundsWon = roundsWon;

  // Build share string
  const mm = String(Math.floor(timeSeconds / 60)).padStart(2,"0");
  const ss = String(timeSeconds % 60).padStart(2,"0");
  data.dailyResult =
    `Anagramus #${puzzleNumber}\n` +
    `⚡ ${roundsWon}/3\n` +
    `🕒 ${mm}:${ss}\n` +
    `💡 ${hints} hint${hints !== 1 ? "s" : ""}\n` +
    `🔥 ${data.streak}-day streak`;

  saveData(data);
}

/** Call when the player fails the daily puzzle */
function recordDailyFail({ puzzleNumber }) {
  const data = loadData();
  const today = getLocalDate();
  if (data.lastPlayedDate === today && (data.dailyCompleted || data.dailyFailed)) return;

  // Streak is broken
  if (data.lastPlayedDate !== today) {
    data.streak = 0;
  }

  data.lastPlayedDate = today;
  data.dailyCompleted = false;
  data.dailyFailed = true;
  data.dailyPuzzleNumber = puzzleNumber;
  data.dailyResult = null;

  saveData(data);
}

/** Returns true if today's daily has already been played (completed or failed) */
function isTodayPlayed() {
  const data = loadData();
  return data.lastPlayedDate === getLocalDate() && (data.dailyCompleted || data.dailyFailed);
}

function isTodayCompleted() {
  const data = loadData();
  return data.lastPlayedDate === getLocalDate() && data.dailyCompleted;
}

function isTodayFailed() {
  const data = loadData();
  return data.lastPlayedDate === getLocalDate() && data.dailyFailed;
}
