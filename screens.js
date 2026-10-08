/*
 * LALI-O - ui/screens.js
 * Switching between screens, and the tips on the main menu.
 */
"use strict";

// main-menu tips: one at random each time the menu opens (never the same one twice in a row)
const TIPS = [
  "You can press F11 on your keyboard to fullscreen.",
  "You can use the arrow keys, ESC, and Enter to navigate menus.",
  "Not a tip, but Madison was here.",
  "use code FRIENDS!",
  "Change Music Volume, Key binds, and more in Settings.",
  "Send recomendations to Madison.",
  "Access your second save by clicking your account in the top left.",
  "You can turn off the quest ticker on the song list in Settings, under Gameplay.",
  "Hits feel early or late? Use Auto offset in Settings \u203A Gameplay to fix your timing.",
  "In the chorus the board flips: the hit line jumps to the top and notes rise up from below.",
  "Press M on the song list to open Modifiers. Harder ones pay more coins.",
  "Stuck on a song? Turn on Practice in Modifiers to slow it down or start partway through.",
  "Press Q on the main menu to see your daily and weekly quests.",
  "Add your own songs with + Add song on the song list, and the game makes maps for them.",
  "Clearing songs in Endless heals you and raises your coin bonus for the next one.",
  "Filter the Store by color with the dots under the search bar.",
  "Save your favorite looks as Presets at the top of Inventory.",
  "Press / to search on the song list and in the Store.",
  "Achievements pay coins. See them all on your Account page.",
  "Your first clear each day earns double XP.",
  "Level up for coins and rewards you can't buy. See the Level Road on your Account page.",
  "Harder difficulties and modifiers earn more XP, not just more coins.",
  "Your progress is saved in this browser. Clearing your browser data erases it.",
];

let lastTip = -1;

function newTip() {
  let i; do i = Math.floor(Math.random() * TIPS.length); while (TIPS.length > 1 && i === lastTip);
  lastTip = i;
  const esc = c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] || c;
  let n = 0;   // each letter bounces a beat after the one before it, like the best score
  const word = (w, bold) => `<span class="w">${bold ? "<b>" : ""}` + [...w].map(c => `<i style="--w:${((n++) * 0.09 % 1.5).toFixed(2)}s">${esc(c)}</i>`).join("") + `${bold ? "</b>" : ""}</span>`;
  // a very rare secret: 1 in 1,000 menu visits shows the ODDS code instead of a tip
  const [label, text] = Math.random() < 0.001 ? ["Code:", "ODDS"] : ["Tip:", TIPS[i]];
  $("tip").setAttribute("aria-label", label + " " + text);
  $("tip").innerHTML = word(label, true) + " " + text.split(" ").map(w => word(w)).join(" ");
}

let screen = "menu";
const screens = ["menu", "select", "settings", "store", "inventory", "account", "game"];

function show(name) {
  const prevScreen = screen;
  if (name !== "settings" && typeof calibStop === "function" && CAL.on) calibStop("Stopped.");
  closeCoinInfo();
  if (name === "menu" && prevScreen !== "menu") { newTip(); renderTasks(); }
  if (name !== "menu" && $("taskPanel").classList.contains("open")) toggleTasks(false);
  if (name === "settings" && prevScreen !== "settings") { setGroup = null; renderSetGroup(); }
  if (name === "account") renderAccount();
  if (!$("acctMenu").hidden) toggleAcct(false);
  screen = name;
  for (const s of screens) {
    const el = $(s);
    el.classList.remove("leaving");
    if (s === name) { el.hidden = false; continue; }
    if (s === prevScreen && prevScreen !== name && !el.hidden && s !== "game" && name !== "game") {
      // the old screen fades out underneath while the new one eases in
      el.hidden = true; el.classList.add("leaving");
      setTimeout(() => { if (screen !== s) el.classList.remove("leaving"); }, 220);
    } else el.hidden = true;
  }
  $("bg").style.display = name === "game" ? "none" : "block";
  $("coins").hidden = !["menu", "select", "store", "inventory", "account"].includes(name);
  if (prevScreen === "store" && name !== "store") endFreeMode();   // the code only lasts while you're in the Store
  if (prevScreen === "inventory" && name !== "inventory") resetStep = 0;
  if (name === "store") { stLevel = "cats"; stQuery = ""; $("storeSearch").value = ""; renderStore(); }
  if (name === "inventory") renderInventory();
  if (["menu", "settings", "store", "inventory", "account"].includes(name)) { stopPreview(); playMenu(); }
  if (name === "select") { stopMenu(1.5); renderSelect(true); renderTasks(); }   // renderTasks: fresh quest progress in the marquee
  if (name === "menu") setTimeout(() => { $("btnPlay").focus({ preventScroll: true }); fitLogo(); }, 0);
}
