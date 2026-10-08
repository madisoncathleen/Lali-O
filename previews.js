/*
 * LALI-O - shop/previews.js
 * Live previews of items in the Store and Inventory.
 */
"use strict";

const loadedFonts = new Set();

function ensureFont(f) {
  if (loadedFonts.has(f) || !document.fonts || !document.fonts.load) return;
  loadedFonts.add(f); document.fonts.load(`800 40px "${f}"`).catch(() => {});
}

function previewT(now) { return 8 + (now / 1000) % 8; }

// a looping auto-played playfield; with combo=true the combo counter sits to its left
function drawScene(g, W, H, cos, now, opts = {}) {
  const th = cos.theme, t = previewT(now), bp = pulseAt(t, 0, 0.5);
  g.fillStyle = th.ink; g.fillRect(0, 0, W, H);
  drawThemeFx(g, W, H, th, now, 0.8);
  drawLines(g, 0, W, H / 2, H, null, bp, 0.35, th);
  const fw = opts.combo ? Math.min(W * 0.62, 280) : Math.min(W - 16, 280);
  const fx = opts.combo ? W - fw - 10 : (W - fw) / 2;
  drawField(g, { x: fx, w: fw, H, t, travel: travelTime() * 0.8, notes: SAMPLE, ch: [], period: 0.5, beat0: 0, fx: 1, cos, auto: true });
  if (opts.combo) drawComboSample(g, fx / 2, H * 0.5, Math.min(58, fx * 0.42), now, cos.combo, bp);
}

function fitTextPx(g, txt, px, maxW) {
  g.font = `800 ${px}px ${canvasFont()}`;
  const m = g.measureText(txt);
  const w = Math.max(m.width, (m.actualBoundingBoxLeft || 0) + (m.actualBoundingBoxRight || 0));
  if (w > maxW) { px = Math.max(10, px * maxW / w); g.font = `800 ${px}px ${canvasFont()}`; }
  return px;
}

function drawComboSample(g, cx, cy, size, now, comboId, bp, maxW = cx * 2 - 16) {
  const lv = (now / 1000) % 6 < 3 ? 1 : 2, num = lv === 1 ? 128 : 316;
  const col = comboColAt(lv, now, comboId);
  g.save(); g.translate(cx, cy); const sc = 1 + (lv === 1 ? 0.07 : 0.12) * bp; g.scale(sc, sc);
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = mix(col, 0.15 * bp); g.shadowColor = col; g.shadowBlur = (lv === 1 ? 14 : 26) + 20 * bp;
  size = fitTextPx(g, String(num), size, maxW / 1.25); g.fillText(num, 0, 0);
  g.shadowBlur = 6; g.font = "600 12px 'IBM Plex Mono', monospace"; g.fillText("COMBO", 0, size * 0.62 + 4);
  g.restore();
}

function drawFontSample(g, W, H, font, now) {
  ensureFont(font);
  const th = THEME(), fam = `"${font}", system-ui, sans-serif`;
  g.fillStyle = th.ink; g.fillRect(0, 0, W, H);
  drawLines(g, 0, W, H / 2, H, null, pulseAt(previewT(now), 0, 0.5), 0.25, th);
  g.textAlign = "center"; g.textBaseline = "middle";
  const fit = (txt, max, px) => { g.font = `800 ${px}px ${fam}`; const w = g.measureText(txt).width; if (w > max) { px *= max / w; g.font = `800 ${px}px ${fam}`; } return px; };
  g.fillStyle = "#EEECF7"; fit("LALI-O", W - 28, 54); g.fillText("LALI-O", W / 2, H * 0.28);
  g.fillStyle = J.perfect.color; g.shadowColor = J.perfect.color; g.shadowBlur = 8; fit("PERFECT", W - 40, 34); g.fillText("PERFECT", W / 2, H * 0.48); g.shadowBlur = 0;
  const [c1] = comboPair(now); g.fillStyle = c1; g.shadowColor = c1; g.shadowBlur = 16; fit("128", W - 40, 64); g.fillText("128", W / 2, H * 0.68); g.shadowBlur = 0;
  g.fillStyle = "rgba(238,236,247,.6)"; fit("Sphinx of black quartz", W - 28, 16); g.fillText("Sphinx of black quartz", W / 2, H * 0.86);
}

function drawStorePreview(now) {
  const c = $("storePrev"); const [g, W, H] = fitCanvas(c);
  g.clearRect(0, 0, W, H);
  const it = stCurrent();
  // the preview follows the item's kind (search results mix kinds), or the category when nothing is picked
  const cat = it ? (it.kind === "box" ? "boxes" : it.kind === "font" ? "fonts" : it.kind === "combo" ? "combos" : it.kind === "icon" ? "icons" : "scene") : curCat().id;
  if (cat === "icons") {
    const th = THEME(); g.fillStyle = th.ink; g.fillRect(0, 0, W, H);
    const bp = pulseAt(previewT(now), 0, 0.5); drawLines(g, 0, W, H / 2, H, null, bp, 0.3, th);
    const id = it ? it.id : EQUIP.icon, R = Math.min(W * 0.34, H * 0.22, 110), cy = H * 0.45;
    g.save(); g.fillStyle = `rgba(${th.accentRgb},0.14)`; g.strokeStyle = th.accent; g.lineWidth = 3; g.shadowColor = th.accent; g.shadowBlur = 16 + 14 * bp;
    g.beginPath(); g.arc(W / 2, cy, R, 0, 7); g.fill(); g.stroke(); g.shadowBlur = 0;
    const k = R * 1.15 / 24; g.translate(W / 2 - 12 * k, cy - 12 * k); g.scale(k, k); g.fillStyle = th.accent; g.fill(new Path2D(ICON_PATHS[id] || ICON_PATHS.person), "evenodd"); g.restore();
    g.font = `800 ${Math.round(Math.min(26, W * 0.07))}px ${canvasFont()}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#EEECF7";
    g.fillText(ACCOUNTS[ACCT - 1].name, W / 2, cy + R + 34);
    return;
  }
  if (cat === "boxes") {
    const th = THEME(); g.fillStyle = th.ink; g.fillRect(0, 0, W, H);
    drawLines(g, 0, W, H / 2, H, null, pulseAt(previewT(now), 0, 0.5), 0.3, th);
    const list = it ? [it] : BOXES;
    list.forEach((b, k) => drawBoxArt(g, W / 2, it ? H / 2 : H * (0.2 + k * 0.3), Math.min(W * (it ? 0.5 : 0.32), it ? 120 : 64), b, now + k * 400, 0));
    return;
  }
  if (cat === "fonts") return drawFontSample(g, W, H, it ? it.id : settings.font, now);
  if (cat === "combos") {
    const th = THEME(); g.fillStyle = th.ink; g.fillRect(0, 0, W, H);
    drawLines(g, 0, W, H / 2, H, null, pulseAt(previewT(now), 0, 0.5), 0.3, th);
    const id = it ? it.id : EQUIP.combo, bp = pulseAt(previewT(now), 0, 0.5);
    g.font = "600 11px 'IBM Plex Mono', monospace"; g.textAlign = "center"; g.fillStyle = "rgba(238,236,247,.55)";
    g.fillText("100+ COMBO", W / 2, H * 0.14); g.fillText("300+ COMBO", W / 2, H * 0.56);
    const one = (lv, num, cy) => {
      const col = comboColAt(lv, now, id);
      g.save(); g.translate(W / 2, cy); const sc = 1 + (lv === 1 ? 0.07 : 0.12) * bp; g.scale(sc, sc);
      g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = mix(col, 0.15 * bp); g.shadowColor = col; g.shadowBlur = (lv === 1 ? 14 : 26) + 20 * bp;
      fitTextPx(g, String(num), Math.min(72, W * 0.3), (W - 24) / 1.25); g.fillText(num, 0, 0); g.restore();
    };
    one(1, 128, H * 0.32); one(2, 316, H * 0.74);
    return;
  }
  let over = null;
  if (it) {
    if (it.kind === "color") over = { base: [it.id, it.id, it.id, it.id], outline: [it.id, it.id, it.id, it.id] };
    else over = { [it.kind]: it.id };
  }
  drawScene(g, W, H, cosmetics(over), now);
}

function drawInvPreview(now) {
  const c = $("invPrev"); const [g, W, H] = fitCanvas(c);
  g.clearRect(0, 0, W, H);
  // narrow like the other previews: the playfield fills it and the combo floats over the upper part
  const cos = cosmetics();
  drawScene(g, W, H, cos, now, { combo: W >= 300 });
  if (W < 300) {
    const cy = H * 0.3, gr = g.createRadialGradient(W / 2, cy, 4, W / 2, cy, W * 0.55);
    gr.addColorStop(0, `rgba(${cos.theme.inkRgb},0.75)`); gr.addColorStop(1, `rgba(${cos.theme.inkRgb},0)`);
    g.fillStyle = gr; g.fillRect(0, cy - W * 0.55, W, W * 1.1);
    drawComboSample(g, W / 2, cy, Math.min(56, W * 0.26), now, cos.combo, pulseAt(previewT(now), 0, 0.5), W - 24);
  }
}
