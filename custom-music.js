/*
 * LALI-O - audio/custom-music.js
 * Choosing your own menu, pause and Game Over music.
 */
"use strict";

const MUSIC_UI = {
  menu: { title: "Main menu music", desc: "Plays on the main menu, in settings, the Store, Inventory and on the results screen. A random one is picked each time the menu comes up, and the logo and the lines in the background pulse to its beat." },
  pause: { title: "Pause music", desc: "Plays while a song is paused. A random one is picked each time you pause." },
  gameover: { title: "Game Over music", desc: "Plays on the Game Over screen. A random one is picked each time." },
};

const musicBusy = { menu: false, pause: false, gameover: false };
const escHtml = (t) => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function buildMusicSets() {
  $("musicSets").innerHTML = MUSIC_KINDS.map(w => `
    <div class="set" id="ms-${w}">
      <h3>${MUSIC_UI[w].title}</h3>
      <p>${MUSIC_UI[w].desc} Only this save uses these.</p>
      <div class="seg" role="radiogroup" aria-label="${MUSIC_UI[w].title}">
        <button data-mode="default" role="radio">Default: ${DEFAULT_MUSIC[w].name}</button><button data-mode="custom" role="radio">My MP3s (<span class="mcount">0</span>)</button>
      </div>
      <div class="row"><button class="small-btn madd">Add MP3s</button><input type="file" class="mfile" accept="audio/*,.mp3" multiple hidden></div>
      <p class="musicNow mstatus"></p>
      <ul class="mlist"></ul>
    </div>`).join("");
  for (const w of MUSIC_KINDS) {
    const box = $("ms-" + w);
    box.querySelectorAll(".seg button").forEach(b => b.addEventListener("click", () => setMusicMode(w, b.dataset.mode)));
    box.querySelector(".madd").addEventListener("click", () => box.querySelector(".mfile").click());
    box.querySelector(".mfile").addEventListener("change", (e) => { const fs = [...e.target.files]; e.target.value = ""; addMusicFiles(w, fs); });
  }
}

function renderMusicLists() {
  for (const w of MUSIC_KINDS) {
    const box = $("ms-" + w); if (!box) continue;
    const mode = musicMode(w), list = MUSICLIST[w];
    box.querySelectorAll(".seg button").forEach(b => { const on = b.dataset.mode === mode; b.classList.toggle("on", on); b.setAttribute("aria-checked", on); });
    box.querySelector('.seg [data-mode="custom"]').disabled = !list.length;
    box.querySelector(".mcount").textContent = list.length;
    box.querySelector(".madd").disabled = musicBusy[w];
    if (!musicBusy[w]) box.querySelector(".mstatus").textContent = !list.length ? "Add MP3s to make your own list. You can pick more than one at a time."
      : mode === "custom" ? `Playing a random one of your ${list.length} MP3${list.length > 1 ? "s" : ""}.` : `Playing the default. Your MP3s are kept, so you can switch back any time.`;
    const ul = box.querySelector(".mlist"), playingId = (w === menuKind && menuPlaying && menuTrack) ? menuTrack.id : null;
    ul.innerHTML = list.map(t => `<li data-id="${t.id}" class="${t.id === playingId ? "now" : ""}"><span title="${escHtml(t.name)}">${escHtml(t.name)}</span><button class="mdel" aria-label="Delete ${escHtml(t.name)}">Delete</button></li>`).join("");
    ul.querySelectorAll(".mdel").forEach(btn => btn.addEventListener("click", () => {
      if (!btn.classList.contains("sure")) { btn.classList.add("sure"); btn.textContent = "Delete?"; setTimeout(() => { if (btn.isConnected) { btn.classList.remove("sure"); btn.textContent = "Delete"; } }, 3000); return; }
      deleteMusic(w, btn.parentElement.dataset.id);
    }));
  }
}

function setMusicMode(w, mode) {
  if (mode === "custom" && !MUSICLIST[w].length) return;
  settings.music = Object.assign({}, settings.music, { [w]: mode }); saveSettings();
  renderMusicLists(); refreshMenuMusic(w);
}

async function addMusicFiles(w, files) {
  if (!files.length || musicBusy[w]) return;
  initAudio();
  musicBusy[w] = true; renderMusicLists();
  const status = (t) => { const el = $("ms-" + w); if (el) el.querySelector(".mstatus").textContent = t; };
  const wasEmpty = !MUSICLIST[w].length, problems = [];
  let added = 0, unsaved = false;
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i], name = file.name.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").trim() || "My music";
      const tag = files.length > 1 ? `Adding ${i + 1} of ${files.length}: ${name}` : `Adding ${name}`;
      status(tag + "\u2026");
      let buf;
      let copy;   // our own copy of the bytes, so moving or deleting the original file later doesn't break it
      try { const ab = await file.arrayBuffer(); copy = new Blob([ab], { type: file.type || "audio/mpeg" }); buf = await decode(ab); } catch (e) { problems.push(`${name} couldn't be read`); continue; }
      if (buf.duration < 10) { problems.push(`${name} is too short`); continue; }
      // find its beat (for the logo and background pulse) and loudness (so it matches the other music)
      const data = await GEN.analyze(buf, (label, f) => status(`${tag} \u2014 finding the beat ${Math.round(clamp(f || 0, 0, 1) * 100)}%`), { tempoOnly: true });
      const rec = { id: "mus-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), kind: "music", which: w, acct: ACCT, name, blob: copy,
        bpm: data.bpm, beat0: data.beat0, gain: +Math.pow(10, clamp(GEN.TARGET_LUFS - data.lufs, -15, 15) / 20).toFixed(4), added: Date.now() };
      try { await SONGDB.put(rec); } catch (e) { unsaved = true; }
      MUSICLIST[w].push(rec); added++;
      if (wasEmpty && added === 1) settings.music = Object.assign({}, settings.music, { [w]: "custom" }), saveSettings();   // your first MP3 switches the list on
      renderMusicLists();
    }
  } finally {
    musicBusy[w] = false; renderMusicLists();
    const msg = [];
    if (added) msg.push(`Added ${added} MP3${added > 1 ? "s" : ""}.`);
    if (problems.length) msg.push(problems.join(", ") + ".");
    if (unsaved) msg.push("This browser wouldn't save them, so they'll be gone when you close the game.");
    if (msg.length) status(msg.join(" "));
    refreshMenuMusic(w);
  }
}

async function deleteMusic(w, id) {
  const i = MUSICLIST[w].findIndex(t => t.id === id); if (i < 0) return;
  MUSICLIST[w].splice(i, 1); decodedMusic.delete(id); trackPos.delete(id);
  try { await SONGDB.del(id); } catch (e) {}
  renderMusicLists(); refreshMenuMusic(w);
}

async function loadMusicLists() {
  let recs = [];
  try { recs = await SONGDB.music(); } catch (e) { return; }
  recs.sort((a, b) => (a.added || 0) - (b.added || 0));
  for (const r of recs) {
    if (!r.blob || !MUSICLIST[r.which]) continue;
    // one-track music from the earlier version: give it a list id and keep it switched on
    if (r.id.startsWith("music-")) {
      const old = r.id; r.id = "mus-" + (r.added || Date.now()).toString(36) + r.which;
      try { await SONGDB.put(r); await SONGDB.del(old); } catch (e) {}
      settings.music = Object.assign({}, settings.music, { [r.which]: "custom" }); saveSettings();
    }
    if (!MUSICLIST[r.which].some(t => t.id === r.id)) MUSICLIST[r.which].push(r);
  }
  renderMusicLists();
  // if the menu started on the default before your list had loaded, switch to your music
  if (musicMode("menu") === "custom" && menuKind === "menu") refreshMenuMusic("menu");
  if (!actx && musicMode("menu") === "custom") prewarmMenu();   // not started yet: load one of your own MP3s in advance instead
}

buildMusicSets(); renderMusicLists(); loadMusicLists();
