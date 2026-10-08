/*
 * LALI-O - shop/catalog.js
 * Shop items, coins, what you own and what is equipped.
 */
"use strict";

const FREE_FONTS = ["Syne", "Space Mono", "Anton", "Fredoka", "Chakra Petch"];
const PREMIUM_FONTS = ["Press Start 2P", "Bungee", "Rubik Mono One", "Lexend Zetta", "Permanent Marker", "Rubik Glitch", "Monoton", "Creepster", "Faster One", "Major Mono Display", "Pacifico", "Shrikhand", "Wallpoet", "Luckiest Guy"];
const fontPrice = (f) => FREE_FONTS.includes(f) ? 0 : PREMIUM_FONTS.includes(f) ? 400 : 200;

const FONT_ITEMS = FONTS.map(f => ({ kind: "font", id: f, name: f, price: fontPrice(f),
  desc: fontPrice(f) === 400 ? "A standout display font for titles, buttons, the combo and hit ratings." : "A font for titles, buttons, the combo and hit ratings." }))
  .sort((a, b) => a.price - b.price);

const COLORS = [
  ["rose", "Rose", "#FF4F79", 0], ["amber", "Amber", "#FFB547", 0], ["mint", "Mint", "#4FE3C1", 0], ["azure", "Azure", "#5B8CFF", 0], ["snow", "Snow", "#F4F2FF", 0],
  ["crimson", "Crimson", "#E5243F", 150], ["tangerine", "Tangerine", "#FF7A1A", 150], ["lemon", "Lemon", "#FFE14D", 150], ["lime", "Lime", "#A6F04A", 150],
  ["emerald", "Emerald", "#1FCB6E", 150], ["cyan", "Cyan", "#27D8F2", 150], ["sky", "Sky", "#8FD3FF", 150], ["cobalt", "Cobalt", "#2B55E8", 150],
  ["indigo", "Indigo", "#5A3FD9", 150], ["violet", "Violet", "#B98CFF", 150], ["magenta", "Magenta", "#F23FD1", 150], ["bubblegum", "Bubblegum", "#FF8FC7", 150],
  ["peach", "Peach", "#FFB199", 150], ["lavender", "Lavender", "#CDB8FF", 150], ["onyx", "Onyx", "#1B1B26", 150], ["slate", "Slate", "#6B6F85", 150],
  ["gold", "Gold", "#FFC933", 150], ["silver", "Silver", "#C8CCD8", 150], ["bronze", "Bronze", "#C98A4B", 150], ["rainbow", "Rainbow", null, 900],
  // mystery box exclusives (tier = which box they're in)
  ["coral", "Coral", "#FF6F59", 250, 1], ["seafoam", "Seafoam", "#6FF2D0", 250, 1], ["ultraviolet", "Ultraviolet", "#8A2BFF", 450, 2], ["chrome", "Chrome", null, 1000, 3],
  // pink collection
  ["blush", "Blush", "#FFC1D9", 150, 0, 1], ["hotpink", "Hot Pink", "#FF3EA5", 150, 0, 1], ["flamingo", "Flamingo", "#FF6FAE", 150, 0, 1], ["cottoncandy", "Cotton Candy", "#FFB3E6", 150, 0, 1],
  ["pinkglitter", "Pink Glitter", null, 900, 0, 1],
].map(([id, name, hex, price, tier, pink]) => ({ kind: "color", id, name, hex, price, tier, boxOnly: !!tier, pink: !!pink,
  desc: id === "rainbow" ? "An animated colour that cycles through the whole spectrum. Use it as a base or outline on any lane."
    : id === "chrome" ? "An animated liquid-metal shimmer. Use it as a base or outline on any lane."
    : id === "pinkglitter" ? "An animated, glittering pink that sparkles between soft and hot pink. Use it on any lane."
    : "A note colour. In Inventory you can use it as the base or the outline on any lane." }));

const SHAPES = [
  ["bar", "Bar", 0, "The classic thin rectangle."],
  ["pill", "Pill", 200, "Fully rounded ends."],
  ["block", "Block", 200, "Hard, square corners."],
  ["hollow", "Hollow Bar", 300, "A see-through note with a bold rim."],
  ["split", "Split", 350, "Two halves with a gap down the middle."],
  ["hex", "Hex", 350, "Pointed ends, like a stretched hexagon."],
  ["chevron", "Chevron", 450, "An arrow that points the way it's moving, and turns around in the chorus."],
  ["orbs", "Orbs", 450, "A row of four round dots."],
  ["diamonds", "Diamonds", 500, "Three diamonds side by side."],
  ["slant", "Slant", 250, "A sleek slanted parallelogram."],
  ["ticket", "Ticket", 300, "Round notches cut into both ends, like a ticket stub."],
  ["crystal", "Crystal", 350, "One long, sharp diamond from edge to edge."],
  ["brackets", "Brackets", 350, "Two bold brackets around a glowing dot."],
  ["wave", "Wave", 450, "A ribbon that ripples in a gentle wave."],
  ["stars", "Stars", 550, "Three little stars in a row."],
  ["hearts", "Hearts", 550, "Three hearts in a row."],
  ["bolt", "Bolt", 600, "A zigzag of lightning across the lane."],
  ["orb1", "Big Orb", 400, "A single round orb in the middle of the lane."],
  ["arrows", "Arcade Arrows", 700, "Retro dance-machine arrows: left, down, up and right across the four lanes."],
  ["diamond1", "Big Diamond", 450, "A single bold diamond in the middle of the lane."],
  ["star1", "Big Star", 500, "A single big star in the middle of the lane."],
  ["heart1", "Big Heart", 500, "A single big heart in the middle of the lane."],
  ["orb", "Orb", 0, "One big round dot per note."],
  ["diamond", "Diamond", 500, "One big diamond per note."],
  ["star", "Star", 550, "One big star per note."],
  ["heart", "Heart", 550, "One big heart per note."],
].sort((a, b) => a[2] - b[2]).map(([id, name, price, desc]) => ({ kind: "shape", id, name, price, desc: desc + " Changes notes, long notes and the hit markers." }));

const EFFECTS = [
  ["ring", "Ring", 0, "A crisp outline that expands from the hit line."],
  ["burst", "Burst", 300, "Dots of light spray out in every direction."],
  ["shock", "Shockwave", 300, "Two rings ripple outward."],
  ["beam", "Beam", 400, "A column of light shoots up the lane."],
  ["sparks", "Sparks", 450, "Eight streaks flash outward like a firework."],
  ["pixels", "Pixels", 450, "Chunky pixels pop up and fall back down."],
  ["star", "Starburst", 600, "A spinning star blooms on every hit."],
  ["confetti", "Confetti", 700, "A shower of multicoloured confetti."],
  ["ripple", "Ripple", 350, "Three rings ripple out one after another, like a drop in water."],
  ["bubbles", "Bubbles", 400, "Little bubbles wobble up the lane and pop."],
  ["hearts", "Hearts", 500, "A handful of tiny hearts floats up from the hit."],
  ["petals", "Petals", 500, "Petals spin outward like a flower opening."],
  ["flame", "Flame", 550, "A flickering flame licks up the lane."],
  ["zap", "Zap", 600, "Jagged bolts of lightning crackle out of the hit line."],
  ["glitch", "Glitch", 650, "The hit glitches out in shifting digital slices."],
  ["nova", "Supernova", 800, "A bright flash with rays bursting in every direction."],
].sort((a, b) => a[2] - b[2]).map(([id, name, price, desc]) => ({ kind: "effect", id, name, price, desc: desc + " It takes the colour of your hit rating." }));

const COMBOS = [
  ["classic", "Classic", "#5B8CFF", "#B98CFF", 0], ["silver", "Silver", "#C8CCD8", "#FFFFFF", 300],
  ["gold", "Gold Rush", "#FFC933", "#FF8A1F", 400], ["inferno", "Inferno", "#FF7A1A", "#FF2E4D", 400],
  ["toxic", "Toxic", "#A6F04A", "#1FCB6E", 400], ["ice", "Ice", "#8FD3FF", "#E8F7FF", 400],
  ["sakura", "Sakura", "#FF8FC7", "#F23FD1", 400], ["ocean", "Deep Sea", "#35D6FF", "#2B55E8", 400],
  ["sunset", "Sunset", "#FFB199", "#FF5FD2", 400], ["citrus", "Citrus", "#FFE14D", "#A6F04A", 400],
  ["ruby", "Ruby", "#FF6B81", "#E5243F", 400], ["mintchip", "Mint Chip", "#4FE3C1", "#F4F2FF", 400],
  ["aurora", "Aurora", "#6BFFC8", "#B98CFF", 500], ["royal", "Royal", "#7A5CFF", "#FFC933", 500],
  ["fireice", "Fire & Ice", "#FF7A1A", "#8FD3FF", 600], ["holo", "Holo", null, null, 1000],
  ["prism", "Prism", null, null, 1200],
  // mystery box exclusives
  ["bubble", "Bubble", "#8FD3FF", "#FF8FC7", 300, 1], ["candy", "Candy", "#FF5FD2", "#FFE14D", 550, 2], ["galaxy", "Galaxy", null, null, 1100, 3],
  // pink collection
  ["bubblegumpop", "Bubblegum Pop", "#FF8FC7", "#FF3EA5", 400, 0, 1], ["strawberrymilk", "Strawberry Milk", "#FFD1E3", "#FF6FAE", 400, 0, 1], ["pinkprism", "Pink Prism", null, null, 1000, 0, 1],
].map(([id, name, c1, c2, price, tier, pink]) => ({ kind: "combo", id, name, c1, c2, price, tier, boxOnly: !!tier, pink: !!pink,
  desc: id === "prism" ? "Your combo shimmers through the rainbow at 100+ and 300+." : id === "holo" ? "A holographic shimmer that drifts between cyan, blue and pink."
    : id === "galaxy" ? "A deep-space swirl of violet, indigo and pink that never sits still."
    : id === "pinkprism" ? "Your combo shimmers through every shade of pink at 100+ and 300+." : "The colour your combo glows at 100+, and again at 300+." }));

const THEMES = [
  { id: "midnight", name: "Midnight", price: 0, ink: "#07070C", surface: "#11111B", surface2: "#181826", line: "#2A2A40", accent: "#B98CFF", field: "11,11,19", glow: "91,140,255", hueA: 330, hueSpan: 260, sat: 90, desc: "The original deep-night look." },
  { id: "mono", name: "Monochrome", price: 600, ink: "#0A0A0A", surface: "#151515", surface2: "#1D1D1D", line: "#333333", accent: "#FFFFFF", field: "14,14,14", glow: "200,200,200", hueA: 0, hueSpan: 0, sat: 0, desc: "Pure black and white." },
  { id: "synthwave", name: "Synthwave", price: 800, ink: "#0E0617", surface: "#1A0D26", surface2: "#241235", line: "#3D2157", accent: "#FF5FD2", field: "20,8,30", glow: "255,95,210", hueA: 270, hueSpan: 100, sat: 95, desc: "Hot pink and purple, straight out of the 80s." },
  { id: "ocean", name: "Ocean", price: 800, ink: "#03101A", surface: "#0A1C2A", surface2: "#0F2536", line: "#1D3B52", accent: "#35D6FF", field: "5,20,32", glow: "53,214,255", hueA: 165, hueSpan: 70, sat: 85, desc: "Deep blue water with bright teal light." },
  { id: "terminal", name: "Terminal", price: 800, ink: "#020A04", surface: "#08170C", surface2: "#0C2112", line: "#16391F", accent: "#3DFF7A", field: "3,14,6", glow: "61,255,122", hueA: 95, hueSpan: 50, sat: 90, desc: "Green-on-black, like an old computer screen." },
  { id: "ember", name: "Ember", price: 800, ink: "#110604", surface: "#1F0D09", surface2: "#2A120C", line: "#48221A", accent: "#FF7A3D", field: "24,9,6", glow: "255,122,61", hueA: 350, hueSpan: 55, sat: 95, desc: "Glowing coals, reds and oranges." },
  { id: "sunset", name: "Sunset", price: 800, ink: "#140908", surface: "#221210", surface2: "#2E1814", line: "#4D2A22", accent: "#FF9E5E", field: "28,12,10", glow: "255,110,140", hueA: 330, hueSpan: 70, sat: 95, desc: "Warm orange fading into pink." },
  { id: "arctic", name: "Arctic", price: 800, ink: "#060B12", surface: "#0E1722", surface2: "#14202E", line: "#26384D", accent: "#BFE8FF", field: "10,18,28", glow: "150,210,255", hueA: 185, hueSpan: 40, sat: 70, desc: "Icy blues and frosted white." },
  { id: "bloodmoon", name: "Blood Moon", price: 800, ink: "#0D0204", surface: "#1A0609", surface2: "#240A0E", line: "#43141C", accent: "#FF3348", field: "20,3,6", glow: "255,51,72", hueA: 345, hueSpan: 25, sat: 95, desc: "Deep crimson under a red sky." },
  { id: "deepspace", name: "Deep Space", price: 900, ink: "#03040C", surface: "#0B0D1E", surface2: "#11142A", line: "#22274A", accent: "#9DB4FF", field: "6,7,20", glow: "120,90,255", hueA: 220, hueSpan: 80, sat: 75, desc: "Starlight blues and nebula violet." },
  { id: "aurora", name: "Aurora", price: 900, ink: "#030C0B", surface: "#0A1A18", surface2: "#0F2421", line: "#1D403A", accent: "#6BFFC8", field: "5,18,16", glow: "170,120,255", hueA: 150, hueSpan: 130, sat: 85, desc: "Northern lights, green shifting into violet." },
  { id: "candy", name: "Candy", price: 900, ink: "#150A14", surface: "#231222", surface2: "#2E182D", line: "#4C2A4A", accent: "#FF9BD8", field: "30,14,28", glow: "120,230,220", hueA: 300, hueSpan: 150, sat: 80, desc: "Bubblegum pink and mint, sweet and bright." },
  { id: "luxe", name: "Gold Luxe", price: 1000, ink: "#0B0906", surface: "#17130C", surface2: "#201A10", line: "#3D311C", accent: "#E8C36A", field: "16,13,8", glow: "232,195,106", hueA: 38, hueSpan: 18, sat: 70, desc: "Black and gold, polished and rich." },
  { id: "vapor", name: "Vaporwave", price: 1000, ink: "#120F24", surface: "#1D1836", surface2: "#262046", line: "#3C3468", accent: "#7DF9FF", field: "24,20,48", glow: "255,143,199", hueA: 170, hueSpan: 150, sat: 85, desc: "Pastel cyan and pink over dusky purple." },
  // animated themes: particles drift across the menus and behind the playfield
  { id: "starfield", name: "Starfield", price: 1200, anim: "stars", ink: "#05060D", surface: "#0E1020", surface2: "#14172B", line: "#262A48", accent: "#9DB4FF", field: "8,9,20", glow: "157,180,255", fx: "200,215,255", hueA: 220, hueSpan: 80, sat: 70, desc: "Animated: a sky full of twinkling, drifting stars." },
  { id: "rainfall", name: "Rainfall", price: 1200, anim: "rain", ink: "#070B10", surface: "#101820", surface2: "#16212C", line: "#263545", accent: "#6FB7FF", field: "9,14,20", glow: "111,183,255", fx: "160,200,255", hueA: 195, hueSpan: 50, sat: 70, desc: "Animated: a steady, slanting rain." },
  { id: "snowfall", name: "Snowfall", price: 1200, anim: "snow", ink: "#0A0E16", surface: "#141A26", surface2: "#1B2333", line: "#2E3A52", accent: "#CFE6FF", field: "12,16,24", glow: "207,230,255", hueA: 190, hueSpan: 40, sat: 50, desc: "Animated: soft snowflakes drifting down." },
  { id: "embers", name: "Embers", price: 1400, anim: "embers", ink: "#0E0705", surface: "#1C0F0A", surface2: "#26140D", line: "#472516", accent: "#FF8A3D", field: "18,9,6", glow: "255,138,61", fx: "255,150,60", hueA: 10, hueSpan: 40, sat: 95, desc: "Animated: glowing sparks rising from a fire." },
  { id: "northern", name: "Northern Lights", price: 1500, anim: "aurora", ink: "#040B0E", surface: "#0B1A1F", surface2: "#10242B", line: "#1D3E47", accent: "#6BFFC8", field: "5,14,17", glow: "107,255,200", hueA: 140, hueSpan: 160, sat: 85, desc: "Animated: ribbons of aurora waving across the sky." },
  // mystery box exclusives
  { id: "rosewater", name: "Rosewater", price: 700, tier: 2, boxOnly: true, ink: "#140A0F", surface: "#22121A", surface2: "#2C1822", line: "#4A2A3A", accent: "#FF9EC4", field: "22,11,17", glow: "255,158,196", hueA: 320, hueSpan: 60, sat: 80, desc: "Soft pinks on a deep rose background." },
  { id: "sakura", name: "Sakura Drift", price: 1300, tier: 3, boxOnly: true, anim: "petals", ink: "#120A10", surface: "#20121C", surface2: "#2A1824", line: "#4A2A40", accent: "#FFB7D5", field: "20,10,17", glow: "255,183,213", hueA: 320, hueSpan: 50, sat: 75, desc: "Animated: cherry blossom petals tumbling on the breeze." },
  { id: "fireflies", name: "Fireflies", price: 1300, tier: 3, boxOnly: true, anim: "fireflies", ink: "#060A06", surface: "#0F170F", surface2: "#142014", line: "#243A24", accent: "#D7FF5C", field: "8,13,8", glow: "215,255,92", fx: "220,255,120", hueA: 70, hueSpan: 60, sat: 85, desc: "Animated: fireflies glowing and fading in a summer night." },
  // pink collection
  { id: "pinklemonade", name: "Pink Lemonade", price: 800, pink: true, ink: "#150A10", surface: "#24121C", surface2: "#2E1824", line: "#4F2A3E", accent: "#FF7EB6", field: "22,10,16", glow: "255,126,182", hueA: 320, hueSpan: 70, sat: 90, desc: "Bright pink on a deep berry background." },
  { id: "lovebubbles", name: "Love Bubbles", price: 1300, pink: true, anim: "bubbles", ink: "#12080F", surface: "#20111B", surface2: "#2A1623", line: "#4A2640", accent: "#FF8FC7", field: "20,9,16", glow: "255,143,199", fx: "255,160,210", hueA: 315, hueSpan: 50, sat: 85, desc: "Animated: shiny pink bubbles float up and wobble." },
  { id: "floatinghearts", name: "Floating Hearts", price: 1400, pink: true, anim: "hearts", ink: "#14070D", surface: "#231019", surface2: "#2D1520", line: "#50243A", accent: "#FF4F9A", field: "22,8,14", glow: "255,79,154", fx: "255,110,170", hueA: 330, hueSpan: 40, sat: 95, desc: "Animated: little hearts drift up and fade away." },
  { id: "pinksnow", name: "Pink Snow", price: 1200, pink: true, anim: "snow", ink: "#120B11", surface: "#1F141D", surface2: "#281A26", line: "#452C41", accent: "#FFB3E6", field: "19,12,18", glow: "255,179,230", fx: "255,190,230", hueA: 310, hueSpan: 40, sat: 70, desc: "Animated: soft pink snowflakes drifting down." },
  // secret themes: never in the Store, unlocked with the code BOYS
  { id: "knuckles", name: "Knuckles", price: 0, hidden: true, ink: "#11070A", surface: "#1E0D12", surface2: "#281218", line: "#4A1E27", accent: "#FF4A3D", field: "18,7,10", glow: "60,230,120", hueA: 350, hueSpan: 120, sat: 90, desc: "Fiery red with an emerald glow." },
  { id: "shadow", name: "Shadow", price: 0, hidden: true, ink: "#060606", surface: "#121010", surface2: "#1A1616", line: "#3A2222", accent: "#FF2E2E", field: "10,8,8", glow: "255,196,60", hueA: 350, hueSpan: 50, sat: 95, desc: "Jet black with red streaks and a gold glow." },
  { id: "silver", name: "Silver", price: 0, hidden: true, ink: "#090C11", surface: "#131820", surface2: "#1A212B", line: "#334050", accent: "#D6E2EE", field: "12,16,22", glow: "90,255,225", hueA: 160, hueSpan: 45, sat: 80, desc: "Cool silver with a bright cyan psychic glow." },
].map(th => Object.assign(th, { kind: "theme", accentRgb: hexRgb(th.accent), inkRgb: hexRgb(th.ink), desc: th.desc + " Changes the menus, backgrounds and playfield." }));

function hexRgb(h) { const n = parseInt(h.slice(1), 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; }
const byId = (list) => Object.fromEntries(list.map(i => [i.id, i]));

// lane backgrounds: a pattern drawn behind the notes in each lane, in that lane's colour
const LANES = [
  ["plain", "Plain", 0, "No pattern, just the playfield."],
  ["fade", "Fade", 250, "Each lane glows softly toward the hit line."],
  ["grid", "Grid", 300, "A faint grid that scrolls along with the notes."],
  ["stripes", "Stripes", 350, "Diagonal stripes that scroll along with the notes."],
  ["dots", "Dots", 350, "A dot matrix that scrolls along with the notes."],
  ["pulse", "Pulse", 450, "Each lane lights up on every beat."],
  ["neon", "Neon Edges", 500, "Glowing neon tubes down the sides of each lane."],
  ["chevrons", "Chevrons", 600, "Arrows that flow toward the hit line, and turn around in the chorus."],
  ["scanlines", "Scanlines", 300, "Retro CRT lines with a slow scanning glow.", 1],
  ["circuit", "Circuit", 600, "Glowing circuit traces that scroll with the notes.", 2],
  ["rainbow", "Rainbow Flow", 1100, "Every lane washes slowly through the rainbow.", 3],
  ["pinkglow", "Pink Glow", 400, "Every lane glows pink, brighter on the beat.", 0, 1],
  ["heartlanes", "Heart Trail", 500, "Little pink hearts that scroll along with the notes.", 0, 1],
  ["sparkle", "Sparkle", 600, "Pink sparkles that twinkle as they scroll along with the notes.", 0, 1],
  ["coderain", "Pink Code Rain", 700, "Light pink code streams down with the notes, and rises back up when the map flips.", 0, 1],
  ["binaryblush", "Binary Blush", 600, "Streams of pink 0s and 1s that fall with the notes, and rise when the map flips.", 0, 1],
  ["kanacode", "Kana Code", 800, "Glowing pink katakana code that falls with the notes, and rises when the map flips.", 0, 1],
].map(([id, name, price, desc, tier, pink]) => ({ kind: "lane", id, name, price, tier, boxOnly: !!tier, pink: !!pink, desc: desc + " Shown behind the notes." }));

// mystery boxes: a random item you don't own yet, sometimes one you can only get from a box
const BOXES = [
  { kind: "box", id: "bronze", name: "Bronze Box", price: 250, tier: 1, lo: 200, hi: 400, color: "#C98A4B", color2: "#8A5A2B" },
  { kind: "box", id: "silver", name: "Silver Box", price: 500, tier: 2, lo: 401, hi: 800, color: "#DDE2EE", color2: "#8E94A6" },
  { kind: "box", id: "gold", name: "Gold Box", price: 1000, tier: 3, lo: 801, hi: 99999, color: "#FFC933", color2: "#B8860B" },
];

const BOX_EXCLUSIVE_CHANCE = 0.35;
