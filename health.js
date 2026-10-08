/*
 * LALI-O - game/health.js
 * Health bar and Game Over.
 */
"use strict";

const HP = { miss: -8, perfect: 1.5, great: 0.75 };   // percent of the bar

let goSrc = null, goGain = null, goNext = null;

function loadGameOverMusic() {   // picks (and decodes) the next Game Over track ahead of time
  if (!actx) return null;
  goNext = pickTrack("gameover");
  return trackBuffer(goNext).catch(() => null);
}

function playGameOverMusic() {
  const track = goNext || pickTrack("gameover"); goNext = null;
  const start = (tr, buf) => {
    if ($("gameover").hidden || !buf) return;
    stopGameOverMusic(0);
    goGainMul = tr.gain || 1;
    const t = actx.currentTime, src = actx.createBufferSource(), g = actx.createGain();
    src.buffer = buf; src.loop = true;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(Math.max(0.0001, settings.menuVol / 100 * goGainMul), t + 1.8);   // fades in
    src.connect(g); g.connect(limiter); src.start();
    goSrc = src; goGain = g;
  };
  trackBuffer(track).then(buf => start(track, buf)).catch(() => trackBuffer(DEFAULT_MUSIC.gameover).then(buf => start(DEFAULT_MUSIC.gameover, buf)).catch(() => {}));
}

function stopGameOverMusic(fade = 0.7) {   // fades out
  if (!goSrc) return;
  const t = actx.currentTime;
  goGain.gain.cancelScheduledValues(t); goGain.gain.setValueAtTime(goGain.gain.value, t); goGain.gain.linearRampToValueAtTime(0.0001, t + Math.max(0.01, fade));
  goSrc.stop(t + fade + 0.05); goSrc = null; goGain = null;
}

function changeHealth(kind) {
  if (!G || G.finished || G.practice) return;   // practice has no health bar
  if (kind === "miss" && G.mods && G.mods.sd && !G.song.noMiss && !G.song.tutorial) { G.hp = 0; G.hpHitAt = performance.now(); gameOver(); return; }   // Sudden Death
  const d = HP[kind]; if (!d) return;
  G.hp = clamp(G.hp + d, 0, 100);
  if (d < 0) G.hpHitAt = performance.now();
  // the Tutorial and Test Track can't be failed
  if (G.hp <= 0 && !G.song.tutorial && !G.song.noMiss) gameOver();
}

function gameOver() {
  if (G.over) return;
  G.over = true; G.finished = true;
  G.overAt = performance.now();
  G.pausePos = rawPos(performance.now());
  G.pressed.fill(false);
  // the song winds down like a tape stopping
  try {
    const t = actx.currentTime;
    G.src.playbackRate.setValueAtTime(G.rate || 1, t); G.src.playbackRate.linearRampToValueAtTime(0.25 * (G.rate || 1), t + 0.9);
    G.gain.gain.setValueAtTime(G.gain.gain.value, t); G.gain.gain.linearRampToValueAtTime(0.0001, t + 0.9);
    G.src.stop(t + 1);
  } catch (e) {}
  const t = G.pausePos - settings.offset / 1000;
  const acc = G.judged ? G.accSum / G.judged * 100 : 0, score = Math.round(G.scoreSum / G.total * 1e6);
  const hits = G.counts.perfect + G.counts.great + G.counts.good + G.counts.bad;
  const E = G.endless;
  const coins = Math.round(goPayout(G.song, G.diff, acc, t / G.song.duration) * (G.mult > 0 ? G.mult : 1) * (E ? endlessStreak(E.n + 1) : 1));
  if (E) { E.coins += coins; saveEndlessBest(E); }
  if (coins) { setCoins(COINS + coins); if (!E) pendingFloat += coins; }
  endRun("fail", { coins, reached: t / G.song.duration });
  setTimeout(() => {
    if (!G || !G.over) return;
    $("goCoins").innerHTML = coins ? `<i class="coin sm"></i><b>+${coins}</b> coins <small>for making it ${Math.round(clamp(t / G.song.duration, 0, 1) * 100)}% of the way</small>`
      : `<i class="coin sm"></i><b>+0</b> coins <small>${G.song.tutorial || G.song.id.startsWith("test") ? "This track pays no coins" : "Get further into the song to earn a few coins"}</small>`;
    $("goSong").textContent = E ? `Endless \u00B7 ${DIFF_LABEL[G.diff]} \u00B7 ended on ${G.song.title}` : `${G.song.title} \u00B7 ${DIFF_LABEL[G.diff]}`;
    if (E) $("goCoins").innerHTML = `<i class="coin sm"></i><b>+${E.coins}</b> coins this run <small>${E.n} song${E.n === 1 ? "" : "s"} cleared \u00B7 includes +${coins} for this song</small>`;
    $("goStats").innerHTML = (E ? [["Songs cleared", E.n], ["Total score", (E.score + score).toLocaleString()], ["Max combo", Math.max(E.maxCombo, G.maxCombo) + "x"], ["Last song", Math.round(clamp(t / G.song.duration, 0, 1) * 100) + "% of the way"]]
      : [["Score", pad7(score)], ["Accuracy", acc.toFixed(2) + "%"], ["Max combo", G.maxCombo + "x"], ["Reached", Math.round(clamp(t / G.song.duration, 0, 1) * 100) + "% of the song"]])
      .map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join("");
    $("goCounts").innerHTML = ["perfect", "great", "good", "bad", "miss"].map(k => `<span style="color:${J[k].color}">${J[k].label} ${G.counts[k]}</span>`).join("") + `<span>${hits} notes hit</span>`;
    $("gameover").querySelector(".eyebrow").textContent = E ? "Endless run over" : "Out of health";
    if (E) { E.xp = (E.xp || 0) + (G.xpResult ? G.xpResult.total : 0); renderXPBox($("goXP"), G.xpResult && Object.assign({}, G.xpResult, { total: E.xp, parts: [[`${E.n} song${E.n === 1 ? "" : "s"} + this one`, E.xp]] })); }
    else renderXPBox($("goXP"), G.xpResult);
    $("gameover").hidden = false;
    playGameOverMusic();
    setTimeout(() => $("goRetry").focus({ preventScroll: true }), 0);
  }, 1000);
}

// the health bar: a glassy capsule to the right of the lanes that drains downward,
// with a pale "damage" segment that lingers and then slides down
function drawHealth(g, x, fw, H, now, dtf, bp, th) {
  G.hpShown += (G.hp - G.hpShown) * (1 - Math.exp(-dtf * 10));
  if (G.hpGhost < G.hpShown) G.hpGhost = G.hpShown;
  else if (now - (G.hpHitAt || 0) > 350) G.hpGhost = Math.max(G.hpShown, G.hpGhost - 30 * dtf);
  const room = G.W - (x + fw);
  const bw = 16, bh = Math.min(H * 0.52, 420), by = (H - bh) / 2;
  const bx = room >= 64 ? x + fw + 22 : x + fw - bw - 6;
  const hp = G.hpShown / 100, ghost = G.hpGhost / 100;
  const col = G.hpShown > 50 ? blendHex("#FFB547", "#4FE3C1", (G.hpShown - 50) / 50) : blendHex("#FF4F79", "#FFB547", G.hpShown / 50);
  const low = G.hpShown < 25;
  g.save();
  // track
  rrect(g, bx - 4, by - 4, bw + 8, bh + 8, (bw + 8) / 2);
  g.fillStyle = `rgba(${th.inkRgb},0.85)`; g.fill();
  g.strokeStyle = `rgba(${th.accentRgb},${low ? 0.25 + 0.5 * bp : 0.35})`; g.lineWidth = 1.5; g.stroke();
  rrect(g, bx, by, bw, bh, bw / 2); g.save(); g.clip();
  g.fillStyle = "rgba(255,255,255,0.04)"; g.fillRect(bx, by, bw, bh);
  // lingering damage
  if (ghost > hp + 0.002) { g.fillStyle = "rgba(255,230,235,0.55)"; g.fillRect(bx, by + bh * (1 - ghost), bw, bh * (ghost - hp)); }
  // fill, anchored at the bottom
  const fy = by + bh * (1 - hp);
  const gr = g.createLinearGradient(0, fy, 0, by + bh);
  gr.addColorStop(0, mix(col, 0.35)); gr.addColorStop(1, col);
  g.fillStyle = gr; g.shadowColor = col; g.shadowBlur = low ? 10 + 14 * bp : 8;
  g.fillRect(bx, fy, bw, by + bh - fy);
  g.shadowBlur = 0;
  g.fillStyle = "rgba(255,255,255,0.8)"; if (hp > 0.01) g.fillRect(bx, fy, bw, 2);   // bright top edge
  g.fillStyle = "rgba(255,255,255,0.22)"; g.fillRect(bx + 3, by, 3, bh);            // glass shine
  g.fillStyle = `rgba(${th.inkRgb},0.55)`;                                           // segment ticks every 10%
  for (let k = 1; k < 10; k++) g.fillRect(bx, Math.round(by + bh * k / 10), bw, 1);
  g.restore();
  // Tutorial: point out the bar while the health caption is showing
  const t = G.lastT;
  const cap = G.song.captions && G.song.captions.find(c => c[4] === "hp" && t >= c[0] - 0.3 && t < c[1] + 0.3);
  if (cap) {
    const k = clamp(Math.min((t - cap[0] + 0.3) / 0.4, (cap[1] + 0.3 - t) / 0.4), 0, 1);
    g.save(); g.globalAlpha = k * (0.55 + 0.45 * bp);
    g.strokeStyle = th.accent; g.lineWidth = 2; g.shadowColor = th.accent; g.shadowBlur = 16;
    rrect(g, bx - 11, by - 34, bw + 22, bh + 66, 14); g.stroke();
    g.restore();
  }
  // labels
  g.textAlign = "center"; g.textBaseline = "middle"; g.font = "600 11px 'IBM Plex Mono', monospace";
  g.fillStyle = low ? col : "rgba(238,236,247,0.6)"; g.fillText("HP", bx + bw / 2, by - 18);
  g.fillStyle = low ? col : "rgba(238,236,247,0.75)"; g.fillText(Math.ceil(G.hp) + "%", bx + bw / 2, by + bh + 20);
  g.restore();
  // low health: a faint red pulse at the screen edges
  if (low && !G.over) {
    const v = g.createRadialGradient(G.W / 2, H / 2, Math.min(G.W, H) * 0.35, G.W / 2, H / 2, Math.max(G.W, H) * 0.75);
    v.addColorStop(0, "rgba(255,40,80,0)"); v.addColorStop(1, `rgba(255,40,80,${(0.1 + 0.12 * bp) * (1 - G.hpShown / 25)})`);
    g.fillStyle = v; g.fillRect(0, 0, G.W, H);
  }
}
