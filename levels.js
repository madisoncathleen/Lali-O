/*
 * LALI-O - progress/levels.js
 * Levels, XP, rank titles and level rewards.
 */
"use strict";

// XP comes from every run (notes hit, clears, grades, full combos, modifiers); levels pay coins, unlock
// rank titles, and hand out rewards on the Level Road that can't be bought anywhere else.
var XP = +store.get("xp", -1);
var XP_FRESH = XP < 0;   // this save has never had XP: it gets a head start from what it's already played

const xpNeed = (L) => Math.round(100 + 30 * L + 3 * L * L);   // XP to go from level L to L + 1

function lvFromXP(xp) {
  let L = 1, left = Math.max(0, xp || 0);
  while (left >= xpNeed(L)) { left -= xpNeed(L); L++; }
  return { level: L, into: left, need: xpNeed(L), pct: left / xpNeed(L) };
}

const LV = () => lvFromXP(XP);

const LV_RANKS = [
  { lv: 1, name: "Rookie", color: "#9DA3B8" }, { lv: 5, name: "Beat Novice", color: "#4FE3C1" }, { lv: 10, name: "Groove Cadet", color: "#5B8CFF" },
  { lv: 15, name: "Tempo Tamer", color: "#7B8CFF" }, { lv: 20, name: "Rhythm Runner", color: "#B98CFF" }, { lv: 25, name: "Flip Master", color: "#FF8FC7" },
  { lv: 30, name: "Combo Crafter", color: "#FF5F8F" }, { lv: 40, name: "Beat Wizard", color: "#FF8A1F" }, { lv: 50, name: "Chorus Crusher", color: "#FFB547" },
  { lv: 60, name: "Metronome", color: "#FFD65C" }, { lv: 75, name: "Virtuoso", color: "#8FF7FF" }, { lv: 90, name: "Maestro", color: "#F4F2FF" },
  { lv: 100, name: "LALI-O Legend", color: "#FFD65C", rainbow: true },
];

const rankOf = (L) => [...LV_RANKS].reverse().find(r => L >= r.lv) || LV_RANKS[0];

// the title you show: your best rank, or an earlier one you picked on the Level tab
const shownTitleLevel = () => { const t = +store.get("title", 0), L = LV().level; return t && t <= L && LV_RANKS.some(r => r.lv === t) ? t : rankOf(L).lv; };
const levelCoins = (L) => 25 + 5 * L;   // coins for reaching level L

const BIG_BONUS = { 10: 500, 20: 1000, 50: 2500, 75: 4000, 100: 10000 };
const rewardsAt = (L) => LEVEL_ITEMS.filter(i => i.levelReq === L);

// what one run is worth
function xpForRun(kind, extra) {
  const c = G.counts, s = G.song, dm = { easy: 1, medium: 1.25, hard: 1.6, extreme: 2 }[G.diff] || 1, parts = [];
  let notes = (c.perfect * 3 + c.great * 2 + c.good + c.bad * 0.5) * dm;
  if (kind === "fail") notes *= 0.75; if (kind === "quit") notes *= 0.5;
  notes = Math.round(notes);
  if (notes) parts.push([kind === "fail" ? "Notes (Game Over \u00BE)" : kind === "quit" ? "Notes (quit \u00BD)" : "Notes", notes]);
  let total = notes;
  if (kind === "clear" && !s.tutorial) {
    const cb = { easy: 40, medium: 60, hard: 90, extreme: 130 }[G.diff] || 40; parts.push(["Clear", cb]); total += cb;
    const gb = { SS: 100, S: 60, A: 30, B: 10 }[extra.grade] || 0; if (gb) { parts.push([`Grade ${extra.grade}`, gb]); total += gb; }
    if (c.miss === 0) { parts.push(["Full combo", 80]); total += 80; }
  }
  if (kind === "clear" && s.tutorial) { parts.push(["Tutorial", 150]); total += 150; }
  if (G.mult > 0 && G.mult !== 1 && total) { const x = Math.round(total * (G.mult - 1)); parts.push([`${modNames(G.mods || {}).join(" + ")} \u00D7${+G.mult.toFixed(2)}`, x]); total += x; }
  if (G.endless && kind === "clear") { const k = endlessStreak(G.endless.n); if (k > 1) { const x = Math.round(total * (k - 1)); parts.push([`Endless streak \u00D7${k.toFixed(1)}`, x]); total += x; } }
  const today = new Date().toLocaleDateString("en-CA");
  if (kind === "clear" && total > 0 && store.get("xpDay", "") !== today) { parts.push(["Daily \u00D72", total]); total *= 2; store.set("xpDay", today); }
  return { total: Math.max(0, Math.round(total)), parts };
}

// add XP; level-ups pay coins and hand out rewards. Returns what happened, for the results screen
function awardXP(total, parts, announce) {
  const before = XP, lb = LV().level;
  XP += total; store.set("xp", XP);
  const la = LV().level, got = { coins: 0, items: [], ranks: [] };
  for (let L = lb + 1; L <= la; L++) {
    got.coins += levelCoins(L) + (BIG_BONUS[L] || 0);
    for (const it of rewardsAt(L)) if (!OWNED[OWN_KEY[it.kind]].includes(it.id)) { OWNED[OWN_KEY[it.kind]].push(it.id); got.items.push(it); }
    const r = LV_RANKS.find(r => r.lv === L); if (r) got.ranks.push(r);
  }
  if (got.items.length) saveOwned();
  if (got.coins) setCoins(COINS + got.coins, screen === "game" ? got.coins : 0);
  const res = { total, parts, before, after: XP, lb, la, got };
  if (la > lb) { bumpStat("levelUps", la - lb); if (announce) { levelToast(res); levelFanfare(); } }
  renderAcctLevel();
  return res;
}

const rewardText = (res) => [`+${res.got.coins.toLocaleString()} coins`, ...res.got.ranks.map(r => `new title: ${r.name}`), ...res.got.items.map(i => `${i.name} (${KIND_LABEL[i.kind].toLowerCase()})`)].join(" \u00B7 ");

function levelToast(res) {
  toast({ label: "Level up!", name: `Level ${res.la} \u00B7 ${rankOf(res.la).name}`, desc: rewardText(res), icon: `<span class="lvbadge" style="--s:34px;--rc:${rankOf(res.la).color}">${res.la}</span>` });
}

// a rising arpeggio with a little sparkle on top
function levelFanfare() {
  if (!actx) return;
  const t0 = actx.currentTime + 0.05, out = actx.createGain(); out.gain.value = 0.22; out.connect(actx.destination);
  const note = (f, at, dur, type = "triangle", g = 0.8) => { const o = actx.createOscillator(), e = actx.createGain(); o.type = type; o.frequency.value = f;
    e.gain.setValueAtTime(0.0001, t0 + at); e.gain.exponentialRampToValueAtTime(g, t0 + at + 0.015); e.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
    o.connect(e); e.connect(out); o.start(t0 + at); o.stop(t0 + at + dur + 0.05); };
  [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.09, 0.3));
  [1047, 1319, 1568].forEach(f => note(f, 0.38, 0.9, "sine", 0.45));
  [2093, 2637, 3136, 2637].forEach((f, i) => note(f, 0.45 + i * 0.06, 0.18, "sine", 0.18));
}

// the XP block on the results and Game Over screens: the bar fills up, and wraps around for each level gained
function renderXPBox(el, res) {
  if (!res || !res.total) { el.innerHTML = ""; return; }
  const r0 = rankOf(res.lb), from = lvFromXP(res.before), to = lvFromXP(res.after);
  el.style.setProperty("--rc", rankOf(res.la).color);
  el.innerHTML = `<div class="xphead"><b>+${res.total.toLocaleString()} XP</b><span class="lvchip${r0.rainbow ? " rainbow" : ""}" style="--rc:${r0.color}">Lv ${res.lb}</span><small></small></div>`
    + `<div class="xpbar"><i></i></div><div class="xpfoot"><span class="xpnum"></span><span class="xpleft"></span></div><div class="lvupslot"></div>`;
  el.querySelector("small").textContent = res.parts.map(p => `${p[0]} +${p[1].toLocaleString()}`).join(" \u00B7 ");
  const bar = el.querySelector(".xpbar i"), num = el.querySelector(".xpnum"), left = el.querySelector(".xpleft");
  const show = (st) => { num.textContent = `${Math.floor(st.into).toLocaleString()} / ${st.need.toLocaleString()} XP`; left.textContent = `${(st.need - Math.floor(st.into)).toLocaleString()} to Level ${st.level + 1}`; };
  bar.style.transition = "none"; bar.style.width = (from.pct * 100) + "%"; show(from);
  let L = res.lb;
  const step = () => {
    if (L < res.la) {   // fill to the end, pop, and start the next level
      bar.style.transition = "width .7s cubic-bezier(.3,.7,.3,1)"; bar.style.width = "100%";
      setTimeout(() => { L++; bar.style.transition = "none"; bar.style.width = "0%";
        const chip = el.querySelector(".lvchip"), rk = rankOf(L); chip.textContent = "Lv " + L; chip.style.setProperty("--rc", rk.color); chip.classList.toggle("rainbow", !!rk.rainbow);
        void bar.offsetWidth; step(); }, 760);
    } else {
      bar.style.transition = "width .8s cubic-bezier(.3,.7,.3,1)"; bar.style.width = (to.pct * 100) + "%"; show(to);
      if (res.la > res.lb) {
        const b = document.createElement("div"); b.className = "lvup";
        b.innerHTML = `<b></b><small></small>`; b.querySelector("b").textContent = `LEVEL UP! Level ${res.la} \u00B7 ${rankOf(res.la).name}`;
        b.querySelector("small").textContent = rewardText(res);
        el.querySelector(".lvupslot").appendChild(b); levelFanfare();
      }
    }
  };
  setTimeout(step, 450);
}

// the level chip and thin XP bar on the account button (main menu)
function renderAcctLevel() {
  if (!$("acctLv")) return;
  const st = LV(), rk = rankOf(st.level), sr = rankOf(shownTitleLevel());
  $("acctLv").textContent = "Lv " + st.level; $("acctLv").style.setProperty("--rc", rk.color); $("acctLv").classList.toggle("rainbow", !!rk.rainbow);
  $("acctBtn").style.setProperty("--rc", rk.color); $("acctXP").style.width = (st.pct * 100) + "%";
  $("acctBtn").title = `${sr.name} \u00B7 Level ${st.level} \u00B7 ${Math.floor(st.into).toLocaleString()} / ${st.need.toLocaleString()} XP`;
  if ($("lvTabNum")) $("lvTabNum").textContent = st.level;
}

// Account page: the Level tab
function renderLevelTab() {
  const box = $("accLevel"); if (!box) return;
  const st = LV(), rk = rankOf(st.level), today = new Date().toLocaleDateString("en-CA"), boostUsed = store.get("xpDay", "") === today;
  const sr = rankOf(shownTitleLevel());
  let h = `<div class="lvcard" style="--rc:${rk.color}"><div class="lvbadge${rk.rainbow ? " rainbow" : ""}">${st.level}</div><div class="lvinfo">`
    + `<h3>Level ${st.level}</h3><span class="rank-title" style="--rc:${sr.color}">${sr.name}</span>`
    + `<div class="xpbar"><i style="width:${st.pct * 100}%"></i></div>`
    + `<div class="xpfoot"><span>${Math.floor(st.into).toLocaleString()} / ${st.need.toLocaleString()} XP</span><span>${(st.need - Math.floor(st.into)).toLocaleString()} XP to Level ${st.level + 1}</span><span>${XP.toLocaleString()} XP all time</span></div>`
    + `<span class="boost${boostUsed ? " used" : ""}">${boostUsed ? "Daily \u00D72 XP used today. It's back tomorrow." : "Daily \u00D72 XP is ready: your next clear earns double."}</span></div></div>`;
  // titles
  h += `<div class="lvsec"><h4>Title</h4><p class="hint" style="margin:0">Unlock a new title at each rank. Pick the one shown on your account.</p><div class="titles">`
    + LV_RANKS.map(r => `<button data-lv="${r.lv}" style="--rc:${r.color}" aria-pressed="${r.lv === shownTitleLevel()}" ${r.lv > st.level ? "disabled" : ""}>${r.name}${r.lv > st.level ? ` \u00B7 Lv ${r.lv}` : ""}</button>`).join("") + `</div></div>`;
  // the level road: every level with an item, a big bonus or a new title
  const stops = [...new Set([...LEVEL_ITEMS.map(i => i.levelReq), ...LV_RANKS.map(r => r.lv).filter(l => l > 1), ...Object.keys(BIG_BONUS).map(Number)])].sort((a, b) => a - b);
  const nextStop = stops.find(l => l > st.level);
  h += `<div class="lvsec"><h4>Level Road</h4><p class="hint" style="margin:0">Every level pays coins (${levelCoins(2)} at Level 2, more each level). These levels also give something special. Level rewards can't be bought.</p><div class="road">`;
  for (const L of stops) {
    const got = L <= st.level, r = LV_RANKS.find(x => x.lv === L), items = rewardsAt(L);
    const chips = [`<span><i class="coin sm"></i>${(levelCoins(L) + (BIG_BONUS[L] || 0)).toLocaleString()}</span>`];
    if (r) chips.push(`<span style="color:${r.color}">Title: ${r.name}</span>`);
    for (const it of items) { const sw = it.kind === "icon" ? iconSvg(it.id) : swatchCss(it) ? `<i class="dot" style="background:${swatchCss(it)}"></i>` : ""; chips.push(`<span>${sw}${it.name} <small style="color:var(--muted)">${KIND_LABEL[it.kind]}</small></span>`); }
    h += `<div class="road-row${got ? " got" : ""}${L === nextStop ? " next" : ""}" style="--rc:${rankOf(L).color}"><span class="rl"><i></i>${L}</span><span class="rw">${chips.join("")}</span><span class="rs">${got ? "Unlocked" : L === nextStop ? `${lvTotal(L) - XP > 0 ? (lvTotal(L) - XP).toLocaleString() + " XP to go" : ""}` : "Locked"}</span></div>`;
  }
  h += `</div></div>`;
  // how to earn it
  h += `<div class="lvsec"><h4>How to earn XP</h4><table class="xpways">
    <tr><td>Each note: PERFECT, GREAT, GOOD, BAD</td><td>3 \u00B7 2 \u00B7 1 \u00B7 \u00BD</td></tr>
    <tr><td>\u00D7 difficulty: Easy, Medium, Hard, Extreme</td><td>\u00D71 \u00B7 \u00D71.25 \u00B7 \u00D71.6 \u00B7 \u00D72</td></tr>
    <tr><td>Clearing the song (by difficulty)</td><td>+40 \u00B7 60 \u00B7 90 \u00B7 130</td></tr>
    <tr><td>Grade SS \u00B7 S \u00B7 A \u00B7 B</td><td>+100 \u00B7 60 \u00B7 30 \u00B7 10</td></tr>
    <tr><td>Full combo</td><td>+80</td></tr>
    <tr><td>Modifiers (the same multipliers as coins) and Endless streaks</td><td>\u00D7 all of it</td></tr>
    <tr><td>Your first clear each day</td><td>\u00D72</td></tr>
    <tr><td>Game Over \u00B7 quitting</td><td>\u00BE \u00B7 \u00BD of the note XP</td></tr>
    <tr><td>Practice and the Test Track</td><td>no XP</td></tr></table></div>`;
  box.innerHTML = h;
  box.querySelectorAll(".titles button").forEach(b => b.addEventListener("click", () => { store.set("title", +b.dataset.lv); renderAccount(); renderAcctLevel(); }));
}

const lvTotal = (L) => { let t = 0; for (let k = 1; k < L; k++) t += xpNeed(k); return t; };   // XP needed to reach level L from zero

// a save that played before levels existed starts with XP for what it has already done
if (XP_FRESH) {
  const S = STATS;
  XP = Math.round((S.perfect * 3 + S.great * 2 + S.good + S.bad * 0.5) * 1.2 + S.clears * 70 + (S.fullCombos || 0) * 80);
  store.set("xp", XP);
  const L = LV().level;
  let coins = 0; for (let k = 2; k <= L; k++) coins += levelCoins(k) + (BIG_BONUS[k] || 0);
  if (coins) setCoins(COINS + coins);
  if (L > 1) setTimeout(() => toast({ label: "Levels are here", name: `You start at Level ${L} \u00B7 ${rankOf(L).name}`, desc: `From everything you've already played. +${coins.toLocaleString()} coins for the levels you skipped.`, icon: `<span class="lvbadge" style="--s:34px;--rc:${rankOf(L).color}">${L}</span>` }), 1500);
}

// rewards for levels you've reached are always in your inventory (also fills in rewards added later)
{ const L = LV().level; let changed = false;
  for (const it of LEVEL_ITEMS) if (it.levelReq <= L && !OWNED[OWN_KEY[it.kind]].includes(it.id)) { OWNED[OWN_KEY[it.kind]].push(it.id); changed = true; }
  if (changed) saveOwned(); }

renderAcctLevel(); renderAcct();
