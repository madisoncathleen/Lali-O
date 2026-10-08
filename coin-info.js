/*
 * LALI-O - screens/coin-info.js
 * The pop-up that explains coins.
 */
"use strict";

function openCoinInfo() { $("coinInfo").hidden = false; setTimeout(() => $("coinClose").focus({ preventScroll: true }), 0); }
function closeCoinInfo() { if ($("coinInfo").hidden) return; $("coinInfo").hidden = true; }
$("coins").addEventListener("click", (e) => { e.stopPropagation(); $("coinInfo").hidden ? openCoinInfo() : closeCoinInfo(); });
$("coins").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); openCoinInfo(); } });
$("coinClose").addEventListener("click", closeCoinInfo);
document.addEventListener("pointerdown", (e) => { if (!$("coinInfo").hidden && !$("coinInfo").contains(e.target) && !$("coins").contains(e.target)) closeCoinInfo(); });

// arrow keys + Enter for the pause, game over and results menus
function overlayNav(box, e) {
  const btns = [...box.querySelectorAll("button")].filter(b => !b.hidden && !b.disabled);
  if (!btns.length) return false;
  let i = btns.indexOf(document.activeElement);
  if (["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(e.key)) {
    e.preventDefault();
    const d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1;
    i = i < 0 ? 0 : (i + d + btns.length) % btns.length;
    btns[i].focus({ preventScroll: true });
    return true;
  }
  if (e.key === "Enter") { e.preventDefault(); if (!e.repeat) btns[i < 0 ? 0 : i].click(); return true; }
  return false;
}
