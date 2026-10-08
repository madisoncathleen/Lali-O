/*
 * LALI-O - render/background.js
 * The animated background that pulses to the music, and themes.
 */
"use strict";

const bgC = $("bg");
let idlePhase = 0;

// vertical lines driven by the spectrum, mirrored so the bass sits in the middle
function drawLines(g, x0, W, cy, H, spec, beat, dim, th = THEME()) {
  const N = Math.max(12, Math.floor(W / 16));
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    const m = Math.abs(u - 0.5) * 2;
    let v;
    if (spec) {
      const bin = Math.floor(2 + Math.pow(m, 1.6) * 150);
      v = spec[bin] / 255;
    } else {
      v = 0.18 + 0.12 * Math.sin(idlePhase * 2 + i * 0.5) + 0.35 * beat * (1 - m);
    }
    v = clamp(v * (0.75 + 0.35 * beat), 0, 1);
    const h = (0.04 + v * 0.46) * H;
    const hue = th.hueA + u * th.hueSpan;
    g.fillStyle = `hsla(${((hue % 360) + 360) % 360},${th.sat}%,${58 + v * 20}%,${(0.1 + v * 0.55) * dim})`;
    const lw = 1 + v * 2.2;
    const x = x0 + (i + 0.5) * W / N - lw / 2;
    g.fillRect(x, cy - h, lw, h * 2);
  }
}

function heartPath(g, sz) {   // a small heart centred on 0,0
  g.beginPath(); g.moveTo(0, sz * 0.35);
  g.bezierCurveTo(-sz * 1.1, -sz * 0.35, -sz * 0.45, -sz * 1.05, 0, -sz * 0.45);
  g.bezierCurveTo(sz * 0.45, -sz * 1.05, sz * 1.1, -sz * 0.35, 0, sz * 0.35); g.closePath();
}

const hr = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };   // stable pseudo-random 0..1

// animated themes: particles that are a pure function of time (nothing to keep track of)
function drawThemeFx(g, W, H, th, now, dim = 1) {
  const a = th.anim; if (!a || reduceMotion) return;
  const c = th.fx || th.glow, s = now / 1000;
  g.save();
  switch (a) {
    case "stars":
      for (let i = 0; i < 110; i++) {
        const x = (hr(i, 1) * W + s * (4 + hr(i, 2) * 6)) % W, y = hr(i, 3) * H, tw = 0.5 + 0.5 * Math.sin(s * (1 + hr(i, 4) * 2.5) + i), r = 0.6 + hr(i, 5) * 1.4;
        g.globalAlpha = (0.15 + 0.75 * tw) * dim; g.fillStyle = i % 5 ? "#FFFFFF" : `rgb(${c})`;
        g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
        if (r > 1.6 && tw > 0.85) { g.globalAlpha = 0.35 * dim; g.fillRect(x - 5, y - 0.5, 10, 1); g.fillRect(x - 0.5, y - 5, 1, 10); }
      }
      break;
    case "rain":
      g.strokeStyle = `rgb(${c})`; g.lineWidth = 1;
      for (let i = 0; i < 90; i++) {
        const sp = 500 + hr(i, 2) * 500, len = 10 + hr(i, 3) * 16;
        const y = (hr(i, 1) * (H + 60) + s * sp) % (H + 60) - 30, x = ((hr(i, 4) * (W + 80) - y * 0.12) % (W + 80) + W + 80) % (W + 80) - 40;
        g.globalAlpha = (0.12 + hr(i, 5) * 0.25) * dim; g.beginPath(); g.moveTo(x, y); g.lineTo(x - len * 0.12, y + len); g.stroke();
      }
      break;
    case "snow":
      g.fillStyle = th.fx ? `rgb(${th.fx})` : "#FFFFFF";
      for (let i = 0; i < 90; i++) {
        const y = (hr(i, 1) * (H + 20) + s * (18 + hr(i, 2) * 40)) % (H + 20) - 10;
        const x = hr(i, 3) * W + Math.sin(s * (0.5 + hr(i, 4)) + i) * (8 + hr(i, 5) * 14);
        g.globalAlpha = (0.25 + hr(i, 6) * 0.5) * dim; g.beginPath(); g.arc(x, y, 0.8 + hr(i, 7) * 2.2, 0, 7); g.fill();
      }
      break;
    case "embers":
      g.fillStyle = `rgb(${c})`; g.shadowColor = `rgb(${c})`; g.shadowBlur = 8;
      for (let i = 0; i < 70; i++) {
        const k = (hr(i, 1) * (H + 20) + s * (25 + hr(i, 2) * 60)) % (H + 20), y = H + 10 - k;
        const x = hr(i, 3) * W + Math.sin(s * (0.8 + hr(i, 4)) + i) * 10;
        g.globalAlpha = (1 - k / (H + 20)) * 0.8 * dim; g.beginPath(); g.arc(x, y, 0.8 + hr(i, 5) * 1.8, 0, 7); g.fill();
      }
      break;
    case "aurora":
      for (let b = 0; b < 3; b++) {
        const hue = th.hueA + b * th.hueSpan / 3, top = H * (0.14 + b * 0.09), bot = H * (0.36 + b * 0.09);
        const gr = g.createLinearGradient(0, top - 50, 0, bot + 50);
        gr.addColorStop(0, `hsla(${hue},90%,60%,0)`); gr.addColorStop(0.5, `hsla(${hue},90%,62%,1)`); gr.addColorStop(1, `hsla(${hue},90%,60%,0)`);
        g.globalAlpha = 0.16 * dim; g.fillStyle = gr; g.beginPath();
        for (let x = 0; x <= W + 16; x += 16) g.lineTo(x, top + Math.sin(x / 180 + s * (0.3 + b * 0.12) + b * 2) * 40 + Math.sin(x / 70 + s * 0.7) * 12);
        for (let x = W + 16; x >= -16; x -= 16) g.lineTo(x, bot + Math.sin(x / 160 + s * (0.25 + b * 0.1) + b) * 50);
        g.closePath(); g.fill();
      }
      break;
    case "petals":
      for (let i = 0; i < 45; i++) {
        const sp = 30 + hr(i, 2) * 40, y = (hr(i, 1) * (H + 40) + s * sp) % (H + 40) - 20;
        const x = ((hr(i, 3) * (W + 60) + s * sp * 0.5 + Math.sin(s + i) * 20) % (W + 60)) - 30;
        g.save(); g.translate(x, y); g.rotate(s * (0.5 + hr(i, 4)) + i); g.scale(1, 0.55 + 0.45 * Math.sin(s * 2 + i));
        g.globalAlpha = (0.35 + hr(i, 5) * 0.4) * dim; g.fillStyle = i % 3 ? "#FFB7D5" : "#FF8FC7";
        g.beginPath(); g.ellipse(0, 0, 5, 3, 0, 0, 7); g.fill(); g.restore();
      }
      break;
    case "bubbles":
      g.strokeStyle = `rgb(${c})`; g.lineWidth = 1.2;
      for (let i = 0; i < 45; i++) {
        const k = (hr(i, 1) * (H + 40) + s * (20 + hr(i, 2) * 35)) % (H + 40), y = H + 20 - k, r = 3 + hr(i, 3) * 9;
        const x = hr(i, 4) * W + Math.sin(s * (0.6 + hr(i, 5)) + i) * 14;
        g.globalAlpha = (0.25 + 0.35 * hr(i, 6)) * dim * Math.min(1, k / 80);
        g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();
        g.globalAlpha *= 0.8; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.35, r * 0.22, 0, 7); g.fillStyle = "#FFFFFF"; g.fill();
      }
      break;
    case "hearts":
      g.fillStyle = `rgb(${c})`;
      for (let i = 0; i < 40; i++) {
        const k = (hr(i, 1) * (H + 30) + s * (22 + hr(i, 2) * 40)) % (H + 30), y = H + 15 - k, sz = 4 + hr(i, 3) * 7;
        const x = hr(i, 4) * W + Math.sin(s * (0.7 + hr(i, 5)) + i) * 16;
        g.globalAlpha = (0.2 + 0.5 * hr(i, 6)) * dim * (1 - k / (H + 30));
        g.save(); g.translate(x, y); g.rotate(Math.sin(s + i) * 0.3); heartPath(g, sz); g.fill(); g.restore();
      }
      break;
    case "matrix": case "binary": {   // falling columns of glyphs with a bright head
      const cw = 18, cols = Math.ceil(W / cw), glyphs = "0123456789ABCDEF<>/{}=+*#$%&";
      g.font = `600 14px "IBM Plex Mono", ui-monospace, monospace`; g.textAlign = "center"; g.textBaseline = "middle";
      for (let i = 0; i < cols; i++) {
        if (hr(i, 9) < 0.35) continue;   // leave some columns empty
        const sp = 70 + hr(i, 1) * 130, L = 8 + Math.floor(hr(i, 3) * 16), span = H + L * cw;
        const head = (hr(i, 2) * span + s * sp) % span, x = i * cw + cw / 2;
        for (let k = 0; k < L; k++) {
          const y = head - k * cw; if (y < -cw || y > H + cw) continue;
          const r = hr(i * 131 + Math.floor((y - head) / cw) + Math.floor(s * (3 + hr(i, 5) * 4)), k);
          const ch = a === "binary" ? (r < 0.5 ? "0" : "1") : glyphs[Math.floor(r * glyphs.length)];
          g.globalAlpha = (k === 0 ? 0.7 : 0.38 * (1 - k / L)) * dim;
          g.fillStyle = k === 0 ? "#FFFFFF" : `rgb(${c})`;
          g.fillText(ch, x, y);
        }
      }
      break; }
    case "fireflies":
      g.fillStyle = `rgb(${c})`; g.shadowColor = `rgb(${c})`; g.shadowBlur = 12;
      for (let i = 0; i < 40; i++) {
        const x = W * (0.5 + 0.46 * Math.sin(s * (0.07 + hr(i, 1) * 0.08) + i * 1.7)), y = H * (0.5 + 0.44 * Math.sin(s * (0.05 + hr(i, 2) * 0.07) + i * 2.3));
        const pz = Math.max(0, Math.sin(s * (0.8 + hr(i, 3)) + i * 3));
        g.globalAlpha = (0.08 + 0.85 * pz * pz) * dim; g.beginPath(); g.arc(x, y, 1.5 + pz, 0, 7); g.fill();
      }
      break;
  }
  g.restore();
}

// lane backgrounds: drawn in each lane behind the notes; scrolling ones move with the notes
function drawLaneBg(g, id, x, w, H, cos, t, pps, beatP, f, hitB, hitT, ch) {
  if (!id || id === "plain") return;
  const LD = LANE_BY[id], tint = LD && LD.tint;
  if (LD && LD.pat) id = LD.pat;   // one-colour versions reuse a base pattern
  // patterns move with the notes: down normally, up during a flip. Time spent inside flips counts backwards,
  // so the pattern turns around smoothly instead of jumping when the map flips.
  let signedT = t; for (const [a, b] of ch || []) signedT -= 2 * clamp(t - a, 0, b - a);
  const laneW = w / 4, dir = f >= 0.5 ? -1 : 1, scroll = signedT * pps, now = performance.now();
  const wrap = (v, m) => ((v % m) + m) % m;
  for (let l = 0; l < 4; l++) {
    const lx = x + l * laneW, col = tint || cos.fill[l];
    g.save(); g.beginPath(); g.rect(lx, 0, laneW, H); g.clip();
    switch (id) {
      case "fade": { const hy = hitB + (hitT - hitB) * f, gr = g.createLinearGradient(0, hy, 0, f >= 0.5 ? H : 0);
        gr.addColorStop(0, col + "38"); gr.addColorStop(1, col + "00"); g.fillStyle = gr; g.fillRect(lx, 0, laneW, H); break; }
      case "grid": { const cell = laneW / 2, off = wrap(scroll, cell); g.strokeStyle = col + "26"; g.lineWidth = 1; g.beginPath();
        for (let y = off - cell; y < H; y += cell) { g.moveTo(lx, Math.round(y) + 0.5); g.lineTo(lx + laneW, Math.round(y) + 0.5); }
        g.moveTo(Math.round(lx + cell) + 0.5, 0); g.lineTo(Math.round(lx + cell) + 0.5, H); g.stroke(); break; }
      case "stripes": { const sp = 22, off = wrap(scroll, sp * 2); g.fillStyle = col + "1C";
        for (let y = off - sp * 2; y < H + laneW; y += sp * 2) { g.beginPath(); g.moveTo(lx, y); g.lineTo(lx + laneW, y - laneW * 0.6); g.lineTo(lx + laneW, y - laneW * 0.6 + sp); g.lineTo(lx, y + sp); g.closePath(); g.fill(); }
        break; }
      case "dots": { const sp = laneW / 4, off = wrap(scroll, sp); g.fillStyle = col + "40";
        for (let y = off - sp; y < H + sp; y += sp) for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(lx + sp * (k + 0.5), y, 1.3, 0, 7); g.fill(); }
        break; }
      case "pulse": g.fillStyle = col; g.globalAlpha = 0.03 + 0.13 * beatP; g.fillRect(lx, 0, laneW, H); break;
      case "neon": g.fillStyle = col; g.globalAlpha = 0.05; g.fillRect(lx, 0, laneW, H);
        g.shadowColor = col; g.shadowBlur = 10 + 8 * beatP; g.globalAlpha = 0.6; g.fillRect(lx + 2, 0, 1.5, H); g.fillRect(lx + laneW - 3.5, 0, 1.5, H); break;
      case "chevrons": { const sp = laneW * 0.8, off = wrap(scroll, sp); g.strokeStyle = col + "33"; g.lineWidth = 3; g.lineJoin = "round";
        for (let y = off - sp; y < H + sp; y += sp) { g.beginPath(); g.moveTo(lx + laneW * 0.25, y - dir * laneW * 0.14); g.lineTo(lx + laneW / 2, y + dir * laneW * 0.1); g.lineTo(lx + laneW * 0.75, y - dir * laneW * 0.14); g.stroke(); }
        break; }
      case "scanlines": g.fillStyle = "rgba(255,255,255,0.045)"; for (let y = 0; y < H; y += 4) g.fillRect(lx, y, laneW, 1);
        g.fillStyle = col; g.globalAlpha = 0.07; g.fillRect(lx, wrap(dir * now / 8 + l * 40, H + 60) - 30, laneW, 30); break;   // the scan glow travels the way the notes do
      case "circuit": { const sp = 90; g.strokeStyle = col + "38"; g.fillStyle = col + "70"; g.lineWidth = 1.2;
        const k0 = Math.floor((-sp - scroll) / sp), k1 = Math.ceil((H + sp - scroll) / sp);
        for (let k = k0; k <= k1; k++) {
          const y = k * sp + scroll, a = lx + laneW * (0.25 + 0.5 * hr(k, l + 1)), b = lx + laneW * (0.25 + 0.5 * hr(k + 1, l + 1));
          g.beginPath(); g.moveTo(a, y); g.lineTo(a, y + sp * 0.45); g.lineTo(b, y + sp * 0.65); g.lineTo(b, y + sp); g.stroke();
          g.beginPath(); g.arc(a, y, 2.2, 0, 7); g.fill();
        }
        break; }
      case "pinkglow": { const hy = hitB + (hitT - hitB) * f, gr = g.createLinearGradient(0, hy, 0, f >= 0.5 ? H : 0);
        gr.addColorStop(0, `rgba(255,111,174,${0.18 + 0.14 * beatP})`); gr.addColorStop(1, "rgba(255,111,174,0.03)"); g.fillStyle = gr; g.fillRect(lx, 0, laneW, H); break; }
      case "heartlanes": { const sp = laneW * 0.9, k0 = Math.floor((-sp - scroll) / sp), k1 = Math.ceil((H + sp - scroll) / sp); g.fillStyle = "rgba(255,143,199,0.32)";
        for (let k = k0; k <= k1; k++) { g.save(); g.translate(lx + laneW * (0.3 + 0.4 * hr(k, l + 7)), k * sp + scroll); heartPath(g, laneW * 0.1); g.fill(); g.restore(); }
        break; }
      case "sparkle": { const sp = 46, k0 = Math.floor((-sp - scroll) / sp), k1 = Math.ceil((H + sp - scroll) / sp); g.fillStyle = "#FFC1E3";
        for (let k = k0; k <= k1; k++) {
          if (tint) g.fillStyle = mix(tint, 0.35);
          const x = lx + laneW * (0.15 + 0.7 * hr(k, l + 3)), y = k * sp + scroll, tw = Math.max(0, Math.sin(now / 260 + hr(k, l + 5) * 9)), r = 2 + 4 * tw;
          g.globalAlpha = 0.15 + 0.5 * tw; g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r * 0.28, y - r * 0.28); g.lineTo(x + r, y); g.lineTo(x + r * 0.28, y + r * 0.28);
          g.lineTo(x, y + r); g.lineTo(x - r * 0.28, y + r * 0.28); g.lineTo(x - r, y); g.lineTo(x - r * 0.28, y - r * 0.28); g.closePath(); g.fill();
        }
        break; }
      case "coderain": case "binaryblush": case "kanacode": {
        // streams of glyphs fixed to the song, so they fall with the notes and rise after a flip;
        // each stream's bright head leads the way it's moving and its trail fades behind it
        const sz = Math.max(7, Math.min(13, laneW / 4.2)), cols = Math.max(2, Math.floor(laneW / (sz * 1.05))), cw = laneW / cols;
        const k0 = Math.floor((-sz - scroll) / sz), k1 = Math.ceil((H + sz - scroll) / sz);
        g.font = `600 ${sz}px "IBM Plex Mono", ui-monospace, monospace`; g.textAlign = "center"; g.textBaseline = "middle";
        for (let cI = 0; cI < cols; cI++) {
          const col = l * 7 + cI, L = 16 + Math.floor(hr(col, 11) * 18), off = Math.floor(hr(col, 12) * L), trail = 4 + Math.floor(hr(col, 13) * 8);
          const x = lx + cw * (cI + 0.5);
          for (let k = k0; k <= k1; k++) {
            const p = (((k + off) % L) + L) % L, d = dir > 0 ? L - 1 - p : p;   // d = rows behind the head
            if (d >= trail) continue;
            const b = 1 - d / trail;
            const flick = Math.floor(now / (140 + hr(k, col) * 500) + hr(k, col + 3) * 9);   // glyphs change now and then
            const r = hr(k * 31 + flick, col);
            const ch = id === "binaryblush" ? (r < 0.5 ? "0" : "1") : id === "kanacode" ? String.fromCharCode(0x30A2 + Math.floor(r * 80)) : "0123456789ABCDEF<>/{}=+*#$%"[Math.floor(r * 27)];
            g.globalAlpha = d === 0 ? 0.6 : 0.07 + 0.33 * b * b;
            g.fillStyle = tint ? (d === 0 ? mix(tint, 0.7) : tint) : d === 0 ? "#FFD9EE" : "#FF9FD0";
            g.fillText(ch, x, k * sz + scroll);
          }
        }
        break; }
      case "hexgrid": { const r = laneW / 5, hgt = r * Math.sqrt(3), off = wrap(scroll, hgt); g.strokeStyle = col + "30"; g.lineWidth = 1.2;
        for (let c = 0; c * 1.5 * r < laneW + r; c++) for (let y = off - hgt * 2; y < H + hgt; y += hgt) {
          const X = lx + c * 1.5 * r, Y = y + (c % 2 ? hgt / 2 : 0); g.beginPath();
          for (let i = 0; i < 6; i++) { const q = i * Math.PI / 3; i ? g.lineTo(X + r * Math.cos(q), Y + r * Math.sin(q)) : g.moveTo(X + r, Y); } g.closePath(); g.stroke();
        } break; }
      case "waves": { const sp = 26, off = wrap(scroll, sp); g.strokeStyle = col + "33"; g.lineWidth = 1.6;
        for (let y = off - sp; y < H + sp; y += sp) { g.beginPath();
          for (let i = 0; i <= 12; i++) { const X = lx + laneW * i / 12, Y = y + Math.sin(i / 12 * Math.PI * 2 + y / 40) * 5; i ? g.lineTo(X, Y) : g.moveTo(X, Y); } g.stroke(); }
        break; }
      case "rings": { const sp = laneW * 0.75, off = wrap(scroll, sp); g.strokeStyle = col + "36"; g.lineWidth = 1.5;
        for (let y = off - sp; y < H + sp; y += sp) { g.beginPath(); g.arc(lx + laneW / 2, y, laneW * 0.28, 0, 7); g.stroke(); g.beginPath(); g.arc(lx + laneW / 2, y, laneW * 0.12, 0, 7); g.stroke(); }
        break; }
      case "zigzag": { const sp = laneW * 0.5, off = wrap(scroll, sp * 2); g.strokeStyle = col + "30"; g.lineWidth = 3; g.lineJoin = "miter";
        g.beginPath(); for (let y = off - sp * 2, i = 0; y < H + sp * 2; y += sp, i++) { const X = lx + laneW * (i % 2 ? 0.8 : 0.2); y === off - sp * 2 ? g.moveTo(X, y) : g.lineTo(X, y); } g.stroke();
        break; }
      case "rainbow": { const gr = g.createLinearGradient(0, 0, 0, H);
        for (let k = 0; k <= 4; k++) gr.addColorStop(k / 4, `hsla(${wrap(k * 90 + l * 40 - dir * now / 20, 360)},90%,60%,0.11)`);   // colours flow the way the notes do
        g.fillStyle = gr; g.fillRect(lx, 0, laneW, H); break; }
    }
    g.restore();
  }
}

function drawBg(now) {
  const [g, W, H] = fitCanvas(bgC);
  const th = THEME();
  g.fillStyle = th.ink; g.fillRect(0, 0, W, H);
  drawThemeFx(g, W, H, th, now, screen === "menu" ? 1 : 0.6);
  let spec = null, beat = 0.25 + 0.25 * Math.sin(now / 600);
  if (actx && menuPlaying) {
    analyser.getByteFrequencyData(freq); spec = freq;
    beat = pulseAt(menuPos(), menuBeat.beat0, 60 / menuBeat.bpm);   // follows your own menu music too
  } else if (previewSong && !previewAudio.paused) {
    beat = pulseAt(previewAudio.currentTime, previewSong.beat0, 60 / previewSong.bpm);
  }
  const dim = screen === "menu" ? 1 : 0.45;
  idlePhase += 0.01;
  // horizontal lines breathing out from centre on each beat
  const cy = H * 0.5;
  for (let k = 1; k <= 9; k++) {
    const off = (k * k * 7 + 10) * (1 + beat * 0.08);
    const a = (0.05 + 0.16 * beat) * (1 - k / 11) * dim;
    g.fillStyle = `rgba(${th.accentRgb},${a})`;
    g.fillRect(0, cy - off, W, 1); g.fillRect(0, cy + off, W, 1);
  }
  drawLines(g, 0, W, cy, H, spec, beat, dim, th);
  // eq in "now playing" + the logo glows and pulses to the beat
  if (screen === "menu") {
    const logo = $("logo");
    logo.style.transform = reduceMotion ? "" : `scale(${(1 + 0.022 * beat).toFixed(4)})`;
    logo.style.textShadow = `0 0 ${(6 + 22 * beat).toFixed(1)}px rgba(${th.accentRgb},${(0.18 + 0.45 * beat).toFixed(3)})`;
    const bars = $("eq").children;
    for (let i = 0; i < 4; i++) {
      const v = spec ? spec[3 + i * 9] / 255 : 0.2;
      bars[i].style.height = `${20 + v * 80}%`;
    }
  }
}
