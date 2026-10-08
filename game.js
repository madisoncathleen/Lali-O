/*
 * LALI-O - game/game.js
 * Running a map: starting, scoring, judging hits, results.
 */
"use strict";

let G = null, loadToken = 0;
const playC = $("play");

async function startGame() {
  if (SONGS[selIdx] && SONGS[selIdx].endless) return startEndless(selDiff);
  const song = SONGS[selIdx], diff = selDiff;
  initAudio();
  const token = ++loadToken;
  stopPreview();
  $("loading").hidden = false; $("loadingText").textContent = `Loading ${song.title}`;
  let buf;
  try { buf = await getBuffer(song); }
  catch (e) { if (token === loadToken) $("loadingText").textContent = song.custom
    ? "Couldn't load this song. Its MP3 was probably moved or deleted from your computer. Press Esc, delete it from your added songs and add it again."
    : "Couldn't load this song. Press Esc and try again."; return; }
  if (token !== loadToken) return;
  $("loading").hidden = true;
  stopPreview(); stopMenu();
  $("results").hidden = true; $("pause").hidden = true; $("gameover").hidden = true;
  stopGameOverMusic(0.4); loadGameOverMusic();
  beginRun(song, diff, buf);
}

// sets up a run of one song; `carry` continues an Endless run (health, combo and totals come along)
function beginRun(song, diff, buf, carry) {
  const prac = !carry && practice && !song.tutorial, gm = song.tutorial ? {} : Object.assign({}, carry ? carry.mods : mods);
  const notes = buildNotes(gm.noflip ? Object.assign({}, song, { choruses: [] }) : song, diff);   // No Flip: every note falls, the board never turns
  if (prac) { gm.sd = false; gm.dt = false; }
  if (gm.chaos) applyChaos(notes, Math.floor(Math.random() * 1000));   // Chaos: notes swerve in from other lanes
  const rate = prac ? pracSpeed : gm.dt ? 1.25 : 1, from = prac ? Math.min(pracStartAt, Math.max(0, song.duration - 10)) : 0;
  if (from > 0) for (const n of notes) if (n.t < from - 0.05) { n.headJudged = true; n.done = true; n.skipped = true; }   // before the start point: not played, not counted
  const live = notes.filter(n => !n.skipped), holds = live.filter(n => n.d).length;
  G = {
    song, diff, buf, notes, ch: gm.noflip ? [] : song.choruses, total: live.length + holds, practice: prac, rate, from, mods: gm, mult: prac ? 0 : modMult(gm),
    lastEnd: notes.reduce((m, n) => Math.max(m, n.end), 0),
    counts: { perfect: 0, great: 0, good: 0, bad: 0, miss: 0 },
    combo: 0, maxCombo: 0, scoreSum: 0, accSum: 0, judged: 0,
    pressed: [false, false, false, false], holding: [null, null, null, null],
    effects: [], judge: null, scan: 0, paused: false, finished: false,
    src: null, clock: null, shown: {},
    hp: 100, hpShown: 100, hpGhost: 100, hpHitAt: 0, over: false,
  };
  if (carry) {   // Endless: keep health, combo and the run's totals
    Object.assign(G, { endless: carry.endless, hp: carry.hp, hpShown: carry.hp, hpGhost: carry.hp, combo: carry.combo, maxCombo: carry.combo, fx: carry.fx, comboBorn: carry.comboBorn });
    $("hudSong").textContent = ["Endless", `Song ${G.endless.n + 1}`, ...modNames(gm), `${song.title} \u00B7 ${DIFF_LABEL[diff]}`].join(" \u00B7 ");
    if (!$("game").hidden) {} else show("game");
    playFrom(-(Math.max(1.6, travelTime()) + 0.6), 0);
    countdown();
    const nx = endlessPick(G.endless); G.endless.upNext = nx; if (nx) getBuffer(nx).catch(() => {});   // load the next one early
    return;
  }
  $("hudSong").textContent = [prac ? `Practice${rate !== 1 ? " " + Math.round(rate * 100) + "%" : ""}` : "", ...modNames(gm), `${song.title} \u00B7 ${DIFF_LABEL[diff]}`].filter(Boolean).join(" \u00B7 ");
  show("game");
  if (prac) { const cd = countdown(); playFrom(from > 0 ? from - cd * rate : -(Math.max(1.6, travelTime()) + 0.6), 0); }   // the song plays in under a 3-2-1
  else playFrom(-(Math.max(1.6, travelTime()) + 0.6), 0);
}

/* ---- Endless mode ---- */
function endlessPick(E) {   // shuffle bag: every song once before any repeats
  const pool = endlessPool(); if (!pool.length) return null;
  if (E.upNext) { const x = E.upNext; E.upNext = null; return x; }
  E.bag = (E.bag || []).filter(id => pool.some(p => p.id === id));
  if (!E.bag.length) { E.bag = pool.map(p => p.id).sort(() => Math.random() - 0.5); if (E.bag.length > 1 && E.bag[0] === E.lastId) E.bag.push(E.bag.shift()); }
  const id = E.bag.shift(); E.lastId = id; return pool.find(p => p.id === id);
}

const endlessStreak = (k) => Math.min(2, 1 + 0.1 * (k - 1));   // coin bonus: +10% per song cleared this run, up to double

async function startEndless(diff) {
  initAudio();
  const E = { diff, n: 0, score: 0, coins: 0, maxCombo: 0, bag: [], mods: Object.assign({}, mods) };
  const first = endlessPick(E); if (!first) return;
  const token = ++loadToken;
  stopPreview();
  $("loading").hidden = false; $("loadingText").textContent = `Loading Endless \u00B7 ${first.title}`;
  let buf; try { buf = await getBuffer(first); } catch (e) { if (token === loadToken) $("loadingText").textContent = "Couldn't load the first song. Press Esc and try again."; return; }
  if (token !== loadToken) return;
  $("loading").hidden = true; stopPreview(); stopMenu();
  $("results").hidden = true; $("pause").hidden = true; $("gameover").hidden = true;
  stopGameOverMusic(0.4); loadGameOverMusic();
  beginRun(first, diff, buf, { endless: E, mods: E.mods, hp: 100, combo: 0, fx: 0 });
}

function saveEndlessBest(E) {
  const all = ENDLESS_BEST(), b = all[E.diff];
  if (!b || E.n > b.songs || (E.n === b.songs && E.score > b.score)) { all[E.diff] = { songs: E.n, score: E.score }; store.set("endlessBest", all); }
  if (E.n > (STATS.endlessBest || 0)) { STATS.endlessBest = E.n; saveStats(); checkAch(); }
}

// a song in the run was cleared: pay out, heal a little, then roll straight into the next one
function endlessCleared() {
  const E = G.endless, score = Math.round(G.scoreSum / G.total * 1e6), acc = G.judged ? G.accSum / G.judged * 100 : 0, grade = gradeOf(acc, G.counts);
  E.n++; E.score += score; E.maxCombo = Math.max(E.maxCombo, G.maxCombo);
  const base = { easy: 10, medium: 20, hard: 35, extreme: 50 }[G.diff] || 10, lenF = clamp(G.song.duration / 180, 0.5, 1.5);
  const coins = Math.round(base * Math.pow(acc / 100, 2) * lenF * endlessStreak(E.n) * (G.mult > 0 ? G.mult : 1));
  E.coins += coins; if (coins) setCoins(COINS + coins);
  endRun("clear", { coins, grade, acc });
  saveEndlessBest(E);
  const carry = { endless: E, mods: G.mods, hp: Math.min(100, G.hp + 15), combo: G.combo, fx: G.fx, comboBorn: G.comboBorn };
  G.hp = carry.hp;
  const next = endlessPick(E);
  const xpGot = G.xpResult ? G.xpResult.total : 0; E.xp = (E.xp || 0) + xpGot;
  G.gap = { at: performance.now(), n: E.n, coins, grade, next, bonus: endlessStreak(E.n + 1), xp: xpGot };
  const me = G;
  try { G.src.stop(actx.currentTime + 1.5); } catch (e) {}
  const wait = new Promise(r => setTimeout(r, 2600));
  Promise.all([next ? getBuffer(next) : Promise.reject(), wait]).then(([buf]) => {
    if (G !== me || screen !== "game") return;
    beginRun(next, E.diff, buf, carry);
  }).catch(() => { if (G === me) { G.gap.error = true; } });
}

function drawEndlessGap(g, now, W, H, x, fw, th) {
  if (!G.gap) return;
  const k = clamp((now - G.gap.at) / 350, 0, 1), cx = x + fw / 2, cy = H * 0.42;
  g.save(); g.globalAlpha = k;
  g.fillStyle = `rgba(${th.inkRgb},0.82)`; rrect(g, cx - Math.min(fw * 0.46, 200), cy - 92, Math.min(fw * 0.92, 400), 184, 14); g.fill();
  g.strokeStyle = th.accent; g.lineWidth = 1.5; g.stroke();
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = th.accent; g.font = `800 13px "IBM Plex Mono", monospace`; g.fillText(`SONG ${G.gap.n} CLEARED \u00B7 ${G.gap.grade}`, cx, cy - 62);
  g.fillStyle = "#FFD65C"; g.font = `800 28px ${canvasFont()}`; g.fillText(`+${G.gap.coins} coins`, cx, cy - 26);
  if (G.gap.xp) { g.fillStyle = "#8FF7FF"; g.font = `700 13px "IBM Plex Mono", monospace`; g.fillText(`+${G.gap.xp.toLocaleString()} XP`, cx + 110, cy - 26); }
  g.fillStyle = "rgba(238,236,247,.7)"; g.font = `600 12px "IBM Plex Mono", monospace`; g.fillText(`+15 health \u00B7 next song pays \u00D7${G.gap.bonus.toFixed(1)}`, cx, cy + 6);
  g.fillStyle = "#EEECF7"; g.font = `700 18px ${canvasFont()}`;
  const nm = G.gap.error ? "Couldn't load the next song. Press Esc." : G.gap.next ? `Next: ${G.gap.next.title}` : "";
  fitTextPx(g, nm, 18, Math.min(fw * 0.85, 360)); g.font = g.font.replace("800", "700"); g.fillText(nm, cx, cy + 44);
  g.restore();
}

function playFrom(pos, lead) {
  // position `pos` (seconds, may be negative) is reached `lead` seconds from now
  const when = actx.currentTime + lead + 0.05;
  const src = actx.createBufferSource(); src.buffer = G.buf; src.playbackRate.value = G.rate || 1;
  const gn = actx.createGain(); gn.gain.value = (G.song.gain || 1) * settings.songVol / 100;   // master volume; added songs are also volume-matched
  G.gain = gn;
  src.connect(gn); gn.connect(G.song.custom ? limiter : bassEQ);   // then bass -> analyser, which passes audio through to the speakers
  src.start(when + Math.max(0, -pos) / (G.rate || 1), Math.max(0, pos));
  G.src = src; G.clock = { when, pos }; G.lastT = -Infinity;
}

function rawPos(perf) { return G.clock.pos + (ctxTimeAt(perf) - G.clock.when) * (G.rate || 1); }   // practice can play slower

function songTime(perf) { return rawPos(perf) - settings.offset / 1000; }

// 3-2-1 countdown (theme coloured), drawn over the playfield; returns its length in seconds
const CD_STEP = 0.6;
function countdown() { G.cdEnd = performance.now() + CD_STEP * 3000; return CD_STEP * 3; }

function drawCountdown(g, now, W, H, x, fw, th) {
  if (!G.cdEnd || G.paused) return;
  const rem = (G.cdEnd - now) / 1000;
  if (rem < -0.45) { G.cdEnd = 0; return; }
  const cx = x + fw / 2, cy = H * 0.42, go = rem <= 0;
  const k = go ? -rem / 0.45 : 1 - (rem % CD_STEP) / CD_STEP;   // 0 -> 1 within each step
  const txt = go ? "GO!" : String(Math.ceil(rem / CD_STEP));
  const a = go ? 1 - k : Math.min(1, k * 5) * (1 - Math.max(0, k - 0.8) / 0.2 * 0.6);
  const sc = go ? 1 + 0.4 * k : 1.35 - 0.35 * Math.min(1, k * 3);
  g.save();
  // backdrop and a ring that drains over the whole countdown
  const r = Math.min(fw * 0.32, 110);
  g.globalAlpha = 0.85 * (go ? 1 - k : 1); g.fillStyle = `rgba(${th.inkRgb},0.72)`; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
  if (!go) {
    g.lineWidth = 5; g.strokeStyle = `rgba(${th.accentRgb},0.25)`; g.beginPath(); g.arc(cx, cy, r - 8, 0, 7); g.stroke();
    g.strokeStyle = th.accent; g.shadowColor = th.accent; g.shadowBlur = 16; g.lineCap = "round";
    g.beginPath(); g.arc(cx, cy, r - 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(rem / (CD_STEP * 3), 0, 1)); g.stroke();
  }
  g.globalAlpha = Math.max(0, a); g.translate(cx, cy); g.scale(sc, sc);
  g.fillStyle = th.accent; g.shadowColor = th.accent; g.shadowBlur = 28;
  g.textAlign = "center"; g.textBaseline = "middle";
  fitTextPx(g, txt, go ? r * 0.62 : r * 0.95, r * 1.5); g.fillText(txt, 0, 4);
  g.restore();
}

function pauseGame() {
  if (!G || G.paused || G.finished) return;
  G.paused = true;
  G.pausePos = rawPos(performance.now());
  try { G.src.stop(); } catch (e) {}
  G.pressed.fill(false);
  for (let l = 0; l < 4; l++) if (G.holding[l]) releaseLane(l, songTime(performance.now()));
  $("pause").hidden = false;
  playMenu(1.5, "pause");
  setTimeout(() => $("pResume").focus({ preventScroll: true }), 0);
}

function resumeGame() {
  if (!G || !G.paused) return;
  $("pause").hidden = true;
  stopMenu();
  G.paused = false;
  playFrom(G.pausePos, countdown());   // notes rewind and roll back in during a 3-2-1 before the music restarts
}

function quitGame(to) {
  if (G && G.endless) { saveEndlessBest(G.endless); pendingFloat = G.endless.coins;
    const E = G.endless; if (to !== "game" && (E.n || E.coins)) toast({ label: "Endless run", name: `${E.n} song${E.n === 1 ? "" : "s"} cleared`, desc: `+${E.coins.toLocaleString()} coins this run`, icon: '<i class="coin"></i>' }); }   // Endless: the whole run's coins
  if (G && !G.recorded) endRun("quit");
  if (G) { try { G.src.stop(); } catch (e) {} }
  G = null;
  // once the Tutorial has been played it drops to the bottom of the list
  const cur = SONGS[selIdx], before = SONGS.map(s => s.id).join();
  orderSongs();
  if (SONGS.map(s => s.id).join() !== before) { buildSongList(); selIdx = Math.max(0, SONGS.indexOf(cur)); }
  $("pause").hidden = true; $("results").hidden = true; $("gameover").hidden = true;
  stopGameOverMusic();
  show(to);
  const pf = pendingFloat; pendingFloat = 0;
  const cg = $("coinGain"); cg.classList.remove("go");   // never replay an old float
  if (pf > 0) setTimeout(() => coinFloat(pf), 350);
}

function judge(kind, lane, dt, noHealth) {
  const j = J[kind];
  G.counts[kind]++; G.judged++; G.scoreSum += j.score; G.accSum += j.acc;
  if (!noHealth) changeHealth(kind);
  const now = performance.now();
  if (kind === "miss") {
    if (G.combo >= 2) {
      const lv = G.fx || 0;
      G.comboBreak = { value: G.combo, at: now, alpha: 0.2 + 0.8 * clamp(lv, 0, 1),
        col: comboColAt(lv, now) };
    }
    G.combo = 0;
  } else {
    G.combo++; G.maxCombo = Math.max(G.maxCombo, G.combo);
    if ((G.combo === 100 || G.combo === 300 || G.combo === 500) && !isTestTrack(G.song) && !G.practice) checkAch({ combo: G.combo });
    G.comboPop = now;
    if (G.combo === 2) G.comboBorn = now;
  }
  G.judge = { kind, at: performance.now(), early: dt === undefined || kind === "perfect" || kind === "miss" ? "" : dt < 0 ? "EARLY" : "LATE" };
  if (kind !== "miss" && lane !== undefined) G.effects.push({ lane, at: performance.now(), color: j.color, seed: Math.random() * 1000 });
  if (G.effects.length > 40) G.effects.splice(0, G.effects.length - 40);
}

function classify(adt, scale = 1) {
  if (adt <= WIN.perfect * scale) return "perfect";
  if (adt <= WIN.great * scale) return "great";
  if (adt <= WIN.good * scale) return "good";
  if (adt <= WIN.bad * scale) return "bad";
  return null;
}

function hitLane(lane, t) {
  let best = null;
  for (let i = G.scan; i < G.notes.length; i++) {
    const n = G.notes[i];
    if (n.t > t + WIN.bad) break;
    if (n.lane !== lane || n.headJudged) continue;
    if (Math.abs(n.t - t) <= WIN.bad) { best = n; break; }
  }
  if (!best) return;
  const dt = t - best.t;
  best.headJudged = true; best.headHit = true;
  judge(classify(Math.abs(dt)), lane, dt);
  if (best.d) { best.holding = true; G.holding[lane] = best; } else best.done = true;
}

function releaseLane(lane, t) {
  const n = G.holding[lane]; if (!n) return;
  G.holding[lane] = null; n.holding = false; n.done = true;
  const dt = t - n.end;
  const k = classify(Math.abs(dt), 1.5);
  if (dt < 0 && !k && !G.song.noMiss) { n.missed = true; judge("miss", lane); }
  else judge(k || "perfect", lane, dt);
}

function updateGame(t) {
  const miss = t - WIN.bad;
  for (let i = G.scan; i < G.notes.length; i++) {
    const n = G.notes[i];
    if (n.t > miss) break;
    if (!n.headJudged) {
      if (G.song.noMiss) {   // practice track: a note you let pass counts as a hit
        n.headJudged = true; n.headHit = true; n.done = true;
        judge("perfect", n.lane); if (n.d) judge("perfect", n.lane);
        continue;
      }
      n.headJudged = true; n.missed = true; n.done = true;
      judge("miss", n.lane); if (n.d) judge("miss", n.lane, undefined, true);   // a missed long note costs the same health as one missed note
    }
  }
  while (G.scan < G.notes.length && G.notes[G.scan].headJudged && !G.notes[G.scan].holding) G.scan++;
  for (let l = 0; l < 4; l++) {
    const n = G.holding[l];
    if (n && t >= n.end) { G.holding[l] = null; n.holding = false; n.done = true; judge("perfect", l); }
  }
  if (!G.finished && (t > G.song.duration - 0.2 || (G.scan >= G.notes.length && t > G.lastEnd + 2.5))) finishGame();
}

function drawGame(now) {
  const [g, W, H] = fitCanvas(playC);
  const th = THEME();
  g.fillStyle = th.ink; g.fillRect(0, 0, W, H);
  const frozen = G.paused || G.over;
  let t = frozen ? G.pausePos - settings.offset / 1000 : songTime(now);
  if (!frozen) { if (t < G.lastT) t = G.lastT; G.lastT = t; }   // the map never moves backwards
  if (!frozen) updateGame(t);
  G.W = W;
  const fw = Math.min(W - 32, 460);
  const x = (W - fw) / 2;
  const s = G.song, period = 60 / s.bpm;
  // side glow tied to the chorus flip and beat
  const f = flipAt(t, G.ch), bp = pulseAt(t, s.beat0, period);
  const gr = g.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H) * 0.7);
  gr.addColorStop(0, `rgba(${f > 0.5 ? th.accentRgb : th.glow},${0.06 + 0.06 * bp})`); gr.addColorStop(1, `rgba(${th.inkRgb},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  drawThemeFx(g, W, H, th, now, 0.55);
  if (G.effects.length) G.effects = G.effects.filter(e => now - e.at < 900);
  const fxTarget = G.combo >= 300 ? 2 : G.combo >= 100 ? 1 : 0;
  const dtf = Math.min(0.1, (now - (G.lastFrame || now)) / 1000); G.lastFrame = now;
  G.fx = (G.fx || 0) + (fxTarget - (G.fx || 0)) * (1 - Math.exp(-dtf * 4));   // ~0.6 s fade
  drawField(g, { x, w: fw, H, t, travel: travelTime(), notes: G.notes, hidden: !!(G.mods && G.mods.hidden), ch: G.ch, pressed: G.pressed, labels: settings.keys.map(k => k.label), combo: G.combo, fx: G.fx, effects: G.effects, period, beat0: s.beat0,
    under: (fx, fwid) => {   // faint pulsing lines behind the notes, centred on the lanes
      if (G.paused) return;
      analyser.getByteFrequencyData(freq);
      drawLines(g, fx, fwid, H / 2, H, freq, bp, 0.3, th);
    } });

  // combo (left of the playfield). Colour, glow and pulse follow the eased level G.fx:
  // faded white under 100, solid blue at 100+, solid purple at 300+.
  const roomy = x >= 140;
  const cSize = roomy ? Math.min(110, x * 0.5) : 44;
  const cx = roomy ? x / 2 : 16;
  const lv = G.fx;
  const comboCol = comboColAt(lv, now);
  const fitFont = (txt) => fitTextPx(g, txt, cSize, (roomy ? x - 48 : Math.max(60, x - 20)) / 1.25);
  g.textAlign = roomy ? "center" : "left"; g.textBaseline = "middle";
  if (G.combo >= 2) {
    const pop = Math.max(0, 1 - (now - (G.comboPop || 0)) / 160);         // quick bump each time it goes up
    const born = clamp((now - (G.comboBorn || 0)) / 220, 0, 1);           // fade in when a new combo starts
    const sc = (1 + (lv <= 1 ? 0.07 * lv : 0.07 + 0.05 * (lv - 1)) * bp) * (1 + 0.1 * pop * pop) * (0.85 + 0.15 * born);
    g.save(); g.translate(cx, H * 0.5); g.scale(sc, sc);
    g.globalAlpha = (0.2 + 0.8 * clamp(lv, 0, 1)) * born;
    g.fillStyle = mix(comboCol, (lv <= 1 ? 0.15 * lv : 0.15 + 0.1 * (lv - 1)) * bp);
    g.shadowColor = comboCol;
    g.shadowBlur = lv <= 1 ? (14 + 18 * bp) * lv : 14 + 12 * (lv - 1) + (18 + 12 * (lv - 1)) * bp;
    const fs = fitFont(String(G.combo));
    g.fillText(G.combo, 0, 0);
    g.shadowBlur = 8 * clamp(lv, 0, 1);
    g.font = "600 13px 'IBM Plex Mono', monospace"; g.fillText("COMBO", 0, fs * 0.58 + 6);
    g.restore();
  }
  // a broken combo shrinks and fades out instead of vanishing
  if (G.comboBreak) {
    const k = (now - G.comboBreak.at) / 450;
    if (k < 1) {
      g.save(); g.translate(cx, H * 0.5 + 24 * k); g.scale(1 - 0.2 * k, 1 - 0.2 * k);
      g.globalAlpha = G.comboBreak.alpha * (1 - k) * (1 - k);
      g.fillStyle = G.comboBreak.col;
      fitFont(String(G.comboBreak.value));
      g.fillText(G.comboBreak.value, 0, 0);
      g.restore();
    } else G.comboBreak = null;
  }
  // judgement
  if (G.judge) {
    const k = (now - G.judge.at) / 520;
    if (k < 1) {
      const j = J[G.judge.kind];
      const sc = 1 + 0.25 * Math.max(0, 1 - k * 5);
      g.save(); g.translate(W / 2, H * 0.56); g.scale(sc, sc);
      g.globalAlpha = 0.45 * (k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3);
      g.fillStyle = j.color; g.shadowColor = j.color; g.shadowBlur = 6;
      g.font = `800 32px ${canvasFont()}`; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(j.label, 0, 0);
      g.shadowBlur = 0;
      if (G.judge.early) { g.font = "500 12px 'IBM Plex Mono', monospace"; g.fillStyle = "rgba(238,236,247,.7)"; g.fillText(G.judge.early, 0, 26); }
      g.restore();
    }
  }
  if (!G.practice) drawHealth(g, x, fw, H, now, dtf, bp, th);
  if (G.over) {   // the field darkens as the song winds down
    g.fillStyle = `rgba(${th.inkRgb},${(clamp((now - G.overAt) / 900, 0, 1) * 0.55).toFixed(3)})`; g.fillRect(0, 0, W, H);
  }
  if (s.captions) drawCaption(g, s, t, x, fw, W, H, th);
  // lead-in / resume countdown
  drawEndlessGap(g, now, W, H, x, fw, th);
  drawCountdown(g, now, W, H, x, fw, th);
  // HUD
  const score = G.scoreSum / G.total * 1e6 + (G.endless && !G.gap ? G.endless.score : 0) + (G.gap ? 0 : 0);
  const acc = G.judged ? G.accSum / G.judged * 100 : 100;
  const sTxt = G.endless ? (G.gap ? G.endless.score : Math.round(score)).toLocaleString() : pad7(score), aTxt = acc.toFixed(2) + "%";
  if (G.shown.s !== sTxt) { $("hudScore").textContent = sTxt; G.shown.s = sTxt; }
  if (G.shown.a !== aTxt) { $("hudAcc").textContent = aTxt; G.shown.a = aTxt; }
  $("progFill").style.width = clamp(t / s.duration, 0, 1) * 100 + "%";
}

function gradeOf(acc, counts) {
  if (counts.miss === 0 && counts.bad === 0 && acc >= 99) return "SS";
  if (acc >= 95) return "S"; if (acc >= 90) return "A"; if (acc >= 80) return "B"; if (acc >= 70) return "C"; return "D";
}

function finishGame() {
  G.finished = true;
  // remaining unjudged notes count as misses so the score reflects the full chart
  const leftover = G.song.noMiss ? "perfect" : "miss";
  for (const n of G.notes) if (!n.headJudged) { n.headJudged = true; judge(leftover); if (n.d) judge(leftover); }
  if (G.endless) { if (!G.over) endlessCleared(); return; }
  const score = Math.round(G.scoreSum / G.total * 1e6);
  const acc = G.judged ? G.accSum / G.judged * 100 : 0;
  const grade = gradeOf(acc, G.counts);
  const sb = bests[G.song.id] || (bests[G.song.id] = {});
  const prev = sb[G.diff];
  const isNew = !G.practice && (!prev || score > prev.score);
  if (isNew) { sb[G.diff] = { score, acc, combo: G.maxCombo, grade }; store.set("bests", bests); }
  const pay = G.practice ? { total: 0, parts: [["Practice runs pay no coins", 0]] } : payout(G.song, G.diff, acc, grade, G.counts, prev, isNew);
  if (!G.practice && G.mult > 0 && G.mult !== 1 && pay.total) {
    const extra = Math.round(pay.total * (G.mult - 1)), label = `${modNames(G.mods || {}).join(" + ")} \u00D7${+G.mult.toFixed(2)}`;
    // a bonus shows as +N; a cut (No Flip) shows what the coins became, so it doesn't read like coins were taken away
    pay.parts.push(extra >= 0 ? [label, extra] : [`${label} (${pay.total} \u2192 ${pay.total + extra})`, null]);
    pay.total = Math.max(0, pay.total + extra);
  }
  if (G.song.tutorial && !G.practice) store.set("tutorialDone", true);
  if (pay.total) { setCoins(COINS + pay.total); pendingFloat += pay.total; }
  endRun("clear", { coins: pay.total, grade, acc });
  setTimeout(() => {
    if (!G) return;
    try { G.src.stop(actx.currentTime + 0.8); } catch (e) {}
    $("resGrade").textContent = grade;
    $("resGrade").style.color = { SS: "#8FF7FF", S: "#B98CFF", A: "#4FE3C1", B: "#FFB547", C: "#FF8A5B", D: "#FF4F79" }[grade];
    $("resDiff").textContent = [G.practice ? `Practice${G.rate !== 1 ? " " + Math.round(G.rate * 100) + "%" : ""}` : "", ...modNames(G.mods || {}), `${DIFF_LABEL[G.diff]} \u00B7 Lv ${levelOf(G.song, G.diff)}`].filter(Boolean).join(" \u00B7 ");
    $("resTitle").textContent = G.song.artist ? `${G.song.title} \u2014 ${G.song.artist}` : G.song.title;
    $("resScore").textContent = pad7(score);
    $("resAcc").textContent = `${acc.toFixed(2)}% accuracy \u00B7 ${G.maxCombo}x max combo`;
    $("resNew").hidden = !isNew;
    $("resCoins").innerHTML = `<i class="coin sm"></i><b>+${pay.total}</b> coins <small></small>`;
    $("resCoins").querySelector("small").textContent = pay.parts.map(p => /^(Test|The Tutorial|Practice)/.test(p[0]) || p[1] === null ? p[0] : `${p[0]} ${p[1] >= 0 ? "+" : ""}${p[1]}`).join(" \u00B7 ");
    renderXPBox($("resXP"), G.xpResult);
    $("resCounts").innerHTML = ["perfect", "great", "good", "bad", "miss"].map(k => `<div><span style="color:${J[k].color}">${J[k].label}</span><b>${G.counts[k]}</b></div>`).join("");
    $("results").hidden = false;
    playMenu(2.5);
    setTimeout(() => $("rRetry").focus({ preventScroll: true }), 0);
  }, 900);
}
