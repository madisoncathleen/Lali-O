/*
 * LALI-O - shop/generated-items.js
 * Generated shop items, spread evenly across colour families.
 */
"use strict";

const FAMS = [
  { id: "red", name: "Red", adj: "Crimson", h: 355, dot: "#FF3B3B" }, { id: "orange", name: "Orange", adj: "Amber", h: 26, dot: "#FF8A1F" },
  { id: "yellow", name: "Yellow", adj: "Golden", h: 50, dot: "#FFD21F" }, { id: "green", name: "Green", adj: "Emerald", h: 140, dot: "#2ECC71" },
  { id: "cyan", name: "Cyan", adj: "Aqua", h: 182, dot: "#1CC7D0" }, { id: "blue", name: "Blue", adj: "Cobalt", h: 222, dot: "#3B6BFF" },
  { id: "purple", name: "Purple", adj: "Violet", h: 270, dot: "#9A5CFF" }, { id: "pink", name: "Pink", adj: "Rose", h: 322, dot: "#FF5FB0" },
  { id: "neutral", name: "Black & White", adj: "Silver", h: 230, dot: "#B8B8C4" },
];

const FAM_BY = byId(FAMS);

// which colour family a hex colour belongs to
function famOfHex(hex) {
  if (!hex) return "multi";
  const n = parseInt(hex.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (s < 0.2 || l < 0.12 || l > 0.94) return "neutral";
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360;
  return h < 15 || h >= 345 ? "red" : h < 42 ? "orange" : h < 70 ? "yellow" : h < 165 ? "green" : h < 195 ? "cyan" : h < 255 ? "blue" : h < 290 ? "purple" : "pink";
}

function famOf(it) {
  if (it.fam) return it.fam;
  switch (it.kind) {
    case "color": return it.hex ? famOfHex(it.hex) : "multi";
    case "combo": return it.c1 ? famOfHex(it.c1) : "multi";
    case "theme": return famOfHex(it.accent);
    case "lane": return it.tint ? famOfHex(it.tint) : it.pink ? "pink" : it.id === "rainbow" ? "multi" : "any";
    case "effect": return it.tint ? famOfHex(it.tint) : "any";
  }
  return "any";
}

// ---- note colours: 6 per family plus an animated shimmer
const NEW_COLORS = {
  red: [["Scarlet", "#FF2E3A"], ["Cherry", "#D7263D"], ["Ruby", "#C3113A"], ["Tomato", "#FF5A4E"], ["Brick", "#B5452E"], ["Rosewood", "#9E2A3A"]],
  orange: [["Pumpkin", "#FF7518"], ["Apricot", "#FFB07A"], ["Copper", "#D9733B"], ["Mango", "#FF9F1C"], ["Rust", "#C4561C"], ["Papaya", "#FFA96B"]],
  yellow: [["Canary", "#FFEF5A"], ["Sunflower", "#FFC61A"], ["Butter", "#FFE9A3"], ["Mustard", "#D9A21B"], ["Honey", "#F5C83D"], ["Citrine", "#E8D11E"]],
  green: [["Mint Leaf", "#3DDC97"], ["Forest", "#1F8A4C"], ["Jade", "#00A86B"], ["Sage", "#8FB996"], ["Chartreuse", "#B8F23A"], ["Pine", "#2E6B4F"]],
  cyan: [["Aqua", "#2FF3E0"], ["Turquoise", "#1CC7C1"], ["Teal", "#0F9B8E"], ["Lagoon", "#34B3C9"], ["Frost", "#A6F0FF"], ["Pool", "#3FD2F0"]],
  blue: [["Sapphire", "#1F4FD9"], ["Navy", "#203A8C"], ["Cornflower", "#6A8DFF"], ["Denim", "#3D63B8"], ["Baby Blue", "#9CC8FF"], ["Electric", "#2E7BFF"]],
  purple: [["Amethyst", "#9A5CFF"], ["Grape", "#6B2FD6"], ["Plum", "#8E3FA8"], ["Orchid", "#C27BFF"], ["Iris", "#9C6BFF"], ["Mulberry", "#6E2E86"]],
  pink: [["Fuchsia", "#FF2EB8"], ["Salmon", "#FF8CB0"], ["Watermelon", "#FF4F88"], ["Peony", "#F7A1C4"], ["Taffy", "#FF7FD0"], ["Raspberry", "#E0356E"]],
  neutral: [["Charcoal", "#3A3A46"], ["Pearl", "#EDEAF5"], ["Ash", "#9A9AA8"], ["Ivory", "#FFF6E0"], ["Smoke", "#6E6E7E"], ["Graphite", "#4F4F5E"]],
};

const SHIMMER_NAMES = { red: "Ember Glow", orange: "Sunset Glow", yellow: "Gold Glitter", green: "Aurora Green", cyan: "Sea Glass", blue: "Deep Ocean", purple: "Nebula", pink: "Pink Sparkle", neutral: "Moonlight" };

for (const f of FAMS) {
  NEW_COLORS[f.id].forEach(([name, hex]) => COLORS.push({ kind: "color", id: "c-" + name.toLowerCase().replace(/\s+/g, ""), name, hex, price: 150, fam: f.id,
    desc: "A note colour. In Inventory you can use it as the base or the outline on any lane." }));
  COLORS.push({ kind: "color", id: "shim-" + f.id, name: SHIMMER_NAMES[f.id], hex: null, shimmer: f.id, price: 700, fam: f.id,
    desc: `An animated ${f.name === "Black & White" ? "silvery" : f.name.toLowerCase()} shimmer. Use it as a base or outline on any lane.` });
}

// ---- combo colours: 5 per family
const COMBO_NAMES = {
  red: ["Firestarter", "Heartbeat", "Crimson Tide", "Cherry Bomb", "Lava Lamp"], orange: ["Blaze", "Tangerine Dream", "Autumn", "Fireball", "Solar Flare"],
  yellow: ["Sunshine", "Lemonade", "Gold Standard", "Honeycomb", "Spark"], green: ["Evergreen", "Lime Twist", "Rainforest", "Radioactive", "Clover"],
  cyan: ["Tidal", "Glacier", "Lagoon", "Arctic", "Riptide"], blue: ["Midnight Blue", "Sapphire Rush", "Blue Moon", "Skyline", "Hyperdrive"],
  purple: ["Twilight", "Ultraviolet", "Royal Grape", "Mystic", "Starfall"], pink: ["Bubblegum Burst", "Crush", "Cotton Candy", "Valentine", "Flamingo Pop"],
  neutral: ["Black Ice", "Chrome Plated", "Static", "Newsprint", "Pearl Drop"],
};

for (const f of FAMS) {
  const P = NEW_COLORS[f.id];
  const pairs = [[1, 0], [0, 2], [3, 5], [4, 1], [5, 3]];
  pairs.forEach(([a, b], k) => COMBOS.push({ kind: "combo", id: `cb-${f.id}${k}`, name: COMBO_NAMES[f.id][k], c1: P[a][1], c2: P[b][1], price: 350 + k * 40, fam: f.id,
    desc: "The colour your combo glows at 100+, and again at 300+." }));
}

// ---- themes: 3 still + 2 animated per family
function makeTheme(id, name, h, sat, accent, extra) {
  const L = (s, l) => hsl2hex(h, s, l), rgb = (hex) => hexRgb(hex);
  const th = Object.assign({ id, name, kind: "theme", ink: L(sat * 0.4, 4.5), surface: L(sat * 0.35, 9), surface2: L(sat * 0.33, 12.5), line: L(sat * 0.3, 23),
    accent, field: rgb(L(sat * 0.4, 6)), glow: rgb(accent), hueA: h - 25, hueSpan: 60, sat: Math.min(95, sat + 10) }, extra);
  th.accentRgb = hexRgb(th.accent); th.inkRgb = hexRgb(th.ink);
  th.desc = (th.anim ? "Animated: " : "") + th.desc + " Changes the menus, backgrounds and playfield.";
  return th;
}

const THEME_SET = {
  red: [["Crimson Night", 90, 62, "Deep red with a hot crimson glow."], ["Red Alert", 100, 55, "Sirens-bright red on black."], ["Rose Quartz", 55, 78, "Soft dusty reds and blush."],
    ["Heat Wave", "embers", "Sparks drifting up through a red haze."], ["Love Letters", "hearts", "Little red hearts floating away."]],
  orange: [["Tangerine", 95, 60, "Juicy orange on a warm dark base."], ["Campfire", 80, 55, "Glowing coals and deep browns."], ["Peach Fuzz", 60, 78, "Soft peach tones."],
    ["Bonfire", "embers", "A roaring fire sending up sparks."], ["Harvest Moon", "fireflies", "Warm lights drifting in an autumn night."]],
  yellow: [["Lemon Drop", 95, 62, "Zesty yellow on black."], ["Honeycomb", 85, 55, "Golden honey and amber."], ["Buttercup", 65, 80, "Soft pastel yellow."],
    ["Golden Hour", "fireflies", "Glittering golden lights."], ["Starlight Gold", "stars", "A sky of golden stars."]],
  green: [["Emerald City", 85, 55, "Rich emerald greens."], ["Matrix", 100, 50, "Terminal green, turned up."], ["Matcha", 45, 72, "Calm, soft tea greens."],
    ["Jungle Rain", "rain", "Rain falling through a green jungle."], ["Firefly Forest", "fireflies", "Green fireflies deep in the woods."]],
  cyan: [["Lagoon", 85, 55, "Tropical turquoise water."], ["Cyberpunk Cyan", 100, 55, "Electric cyan neon."], ["Sea Foam", 50, 78, "Pale, misty aqua."],
    ["Deep Dive", "bubbles", "Bubbles rising through clear water."], ["Frozen Lake", "snow", "Snow falling on icy blue-green."]],
  blue: [["Midnight Blue", 80, 60, "Classic deep-night blue."], ["Blue Neon", 100, 58, "Glowing electric blue."], ["Powder Blue", 55, 80, "Soft sky blue."],
    ["Thunderstorm", "rain", "Heavy rain on a dark blue night."], ["Galaxy", "stars", "Drifting stars in deep blue space."]],
  purple: [["Royal Purple", 80, 62, "Regal purple and gold-free violet."], ["Synth Violet", 100, 62, "Bright synthwave violet."], ["Lavender Haze", 50, 80, "Soft lavender mist."],
    ["Cosmic Dust", "stars", "Violet stars twinkling in a nebula."], ["Amethyst Aurora", "aurora", "Purple ribbons of aurora."]],
  pink: [["Hot Pink", 100, 62, "Loud, proud pink."], ["Strawberry", 85, 66, "Sweet strawberry reds and pinks."], ["Blossom", 55, 82, "Soft cherry-blossom pink."],
    ["Petal Storm", "petals", "A flurry of pink petals."], ["Bubble Pop", "bubbles", "Pink bubbles floating up."]],
  neutral: [["Noir", 0, 90, "Black, white and nothing else."], ["Slate", 12, 72, "Cool greys with a hint of blue."], ["Paper Moon", 8, 85, "Soft warm greys."],
    ["Blizzard", "snow", "A heavy white snowfall."], ["Silver Screen", "stars", "Classic silver starlight."]],
};

for (const f of FAMS) THEME_SET[f.id].forEach((row, k) => {
  const neutral = f.id === "neutral";
  if (typeof row[1] === "number") {
    const [name, sat, light, desc] = row, s0 = neutral ? row[1] : sat;
    THEMES.push(makeTheme(`th-${f.id}${k}`, name, f.h, neutral ? s0 : Math.min(60, sat * 0.6), hsl2hex(f.h, neutral ? s0 : sat, light), { price: 700 + k * 100, fam: f.id, desc }));
  } else {
    const [name, anim, desc] = row, acc = hsl2hex(f.h, neutral ? 10 : 90, neutral ? 85 : 64);
    THEMES.push(makeTheme(`th-${f.id}${k}`, name, f.h, neutral ? 8 : 55, acc, { price: 1200 + (k - 3) * 200, fam: f.id, anim, fx: hexRgb(hsl2hex(f.h, neutral ? 10 : 90, neutral ? 88 : 70)), desc }));
  }
});

// ---- lane backgrounds tinted in one colour (on top of the ones that use each lane's own colour)
const LANE_TINTS = [["fade", "Glow", 350], ["neon", "Neon", 450], ["dots", "Dots", 350], ["sparkle", "Sparkle", 550], ["coderain", "Code", 650]];

for (const f of FAMS) {
  const tint = f.id === "neutral" ? "#E8E8F0" : hsl2hex(f.h, 90, 66);
  LANE_TINTS.forEach(([pat, nm, price]) => LANES.push({ kind: "lane", id: `ln-${pat}-${f.id}`, pat, tint, fam: f.id, name: `${f.adj} ${nm}`, price,
    desc: `The ${nm.toLowerCase()} pattern in ${f.name === "Black & White" ? "silver" : f.name.toLowerCase()} on every lane. Shown behind the notes.` }));
}

// a few more patterns that use each lane's own colour
LANES.push(
  { kind: "lane", id: "hexgrid", pat: "hexgrid", name: "Honeycomb", price: 450, desc: "A hexagon grid that scrolls with the notes. Shown behind the notes." },
  { kind: "lane", id: "waves", pat: "waves", name: "Waves", price: 500, desc: "Wavy lines that flow along with the notes. Shown behind the notes." },
  { kind: "lane", id: "rings", pat: "rings", name: "Rings", price: 450, desc: "Circles that scroll along with the notes. Shown behind the notes." },
  { kind: "lane", id: "zigzag", pat: "zigzag", name: "Zigzag", price: 400, desc: "A bold zigzag running down every lane. Shown behind the notes." });

// ---- hit effects tinted in one colour
const EFFECT_TINTS = [["burst", "Burst", 350], ["sparks", "Sparks", 450], ["ripple", "Ripple", 400], ["nova", "Nova", 600]];

for (const f of FAMS) {
  const tint = f.id === "neutral" ? "#F0F0F6" : hsl2hex(f.h, 92, 64);
  EFFECT_TINTS.forEach(([base, nm, price]) => EFFECTS.push({ kind: "effect", id: `fx-${base}-${f.id}`, base, tint, fam: f.id, name: `${f.adj} ${nm}`, price,
    desc: `The ${nm.toLowerCase()} effect, always in ${f.name === "Black & White" ? "silver" : f.name.toLowerCase()} instead of your hit rating's colour.` }));
}

// ---- new note shapes
SHAPES.push(...[
  ["tri", "Delta", 350, "A triangle that points the way it's moving."], ["ring1", "Halo", 400, "A single glowing ring."], ["cross1", "Plus", 350, "A chunky plus sign."],
  ["hex1", "Hexagon", 400, "A single hexagon in the middle of the lane."], ["oct", "Octagon Bar", 300, "A bar with clipped corners."], ["shard", "Shard", 400, "A sharp, slanted sliver."],
  ["twin", "Twin Bars", 350, "Two thin bars stacked together."], ["dash", "Dash", 250, "A slim, simple line."], ["petal1", "Petal", 450, "A single leaf-shaped petal."],
  ["square1", "Cube", 350, "A single rounded square."], ["moon1", "Crescent", 500, "A crescent moon in the middle of the lane."],
].map(([id, name, price, desc]) => ({ kind: "shape", id, name, price, desc: desc + " Changes notes, long notes and the hit markers." })));

// hollow versions of every shape: the same outline, see-through with a bold rim
const SHAPE_BASE = { hollow: "bar" };

for (const sh of SHAPES.slice()) {
  if (sh.id === "bar" || sh.id === "hollow" || sh.hollowOf) continue;
  const id = "h-" + sh.id; SHAPE_BASE[id] = sh.id;
  SHAPES.push({ kind: "shape", id, hollowOf: sh.id, name: "Hollow " + sh.name, price: Math.max(150, sh.price) + 50,
    desc: `A see-through ${sh.name.toLowerCase()} with a bold rim. Changes notes, long notes and the hit markers.` });
}

const baseShape = (id) => SHAPE_BASE[id] && id !== "hollow" ? SHAPE_BASE[id] : id;
const isHollowShape = (id) => id === "hollow" || !!(SHAPE_BASE[id] && id !== "hollow");

// ---- note trails (new category)
THEMES.push(
  makeTheme("th-matrix", "Matrix Rain", 135, 55, "#3DFF7A", { price: 1500, fam: "green", anim: "matrix", fx: "61,255,122", desc: "Streams of green code pour down the screen." }),
  makeTheme("th-cybercode", "Cyber Code", 190, 55, "#35E8FF", { price: 1500, fam: "cyan", anim: "binary", fx: "53,232,255", desc: "Glowing 0s and 1s rain down in electric cyan." }));

const TRAILS = [
  ["none", "No Trail", 0, "Notes with nothing behind them."], ["glow", "Short Glow", 300, "A short soft glow behind every note."], ["long", "Long Glow", 450, "A long glowing streak behind every note."],
  ["comet", "Comet", 550, "A tapered comet tail."], ["sparkle", "Stardust", 600, "Twinkling sparkles left behind each note."], ["ghost", "Afterimage", 650, "Faded copies of each note trailing behind it."],
  ["speed", "Speed Lines", 500, "Thin motion lines, like it's going fast."], ["fire", "Flame Trail", 800, "A flickering flame behind every note."], ["rainbow", "Rainbow Trail", 900, "A rainbow streak behind every note."],
].map(([id, name, price, desc]) => ({ kind: "trail", id, name, price, desc: desc + " Uses each lane's colour." }));

// ---- profile icons (new category)
const ICON_PATHS = {
  person: "M12 3.8a4.2 4.2 0 1 1 0 8.4 4.2 4.2 0 0 1 0-8.4zM3.5 21c.6-4.6 4.1-7.2 8.5-7.2s7.9 2.6 8.5 7.2z",
  star: "M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z",
  heart: "M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 5.3 3.1 1.7-1.9 3.2-3.1 5.3-3.1 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z",
  note: "M9 3v11.3A3.5 3.5 0 1 0 11 17.5V8h7V3z",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  crown: "M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z",
  moon: "M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z",
  flame: "M12 2c1 4 5 5.5 5 11a5 5 0 0 1-10 0c0-3 1.5-4.5 2.5-6 .3 2 1.3 3 2.5 3.5C11 8 11 5 12 2z",
  headphones: "M12 3a9 9 0 0 0-9 9v6a3 3 0 0 0 3 3h2v-8H5v-1a7 7 0 0 1 14 0v1h-3v8h2a3 3 0 0 0 3-3v-6a9 9 0 0 0-9-9z",
  gamepad: "M7 7h10a5 5 0 0 1 4.9 6l-.8 4a3 3 0 0 1-5.2 1.3L14 16h-4l-1.9 2.3A3 3 0 0 1 2.9 17l-.8-4A5 5 0 0 1 7 7zm0 3v2H5v2h2v2h2v-2h2v-2H9v-2zm9 .8a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zm2.5 2.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z",
  gem: "M6 3h12l4 6-10 12L2 9z",
  planet: "M12 6a6 6 0 1 1 0 12 6 6 0 0 1 0-12zM1.5 16.5c2.8-.4 6.6-2.2 10.4-4.8 3.8-2.6 7-5.4 8.6-7.7.9.9-1.7 4.6-6.6 8.1-4.8 3.4-9.9 5.4-12.4 4.4z",
  leaf: "M20 4C9 4 4 10 4 16c0 1.5.4 2.8 1 4 1-4 4-8 9-10-4 3-6 6-7 10 1 .6 2.4 0 3.5 0C17 20 20 13 20 4z",
  rocket: "M12 2c3 2 5 6 5 10l2 3-2 3h-3l-1 2h-2l-1-2H7l-2-3 2-3c0-4 2-8 5-10zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
  cat: "M4 3l4 4h8l4-4v9a8 8 0 0 1-16 0zm5 8a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm6 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z",
  ghost: "M12 2a8 8 0 0 0-8 8v12l3-2 2.5 2 2.5-2 2.5 2 2.5-2 3 2V10a8 8 0 0 0-8-8zm-3 7a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z",
  sun: "M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zM11 1h2v4h-2zM11 19h2v4h-2zM1 11h4v2H1zM19 11h4v2h-4zM4.2 5.6l1.4-1.4 2.8 2.8-1.4 1.4zM15.6 17l1.4-1.4 2.8 2.8-1.4 1.4zM4.2 18.4l2.8-2.8 1.4 1.4-2.8 2.8zM15.6 7l2.8-2.8 1.4 1.4-2.8 2.8z",
};

const ICONS = [
  ["person", "Player", 0], ["star", "Star", 150], ["heart", "Heart", 150], ["note", "Music Note", 200], ["bolt", "Lightning", 200], ["crown", "Crown", 400],
  ["moon", "Moon", 200], ["flame", "Flame", 250], ["headphones", "Headphones", 300], ["gamepad", "Gamepad", 300], ["gem", "Gem", 350], ["planet", "Planet", 350],
  ["leaf", "Leaf", 150], ["rocket", "Rocket", 300], ["cat", "Cat", 250], ["ghost", "Ghost", 250], ["sun", "Sun", 200],
].map(([id, name, price]) => ({ kind: "icon", id, name, price, desc: "Your profile picture on the main menu and your Account page. It takes your theme's colour." }));

// ---- level rewards: items you can only get by levelling up (never sold, never in boxes)
Object.assign(ICON_PATHS, {
  medal: "M7 2h4l1 5 1-5h4l-3 7.3A6 6 0 1 1 10 9.3zm5 9a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  trophy: "M6 3h12v2h3v3a5 5 0 0 1-4.6 5A5 5 0 0 1 13 15.9V18h3v3H8v-3h3v-2.1A5 5 0 0 1 7.6 13 5 5 0 0 1 3 8V5h3zM5 7v1a3 3 0 0 0 1.4 2.5A7 7 0 0 1 6 8V7zm13 0v1a7 7 0 0 1-.4 2.5A3 3 0 0 0 19 8V7z",
  laurel: "M12 21.5C6.5 21.5 2.5 17 2.5 11c1 .2 2 .8 2.5 1.6C4.8 9.5 5.6 6.7 7.4 4.6c.7 1.8.6 3.8-.3 5.6 1.1-.1 2.2.3 3 1-1.8 1-3.6 1.2-5.1.7.7 3.9 3.4 6.5 7 7 3.6-.5 6.3-3.1 7-7-1.5.5-3.3.3-5.1-.7.8-.7 1.9-1.1 3-1-.9-1.8-1-3.8-.3-5.6 1.8 2.1 2.6 4.9 2.4 8 .5-.8 1.5-1.4 2.5-1.6 0 6-4 10.5-9.5 10.5zM12 8.5l1.2 2.5 2.7.3-2 1.9.5 2.7L12 14.6l-2.4 1.3.5-2.7-2-1.9 2.7-.3z",
  legendstar: "M12 1a11 11 0 1 1 0 22 11 11 0 0 1 0-22zm0 2a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 2.3l2 4.4 4.8.5-3.6 3.2 1 4.7L12 15.7l-4.2 2.4 1-4.7-3.6-3.2 4.8-.5z",
  legend: "M3 9l4.5 3.5L12 4l4.5 8.5L21 9l-2 11H5zm9 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
});

const LEVEL_ITEMS = [];
const lvItem = (level, it) => { Object.assign(it, { levelReq: level, levelOnly: true, boxOnly: true, price: 0 }); LEVEL_ITEMS.push(it); return it; };

ICONS.push(
  lvItem(3, { kind: "icon", id: "medal", name: "Medal", desc: "A Level 3 reward. Your profile picture, in your theme's colour." }),
  lvItem(12, { kind: "icon", id: "trophy", name: "Trophy", desc: "A Level 12 reward. Your profile picture, in your theme's colour." }),
  lvItem(30, { kind: "icon", id: "laurel", name: "Laurels", desc: "A Level 30 reward. Your profile picture, in your theme's colour." }),
  lvItem(75, { kind: "icon", id: "legendstar", name: "Virtuoso Star", desc: "A Level 75 reward. Your profile picture, in your theme's colour." }),
  lvItem(100, { kind: "icon", id: "legend", name: "Legend's Crown", desc: "The Level 100 reward. Your profile picture, in your theme's colour." }));

COLORS.push(
  lvItem(5, { kind: "color", id: "lvl-gold", name: "Level Gold", hex: null, shimmer: "yellow", fam: "yellow", desc: "A Level 5 reward: an animated shimmering gold. Use it as a base or outline on any lane." }),
  lvItem(35, { kind: "color", id: "lvl-diamond", name: "Diamond Dust", hex: null, shimmer: "neutral", fam: "neutral", desc: "A Level 35 reward: a glittering diamond white. Use it on any lane." }),
  lvItem(90, { kind: "color", id: "lvl-prism", name: "Prismatic", hex: null, fam: "multi", desc: "A Level 90 reward: soft pastel colours that drift through the rainbow. Use it on any lane." }));

TRAILS.push(lvItem(8, { kind: "trail", id: "xp", name: "XP Trail", desc: "A Level 8 reward: little gold plus signs float up behind every note." }));

EFFECTS.push(
  lvItem(10, { kind: "effect", id: "fx-lvl", base: "nova", tint: "#FFD65C", fam: "yellow", name: "Level-Up Nova", desc: "A Level 10 reward: a golden supernova on every hit." }),
  lvItem(60, { kind: "effect", id: "fx-lvl2", base: "sparks", tint: "#FFD65C", fam: "yellow", name: "Gilded Sparks", desc: "A Level 60 reward: golden sparks on every hit." }));

COMBOS.push(
  lvItem(15, { kind: "combo", id: "lvl-ascend", name: "Ascend", c1: "#FFD65C", c2: "#FFFFFF", fam: "yellow", desc: "A Level 15 reward: your combo glows gold, then white-hot." }),
  lvItem(75, { kind: "combo", id: "lvl-crown", name: "Crown Jewels", c1: "#B98CFF", c2: "#FFD65C", fam: "purple", desc: "A Level 75 reward: royal violet into gold." }));

LANES.push(
  lvItem(20, { kind: "lane", id: "ln-lvl", pat: "neon", tint: "#FFD65C", fam: "yellow", name: "Gilded Edges", desc: "A Level 20 reward: gold neon down every lane." }),
  lvItem(40, { kind: "lane", id: "ln-lvl2", pat: "coderain", tint: "#FFD65C", fam: "yellow", name: "Gilded Code", desc: "A Level 40 reward: streams of gold code that fall with the notes." }));

THEMES.push(
  lvItem(25, makeTheme("th-ascension", "Ascension", 45, 50, "#FFD65C", { fam: "yellow", anim: "stars", fx: "255,214,92", desc: "A Level 25 reward: golden stars rising through a deep night." })),
  lvItem(50, makeTheme("th-crusher", "Chorus Crusher", 280, 55, "#FFB547", { fam: "orange", anim: "aurora", fx: "255,181,71", desc: "A Level 50 reward: violet night with ribbons of gold aurora." })),
  lvItem(100, makeTheme("th-legend", "LALI-O Legend", 45, 60, "#FFD65C", { fam: "yellow", anim: "matrix", fx: "255,214,92", desc: "The Level 100 reward: streams of pure gold code." })));

const iconSvg = (id) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="${ICON_PATHS[id] || ICON_PATHS.person}"/></svg>`;
const COLOR_BY = byId(COLORS), COMBO_BY = byId(COMBOS), THEME_BY = byId(THEMES), LANE_BY = byId(LANES), EFFECT_BY = byId(EFFECTS), TRAIL_BY = byId(TRAILS), ICON_BY = byId(ICONS);
const forSale = (list) => list.filter(i => !i.hidden && !i.boxOnly);

const CATS = [
  { id: "boxes", name: "Mystery Boxes", desc: "Open a box for a random item you don't own yet. Some items can only be found in boxes.", items: () => BOXES },
  { id: "colors", name: "Note Colors", desc: "Colors you can put on each lane's base and outline in Inventory. Animated ones shimmer as they fall.", items: () => forSale(COLORS) },
  { id: "shapes", name: "Note Shapes", desc: "New shapes for every note, long note and hit marker.", items: () => forSale(SHAPES) },
  { id: "trails", name: "Note Trails", desc: "A streak that follows behind every note, in each lane's color.", items: () => TRAILS },
  { id: "effects", name: "Hit Effects", desc: "What bursts from the hit line when you hit a note.", items: () => forSale(EFFECTS) },
  { id: "combos", name: "Combo Colors", desc: "The colors your combo glows at 100+ and 300+.", items: () => forSale(COMBOS) },
  { id: "themes", name: "Themes", desc: "Recolor the menus, backgrounds and playfield.", items: () => forSale(THEMES.filter(t => !t.anim)) },
  { id: "animthemes", name: "Animated Themes", desc: "Themes with moving particles: stars, rain, snow, embers, petals and more.", items: () => forSale(THEMES.filter(t => t.anim)) },
  { id: "lanes", name: "Lane Backgrounds", desc: "A pattern behind the notes in every lane, in each lane's color or one color of its own.", items: () => forSale(LANES) },
  { id: "fonts", name: "Fonts", desc: "Change the font used for titles, buttons, the combo and hit ratings.", items: () => FONT_ITEMS },
  { id: "icons", name: "Profile Icons", desc: "Your picture on the main menu and your Account page, in your theme's color.", items: () => ICONS },
];

const OWN_KEY = { font: "fonts", color: "colors", shape: "shapes", effect: "effects", combo: "combos", theme: "themes", lane: "lanes", trail: "trails", icon: "icons" };
const KIND_LABEL = { font: "Font", color: "Color", shape: "Shape", effect: "Hit effect", combo: "Combo colors", theme: "Theme", lane: "Lane background", trail: "Note trail", icon: "Profile icon", box: "Mystery box" };

const OWNED_DEFAULT = () => ({
  fonts: FONT_ITEMS.filter(i => !i.price).map(i => i.id), colors: COLORS.filter(i => !i.price).map(i => i.id),
  shapes: SHAPES.filter(i => !i.price).map(i => i.id), effects: ["ring"], combos: ["classic"], themes: ["midnight"], lanes: ["plain"], trails: ["none"], icons: ["person"] });

const EQUIP_DEFAULT = () => ({ base: ["rose", "amber", "mint", "azure"], outline: ["rose", "amber", "mint", "azure"], shape: "bar", effect: "ring", combo: "classic", theme: "midnight", lane: "plain", trail: "none", icon: "person" });
let COINS = Math.max(0, Math.floor(+store.get("coins", 0) || 0));
let OWNED = OWNED_DEFAULT();
{ const saved = store.get("owned", {}); for (const k in OWNED) if (Array.isArray(saved[k])) OWNED[k] = [...new Set([...OWNED[k], ...saved[k]])]; }
let EQUIP = Object.assign(EQUIP_DEFAULT(), store.get("equip", {}));
let REFUNDED = 0;

{ // items that were taken out of the Store: their coins come back once, and they're cleared from your save
  const LEGACY = {"click":200,"tick":200,"clap":300,"kick":300,"snare":300,"hat":250,"bell":400,"blip":250,"chime":400,"wood":300,"cowbell":350,"laser":400,"bubble":350,"coin":450,"pop":250,"arp":500,"kb-gamer":450,"kb-thock":400,"kb-creamy":400,"kb-marble":450,"kb-popcorn":350,"kb-clacky":350,"kb-blue":350,"kb-space":400,"kb-topre":400,"kb-type":400,"kb-laptop":200,"kb-silent":250,"boing":250,"sproing":300,"quack":300,"rubberduck":300,"squeak":200,"honk":350,"kazoo":300,"toot":250,"bonk":250,"pew":200,"slideup":300,"slidedown":300,"meow":350,"woof":350,"moo":350,"airhorn":450,"scratch":350,"chaching":400,"drip":200,"cork":200,"slap":250,"gong":450,"alien":350,"robot":300,"uhoh":300,"tada":400,"buzzer":300,"dingdong":300,"yoink":250,"wobble":300,"clink":250,"honey":350,"bubblepop":200,"chaos":600};
  const saved = store.get("owned", {}), gone = Array.isArray(saved.sounds) ? saved.sounds : [];
  REFUNDED = gone.reduce((n, id) => n + (LEGACY[id] || 0), 0);
  if (gone.length || "sounds" in saved) { delete saved.sounds; store.set("owned", saved); }
  if (REFUNDED) { COINS += REFUNDED; store.set("coins", COINS); }
  delete EQUIP.sound;
  if (store.get("settings", {}).hitVol !== undefined) delete settings.hitVol;
  const pr = store.get("presets", []); if (pr.some(p => p.eq && "sound" in p.eq)) { pr.forEach(p => { if (p.eq) delete p.eq.sound; }); store.set("presets", pr); }
}

// keep a font that was picked back when all fonts were free
{ // (fonts picked back when all fonts were free are kept; a font that was only borrowed from EverythingInterlude is not)
  const tu = +store.get("trialUntil", 0) || 0;
  if (!OWNED.fonts.includes(settings.font)) { if (!tu) OWNED.fonts.push(settings.font); else if (tu <= Date.now()) settings.font = "Syne"; }
  if (tu && tu <= Date.now()) store.set("trialUntil", 0);
}

// code EverythingInterlude: for 2 minutes every Store item can be used as if you owned it (nothing is added to what you own)
let TRIAL_UNTIL = +store.get("trialUntil", 0) || 0;
const trialOn = () => TRIAL_UNTIL > Date.now();
const trialHidden = (id) => THEMES.some(t => t.hidden && t.id === id) || LEVEL_ITEMS.some(t => t.id === id);
const ownsId = (key, id) => OWNED[key].includes(id) || (trialOn() && !trialHidden(id));

// anything equipped must exist and be owned, otherwise fall back to the default
function validateEquip() {
  const d = EQUIP_DEFAULT();
  for (const k of ["base", "outline"]) {
    if (!Array.isArray(EQUIP[k]) || EQUIP[k].length !== 4) EQUIP[k] = d[k];
    EQUIP[k] = EQUIP[k].map((c, l) => COLOR_BY[c] && ownsId("colors", c) ? c : d[k][l]);
  }
  if (!SHAPES.some(s => s.id === EQUIP.shape) || !ownsId("shapes", EQUIP.shape)) EQUIP.shape = d.shape;
  if (!EFFECTS.some(s => s.id === EQUIP.effect) || !ownsId("effects", EQUIP.effect)) EQUIP.effect = d.effect;
  if (!COMBO_BY[EQUIP.combo] || !ownsId("combos", EQUIP.combo)) EQUIP.combo = d.combo;
  if (!THEME_BY[EQUIP.theme] || !ownsId("themes", EQUIP.theme)) EQUIP.theme = d.theme;
  if (!LANE_BY[EQUIP.lane] || !ownsId("lanes", EQUIP.lane)) EQUIP.lane = d.lane;
  if (!TRAIL_BY[EQUIP.trail] || !ownsId("trails", EQUIP.trail)) EQUIP.trail = d.trail;
  if (!ICON_BY[EQUIP.icon] || !ownsId("icons", EQUIP.icon)) EQUIP.icon = d.icon;
}

validateEquip();
const saveOwned = () => store.set("owned", OWNED);
const saveEquip = () => store.set("equip", EQUIP);
saveOwned(); saveEquip();
const isOwnedReal = (it) => it.kind !== "box" && OWNED[OWN_KEY[it.kind]].includes(it.id);
const isOwned = (it) => it.kind !== "box" && (OWNED[OWN_KEY[it.kind]].includes(it.id) || (trialOn() && !it.hidden && !it.levelOnly));

function isEquipped(it) {
  switch (it.kind) {
    case "font": return settings.font === it.id;
    case "color": return EQUIP.base.includes(it.id) || EQUIP.outline.includes(it.id);
    case "shape": return EQUIP.shape === it.id;
    case "effect": return EQUIP.effect === it.id;
    case "combo": return EQUIP.combo === it.id;
    case "theme": return EQUIP.theme === it.id;
    case "lane": return EQUIP.lane === it.id;
    case "trail": case "icon": return EQUIP[it.kind] === it.id;
  }
  return false;
}

function equipItem(it) {
  if (!isOwned(it)) return;
  if (it.kind === "font") { setFont(it.id, false); return; }
  if (it.kind === "color") return;   // colours are assigned per lane in Inventory
  EQUIP[it.kind] = it.id; saveEquip(); applyEquip();
  if (it.kind === "icon") renderAcct();
}

function hsl2hex(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
  return "#" + [f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, "0")).join("");
}

function colorHex(id, lane, now) {
  if (id === "rainbow") return hsl2hex(((now / 12) + lane * 70) % 360, 90, 62);
  if (id === "pinkglitter") return hsl2hex(328 + 10 * Math.sin(now / 400 + lane), 95, 70 + 14 * Math.sin(now / 90 + lane * 2.1));
  if (id === "chrome") return hsl2hex(215, 14, 64 + 22 * Math.sin(now / 280 + lane * 1.3));
  if (id === "lvl-prism") return hsl2hex((now / 22 + lane * 80) % 360, 85, 80);
  const C = COLOR_BY[id];
  if (C && C.shimmer) {   // animated shimmers: each family's colour, rippling in brightness
    const f = FAM_BY[C.shimmer], w = Math.sin(now / 170 + lane * 1.7);
    return C.shimmer === "neutral" ? hsl2hex(230, 10, 72 + 20 * w) : hsl2hex(f.h + 12 * Math.sin(now / 500 + lane), 92, 62 + 14 * w);
  }
  return (COLOR_BY[id] && COLOR_BY[id].hex) || "#FFFFFF";
}

const THEME = () => THEME_BY[EQUIP.theme] || THEMES[0];

// everything the renderer needs, optionally with some items swapped for a store preview
function cosmetics(over) {
  const e = over ? Object.assign({}, EQUIP, over) : EQUIP, now = performance.now();
  return { fill: e.base.map((c, l) => colorHex(c, l, now)), line: e.outline.map((c, l) => colorHex(c, l, now)),
    shape: e.shape, effect: e.effect, combo: e.combo, lane: e.lane, trail: e.trail, theme: THEME_BY[e.theme] || THEMES[0] };
}

function comboPair(now, id) {
  const c = COMBO_BY[id || EQUIP.combo] || COMBOS[0];
  if (c.id === "prism") return [hsl2hex((now / 10) % 360, 90, 64), hsl2hex((now / 10 + 150) % 360, 90, 70)];
  if (c.id === "pinkprism") { const w = Math.sin(now / 350); return [hsl2hex(330 + 14 * w, 95, 72), hsl2hex(315 - 12 * w, 95, 62)]; }
  if (c.id === "galaxy") { const w = Math.sin(now / 500), v = Math.cos(now / 830); return [hsl2hex(255 + 25 * w, 85, 66 + 6 * v), hsl2hex(315 + 30 * v, 90, 70)]; }
  if (c.id === "holo") { const w = Math.sin(now / 700); return [hsl2hex(200 + 40 * w, 90, 66), hsl2hex(300 + 30 * w, 90, 72)]; }
  return [c.c1, c.c2];
}

function comboColAt(lv, now, id) { const [c1, c2] = comboPair(now, id); return lv <= 1 ? blendHex("#FFFFFF", c1, clamp(lv, 0, 1)) : blendHex(c1, c2, clamp(lv - 1, 0, 1)); }

function applyTheme() {
  const th = THEME(), r = document.documentElement.style;
  if ($("acctBtn")) $("acctBtn").style.setProperty("--c", th.accent);
  r.setProperty("--ink", th.ink); r.setProperty("--surface", th.surface); r.setProperty("--surface2", th.surface2);
  r.setProperty("--line", th.line); r.setProperty("--violet", th.accent);
}

function applyEquip() {
  applyTheme();
  const cos = cosmetics();
  cos.fill.forEach((c, l) => document.documentElement.style.setProperty("--l" + l, c));
  if (typeof renderKeys === "function" && screen === "settings") renderKeys();
}

/* coins: saved total, animated counter, floating +/- amounts */
let coinShown = COINS;

// the +coins that float under the counter; shown when you get back to a menu after a run
let pendingFloat = 0;

function coinFloat(delta) {
  const f = $("coinGain");
  f.textContent = (delta > 0 ? "+" : "\u2212") + Math.abs(delta).toLocaleString();
  f.className = delta > 0 ? "up" : "down"; void f.offsetWidth; f.classList.add("go");
  const c = $("coins"); c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump");
}

function setCoins(v, delta) {
  COINS = Math.max(0, Math.round(v)); store.set("coins", COINS);
  setTimeout(() => checkAch(), 0);
  if (delta) { if (screen === "game") pendingFloat += delta; else coinFloat(delta); }   // during a run, it waits for the menu
}

function tickCoins() {
  if (Math.abs(coinShown - COINS) < 0.5) coinShown = COINS; else coinShown += (COINS - coinShown) * 0.1;
  const txt = Math.round(coinShown).toLocaleString();
  const el = $("coinNum"); if (el.textContent !== txt) el.textContent = txt;
}

// coins for finishing a song: difficulty and accuracy, scaled by length, plus bonuses; halved from the 4th replay in a day
function payout(song, diff, acc, grade, counts, prev, isNew) {
  if (song.tutorial) return { total: 0, parts: [["The Tutorial pays no coins", 0]] };
  if (song.noMiss || song.id.startsWith("test")) return { total: 0, parts: [["Test Track pays no coins", 0]] };
  const base = { easy: 10, medium: 20, hard: 35, extreme: 50 }[diff] || 10;
  const lenF = clamp(song.duration / 180, 0.5, 1.5);
  const parts = [["Finish", Math.round(base * Math.pow(acc / 100, 2) * lenF)]];
  const gb = { SS: 25, S: 15, A: 8, B: 4 }[grade] || 0;
  if (gb) parts.push([`Grade ${grade}`, gb]);
  if (counts.miss === 0) parts.push(["Full combo", 15]);
  if (!prev) parts.push(["First clear", 20]); else if (isNew) parts.push(["New best", 10]);
  let total = parts.reduce((s, p) => s + p[1], 0);
  const day = new Date().toLocaleDateString("en-CA"), plays = store.get("plays", {});
  if (plays.day !== day || typeof plays.n !== "object") { plays.day = day; plays.n = {}; }
  const key = song.id + "|" + diff;
  plays.n[key] = (plays.n[key] || 0) + 1; store.set("plays", plays);
  if (plays.n[key] > 3) { const cut = total - Math.floor(total / 2); parts.push(["Replay today, halved", -cut]); total -= cut; }
  return { total, parts };
}

// a Game Over still pays a little: half of the "Finish" coins, scaled by how far you got (squared),
// so dying near the end gets you something and dying early gets next to nothing. No bonuses.
function goPayout(song, diff, acc, reached) {
  if (song.tutorial || song.noMiss || song.id.startsWith("test")) return 0;
  const base = { easy: 10, medium: 20, hard: 35, extreme: 50 }[diff] || 10;
  const lenF = clamp(song.duration / 180, 0.5, 1.5);
  let total = Math.floor(base * Math.pow(acc / 100, 2) * lenF * Math.pow(clamp(reached, 0, 1), 2) * 0.5);
  const day = new Date().toLocaleDateString("en-CA"), plays = store.get("plays", {});
  if (plays.day === day && plays.n && plays.n[song.id + "|" + diff] >= 3) total = Math.floor(total / 2);   // same replay rule as finishing
  return total;
}

function buildNotes(song, diff) {
  const notes = song.charts[diff].map(([t, lane, d, from]) => ({
    t, lane, d, end: t + d, rise: inChorus(t, song.choruses) ? 1 : 0,
    from: from === undefined ? lane : from,   // lane the note appears in before sliding
    headJudged: false, headHit: false, holding: false, done: false, missed: false,
  }));
  // a slide may never start in, or pass through, a lane where a long note or another note would cover it
  notes.forEach((n, i) => { if (n.from !== n.lane && slideBlocked(notes, i, n.from)) n.from = n.lane; });
  const preset = notes.some(n => n.from !== n.lane);
  if ((diff === "hard" || diff === "extreme") && !preset && !song.id.startsWith("test")) addSlides(notes, diff === "hard" ? 0.05 : 0.10);
  return notes;
}

function slideBlocked(notes, i, from) {
  const n = notes[i], lo = Math.min(from, n.lane), hi = Math.max(from, n.lane), gap = 0.15;
  for (let j = i - 1; j >= 0 && notes[j].t > n.t - 6; j--) {
    const o = notes[j];
    if (o.lane < lo || o.lane > hi || o.lane === n.lane) continue;
    if (o.d ? n.t < o.end + gap : n.t - o.t < gap) return true;
  }
  for (let j = i + 1; j < notes.length && notes[j].t < n.t + gap; j++) {
    const o = notes[j];
    if (o.lane >= lo && o.lane <= hi && o.lane !== n.lane) return true;
  }
  return false;
}

// Hard 5% / Extreme 10% of tap notes, picked at random on every play, slide into their lane
function addSlides(notes, rate) {
  const taps = [];
  notes.forEach((n, i) => { if (!n.d) taps.push(i); });
  for (let k = taps.length - 1; k > 0; k--) { const r = Math.floor(Math.random() * (k + 1)); [taps[k], taps[r]] = [taps[r], taps[k]]; }
  let want = Math.round(taps.length * rate);
  for (const i of taps) {
    if (want <= 0) break;
    const n = notes[i];
    const opts = [0, 1, 2, 3].filter(l => l !== n.lane && !slideBlocked(notes, i, l));
    if (!opts.length) continue;
    n.from = opts[Math.floor(Math.random() * opts.length)];
    want--;
  }
}

const levelOf = (song, d) => Math.max(1, Math.round(song.charts[d].length / song.duration * 2.4));

function fitCanvas(c) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = c.clientWidth, h = c.clientHeight;
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  const g = c.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return [g, w, h];
}
