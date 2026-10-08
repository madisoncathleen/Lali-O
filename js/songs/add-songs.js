/*
 * LALI-O - songs/add-songs.js
 * Adding, renaming and deleting your own songs.
 */
"use strict";

function customSong(rec) {
  // maps made by an older map maker are remade in the background (see remapNext)
  if (rec.data && (rec.data.mv || 0) < GEN.MAP_VERSION && rec.blob) { remapQ.push(rec); setTimeout(remapNext, 1500); }
  return Object.assign({}, rec.data, { id: rec.id, title: rec.title, artist: rec.artist || "", file: null, blob: rec.blob, custom: true });
}

// Songs added before the map maker got smarter are remade quietly in the background, one at a time,
// keeping their tempo and flips. Paused while a song is being played so it never causes lag.
const remapQ = []; let remapBusy = false;

async function remapNext() {
  if (remapBusy || !remapQ.length) return;
  remapBusy = true;
  const rec = remapQ.shift();
  try {
    while (screen === "game") await new Promise(r => setTimeout(r, 3000));
    const buf = await preDecode(await rec.blob.arrayBuffer());
    while (screen === "game") await new Promise(r => setTimeout(r, 3000));
    const d = rec.data;
    const out = await GEN.analyze(buf, () => {}, { tempo: { bpm: d.bpm, beat0: d.beat0 }, choruses: d.choruses || [] });
    d.charts = out.charts; d.mv = out.mv;
    try { await SONGDB.put(rec); } catch (e) {}
    const live = SONGS.find(s => s.id === rec.id);
    if (live) { live.charts = d.charts; live.mv = d.mv; }
  } catch (e) {}
  remapBusy = false;
  if (remapQ.length) setTimeout(remapNext, 300);
}

function insertSong(song) {
  SONGS.push(song);   // orderSongs then keeps the Tutorial and Test Track in their places
  orderSongs();
}

async function loadCustomSongs() {
  let recs = [];
  try { recs = await SONGDB.all(); } catch (e) { return; }
  recs.sort((a, b) => (a.added || 0) - (b.added || 0));
  for (const r of recs) if (!SONGS.some(s => s.id === r.id)) insertSong(customSong(r));
  buildSongList();
  if (screen === "select") renderSelect();
}

let addBusy = false;

function openAdd() {
  if (addBusy) { $("addSong").hidden = false; return; }
  $("asFile").value = ""; $("asTitle").value = ""; $("asArtist").value = "";
  $("asStatus").textContent = ""; $("asProg").hidden = true;
  renderAddList();
  $("addSong").hidden = false;
  setTimeout(() => $("asFile").focus({ preventScroll: true }), 0);
}

function closeAdd() { $("addSong").hidden = true; }

function asStatus(label, frac) {
  $("asStatus").textContent = label;
  if (frac === undefined) { $("asProg").hidden = true; return; }
  $("asProg").hidden = false; $("asProgFill").style.width = Math.round(clamp(frac, 0, 1) * 100) + "%";
}

async function addSongFromFile() {
  if (addBusy) return;
  const file = $("asFile").files[0];
  if (!file) { asStatus("Choose an MP3 file first."); return; }
  initAudio();
  addBusy = true; $("asGo").disabled = true;
  try {
    asStatus("Reading the file", 0.02);
    let buf, copy;
    // keep our own copy of the bytes: a picked file is only a link to the file on your computer,
    // so if it got moved or deleted later the song would stop loading
    try { const ab = await file.arrayBuffer(); copy = new Blob([ab], { type: file.type || "audio/mpeg" }); buf = await decode(ab); }
    catch (e) { asStatus("That file couldn't be read. Try a different MP3."); return; }
    if (buf.duration < 20) { asStatus("That song is too short. Pick one that's at least 20 seconds long."); return; }
    const data = await GEN.analyze(buf, asStatus);
    delete data.phrases;   // only used by the tools
    // volume matching: bring the song to the same loudness as the built-in songs
    data.gain = +Math.pow(10, clamp(GEN.TARGET_LUFS - data.lufs, -15, 15) / 20).toFixed(4);
    const title = $("asTitle").value.trim() || file.name.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").trim() || "My song";
    const rec = { id: "c" + Date.now().toString(36), title, artist: $("asArtist").value.trim(), blob: copy, data, added: Date.now(), acct: ACCT };
    let saved = true;
    try { await SONGDB.put(rec); } catch (e) { saved = false; }
    const song = customSong(rec);
    insertSong(song); buildSongList();
    selIdx = SONGS.indexOf(song);
    if (screen === "select") renderSelect();
    bumpStat("added"); checkAch();
    asStatus(`Added "${title}" with Easy, Medium, Hard and Extreme maps.` + (saved ? "" : " This browser wouldn't save it, so it will be gone when you close the game."));
    $("asFile").value = ""; $("asTitle").value = ""; $("asArtist").value = "";
    renderAddList();
  } catch (e) {
    asStatus("Something went wrong while making the maps. Try the file again, or a different MP3.");
  } finally { addBusy = false; $("asGo").disabled = false; }
}

async function deleteCustomSong(id) {
  const i = SONGS.findIndex(s => s.id === id); if (i < 0) return;
  const song = SONGS[i];
  try { await SONGDB.del(id); } catch (e) {}
  if (previewSong === song) stopPreview();
  SONGS.splice(i, 1);
  bufCache.delete(id);
  for (const k of Object.keys(miniCache)) if (k.startsWith(id)) delete miniCache[k];
  if (bests[id]) { delete bests[id]; store.set("bests", bests); }
  selIdx = clamp(selIdx >= i ? selIdx - 1 : selIdx, 0, SONGS.length - 1);
  buildSongList();
  if (screen === "select") renderSelect();
  renderAddList();
}

// two-click delete buttons
function confirmButton(btn, label, onYes) {
  btn.textContent = label;
  btn.addEventListener("click", () => {
    if (btn.dataset.armed) { clearTimeout(+btn.dataset.t); onYes(); return; }
    btn.dataset.armed = "1"; btn.textContent = "Click again to delete"; btn.classList.add("armed");
    btn.dataset.t = setTimeout(() => { delete btn.dataset.armed; btn.textContent = label; btn.classList.remove("armed"); }, 3500);
  });
}

function renderAddList() {
  const list = $("asList"); list.innerHTML = "";
  const mine = SONGS.filter(s => s.custom);
  $("asListHead").hidden = !mine.length;
  for (const s of mine) {
    const row = document.createElement("div"); row.className = "asrow";
    row.innerHTML = `<span class="astitle"><b></b><small></small></span><button class="delbtn"></button>`;
    row.querySelector("b").textContent = s.title;
    row.querySelector("small").textContent = `${Math.round(s.bpm)} BPM \u00B7 ${fmtTime(s.duration)}` + (s.artist ? ` \u00B7 ${s.artist}` : "");
    confirmButton(row.querySelector(".delbtn"), "Delete", () => deleteCustomSong(s.id));
    list.appendChild(row);
  }
}

/* practice mode: a toggle next to Play. Any difficulty, optional slow-down and start point, no health, nothing saved */
let practice = false, pracSpeed = 1, pracStartAt = 0, pracSongId = null;

// modifiers (Practice lives here too). Picks last until you change them; practice turns off the ones that don't fit
const MODS = {
  hidden: { name: "Hidden", mult: 1.3 }, chaos: { name: "Chaos", mult: 1.4 },
  sd: { name: "Sudden Death", mult: 1.35 }, dt: { name: "Double Time", mult: 1.5 }, noflip: { name: "No Flip", mult: 0.85 },
};

let mods = { hidden: false, chaos: false, sd: false, dt: false, noflip: false };
{ const saved = store.get("mods", {}); for (const k in mods) if (typeof saved[k] === "boolean") mods[k] = saved[k]; }   // your modifiers stay on between visits

const saveMods = () => store.set("mods", mods);
const modMult = (m) => Object.keys(MODS).reduce((x, k) => x * (m[k] ? MODS[k].mult : 1), 1);
const modNames = (m) => Object.keys(MODS).filter(k => m[k]).map(k => MODS[k].name);

function syncPractice() {
  const s = SONGS[selIdx]; if (!s) return;
  if (pracSongId !== s.id) { pracSongId = s.id; pracStartAt = 0; }
  if (s.endless) practice = false;   // Endless can't be practised
  if (practice) { mods.sd = false; mods.dt = false; }   // practice has no health bar and its own speed
  const hasMine = SONGS.some(x => x.custom), baseOn = !endlessBaseOff();
  $("modPanel").querySelectorAll(".mod").forEach(b => {
    const k = b.dataset.m;
    if (k === "practice") {   // on Endless this tile is the Base songs toggle instead of Practice
      const mode = s.endless ? "base" : "prac";
      if (b.dataset.mode !== mode || s.endless) {
        b.dataset.mode = mode;
        b.innerHTML = s.endless ? `<b>Base songs</b><small>${!hasMine ? "Add your own songs to turn this off" : baseOn ? "On: the built-in songs are in the mix" : "Off: only the songs you added"}</small>`
          : `<b>Practice</b><small>No health bar, nothing saved</small>`;
      }
    }
    const on = k === "practice" ? (s.endless ? baseOn : practice) : mods[k];
    b.setAttribute("aria-pressed", on ? "true" : "false");
    b.disabled = (practice && (k === "sd" || k === "dt")) || (k === "practice" && !!s.endless && !hasMine);
  });
  $("pracOpts").hidden = !practice;
  const max = Math.max(0, Math.floor(s.duration - 10));
  $("pracStart").max = max; pracStartAt = Math.min(pracStartAt, max); $("pracStart").value = pracStartAt;
  $("pracStartVal").textContent = fmtTime(pracStartAt);
  $("pracSpeed").querySelectorAll("button").forEach(b => b.classList.toggle("on", +b.dataset.v === pracSpeed));
  const n = modNames(mods).length + (practice ? 1 : 0) + (s.endless && !baseOn ? 1 : 0), mult = modMult(mods);
  $("modLabel").textContent = n ? `Modifiers \u00B7 ${n}` : "Modifiers";
  $("modBtn").classList.toggle("active", n > 0);
  $("modNote").textContent = s.endless && !baseOn ? `Endless plays only your ${endlessPool().length} added song${endlessPool().length === 1 ? "" : "s"}.` + (modNames(mods).length ? ` Coins \u00D7${mult.toFixed(2)}.` : "")
    : practice ? "Practice: any difficulty, no health bar, and nothing is saved (no coins, scores or stats)."
    : n ? `Coins \u00D7${mult.toFixed(2)} for this run. Scores still count toward your best.` : "Harder modifiers earn more coins. No Flip makes songs easier for a little less.";
}

function toggleModPanel(open) {
  const on = open === undefined ? $("modPanel").hidden : open;
  $("modPanel").hidden = !on; $("modBtn").setAttribute("aria-expanded", on ? "true" : "false");
}

function togglePractice() { practice = !practice; syncPractice(); }
$("modBtn").addEventListener("click", () => toggleModPanel());

$("modPanel").querySelectorAll(".mod").forEach(b => b.addEventListener("click", () => {
  const k = b.dataset.m, sel = SONGS[selIdx];
  if (k === "practice" && sel && sel.endless) {   // Base songs on/off for Endless
    settings.endlessBase = endlessBaseOff() ? true : false; saveSettings();
    syncPractice(); endlessCycle(true); return;
  }
  if (k === "practice") practice = !practice; else { mods[k] = !mods[k]; saveMods(); }
  syncPractice();
}));

$("pracSpeed").querySelectorAll("button").forEach(b => b.addEventListener("click", () => { pracSpeed = +b.dataset.v; syncPractice(); }));
$("pracStart").addEventListener("input", (e) => { pracStartAt = +e.target.value; syncPractice(); });

function syncDeleteBtn() {
  const s = SONGS[selIdx], b = $("delSong");
  b.hidden = !(s && s.custom);
  delete b.dataset.armed; b.classList.remove("armed"); b.textContent = "Delete this song";
}

$("delSong").addEventListener("click", () => {
  const b = $("delSong"), s = SONGS[selIdx];
  if (!s || !s.custom) return;
  if (b.dataset.armed) { clearTimeout(+b.dataset.t); deleteCustomSong(s.id); return; }
  b.dataset.armed = "1"; b.textContent = "Click again to delete"; b.classList.add("armed");
  b.dataset.t = setTimeout(syncDeleteBtn, 3500);
});
