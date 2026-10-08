/*
 * LALI-O - progress/quests.js
 * Daily and weekly tasks.
 */
"use strict";

// Tasks are picked from these pools by the date, so everyone gets the same ones on the same day and they rotate forever.
// metric: what a finished run (or a purchase) adds; max: keep the best single run instead of adding up.
const HARDER = { easy: 0, medium: 1, hard: 2, extreme: 3 };

const DAILY_TASKS = [
  { id: "play3", text: "Play 3 songs", goal: 3, reward: 30, m: "plays" },
  { id: "clear2", text: "Clear 2 songs", goal: 2, reward: 40, m: "clears" },
  { id: "clear4", text: "Clear 4 songs", goal: 4, reward: 60, m: "clears" },
  { id: "hits300", text: "Hit 300 notes", goal: 300, reward: 30, m: "hits" },
  { id: "hits800", text: "Hit 800 notes", goal: 800, reward: 50, m: "hits" },
  { id: "perf200", text: "Get 200 PERFECTs", goal: 200, reward: 40, m: "perfect" },
  { id: "perf500", text: "Get 500 PERFECTs", goal: 500, reward: 65, m: "perfect" },
  { id: "combo100", text: "Reach a 100 combo", goal: 100, reward: 40, m: "combo", max: true },
  { id: "combo200", text: "Reach a 200 combo", goal: 200, reward: 70, m: "combo", max: true },
  { id: "gradeA", text: "Get an A grade or better", goal: 1, reward: 40, m: "gradeA" },
  { id: "gradeS", text: "Get an S grade or better", goal: 1, reward: 60, m: "gradeS" },
  { id: "acc95", text: "Clear a song with 95% accuracy or more", goal: 1, reward: 50, m: "acc95" },
  { id: "med2", text: "Clear 2 songs on Medium or harder", goal: 2, reward: 40, m: "medPlus" },
  { id: "hard1", text: "Clear a song on Hard or Extreme", goal: 1, reward: 50, m: "hardPlus" },
  { id: "ext1", text: "Clear a song on Extreme", goal: 1, reward: 80, m: "extreme" },
  { id: "fc1", text: "Full combo a song", goal: 1, reward: 70, m: "fc" },
  { id: "diff3", text: "Clear 3 different songs", goal: 3, reward: 50, m: "distinct" },
  { id: "time5", text: "Play for 5 minutes", goal: 300, reward: 30, m: "time", fmt: "min" },
  { id: "time10", text: "Play for 10 minutes", goal: 600, reward: 50, m: "time", fmt: "min" },
  { id: "coins60", text: "Earn 60 coins from songs", goal: 60, reward: 40, m: "coins" },
  { id: "songday", text: "Clear today's song: ", goal: 1, reward: 55, m: "songOfDay" },
  { id: "noMiss3", text: "Clear a song with 3 misses or fewer", goal: 1, reward: 50, m: "fewMiss" },
];

const WEEKLY_TASKS = [
  { id: "wclear20", text: "Clear 20 songs", goal: 20, reward: 250, m: "clears" },
  { id: "wclear35", text: "Clear 35 songs", goal: 35, reward: 350, m: "clears" },
  { id: "whits5k", text: "Hit 5,000 notes", goal: 5000, reward: 250, m: "hits" },
  { id: "whits10k", text: "Hit 10,000 notes", goal: 10000, reward: 400, m: "hits" },
  { id: "wperf3k", text: "Get 3,000 PERFECTs", goal: 3000, reward: 300, m: "perfect" },
  { id: "wcombo300", text: "Reach a 300 combo", goal: 300, reward: 300, m: "combo", max: true },
  { id: "wgradeS5", text: "Get 5 S grades or better", goal: 5, reward: 300, m: "gradeS" },
  { id: "wext5", text: "Clear 5 songs on Extreme", goal: 5, reward: 400, m: "extreme" },
  { id: "whard10", text: "Clear 10 songs on Hard or Extreme", goal: 10, reward: 300, m: "hardPlus" },
  { id: "wfc3", text: "Full combo 3 songs", goal: 3, reward: 350, m: "fc" },
  { id: "wdiff8", text: "Clear 8 different songs", goal: 8, reward: 300, m: "distinct" },
  { id: "wtime60", text: "Play for 60 minutes", goal: 3600, reward: 300, m: "time", fmt: "min" },
  { id: "wbox2", text: "Open 2 mystery boxes", goal: 2, reward: 200, m: "boxes" },
  { id: "wbuy3", text: "Buy 3 items in the Store", goal: 3, reward: 200, m: "bought" },
  { id: "wacc95x5", text: "Clear 5 songs with 95% accuracy or more", goal: 5, reward: 300, m: "acc95" },
];

const dayKey = (d = new Date()) => d.toLocaleDateString("en-CA");                                   // local date, e.g. 2026-09-27

const dayNum = (d = new Date()) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
const weekNum = (d = new Date()) => Math.floor((dayNum(d) + 3) / 7);                                 // weeks start on Monday

function seeded(seed) { let x = (seed * 2654435761) >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }

function pickTasks(pool, n, seed) {
  const r = seeded(seed), out = [], used = new Set(), order = pool.map(t => [r(), t]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  for (const t of order) { if (out.length >= n) break; if (used.has(t.m)) continue; used.add(t.m); out.push(t); }   // never two of the same kind
  return out;
}

function songOfDay() { const b = builtInSongs(); return b.length ? b[Math.floor(seeded(dayNum() * 7 + 3)() * b.length)] : null; }
let TASKS = store.get("tasks", {});

function currentTasks() {
  const dk = dayKey(), wk = weekNum();
  if (TASKS.day !== dk) TASKS = Object.assign(TASKS, { day: dk, dp: {}, dc: [], dseen: [], dset: {} });
  if (TASKS.week !== wk) TASKS = Object.assign(TASKS, { week: wk, wp: {}, wc: [], wseen: [], wset: {} });
  return { daily: dailySet(dayNum()), weekly: weeklySet(wk) };
}

// quests never repeat the previous day's (or week's): each set skips the kinds of quest used in the one before it.
// It's worked out day by day from a fixed start, so everyone still gets the same quests on the same day.
const TASK_CHAIN_DAY = 20724, TASK_CHAIN_WEEK = Math.floor((20724 + 3) / 7);   // 2026-09-28 and its week

const chainCache = new Map();

function chainPick(pool, n, seedOf, start, k) {
  if (k <= start) return pickTasks(pool, n, seedOf(k));
  const key = pool.length + ":" + k; if (chainCache.has(key)) return chainCache.get(key);
  let prev = pickTasks(pool, n, seedOf(start));
  for (let d = start + 1; d <= k; d++) {
    const avoid = new Set(prev.map(t => t.m));
    prev = pickTasks(pool.filter(t => !avoid.has(t.m)), n, seedOf(d));
  }
  chainCache.set(key, prev); return prev;
}

const dailySet = (d) => chainPick(DAILY_TASKS, 3, x => x, TASK_CHAIN_DAY, d);
const weeklySet = (w) => chainPick(WEEKLY_TASKS, 2, x => x * 31 + 11, TASK_CHAIN_WEEK, w);
const taskText = (t) => t.m === "songOfDay" ? t.text + ((songOfDay() || {}).title || "any song") : t.text;

function taskAmount(t, ev) {
  if (ev.type === "box") return t.m === "boxes" ? 1 : 0;
  if (ev.type === "buy") return t.m === "bought" ? 1 : 0;
  const clear = ev.kind === "clear", c = ev.counts, h = HARDER[ev.diff] || 0;
  switch (t.m) {
    case "plays": return ev.kind === "quit" ? 0 : 1;   // quitting straight away doesn't count
    case "clears": return clear ? 1 : 0;
    case "hits": return c.perfect + c.great + c.good + c.bad;
    case "perfect": return c.perfect;
    case "combo": return ev.combo;
    case "gradeA": return clear && ["SS", "S", "A"].includes(ev.grade) ? 1 : 0;
    case "gradeS": return clear && ["SS", "S"].includes(ev.grade) ? 1 : 0;
    case "acc95": return clear && ev.acc >= 95 ? 1 : 0;
    case "medPlus": return clear && h >= 1 ? 1 : 0;
    case "hardPlus": return clear && h >= 2 ? 1 : 0;
    case "extreme": return clear && h >= 3 ? 1 : 0;
    case "fc": return clear && c.miss === 0 ? 1 : 0;
    case "fewMiss": return clear && c.miss <= 3 ? 1 : 0;
    case "time": return ev.time;
    case "coins": return ev.coins;
    case "songOfDay": { const sd = songOfDay(); return clear && sd && ev.song.id === sd.id ? 1 : 0; }
  }
  return 0;
}

function taskEvent(ev) {
  const { daily, weekly } = currentTasks(), done = [];
  for (const [list, prog, setKey] of [[daily, "dp", "dset"], [weekly, "wp", "wset"]]) for (const t of list) {
    const before = TASKS[prog][t.id] || 0;
    if (before >= t.goal) continue;
    let v;
    if (t.m === "distinct") { const set = TASKS[setKey][t.id] || []; if (ev.type === "run" && ev.kind === "clear" && !set.includes(ev.song.id)) set.push(ev.song.id); TASKS[setKey][t.id] = set; v = set.length; }
    else { const a = taskAmount(t, ev); v = t.max ? Math.max(before, a) : before + a; }
    TASKS[prog][t.id] = v;
    if (v >= t.goal) done.push(t);
  }
  store.set("tasks", TASKS);
  for (const t of done) toast({ label: "Quest complete", name: taskText(t), desc: `Claim ${t.reward} coins in Quests on the main menu`, icon: '<i class="coin"></i>' });
  renderTasks();
}

function claimTask(t, weekly) {
  const [prog, claimed] = weekly ? ["wp", "wc"] : ["dp", "dc"];
  if ((TASKS[prog][t.id] || 0) < t.goal || TASKS[claimed].includes(t.id)) return;
  TASKS[claimed].push(t.id); store.set("tasks", TASKS);
  setCoins(COINS + t.reward, t.reward); bumpStat("tasks");
  renderTasks();
}

function fmtLeft(ms) { const m = Math.max(0, Math.floor(ms / 60000)), d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60); return d ? `${d}d ${h}h` : `${h}h ${m % 60}m`; }

function renderTasks() {
  if (!$("dayTasks")) return;
  const { daily, weekly } = currentTasks(), now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ((8 - now.getDay()) % 7 || 7));
  $("dayReset").textContent = `New quests in ${fmtLeft(midnight - now)}`;
  $("weekReset").textContent = `New quests in ${fmtLeft(monday - now)}`;
  let claimable = 0;
  for (const [list, box, prog, claimed, isWeek] of [[daily, "dayTasks", "dp", "dc", false], [weekly, "weekTasks", "wp", "wc", true]]) {
    const el = $(box); el.innerHTML = "";
    for (const t of list) {
      const v = Math.min(TASKS[prog][t.id] || 0, t.goal), got = TASKS[claimed].includes(t.id), full = v >= t.goal;
      if (full && !got) claimable++;
      const d = document.createElement("div"); d.className = "task" + (got ? " claimed" : full ? " done" : "");
      const pg = t.fmt === "min" ? `${Math.floor(v / 60)} / ${t.goal / 60} min` : `${Math.floor(v).toLocaleString()} / ${t.goal.toLocaleString()}`;
      d.innerHTML = `<span class="tt"></span>` + (got ? `<span class="rw">Claimed</span>` : full ? `<button class="claim">Claim ${t.reward}</button>` : `<span class="rw"><i class="coin sm"></i>${t.reward}</span>`)
        + `<span class="bar"><i style="width:${v / t.goal * 100}%"></i></span><span class="pg">${pg}</span>`;
      d.querySelector(".tt").textContent = taskText(t);
      const b = d.querySelector(".claim"); if (b) b.addEventListener("click", () => claimTask(t, isWeek));
      el.appendChild(d);
    }
  }
  $("taskDot").hidden = !claimable;
  renderMarquee(daily, weekly);
}

function renderMarquee(daily, weekly) {
  const tr = $("mqTrack"); if (!tr) return;
  const item = (t, isWeek) => {
    const prog = isWeek ? "wp" : "dp", claimed = isWeek ? "wc" : "dc";
    const v = Math.min(TASKS[prog][t.id] || 0, t.goal), got = TASKS[claimed].includes(t.id), full = v >= t.goal;
    const pg = got ? "Claimed" : full ? "Ready to claim on the main menu!" : t.fmt === "min" ? `${Math.floor(v / 60)}/${t.goal / 60} min` : `${Math.floor(v).toLocaleString()}/${t.goal.toLocaleString()}`;
    const esc = (x) => String(x).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    return `<span class="mq-item${got ? " got" : full ? " ready" : ""}"><span class="k">${isWeek ? "Weekly" : "Daily"}</span><span>${esc(taskText(t))}</span><span class="p">${pg}</span><span class="r"><i class="coin sm"></i>${t.reward}</span></span><span class="mq-sep">&#9670;</span>`;
  };
  const one = daily.map(t => item(t, false)).join("") + weekly.map(t => item(t, true)).join("");
  // two copies side by side: sliding by one copy's width loops seamlessly
  let html = one + one;
  tr.innerHTML = html;
  const w = tr.scrollWidth / 2 || 1200, vw = $("questMarquee").clientWidth || 1200;
  if (w < vw) { tr.innerHTML = one.repeat(Math.ceil(vw / w) * 2); }   // wide screens: repeat enough to always fill it
  tr.style.setProperty("--mq-dur", Math.round((tr.scrollWidth / 2) / 45) + "s");   // about 45 px per second
}

function toggleTasks(open) {
  const p = $("taskPanel"), on = open === undefined ? !p.classList.contains("open") : open;
  if (on) renderTasks();
  p.classList.toggle("open", on); p.setAttribute("aria-hidden", on ? "false" : "true");
  $("taskTab").setAttribute("aria-expanded", on ? "true" : "false");
}

$("taskTab").addEventListener("click", () => toggleTasks());
$("taskClose").addEventListener("click", () => toggleTasks(false));
setInterval(() => { if (screen === "menu") renderTasks(); }, 30000);   // keeps the countdowns fresh and rolls over at midnight

renderTasks();
