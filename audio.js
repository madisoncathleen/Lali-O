/*
 * LALI-O - audio/audio.js
 * Web Audio setup, the music player, loading songs, previews and menu music.
 */
"use strict";

let actx = null, analyser = null, freq = null;
let menuBuf = null, menuSrc = null, menuGainNode = null, menuStartCtx = 0, menuStartPos = 0, menuPlaying = false, menuWanted = true;
const hostedAudio = new Audio(); hostedAudio.preload = "auto";

// menu, pause and Game Over music: the built-in track, or a random pick from the MP3s you added (per save)
const MUSIC_KINDS = ["menu", "pause", "gameover"];
const DEF_LIE = { id: "def-lie", file: DATA.menu.file, name: "Beautiful Lie", bpm: DATA.menu.bpm, beat0: DATA.menu.beat0, gain: 1 };
const DEFAULT_MUSIC = { menu: DEF_LIE, pause: DEF_LIE, gameover: { id: "def-dead", file: "audio/gameover.mp3", name: "Beautiful Dead", bpm: 120, beat0: 0, gain: 1 } };
const MUSICLIST = { menu: [], pause: [], gameover: [] };   // your uploaded tracks for each, oldest first

let menuBeat = { bpm: DATA.menu.bpm, beat0: DATA.menu.beat0 }, menuGainMul = 1, goGainMul = 1;
let menuKind = null, menuTrack = null, menuPending = null, menuToken = 0;
const trackPos = new Map(), lastPick = {};   // where each track was left off, and the last pick for each kind

const musicMode = (w) => (settings.music && settings.music[w] === "custom" && MUSICLIST[w].length) ? "custom" : "default";
const musicPool = (w) => musicMode(w) === "custom" ? MUSICLIST[w] : [DEFAULT_MUSIC[w]];

function pickTrack(w) {
  const pool = musicPool(w);
  let c = pool.filter(t => t.id !== lastPick[w]); if (!c.length) c = pool;   // never the same one twice in a row
  const t = c[Math.floor(Math.random() * c.length)]; lastPick[w] = t.id; return t;
}

const decodedMusic = new Map();   // id -> Promise<AudioBuffer>; only the last few are kept in memory

function trackBuffer(t) {
  let p = decodedMusic.get(t.id);
  if (p) decodedMusic.delete(t.id);
  else { p = (t.blob ? t.blob.arrayBuffer() : fetch(t.file).then(r => r.arrayBuffer())).then(decode); p.catch(() => decodedMusic.delete(t.id)); }
  decodedMusic.set(t.id, p);
  while (decodedMusic.size > 4) decodedMusic.delete(decodedMusic.keys().next().value);
  return p;
}

// Start loading the menu music the moment the page opens, before the first click, so it can start playing
// instantly instead of after a download and decode. (Decoding doesn't need sound to be unlocked.)
function preDecode(ab) {
  const O = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const oc = new O(2, 44100, 44100);
  return new Promise((res, rej) => { const r = oc.decodeAudioData(ab, res, rej); if (r && r.then) r.then(res, rej); });
}

let nextMenuTrack = null;

function prewarmMenu() {
  try {
    const t = pickTrack("menu"); nextMenuTrack = t;
    if (decodedMusic.has(t.id)) return;
    const p = (t.blob ? t.blob.arrayBuffer() : fetch(t.file).then(r => r.arrayBuffer())).then(preDecode);
    p.catch(() => decodedMusic.delete(t.id));
    decodedMusic.set(t.id, p);
  } catch (e) {}
}

prewarmMenu();
let limiter = null, bassEQ = null, bassTrim = null, prevEQ = null, prevTrim = null;
hostedAudio.crossOrigin = "anonymous";   // lets the song-list previews go through the bass filter

// bass: a low-shelf filter below ~200 Hz; when boosted, the overall level is trimmed a little so loud songs don't clip
function bassTrimGain(db) { return Math.pow(10, -Math.max(0, db) * 0.5 / 20); }

function applyBass(ramp = 0.06) {
  if (!actx) return;
  const t = actx.currentTime, db = settings.bass || 0;
  for (const [eq, tr] of [[bassEQ, bassTrim], [prevEQ, prevTrim]]) if (eq) {
    eq.gain.cancelScheduledValues(t); eq.gain.setValueAtTime(eq.gain.value, t); eq.gain.linearRampToValueAtTime(db, t + ramp);
    tr.gain.cancelScheduledValues(t); tr.gain.setValueAtTime(tr.gain.value, t); tr.gain.linearRampToValueAtTime(bassTrimGain(db), t + ramp);
  }
}

function makeBass() {
  const eq = actx.createBiquadFilter(); eq.type = "lowshelf"; eq.frequency.value = 200; eq.gain.value = settings.bass || 0;
  const tr = actx.createGain(); tr.gain.value = bassTrimGain(settings.bass || 0);
  eq.connect(tr); return [eq, tr];
}

// previews of songs you added play from the decoded file through Web Audio (volume-matched), behaving like an <audio> element
const bufPrev = {
  buf: null, node: null, gainNode: null, startCtx: 0, offset: 0, playing: false, _vol: 0, songGain: 1, token: 0,
  get paused() { return !this.playing; },
  get ended() { return !!this.buf && this.currentTime >= this.buf.duration - 0.05; },
  get currentTime() { return this.playing ? this.offset + (actx.currentTime - this.startCtx) : this.offset; },
  set currentTime(v) { const was = this.playing; this.stopNode(); this.playing = false; this.offset = v; if (was) this.play(); },
  get volume() { return this._vol; },
  set volume(v) { this._vol = v; if (this.gainNode) this.gainNode.gain.value = v * this.songGain; },
  play() {
    if (!this.buf || !actx) return Promise.resolve();
    this.stopNode();
    const src = actx.createBufferSource(); src.buffer = this.buf;
    const g = actx.createGain(); g.gain.value = this._vol * this.songGain;
    src.connect(g); g.connect(limiter);
    src.start(0, clamp(this.offset, 0, Math.max(0, this.buf.duration - 0.1)));
    this.node = src; this.gainNode = g; this.startCtx = actx.currentTime; this.playing = true;
    return Promise.resolve();
  },
  pause() { if (this.playing) this.offset = this.currentTime; this.stopNode(); this.playing = false; },
  stopNode() { if (this.node) { try { this.node.stop(); } catch (e) {} this.node.disconnect(); this.node = null; this.gainNode = null; } },
};

let previewAudio = hostedAudio;
let previewTarget = 0, previewSong = null;
const bufCache = new Map();

function initAudio() {
  if (actx) { if (actx.state === "suspended") actx.resume(); return; }
  actx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = actx.createAnalyser(); analyser.fftSize = 512; analyser.smoothingTimeConstant = 0.78;
  analyser.connect(actx.destination);
  freq = new Uint8Array(analyser.frequencyBinCount);
  // limiter so volume-matched (boosted) added songs never clip
  limiter = actx.createDynamicsCompressor();
  limiter.threshold.value = -1; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.003; limiter.release.value = 0.15;
  // all music -> bass -> speakers (via the analyser); added songs pass the limiter first
  [bassEQ, bassTrim] = makeBass(); bassTrim.connect(analyser);
  limiter.connect(bassEQ);
  // song-list previews of the built-in songs play through an <audio> element; give it its own bass filter
  try { [prevEQ, prevTrim] = makeBass(); actx.createMediaElementSource(hostedAudio).connect(prevEQ); prevTrim.connect(actx.destination); } catch (e) {}
  if (menuWanted) playMenu();
}

function decode(ab) { return new Promise((res, rej) => actx.decodeAudioData(ab, res, rej)); }

function menuPos() {
  if (!menuBuf) return 0;
  const p = menuPlaying ? menuStartPos + (actx.currentTime - menuStartCtx) : menuStartPos;
  return p % menuBuf.duration;
}

// kind: "menu" (main menu, settings, Store, Inventory, results) or "pause"
function playMenu(fade = 0.5, kind = "menu") {
  menuWanted = true;
  if (!actx) return;
  if (menuPlaying && menuKind === kind) return;
  if (!menuPlaying && menuPending === kind) return;   // already loading one for this
  // the track that's on can carry on if it's also in this list (e.g. both use Beautiful Lie)
  if (menuPlaying && musicPool(kind).some(t => t.id === menuTrack.id)) { menuKind = kind; return; }
  // use the track that was already loaded in advance when there is one
  const pre = kind === "menu" && nextMenuTrack && musicPool("menu").some(t => t.id === nextMenuTrack.id) ? nextMenuTrack : null;
  nextMenuTrack = null;
  const token = ++menuToken, track = pre || pickTrack(kind);
  if (menuPlaying) fadeOutMenu(0.4);
  menuPending = kind;
  trackBuffer(track).then(buf => {
    if (token !== menuToken || !menuWanted) return;
    menuPending = null;
    if (!musicPool(kind).some(t => t.id === track.id)) { playMenu(fade, kind); return; }   // your list finished loading meanwhile
    startMenuTrack(track, buf, kind, fade);
  }).catch(() => {
    if (token !== menuToken) return;
    menuPending = null;
    if (track !== DEFAULT_MUSIC[kind]) trackBuffer(DEFAULT_MUSIC[kind]).then(buf => { if (token === menuToken && menuWanted) startMenuTrack(DEFAULT_MUSIC[kind], buf, kind, fade); }).catch(() => {});
  });
}

function startMenuTrack(track, buf, kind, fade) {
  const pos = (trackPos.get(track.id) || 0) % buf.duration;
  menuTrack = track; menuKind = kind; menuBuf = buf; menuGainMul = track.gain || 1;
  menuBeat = { bpm: track.bpm || 120, beat0: track.beat0 || 0 };   // the logo and background pulse follow this
  const src = actx.createBufferSource(); src.buffer = buf; src.loop = true;
  const gn = actx.createGain(); gn.gain.setValueAtTime(0.0001, actx.currentTime); gn.gain.linearRampToValueAtTime(Math.max(0.0001, settings.menuVol / 100 * menuGainMul), actx.currentTime + fade);
  src.connect(gn); gn.connect(limiter); src.start(0, pos);
  menuSrc = src; menuGainNode = gn; menuStartCtx = actx.currentTime; menuStartPos = pos; menuPlaying = true;
  $("npName").textContent = track.name;
  renderMusicLists();
}

function fadeOutMenu(fade) {
  if (!menuPlaying) return;
  menuStartPos = menuPos(); trackPos.set(menuTrack.id, menuStartPos); menuPlaying = false;
  const t = actx.currentTime;
  menuGainNode.gain.cancelScheduledValues(t); menuGainNode.gain.setValueAtTime(menuGainNode.gain.value, t); menuGainNode.gain.linearRampToValueAtTime(0.0001, t + fade);
  menuSrc.stop(t + fade + 0.05);
}

function stopMenu(fade = 0.25) {
  menuWanted = false; menuToken++; menuPending = null;
  fadeOutMenu(fade);
}

// after the list or the default/your-MP3s choice changes: if what's playing no longer belongs, switch
function refreshMenuMusic(w) {
  if (!actx || w === "gameover" || menuKind !== w) return;
  if (menuPlaying && !musicPool(w).some(t => t.id === menuTrack.id)) { const k = menuKind; menuKind = null; playMenu(0.6, k); }
}

function getBuffer(song) {
  if (!bufCache.has(song.id)) {
    const load = song.blob ? song.blob.arrayBuffer()   // added songs: read the saved file directly
      : fetch(song.file, { cache: "no-store" }).then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.arrayBuffer(); });
    const p = load.then(decode);
    p.catch(() => bufCache.delete(song.id));
    bufCache.set(song.id, p);
    while (bufCache.size > 2) bufCache.delete(bufCache.keys().next().value);
  }
  return bufCache.get(song.id);
}

function startPreview(song) {
  if (previewSong === song) return;
  previewSong = song;
  hostedAudio.pause(); bufPrev.pause();
  if (song.custom) {
    previewAudio = bufPrev;
    const tok = ++bufPrev.token;
    bufPrev.buf = null; bufPrev.offset = song.preview; bufPrev.songGain = song.gain || 1; bufPrev.volume = 0;
    previewTarget = 0.85;
    if (actx) getBuffer(song).then(b => { if (previewSong !== song || bufPrev.token !== tok) return; bufPrev.buf = b; bufPrev.play(); }, () => {});
    return;
  }
  previewAudio = hostedAudio;
  previewAudio.src = song.file;
  previewAudio.volume = 0;
  previewTarget = 0.85;
  const go = () => { if (previewSong !== song) return; try { previewAudio.currentTime = song.preview; } catch (e) {} previewAudio.play().catch(() => {}); };
  previewAudio.addEventListener("loadedmetadata", go, { once: true });
}

let pvSwitchTok = 0, miniSong = null;

function switchPreview(song, fadeMs, onSwitch) {
  const tok = ++pvSwitchTok, mini = $("mini");
  const go = () => {
    if (tok !== pvSwitchTok) return;
    if (onSwitch) onSwitch();
    miniSong = song; startPreview(song);
    mini.style.transitionDuration = Math.max(0.15, fadeMs / 1000 * 0.8) + "s"; mini.classList.remove("fade");
  };
  if (previewSong === song) { miniSong = song; mini.classList.remove("fade"); if (onSwitch) onSwitch(); return; }
  if (!fadeMs || !previewSong || previewAudio.paused) { go(); return; }
  previewTarget = 0;                                  // the music fades out (see tickPreview)
  mini.style.transitionDuration = fadeMs / 1000 + "s"; mini.classList.add("fade");   // and so does the map
  setTimeout(go, fadeMs);
}

function stopPreview() {
  previewTarget = 0; previewSong = null;
  hostedAudio.pause(); if (hostedAudio.getAttribute("src")) { hostedAudio.removeAttribute("src"); try { hostedAudio.load(); } catch (e) {} }
  bufPrev.token++; bufPrev.pause(); bufPrev.buf = null;
}

function tickPreview() {
  if (screen === "select" && SONGS[selIdx] && SONGS[selIdx].endless) endlessCycle();
  if (!previewSong) return;
  const target = previewTarget * settings.songVol / 100;   // master volume
  const v = previewAudio.volume + (target - previewAudio.volume) * (target < previewAudio.volume ? 0.14 : 0.07);   // fades in gently, out a bit quicker
  previewAudio.volume = clamp(v, 0, 1);
  // the preview plays at the speed you picked (practice speed or Double Time) and practice starts where you chose
  const sel = SONGS[selIdx], prac = practice && sel && !sel.endless && !sel.tutorial;
  const rate = prac ? pracSpeed : mods.dt ? 1.25 : 1;
  if (previewAudio === hostedAudio && hostedAudio.playbackRate !== rate) { hostedAudio.preservesPitch = false; hostedAudio.playbackRate = rate; }
  const start = prac && previewSong === sel ? pracStartAt : previewSong.preview;
  if (previewAudio.readyState < 1) return;   // still loading: its own "loadedmetadata" handler starts it
  if (prac && previewSong === sel && previewPracAt !== pracStartAt) { previewPracAt = pracStartAt; previewAudio.currentTime = start; }
  if (!prac) previewPracAt = -1;
  if (previewAudio.ended || previewAudio.currentTime > start + 35) {
    previewAudio.currentTime = start; previewAudio.volume = 0; previewAudio.play().catch(() => {});
  }
}

let previewPracAt = -1;

/* map a performance.now() timestamp to AudioContext time */
let clk = null;

function ctxTimeAt(perf) {
  // smoothed mapping from performance.now() to AudioContext time, minus output latency
  const lat = (actx.outputLatency || 0) + (actx.baseLatency || 0);
  const sample = actx.currentTime - performance.now() / 1000;
  if (!clk || Math.abs(sample - clk.off) > 0.08) clk = { off: sample };
  else clk.off += (sample - clk.off) * 0.02;
  return perf / 1000 + clk.off - lat;
}
