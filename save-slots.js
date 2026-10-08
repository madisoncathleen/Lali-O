/*
 * LALI-O - screens/save-slots.js
 * The save slot list in the Account menu.
 */
"use strict";

// each save's own profile icon
function slotIcon(a) {
  if (a.n === ACCT) return iconSvg(EQUIP.icon);
  try { const e = JSON.parse(localStorage.getItem(a.prefix + "equip") || "{}"); return iconSvg(e && e.icon); } catch (e) { return iconSvg("person"); }
}

function slotInfo(a) {
  const get = (k, d) => { try { const v = localStorage.getItem(a.prefix + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  // the save you're playing reads its live numbers; the other one reads what it saved
  const mine = a.n === ACCT, coins = mine ? COINS : Math.floor(+get("coins", 0) || 0);
  const st = mine ? STATS : get("stats", null), bests = get("bests", {});
  const clears = st && typeof st.clears === "number" ? st.clears : Object.values(bests).reduce((n, b) => n + Object.keys(b || {}).length, 0);
  const ready = typeof XP === "number";   // (levels load a moment after this first runs)
  const xp = mine && ready ? XP : +get("xp", 0) || 0, lv = ready ? lvFromXP(xp).level : 1;
  return clears || coins || xp ? `${coins.toLocaleString()} coins \u00B7 ${clears} clear${clears === 1 ? "" : "s"}` : "New game";
}

// the level chip shown on each save's row
function slotLevelChip(a) {
  if (typeof XP !== "number") return "";
  let xp = 0;
  if (a.n === ACCT && typeof XP === "number") xp = XP; else try { xp = +JSON.parse(localStorage.getItem(a.prefix + "xp") || "0") || 0; } catch (e) {}
  const L = lvFromXP(xp).level, r = rankOf(L);
  return `<span class="lvchip${r.rainbow ? " rainbow" : ""}" style="--rc:${r.color};margin-left:auto">Lv ${L}</span>`;
}

function renderAcct() {
  const me = ACCOUNTS[ACCT - 1];
  if (typeof renderAcctLevel === "function" && typeof XP !== "undefined" && XP !== undefined) renderAcctLevel();
  $("acctBtn").style.setProperty("--c", THEME().accent);   // the profile icon follows this save's theme
  $("acctAvatar").innerHTML = iconSvg(EQUIP.icon); $("acctName").textContent = me.name;
  const m = $("acctMenu"); m.innerHTML = "";
  for (const a of ACCOUNTS) {
    const b = document.createElement("button");
    b.className = "acctRow"; b.setAttribute("role", "menuitem"); b.style.setProperty("--c", THEME().accent);
    b.innerHTML = `<span class="avatar">${slotIcon(a)}</span><span class="who"><b></b><small></small></span>` + slotLevelChip(a) + (a.n === ACCT ? `<span class="tag" style="margin-left:8px">Playing</span>` : "");
    b.querySelector("b").textContent = a.name; b.querySelector("small").textContent = slotInfo(a);
    b.addEventListener("click", () => switchAccount(a.n));
    m.appendChild(b);
  }
  const p = document.createElement("p"); p.textContent = "Each save has its own coins, scores, items, settings and added songs."; m.appendChild(p);
}

function toggleAcct(open) {
  const m = $("acctMenu"), on = open === undefined ? m.hidden : open;
  if (on) renderAcct();
  m.hidden = !on; $("acctBtn").setAttribute("aria-expanded", on ? "true" : "false");
  if (on) setTimeout(() => m.querySelector(".acctRow").focus({ preventScroll: true }), 0);
}

function switchAccount(n) {
  if (n === ACCT) { toggleAcct(false); return; }
  if (G && !G.recorded) endRun("quit");
  try { localStorage.setItem("lalio.account", String(n)); } catch (e) {}
  location.reload();   // load the other save fresh
}

$("acctBtn").addEventListener("click", (e) => { e.stopPropagation(); show("account"); });
document.addEventListener("pointerdown", (e) => { if (!$("acctMenu").hidden && !$("acct").contains(e.target)) toggleAcct(false); });
renderAcct();
newTip();
