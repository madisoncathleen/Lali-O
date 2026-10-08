/*
 * LALI-O - screens/song-select.js
 * The song list, difficulty picker and modifiers.
 */
"use strict";

let selIdx = 0, selDiff = store.get("diff", "medium");
const miniCache = {};
function miniNotes(song, d) { const k = song.id + d; return miniCache[k] || (miniCache[k] = buildNotes(song, d)); }

function buildSongList() {
  const list = $("songList"); list.innerHTML = "";
  SONGS.forEach((s, i) => {
    const b = document.createElement("button");
    b.className = "song"; b.id = "song-" + s.id;
    b.innerHTML = `<span class="num">${String(i + 1).padStart(2, "0")}</span><span class="txt"><span class="t"></span><span class="a"></span></span><span class="meta">${Math.round(s.bpm)} BPM<br>${fmtTime(s.duration)}</span><span class="grade-ic none" title="No grade yet"></span>`;
    b.querySelector(".t").textContent = s.title; b.querySelector(".a").textContent = s.artist || (s.custom ? "Added by you" : "");
    if (s.endless) { b.classList.add("endless-row"); b.querySelector(".t").innerHTML = rainbowHTML("Endless", 24); b.querySelector(".a").textContent = "Random songs back to back"; b.querySelector(".meta").innerHTML = "\u221E songs<br>1 health bar"; }
    b.addEventListener("click", () => { if (selIdx === i) startGame(); else { selIdx = i; renderSelect(); } });
    list.appendChild(b);
  });
}

// song list and store list: the list starts under the search bar, the selected row moves down to the middle and then
// the list scrolls; at the end the last row stays near the bottom. Returns where the selected row sits.
function listAnchor(el, rank, n) {
  const listH = el.clientHeight || 600, TOP = 22, BOT = 10;
  let off = Math.min(rank * 96 + TOP, Math.max(TOP, listH / 2 - 44)) - rank * 96;
  off = Math.min(TOP, Math.max(off, listH - BOT - 88 - (n - 1) * 96));
  el.classList.toggle("scrolled", off < TOP - 1);                          // rows hidden above: fade the top edge
  el.classList.toggle("more", off + (n - 1) * 96 + 88 > listH - BOT + 1);  // rows hidden below: fade the bottom edge
  return off + rank * 96;
}

// search: only matching songs are listed (and reachable with the arrow keys)
let songQuery = "";
const songMatches = (s) => !songQuery || `${s.title} ${s.artist || ""}`.toLowerCase().includes(songQuery);
const visibleSongs = () => SONGS.map((_, i) => i).filter(i => songMatches(SONGS[i]));
const GRADE_COLOR = { SS: "#8FF7FF", S: "#B98CFF", A: "#4FE3C1", B: "#FFB547", C: "#FF8A5B", D: "#FF4F79" };
let lastSelIdx = -1;

function renderSelect(first) {
  if (selIdx !== lastSelIdx) { if (lastSelIdx !== -1 && typeof toggleModPanel === "function") toggleModPanel(false); lastSelIdx = selIdx; }   // a different song closes the Modifiers drop-down
  const vis = visibleSongs();
  $("noMatch").hidden = vis.length > 0;
  if (vis.length && !vis.includes(selIdx)) selIdx = vis[0];
  const rank = vis.indexOf(selIdx);
  const s = SONGS[selIdx];
  // the list starts right under the search bar; the selected song moves down until it reaches the middle, then the list scrolls
  // the list starts just under the search bar; the selected song moves down to the middle, then the list scrolls,
  // and at the end the last song stays near the bottom of the screen instead of leaving a big empty gap
  const anchor = listAnchor($("songList"), rank, vis.length);
  [...$("songList").children].forEach((el, i) => {
    const r = vis.indexOf(i), sg = SONGS[i];
    // letter grade for the selected difficulty
    const gi = el.querySelector(".grade-ic"), gb = sg && (bests[sg.id] || {})[selDiff];
    if (gi && sg && sg.endless) { const eb = ENDLESS_BEST()[selDiff]; gi.textContent = eb ? eb.songs : ""; gi.className = "grade-ic" + (eb ? "" : " none"); gi.style.color = eb ? "var(--violet)" : ""; gi.title = eb ? `Best Endless run on ${DIFF_LABEL[selDiff]}: ${eb.songs} songs` : "No Endless run yet"; }
    else if (gi) { gi.textContent = gb ? gb.grade : ""; gi.className = "grade-ic" + (gb ? "" : " none"); gi.style.color = gb ? GRADE_COLOR[gb.grade] : ""; gi.title = gb ? `Best grade on ${DIFF_LABEL[selDiff]}: ${gb.grade}` : `Not cleared on ${DIFF_LABEL[selDiff]} yet`; }
    if (r < 0) { el.style.visibility = "hidden"; el.style.opacity = 0; el.tabIndex = -1; return; }
    el.style.visibility = "";
    const d = r - rank;
    el.classList.toggle("sel", d === 0);
    el.style.transform = `translateY(${anchor + d * 96}px) scale(${d === 0 ? 1 : 0.93})`;
    el.style.opacity = d === 0 ? 1 : Math.max(0.15, 0.6 - Math.abs(d) * 0.15);
    el.tabIndex = d === 0 ? 0 : -1;
  });
  if ($("selTitle").textContent !== s.title) for (const id of ["selTitle", "selArtist", "selMeta"]) { const el = $(id); el.classList.remove("swap"); void el.offsetWidth; el.classList.add("swap"); }
  if (s.endless) $("selTitle").innerHTML = rainbowHTML("Endless", parseFloat(getComputedStyle($("selTitle")).fontSize) || 60);
  else $("selTitle").textContent = s.title;
  fitTitle();
  $("selArtist").textContent = s.artist; $("selArtist").hidden = !s.artist;
  if (s.endless) {
    $("selArtist").textContent = "Random songs play back to back on the difficulty you pick. Clearing a song heals you and raises your coin bonus for the next one (up to double). Keep going until you run out of health!";
    $("selArtist").hidden = false; $("selArtist").classList.add("desc");
    $("selMeta").textContent = `Endless \u00B7 now previewing ${endlessShown() ? endlessShown().title : ""}`;
  } else { $("selArtist").classList.remove("desc"); } if (!s.endless) $("selMeta").textContent = `${Math.round(s.bpm)} BPM \u00B7 ${fmtTime(s.duration)} \u00B7 ${s.choruses.length} flip${s.choruses.length === 1 ? "" : "s"}`;
  const dv = $("diffs"); dv.innerHTML = "";
  for (const d of DIFFS) {
    const b = document.createElement("button");
    b.className = "diff"; b.dataset.d = d; b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", d === selDiff ? "true" : "false");
    b.innerHTML = s.endless ? `<b>${DIFF_LABEL[d]}</b><small>Every song on ${DIFF_LABEL[d]}</small>` : `<b>${DIFF_LABEL[d]}</b><small>Lv ${levelOf(s, d)} \u00B7 ${s.charts[d].length} notes</small>`;
    b.addEventListener("click", () => { selDiff = d; store.set("diff", d); renderSelect(); });
    // a short grace period on leaving, so crossing the gap between two tabs doesn't flicker
    b.addEventListener("mouseenter", () => { clearTimeout(hoverOff); if (hoverDiff !== d) { hoverDiff = d; showDiff(); } });
    b.addEventListener("mouseleave", () => { clearTimeout(hoverOff); hoverOff = setTimeout(() => { if (hoverDiff === d) { hoverDiff = null; showDiff(); } }, 120); });
    dv.appendChild(b);
  }
  hoverDiff = null;
  showDiff();
  syncDeleteBtn();
  syncPractice();
  // changing songs fades the preview music and map out and back in instead of cutting
  if (s.endless) { if (!endlessShowId || !endlessPool().some(x => x.id === endlessShowId)) endlessCycle(true); else switchPreview(endlessShown(), first ? 0 : 300); }
  else switchPreview(s, first ? 0 : 300);
  clearTimeout(renderSelect.t);
  renderSelect.t = setTimeout(() => { if (actx) getBuffer(s); }, 700);
}

// the difficulty being shown: the hovered tab if any, otherwise the selected one
let hoverDiff = null, hoverOff = 0;
const shownDiff = () => hoverDiff || selDiff;

function showDiff() {
  const s = SONGS[selIdx], d = shownDiff();
  for (const b of $("diffs").children) b.classList.toggle("peek", b.dataset.d === hoverDiff && hoverDiff !== selDiff);
  if (s.endless) {
    const eb = ENDLESS_BEST()[d], label = eb ? `${eb.songs} SONG${eb.songs === 1 ? "" : "S"}` : "UNTOUCHED";
    $("bestScore").innerHTML = rainbowHTML(label, parseFloat(getComputedStyle($("bestScore")).fontSize));
    $("bestAcc").textContent = eb ? `Best run \u00B7 ${eb.score.toLocaleString()} total score` : "";
    return;
  }
  const best = (bests[s.id] || {})[d];
  // best score (or UNTOUCHED): rainbow characters, each carrying its own copy of the gradient,
  // time-shifted by its position so the colours read as one band
  const label = best ? pad7(best.score) : "UNTOUCHED";
  const charW = parseFloat(getComputedStyle($("bestScore")).fontSize) * 0.6, speed = 200 / 3;
  $("bestScore").innerHTML = `<span class="rb" aria-label="${label}">` + [...label].map((c, i) =>
    `<i data-c="${c}" style="--d:${(-(3 - ((i * charW / speed) % 3))).toFixed(3)}s;--w:${(i * 0.09).toFixed(2)}s">${c}</i>`).join("") + "</span>";
  $("bestAcc").textContent = best ? `${best.acc.toFixed(2)}% \u00B7 ${best.combo}x max combo \u00B7 ${best.grade}` : "";
}

// shrink the big title until its longest word fits on one line, so words never break mid-word
function fitTitle() { fitBig($("selTitle")); }

function fitBig(el) {
  el.style.fontSize = "";
  let size = parseFloat(getComputedStyle(el).fontSize);
  while (el.scrollWidth > el.clientWidth + 1 && size > 14) {
    size -= 2;
    el.style.fontSize = size + "px";
  }
}

window.addEventListener("resize", () => { if (screen === "select") { fitTitle(); renderSelect(); } if (screen === "store") renderStore(); });

// wrap: the arrow keys loop from the top of a list to the bottom and back (scrolling doesn't)
const stepIdx = (i, d, n, wrap) => wrap && n > 1 && ((i === 0 && d < 0) || (i === n - 1 && d > 0)) ? (d < 0 ? n - 1 : 0) : clamp(i + d, 0, n - 1);

function moveSel(d, wrap) {
  const vis = visibleSongs(); if (!vis.length) return;
  const n = vis[stepIdx(vis.indexOf(selIdx), d, vis.length, wrap)];
  if (n !== selIdx) { selIdx = n; renderSelect(); }
}

$("songSearch").addEventListener("input", (e) => { songQuery = e.target.value.trim().toLowerCase(); if (screen === "select") renderSelect(); });
function moveDiff(d) { selDiff = DIFFS[clamp(DIFFS.indexOf(selDiff) + d, 0, DIFFS.length - 1)]; store.set("diff", selDiff); renderSelect(); }
let wheelAcc = 0, wheelLock = 0;

$("select").addEventListener("wheel", (e) => {
  e.preventDefault();
  const now = performance.now();
  wheelAcc += e.deltaY;
  if (Math.abs(wheelAcc) > 40 && now > wheelLock) { moveSel(Math.sign(wheelAcc)); wheelAcc = 0; wheelLock = now + 140; }
}, { passive: false });

// song titles bump to the beat of the preview: a small scale-up plus a nudge in a different direction each beat
const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function pulseTitles() {
  const s0 = SONGS[selIdx], s = s0 && s0.endless ? endlessShown() : s0;
  const big = $("selTitle"), small = document.querySelector(".song.sel .t");
  let tf = "", tfSmall = "", glowBig = "", glowPlay = "";
  if (previewSong === s && !previewAudio.paused) {
    // glow to the beat (kept even with reduced motion, since it doesn't move anything)
    const b0 = pulseAt(previewAudio.currentTime, s.beat0, 60 / s.bpm);
    const ac = THEME().accentRgb;
    glowBig = `0 0 ${(6 + 22 * b0).toFixed(1)}px rgba(${ac},${(0.25 + 0.6 * b0).toFixed(3)})`;
    glowPlay = `0 0 ${(3 + 12 * b0).toFixed(1)}px rgba(${ac},${(0.2 + 0.75 * b0).toFixed(3)})`;
  }
  big.style.textShadow = glowBig;
  $("playWord").style.textShadow = glowPlay;
  if (!reduceMotion && previewSong === s && !previewAudio.paused) {
    const p = 60 / s.bpm, t = previewAudio.currentTime;
    const b = pulseAt(t, s.beat0, p);
    const k = Math.floor((t - s.beat0) / p);
    const ang = k * 2.39996;                        // golden-angle steps: every beat pushes a new way
    const dx = Math.cos(ang) * 5 * b, dy = Math.sin(ang) * 3 * b;
    tf = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) scale(${(1 + 0.035 * b).toFixed(4)})`;
    tfSmall = `translate(${(dx * 0.5).toFixed(2)}px, ${(dy * 0.5).toFixed(2)}px) scale(${(1 + 0.02 * b).toFixed(4)})`;
  }
  big.style.transform = tf;
  if (small) { small.style.transform = tfSmall; small.style.transformOrigin = "0 60%"; }
  for (const el of document.querySelectorAll(".song:not(.sel) .t")) el.style.transform = "";
}

// Chaos: every tap note starts in a different lane and swerves into its own (never through a long note)
function applyChaos(notes, seed) {
  notes.forEach((n, i) => {
    if (n.d) return;
    const opts = [0, 1, 2, 3].filter(l => l !== n.lane && !slideBlocked(notes, i, l));
    if (opts.length) n.from = opts[Math.floor(hr(i + seed, 71) * opts.length)];
  });
  return notes;
}

const chaosCache = new WeakMap();
function chaotic(notes) { let m = chaosCache.get(notes); if (!m) { m = applyChaos(notes.map(n => Object.assign({}, n)), 5); chaosCache.set(notes, m); } return m; }
const flatCache = new WeakMap();
function unflipped(notes) { let m = flatCache.get(notes); if (!m) { m = notes.map(n => Object.assign({}, n, { rise: 0 })); flatCache.set(notes, m); } return m; }

function drawMini() {
  const s0 = SONGS[selIdx], s = miniSong || (s0 && s0.endless ? endlessShown() : s0);
  const [g, W, H] = fitCanvas($("mini"));
  g.clearRect(0, 0, W, H);
  if (!s) return;
  const prac = practice && !s0.endless && !s.tutorial;
  const t = previewSong === s && previewAudio.currentTime > 0 ? previewAudio.currentTime : (prac ? pracStartAt : s.preview);
  // the preview shows your modifiers: Chaos swerves the notes, Hidden fades notes, Double Time / practice speed changes the pace
  let notes = miniNotes(s, shownDiff()); if (mods.noflip) notes = unflipped(notes); if (mods.chaos) notes = chaotic(notes);
  drawField(g, { x: 0, w: W, H, t, travel: travelTime() * 1.1, notes, ch: mods.noflip ? [] : s.choruses, mini: true, period: 60 / s.bpm, beat0: s.beat0, fx: 1, hidden: mods.hidden });
  const tags = [prac ? "PRACTICE" + (pracSpeed !== 1 ? " " + Math.round(pracSpeed * 100) + "%" : "") : "", mods.hidden ? "HIDDEN" : "", mods.chaos ? "CHAOS" : "", mods.noflip ? "NO FLIP" : "", !prac && mods.dt ? "125%" : "", !prac && mods.sd ? "SUDDEN DEATH" : ""].filter(Boolean);
  if (!prac && mods.sd) {   // Sudden Death: a pulsing red frame
    const k = 0.5 + 0.5 * Math.sin(performance.now() / 260);
    g.save(); g.strokeStyle = `rgba(255,79,121,${0.45 + 0.4 * k})`; g.lineWidth = 3; g.shadowColor = "#FF4F79"; g.shadowBlur = 10 + 8 * k; g.strokeRect(1.5, 1.5, W - 3, H - 3); g.restore();
  }
  if (tags.length) {
    g.save(); g.font = `700 9px "IBM Plex Mono", monospace`; g.textBaseline = "middle";
    let y = 12;
    for (const tg of tags) {
      const w = g.measureText(tg).width + 10, red = tg === "SUDDEN DEATH";
      g.fillStyle = red ? "rgba(255,79,121,.85)" : `rgba(${THEME().accentRgb},.85)`; rrect(g, W - w - 6, y - 7, w, 14, 4); g.fill();
      g.fillStyle = "#0B0B12"; g.fillText(tg, W - w - 1, y + 0.5); y += 17;
    }
    g.restore();
  }
}
