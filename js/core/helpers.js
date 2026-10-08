/*
 * LALI-O - core/helpers.js
 * Small shared helpers (maths, formatting, colours).
 */
"use strict";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const pad7 = (n) => String(Math.round(n)).padStart(7, "0");

function pulseAt(t, beat0, period) {
  let f = ((t - beat0) / period) % 1; if (f < 0) f += 1;
  return Math.exp(-f * 5);
}

function flipAt(t, ch) {
  let v = 0;
  for (const [s, e] of ch) v = Math.max(v, sm((t - (s - 0.7)) / 0.6) - sm((t - (e - 0.7)) / 0.6));
  return v;
}

const inChorus = (t, ch) => ch.some(([s, e]) => t >= s && t < e);

function mix(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgb(${Math.round(r + (255 - r) * amt)},${Math.round(g + (255 - g) * amt)},${Math.round(b + (255 - b) * amt)})`;
}

function blendHex(a, b, k) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (sh) => Math.round(((pa >> sh) & 255) * (1 - k) + ((pb >> sh) & 255) * k);
  return "#" + [16, 8, 0].map(sh => ch(sh).toString(16).padStart(2, "0")).join("");
}

function rrect(g, x, y, w, h, r) {
  g.beginPath();
  if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h);
}
