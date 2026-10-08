/*
 * LALI-O - screens/inventory-presets.js
 * Saved outfits (presets) in the Inventory.
 */
"use strict";

const MAX_PRESETS = 5;
let PRESETS = store.get("presets", []), presetMsg = "", presetEdit = -1;
const savePresets = () => store.set("presets", PRESETS);
const lookNow = () => ({ eq: JSON.parse(JSON.stringify({ base: EQUIP.base, outline: EQUIP.outline, shape: EQUIP.shape, effect: EQUIP.effect, combo: EQUIP.combo, theme: EQUIP.theme, lane: EQUIP.lane, trail: EQUIP.trail, icon: EQUIP.icon })), font: settings.font });
const sameLook = (a, b) => JSON.stringify(a.eq) === JSON.stringify(b.eq) && a.font === b.font;

function applyPreset(pr) {
  let missing = 0;
  const own = (kind, id) => OWNED[OWN_KEY[kind]].includes(id);
  for (const part of ["base", "outline"]) (pr.eq[part] || []).forEach((c, l) => { if (own("color", c)) EQUIP[part][l] = c; else missing++; });
  for (const [k, kind] of [["shape", "shape"], ["effect", "effect"], ["combo", "combo"], ["theme", "theme"], ["lane", "lane"], ["trail", "trail"], ["icon", "icon"]]) {
    if (!pr.eq[k]) continue;
    if (own(kind, pr.eq[k])) EQUIP[k] = pr.eq[k]; else missing++;
  }
  saveEquip(); applyEquip();
  if (pr.font && own("font", pr.font)) setFont(pr.font, false); else if (pr.font) missing++;
  renderAcct();
  presetMsg = missing ? `Loaded \u201C${pr.name}\u201D. ${missing} item${missing > 1 ? "s" : ""} in it ${missing > 1 ? "aren't" : "isn't"} in your inventory anymore, so ${missing > 1 ? "they were" : "it was"} skipped.` : `Loaded \u201C${pr.name}\u201D.`;
  renderInventory();
}

function renderPresets(box) {
  const cur = lookNow();
  const wrap = document.createElement("div"); wrap.className = "presets";
  PRESETS.forEach((pr, i) => {
    const th = THEME_BY[pr.eq.theme] || THEMES[0], on = sameLook(pr, cur);
    const card = document.createElement("div"); card.className = "preset" + (on ? " on" : "");
    const lanes = [0, 1, 2, 3].map(l => `<i class="ln" style="background:${colorHex(pr.eq.base[l], l, 0)};border-color:${colorHex(pr.eq.outline[l], l, 0)}"></i>`).join("");
    card.innerHTML = `<div class="pv"><i class="th" style="background:${swatchCss(th)}"></i>${lanes}</div><div class="pn"></div><div class="pb"></div>`;
    const pn = card.querySelector(".pn"), pb = card.querySelector(".pb");
    const parts = [th.name, (SHAPES.find(x => x.id === pr.eq.shape) || {}).name, (LANE_BY[pr.eq.lane] || {}).name, pr.font].filter(Boolean).join(" \u00B7 ");
    if (presetEdit === i) {
      const inp = document.createElement("input"); inp.value = pr.name; inp.maxLength = 24; inp.setAttribute("aria-label", "Preset name");
      const done = (ok) => { if (ok) { pr.name = inp.value.trim() || pr.name; savePresets(); } presetEdit = -1; renderInventory(); };
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); done(true); } else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); done(false); } });
      inp.addEventListener("blur", () => { if (presetEdit === i) done(true); });
      pn.appendChild(inp); setTimeout(() => { inp.focus(); inp.select(); }, 0);
    } else {
      pn.innerHTML = `<b></b><small></small>`; pn.querySelector("b").textContent = pr.name; pn.querySelector("small").textContent = on ? "In use \u00B7 " + parts : parts;
    }
    const btn = (label, cls, fn) => { const b = document.createElement("button"); b.textContent = label; if (cls) b.className = cls; b.addEventListener("click", fn); pb.appendChild(b); return b; };
    btn(on ? "In use" : "Use", "use", () => applyPreset(pr)).disabled = on;
    btn("Update", "", () => { Object.assign(pr, lookNow()); savePresets(); presetMsg = `Saved your current look to \u201C${pr.name}\u201D.`; renderInventory(); }).title = "Replace this preset with what you have equipped now";
    btn("Rename", "", () => { presetEdit = i; renderInventory(); });
    const del = btn("Delete", "", () => {
      if (!del.classList.contains("sure")) { del.classList.add("sure"); del.textContent = "Delete?"; setTimeout(() => { if (del.isConnected) { del.classList.remove("sure"); del.textContent = "Delete"; } }, 3000); return; }
      PRESETS.splice(i, 1); savePresets(); presetMsg = `Deleted \u201C${pr.name}\u201D.`; renderInventory();
    });
    wrap.appendChild(card);
  });
  box.appendChild(wrap);
  // save the current look as a new preset
  const row = document.createElement("div"); row.className = "newpreset";
  if (PRESETS.length < MAX_PRESETS) {
    row.innerHTML = `<input maxlength="24" placeholder="Name this look (Preset ${PRESETS.length + 1})" aria-label="New preset name"><button class="small-btn">Save current look</button>`;
    const inp = row.querySelector("input"), go = () => {
      PRESETS.push(Object.assign({ name: inp.value.trim() || `Preset ${PRESETS.length + 1}` }, lookNow())); savePresets();
      presetMsg = `Saved \u201C${PRESETS[PRESETS.length - 1].name}\u201D.`; renderInventory();
    };
    row.querySelector("button").addEventListener("click", go);
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); go(); } });
  } else row.innerHTML = `<p class="hint" style="margin:0">You've saved ${MAX_PRESETS} presets, the most you can have. Update or delete one to save a new look.</p>`;
  box.appendChild(row);
  if (presetMsg) { const m = document.createElement("p"); m.className = "hint"; m.style.margin = "0"; m.textContent = presetMsg; box.appendChild(m); presetMsg = ""; }
}
