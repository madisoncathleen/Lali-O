/*
 * LALI-O - screens/account.js
 * The Account page.
 */
"use strict";

let accTab = "level";
const fmtDur = (sec) => { const m = Math.floor(sec / 60), h = Math.floor(m / 60); return h ? `${h}h ${m % 60}m` : `${m}m ${Math.floor(sec % 60)}s`; };

function renderAccount() {
  const me = ACCOUNTS[ACCT - 1];
  $("accAvatar").style.setProperty("--c", THEME().accent); $("accAvatar").innerHTML = iconSvg(EQUIP.icon);
  $("accName").textContent = me.name;
  if ($("accNameIn").hidden) { $("accName").hidden = false; $("accRename").textContent = "Rename"; }
  const got = ACH.filter(a => ACH_GOT[a.id]).length;
  $("accSub").innerHTML = `<span class="rank-title" style="--rc:${rankOf(shownTitleLevel()).color}">${rankOf(shownTitleLevel()).name}</span> \u00B7 Level ${LV().level} \u00B7 `; $("accSub").append(`${COINS.toLocaleString()} coins \u00B7 ${STATS.clears} clear${STATS.clears === 1 ? "" : "s"} \u00B7 ${got} of ${ACH.length} achievements`);
  $("achCount").textContent = `${got}/${ACH.length}`;
  document.querySelectorAll(".acc-tab").forEach(b => b.setAttribute("aria-selected", b.dataset.t === accTab ? "true" : "false"));
  $("accStats").hidden = accTab !== "stats"; $("accAch").hidden = accTab !== "ach"; $("accLevel").hidden = accTab !== "level";
  renderLevelTab();
  // stats
  const S = STATS, judged = S.perfect + S.great + S.good + S.bad + S.miss;
  const acc = judged ? (S.perfect * J.perfect.acc + S.great * J.great.acc + S.good * J.good.acc + S.bad * J.bad.acc) / judged * 100 : 0;
  let fav = null, favN = 0;
  for (const id in S.songPlays) { const sg = SONGS.find(x => x.id === id); if (sg && !sg.tutorial && !sg.noMiss && S.songPlays[id] > favN) { fav = sg; favN = S.songPlays[id]; } }
  const tiles = [
    ["Songs played", S.plays], ["Songs cleared", S.clears], ["Game Overs", S.fails], ["Full combos", S.fullCombos],
    ["Notes hit", S.hits.toLocaleString()], ["Overall accuracy", judged ? acc.toFixed(2) + "%" : "\u2014"], ["Highest combo", S.bestCombo + "x"], ["Time played", fmtDur(S.time)],
    ["Level", LV().level], ["Total XP", XP.toLocaleString()],
    ["Coins earned", S.coinsEarned.toLocaleString()], ["SS grades", S.ss], ["Boxes opened", S.boxes], ["Items owned", ownedCount()],
  ];
  const esc = (t) => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  let html = `<div class="stat-grid">` + tiles.map(([k, v]) => `<div class="stat"><span>${k}</span><b>${esc(v)}</b></div>`).join("");
  html += `<div class="stat wide"><span>Favorite song</span><b>${fav ? esc(fav.title) + ` <small style="font-size:13px;color:var(--muted);font-weight:400">played ${favN} time${favN === 1 ? "" : "s"}</small>` : "\u2014"}</b></div>`;
  html += `<div class="stat wide"><span>Every hit judgement</span><div class="hitbar">` + ["perfect", "great", "good", "bad", "miss"].map(k => judged ? `<i style="width:${S[k] / judged * 100}%;background:${J[k].color}"></i>` : "").join("") + `</div>`
    + `<div class="hitlegend">` + ["perfect", "great", "good", "bad", "miss"].map(k => `<span style="color:${J[k].color}">${J[k].label} ${S[k].toLocaleString()}</span>`).join("") + `</div></div></div>`;
  $("accStats").innerHTML = html;
  // achievements: earned first, then the rest with a progress bar
  const list = [...ACH].sort((a, b) => (ACH_GOT[b.id] ? 1 : 0) - (ACH_GOT[a.id] ? 1 : 0));
  $("accAch").innerHTML = list.map(a => {
    const when = ACH_GOT[a.id], [v, need] = a.goal(STATS, {});
    const prog = !when && need > 1 ? `<div class="prog"><i style="width:${clamp(v / need, 0, 1) * 100}%"></i></div><small>${Math.min(v, need).toLocaleString()} / ${need.toLocaleString()}</small>` : "";
    return `<div class="ach${when ? " got" : ""}"><span class="ai">${a.clown ? CLOWN_ICON : TROPHY}</span><span class="ax"><b>${a.name}${a.clown ? ' <span class="clowntag">clown</span>' : ""}</b><small>${a.desc}</small>${prog}</span>`
      + `<span class="when"><span class="ach-rw${when ? " paid" : ""}"><i class="coin sm"></i>${when ? "+" : ""}${a.reward}</span>${when ? new Date(when).toLocaleDateString() : "Locked"}</span>` + `</div>`;
  }).join("");
  // switch account
  const rows = $("accRows"); rows.innerHTML = "";
  for (const a of ACCOUNTS) {
    const b = document.createElement("button");
    b.className = "acctRow"; b.style.setProperty("--c", THEME().accent);
    b.innerHTML = `<span class="avatar">${slotIcon(a)}</span><span class="who"><b></b><small></small></span>` + slotLevelChip(a) + (a.n === ACCT ? `<span class="tag" style="margin-left:8px">Playing</span>` : `<span class="tag" style="margin-left:8px">Switch</span>`);
    b.querySelector("b").textContent = a.name; b.querySelector("small").textContent = slotInfo(a);
    b.addEventListener("click", () => switchAccount(a.n));
    rows.appendChild(b);
  }
}

document.querySelectorAll(".acc-tab").forEach(b => b.addEventListener("click", () => { accTab = b.dataset.t; renderAccount(); }));

// rename this save: the name becomes a text box; Enter or Save keeps it, Esc cancels
function startRename() { const inp = $("accNameIn"); inp.value = ACCOUNTS[ACCT - 1].name; $("accName").hidden = true; inp.hidden = false; $("accRename").textContent = "Save"; inp.focus(); inp.select(); }

function finishRename(keep) {
  const inp = $("accNameIn"); if (inp.hidden) return;
  if (keep) renameSave(ACCT, inp.value);
  inp.hidden = true; $("accName").hidden = false; $("accRename").textContent = "Rename";
  renderAcct(); renderAccount();
}

$("accRename").addEventListener("click", () => $("accNameIn").hidden ? startRename() : finishRename(true));
$("accNameIn").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); finishRename(true); } else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); finishRename(false); } });
$("accNameIn").addEventListener("blur", () => setTimeout(() => { if (document.activeElement !== $("accRename")) finishRename(true); }, 0));
$("accBack").addEventListener("click", () => show("menu"));
