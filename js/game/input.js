/*
 * LALI-O - game/input.js
 * Keyboard, mouse and touch input.
 */
"use strict";

function laneOf(code) { return settings.keys.findIndex(k => k.code === code); }

document.addEventListener("keydown", (e) => {
  if (!$("gate").hidden) { e.preventDefault(); unlock(); return; }   // the first key only dismisses the start screen
  if (!$("coinInfo").hidden && e.key === "Escape") { e.preventDefault(); closeCoinInfo(); $("coins").focus({ preventScroll: true }); return; }
  if (screen === "settings" && CAL.on) {   // auto offset: lane keys (or Space) are taps, Esc stops it
    if (e.key === "Escape") { e.preventDefault(); calibStop("Stopped. Your offset wasn't changed."); return; }
    if (laneOf(e.code) >= 0 || e.code === "Space") { e.preventDefault(); if (!e.repeat) calibTap(e.timeStamp || performance.now()); return; }
  }
  if (bindingLane >= 0 && screen === "settings") {
    e.preventDefault();
    if (e.key !== "Escape") {
      // swap if the key is already used by another lane
      const other = laneOf(e.code);
      if (other >= 0 && other !== bindingLane) settings.keys[other] = { ...settings.keys[bindingLane] };
      settings.keys[bindingLane] = { code: e.code, label: keyLabel(e) };
      saveSettings();
    }
    bindingLane = -1; renderKeys(); return;
  }
  if (screen === "game" && G) {
    const lane = laneOf(e.code);
    if (!$("gameover").hidden || G.over) {
      if ($("gameover").hidden) return;
      if (e.key === "Escape") { e.preventDefault(); quitGame("select"); }
      else overlayNav($("gameover"), e);
      return;
    }
    if (G.paused && !$("pause").hidden && (e.key === "l" || e.key === "L")) { e.preventDefault(); $("pQuit").focus({ preventScroll: true }); return; }   // L jumps to Quit (Enter to confirm)
    if (G.paused && !$("pause").hidden && e.key !== "Escape") { overlayNav($("pause"), e); return; }
    if (e.key === "Escape") { e.preventDefault(); if (!$("results").hidden) quitGame("select"); else if (G.paused) resumeGame(); else pauseGame(); return; }
    if (!$("results").hidden) { overlayNav($("results"), e); return; }
    if (lane >= 0) {
      e.preventDefault();
      if (e.repeat || G.paused || G.finished) return;
      G.pressed[lane] = true;
      hitLane(lane, songTime(e.timeStamp || performance.now()));
    }
    return;
  }
  if (!$("loading").hidden) { if (e.key === "Escape") { loadToken++; $("loading").hidden = true; } return; }
  if (!$("addSong").hidden) { if (e.key === "Escape") { e.preventDefault(); closeAdd(); } return; }
  if (screen === "select" && e.target && e.target.id === "songSearch") {
    if (e.key === "ArrowDown") { e.preventDefault(); moveSel(1, true); }
    else if (e.key === "ArrowUp") { e.preventDefault(); moveSel(-1, true); }
    else if (e.key === "Enter") { e.preventDefault(); if (visibleSongs().length) startGame(); }
    else if (e.key === "Escape") { e.preventDefault(); if (e.target.value) { e.target.value = ""; songQuery = ""; renderSelect(); } else e.target.blur(); }
    return;
  }
  if (screen === "select" && e.key === "/" ) { e.preventDefault(); $("songSearch").focus(); return; }
  if (screen === "menu" && !$("acctMenu").hidden) {   // save-slot dropdown
    if (e.key === "Escape") { e.preventDefault(); toggleAcct(false); $("acctBtn").focus({ preventScroll: true }); }
    else overlayNav($("acctMenu"), e);
    return;
  }
  if (screen === "menu" && (e.key === "q" || e.key === "Q") && !e.repeat) { e.preventDefault(); toggleTasks(); return; }   // Q for Quests
  if (screen === "menu" && e.key === "Escape" && $("taskPanel").classList.contains("open")) { e.preventDefault(); toggleTasks(false); return; }
  if (screen === "menu" && e.key === "Escape" && !e.repeat) { e.preventDefault(); show("account"); return; }   // Esc on the main menu opens your account
  if (screen === "menu") {   // arrow keys move through the menu, Enter picks
    const btns = [...document.querySelectorAll(".menu-buttons .big")];
    let i = btns.indexOf(document.activeElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      i = i < 0 ? 0 : (i + (e.key === "ArrowDown" ? 1 : -1) + btns.length) % btns.length;
      btns[i].focus({ preventScroll: true });
    } else if (e.key === "Enter" && !e.repeat) {
      e.preventDefault();
      btns[i < 0 ? 0 : i].click();
    }
    return;
  }
  if (!$("boxOpen").hidden) {
    if (e.key === "Escape") { e.preventDefault(); closeBox(); }
    else if (!$("boxResult").hidden) overlayNav($("boxResult"), e);
    else e.preventDefault();
    return;
  }
  if (screen === "store" && e.target && e.target.id === "storeSearch") {
    if (e.key === "ArrowDown") { e.preventDefault(); moveStore(1, true); }
    else if (e.key === "ArrowUp") { e.preventDefault(); moveStore(-1, true); }
    else if (e.key === "Enter") { e.preventDefault(); if (!$("stAction").disabled) storeActivate(); }
    else if (e.key === "Escape") { e.preventDefault(); if (e.target.value) clearStoreSearch(); else e.target.blur(); }
    return;
  }
  if (screen === "store" && e.key === "/" && !(e.target && e.target.tagName === "INPUT")) { e.preventDefault(); $("storeSearch").focus(); return; }
  if (screen === "store" && (e.key === "s" || e.key === "S") && !(e.target && e.target.tagName === "INPUT") && $("boxOpen").hidden) { e.preventDefault(); cycleSort(); return; }
  if (screen === "store") {
    if (e.target && e.target.tagName === "INPUT") {
      if (e.key === "Enter") { e.preventDefault(); redeem(); } else if (e.key === "Escape") { e.preventDefault(); e.target.blur(); }
      return;
    }
    if (e.key === "Escape" || (e.key === "ArrowLeft" && stLevel === "items")) { e.preventDefault(); storeBack(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); moveStore(1, true); }
    else if (e.key === "ArrowUp") { e.preventDefault(); moveStore(-1, true); }
    else if (e.key === "Enter" || (e.key === "ArrowRight" && stLevel === "cats")) { e.preventDefault(); if (!$("stAction").disabled) storeActivate(); }
    else if ((e.key === "b" || e.key === "B") && trialOn()) { const it = stCurrent(); if (it && it.kind !== "box" && !isOwnedReal(it) && COINS >= priceOf(it)) { e.preventDefault(); storeActivate(true); } }
    return;
  }
  if (screen === "account" && e.target && e.target.tagName === "INPUT") return;
  if (screen === "account") {
    if (e.key === "Escape") { e.preventDefault(); show("menu"); }
    else if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); const T3 = ["level", "stats", "ach"]; accTab = T3[(T3.indexOf(accTab) + (e.key === "ArrowRight" ? 1 : 2)) % 3]; renderAccount(); }
    return;
  }
  if (screen === "inventory") {
    if (e.target && e.target.tagName === "INPUT") { if (e.key === "Escape") { e.preventDefault(); e.target.blur(); } return; }
    if (e.key === "Escape") { e.preventDefault(); show("menu"); }
    return;
  }
  if (screen === "select") {
    if (e.key === "Escape") { e.preventDefault(); show("menu"); }
    else if (e.key === "ArrowDown") { e.preventDefault(); moveSel(1, true); }
    else if (e.key === "ArrowUp") { e.preventDefault(); moveSel(-1, true); }
    else if (e.key === "ArrowRight") { e.preventDefault(); moveDiff(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); moveDiff(-1); }
    else if (e.key === "Enter") { e.preventDefault(); if (visibleSongs().length) startGame(); }
    else if ((e.key === "p" || e.key === "P") && !e.repeat) { e.preventDefault(); togglePractice(); toggleModPanel(true); }
    else if ((e.key === "m" || e.key === "M") && !e.repeat) { e.preventDefault(); toggleModPanel(); }
  } else if (screen === "settings") {
    if (e.target && e.target.tagName === "INPUT" && e.target.type !== "range" && e.target.type !== "checkbox" && e.key !== "Escape") return;
    if (e.key === "Escape") { e.preventDefault(); setBackStep(); }
    else if (!setGroup && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      const btns = [...document.querySelectorAll(".setcat")]; let i = btns.indexOf(document.activeElement);
      i = i < 0 ? 0 : (i + (e.key === "ArrowDown" ? 1 : -1) + btns.length) % btns.length; btns[i].focus({ preventScroll: true });
    }
  }
});

document.addEventListener("keyup", (e) => {
  if (screen !== "game" || !G) return;
  const lane = laneOf(e.code);
  if (lane < 0) return;
  G.pressed[lane] = false;
  if (!G.paused && !G.finished) releaseLane(lane, songTime(e.timeStamp || performance.now()));
});

// touch / mouse lanes on the playfield
const pointers = new Map();

playC.addEventListener("pointerdown", (e) => {
  if (!G || G.paused || G.finished) return;
  const W = playC.clientWidth, fw = Math.min(W - 32, 460), x = (W - fw) / 2;
  const lane = Math.floor((e.clientX - x) / (fw / 4));
  if (lane < 0 || lane > 3) return;
  pointers.set(e.pointerId, lane); G.pressed[lane] = true;
  hitLane(lane, songTime(e.timeStamp || performance.now()));
});

const pointerEnd = (e) => {
  const lane = pointers.get(e.pointerId); if (lane === undefined || !G) return;
  pointers.delete(e.pointerId); G.pressed[lane] = false;
  if (!G.paused && !G.finished) releaseLane(lane, songTime(e.timeStamp || performance.now()));
};

playC.addEventListener("pointerup", pointerEnd); playC.addEventListener("pointercancel", pointerEnd);
document.addEventListener("visibilitychange", () => { if (document.hidden && G && !G.paused && !G.finished) pauseGame(); });

function retry() { pendingFloat = 0; if (G && !G.recorded) endRun("quit"); $("gameover").hidden = true; stopGameOverMusic(); const s = G.endless ? ENDLESS : G.song, d = G.diff; selIdx = SONGS.indexOf(s); selDiff = d; if (G) { try { G.src.stop(); } catch (e) {} } G = null; startGame(); }
