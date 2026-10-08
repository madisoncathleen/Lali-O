/*
 * LALI-O - render/playfield.js
 * Drawing the lanes and falling notes (game, previews, settings).
 */
"use strict";

function drawField(g, o) {
  const { x, w, H, t, travel, notes, ch, mini } = o;
  const cos = o.cos || cosmetics();
  const th = cos.theme;
  const laneW = w / 4;
  const hitB = mini ? H - 26 : H - Math.max(90, H * 0.14);
  const hitT = mini ? 26 : Math.max(120, H * 0.17);
  const f = flipAt(t, ch);
  const recY = hitB + (hitT - hitB) * f;
  const pps = hitB / travel;
  const cur = f >= 0.5 ? 1 : 0;
  const beatP = o.period ? pulseAt(t, o.beat0, o.period) : 0;
  const now = performance.now();

  g.fillStyle = `rgba(${th.field},0.92)`; g.fillRect(x, 0, w, H);
  if (f > 0) {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, `rgba(${th.accentRgb},${0.2 * f})`); gr.addColorStop(1, `rgba(${th.accentRgb},0)`);
    g.fillStyle = gr; g.fillRect(x, 0, w, H);
  }
  drawLaneBg(g, cos.lane, x, w, H, cos, t, pps, beatP, f, hitB, hitT, ch);
  g.fillStyle = "rgba(255,255,255,0.05)";
  for (let i = 1; i < 4; i++) g.fillRect(Math.round(x + i * laneW), 0, 1, H);
  g.fillStyle = `rgba(${th.accentRgb},${0.18 + 0.4 * beatP * (o.period ? 1 : 0)})`;
  g.fillRect(x - 2, 0, 2, H); g.fillRect(x + w, 0, 2, H);
  if (o.under) o.under(x, w);

  const Y = (time, rise) => rise ? hitT + (time - t) * pps : hitB - (time - t) * pps;

  // bar lines
  if (o.period) {
    const bar = o.period * 4;
    for (let k = Math.ceil((t - 0.3 - o.beat0) / bar); ; k++) {
      const bt = o.beat0 + k * bar; if (bt > t + travel * 1.1) break;
      const rise = inChorus(bt, ch) ? 1 : 0;
      g.fillStyle = `rgba(255,255,255,${rise === cur ? 0.07 : 0.02})`;
      g.fillRect(x, Math.round(Y(bt, rise)), w, 1);
    }
  }
  // pressed lanes (previews press them automatically)
  const pressed = o.pressed || (o.auto ? [0, 1, 2, 3].map(l => notes.some(n => n.lane === l && n.t <= t && (t - n.t < 0.09 || (n.d && t < n.end))) ) : null);
  if (pressed) for (let l = 0; l < 4; l++) if (pressed[l]) {
    const len = mini ? 60 : 170, dir = f >= 0.5 ? 1 : -1;
    const gr = g.createLinearGradient(0, recY, 0, recY + dir * len);
    gr.addColorStop(0, cos.fill[l] + "55"); gr.addColorStop(1, cos.fill[l] + "00");
    g.fillStyle = gr; g.fillRect(x + l * laneW, dir > 0 ? recY : recY - len, laneW, len);
  }

  // lv eases smoothly between 0 (under 100), 1 (100+) and 2 (300+) so the pulse and glow fade in and out
  const lv = o.fx !== undefined ? o.fx : (o.combo >= 300 ? 2 : o.combo >= 100 ? 1 : 0);
  const fxAt = (p0, p1, p2) => lv <= 1 ? p0 + (p1 - p0) * lv : p1 + (p2 - p1) * (lv - 1);
  const pl = beatP;
  const sx = 1 + fxAt(0.02, 0.04, 0.1) * pl;
  const sy = 1 + fxAt(0.16, 0.35, 0.75) * pl;
  const glow = fxAt(0, 10, 22) + fxAt(7, 12, 26) * pl;
  const bright = fxAt(0, 0.12, 0.3) + fxAt(0.1, 0.2, 0.35) * pl;

  const pad = mini ? 3 : 6;
  const nh = mini ? 9 : 21;
  const nw = laneW - pad * 2;
  const lw = mini ? 1.2 : 2.2;
  const tmin = t - 4.5, tmax = t + travel * 1.12;
  let i0 = 0, hi = notes.length;
  while (i0 < hi) { const m = (i0 + hi) >> 1; if (notes[m].t < tmin) i0 = m + 1; else hi = m; }
  for (let i = i0; i < notes.length; i++) {
    const n = notes[i];
    if (n.t > tmax) break;
    const autoHit = o.auto && n.t <= t;
    if (autoHit && (!n.d || t >= n.end)) continue;
    const headHit = n.headHit || autoHit, holding = n.holding || autoHit;
    if (n.done && !n.missed) continue;
    if (headHit && !n.d) continue;
    let a = n.rise === cur ? 1 : 0.28;
    if (o.hidden && !headHit) a *= clamp(((n.t - t) / travel - 0.12) / 0.28, 0, 1);   // Hidden: fades out on the way to the line
    if (n.missed) a *= 0.3;
    // sliding notes: start in n.from, slide into n.lane once 25% of the way to the hit line
    const from = n.from === undefined ? n.lane : n.from;
    let vl = n.lane, col = cos.fill[n.lane], line = cos.line[n.lane];
    if (from !== n.lane && !headHit) {
      const u = clamp(((1 - (n.t - t) / travel) - 0.25) / 0.22, 0, 1);
      const k = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      vl = from + (n.lane - from) * k;
      col = blendHex(cos.fill[from], cos.fill[n.lane], k);
      line = blendHex(cos.line[from], cos.line[n.lane], k);
    }
    const outline = line.toLowerCase() === col.toLowerCase() ? null : line;
    const dir = n.rise ? -1 : 1;
    const lx = x + vl * laneW + pad;
    let yh = Y(n.t, n.rise);
    if (n.d) {
      const ye = Y(n.end, n.rise);
      if (holding) yh = n.rise ? hitT : hitB;
      if (Math.abs(ye - yh) > 1 && !(n.rise ? ye < -20 : ye > H + 20)) {
        g.globalAlpha = a * (holding ? 0.5 : 0.32);
        g.fillStyle = col;
        const ty = Math.min(yh, ye), tl = Math.abs(ye - yh);
        for (const [sx0, sw] of tailSegs(cos.shape, lx, nw, nh)) { rrect(g, sx0, ty, sw, tl, Math.min(sw / 2, 3)); g.fill(); }
        g.globalAlpha = a;   // release marker: lighter, always outlined
        paintNote(g, cos.shape, lx, ye, nw, nh, dir, mix(col, 0.55), line, lw * 0.9, false, n.lane);   // same size and shape as the note
      }
    }
    if (headHit && !holding) { g.globalAlpha = 1; continue; }
    g.globalAlpha = a;
    // bar-like shapes stretch with the beat; shapes with their own proportions (diamonds, stars...) grow evenly instead
    const W2 = nw * sx, H2 = FIXED_ASPECT.has(cos.shape) ? nh * (1 + (sy - 1) * 0.4) : nh * sy;
    if (cos.trail && cos.trail !== "none" && !headHit && !n.missed && !n.d) drawTrail(g, cos.trail, cos.shape, lx + (nw - W2) / 2, yh, W2, H2, dir, col, a, now, i + 1, mini, Math.round(vl));
    if (glow && n.rise === cur && !n.missed) { g.shadowColor = col; g.shadowBlur = mini ? glow / 3 : glow; }
    paintNote(g, cos.shape, lx + (nw - W2) / 2, yh, W2, H2, dir, bright ? mix(col, bright) : col, outline, lw, !mini, Math.round(vl));
    g.shadowBlur = 0;
  }
  g.globalAlpha = 1;

  // receptors, in the note shape
  for (let l = 0; l < 4; l++) {
    const lx = x + l * laneW + pad, c = cos.fill[l];
    const on = pressed && pressed[l];
    g.lineJoin = "round";
    shapePath(g, cos.shape, lx, recY, nw, nh + 4, cur ? -1 : 1, l);
    if (on) { g.fillStyle = c + "88"; g.shadowColor = c; g.shadowBlur = 18; g.fill(); g.shadowBlur = 0; }
    g.strokeStyle = c + (on ? "ff" : "77"); g.lineWidth = mini ? 1 : 2; g.stroke();
    if (o.labels && !mini) {
      g.fillStyle = on ? "#fff" : "rgba(238,236,247,0.45)";
      g.font = "600 13px 'IBM Plex Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
      const gap = FIXED_ASPECT.has(cos.shape) ? Math.max(30, Math.min(nw / 2 * 0.92, (nh + 4) * 1.3) + 14) : 30;   // clear of big shapes like arrows
      g.fillText(o.labels[l], lx + nw / 2, recY + (f >= 0.5 ? -gap + 2 : gap));
    }
  }
  // hit effects
  const effects = o.effects || (o.auto ? autoEffects(notes, t, now) : null);
  if (effects) {
    const away = f >= 0.5 ? 1 : -1;
    for (const e of effects) drawEffect(g, cos.effect, e, now, x + e.lane * laneW + laneW / 2, recY, nw, nh, away, mini ? 0.55 : 1);
    g.globalAlpha = 1;
  }
  return { recY, f, hitT, hitB };
}
