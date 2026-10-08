/*
 * LALI-O - ui/fonts.js
 * The font choices in Settings and applying them.
 */
"use strict";

const FONTS = ["Syne", "Press Start 2P", "Silkscreen", "VT323", "Pixelify Sans", "Orbitron", "Audiowide", "Chakra Petch", "Oxanium", "Michroma", "Bungee", "Rubik Mono One", "Dela Gothic One", "Anton", "Big Shoulders Display", "Fredoka", "Baloo 2", "Righteous", "Space Mono", "JetBrains Mono", "Unbounded", "Lexend Zetta", "Permanent Marker", "Rubik Glitch", "Monoton", "Bangers", "Black Ops One", "Bebas Neue", "Comfortaa", "Creepster", "Faster One", "Fugaz One", "Kanit", "Lobster", "Luckiest Guy", "Major Mono Display", "Pacifico", "Russo One", "Shrikhand", "Staatliches", "Titan One", "Wallpoet", "Zen Dots", "Quicksand", "Poppins"];
if (!FONTS.includes(settings.font)) settings.font = "Syne";
const canvasFont = () => `"${settings.font}", "Avenir Next", "Segoe UI", system-ui, sans-serif`;

function applyFont() {
  document.documentElement.style.setProperty("--display", canvasFont());
  const refit = () => { fitLogo(); if (screen === "select") fitTitle(); };
  refit();
  if (document.fonts && document.fonts.load) document.fonts.load(`800 40px "${settings.font}"`).then(refit, () => {});
}

// keep the LALI-O logo on one line, shrinking it for wide fonts
function fitLogo() {
  const el = document.querySelector(".logo"); if (!el || !el.offsetParent) return;
  el.style.fontSize = "";
  let size = parseFloat(getComputedStyle(el).fontSize);
  const room = el.parentElement.clientWidth;
  while (el.scrollWidth > room + 1 && size > 20) { size -= 4; el.style.fontSize = size + "px"; }
}

let toastTimer = 0;

function setFont(name, toast) {
  settings.font = name; saveSettings(); applyFont();
  if (screen === "inventory") renderInventory();
  if (toast) {
    $("fontToastName").textContent = name;
    $("fontToast").classList.add("on");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => $("fontToast").classList.remove("on"), 1600);
  }
}

// Q / E flip through the fonts you own
function cycleFont(d) {
  const list = FONTS.filter(f => OWNED.fonts.includes(f));
  const i = Math.max(0, list.indexOf(settings.font));
  setFont(list[(i + d + list.length) % list.length], true);
}

window.addEventListener("resize", fitLogo);

// fit to the device: on smaller screens (laptops, small windows) everything outside gameplay is laid out
// as if the window were 1380 x 860 and then scaled down evenly to fit, so nothing gets cut off.
// Phones and tablets (touch screens under 820px) keep their own layout instead.
const FIT_W = 1380, FIT_H = 860;
let uiZoom = 1;

function fitUI() {
  const vv = window.visualViewport, W = Math.floor(document.documentElement.clientWidth || window.innerWidth), H = Math.floor((vv && vv.height) || document.documentElement.clientHeight || window.innerHeight);
  const phone = window.matchMedia && window.matchMedia("(pointer:coarse)").matches && W <= 820;
  uiZoom = phone ? 1 : Math.max(0.4, Math.min(1, W / FIT_W, H / FIT_H));
  const on = uiZoom < 0.999;
  const set = (el, origin, full) => {
    el.style.scale = on ? String(uiZoom) : "";
    el.style.transformOrigin = on ? origin : "";
    if (full) {   // full-screen layers: lay out at the larger "virtual" size, then scale to the real window
      el.style.width = on ? (W / uiZoom) + "px" : ""; el.style.height = on ? (H / uiZoom) + "px" : "";
      el.style.right = on ? "auto" : ""; el.style.bottom = on ? "auto" : "";
      el.style.boxSizing = on ? "border-box" : "";
    }
    // viewport units inside scaled parts measure the virtual window, so tall panels still fill the screen
    el.style.setProperty("--vw1", on ? (W / uiZoom / 100) + "px" : "1vw");
    el.style.setProperty("--vh1", on ? (H / uiZoom / 100) + "px" : "1vh");
  };
  document.querySelectorAll(".screen:not(#game), .overlay").forEach(el => set(el, "0 0", true));
  document.querySelectorAll(".coins, #coinInfo").forEach(el => set(el, "100% 0", false));
  fitLogo();
}

fitUI();
window.addEventListener("resize", fitUI);
if (window.visualViewport) window.visualViewport.addEventListener("resize", fitUI);
