/*
 * LALI-O - tools/build-charts.js
 * Remakes the built-in maps in charts.js with the same map maker the game uses (js/maps/mapmaker.js).
 * Each song keeps its stored tempo, first beat and board flips; only the notes are remade.
 *
 *   node tools/build-charts.js            all songs
 *   node tools/build-charts.js spin bob   just these
 *
 * Needs ffmpeg (to decode the mp3s). The Test Track is left alone.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const GEN = require("../js/maps/mapmaker.js");

const ROOT = path.join(__dirname, "..");
const CHARTS = path.join(ROOT, "charts.js");

function readCharts() {
  const txt = fs.readFileSync(CHARTS, "utf8");
  return JSON.parse(txt.slice(txt.indexOf("=") + 1).trim().replace(/;$/, ""));
}

// decode an mp3 into something shaped like a Web Audio AudioBuffer
function decode(file) {
  const raw = execFileSync("ffmpeg", ["-v", "quiet", "-i", file, "-f", "f32le", "-ac", "2", "-ar", "44100", "-"], { maxBuffer: 1 << 30 });
  const f = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4), n = f.length / 2;
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { L[i] = f[2 * i]; R[i] = f[2 * i + 1]; }
  return { sampleRate: 44100, length: n, duration: n / 44100, numberOfChannels: 2, getChannelData: c => (c ? R : L) };
}

(async () => {
  const data = readCharts(), only = process.argv.slice(2), report = {};
  for (const song of data.songs) {
    if (song.id === "test" || (only.length && !only.includes(song.id))) continue;
    const buf = decode(path.join(ROOT, song.file));
    const out = await GEN.analyze(buf, () => {}, { tempo: { bpm: song.bpm, beat0: song.beat0 }, choruses: song.choruses });
    const before = Object.fromEntries(Object.entries(song.charts).map(([d, c]) => [d, c.length]));
    song.charts = out.charts;
    const styles = {};
    for (const [, s] of out.phrases) styles[s] = (styles[s] || 0) + 1;
    report[song.id] = out.phrases;
    console.log(song.id.padEnd(11), Object.keys(out.charts).map(d => `${d.slice(0, 2)} ${before[d]}->${out.charts[d].length}`).join("  "), " phrases:", JSON.stringify(styles));
  }
  fs.writeFileSync(CHARTS, "window.CHARTS = " + JSON.stringify(data) + ";\n");
  if (process.env.REPORT) fs.writeFileSync(process.env.REPORT, JSON.stringify(report));
})();
