/*
 * LALI-O - screens/inventory.js
 * The Inventory screen: equipping what you own.
 */
"use strict";

let resetStep = 0;

function renderInventory() {
  const p = $("invPanel"), keep = p.scrollTop;
  p.innerHTML = "";
  const sec = (title, desc) => {
    const s = document.createElement("div"); s.className = "invsec";
    s.innerHTML = `<h3></h3><p></p>`; s.querySelector("h3").textContent = title; s.querySelector("p").textContent = desc;
    p.appendChild(s); return s;
  };
  const chips = (parent, list, current, onPick, styleFn) => {
    const row = document.createElement("div"); row.className = "chips";
    for (const it of list) {
      const b = document.createElement("button");
      b.className = "chip"; b.setAttribute("aria-pressed", it.id === current ? "true" : "false");
      const sw = swatchCss(it);
      b.innerHTML = (sw ? `<i class="dot" style="background:${sw}"></i>` : "") + `<span></span>`;
      b.querySelector("span").textContent = it.name;
      if (styleFn) styleFn(b.querySelector("span"), it);
      b.addEventListener("click", () => onPick(it));
      row.appendChild(b);
    }
    parent.appendChild(row);
  };
  // presets: up to 5 saved looks (everything equipped, plus the font)
  renderPresets(sec("Presets", `Save your whole look (note colors, shape, trail, hit effect, combo colors, theme, lane background, profile icon and font) and switch back to it any time. Up to ${MAX_PRESETS}.`));
  // note colours per lane
  const ownedColors = COLORS.filter(isOwned).sort(byKey);
  const cs = sec("Note colors", "Pick a base and an outline color for each lane from the colors you own. Buy more in the Store.");
  const cosNow = cosmetics();
  for (let l = 0; l < 4; l++) {
    const card = document.createElement("div"); card.className = "lanecard";
    card.innerHTML = `<div class="lanehead"><i class="notechip"></i><b>Lane ${l + 1}</b><small>${settings.keys[l].label}</small></div><div class="lanerows"></div>`;
    const chip = card.querySelector(".notechip");
    chip.style.background = cosNow.fill[l]; chip.style.borderColor = cosNow.line[l];
    const rows = card.querySelector(".lanerows");
    for (const part of ["base", "outline"]) {
      const r = document.createElement("div"); r.className = "swline";
      r.innerHTML = `<span class="swlabel">${part === "base" ? "Base" : "Outline"}</span><div class="swrow"></div>`;
      for (const it of ownedColors) {
        const b = document.createElement("button");
        b.className = "sw"; b.title = it.name; b.setAttribute("aria-label", `${it.name} ${part} for lane ${l + 1}`);
        b.style.background = swatchCss(it);
        b.setAttribute("aria-pressed", EQUIP[part][l] === it.id ? "true" : "false");
        b.addEventListener("click", () => { EQUIP[part][l] = it.id; saveEquip(); applyEquip(); renderInventory(); });
        r.querySelector(".swrow").appendChild(b);
      }
      rows.appendChild(r);
    }
    cs.appendChild(card);
  }
  const simple = (title, desc, list, key) => chips(sec(title, desc), list.filter(isOwned).sort(byKey), EQUIP[key], (it) => { EQUIP[key] = it.id; saveEquip(); applyEquip(); renderInventory(); });
  simple("Note shape", "Used for notes, long notes and the hit markers.", SHAPES, "shape");
  simple("Hit effect", "What bursts from the hit line when you hit a note.", EFFECTS, "effect");
  simple("Combo colors", "The colors your combo glows at 100+ and 300+.", COMBOS, "combo");
  simple("Theme", "Colors of the menus, backgrounds and playfield. Animated themes add moving particles.", THEMES, "theme");
  simple("Lane background", "A pattern behind the notes in each lane, in that lane's color or its own.", LANES, "lane");
  simple("Note trail", "A streak that follows behind every note.", TRAILS, "trail");
  chips(sec("Profile icon", "Your picture on the main menu and Account page."), ICONS.filter(isOwned), EQUIP.icon,
    (it) => { EQUIP.icon = it.id; saveEquip(); renderAcct(); renderInventory(); }, (el, it) => { el.insertAdjacentHTML("beforebegin", `<i class="chipicon">${iconSvg(it.id)}</i>`); });
  chips(sec("Font", "Used for titles, buttons, the combo and hit ratings."), FONT_ITEMS.filter(isOwned), settings.font,
    (it) => { setFont(it.id, false); renderInventory(); }, (el, it) => { el.style.fontFamily = `"${it.id}", system-ui, sans-serif`; });
  // reset, with three confirmations
  const rs = sec("Reset inventory", "Removes everything you've bought on this save and puts the default items back on. Your coins and your other save are kept.");
  rs.classList.add("danger");
  const box = document.createElement("div"); box.className = "resetbox";
  const steps = [
    null,
    "Are you sure? Everything you've bought will be removed.",
    "Really sure? You won't get any coins back for those items.",
    "Last chance. Reset your inventory now?",
  ];
  const yes = ["Reset inventory", "Yes, I'm sure", "Yes, really", "Reset everything"];
  if (resetStep > 0) { const q = document.createElement("p"); q.className = "warn"; q.textContent = steps[resetStep]; box.appendChild(q); }
  const row = document.createElement("div"); row.className = "row";
  const go = document.createElement("button"); go.className = "dangerbtn"; go.textContent = yes[resetStep];
  go.addEventListener("click", () => {
    if (resetStep < 3) { resetStep++; renderInventory(); return; }
    resetStep = 0;
    OWNED = OWNED_DEFAULT(); EQUIP = EQUIP_DEFAULT(); saveOwned(); saveEquip();
    setFont("Syne", false); applyEquip(); renderInventory();
    const done = document.createElement("p"); done.className = "hint"; done.textContent = "Inventory reset.";
    $("invPanel").querySelector(".resetbox").appendChild(done);
  });
  row.appendChild(go);
  if (resetStep > 0) {
    const no = document.createElement("button"); no.className = "small-btn"; no.textContent = "Cancel";
    no.addEventListener("click", () => { resetStep = 0; renderInventory(); });
    row.appendChild(no);
  }
  box.appendChild(row); rs.appendChild(box);
  p.scrollTop = keep;
}
