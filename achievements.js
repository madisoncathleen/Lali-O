/*
 * LALI-O - progress/achievements.js
 * Achievements (including the clown ones).
 */
"use strict";

const builtInSongs = () => SONGS.filter(s => !s.custom && !s.endless && !s.tutorial && !s.noMiss && !s.id.startsWith("test"));
const ownedCount = () => Object.values(OWNED).reduce((n, a) => n + a.length, 0);
const cleared = (s, diffs) => bests[s.id] && (diffs ? diffs.some(d => bests[s.id][d]) : Object.keys(bests[s.id]).length > 0);

const ACH = [
  { id: "first", reward: 25, name: "First Steps", desc: "Clear your first song.", goal: S => [S.clears, 1] },
  { id: "graduate", reward: 25, name: "Graduate", desc: "Finish the Tutorial.", goal: S => [S.tutorial ? 1 : 0, 1] },
  { id: "regular", reward: 100, name: "Regular", desc: "Clear 10 songs.", goal: S => [S.clears, 10] },
  { id: "dedicated", reward: 400, name: "Dedicated", desc: "Clear 50 songs.", goal: S => [S.clears, 50] },
  { id: "combo100", reward: 50, name: "Combo Starter", desc: "Reach a 100 combo.", goal: (S, c) => [Math.max(S.bestCombo, c.combo || 0), 100] },
  { id: "combo300", reward: 150, name: "Combo Master", desc: "Reach a 300 combo.", goal: (S, c) => [Math.max(S.bestCombo, c.combo || 0), 300] },
  { id: "combo500", reward: 300, name: "Unstoppable", desc: "Reach a 500 combo.", goal: (S, c) => [Math.max(S.bestCombo, c.combo || 0), 500] },
  { id: "fc", reward: 150, name: "Flawless", desc: "Full combo a song (finish with no misses).", goal: S => [S.fullCombos, 1] },
  { id: "fchard", reward: 300, name: "Untouchable", desc: "Full combo a song on Hard or Extreme.", goal: S => [S.hardFC, 1] },
  { id: "ss", reward: 250, name: "Perfectionist", desc: "Get an SS grade.", goal: S => [S.ss, 1] },
  { id: "extreme", reward: 200, name: "Extreme Survivor", desc: "Clear a song on Extreme.", goal: S => [S.extremeClears, 1] },
  { id: "hits1k", reward: 75, name: "Thousand Hits", desc: "Hit 1,000 notes.", goal: S => [S.hits, 1000] },
  { id: "hits10k", reward: 300, name: "Ten Thousand", desc: "Hit 10,000 notes.", goal: S => [S.hits, 10000] },
  { id: "soclose", reward: 50, name: "So Close", desc: "Get a Game Over after making it 90% of the way through a song.", goal: S => [S.nearMiss, 1] },
  { id: "allsongs", reward: 500, name: "Completionist", desc: "Clear every built-in song.", goal: () => { const b = builtInSongs(); return [b.filter(s => cleared(s)).length, b.length]; } },
  { id: "allhard", reward: 800, name: "Hard Hitter", desc: "Clear every built-in song on Hard or Extreme.", goal: () => { const b = builtInSongs(); return [b.filter(s => cleared(s, ["hard", "extreme"])).length, b.length]; } },
  { id: "hour", reward: 200, name: "Hour of Rhythm", desc: "Play for 60 minutes in total.", goal: S => [Math.floor(S.time / 60), 60] },
  { id: "rich", reward: 100, name: "Saving Up", desc: "Have 5,000 coins at once.", goal: () => [COINS, 5000] },
  { id: "shopper", reward: 150, name: "Shopper", desc: "Buy 10 items in the Store.", goal: S => [S.bought, 10] },
  { id: "collector", reward: 300, name: "Collector", desc: "Own 50 items.", goal: () => [ownedCount(), 50] },
  { id: "lucky", reward: 50, name: "Lucky Dip", desc: "Open a mystery box.", goal: S => [S.boxes, 1] },
  { id: "roller", reward: 150, name: "High Roller", desc: "Open a Gold Box.", goal: S => [S.goldBoxes, 1] },
  { id: "dj", reward: 75, name: "DJ", desc: "Add your own song.", goal: S => [S.added, 1] },
  { id: "insider", reward: 25, name: "Insider", desc: "Redeem a code in the Store.", goal: S => [S.codes, 1] },
  { id: "marathon", reward: 200, name: "Marathon", desc: "Clear 5 songs in one Endless run.", goal: S => [S.endlessBest || 0, 5] },
  { id: "endurance", reward: 500, name: "Endurance", desc: "Clear 10 songs in one Endless run.", goal: S => [S.endlessBest || 0, 10] },
  { id: "tasks1", reward: 25, name: "Quest Starter", desc: "Claim your first quest reward.", goal: S => [S.tasks || 0, 1] },
  { id: "tasks25", reward: 300, name: "Quest Master", desc: "Claim 25 quest rewards.", goal: S => [S.tasks || 0, 25] },
  // clown achievements: for being really bad. They pay almost nothing, and they honk.
  { id: "c_butter", clown: true, reward: 1, name: "Butterfingers", desc: "Get a Game Over in the first 10% of a song.", goal: S => [S.earlyFail || 0, 1] },
  { id: "c_try", clown: true, reward: 1, name: "Did You Even Try?", desc: "Get a Game Over without hitting a single note.", goal: S => [S.zeroFail || 0, 1] },
  { id: "c_easy", clown: true, reward: 1, name: "Easy Mode? Never Heard of It", desc: "Get a Game Over on Easy.", goal: S => [S.easyFail || 0, 1] },
  { id: "c_trophy", clown: true, reward: 2, name: "Participation Trophy", desc: "Finish a song with a D grade.", goal: S => [S.dGrades || 0, 1] },
  { id: "c_miss100", clown: true, reward: 1, name: "Missed It By That Much", desc: "Miss 100 notes in one song.", goal: S => [S.maxMiss || 0, 100] },
  { id: "c_sd", clown: true, reward: 1, name: "Sudden Oops", desc: "Lose a Sudden Death run on your first miss... which is every Sudden Death loss.", goal: S => [S.sdFail || 0, 1] },
  { id: "c_flat", clown: true, reward: 1, name: "Flatline", desc: "Get a Game Over 3 times in a row.", goal: S => [S.flatline || 0, 3] },
  { id: "c_ouch", clown: true, reward: 3, name: "Frequent Faller", desc: "Get 25 Game Overs.", goal: S => [S.fails, 25] },
  { id: "c_rage", clown: true, reward: 2, name: "Rage Quit", desc: "Quit 15 songs before the end.", goal: S => [S.quits, 15] },
];

let ACH_GOT = store.get("ach", {});
let ACH_PAID = store.get("achPaid", []);   // achievements whose coins have been paid (older unlocks are paid once too)

function checkAch(ctx = {}) {
  let changed = false, pay = 0;
  for (const a of ACH) {
    if (!ACH_GOT[a.id]) {
      const [v, need] = a.goal(STATS, ctx);
      if (v >= need) { ACH_GOT[a.id] = Date.now(); changed = true; if (!ctx.silent) {
        toast(Object.assign({}, a, { desc: `+${a.reward} coin${a.reward === 1 ? "" : "s"} \u00B7 ${a.desc}` }, a.clown ? { label: "Clown achievement unlocked", icon: CLOWN_ICON, clownSound: true } : {}));
      } }
    }
    if (ACH_GOT[a.id] && !ACH_PAID.includes(a.id)) { ACH_PAID.push(a.id); pay += a.reward || 0; }
  }
  if (pay) { store.set("achPaid", ACH_PAID); setTimeout(() => setCoins(COINS + pay, pay), 0); }
  if (changed) store.set("ach", ACH_GOT);
  if ((changed || pay) && screen === "account") setTimeout(renderAccount, 0);
}

// notification: slides down from the top, sits top-centre for a few seconds, then slides away
const TROPHY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4"/></svg>';
const toastQ = []; let toastBusy = false;
function toast(a) { toastQ.push(a); if (!toastBusy) nextToast(); }
const CLOWN_ICON = '<span class="clown">\uD83E\uDD21</span>';

// honk honk, then a sad trombone slide
function clownHonk() {
  if (!actx) return;
  const t0 = actx.currentTime + 0.05, out = actx.createGain(); out.gain.value = 0.35; out.connect(actx.destination);
  const note = (type, f0, f1, at, dur, vol) => {
    const o = actx.createOscillator(), g = actx.createGain(), f = actx.createBiquadFilter();
    o.type = type; o.frequency.setValueAtTime(f0, t0 + at); o.frequency.exponentialRampToValueAtTime(f1, t0 + at + dur);
    f.type = "bandpass"; f.frequency.value = 900; f.Q.value = 1.2;
    g.gain.setValueAtTime(0.0001, t0 + at); g.gain.exponentialRampToValueAtTime(vol, t0 + at + 0.02); g.gain.setValueAtTime(vol, t0 + at + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
    o.connect(f); f.connect(g); g.connect(out); o.start(t0 + at); o.stop(t0 + at + dur + 0.05);
  };
  note("sawtooth", 440, 400, 0, 0.14, 0.9); note("square", 443, 402, 0, 0.14, 0.4);             // honk
  note("sawtooth", 440, 400, 0.2, 0.14, 0.9); note("square", 443, 402, 0.2, 0.14, 0.4);         // honk
  [[311, 0.5], [294, 0.8], [277, 1.1]].forEach(([f, at]) => note("sawtooth", f, f * 0.99, at, 0.28, 0.5));   // wah wah wah
  note("sawtooth", 262, 220, 1.4, 0.9, 0.5);                                                       // waaaah
}

function nextToast() {
  const a = toastQ.shift(); if (!a) { toastBusy = false; return; }
  toastBusy = true;
  const el = document.createElement("div"); el.className = "toast" + (a.clownSound ? " clowny" : ""); el.setAttribute("role", "status");
  if (a.clownSound) clownHonk();
  el.innerHTML = `<span class="ai">${a.icon || TROPHY}</span><span class="tx"><small>${a.label || "Achievement unlocked"}</small><b></b><em></em></span>`;
  el.querySelector("b").textContent = a.name; el.querySelector("em").textContent = a.desc;
  $("toasts").appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("in")));
  setTimeout(() => { el.classList.remove("in"); el.classList.add("out"); setTimeout(() => { el.remove(); nextToast(); }, 480); }, 3400);
}

// one finished, failed or abandoned run goes into the stats
const isTestTrack = (s) => !!s && (s.noMiss || s.id.startsWith("test"));

function endRun(kind, extra = {}) {
  if (!G || G.recorded) return; G.recorded = true;
  if (isTestTrack(G.song) || G.practice) return;   // practice (and the Test Track) don't count toward stats or achievements
  const s = G.song, real = !s.tutorial && !s.noMiss && !s.id.startsWith("test"), c = G.counts;
  STATS.plays++; STATS[kind === "clear" ? "clears" : kind === "fail" ? "fails" : "quits"]++;
  for (const k of ["perfect", "great", "good", "bad", "miss"]) STATS[k] += c[k];
  STATS.hits += c.perfect + c.great + c.good + c.bad;
  STATS.bestCombo = Math.max(STATS.bestCombo, G.maxCombo);
  STATS.time += clamp(G.lastT || 0, 0, s.duration);
  STATS.songPlays[s.id] = (STATS.songPlays[s.id] || 0) + 1;
  if (extra.coins) STATS.coinsEarned += extra.coins;
  if (kind === "clear" && real) {
    if (c.miss === 0) { STATS.fullCombos++; if (G.diff === "hard" || G.diff === "extreme") STATS.hardFC++; }
    if (extra.grade === "SS") STATS.ss++;
    if (G.diff === "extreme") STATS.extremeClears++;
  }
  if (kind === "clear" && s.tutorial) STATS.tutorial = 1;
  if (kind === "fail" && extra.reached >= 0.9) STATS.nearMiss++;
  if (kind === "fail" && extra.reached < 0.1) STATS.earlyFail = (STATS.earlyFail || 0) + 1;
  if (kind === "fail" && c.perfect + c.great + c.good + c.bad === 0) STATS.zeroFail = (STATS.zeroFail || 0) + 1;
  if (kind === "fail" && G.diff === "easy") STATS.easyFail = (STATS.easyFail || 0) + 1;
  if (kind === "fail" && G.mods && G.mods.sd) STATS.sdFail = (STATS.sdFail || 0) + 1;
  if (kind === "clear" && extra.grade === "D" && real) STATS.dGrades = (STATS.dGrades || 0) + 1;
  STATS.maxMiss = Math.max(STATS.maxMiss || 0, c.miss);
  STATS.flatline = kind === "fail" ? (STATS.flatline || 0) + 1 : kind === "clear" ? 0 : (STATS.flatline || 0);   // Game Overs in a row
  saveStats(); checkAch();
  { const x = xpForRun(kind, extra); G.xpResult = x.total ? awardXP(x.total, x.parts, kind === "quit" || (G.endless && kind === "clear")) : null; }
  if (!s.tutorial) taskEvent({ type: "run", kind, song: s, diff: G.diff, counts: c, combo: G.maxCombo, time: clamp(G.lastT || 0, 0, s.duration), coins: extra.coins || 0, grade: extra.grade, acc: extra.acc || 0 });
}

checkAch({ silent: true });   // things already earned before achievements existed
