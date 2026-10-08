/*
 * LALI-O - progress/reset.js
 * Resetting progress from Settings.
 */
"use strict";

let rpStep = 0;

function renderResetProgress() {
  const box = $("rpBox"); box.innerHTML = "";
  const q = ["", "Are you sure? This wipes your coins, best scores and everything you've bought.", "Really sure? Your settings and used codes will be reset too.", "Last chance. Reset all progress now?"];
  const yes = ["Reset progress", "Yes, I'm sure", "Yes, really", "Reset everything"];
  if (rpStep) { const p = document.createElement("p"); p.className = "warn"; p.textContent = q[rpStep]; box.appendChild(p); }
  const row = document.createElement("div"); row.className = "row";
  const go = document.createElement("button"); go.className = "dangerbtn"; go.textContent = yes[rpStep];
  go.addEventListener("click", async () => {
    if (rpStep < 3) { rpStep++; renderResetProgress(); return; }
    go.disabled = true; go.textContent = "Resetting\u2026";
    // only this save slot is wiped
    try { Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).forEach(k => localStorage.removeItem(k)); } catch (e) {}
    if ($("rpSongs").checked) { try { await SONGDB.clearMine(); await SONGDB.clearMusic(); } catch (e) {} }
    location.reload();
  });
  row.appendChild(go);
  if (rpStep) { const no = document.createElement("button"); no.className = "small-btn"; no.textContent = "Cancel"; no.addEventListener("click", () => { rpStep = 0; renderResetProgress(); }); row.appendChild(no); }
  box.appendChild(row);
}
