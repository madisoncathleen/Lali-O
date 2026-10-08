/*
 * LALI-O - main.js
 * Connects buttons to actions and starts the game loop. Loaded last.
 */
"use strict";

function unlock() { if ($("gate").hidden) return; $("gate").hidden = true; initAudio(); playMenu(); if (REFUNDED) { setTimeout(() => coinFloat(REFUNDED), 400); REFUNDED = 0; } if (screen === "menu") $("btnPlay").focus({ preventScroll: true }); }
$("gate").addEventListener("click", unlock);
$("btnPlay").addEventListener("click", () => { initAudio(); show("select"); });
$("btnSettings").addEventListener("click", () => { initAudio(); renderSettings(); rpStep = 0; renderResetProgress(); show("settings"); });
$("btnStore").addEventListener("click", () => { initAudio(); show("store"); });
$("btnInv").addEventListener("click", () => { initAudio(); show("inventory"); });
$("storeBack").addEventListener("click", storeBack);
$("invBack").addEventListener("click", () => show("menu"));
$("stAction").addEventListener("click", () => storeActivate());
$("codeBtn").addEventListener("click", redeem);
$("addSongBtn").addEventListener("click", () => { initAudio(); openAdd(); });
$("asClose").addEventListener("click", closeAdd);
$("asGo").addEventListener("click", addSongFromFile);
$("asFile").addEventListener("change", () => { const f = $("asFile").files[0]; if (f && !$("asTitle").value) $("asTitle").value = f.name.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").trim(); });
$("selBack").addEventListener("click", () => show("menu"));
$("setBack").addEventListener("click", () => { bindingLane = -1; setBackStep(); });
$("playBtn").addEventListener("click", startGame);
$("pauseBtn").addEventListener("click", pauseGame);
$("pResume").addEventListener("click", resumeGame);
$("pRestart").addEventListener("click", () => { $("pause").hidden = true; retry(); });
$("pQuit").addEventListener("click", () => quitGame("select"));
$("pMenu").addEventListener("click", () => quitGame("menu"));
$("rRetry").addEventListener("click", retry);
$("rSongs").addEventListener("click", () => quitGame("select"));
$("goRetry").addEventListener("click", retry);
$("goQuit").addEventListener("click", () => quitGame("select"));
$("goMenu").addEventListener("click", () => quitGame("menu"));

SONGS.push(makeTutorial());
SONGS.push(ENDLESS);
orderSongs();
buildSongList();
applyEquip();
renderSettings();
applyFont();
$("coinNum").textContent = COINS.toLocaleString();
loadCustomSongs();

function frame(now) {
  requestAnimationFrame(frame);   // queue the next frame first, so one drawing error can never stop the game
  // the mouse pointer hides while a map is being played, and comes back on pause, Game Over and the results
  const playing = screen === "game" && !!G && !G.paused && !G.over && $("results").hidden && $("gameover").hidden && $("pause").hidden;
  if (playing !== document.body.classList.contains("nocursor")) document.body.classList.toggle("nocursor", playing);
  tickPreview();
  if (screen === "game" && G) drawGame(now);
  else {
    drawBg(now);
    if (screen === "select") { drawMini(); pulseTitles(); }
    if (screen === "settings" && setGroup === "gameplay") drawSpeedPreview();
    if (screen === "store") drawStorePreview(now);
    if (screen === "inventory") drawInvPreview(now);
    if (!$("boxOpen").hidden) drawBoxAnim(now);
    tickCoins();
  }
}

requestAnimationFrame(frame);
