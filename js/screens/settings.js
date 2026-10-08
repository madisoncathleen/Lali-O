/*
 * LALI-O - screens/settings.js
 * The Settings screen, including offset calibration.
 */
"use strict";

let bindingLane = -1;

function renderKeys() {
  const k = $("keys"); k.innerHTML = "";
  settings.keys.forEach((key, i) => {
    const b = document.createElement("button");
    b.className = "keybtn" + (bindingLane === i ? " wait" : ""); b.style.setProperty("--c", cosmetics().fill[i]);
    b.innerHTML = `<span></span><small>Lane ${i + 1}</small>`;
    b.firstChild.textContent = bindingLane === i ? "\u2026" : key.label;
    b.addEventListener("click", () => { bindingLane = bindingLane === i ? -1 : i; renderKeys(); });
    k.appendChild(b);
  });
}

function keyLabel(e) {
  if (e.key === " ") return "SPC";
  if (e.key.length === 1) return e.key.toUpperCase();
  return e.key.replace("Arrow", "").slice(0, 4).toUpperCase();
}

// settings are split into pages; the first page lists them
const SET_GROUPS = [
  { id: "gameplay", name: "Gameplay", desc: "Note speed, audio offset (with auto setup) and the quest ticker.", icon: '<path d="M5 12h14M13 6l6 6-6 6"/>' },
  { id: "sound", name: "Sound", desc: "Master volume, bass and menu music volume.", icon: '<path d="M4 10v4h4l5 4V6L8 10H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>' },
  { id: "music", name: "Music", desc: "Your own MP3s for the main menu, pause and Game Over screens.", icon: '<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>' },
  { id: "data", name: "Save data", desc: "Reset the progress on this save.", icon: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>' },
];

let setGroup = null;

function buildSetCats() {
  $("setCats").innerHTML = SET_GROUPS.map(g => `<button class="setcat" data-g="${g.id}"><span class="ic"><svg viewBox="0 0 24 24">${g.icon}</svg></span><span class="tx"><b>${g.name}</b><small>${g.desc}</small></span><span class="go">&rsaquo;</span></button>`).join("");
  $("setCats").querySelectorAll(".setcat").forEach(b => b.addEventListener("click", () => openSetGroup(b.dataset.g)));
}

function renderSetGroup() {
  $("setCats").hidden = !!setGroup;
  document.querySelector("#settings .wrap").classList.toggle("cats", !setGroup);   // the category list sits in the middle of the screen
  // key binds live on the main settings page, above the categories
  document.querySelectorAll("#settings [data-group]").forEach(el => { el.hidden = el.dataset.group !== (setGroup || "controls"); });
  const g = SET_GROUPS.find(x => x.id === setGroup);
  $("setCrumb").textContent = g ? `Settings \u203A ${g.name}` : "Settings";
  const wrap = document.querySelector("#settings .wrap"); if (wrap) wrap.scrollTop = 0;
  const w = document.querySelector("#settings .wrap"); w.classList.remove("swap"); void w.offsetWidth; w.classList.add("swap");
}

function openSetGroup(id) { setGroup = id; renderSetGroup(); }

function setBackStep() {
  if (setGroup) { const was = setGroup; setGroup = null; renderSetGroup(); const b = document.querySelector(`.setcat[data-g="${was}"]`); if (b) b.focus({ preventScroll: true }); }
  else show("menu");
}

buildSetCats();

function renderSettings() {
  renderKeys();
  $("speed").value = settings.speed; $("speedVal").textContent = settings.speed.toFixed(1) + "x";
  $("menuVol").value = settings.menuVol; $("menuVolVal").textContent = settings.menuVol + "%";
  $("songVol").value = settings.songVol; $("songVolVal").textContent = settings.songVol + "%";
  $("showTicker").checked = settings.showTicker !== false;
  $("bass").value = settings.bass; $("bassVal").textContent = (settings.bass > 0 ? "+" : "") + settings.bass + " dB";
  $("offset").value = settings.offset; $("offsetVal").textContent = (settings.offset > 0 ? "+" : "") + settings.offset + " ms";
}

$("speed").addEventListener("input", (e) => { settings.speed = +e.target.value; saveSettings(); renderSettings(); });

$("menuVol").addEventListener("input", (e) => {
  settings.menuVol = +e.target.value; saveSettings(); renderSettings();
  // change whatever music is playing right away: menu music and Game Over music
  for (const [gn, mul] of [[menuPlaying && menuGainNode, menuGainMul], [goGain, goGainMul]]) if (gn) {
    const t = actx.currentTime, v = Math.max(0.0001, settings.menuVol / 100 * mul);
    gn.gain.cancelScheduledValues(t); gn.gain.setValueAtTime(gn.gain.value, t); gn.gain.linearRampToValueAtTime(v, t + 0.08);
  }
});

$("songVol").addEventListener("input", (e) => { settings.songVol = +e.target.value; saveSettings(); renderSettings(); });
$("showTicker").addEventListener("change", (e) => { settings.showTicker = e.target.checked; saveSettings(); applyTicker(); });
function applyTicker() { $("questMarquee").classList.toggle("off", settings.showTicker === false); }
applyTicker();
$("bass").addEventListener("input", (e) => { settings.bass = +e.target.value; saveSettings(); renderSettings(); applyBass(); });   // heard right away

$("offset").addEventListener("input", (e) => { settings.offset = +e.target.value; saveSettings(); renderSettings(); });
$("offMinus").addEventListener("click", () => { settings.offset = clamp(settings.offset - 5, -250, 250); saveSettings(); renderSettings(); });
$("offPlus").addEventListener("click", () => { settings.offset = clamp(settings.offset + 5, -250, 250); saveSettings(); renderSettings(); });

/* auto offset: ticks play at a steady beat; the average gap between each tick (as you hear it) and your tap becomes the offset */
const CAL_IN = 4, CAL_N = 16, CAL_P = 0.6;
var CAL = { on: false, beats: [], hits: [], nodes: [], timer: 0, ui: 0 };

function calibTickAt(t, accent) {
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = "sine"; o.frequency.value = accent ? 1500 : 1000;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.55, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + 0.08); CAL.nodes.push(o);
}

function renderCalibDots() {
  const now = actx ? actx.currentTime : 0;
  $("calibDots").innerHTML = Array.from({ length: CAL_N }, (_, i) => {
    const k = CAL_IN + i, h = CAL.hits[k], past = CAL.on && CAL.beats[k] !== undefined && now > CAL.beats[k] + 0.3;
    return `<i class="${h !== undefined ? "hit" : past ? "miss" : CAL.on && Math.abs(now - CAL.beats[k]) < CAL_P / 2 ? "now" : ""}"></i>`;
  }).join("");
}

function calibStart() {
  initAudio(); if (!actx) return;
  if (actx.state === "suspended") actx.resume();
  stopMenu(0.3); bindingLane = -1; renderKeys();
  CAL.on = true; CAL.hits = []; CAL.nodes = [];
  const t0 = actx.currentTime + 1.0;
  CAL.beats = Array.from({ length: CAL_IN + CAL_N }, (_, i) => t0 + i * CAL_P);
  CAL.beats.forEach((t, i) => calibTickAt(t, i % 4 === 0));
  $("calibGo").textContent = "Stop"; $("calibMsg").textContent = ""; $("calibPad").classList.add("live");
  document.activeElement && document.activeElement.blur && document.activeElement.blur();   // so keys go to the taps, not a slider
  clearTimeout(CAL.timer); CAL.timer = setTimeout(calibFinish, (1.0 + (CAL_IN + CAL_N) * CAL_P + 0.4) * 1000);
  clearInterval(CAL.ui); CAL.ui = setInterval(calibUI, 30);
}

function calibUI() {
  if (!CAL.on || !actx) return;
  const now = actx.currentTime, lat = (actx.outputLatency || 0) + (actx.baseLatency || 0), heard = now - lat;
  let idx = -1; CAL.beats.forEach((t, i) => { if (heard >= t && heard < t + CAL_P) idx = i; });
  const flash = idx >= 0 && heard - CAL.beats[idx] < 0.1 && idx < CAL_IN;   // the dot only flashes during the count-in, so you tap to the sound
  $("calibBeat").classList.toggle("flash", flash);
  $("calibLabel").textContent = idx < 0 ? "Listen\u2026" : idx < CAL_IN ? `Get ready: ${CAL_IN - idx}` : `Tap on every tick (${idx - CAL_IN + 1} / ${CAL_N})`;
  renderCalibDots();
}

function calibTap(perf) {
  if (!CAL.on) return;
  const at = ctxTimeAt(perf);   // when the tap happened, on the same clock as what you hear
  let best = -1, bd = 9;
  for (let k = CAL_IN; k < CAL.beats.length; k++) { const d = at - CAL.beats[k]; if (Math.abs(d) < Math.abs(bd)) { bd = d; best = k; } }
  const b = $("calibBeat"); b.classList.add("tap"); setTimeout(() => b.classList.remove("tap"), 90);
  if (best < 0 || Math.abs(bd) > CAL_P * 0.45 || CAL.hits[best] !== undefined) return;
  CAL.hits[best] = bd; renderCalibDots();
}

function calibStop(msg) {
  CAL.on = false; clearTimeout(CAL.timer); clearInterval(CAL.ui);
  for (const o of CAL.nodes) { try { o.stop(); } catch (e) {} } CAL.nodes = [];
  $("calibGo").textContent = "Start"; $("calibPad").classList.remove("live"); $("calibBeat").classList.remove("flash");
  $("calibLabel").textContent = "Ready";
  if (msg !== undefined) $("calibMsg").textContent = msg;
  if (screen === "settings") playMenu(1.2);
}

function calibFinish() {
  const d = CAL.hits.filter(v => v !== undefined).sort((a, b) => a - b);
  renderCalibDots(); calibStop();
  if (d.length < 8) { $("calibMsg").textContent = `Only ${d.length} of ${CAL_N} taps were close to a tick, so your offset wasn't changed. Try again and tap along with every tick.`; return; }
  // median of the middle taps, so a couple of stray taps don't throw it off
  const trim = d.slice(Math.floor(d.length * 0.2), Math.ceil(d.length * 0.8)), mid = trim[Math.floor(trim.length / 2)];
  const ms = clamp(Math.round(mid * 1000 / 5) * 5, -250, 250);
  const spread = Math.round((d[d.length - 1] - d[0]) * 1000);
  settings.offset = ms; saveSettings(); renderSettings();
  $("calibMsg").textContent = `Offset set to ${ms > 0 ? "+" : ""}${ms} ms. Your taps were ${Math.abs(Math.round(mid * 1000))} ms ${mid >= 0 ? "late" : "early"} on average` + (spread > 160 ? " (they were a bit uneven, so you might want to run it again)." : ".");
}

$("calibGo").addEventListener("click", () => CAL.on ? calibStop("Stopped. Your offset wasn't changed.") : calibStart());
$("calibPad").addEventListener("pointerdown", (e) => { if (CAL.on) { e.preventDefault(); calibTap(e.timeStamp || performance.now()); } });
renderCalibDots();
$("resetKeys").addEventListener("click", () => { settings.keys = DEFAULT_KEYS.map(k => ({ ...k })); bindingLane = -1; saveSettings(); renderKeys(); });

// sample map for the speed preview: 120 BPM, 8-second loop
const SAMPLE = (() => {
  const pat = [0, 1, 2, 3, 2, 1, 0, 3, 1, 2, 0, 3, 2, 3, 1, 0];
  const out = [];
  for (let k = 0; k < 48; k++) out.push({ t: k * 0.5, lane: pat[k % 16], from: pat[k % 16], d: k % 8 === 4 ? 0.75 : 0, end: k * 0.5 + (k % 8 === 4 ? 0.75 : 0), rise: 0 });
  return out.filter(n => !(n.d === 0 && out.some(o => o.d && o.lane === n.lane && n.t > o.t && n.t <= o.end + 0.01)));
})();

function drawSpeedPreview() {
  const [g, W, H] = fitCanvas($("speedPrev"));
  g.clearRect(0, 0, W, H);
  const t = 8 + (performance.now() / 1000) % 8;
  drawField(g, { x: 0, w: W, H, t, travel: travelTime() * 0.75, notes: SAMPLE, ch: [], mini: true, period: 0.5, beat0: 0 });
}
