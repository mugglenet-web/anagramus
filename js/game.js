// ============================================================
//  Anagramus — Core Game Logic
// ============================================================

/**
 * Fisher-Yates shuffle — returns a new shuffled copy of the array
 * and guarantees the result differs from the original
 * (re-shuffles if identical, up to 10 attempts).
 */
function shuffleArray(arr) {
  let result;
  let attempts = 0;
  do {
    result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    attempts++;
  } while (result.join("") === arr.join("") && attempts < 10);
  return result;
}

/**
 * Scramble a word into a shuffled letter array.
 * @param {string} word
 * @returns {string[]}
 */
function scrambleWord(word) {
  return shuffleArray(word.split(""));
}

/**
 * Check whether the player's guess matches the answer (case-insensitive).
 * @param {string} guess
 * @param {string} answer
 * @returns {boolean}
 */
function checkAnswer(guess, answer) {
  return guess.trim().toUpperCase() === answer.toUpperCase();
}

/**
 * Re-shuffle the current scrambled letters without revealing the answer.
 * @param {string[]} currentTiles
 * @param {string} answer
 * @param {string|null} hintLetter  — if hint used, keep first tile locked
 * @returns {string[]}
 */
function reshuffleTiles(currentTiles, answer, hintLetter = null) {
  if (hintLetter) {
    // Keep first tile (hint) in place, shuffle the rest
    const rest = shuffleArray(currentTiles.slice(1));
    return [hintLetter, ...rest];
  }
  return shuffleArray([...currentTiles]);
}

/**
 * Reveal the first letter hint.
 * Returns the first letter of the answer in uppercase.
 * @param {string} answer
 * @returns {string}
 */
function getHintLetter(answer) {
  return answer[0].toUpperCase();
}

// ── Round / Game state factory ───────────────────────────────

/**
 * Create a fresh round state.
 * @param {string} answer
 * @returns {Object}
 */
function createRound(answer) {
  return {
    answer: answer.toUpperCase(),
    tiles: scrambleWord(answer.toUpperCase()),
    triesLeft: 3,
    hintsUsed: 0,
    hintRevealed: false,
    guess: [],         // current letter input
    solved: false,
    failed: false,
  };
}

/**
 * Apply a hint to a round (mutates in place, returns round).
 * @param {Object} round
 * @returns {Object}
 */
function applyHint(round) {
  if (round.hintRevealed || round.solved || round.failed) return round;
  round.hintRevealed = true;
  round.hintsUsed += 1;
  // Lock first tile to the correct letter
  const firstLetter = round.answer[0];
  const tilesCopy = [...round.tiles];
  const idx = tilesCopy.indexOf(firstLetter);
  if (idx !== 0) {
    // Swap the first-letter tile to position 0
    [tilesCopy[0], tilesCopy[idx]] = [tilesCopy[idx], tilesCopy[0]];
  }
  round.tiles = tilesCopy;
  // Also clear any typed guess
  round.guess = [];
  return round;
}

/**
 * Create a fresh game state.
 * @param {"daily"|"practice"} mode
 * @param {{ five: string, six: string, eight: string }} wordSet
 * @param {number} puzzleNumber
 * @returns {Object}
 */
function createGame(mode, wordSet, puzzleNumber = 0) {
  return {
    mode,
    puzzleNumber,
    currentRoundIndex: 0,
    rounds: [
      createRound(wordSet.five),
      createRound(wordSet.six),
      createRound(wordSet.eight),
    ],
    startTime: Date.now(),
    hintsTotal: 0,
    won: false,
    lost: false,
  };
}

/** Convenience: current round object */
function currentRound(game) {
  return game.rounds[game.currentRoundIndex];
}

/** Returns elapsed seconds since game start */
function elapsedSeconds(game) {
  return Math.floor((Date.now() - game.startTime) / 1000);
}
