# LALI-O

A browser rhythm game. Open `index.html` through any web server (it loads its scripts, `charts.js` and the
songs in `audio/` by relative path).

## Folders

```
index.html            the page: all the screens' markup, then the scripts in load order
css/style.css         every style, in sections (menu, song select, store, settings, game, overlays ...)
charts.js             the built-in songs: tempo, first beat, board flips and the maps for each difficulty
audio/                the built-in songs and menu / Game Over music
js/
  core/               constants, saving (two save slots), small helpers
  ui/                 fonts, switching screens, menu tips
  audio/              Web Audio, the music player, your own menu / pause / Game Over music
  render/             the background, note shapes and effects, the playfield
  screens/            song select, settings, store, inventory, account, save slots, coin info
  shop/               the item catalog, generated items, store previews
  maps/mapmaker.js    turns audio into maps (used by the game AND by tools/build-charts.js)
  songs/              adding your own songs and keeping them (IndexedDB)
  game/               playing a map, health, tutorial, input
  progress/           achievements, levels and XP, daily / weekly tasks, reset
  main.js             connects the buttons and starts the game loop (loaded last)
tools/
  build-charts.js     remakes the built-in maps:  node tools/build-charts.js [song ids]   (needs ffmpeg)
  test_track.py       makes the Test Track
archive/              old versions and retired tools, kept for reference
```

## How the code fits together

- Every file is a plain script (no build step). They share one global scope and run in the order listed in
  `index.html`, so a file can use anything from the files above it right away, and anything below it
  inside functions that run later.
- Each file starts with a short comment saying what it's for.
- Only plain ASCII in the JavaScript: write other characters as `\u` escapes (for example `·` for a dot).
- Saved data goes through `store.get / store.set` (`js/core/storage.js`), which keeps the two save slots apart.

## How maps are made (`js/maps/mapmaker.js`)

1. **Listen** - the audio is split into its drum hits and its steady sound (voice, chords). From that come the
   kick, snare, hi-hats, the singer's syllables, the whole mix, and the melody's pitch.
2. **Beat** - the tempo and first beat (stored for built-in songs, found for added ones), and a 16th-note grid.
3. **Phrases** - every 4 bars get one style, the same on every difficulty:
   - **vocals**: notes on the singer's syllables, lanes like piano keys (higher note = further right)
   - **drums**: kick on the left, snare on the right, hi-hats in the middle (Hard and up)
   - **beat**: the pulse in a steady lane pattern
   - **groove**: the instruments' rhythm, lanes following the melody up and down

   A phrase that repeats an earlier one (same rhythm, same singing) gets exactly the same notes.
4. **Notes** - each difficulty has its own density, allowed spots (Easy: beats, Medium: beats and "ands",
   Hard / Extreme: 16ths where they're really played), spacing, chords and holds.

Added songs store `mv` (the map version). When `GEN.MAP_VERSION` goes up, older added songs are remade in the
background with their tempo and flips kept.
