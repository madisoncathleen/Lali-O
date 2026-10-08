/*
 * LALI-O - render/notes.js
 * Drawing note shapes, trails and hit effects.
 */
"use strict";

function shapePath(g, shape, x, yc, w, h, dir, lane = 0) {
  shape = baseShape(shape);
  const y0 = yc - h / 2, y1 = yc + h / 2;
  const rr = (X, Y, W, Hh, r) => { if (g.roundRect) g.roundRect(X, Y, W, Hh, r); else g.rect(X, Y, W, Hh); };
  g.beginPath();
  switch (shape) {
    case "pill": rr(x, y0, w, h, h / 2); break;
    case "block": g.rect(x, y0, w, h); break;
    case "hex": { const p = Math.min(h * 0.6, w / 4);
      g.moveTo(x, yc); g.lineTo(x + p, y0); g.lineTo(x + w - p, y0); g.lineTo(x + w, yc); g.lineTo(x + w - p, y1); g.lineTo(x + p, y1); g.closePath(); break; }
    case "chevron": {   // a V that points the way the note is travelling
      const d = h * 0.45, xm = x + w / 2, Yf = (v) => dir > 0 ? v : 2 * yc - v;
      g.moveTo(x, Yf(y0)); g.lineTo(xm, Yf(y0 + d)); g.lineTo(x + w, Yf(y0)); g.lineTo(x + w, Yf(y1 - d)); g.lineTo(xm, Yf(y1)); g.lineTo(x, Yf(y1 - d)); g.closePath(); break; }
    case "split": { const gw = Math.max(3, w * 0.08), hw = (w - gw) / 2, r = Math.min(3, h / 2); rr(x, y0, hw, h, r); rr(x + hw + gw, y0, hw, h, r); break; }
    case "diamonds": for (let k = 0; k < 3; k++) {
      const cx = x + w * (k * 2 + 1) / 6, rx = Math.min(w / 6 * 0.92, h * 1.1), ry = h * 0.62;
      g.moveTo(cx, yc - ry); g.lineTo(cx + rx, yc); g.lineTo(cx, yc + ry); g.lineTo(cx - rx, yc); g.closePath(); } break;
    case "orbs": { const n = 4, r = Math.min(h * 0.62, w / (n * 2) * 0.95);
      for (let k = 0; k < n; k++) { const cx = x + w * (k * 2 + 1) / (n * 2); g.moveTo(cx + r, yc); g.arc(cx, yc, r, 0, Math.PI * 2); } break; }
    case "slant": { const sk = Math.min(h * 0.7, w / 4);
      g.moveTo(x + sk, y0); g.lineTo(x + w, y0); g.lineTo(x + w - sk, y1); g.lineTo(x, y1); g.closePath(); break; }
    case "ticket": { const r = h * 0.34;
      g.moveTo(x, y0); g.lineTo(x + w, y0); g.lineTo(x + w, yc - r); g.arc(x + w, yc, r, -Math.PI / 2, Math.PI / 2, true);
      g.lineTo(x + w, y1); g.lineTo(x, y1); g.lineTo(x, yc + r); g.arc(x, yc, r, Math.PI / 2, -Math.PI / 2, true); g.closePath(); break; }
    case "crystal":
      g.moveTo(x, yc); g.lineTo(x + w / 2, y0 - h * 0.12); g.lineTo(x + w, yc); g.lineTo(x + w / 2, y1 + h * 0.12); g.closePath(); break;
    case "brackets": { const b = w * 0.26, t = Math.max(2.5, h * 0.26);
      g.moveTo(x + b, y0); g.lineTo(x, y0); g.lineTo(x, y1); g.lineTo(x + b, y1); g.lineTo(x + b, y1 - t); g.lineTo(x + t, y1 - t); g.lineTo(x + t, y0 + t); g.lineTo(x + b, y0 + t); g.closePath();
      const X = x + w;
      g.moveTo(X - b, y0); g.lineTo(X, y0); g.lineTo(X, y1); g.lineTo(X - b, y1); g.lineTo(X - b, y1 - t); g.lineTo(X - t, y1 - t); g.lineTo(X - t, y0 + t); g.lineTo(X - b, y0 + t); g.closePath();
      const dr = Math.min(h * 0.3, w * 0.08); g.moveTo(x + w / 2 + dr, yc); g.arc(x + w / 2, yc, dr, 0, Math.PI * 2); break; }
    case "wave": { const N = 28, amp = h * 0.36, th = h - amp, top = (i) => y0 + amp * 0.5 * (1 + Math.sin(i / N * Math.PI * 4));
      g.moveTo(x, top(0));
      for (let i = 1; i <= N; i++) g.lineTo(x + w * i / N, top(i));
      for (let i = N; i >= 0; i--) g.lineTo(x + w * i / N, top(i) + th);
      g.closePath(); break; }
    case "stars": for (let k = 0; k < 3; k++) {
      const cx = x + w * (k * 2 + 1) / 6, R = Math.min(w / 6 * 0.95, h * 0.78), r = R * 0.45;
      for (let i = 0; i < 10; i++) { const rr2 = i % 2 ? r : R, a = -Math.PI / 2 + i * Math.PI / 5; const px = cx + Math.cos(a) * rr2, py = yc + Math.sin(a) * rr2 + R * 0.08; i ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.closePath(); } break;
    case "hearts": for (let k = 0; k < 3; k++) {
      const cx = x + w * (k * 2 + 1) / 6, s2 = Math.min(w / 6 * 0.78, h * 0.82), cy = yc + s2 * 0.08;
      g.moveTo(cx, cy + s2 * 0.85);
      g.bezierCurveTo(cx - s2 * 1.3, cy + s2 * 0.05, cx - s2 * 0.95, cy - s2 * 1.0, cx, cy - s2 * 0.38);
      g.bezierCurveTo(cx + s2 * 0.95, cy - s2 * 1.0, cx + s2 * 1.3, cy + s2 * 0.05, cx, cy + s2 * 0.85);
      g.closePath(); } break;
    case "bolt": { const P = [0.5, 0.05, 0.95, 0.05, 0.95, 0.5], t = h * 0.42, Yc = (v) => y0 + t / 2 + (h - t) * v;
      g.moveTo(x, Yc(P[0]) - t / 2);
      P.forEach((v, i) => g.lineTo(x + w * i / (P.length - 1), Yc(v) - t / 2));
      for (let i = P.length - 1; i >= 0; i--) g.lineTo(x + w * i / (P.length - 1), Yc(P[i]) + t / 2);
      g.closePath(); break; }
    // single-shape versions: one larger shape in the middle of the lane
    case "orb": { const r = Math.min(w * 0.3, h * 0.85); g.moveTo(x + w / 2 + r, yc); g.arc(x + w / 2, yc, r, 0, Math.PI * 2); break; }
    case "diamond": { const cx = x + w / 2, rx = Math.min(w * 0.36, h * 1.9), ry = h * 0.8;
      g.moveTo(cx, yc - ry); g.lineTo(cx + rx, yc); g.lineTo(cx, yc + ry); g.lineTo(cx - rx, yc); g.closePath(); break; }
    case "star": { const cx = x + w / 2, R = Math.min(w * 0.34, h * 1.05), r = R * 0.45;
      for (let i = 0; i < 10; i++) { const rr2 = i % 2 ? r : R, a = -Math.PI / 2 + i * Math.PI / 5; const px = cx + Math.cos(a) * rr2, py = yc + Math.sin(a) * rr2 + R * 0.08; i ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.closePath(); break; }
    case "heart": { const cx = x + w / 2, s2 = Math.min(w * 0.3, h * 1.0), cy = yc + s2 * 0.08;
      g.moveTo(cx, cy + s2 * 0.85);
      g.bezierCurveTo(cx - s2 * 1.3, cy + s2 * 0.05, cx - s2 * 0.95, cy - s2 * 1.0, cx, cy - s2 * 0.38);
      g.bezierCurveTo(cx + s2 * 0.95, cy - s2 * 1.0, cx + s2 * 1.3, cy + s2 * 0.05, cx, cy + s2 * 0.85);
      g.closePath(); break; }
    // single-piece versions: one bigger shape centred in the lane
    case "orb1": { const r = Math.min(w / 2 * 0.9, h * 0.8); g.moveTo(x + w / 2 + r, yc); g.arc(x + w / 2, yc, r, 0, Math.PI * 2); break; }
    case "diamond1": { const cx = x + w / 2, rx = Math.min(w / 2 * 0.9, h * 1.4), ry = h * 0.85;
      g.moveTo(cx, yc - ry); g.lineTo(cx + rx, yc); g.lineTo(cx, yc + ry); g.lineTo(cx - rx, yc); g.closePath(); break; }
    case "star1": { const cx = x + w / 2, R = Math.min(w / 2 * 0.9, h * 1.05), r = R * 0.45;
      for (let i = 0; i < 10; i++) { const rr2 = i % 2 ? r : R, a = -Math.PI / 2 + i * Math.PI / 5; const px = cx + Math.cos(a) * rr2, py = yc + Math.sin(a) * rr2 + R * 0.08; i ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.closePath(); break; }
    case "heart1": { const cx = x + w / 2, s2 = Math.min(w / 2 * 0.7, h * 0.95), cy = yc + s2 * 0.08;
      g.moveTo(cx, cy + s2 * 0.85);
      g.bezierCurveTo(cx - s2 * 1.3, cy + s2 * 0.05, cx - s2 * 0.95, cy - s2 * 1.0, cx, cy - s2 * 0.38);
      g.bezierCurveTo(cx + s2 * 0.95, cy - s2 * 1.0, cx + s2 * 1.3, cy + s2 * 0.05, cx, cy + s2 * 0.85);
      g.closePath(); break; }
    case "arrows": {   // arcade arrows: lane 1 left, 2 down, 3 up, 4 right
      const S = Math.min(w / 2 * 0.92, h * 1.3), cx = x + w / 2, ang = [-Math.PI / 2, Math.PI, 0, Math.PI / 2][lane] || 0;
      const P = [[0, -1], [0.95, -0.02], [0.42, -0.02], [0.42, 0.92], [-0.42, 0.92], [-0.42, -0.02], [-0.95, -0.02]];   // pointing up
      const ca = Math.cos(ang), sa = Math.sin(ang);
      P.forEach(([px, py], i) => { const X = cx + (px * ca - py * sa) * S, Y = yc + (px * sa + py * ca) * S; i ? g.lineTo(X, Y) : g.moveTo(X, Y); });
      g.closePath(); break; }
    case "tri": { const cx = x + w / 2, R = Math.min(w * 0.4, h * 1.25);
      g.moveTo(cx, yc + dir * R * 0.8); g.lineTo(cx + R, yc - dir * R * 0.62); g.lineTo(cx - R, yc - dir * R * 0.62); g.closePath(); break; }
    case "ring1": { const cx = x + w / 2, r = Math.min(w * 0.4, h * 0.95), ri = r * 0.55;
      g.moveTo(cx + r, yc); g.arc(cx, yc, r, 0, Math.PI * 2); g.moveTo(cx + ri, yc); g.arc(cx, yc, ri, 0, Math.PI * 2, true); break; }
    case "cross1": { const cx = x + w / 2, S = Math.min(w * 0.4, h * 1.1), t = S * 0.38;
      [[-t, -S], [t, -S], [t, -t], [S, -t], [S, t], [t, t], [t, S], [-t, S], [-t, t], [-S, t], [-S, -t], [-t, -t]].forEach(([px, py], i) => i ? g.lineTo(cx + px, yc + py) : g.moveTo(cx + px, yc + py));
      g.closePath(); break; }
    case "hex1": { const cx = x + w / 2, r = Math.min(w * 0.42, h * 1.0);
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; i ? g.lineTo(cx + r * Math.cos(a), yc + r * Math.sin(a) * 0.9) : g.moveTo(cx + r, yc); } g.closePath(); break; }
    case "oct": { const c = Math.min(h * 0.45, w / 4);
      g.moveTo(x + c, y0); g.lineTo(x + w - c, y0); g.lineTo(x + w, y0 + c); g.lineTo(x + w, y1 - c); g.lineTo(x + w - c, y1); g.lineTo(x + c, y1); g.lineTo(x, y1 - c); g.lineTo(x, y0 + c); g.closePath(); break; }
    case "shard": g.moveTo(x, yc + h * 0.15); g.lineTo(x + w * 0.72, y0); g.lineTo(x + w, yc - h * 0.15); g.lineTo(x + w * 0.28, y1); g.closePath(); break;
    case "twin": { const bh = h * 0.36, r = Math.min(2, bh / 2); rr(x, y0, w, bh, r); rr(x, y1 - bh, w, bh, r); break; }
    case "dash": { const dh = h * 0.42; rr(x + w * 0.075, yc - dh / 2, w * 0.85, dh, dh / 2); break; }
    case "petal1": { const cx = x + w / 2, r = Math.min(w * 0.42, h * 1.4);
      g.moveTo(cx - r, yc); g.quadraticCurveTo(cx, yc - r * 0.9, cx + r, yc); g.quadraticCurveTo(cx, yc + r * 0.9, cx - r, yc); g.closePath(); break; }
    case "square1": { const S2 = Math.min(w * 0.5, h * 1.5); rr(x + w / 2 - S2 / 2, yc - S2 / 2, S2, S2, S2 * 0.22); break; }
    case "moon1": { const cx = x + w / 2, r = Math.min(w * 0.36, h * 1.0);
      g.arc(cx, yc, r, 0.924, 5.359, false); g.arc(cx + 0.55 * r, yc, 0.8 * r, -1.505, 1.505, true); g.closePath(); break; }
    default: rr(x, y0, w, h, Math.min(3, h / 2));   // bar, hollow
  }
}

const FIXED_ASPECT0 = new Set(["orbs", "orb1", "diamonds", "diamond1", "stars", "star1", "hearts", "heart1", "crystal", "arrows", "tri", "ring1", "cross1", "hex1", "petal1", "square1", "moon1"]);
const FIXED_ASPECT = new Set([...FIXED_ASPECT0, ...Object.keys(SHAPE_BASE).filter(id => FIXED_ASPECT0.has(SHAPE_BASE[id]))]);

// where a long note's tail runs for each shape: [left, width] strips that match the shape's footprint,
// so the tail lines up with the head and end marker instead of sticking out past them
function tailSegs(shape, x, w, h) {
  shape = baseShape(shape);
  const at = (cx, sw) => [cx - sw / 2, sw];
  const row = (n, sw) => Array.from({ length: n }, (_, k) => at(x + w * (k * 2 + 1) / (n * 2), sw));
  switch (shape) {
    case "orbs": return row(4, Math.min(h * 0.62, w / 8 * 0.95) * 1.5);
    case "diamonds": return row(3, Math.min(w / 6 * 0.92, h * 1.1) * 0.7);
    case "stars": return row(3, Math.min(w / 6 * 0.95, h * 0.78) * 0.9);
    case "hearts": return row(3, Math.min(w / 6 * 0.78, h * 0.82) * 1.1);
    case "orb1": return [at(x + w / 2, Math.min(w / 2 * 0.9, h * 0.8) * 1.5)];
    case "diamond1": return [at(x + w / 2, Math.min(w / 2 * 0.9, h * 1.4) * 0.7)];
    case "star1": return [at(x + w / 2, Math.min(w / 2 * 0.9, h * 1.05) * 0.9)];
    case "heart1": return [at(x + w / 2, Math.min(w / 2 * 0.7, h * 0.95) * 1.1)];
    case "split": { const gw = Math.max(3, w * 0.08), hw = (w - gw) / 2; return [[x, hw], [x + hw + gw, hw]]; }
    case "crystal": return [at(x + w / 2, w * 0.36)];
    case "hex": { const p = Math.min(h * 0.6, w / 4); return [[x + p * 0.5, w - p]]; }
    case "brackets": return [[x + w * 0.04, w * 0.92]];
    case "arrows": return [[x + w / 2 - Math.min(w / 2 * 0.92, h * 1.3) * 0.42, Math.min(w / 2 * 0.92, h * 1.3) * 0.84]];
    case "slant": { const sk = Math.min(h * 0.7, w / 4); return [[x + sk * 0.5, w - sk]]; }
    case "ticket": { const r = h * 0.34; return [[x + r, w - 2 * r]]; }
    case "tri": return [at(x + w / 2, Math.min(w * 0.4, h * 1.25) * 0.6)];
    case "ring1": return [at(x + w / 2, Math.min(w * 0.4, h * 0.95) * 1.1)];
    case "cross1": return [at(x + w / 2, Math.min(w * 0.4, h * 1.1) * 0.76)];
    case "hex1": return [at(x + w / 2, Math.min(w * 0.42, h * 1.0) * 1.1)];
    case "petal1": return [at(x + w / 2, Math.min(w * 0.42, h * 1.4) * 0.6)];
    case "square1": return [at(x + w / 2, Math.min(w * 0.5, h * 1.5) * 0.7)];
    case "moon1": return [at(x + w / 2 - Math.min(w * 0.36, h) * 0.3, Math.min(w * 0.36, h) * 0.8)];
    case "dash": return [[x + w * 0.075, w * 0.85]];
    default: return [[x, w]];
  }
}

// fill + optional outline (line = null means no separate outline)
function paintNote(g, shape, x, yc, w, h, dir, fill, line, lw, shine, lane = 0) {
  if (baseShape(shape) === "arrows") g.lineJoin = "round";
  shapePath(g, shape, x, yc, w, h, dir, lane);
  if (isHollowShape(shape)) {
    const a = g.globalAlpha;
    g.globalAlpha = a * 0.22; g.fillStyle = fill; g.fill(); g.globalAlpha = a;
    g.lineWidth = lw * 1.6; g.strokeStyle = fill; g.stroke();
    if (line) { g.lineWidth = Math.max(1, lw * 0.6); g.strokeStyle = line; g.stroke(); }
    return;
  }
  g.fillStyle = fill; g.fill();
  if (line) { const sb = g.shadowBlur; g.shadowBlur = 0; g.lineWidth = lw; g.strokeStyle = line; g.stroke(); g.shadowBlur = sb; }
  if (shine && (shape === "bar" || shape === "pill" || shape === "block")) { g.fillStyle = "rgba(255,255,255,0.45)"; g.fillRect(x + 3, yc - h / 2 + 2, w - 6, 2); }
}

const rnd = (s, i) => { const v = Math.sin(s * 12.9898 + i * 78.233) * 43758.5453; return v - Math.floor(v); };

const EFFECT_MS = { ring: 260, burst: 420, shock: 380, beam: 320, sparks: 360, pixels: 520, star: 440, confetti: 700,
  ripple: 560, bubbles: 700, hearts: 720, petals: 520, flame: 480, zap: 300, glitch: 360, nova: 520 };

function heartAt(g, cx, cy, s) {
  g.moveTo(cx, cy + s * 0.85);
  g.bezierCurveTo(cx - s * 1.3, cy + s * 0.05, cx - s * 0.95, cy - s, cx, cy - s * 0.38);
  g.bezierCurveTo(cx + s * 0.95, cy - s, cx + s * 1.3, cy + s * 0.05, cx, cy + s * 0.85);
}

// away = direction toward the incoming notes (-1 up, +1 down); sc scales for small previews
function drawEffect(g, type, e, now, cx, cy, nw, nh, away, sc) {
  const ED = EFFECT_BY[type];
  if (ED && ED.base) { if (ED.tint) e = Object.assign({}, e, { color: ED.tint }); type = ED.base; }   // one-colour versions of a base effect
  const k = (now - e.at) / (EFFECT_MS[type] || 300);
  if (k < 0 || k > 1) return;
  const ek = 1 - (1 - k) * (1 - k);
  g.save();
  g.strokeStyle = g.fillStyle = e.color;
  switch (type) {
    case "burst":
      for (let i = 0; i < 10; i++) {
        const a = rnd(e.seed, i) * Math.PI * 2, d = (10 + 46 * rnd(e.seed, i + 20)) * ek * sc;
        g.globalAlpha = 1 - k; g.beginPath(); g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, (3.2 * (1 - k) + 0.8) * sc, 0, 6.2832); g.fill();
      } break;
    case "shock":
      g.globalAlpha = (1 - k) * 0.9; g.lineWidth = (3.5 * (1 - k) + 0.5) * sc;
      g.beginPath(); g.ellipse(cx, cy, (8 + 70 * ek) * sc, (6 + 40 * ek) * sc, 0, 0, 6.2832); g.stroke();
      if (k > 0.15) { const k2 = (k - 0.15) / 0.85; g.globalAlpha = (1 - k2) * 0.5; g.beginPath(); g.ellipse(cx, cy, (6 + 44 * k2) * sc, (4 + 26 * k2) * sc, 0, 0, 6.2832); g.stroke(); }
      break;
    case "beam": {
      const len = 240 * sc * (0.6 + 0.4 * ek), gr = g.createLinearGradient(0, cy, 0, cy + away * len);
      gr.addColorStop(0, e.color); gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.globalAlpha = (1 - k) * 0.55;
      const bw = nw * (1 - 0.4 * k); g.fillRect(cx - bw / 2, away > 0 ? cy : cy - len, bw, len); break; }
    case "sparks":
      g.lineWidth = 2 * sc; g.globalAlpha = 1 - k; g.lineCap = "round";
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * 6.2832 + rnd(e.seed, i) * 0.4, r0 = (6 + 34 * ek) * sc, r1 = r0 + 16 * (1 - k) * sc;
        g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.75); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.75); g.stroke();
      } break;
    case "pixels":
      for (let i = 0; i < 12; i++) {
        const vx = (rnd(e.seed, i) - 0.5) * 2, vy = 0.6 + rnd(e.seed, i + 40) * 0.8, s = (3 + 3 * rnd(e.seed, i + 80)) * sc;
        const px = cx + vx * 70 * k * sc, py = cy + away * (vy * 110 * k - 140 * k * k) * sc;
        g.globalAlpha = 1 - k; g.fillRect(Math.round(px - s / 2), Math.round(py - s / 2), s, s);
      } break;
    case "star": {
      const R = (8 + 34 * ek) * sc, r = R * 0.45, rot = k * 1.4 + e.seed;
      g.beginPath(); for (let i = 0; i < 10; i++) { const rr2 = i % 2 ? r : R, a = rot + i * Math.PI / 5; g.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2); } g.closePath();
      g.globalAlpha = (1 - k) * 0.25; g.fill(); g.globalAlpha = 1 - k; g.lineWidth = 2 * sc; g.stroke(); break; }
    case "confetti":
      for (let i = 0; i < 14; i++) {
        const vx = (rnd(e.seed, i) - 0.5) * 2.2, vy = 0.7 + rnd(e.seed, i + 30) * 0.9;
        const px = cx + vx * 80 * k * sc, py = cy + away * (vy * 120 * k - 170 * k * k) * sc, rot = rnd(e.seed, i + 60) * 6 + k * 8;
        g.save(); g.translate(px, py); g.rotate(rot); g.globalAlpha = 1 - k * k;
        g.fillStyle = `hsl(${Math.floor(rnd(e.seed, i + 90) * 360)},90%,62%)`; g.fillRect(-3 * sc, -1.5 * sc, 6 * sc, 3 * sc); g.restore();
      } break;
    case "ripple":
      for (let i = 0; i < 3; i++) {
        const k2 = (k - i * 0.18) / 0.64; if (k2 <= 0 || k2 >= 1) continue;
        const e2 = 1 - (1 - k2) * (1 - k2);
        g.globalAlpha = (1 - k2) * 0.9; g.lineWidth = (2.5 * (1 - k2) + 0.6) * sc;
        g.beginPath(); g.ellipse(cx, cy, (6 + 52 * e2) * sc, (4 + 18 * e2) * sc, 0, 0, 6.2832); g.stroke();
      } break;
    case "bubbles":
      g.lineWidth = 1.6 * sc;
      for (let i = 0; i < 7; i++) {
        const r = (3 + 5 * rnd(e.seed, i)) * sc, delay = rnd(e.seed, i + 10) * 0.25, k2 = clamp((k - delay) / (1 - delay), 0, 1);
        if (k2 <= 0) continue;
        const px = cx + (rnd(e.seed, i + 20) - 0.5) * nw * 0.9 + Math.sin(k2 * 9 + i) * 5 * sc, py = cy + away * k2 * (60 + 60 * rnd(e.seed, i + 30)) * sc;
        g.globalAlpha = k2 > 0.85 ? (1 - k2) / 0.15 : 0.9;
        g.beginPath(); g.arc(px, py, r * (k2 > 0.85 ? 1 + (k2 - 0.85) * 3 : 1), 0, 6.2832); g.stroke();
        g.globalAlpha *= 0.25; g.fill();
      } break;
    case "hearts":
      for (let i = 0; i < 5; i++) {
        const delay = i * 0.06, k2 = clamp((k - delay) / (1 - delay), 0, 1); if (k2 <= 0) continue;
        const px = cx + (rnd(e.seed, i) - 0.5) * nw + Math.sin(k2 * 6 + i) * 6 * sc, py = cy + away * k2 * (50 + 50 * rnd(e.seed, i + 5)) * sc;
        g.globalAlpha = 1 - k2; g.beginPath(); heartAt(g, px, py, (7 + 4 * rnd(e.seed, i + 9)) * sc * (0.7 + 0.3 * (1 - k2))); g.fill();
      } break;
    case "petals":
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * 6.2832 + k * 2.2 + e.seed, d = (6 + 40 * ek) * sc;
        g.save(); g.translate(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7); g.rotate(a + k * 3);
        g.globalAlpha = 1 - k; g.beginPath(); g.ellipse(0, 0, 7 * sc * (1 - 0.4 * k), 3 * sc, 0, 0, 6.2832); g.fill(); g.restore();
      } break;
    case "flame":
      for (let i = 0; i < 14; i++) {
        const delay = rnd(e.seed, i) * 0.4, k2 = clamp((k - delay) / (1 - delay), 0, 1); if (k2 <= 0 || k2 >= 1) continue;
        const px = cx + (rnd(e.seed, i + 3) - 0.5) * nw * 0.7 * (1 - k2) + Math.sin(k2 * 12 + i) * 3 * sc, py = cy + away * k2 * (70 + 40 * rnd(e.seed, i + 6)) * sc;
        g.globalAlpha = (1 - k2) * 0.85;
        g.fillStyle = k2 < 0.35 ? "#FFF3C4" : k2 < 0.65 ? e.color : "#FF7A1A";
        g.beginPath(); g.arc(px, py, (6 * (1 - k2) + 1.5) * sc, 0, 6.2832); g.fill();
      } break;
    case "zap":
      g.lineWidth = 2 * sc; g.lineJoin = "round"; g.globalAlpha = (1 - k) * (k < 0.5 && Math.floor(k * 20) % 2 ? 0.5 : 1);
      g.shadowColor = e.color; g.shadowBlur = 10 * sc;
      for (let b = 0; b < 3; b++) {
        const a = (away < 0 ? -Math.PI / 2 : Math.PI / 2) + (rnd(e.seed, b) - 0.5) * 1.6, len = (40 + 50 * rnd(e.seed, b + 7)) * sc * (0.5 + 0.5 * ek);
        g.beginPath(); g.moveTo(cx, cy);
        for (let j = 1; j <= 5; j++) { const d = len * j / 5, jit = (rnd(e.seed, b * 10 + j + Math.floor(k * 12)) - 0.5) * 16 * sc;
          g.lineTo(cx + Math.cos(a) * d + Math.cos(a + 1.57) * jit, cy + Math.sin(a) * d + Math.sin(a + 1.57) * jit); }
        g.stroke();
      } break;
    case "glitch":
      for (let i = 0; i < 6; i++) {
        const f = Math.floor(k * 10), off = (rnd(e.seed, i + f * 7) - 0.5) * 30 * sc, hh = (2 + 5 * rnd(e.seed, i + 40)) * sc;
        const yy = cy + (rnd(e.seed, i + 20 + f) - 0.5) * nh * 2.4, ww = nw * (0.3 + 0.7 * rnd(e.seed, i + 60));
        g.globalAlpha = (1 - k) * 0.8;
        g.fillStyle = i % 3 === 0 ? "#FF4F79" : i % 3 === 1 ? "#27D8F2" : e.color;
        g.fillRect(cx - ww / 2 + off, yy, ww, hh);
      } break;
    case "nova": {
      g.globalAlpha = Math.max(0, 1 - k * 2.2) * 0.9; g.fillStyle = "#FFFFFF";
      g.beginPath(); g.arc(cx, cy, (8 + 16 * ek) * sc, 0, 6.2832); g.fill();
      g.fillStyle = e.color; g.globalAlpha = (1 - k) * 0.5;
      g.beginPath(); g.arc(cx, cy, (10 + 28 * ek) * sc, 0, 6.2832); g.fill();
      g.strokeStyle = e.color; g.lineWidth = 2 * sc; g.globalAlpha = 1 - k; g.lineCap = "round";
      for (let i = 0; i < 12; i++) { const a = i / 12 * 6.2832 + e.seed, r0 = (12 + 24 * ek) * sc, r1 = r0 + (8 + 18 * (1 - k)) * sc;
        g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.75); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.75); g.stroke(); }
      break; }
    default: {   // ring
      g.globalAlpha = 1 - k; g.lineWidth = 2; const grow = 6 + k * 18;
      rrect(g, cx - nw / 2 - grow / 2, cy - nh / 2 - grow / 2, nw + grow, nh + grow, 4); g.stroke(); }
  }
  g.restore();
}

// note trails: drawn behind each falling note (back = away from the way it's moving)
function drawTrail(g, type, shape, x, yc, w, h, dir, col, a, now, seed, mini, lane) {
  const sc = mini ? 0.45 : 1, cx = x + w / 2, back = -dir;
  g.save();
  const streak = (len, wid, alpha, stops) => {
    const gr = g.createLinearGradient(0, yc, 0, yc + back * len);
    if (stops) stops(gr); else { gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)"); }
    g.fillStyle = gr; g.globalAlpha = a * alpha; g.fillRect(cx - wid / 2, back > 0 ? yc : yc - len, wid, len);
  };
  switch (type) {
    case "glow": streak(60 * sc, w * 0.8, 0.45); break;
    case "long": streak(160 * sc, w * 0.55, 0.42); break;
    case "comet": { const len = 130 * sc, gr = g.createLinearGradient(0, yc, 0, yc + back * len);
      gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.globalAlpha = a * 0.6;
      g.beginPath(); g.moveTo(cx - w * 0.38, yc); g.lineTo(cx + w * 0.38, yc); g.lineTo(cx, yc + back * len); g.closePath(); g.fill(); break; }
    case "sparkle": g.fillStyle = mix(col, 0.45);
      for (let k = 0; k < 7; k++) {
        const d = (10 + k * 13 + ((now / 30 + seed * 7) % 13)) * sc, px = cx + (rnd(seed, k) - 0.5) * w * 0.8, py = yc + back * d;
        const tw = 0.5 + 0.5 * Math.sin(now / 90 + k * 2 + seed), r = (1.5 + 3 * tw) * (1 - k / 8) * sc * 1.4;
        g.globalAlpha = a * (1 - k / 7) * 0.9; g.beginPath();
        g.moveTo(px, py - r); g.lineTo(px + r * 0.3, py - r * 0.3); g.lineTo(px + r, py); g.lineTo(px + r * 0.3, py + r * 0.3);
        g.lineTo(px, py + r); g.lineTo(px - r * 0.3, py + r * 0.3); g.lineTo(px - r, py); g.lineTo(px - r * 0.3, py - r * 0.3); g.closePath(); g.fill();
      } break;
    case "ghost": for (let k = 1; k <= 3; k++) { g.globalAlpha = a * (0.3 - k * 0.075); paintNote(g, shape, x, yc + back * k * (h * 1.25 + 5 * sc), w, h, dir, col, null, 1, false, lane); } break;
    case "speed": g.strokeStyle = col; g.lineWidth = 1.5 * sc; g.lineCap = "round";
      for (let k = 0; k < 4; k++) { const px = x + w * (0.12 + 0.76 * k / 3), len = (28 + 34 * rnd(seed, k)) * sc, y0 = yc + back * (h / 2 + 3);
        g.globalAlpha = a * 0.55; g.beginPath(); g.moveTo(px, y0); g.lineTo(px, y0 + back * len); g.stroke(); } break;
    case "fire": for (let k = 0; k < 12; k++) {
        const t = (now / 320 + rnd(seed, k)) % 1, py = yc + back * (h * 0.3 + t * 64 * sc), px = cx + (rnd(seed, k + 9) - 0.5) * w * 0.55 * (1 - t) + Math.sin(now / 80 + k) * 2 * sc;
        g.globalAlpha = a * (1 - t) * 0.8; g.fillStyle = t < 0.3 ? "#FFF3C4" : t < 0.6 ? "#FFB547" : "#FF4F1A";
        g.beginPath(); g.arc(px, py, (5.5 * (1 - t) + 1) * sc * (mini ? 1.4 : 1), 0, 6.2832); g.fill();
      } break;
    case "xp": g.fillStyle = "#FFD65C"; g.shadowColor = "#FFD65C"; g.shadowBlur = 6 * sc;
      for (let k = 0; k < 6; k++) {
        const d = (10 + k * 15 + ((now / 28 + seed * 5) % 15)) * sc, px = cx + (rnd(seed, k) - 0.5) * w * 0.7, py = yc + back * d, z = (4.5 - k * 0.55) * sc * (mini ? 1.4 : 1.2), t = z * 0.36;
        g.globalAlpha = a * (1 - k / 6); g.fillRect(px - z, py - t / 2, z * 2, t); g.fillRect(px - t / 2, py - z, t, z * 2);
      } break;
    case "rainbow": streak(130 * sc, w * 0.5, 0.5, (gr) => { const h0 = (now / 8 + lane * 60) % 360;
        for (let k = 0; k <= 4; k++) gr.addColorStop(k / 4, `hsla(${(h0 + k * 70) % 360},95%,62%,${1 - k / 4})`); }); break;
  }
  g.restore();
}

// previews: hits happen automatically as notes reach the line
function autoEffects(notes, t, now) {
  const out = [];
  notes.forEach((n, i) => { if (n.t <= t && t - n.t < 0.8) out.push({ lane: n.lane, at: now - (t - n.t) * 1000, color: J.perfect.color, seed: i + 1 }); });
  return out;
}
