/*
 * LALI-O - screens/store.js
 * The Store screen: browsing, sorting, filtering and buying.
 */
"use strict";

let stLevel = "cats", stCat = 0, stItem = 0, freeMode = false, stQuery = "", stFam = "", stSort = 0;
const SORTS = ["Featured", "Price \u2191", "Price \u2193", "Name A\u2013Z", "By color"];
const FAM_ORDER = [...FAMS.map(f => f.id), "multi", "any"];

// the colour filter keeps boxes, and in the kinds that have no colour (fonts, shapes, trails...) it keeps everything
// Featured order: colors run through the rainbow (all the greens together, and so on), and every variation of
// a thing sits together: Orb, Big Orb, Orbs, Hollow Orb...; Burst then each colored Burst; Glow then each colored Glow
function hexHSL(hex) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0; if (d) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360; }
  if (h >= 345) h -= 360;   // deep reds sit with the other reds
  return [h, l];
}

const SHAPE_GROUPS = [["bar", "pill", "block", "hollow", "slant", "oct", "dash", "twin", "split", "ticket", "hex", "brackets", "wave", "bolt", "chevron", "shard", "crystal"],
  ["orb", "orb1", "orbs", "ring1"], ["diamond", "diamond1", "diamonds"], ["star", "star1", "stars"], ["heart", "heart1", "hearts"],
  ["tri", "arrows"], ["square1", "hex1", "cross1"], ["petal1", "moon1"]];

const SHAPE_ORDER = {}; SHAPE_GROUPS.flat().forEach((id, i) => { SHAPE_ORDER[id] = i; });

const LANE_GROUP = { plain: 0, fade: 1, pinkglow: 1, pulse: 2, neon: 3, grid: 4, dots: 5, stripes: 6, chevrons: 7, zigzag: 8, waves: 9, rings: 10, hexgrid: 11,
  circuit: 12, scanlines: 13, sparkle: 14, heartlanes: 15, coderain: 16, binaryblush: 16, kanacode: 16, rainbow: 17 };

const KIND_ORDER = ["box", "color", "shape", "trail", "effect", "combo", "theme", "lane", "font", "icon"];

function featuredKey(it) {
  const fam = FAM_ORDER.indexOf(famOf(it));
  const k = [KIND_ORDER.indexOf(it.kind)];
  switch (it.kind) {
    case "color": { const [h, l] = it.hex ? hexHSL(it.hex) : [999, 0]; return k.concat(it.id === "rainbow" || it.id === "chrome" ? 99 : fam, it.hex ? 0 : 1, h, l); }
    case "shape": { const b = SHAPE_BASE[it.id] || it.id; return k.concat(SHAPE_ORDER[b] === undefined ? 99 : SHAPE_ORDER[b], SHAPE_BASE[it.id] ? 1 : 0, it.price); }
    case "effect": { const b = it.base || it.id, base = EFFECTS.find(e => e.id === b) || it; return k.concat(base.price, b, it.tint ? fam + 1 : 0); }
    case "lane": {   // by color first (patterns in each lane's own color lead), then the pattern's variations within that color
      const b = it.pat || it.id, gi = LANE_GROUP[b] === undefined ? 50 : LANE_GROUP[b], f = famOf(it);
      return k.concat(f === "any" ? -1 : fam, gi, it.price); }
    case "combo": { const [h, l] = it.c1 ? hexHSL(it.c1) : [999, 0]; return k.concat(it.c1 ? fam : 99, h, l); }
    case "theme": { const [h, l] = hexHSL(it.accent); return k.concat(fam, h, it.price); }
    case "font": return k.concat(it.price, it.name);
  }
  return k.concat(it.price);
}

function byKey(a, b) {
  const x = featuredKey(a), y = featuredKey(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if (x[i] === y[i]) continue;
    if (typeof x[i] === "string" || typeof y[i] === "string") return String(x[i]).localeCompare(String(y[i]));
    return (x[i] === undefined ? -1 : x[i]) - (y[i] === undefined ? -1 : y[i]);
  }
  return 0;
}

function filterSort(list) {
  if (stFam) list = list.filter(i => i.kind === "box" || famOf(i) === stFam);
  const byP = (a, b) => a.price - b.price;
  switch (stSort) {
    case 1: return [...list].sort(byP);
    case 2: return [...list].sort((a, b) => b.price - a.price);
    case 3: return [...list].sort((a, b) => a.name.localeCompare(b.name));
    case 4: return [...list].sort((a, b) => FAM_ORDER.indexOf(famOf(a)) - FAM_ORDER.indexOf(famOf(b)) || byKey(a, b));
  }
  return list.some(i => i.kind === "box") ? list : [...list].sort(byKey);
}

function renderStoreTools() {
  const box = $("stTools"); box.innerHTML = "";
  const mk = (fid, label, css) => {
    const b = document.createElement("button"); b.className = "fam" + (fid ? "" : " all"); b.setAttribute("aria-pressed", stFam === fid ? "true" : "false");
    if (fid) { b.style.setProperty("--c", css); b.title = label; b.setAttribute("aria-label", "Show only " + label); } else b.textContent = label;
    b.addEventListener("click", () => { stFam = stFam === fid ? "" : fid; stItem = 0; renderStore(); });
    box.appendChild(b);
  };
  mk("", "All colors");
  for (const f of FAMS) mk(f.id, f.name, f.id === "neutral" ? "linear-gradient(135deg,#1B1B26 50%,#F4F2FF 50%)" : f.dot);
  mk("multi", "Rainbow & animated", "conic-gradient(#FF4F79,#FFB547,#F7F06D,#4FE3C1,#5B8CFF,#B98CFF,#FF4F79)");
  if (stFam) { const n = document.createElement("span"); n.className = "famname"; n.textContent = stFam === "multi" ? "Rainbow" : FAM_BY[stFam].name; box.appendChild(n); }
  const sb = document.createElement("button"); sb.className = "sortbtn"; sb.textContent = "Sort: " + SORTS[stSort]; sb.title = "Change the order (S)";
  sb.addEventListener("click", cycleSort); box.appendChild(sb);
}

function cycleSort() { stSort = (stSort + 1) % SORTS.length; stItem = 0; renderStore(); }

// searching the store lists matching items from every category (and anything box-only you already own)
const SEARCH_CAT = { id: "search", name: "Search", desc: "", items: () => {
  const q = stQuery, hit = (i) => `${i.name} ${KIND_LABEL[i.kind]} ${i.pink ? "pink" : ""} ${i.anim || i.shimmer ? "animated" : ""} ${FAM_BY[famOf(i)] ? FAM_BY[famOf(i)].name : ""}`.toLowerCase().includes(q);
  return [...BOXES, ...ALL_ITEMS().filter(i => !i.boxOnly || isOwned(i))].filter(hit);
} };

const curCat = () => stQuery ? SEARCH_CAT : CATS[stCat];
const trialLeft = () => { const ms = Math.max(0, TRIAL_UNTIL - Date.now()); return `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`; };
const catOf = (it) => it.kind === "box" ? CATS[0] : (CATS.find(c => c.id !== "boxes" && c.items().includes(it)) || { name: it.levelOnly ? `Level ${it.levelReq} reward` : it.boxOnly ? "Mystery box exclusive" : KIND_LABEL[it.kind] });
const stItems = () => curCat().id === "boxes" ? BOXES : filterSort(curCat().items());
const stCurrent = () => stLevel === "items" ? stItems()[stItem] : null;
const priceOf = (it) => freeMode ? 0 : it.price;

function swatchCss(it) {
  if (it.kind === "color" && it.shimmer) { const f = FAM_BY[it.shimmer]; return it.shimmer === "neutral" ? "conic-gradient(#8E94A6,#FFFFFF,#B8BCC8,#F0F2F8,#8E94A6)" : `conic-gradient(${hsl2hex(f.h, 92, 52)},${hsl2hex(f.h + 12, 92, 80)},${hsl2hex(f.h - 10, 92, 60)},${hsl2hex(f.h, 92, 76)},${hsl2hex(f.h, 92, 52)})`; }
  if (it.kind === "lane" && it.tint) { const c = it.tint;
    return it.pat === "fade" ? `linear-gradient(0deg,${c},#15151F)` : it.pat === "neon" ? `linear-gradient(90deg,${c} 0 3px,#15151F 3px calc(100% - 3px),${c} 0)` : it.pat === "dots" ? `radial-gradient(circle,${c} 30%,transparent 32%) 0 0/7px 7px,#15151F`
      : it.pat === "coderain" ? `repeating-linear-gradient(0deg,${c} 0 2px,transparent 2px 5px),#15151F` : `radial-gradient(circle at 30% 30%,${c} 12%,transparent 14%),radial-gradient(circle at 70% 65%,${c} 9%,transparent 11%),#15151F`; }
  if (it.kind === "effect" && it.tint) return `radial-gradient(circle,#FFFFFF 12%,${it.tint} 30%,transparent 62%),#15151F`;
  if (it.kind === "color" && it.id === "lvl-prism") return "conic-gradient(#FFB3C7,#FFE3A3,#B8FFD9,#B3D4FF,#E0BFFF,#FFB3C7)";
  if (it.kind === "color" && it.id === "chrome") return "linear-gradient(135deg,#6B7385,#F4F6FA 45%,#8E94A6 60%,#E8ECF4)";
  if (it.kind === "color" && it.id === "pinkglitter") return "conic-gradient(#FFC1D9,#FF3EA5,#FFE3F1,#FF6FAE,#FFC1D9)";
  if (it.kind === "combo" && it.id === "pinkprism") return "conic-gradient(#FFD1E3,#FF3EA5,#FF8FC7,#FF6FAE,#FFD1E3)";
  if (it.kind === "lane" && ["coderain", "binaryblush", "kanacode"].includes(it.id)) return "repeating-linear-gradient(0deg,#FFB6DB 0 2px,transparent 2px 5px),#1A0E16";
  if (it.kind === "lane" && it.pink) return it.id === "pinkglow" ? "linear-gradient(0deg,#FF6FAE,#2A1623)" : "radial-gradient(circle,#FF8FC7 30%,transparent 32%) 0 0/7px 7px,#2A1623";
  if (it.kind === "combo" && it.id === "galaxy") return "conic-gradient(#5A3FD9,#B98CFF,#FF5FD2,#2B55E8,#5A3FD9)";
  if (it.kind === "box") return `linear-gradient(135deg,${it.color},${it.color2})`;
  if (it.kind === "lane") return it.id === "rainbow" ? "linear-gradient(90deg,#FF4F79,#FFB547,#4FE3C1,#5B8CFF,#B98CFF)" : it.id === "plain" ? "var(--surface2)" : "repeating-linear-gradient(135deg,var(--violet) 0 3px,transparent 3px 7px)";
  if (it.kind === "color") return it.id === "rainbow" ? "conic-gradient(#FF4F79,#FFB547,#F7F06D,#4FE3C1,#5B8CFF,#B98CFF,#FF4F79)" : it.hex;
  if (it.kind === "combo" && it.id === "holo") return "conic-gradient(#8FD3FF,#7A9CFF,#FF8FE0,#8FD3FF)";
  if (it.kind === "combo") return it.id === "prism" ? "conic-gradient(#FF4F79,#FFB547,#F7F06D,#4FE3C1,#5B8CFF,#B98CFF,#FF4F79)" : `linear-gradient(90deg,${it.c1} 50%,${it.c2} 50%)`;
  if (it.kind === "theme") return `linear-gradient(135deg,${it.ink} 45%,${it.accent} 45%)`;
  return null;
}

function statusLabel(it) {
  if (it.kind === "box") return boxLeft(it) ? (freeMode ? "FREE" : `${it.price.toLocaleString()} coins`) : "All collected";
  if (isOwned(it)) return isEquipped(it) ? (it.kind === "color" ? "In use" : "Equipped") : isOwnedReal(it) ? "Owned" : "Trial";
  return freeMode ? "FREE" : `${it.price.toLocaleString()} coins`;
}

function renderStore() {
  const list = $("storeList");
  const cats = stLevel === "cats";
  renderStoreTools();
  if (!cats) stItem = clamp(stItem, 0, Math.max(0, stItems().length - 1));
  const entries = cats ? CATS.map(c => { if (c.id === "boxes") return { title: c.name, sub: "3 boxes", meta: "Exclusives inside" };
      const l = filterSort(c.items()); return { title: c.name, sub: l.length ? `${l.length} item${l.length === 1 ? "" : "s"}` : "Nothing in this color", meta: `${l.filter(isOwned).length} owned` }; })
    : stItems().map(it => ({ it, title: it.name, sub: (stQuery ? `${KIND_LABEL[it.kind]} \u00B7 ${catOf(it).name}` : KIND_LABEL[it.kind]) + (FAM_BY[famOf(it)] ? ` \u00B7 ${FAM_BY[famOf(it)].name}` : famOf(it) === "multi" ? " \u00B7 Rainbow" : ""), meta: statusLabel(it) }));
  const idx = cats ? stCat : stItem, key = (cats ? "cats" : stQuery ? "search:" + stQuery : "items" + stCat) + "|" + stFam + "|" + stSort;
  $("stNoMatch").hidden = !(!cats && !entries.length);
  $("stNoMatch").textContent = stQuery ? "Nothing in the store matches your search." : "Nothing here in this color. Pick another color above.";
  const anchor = listAnchor(list, idx, entries.length);
  const place = (b, i) => {
    const d = i - idx, en = entries[i];
    b.className = "song" + (d === 0 ? " sel" : "") + (en.it && isOwned(en.it) ? " owned" : "");
    b.querySelector(".meta").textContent = en.meta;
    b.style.transform = `translateY(${anchor + d * 96}px) scale(${d === 0 ? 1 : 0.93})`;
    b.style.opacity = d === 0 ? 1 : Math.max(0.15, 0.6 - Math.abs(d) * 0.15);
    b.tabIndex = d === 0 ? 0 : -1;
  };
  // same list as before: just slide the rows (smooth); new list: rebuild and fade it in
  if (list.dataset.key === key && list.children.length === entries.length) {
    [...list.children].forEach(place);
  } else {
    list.innerHTML = ""; list.dataset.key = key;
    entries.forEach((en, i) => {
      const b = document.createElement("button");
      b.innerHTML = `<span class="num"></span><span class="txt"><span class="t"></span><span class="a"></span></span><span class="meta"></span>`;
      const sw = en.it && swatchCss(en.it);
      if (en.it && en.it.kind === "icon") b.querySelector(".num").innerHTML = iconSvg(en.it.id);
      else if (sw) b.querySelector(".num").innerHTML = `<i class="dotbig" style="background:${sw}"></i>`;
      else b.querySelector(".num").textContent = String(i + 1).padStart(2, "0");
      b.querySelector(".t").textContent = en.title;
      if (en.it && en.it.kind === "font") b.querySelector(".t").style.fontFamily = `"${en.it.id}", system-ui, sans-serif`;
      b.querySelector(".a").textContent = en.sub;
      b.addEventListener("click", () => {
        const cur = stLevel === "cats" ? stCat : stItem;
        if (i === cur) storeActivate();
        else { if (stLevel === "cats") stCat = i; else stItem = i; renderStore(); }
      });
      place(b, i);
      list.appendChild(b);
    });
    list.classList.remove("swap"); void list.offsetWidth; list.classList.add("swap");
  }
  renderStoreInfo();
}

function renderStoreInfo() {
  const it = stCurrent(), cat = stQuery && it ? catOf(it) : curCat(), act = $("stAction");
  $("storeCrumb").textContent = stLevel === "cats" ? "Store" : stQuery ? "Store \u203A Search" : `Store \u203A ${cat.name}`;
  if (!it && stLevel === "items" && !stQuery) { $("stMeta").textContent = cat.name; $("stTitle").textContent = "No items"; $("stDesc").textContent = "Nothing in this category matches the color you picked."; $("stPrice").innerHTML = ""; act.textContent = "Show all colors"; act.disabled = false; $("stNote").textContent = ""; fitBig($("stTitle")); return; }
  if (!it && stQuery) { $("stMeta").textContent = "Search"; $("stTitle").textContent = "No results"; $("stDesc").textContent = "Try a different word, like a color, \u201Cpink\u201D or \u201Canimated\u201D."; $("stPrice").innerHTML = ""; act.textContent = "Clear search"; act.disabled = false; $("stNote").textContent = ""; fitBig($("stTitle")); return; }
  $("stTitle").style.fontFamily = it && it.kind === "font" ? `"${it.id}", system-ui, sans-serif` : "";
  act.disabled = false;
  if (!it) {
    $("stMeta").textContent = "Category";
    $("stTitle").textContent = cat.name;
    $("stDesc").textContent = cat.desc;
    $("stPrice").innerHTML = "";
    act.textContent = "Open"; $("stNote").textContent = "";
  } else if (it.kind === "box") {
    $("stMeta").textContent = `${cat.name} \u00B7 ${["Common", "Rare", "Epic"][it.tier - 1]}`;
    if ($("stTitle").textContent !== it.name) { const el = $("stTitle"); el.classList.remove("swap"); void el.offsetWidth; el.classList.add("swap"); }
    $("stTitle").textContent = it.name;
    const { ex, reg } = boxPools(it), exAll = ALL_ITEMS().filter(i => i.boxOnly && i.tier === it.tier), left = ex.length + reg.length;
    $("stDesc").textContent = `One random item you don't own yet, from items normally worth ${it.hi > 9000 ? `${it.lo - 1}+ coins` : `${it.lo === 401 ? 400 : it.lo}\u2013${it.hi} coins`}. `
      + `${Math.round(BOX_EXCLUSIVE_CHANCE * 100)}% chance of a box exclusive: ${exAll.map(i => i.name + (isOwned(i) ? " (got it)" : "")).join(", ")}. `
      + (left ? `${left} item${left > 1 ? "s" : ""} left to win.` : "You've collected everything in this box.");
    const p = priceOf(it);
    $("stPrice").innerHTML = `<i class="coin sm"></i><b>${p.toLocaleString()}</b>` + (freeMode ? ` <s>${it.price.toLocaleString()}</s>` : "");
    act.textContent = !left ? "All collected" : p ? `Open for ${p.toLocaleString()}` : "Open it free";
    act.disabled = !left || COINS < p;
    $("stNote").textContent = left && COINS < p ? `You need ${(p - COINS).toLocaleString()} more coins.` : "";
  } else {
    $("stMeta").textContent = `${cat.name} \u00B7 ${KIND_LABEL[it.kind]}`;
    if ($("stTitle").textContent !== it.name) { const el = $("stTitle"); el.classList.remove("swap"); void el.offsetWidth; el.classList.add("swap"); }
    $("stTitle").textContent = it.name;
    $("stDesc").textContent = it.desc;
    const owned = isOwnedReal(it), p = priceOf(it), trial = !owned && isOwned(it);
    $("stPrice").innerHTML = owned ? `<span class="owned-tag">Owned</span>`
      : `<i class="coin sm"></i><b>${p.toLocaleString()}</b>` + (freeMode && it.price ? ` <s>${it.price.toLocaleString()}</s>` : "");
    if (trial) {   // EverythingInterlude: try it now, buy it to keep it
      const eq = isEquipped(it);
      act.textContent = it.kind === "color" ? (p ? `Buy for ${p.toLocaleString()}` : "Get it free") : eq ? "Equipped" : "Equip";
      act.disabled = it.kind === "color" ? COINS < p : eq;
      $("stNote").textContent = `EverythingInterlude: yours to use for ${trialLeft()}. Buy it to keep it` + (it.kind === "color" ? "." : " (press B).");
    } else if (!owned) {
      act.textContent = p ? `Buy for ${p.toLocaleString()}` : "Get it free";
      act.disabled = COINS < p;
      $("stNote").textContent = COINS < p ? `You need ${(p - COINS).toLocaleString()} more coins.` : "";
    } else if (it.kind === "color") {
      act.textContent = "Owned"; act.disabled = true;
      $("stNote").textContent = "Put it on a lane's base or outline in Inventory.";
    } else {
      const eq = isEquipped(it);
      act.textContent = eq ? "Equipped" : "Equip"; act.disabled = eq;
      $("stNote").textContent = "";
    }
  }
  fitBig($("stTitle"));
  if (it && it.kind === "font" && document.fonts && document.fonts.load) document.fonts.load(`800 40px "${it.id}"`).then(() => fitBig($("stTitle")), () => {});
}

function storeActivate(buyAnyway) {
  if (stLevel === "cats") { stLevel = "items"; stItem = 0; renderStore(); return; }
  const it = stCurrent(); if (!it) { if (stQuery) clearStoreSearch(); else if (stFam) { stFam = ""; renderStore(); } return; }
  if (it.kind === "box") { openBox(it); return; }
  if (!isOwnedReal(it) && (!isOwned(it) || it.kind === "color" || buyAnyway)) {
    const p = priceOf(it);
    if (COINS < p) return;
    if (p) setCoins(COINS - p, -p);
    OWNED[OWN_KEY[it.kind]].push(it.id); saveOwned();
    $("stNote").textContent = "";
    bumpStat("bought"); checkAch(); taskEvent({ type: "buy" });
  } else equipItem(it);
  renderStore();
}

function storeBack() {
  if (stQuery) clearStoreSearch();
  else if (stLevel === "items") { stLevel = "cats"; renderStore(); } else show("menu");
}

function setStoreSearch(v) {
  stQuery = v.trim().toLowerCase();
  if (stQuery) { stLevel = "items"; stItem = 0; } else stLevel = "cats";
  renderStore();
}

function clearStoreSearch() { $("storeSearch").value = ""; setStoreSearch(""); }
$("storeSearch").addEventListener("input", (e) => setStoreSearch(e.target.value));

function moveStore(d, wrap) {
  if (stLevel === "cats") stCat = stepIdx(stCat, d, CATS.length, wrap);
  else stItem = stepIdx(stItem, d, stItems().length, wrap);
  renderStore();
}

function redeem() {
  const v = $("codeIn").value.trim();
  const COIN_CODES = { rhodes: 5000, friends: 1500, odds: 3000 };   // one-time coin codes, once per browser (shared by both saves, survives resets)
  const code = v.toLowerCase();
  if (COIN_CODES[code]) {
    const rd = k => { try { const x = JSON.parse(localStorage.getItem(k) || "[]"); return Array.isArray(x) ? x : []; } catch (e) { return []; } };
    const used = [...new Set([...rd("lalio.codes"), ...rd("flipside.codesUsed"), ...rd("lalio.s2.codesUsed")])], amt = COIN_CODES[code];
    if (used.includes(code)) $("codeMsg").textContent = "This code has already been used on this device.";
    else { used.push(code); try { localStorage.setItem("lalio.codes", JSON.stringify(used)); } catch (e) {} setCoins(COINS + amt, amt); $("codeMsg").textContent = `Code accepted. ${amt.toLocaleString()} coins added.`; bumpStat("codes"); checkAch(); }
  } else if (code === "boys") {   // unlocks the secret themes on this save
    const ids = THEMES.filter(t => t.hidden).map(t => t.id), fresh = ids.filter(id => !OWNED.themes.includes(id));
    if (!fresh.length) $("codeMsg").textContent = "You already have the Knuckles, Shadow and Silver themes. Find them in Inventory.";
    else { OWNED.themes.push(...fresh); saveOwned(); $("codeMsg").textContent = "Code accepted. The Knuckles, Shadow and Silver themes are now in your Inventory."; bumpStat("codes"); checkAch(); }
  } else if (code === "everythinginterlude") {
    TRIAL_UNTIL = Date.now() + 120000; store.set("trialUntil", TRIAL_UNTIL); bumpStat("codes"); checkAch();
    $("codeMsg").textContent = "Code accepted. Everything in the Store is yours to use for 2 minutes. Nothing is added to what you own."; updateTrial();
  } else if (v.toLowerCase() === "234mini") {
    freeMode = true; $("freeBanner").hidden = false; bumpStat("codes"); checkAch();
    $("codeMsg").textContent = "Code accepted. Everything is free until you leave the Store.";
  } else $("codeMsg").textContent = v ? "That code doesn't work." : "";
  $("codeIn").value = "";
  renderStore();
}

/* mystery boxes */
const ALL_ITEMS = () => [...FONT_ITEMS, ...SHAPES, ...COLORS, ...EFFECTS, ...COMBOS, ...THEMES, ...LANES, ...TRAILS, ...ICONS].filter(i => !i.hidden);

function boxPools(box) {
  const mine = ALL_ITEMS().filter(i => !isOwnedReal(i));
  return { ex: mine.filter(i => i.boxOnly && i.tier === box.tier), reg: mine.filter(i => !i.boxOnly && i.price >= box.lo && i.price <= box.hi) };
}

const boxLeft = (box) => { const p = boxPools(box); return p.ex.length + p.reg.length; };

function rollBox(box) {
  const { ex, reg } = boxPools(box);
  if (!ex.length && !reg.length) return null;
  const list = ex.length && (!reg.length || Math.random() < BOX_EXCLUSIVE_CHANCE) ? ex : reg;
  return list[Math.floor(Math.random() * list.length)];
}

let boxAnim = null;

function openBox(box) {
  const p = priceOf(box);
  if (COINS < p) return;   // (if it turns out you own everything in it, the coins go straight back)
  if (p) setCoins(COINS - p, -p);
  const item = rollBox(box);
  if (!item) { if (p) setCoins(COINS + p, p); renderStore(); $("stNote").textContent = `You already own everything in the ${box.name}, so your ${p.toLocaleString()} coins were returned.`; return; }
  OWNED[OWN_KEY[item.kind]].push(item.id); saveOwned();
  bumpStat("boxes"); if (box.tier === 3) bumpStat("goldBoxes"); taskEvent({ type: "box" });
  boxAnim = { box, item, t0: performance.now(), shown: false };
  $("boxResult").hidden = true; $("boxOpen").hidden = false;
  renderStore();
}

function showBoxResult() {
  const { box, item } = boxAnim; boxAnim.shown = true;
  $("boxRarity").textContent = item.boxOnly ? `Box exclusive \u00B7 ${box.name}` : box.name;
  $("boxRarity").style.color = item.boxOnly ? box.color : "";
  $("boxItem").textContent = item.name;
  $("boxItem").style.fontFamily = item.kind === "font" ? `"${item.id}", system-ui, sans-serif` : "";
  const sw = swatchCss(item); $("boxSwatch").hidden = !sw; if (sw) $("boxSwatch").style.background = sw;
  $("boxKind").textContent = `${KIND_LABEL[item.kind]} \u00B7 worth ${item.price.toLocaleString()} coins` + (item.kind === "color" ? " \u00B7 put it on a lane in Inventory" : "");
  $("boxEquip").hidden = item.kind === "color";
  $("boxAgain").hidden = !boxLeft(box);
  $("boxAgain").disabled = COINS < priceOf(box);
  $("boxAgain").innerHTML = `Open another <small>${priceOf(box) ? priceOf(box).toLocaleString() + " coins" : "free"}</small>`;
  $("boxResult").hidden = false;
  setTimeout(() => ($("boxEquip").hidden ? $("boxClose") : $("boxEquip")).focus({ preventScroll: true }), 0);
  checkAch();
}

function closeBox() { $("boxOpen").hidden = true; boxAnim = null; renderStore(); }
$("boxEquip").addEventListener("click", () => { if (boxAnim) equipItem(boxAnim.item); closeBox(); });
$("boxAgain").addEventListener("click", () => { if (boxAnim) { const b = boxAnim.box; $("boxOpen").hidden = true; openBox(b); } });
$("boxClose").addEventListener("click", closeBox);

// a little gift box; open = 0..1 lifts the lid off
function drawBoxArt(g, cx, cy, size, box, now, open) {
  const bob = Math.sin(now / 500) * size * 0.04, w = size, h = size * 0.72, x = cx - w / 2, y = cy - h / 2 + size * 0.1 + bob;
  g.save();
  g.shadowColor = box.color; g.shadowBlur = 18 + 10 * Math.sin(now / 400);
  const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, box.color); gr.addColorStop(1, box.color2);
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.shadowBlur = 0;
  g.fillStyle = "rgba(255,255,255,.85)"; g.fillRect(cx - w * 0.07, y, w * 0.14, h);   // ribbon
  const ly = y - size * 0.18 - open * size * 1.2, rot = open * 0.6;
  g.translate(cx, ly + size * 0.09); g.rotate(rot);
  g.fillStyle = gr; g.fillRect(-w * 0.56, -size * 0.09, w * 1.12, size * 0.18);
  g.fillStyle = "rgba(255,255,255,.9)"; g.fillRect(-w * 0.07, -size * 0.09, w * 0.14, size * 0.18);
  g.beginPath(); g.ellipse(-w * 0.12, -size * 0.14, w * 0.12, size * 0.07, -0.5, 0, 7); g.ellipse(w * 0.12, -size * 0.14, w * 0.12, size * 0.07, 0.5, 0, 7); g.fill();
  g.restore();
  g.font = `800 ${Math.round(size * 0.34)}px ${canvasFont()}`; g.textAlign = "center"; g.textBaseline = "middle";
  if (open < 0.05) { g.fillStyle = "rgba(0,0,0,.35)"; g.fillText("?", cx, y + h / 2 + 2); }
}

function drawBoxAnim(now) {
  if (!boxAnim) return;
  const [g, W, H] = fitCanvas($("boxCanvas")); g.clearRect(0, 0, W, H);
  const { box } = boxAnim, e = (now - boxAnim.t0) / 1000, size = Math.min(130, W * 0.36);
  if (e < 1.4) {   // shake harder and harder
    const k = e / 1.4, sh = Math.sin(e * 55) * size * 0.06 * k * k, r = Math.sin(e * 43) * 0.08 * k;
    g.save(); g.translate(W / 2 + sh, H * 0.58); g.rotate(r); drawBoxArt(g, 0, 0, size, box, now, 0); g.restore();
  } else {
    if (!boxAnim.shown) showBoxResult();
    const k = Math.min(1, (e - 1.4) / 0.5), rays = 14;
    g.save(); g.translate(W / 2, H * 0.5); g.rotate(now / 2400);
    for (let i = 0; i < rays; i++) { g.rotate(Math.PI * 2 / rays); g.fillStyle = `rgba(${hexRgb(box.color)},${0.12 * k})`; g.beginPath(); g.moveTo(0, 0); g.lineTo(-18, -H); g.lineTo(18, -H); g.closePath(); g.fill(); }
    g.restore();
    const fl = Math.max(0, 1 - (e - 1.4) / 0.35); if (fl > 0) { g.fillStyle = `rgba(255,255,255,${fl * 0.8})`; g.fillRect(0, 0, W, H); }
    drawBoxArt(g, W / 2, H * 0.64, size, box, now, Math.min(1, (e - 1.4) / 0.4));
    const col = boxAnim.item.kind === "color" ? colorHex(boxAnim.item.id, 0, now) : box.color;
    g.save(); g.shadowColor = col; g.shadowBlur = 30; g.fillStyle = col; g.globalAlpha = k;
    g.beginPath(); g.arc(W / 2, H * 0.36 - 10 * Math.sin(now / 400), 16 + 4 * Math.sin(now / 300), 0, 7); g.fill(); g.restore();
  }
}

let trialWas = trialOn();

function updateTrial() {
  const on = trialOn();
  $("trialBanner").hidden = !on || screen === "game";
  if (on) $("trialBanner").textContent = `EverythingInterlude: everything unlocked for ${trialLeft()}`;
  if (on && !trialWas && screen === "store") renderStore();
  if (!on && trialWas && screen !== "game") {   // time's up: anything you don't own goes back to your own items
    TRIAL_UNTIL = 0; store.set("trialUntil", 0);
    validateEquip();
    if (!OWNED.fonts.includes(settings.font)) setFont("Syne", false);
    saveEquip(); applyEquip(); renderAcct();
    if (screen === "store") renderStore(); if (screen === "inventory") renderInventory();
    toast({ label: "Code ended", name: "EverythingInterlude is over", desc: "Your own items are back on.", icon: '<i class="coin"></i>' });
  }
  if (on || screen !== "game") trialWas = on;
}

setInterval(updateTrial, 500);
function endFreeMode() { freeMode = false; $("freeBanner").hidden = true; $("codeMsg").textContent = ""; $("codeIn").value = ""; }
let stWheelAcc = 0, stWheelLock = 0;

$("store").addEventListener("wheel", (e) => {
  if (e.target.closest && e.target.closest(".codebox")) return;
  e.preventDefault();
  const now = performance.now();
  stWheelAcc += e.deltaY;
  if (Math.abs(stWheelAcc) > 40 && now > stWheelLock) { moveStore(Math.sign(stWheelAcc)); stWheelAcc = 0; stWheelLock = now + 140; }
}, { passive: false });
