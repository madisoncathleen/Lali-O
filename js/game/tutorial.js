/*
 * LALI-O - game/tutorial.js
 * The tutorial: a scripted map on the menu song.
 */
"use strict";

function makeTutorial() {
  const bpm = DATA.menu.bpm, p = 60 / bpm;
  let b0 = DATA.menu.beat0; while (b0 < 2) b0 += p;
  const T = (beat) => +(b0 + beat * p).toFixed(4);
  const notes = [], caps = [];
  const tap = (beat, lane, from) => notes.push(from === undefined ? [T(beat), lane, 0] : [T(beat), lane, 0, from]);
  const hold = (beat, lane, beats) => notes.push([T(beat), lane, +(beats * p).toFixed(4)]);
  const cap = (a, b, title, body, mark) => caps.push([T(a), T(b), title, body, mark]);
  cap(-3, 8, "Welcome to LALI-O", "Notes fall toward the line near the bottom. Each lane has its own key: {k0} {k1} {k2} {k3}.");
  cap(8, 24, "Tap notes", "Press a lane's key the moment its note touches the line. Right on time is PERFECT. A little early or late is GREAT, GOOD or BAD.");
  cap(24, 38, "Your health", "The bar next to the lanes is your health. Every miss drains it, and PERFECT and GREAT hits fill it back up. If it runs out, it's Game Over. You can't fail the Tutorial, so practice freely.", "hp");
  [0, 1, 2, 3, 2, 1, 3, 0, 1, 2, 0, 3, 2, 1].forEach((l, i) => tap(10 + i * 2, l));
  cap(38, 62, "Keep the rhythm", "Notes can come faster. When two notes arrive together, press both keys at the same time.");
  for (let b = 40, i = 0; b <= 60; b++, i++) { const l = [0, 1, 2, 3, 3, 2, 1, 0][i % 8]; tap(b, l); if (i % 4 === 3) tap(b, (l + 2) % 4); }
  cap(62, 92, "Long notes", "Press when the head reaches the line and keep holding. Let go when the lighter end marker reaches the line.");
  [1, 2, 0, 3, 2, 1, 3].forEach((l, i) => hold(64 + i * 4, l, 2));
  const fs = 100, fe = 124;   // the flip (a pretend chorus)
  cap(92, 100, "The board flips", "In the chorus the hit line jumps to the top and notes rise up from below. Get ready!");
  cap(100, 124, "Rising notes", "Same keys, same timing. Hit each note as it rises into the line at the top.");
  [3, 2, 1, 0, 1, 2, 3, 0, 2, 1, 3].forEach((l, i) => tap(102 + i * 2, l));
  cap(124, 132, "Back to normal", "When the chorus ends the board flips back and notes fall again.");
  cap(132, 160, "Sliding notes", "On Hard and Extreme some notes change lanes on the way down. Watch where they land, not where they start.");
  [2, 0, 3, 1, 2, 1, 0, 3, 1, 2, 0, 3, 2].forEach((l, i) => tap(134 + i * 2, l, i % 2 ? (l + 2) % 4 : l));
  cap(160, 224, "Build your combo", "Every hit in a row adds to your combo, and a miss resets it. At 100 combo the notes pulse and glow, and at 300 they glow even more.");
  for (let b = 162, i = 0; b < 222; b++, i++) tap(b, [0, 1, 2, 3, 2, 1][i % 6]);
  cap(224, 236, "You're ready", "Finish songs to earn coins, then spend them in the Store. Have fun!");
  notes.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return { id: "tutorial", file: DATA.menu.file, title: "Tutorial", artist: "Learn how to play", bpm, beat0: DATA.menu.beat0,
    duration: T(236), choruses: [[T(fs), T(fe)]], preview: 20, captions: caps, tutorial: true,
    charts: { easy: notes, medium: notes, hard: notes, extreme: notes } };
}

// The Tutorial sits at the top until it has been played on this save, then moves to the bottom,
// just above Test Track, which is always last
function orderSongs() {
  const t = SONGS.findIndex(s => s.id === "tutorial");
  const tut = t >= 0 ? SONGS.splice(t, 1)[0] : null;
  const i = SONGS.findIndex(s => s.id === "test");
  const test = i >= 0 ? SONGS.splice(i, 1)[0] : null;
  if (tut) { if (store.get("tutorialDone", false)) SONGS.push(tut); else SONGS.unshift(tut); }
  if (test) SONGS.push(test);
  const e = SONGS.findIndex(s => s.endless); if (e > 0) SONGS.unshift(SONGS.splice(e, 1)[0]);   // Endless always stays on top
}

function wrapText(g, text, maxW) {
  const out = []; let line = "";
  for (const w of text.split(" ")) {
    const test = line ? line + " " + w : w;
    if (g.measureText(test).width > maxW && line) { out.push(line); line = w; } else line = test;
  }
  if (line) out.push(line);
  return out;
}

function drawCaption(g, s, t, x, fw, W, H, th) {
  const c = s.captions.find(c => t >= c[0] - 0.3 && t < c[1] + 0.3); if (!c) return;
  const a = clamp(Math.min((t - c[0] + 0.3) / 0.4, (c[1] + 0.3 - t) / 0.4), 0, 1);
  const body = c[3].replace(/\{k(\d)\}/g, (_, i) => settings.keys[+i].label);
  const side = W - (x + fw);
  const wide = side >= 290;
  const maxW = wide ? Math.min(360, side - 110) : fw - 28;
  const bx = wide ? x + fw + 84 : x + 14, by = wide ? H * 0.34 : 64;
  g.save(); g.globalAlpha = a; g.textAlign = "left"; g.textBaseline = "top";
  g.font = "500 16px system-ui, -apple-system, 'Segoe UI', sans-serif";
  const lines = wrapText(g, body, maxW), titleH = 36, lh = 23;
  g.fillStyle = `rgba(${th.inkRgb},0.82)`; rrect(g, bx - 16, by - 16, maxW + 32, titleH + lines.length * lh + 28, 10); g.fill();
  g.strokeStyle = `rgba(${th.accentRgb},0.55)`; g.lineWidth = 1; g.stroke();
  g.fillStyle = th.accent; fitTextPx(g, c[2], 24, maxW); g.fillText(c[2], bx, by);
  g.fillStyle = "#EEECF7"; g.font = "500 16px system-ui, -apple-system, 'Segoe UI', sans-serif";
  lines.forEach((ln, i) => g.fillText(ln, bx, by + titleH + i * lh));
  g.restore();
}
