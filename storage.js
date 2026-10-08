/*
 * LALI-O - core/storage.js
 * Saving and loading: two separate save slots in localStorage.
 */
"use strict";

// Save 1 keeps the original keys, so existing progress is untouched; Save 2 has its own keys
const ACCOUNTS = [{ n: 1, name: "Save 1", prefix: "flipside.", color: "#B98CFF" }, { n: 2, name: "Save 2", prefix: "lalio.s2.", color: "#4FE3C1" }];

// your own names for the saves
const SAVE_NAMES = (() => { try { const o = JSON.parse(localStorage.getItem("lalio.names") || "{}"); return o && typeof o === "object" ? o : {}; } catch (e) { return {}; } })();
for (const a of ACCOUNTS) if (typeof SAVE_NAMES[a.n] === "string" && SAVE_NAMES[a.n].trim()) a.name = SAVE_NAMES[a.n].trim().slice(0, 20);

function renameSave(n, name) {
  const a = ACCOUNTS[n - 1]; name = String(name || "").replace(/\s+/g, " ").trim().slice(0, 20);
  a.name = name || `Save ${n}`;
  if (name) SAVE_NAMES[n] = name; else delete SAVE_NAMES[n];
  try { localStorage.setItem("lalio.names", JSON.stringify(SAVE_NAMES)); } catch (e) {}
}

const ACCT = (() => { try { return localStorage.getItem("lalio.account") === "2" ? 2 : 1; } catch (e) { return 1; } })();
const PREFIX = ACCOUNTS[ACCT - 1].prefix;

const store = {
  get(k, d) { try { const v = localStorage.getItem(PREFIX + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch (e) {} },
};

const DEFAULT_KEYS = [{ code: "KeyA", label: "A" }, { code: "KeyS", label: "S" }, { code: "KeyK", label: "K" }, { code: "KeyL", label: "L" }];
const settings = Object.assign({ keys: DEFAULT_KEYS.map(k => ({ ...k })), speed: 1.0, offset: 0, menuVol: 75, songVol: 100, bass: 0, showTicker: true, font: "Syne" }, store.get("settings", {}));
const saveSettings = () => store.set("settings", settings);
const bests = store.get("bests", {});

/* player stats (per save) */
const STATS_DEFAULT = () => ({ plays: 0, clears: 0, fails: 0, quits: 0, hits: 0, perfect: 0, great: 0, good: 0, bad: 0, miss: 0, bestCombo: 0, time: 0,
  coinsEarned: 0, tasks: 0, fullCombos: 0, hardFC: 0, ss: 0, extremeClears: 0, nearMiss: 0, boxes: 0, goldBoxes: 0, bought: 0, codes: 0, added: 0, tutorial: 0, songPlays: {},
  earlyFail: 0, dGrades: 0, zeroFail: 0, easyFail: 0, sdFail: 0, maxMiss: 0, flatline: 0 });

const statsSaved = store.get("stats", null);
let STATS = Object.assign(STATS_DEFAULT(), statsSaved || {});

if (!statsSaved) {   // first time: fill in what we can from the scores this save already has
  for (const id in bests) if (!id.startsWith("test")) for (const d in bests[id]) {
    const b = bests[id][d]; STATS.clears++; STATS.plays++;
    STATS.bestCombo = Math.max(STATS.bestCombo, b.combo || 0);
    if (b.grade === "SS") STATS.ss++;
    if (d === "extreme") STATS.extremeClears++;
  }
  if (store.get("tutorialDone", false)) STATS.tutorial = 1;
}

const saveStats = () => store.set("stats", STATS);
function bumpStat(k, n = 1) { STATS[k] = (STATS[k] || 0) + n; saveStats(); }
for (const gone of ["double", "test2", "robbery"]) if (bests[gone]) { delete bests[gone]; store.set("bests", bests); }
const travelTime = () => 1.9 / settings.speed;
