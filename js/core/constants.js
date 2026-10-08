/*
 * LALI-O - core/constants.js
 * Song list, difficulty names, lane colours, timing windows and judgements, Endless helpers.
 */
"use strict";

const DATA = window.CHARTS;
const SONGS = DATA.songs;

// Endless: a special entry at the top of the song list. Random songs back to back on one health bar.
const ENDLESS = { id: "endless", endless: true, title: "Endless", artist: "Random songs back to back until you run out of health",
  bpm: 120, beat0: 0, duration: 600, choruses: [], preview: 0, charts: { easy: [], medium: [], hard: [], extreme: [] } };

const endlessAll = () => SONGS.filter(s => !s.endless && !s.tutorial && !s.noMiss && !s.id.startsWith("test"));

// "Base songs" off (in Modifiers while Endless is picked): only the songs you added. With none added, the built-in ones are used.
const endlessBaseOff = () => settings.endlessBase === false && SONGS.some(s => s.custom);
const endlessPool = () => { const all = endlessAll(); return endlessBaseOff() ? all.filter(s => s.custom) : all; };
let endlessShowId = null, endlessShowAt = 0;
function endlessShown() { const p = endlessPool(); return p.find(x => x.id === endlessShowId) || p[0]; }

// the preview on the song list cycles through the songs Endless can pick
function endlessCycle(force) {
  const p = endlessPool(); if (!p.length) return;
  if (!force && performance.now() - endlessShowAt < 9000) return;   // (also stops it re-picking while a switch is still fading)
  let next = p[Math.floor(Math.random() * p.length)];
  if (p.length > 1) while (next.id === endlessShowId) next = p[Math.floor(Math.random() * p.length)];
  endlessShowAt = performance.now();
  const apply = () => { endlessShowId = next.id; if (SONGS[selIdx] && SONGS[selIdx].endless) $("selMeta").textContent = `Endless \u00B7 now previewing ${next.title}`; };
  if (screen === "select" && SONGS[selIdx] && SONGS[selIdx].endless) switchPreview(next, force && !previewSong ? 0 : 650, apply);
  else apply();
}

// "Endless" (or any label) as moving rainbow letters, the same as the best score
function rainbowHTML(label, px) {
  const speed = 200 / 3, charW = px * 0.6;
  return `<span class="rb" aria-label="${label}">` + [...label].map((c, i) =>
    `<i data-c="${c}" style="--d:${(-(3 - ((i * charW / speed) % 3))).toFixed(3)}s;--w:${(i * 0.09).toFixed(2)}s">${c === " " ? "\u00A0" : c}</i>`).join("") + "</span>";
}

const ENDLESS_BEST = () => store.get("endlessBest", {});
const DIFFS = ["easy", "medium", "hard", "extreme"];
const DIFF_LABEL = { easy: "Easy", medium: "Medium", hard: "Hard", extreme: "Extreme" };
const LANE = ["#FF4F79", "#FFB547", "#4FE3C1", "#5B8CFF"];
const WIN = { perfect: 0.045, great: 0.08, good: 0.115, bad: 0.15 };

const J = {
  perfect: { label: "PERFECT", score: 1, acc: 1, color: "#8FF7FF" },
  great: { label: "GREAT", score: 0.8, acc: 0.85, color: "#4FE3C1" },
  good: { label: "GOOD", score: 0.5, acc: 0.6, color: "#FFB547" },
  bad: { label: "BAD", score: 0.2, acc: 0.25, color: "#FF8A5B" },
  miss: { label: "MISS", score: 0, acc: 0, color: "#FF4F79" },
};

const $ = (id) => document.getElementById(id);
