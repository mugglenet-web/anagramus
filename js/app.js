// ============================================================
//  Anagramus — App Controller
// ============================================================
/* global getDailyPuzzle, getPracticeWord, createGame, currentRound,
          createRound, applyHint, reshuffleTiles, checkAnswer,
          elapsedSeconds, getStats, recordDailyWin, recordDailyFail,
          isTodayCompleted, isTodayFailed, isTodayPlayed */

// ────────────────────────────────────────────────────────────
//  State
// ────────────────────────────────────────────────────────────
let game = null;
let countdownInterval = null;
let enchantInterval = null;

// ────────────────────────────────────────────────────────────
//  Screens
// ────────────────────────────────────────────────────────────
const screens = {
  splash: document.getElementById("screen-splash"),
  game:   document.getElementById("screen-game"),
  result: document.getElementById("screen-result"),
  stats:  document.getElementById("screen-stats"),
  howto:  document.getElementById("screen-howto"),
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove("active"));
  if (screens[name]) screens[name].classList.add("active");
}

// ────────────────────────────────────────────────────────────
//  Splash Screen
// ────────────────────────────────────────────────────────────
function initSplash() {
  showScreen("splash");
  animateSplashTitle();
  spawnParticles();
}

function animateSplashTitle() {
  const title = document.getElementById("splash-title");
  if (!title) return;
  const target = "ANAGRAMUS";
  const letters = target.split("");
  // Start with jumbled letters
  const jumbled = shuffleArray([...letters]);

  // Display jumbled version
  title.innerHTML = jumbled.map((l, i) =>
    `<span class="title-letter" data-index="${i}">${l}</span>`
  ).join("");

  // After a short delay, animate to correct order
  setTimeout(() => {
    const spans = title.querySelectorAll(".title-letter");
    let delay = 0;
    const order = [];

    // Figure out which position each letter needs to move to
    // by creating a mapping from current -> target
    const targetArr = [...letters];
    const usedTarget = new Array(targetArr.length).fill(false);

    // For each span (in jumbled order), assign it a target index
    jumbled.forEach((letter, jumbledIdx) => {
      for (let t = 0; t < targetArr.length; t++) {
        if (!usedTarget[t] && targetArr[t] === letter) {
          order[jumbledIdx] = t;
          usedTarget[t] = true;
          break;
        }
      }
    });

    // Animate each letter to its "final" position one by one
    spans.forEach((span, i) => {
      setTimeout(() => {
        span.classList.add("settling");
        setTimeout(() => {
          span.textContent = letters[order[i]]; // swap to correct letter
          span.classList.remove("settling");
          span.classList.add("settled");
        }, 200);
      }, delay);
      delay += 80;
    });

    // After all settle, rebuild title with correct order
    setTimeout(() => {
      title.innerHTML = letters.map(l =>
        `<span class="title-letter settled">${l}</span>`
      ).join("");
    }, delay + 600);
  }, 800);
}

// ────────────────────────────────────────────────────────────
//  Particle / Sparkle Ambiance
// ────────────────────────────────────────────────────────────
function spawnParticles() {
  const container = document.getElementById("particles");
  if (!container) return;

  const symbols = ["✦","✧","⋆","·","★","☽","⚡"];

  function createParticle() {
    const p = document.createElement("div");
    p.className = "particle";
    p.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    p.style.left = Math.random() * 100 + "%";
    p.style.animationDuration = (4 + Math.random() * 6) + "s";
    p.style.animationDelay = (Math.random() * 3) + "s";
    p.style.fontSize = (10 + Math.random() * 14) + "px";
    p.style.opacity = (0.2 + Math.random() * 0.5).toString();
    container.appendChild(p);
    setTimeout(() => p.remove(), 12000);
  }

  for (let i = 0; i < 12; i++) {
    setTimeout(createParticle, i * 300);
  }
  setInterval(createParticle, 1200);
}

// ────────────────────────────────────────────────────────────
//  Game Screens — Start
// ────────────────────────────────────────────────────────────
function startDaily() {
  if (isTodayCompleted()) {
    showResultScreen(true);
    return;
  }
  if (isTodayFailed()) {
    showResultScreen(false);
    return;
  }
  const puzzle = getDailyPuzzle();
  game = createGame("daily", puzzle, puzzle.puzzleNumber);
  showScreen("game");
  renderRound();
  startEnchantTimer();
}

function startPractice() {
  const words = {
    five: getPracticeWord(5),
    six: getPracticeWord(6),
    eight: getPracticeWord(8),
  };
  game = createGame("practice", words, 0);
  showScreen("game");
  renderRound();
  startEnchantTimer();
}

// ────────────────────────────────────────────────────────────
//  Round Rendering
// ────────────────────────────────────────────────────────────
function renderRound() {
  if (!game) return;
  const round = currentRound(game);
  const roundNum = game.currentRoundIndex + 1;
  const totalRounds = game.rounds.length;

  // Header
  document.getElementById("game-mode-label").textContent =
    game.mode === "daily" ? `⚡ Daily — Round ${roundNum} of ${totalRounds}` : `🔮 Practice — Round ${roundNum} of ${totalRounds}`;

  // Tries pips
  renderTries(round.triesLeft);

  // Scrambled tiles
  renderTiles(round);

  // Answer boxes
  renderAnswerBoxes(round);

  // Reset action buttons
  document.getElementById("btn-hint").disabled = round.hintRevealed;
  document.getElementById("btn-hint").textContent = round.hintRevealed ? "✦ Hint Used" : "✦ Hint";
  document.getElementById("btn-cast").disabled = false;
  document.getElementById("btn-cast").textContent = "✨ Revelio";

  updateCastButton();
}

function renderTries(triesLeft) {
  const container = document.getElementById("tries-container");
  if (!container) return;
  container.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    const pip = document.createElement("span");
    pip.className = "try-pip" + (i < triesLeft ? " active" : " used");
    pip.textContent = i < triesLeft ? "🔥" : "💀";
    container.appendChild(pip);
  }
}

function renderTiles(round) {
  const container = document.getElementById("tiles-container");
  if (!container) return;
  container.innerHTML = "";
  round.tiles.forEach((letter, idx) => {
    const tile = document.createElement("button");
    tile.className = "tile";
    tile.textContent = letter;
    tile.dataset.index = idx;
    if (round.hintRevealed && idx === 0) {
      tile.classList.add("hint-locked");
      tile.disabled = true;
    }
    tile.addEventListener("click", () => onTileClick(idx));
    container.appendChild(tile);
  });
}

function renderAnswerBoxes(round) {
  const container = document.getElementById("answer-container");
  if (!container) return;
  container.innerHTML = "";

  // Answer boxes: one per letter in answer
  for (let i = 0; i < round.answer.length; i++) {
    const box = document.createElement("div");
    box.className = "answer-box";
    box.dataset.position = i;

    // If hint used and position 0, pre-fill with hint letter
    if (round.hintRevealed && i === 0) {
      box.textContent = round.answer[0];
      box.classList.add("filled", "hinted");
    } else if (round.guess[i]) {
      box.textContent = round.guess[i];
      box.classList.add("filled");
    }

    container.appendChild(box);
  }
}

function updateCastButton() {
  if (!game) return;
  const round = currentRound(game);
  const filled = round.hintRevealed
    ? (1 + round.guess.filter(Boolean).length)
    : round.guess.filter(Boolean).length;
  const castBtn = document.getElementById("btn-cast");
  if (castBtn) {
    castBtn.disabled = filled < round.answer.length;
  }
}

// ────────────────────────────────────────────────────────────
//  Tile / Input Handling
// ────────────────────────────────────────────────────────────
function onTileClick(tileIndex) {
  if (!game) return;
  const round = currentRound(game);
  if (round.solved || round.failed) return;
  if (round.hintRevealed && tileIndex === 0) return;

  const letter = round.tiles[tileIndex];
  if (!letter) return;

  // Find first empty answer box
  const startIdx = round.hintRevealed ? 1 : 0;
  let targetPos = -1;
  for (let i = startIdx; i < round.answer.length; i++) {
    if (!round.guess[i]) { targetPos = i; break; }
  }
  if (targetPos === -1) return;

  // Place letter in guess
  round.guess[targetPos] = letter;

  // Mark tile as used (null it out)
  round.tiles[tileIndex] = null;

  renderAnswerBoxes(round);
  updateCastButton();

  // Animate tile click
  const tiles = document.querySelectorAll(".tile");
  if (tiles[tileIndex]) {
    tiles[tileIndex].classList.add("tile-used");
    setTimeout(() => tiles[tileIndex]?.remove(), 200);
  }
  renderTiles(round); // re-render tiles with null gap
}

function onAnswerBoxClick(position) {
  if (!game) return;
  const round = currentRound(game);
  if (round.solved || round.failed) return;
  if (round.hintRevealed && position === 0) return;
  if (!round.guess[position]) return;

  // Return letter to tiles
  const letter = round.guess[position];
  round.guess[position] = null;

  // Find first null slot in tiles and restore
  const nullIdx = round.tiles.indexOf(null);
  if (nullIdx !== -1) {
    round.tiles[nullIdx] = letter;
  } else {
    round.tiles.push(letter);
  }

  renderTiles(round);
  renderAnswerBoxes(round);
  updateCastButton();
}

// ── Physical keyboard support ────────────────────────────────
document.addEventListener("keydown", (e) => {
  if (!game) return;
  const round = currentRound(game);
  if (round.solved || round.failed) return;
  if (!screens.game.classList.contains("active")) return;

  const key = e.key.toUpperCase();

  if (/^[A-Z]$/.test(key)) {
    // Find a tile with this letter that is not null
    const startIdx = round.hintRevealed ? 1 : 0;
    let tileIdx = -1;
    for (let i = startIdx; i < round.tiles.length; i++) {
      if (round.tiles[i] === key) { tileIdx = i; break; }
    }
    if (tileIdx !== -1) onTileClick(tileIdx);
  } else if (key === "BACKSPACE") {
    // Remove last placed letter
    const start = round.hintRevealed ? 1 : 0;
    for (let i = round.answer.length - 1; i >= start; i--) {
      if (round.guess[i]) { onAnswerBoxClick(i); break; }
    }
  } else if (key === "ENTER") {
    onCast();
  }
});

// ── On-screen keyboard ───────────────────────────────────────
function buildOnScreenKeyboard() {
  const kb = document.getElementById("on-screen-keyboard");
  if (!kb) return;
  const rows = [
    ["Q","W","E","R","T","Y","U","I","O","P"],
    ["A","S","D","F","G","H","J","K","L"],
    ["BACK","Z","X","C","V","B","N","M","ENTER"]
  ];

  kb.innerHTML = "";
  rows.forEach(row => {
    const rowEl = document.createElement("div");
    rowEl.className = "kb-row";
    row.forEach(key => {
      const btn = document.createElement("button");
      btn.className = "kb-key";
      if (key === "BACK") {
        btn.textContent = "⌫";
        btn.classList.add("kb-wide");
        btn.addEventListener("click", () => {
          if (!game) return;
          const round = currentRound(game);
          const start = round.hintRevealed ? 1 : 0;
          for (let i = round.answer.length - 1; i >= start; i--) {
            if (round.guess[i]) { onAnswerBoxClick(i); break; }
          }
        });
      } else if (key === "ENTER") {
        btn.textContent = "✨";
        btn.classList.add("kb-wide");
        btn.addEventListener("click", onCast);
      } else {
        btn.textContent = key;
        btn.addEventListener("click", () => {
          if (!game) return;
          const round = currentRound(game);
          let tileIdx = -1;
          const start = round.hintRevealed ? 1 : 0;
          for (let i = start; i < round.tiles.length; i++) {
            if (round.tiles[i] === key) { tileIdx = i; break; }
          }
          if (tileIdx !== -1) onTileClick(tileIdx);
        });
      }
      rowEl.appendChild(btn);
    });
    kb.appendChild(rowEl);
  });
}

// ────────────────────────────────────────────────────────────
//  Actions
// ────────────────────────────────────────────────────────────
function onHint() {
  if (!game) return;
  const round = currentRound(game);
  if (round.hintRevealed || round.solved || round.failed) return;
  applyHint(round);
  game.hintsTotal += 1;
  renderRound();
}

function onShuffle() {
  if (!game) return;
  const round = currentRound(game);
  if (round.solved || round.failed) return;
  round.tiles = reshuffleTiles(round.tiles, round.answer,
    round.hintRevealed ? round.answer[0] : null);
  renderTiles(round);
}

function onCast() {
  if (!game) return;
  const round = currentRound(game);
  if (round.solved || round.failed) return;

  // Build full guess string
  const start = round.hintRevealed ? 1 : 0;
  const guessLetters = [];
  if (round.hintRevealed) guessLetters.push(round.answer[0]);
  for (let i = start; i < round.answer.length; i++) {
    guessLetters.push(round.guess[i] || "");
  }
  if (guessLetters.includes("")) return; // not all filled

  const guessStr = guessLetters.join("");
  if (checkAnswer(guessStr, round.answer)) {
    handleCorrect(round);
  } else {
    handleWrong(round);
  }
}

function handleCorrect(round) {
  round.solved = true;
  // Green flash on answer boxes
  flashAnswerBoxes("correct");
  // Sparkle burst
  spawnSuccessSparkles();

  // Animate tiles into correct order, then advance
  setTimeout(() => animateTilesReveal(round.answer, () => {
    setTimeout(advanceRound, 600);
  }), 400);

  const castBtn = document.getElementById("btn-cast");
  if (castBtn) castBtn.disabled = true;
}

function handleWrong(round) {
  round.triesLeft -= 1;
  flashAnswerBoxes("wrong");
  shakeAnswerBoxes();

  // Clear guess
  const start = round.hintRevealed ? 1 : 0;
  for (let i = start; i < round.answer.length; i++) {
    // Return letters to tiles
    if (round.guess[i]) {
      const nullIdx = round.tiles.indexOf(null);
      if (nullIdx !== -1) round.tiles[nullIdx] = round.guess[i];
      else round.tiles.push(round.guess[i]);
      round.guess[i] = null;
    }
  }

  renderTries(round.triesLeft);
  renderTiles(round);
  renderAnswerBoxes(round);
  updateCastButton();

  if (round.triesLeft === 0) {
    round.failed = true;
    setTimeout(() => handleRoundFail(round), 500);
  }
}

function handleRoundFail(round) {
  // Reveal answer by animating tiles into correct order
  animateTilesReveal(round.answer, () => {
    if (game.mode === "daily") {
      // End the daily
      recordDailyFail({ puzzleNumber: game.puzzleNumber });
      setTimeout(() => showResultScreen(false), 1200);
    } else {
      // Practice: show "Next Round" button
      showPracticeNextRound();
    }
  });
}

function advanceRound() {
  if (!game) return;
  game.currentRoundIndex += 1;
  if (game.currentRoundIndex >= game.rounds.length) {
    // All rounds complete
    finishGame();
  } else {
    renderRound();
  }
}

function finishGame() {
  if (game.mode === "daily") {
    const secs = elapsedSeconds(game);
    const roundsWon = game.rounds.filter(r => r.solved).length;
    recordDailyWin({
      puzzleNumber: game.puzzleNumber,
      hints: game.hintsTotal,
      timeSeconds: secs,
      roundsWon,
    });
    showResultScreen(true);
  } else {
    // Practice win — show "Play Again" / return to splash
    showPracticeWin();
  }
}

// ────────────────────────────────────────────────────────────
//  Tile Reveal Animation
// ────────────────────────────────────────────────────────────
function animateTilesReveal(answer, callback) {
  const container = document.getElementById("tiles-container");
  const answerContainer = document.getElementById("answer-container");
  if (!container || !answerContainer) { if (callback) callback(); return; }

  // Replace tiles with correctly ordered answer letters
  container.innerHTML = "";
  const letters = answer.split("");

  letters.forEach((letter, i) => {
    const tile = document.createElement("div");
    tile.className = "tile tile-reveal";
    tile.textContent = letter;
    tile.style.animationDelay = (i * 80) + "ms";
    container.appendChild(tile);
  });

  // Fill answer boxes
  const boxes = answerContainer.querySelectorAll(".answer-box");
  letters.forEach((letter, i) => {
    if (boxes[i]) {
      boxes[i].textContent = letter;
      boxes[i].classList.add("filled", "revealed");
    }
  });

  if (callback) setTimeout(callback, letters.length * 80 + 500);
}

// ────────────────────────────────────────────────────────────
//  Visual Feedback Helpers
// ────────────────────────────────────────────────────────────
function flashAnswerBoxes(type) {
  const boxes = document.querySelectorAll(".answer-box");
  const cls = type === "correct" ? "flash-correct" : "flash-wrong";
  boxes.forEach(b => b.classList.add(cls));
  setTimeout(() => boxes.forEach(b => b.classList.remove(cls)), 600);
}

function shakeAnswerBoxes() {
  const container = document.getElementById("answer-container");
  if (!container) return;
  container.classList.add("shake");
  setTimeout(() => container.classList.remove("shake"), 500);
}

function spawnSuccessSparkles() {
  const container = document.getElementById("game-sparkles");
  if (!container) return;
  const symbols = ["✦","⭐","✨","��","⚡","🌟"];
  for (let i = 0; i < 20; i++) {
    const s = document.createElement("div");
    s.className = "sparkle";
    s.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    s.style.left = (20 + Math.random() * 60) + "%";
    s.style.top = (30 + Math.random() * 40) + "%";
    s.style.animationDelay = (Math.random() * 0.3) + "s";
    container.appendChild(s);
    setTimeout(() => s.remove(), 1500);
  }
}

// ────────────────────────────────────────────────────────────
//  Enchanted Tile Wiggle
// ────────────────────────────────────────────────────────────
function startEnchantTimer() {
  if (enchantInterval) clearInterval(enchantInterval);
  enchantInterval = setInterval(() => {
    const tiles = document.querySelectorAll(".tile:not(.hint-locked)");
    if (!tiles.length) return;
    const idx = Math.floor(Math.random() * tiles.length);
    tiles[idx].classList.add("enchant");
    setTimeout(() => tiles[idx]?.classList.remove("enchant"), 600);
  }, 2500);
}

// ────────────────────────────────────────────────────────────
//  Practice special states
// ────────────────────────────────────────────────────────────
function showPracticeNextRound() {
  const overlay = document.getElementById("practice-fail-overlay");
  if (overlay) overlay.classList.add("active");
}

function showPracticeWin() {
  const overlay = document.getElementById("practice-win-overlay");
  if (overlay) overlay.classList.add("active");
}

function nextPracticeRound() {
  // Hide overlays
  ["practice-fail-overlay","practice-win-overlay"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove("active");
  });

  const usedWords = game ? game.rounds.map(r => r.answer) : [];
  const words = {
    five: getPracticeWord(5, usedWords),
    six: getPracticeWord(6, usedWords),
    eight: getPracticeWord(8, usedWords),
  };
  game = createGame("practice", words, 0);
  renderRound();
  startEnchantTimer();
}

// ────────────────────────────────────────────────────────────
//  Result Screen
// ────────────────────────────────────────────────────────────
function showResultScreen(won) {
  showScreen("result");

  const stats = getStats();
  const el = {
    title: document.getElementById("result-title"),
    subtitle: document.getElementById("result-subtitle"),
    shareBox: document.getElementById("result-share-box"),
    countdown: document.getElementById("result-countdown"),
    countdownWrap: document.getElementById("result-countdown-wrap"),
  };

  if (won) {
    el.title.textContent = "✨ Magnificent!";
    el.subtitle.textContent = "You unscrambled all three words!";
    if (stats.dailyResult) {
      el.shareBox.textContent = stats.dailyResult;
      el.shareBox.style.display = "block";
    }
  } else {
    el.title.textContent = "💀 Defeated...";
    el.subtitle.textContent = "The enchantment proved too strong this time.";
    el.shareBox.style.display = "none";
  }

  // Countdown
  if (el.countdownWrap) {
    el.countdownWrap.style.display = "block";
    startCountdown(el.countdown);
  }
}

function startCountdown(el) {
  if (countdownInterval) clearInterval(countdownInterval);
  function update() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const diff = tomorrow - now;
    const h = String(Math.floor(diff / 3600000)).padStart(2,"0");
    const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2,"0");
    const s = String(Math.floor((diff % 60000) / 1000)).padStart(2,"0");
    if (el) el.textContent = `${h}:${m}:${s}`;
  }
  update();
  countdownInterval = setInterval(update, 1000);
}

function copyResults() {
  const stats = getStats();
  if (!stats.dailyResult) return;
  navigator.clipboard.writeText(stats.dailyResult).then(() => {
    const btn = document.getElementById("btn-copy-results");
    if (btn) {
      btn.textContent = "✓ Copied!";
      setTimeout(() => btn.textContent = "📋 Copy Results", 2000);
    }
  }).catch(() => {
    // Fallback
    const ta = document.createElement("textarea");
    ta.value = stats.dailyResult;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  });
}

// ────────────────────────────────────────────────────────────
//  Stats Screen
// ────────────────────────────────────────────────────────────
function showStatsScreen() {
  showScreen("stats");
  const stats = getStats();
  document.getElementById("stat-streak").textContent = stats.streak;
  document.getElementById("stat-best").textContent = stats.bestStreak;
  document.getElementById("stat-perfect").textContent = stats.perfectDays;
  document.getElementById("stat-total").textContent = stats.totalSolved;
}

// ────────────────────────────────────────────────────────────
//  How to Play Screen
// ────────────────────────────────────────────────────────────
function showHowToPlay() {
  showScreen("howto");
}

// ────────────────────────────────────────────────────────────
//  Init
// ────────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  // Bind splash buttons
  document.getElementById("btn-daily")?.addEventListener("click", startDaily);
  document.getElementById("btn-practice")?.addEventListener("click", startPractice);
  document.getElementById("btn-stats-splash")?.addEventListener("click", showStatsScreen);
  document.getElementById("btn-howto-splash")?.addEventListener("click", showHowToPlay);

  // Back buttons
  document.querySelectorAll(".btn-back-splash").forEach(btn =>
    btn.addEventListener("click", initSplash)
  );

  // Game controls
  document.getElementById("btn-hint")?.addEventListener("click", onHint);
  document.getElementById("btn-shuffle")?.addEventListener("click", onShuffle);
  document.getElementById("btn-cast")?.addEventListener("click", onCast);

  // Answer box click (deselect)
  document.getElementById("answer-container")?.addEventListener("click", (e) => {
    const box = e.target.closest(".answer-box");
    if (box) onAnswerBoxClick(parseInt(box.dataset.position));
  });

  // Practice overlays
  document.getElementById("btn-next-practice")?.addEventListener("click", nextPracticeRound);
  document.getElementById("btn-next-practice-win")?.addEventListener("click", nextPracticeRound);
  document.getElementById("btn-practice-home")?.addEventListener("click", initSplash);
  document.getElementById("btn-practice-home-win")?.addEventListener("click", initSplash);

  // Result screen
  document.getElementById("btn-copy-results")?.addEventListener("click", copyResults);
  document.getElementById("btn-result-home")?.addEventListener("click", initSplash);

  // Stats screen
  document.getElementById("btn-stats-daily")?.addEventListener("click", () => {
    showStatsScreen();
  });

  // Build on-screen keyboard
  buildOnScreenKeyboard();

  // Start splash
  initSplash();
});
