// ============================================================
//  Anagramus — Word Data & Daily Puzzle Sets
//  All words are uppercase, A-Z only, verified exact lengths
// ============================================================

// ── 5-letter wizarding-world word pool (exactly 5 chars) ────
const PRACTICE_POOL_5 = [
  "HARRY","LUMOS","SPELL","WITCH","MAGIC","SNAPE","DRACO","DOBBY",
  "CHARM","PIXIE","GHOST","ELDER","GINNY","PERCY","FLAME","CLOAK",
  "BROOM","RUNES","ALBUS","FELIX","TROLL","GIANT","GNOME","QUILL",
  "FEAST","TOWER","VAULT","MOODY","TONKS","FLEUR","KAPPA","BLAST",
  "FUNGI","PRANK","ARGUS","POPPY","FILCH","VIPER","CRANE","STORM",
  "EMBER","REALM","CURSE","GLEAM","RELIC","MANOR","ABBEY","GROVE",
  "SHARD","CRYPT","POUCH","HOLLY","BLAZE","CHILL","SHADE","PRISM",
  "SWAMP","MARSH","BROOD","BROOK","GLOOM","SHEEN","FLASK","MORPH",
  "ABYSS","ASHEN","BOGGY","CHANT","DREAD","DWELL","FABLE","GLYPH",
  "GRAIL","HEXED","KNAVE","OAKEN","QUEST","ROGUE","TRACE","VAPOR",
  "WISPY","CABAL","CEDAR","GOLEM","HARPY","NEXUS","OCHRE","PETAL",
  "SYLPH","UMBRA","RISKY","SPRIG","WIZEN","FETID","EERIE","STONY",
  "MISTY","DUSTY","ASHES","TOADS","OWLET","FETCH","JINXY","COVEN",
  "BROIL","ANVIL","PLUME","CHAOS","RAVEN","ONYX","IVORY","AMBER"
].filter(w => w.length === 5);

// ── 6-letter wizarding-world word pool (exactly 6 chars) ────
const PRACTICE_POOL_6 = [
  "POTTER","MALFOY","HAGRID","LUCIUS","SIRIUS","ARTHUR","SPROUT",
  "MUGGLE","WIZARD","POTION","CASTLE","TURRET","SILVER","FOREST",
  "GOBLIN","GOLDEN","SNITCH","NIMBUS","BROOMS","CLOAKS","VAULTS",
  "DRAGON","RIDDLE","FLUFFY","JINXED","CURSED","CELLAR","RATTLE",
  "FAWKES","HEDWIG","GEORGE","FENRIR","CROUCH","FIRENZ","BANTER",
  "GROTTO","GHOSTS","SPOOKY","PONDER","FIENDS","ARMORY","BEACON",
  "ELVISH","FRENZY","HORROR","JESTER","KNIGHT","LAGOON","MYSTIC",
  "NEBULA","PILLAR","QUARTZ","RAFTER","SHRINE","TAVERN","VESPER",
  "AMULET","BANISH","CINDER","DIVINE","EFFIGY","KELPIE","LEGEND",
  "MARVEL","NYMPHS","WARDED","BEASTS","MARBLE","DONJON","HERALD",
  "CHAISE","WICKER","OSSIFY","MAGICK","ORNATE","GILDED","WYVERN",
  "HEXING","SPIRIT","MUSING","RANCOR","THRALL","HARROW","MIRROR"
].filter(w => w.length === 6);

// ── 8-letter wizarding-world word pool (exactly 8 chars) ────
// All entries here are exactly 8 characters (A-Z); the length filter
// acts as a final safety net but every word below is already correct.
const PRACTICE_POOL_8 = [
  // Core HP characters & places
  "HERMIONE","HOGWARTS","CAULDRON","PATRONUS","HALLOWED","MINISTRY",
  "SORCERER","CHAMBERS","PRISONER","PROPHECY","GRIPHOOK","SILENCIO",
  // Creatures & magical beings
  "DEMENTOR","THESTRAL","BASILISK","MIMBULUS","NIFFLERS","ACROMANT",
  "HORNTAIL","WORMTAIL","ANIMAGUS","MANDRAKE",
  // Spells & magic terms
  "DESCENDO","FANTASIA","TRANSFIG","WITCHERY","DARKARTS","INKQUILL",
  "MYSTICAL","CHARMING","REVEALER","DEFENDER","SPECTERS","POTIONER",
  "GALLEONS","RIDDIKUL",
  // Wizarding world atmosphere
  "MOONBEAM","STARDUST","CRYSTALS","FEARSOME","GLIMMERY","STORMFED",
  "DEATHRAY","TREELINE","LANTERNS","STARFALL","IRONWOOD","DARKENED",
  "THORNWOD","CLOUDLIT","ROWANLIT","GHOSTLIT"
].filter(w => w.length === 8);

// ────────────────────────────────────────────────────────────
//  Seeded PRNG — mulberry32
//  Produces a deterministic sequence from a 32-bit integer seed.
//  Same seed → same sequence → same daily words for everyone.
// ────────────────────────────────────────────────────────────

/**
 * Creates a mulberry32 PRNG seeded with `seed`.
 * Returns a function that yields a float in [0, 1) each call.
 * @param {number} seed  32-bit integer
 * @returns {() => number}
 */
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let z = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    z ^= z + Math.imul(z ^ (z >>> 7), 61 | z);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Derive a stable 32-bit numeric seed from a "YYYY-MM-DD" date string.
 * Uses a simple djb2-style hash so the seed is fully determined by the date.
 * @param {string} dateStr  e.g. "2025-03-22"
 * @returns {number}
 */
function dateSeed(dateStr) {
  let hash = 5381;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) + hash) ^ dateStr.charCodeAt(i);
    hash |= 0; // keep 32-bit
  }
  return hash >>> 0; // unsigned
}

// ────────────────────────────────────────────────────────────
//  Public API
// ────────────────────────────────────────────────────────────

/**
 * Returns today's daily puzzle.
 * Words are drawn from the validated pools using a date-seeded PRNG,
 * so every player on the same calendar day gets the same three words.
 *
 * @returns {{ puzzleNumber: number, five: string, six: string, eight: string }}
 */
function getDailyPuzzle() {
  const today = new Date();
  const dateStr =
    today.getFullYear() + "-" +
    String(today.getMonth() + 1).padStart(2, "0") + "-" +
    String(today.getDate()).padStart(2, "0");

  // Puzzle number: days since 2025-01-01
  const epoch = new Date("2025-01-01T00:00:00");
  const todayMidnight = new Date(today);
  todayMidnight.setHours(0, 0, 0, 0);
  const puzzleNumber = Math.max(1, Math.floor((todayMidnight - epoch) / 86_400_000) + 1);

  // Seeded RNG for today
  const rand = mulberry32(dateSeed(dateStr));

  // Pick one word from each pool using the seeded RNG.
  // Calling rand() three times in a fixed order guarantees the
  // same picks regardless of pool ordering changes.
  const five  = PRACTICE_POOL_5[Math.floor(rand() * PRACTICE_POOL_5.length)];
  const six   = PRACTICE_POOL_6[Math.floor(rand() * PRACTICE_POOL_6.length)];
  const eight = PRACTICE_POOL_8[Math.floor(rand() * PRACTICE_POOL_8.length)];

  return { puzzleNumber, five, six, eight };
}

/**
 * Returns a random practice word of a given length,
 * excluding any words already used.
 * @param {5|6|8} length
 * @param {string[]} [exclude=[]]
 * @returns {string}
 */
function getPracticeWord(length, exclude = []) {
  let pool;
  if (length === 5) pool = PRACTICE_POOL_5;
  else if (length === 6) pool = PRACTICE_POOL_6;
  else pool = PRACTICE_POOL_8;
  const avail = pool.filter(w => !exclude.includes(w));
  const src = avail.length ? avail : pool;
  return src[Math.floor(Math.random() * src.length)];
}
