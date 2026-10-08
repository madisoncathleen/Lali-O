/*
 * LALI-O - maps/mapmaker.js
 * Turns a song's audio into maps for every difficulty.
 *
 * The same code makes the built-in maps (tools/build-charts.js runs it in Node)
 * and the maps for songs you add in the game.
 *
 * How a map is made
 *   1. Listen   Spectrum frames -> how hard each layer hits at every moment:
 *               kick, snare, hi-hats (the percussive part), the singer / lead melody
 *               (the steady, pitched part) and the whole mix; plus the melody's pitch.
 *   2. Beat     Tempo and first beat (found, or the stored ones), beats nudged to follow
 *               songs that drift, and a 16th-note grid between the beats.
 *   3. Phrases  The song is cut into 4-bar phrases and each phrase gets ONE style,
 *               so you're always "playing" one part of the music:
 *                 vocals  notes on the singer's syllables; lanes are piano keys
 *                         (higher note = further right, same note = same key)
 *                 drums   kick on the left, snare on the right, hi-hats in the middle
 *                 beat    the pulse, in a steady repeating lane pattern
 *                 groove  the instruments' rhythm / riff; lanes follow the melody's direction
 *               A phrase that sounds like an earlier one copies it exactly, so choruses
 *               and loops play the same every time. Every difficulty uses the same styles.
 *   4. Notes    Per difficulty: which grid spots are allowed, how many notes, spacing,
 *               chords and holds.
 */
"use strict";

const GEN = (() => {
  const MAP_VERSION = 4;          // stored on added songs; older maps are remade in the background
  const TARGET_LUFS = -10.3;      // added songs are turned up / down to this loudness
  const NFFT = 2048, HOP = 256;   // ~93 ms window, ~11.6 ms per frame at 22 kHz
  const GAP_BEFORE = 0.9, GAP_AFTER = 0.55;   // seconds kept free before / after a board flip
  const DIFF_NAMES = ["easy", "medium", "hard", "extreme"];
  const STYLES = ["vocals", "drums", "beat", "groove"];

  // Per difficulty.
  //   nps        target notes per second
  //   pos        allowed spots inside a beat (0 = on the beat, 2 = the "and", 1 / 3 = 16ths)
  //   off8/off16 how much stronger an off-beat must hit than an on-beat to get a note
  //   minBeats   closest two notes may be, in beats
  //   real       how clearly a sound must be there to become a note
  const DIFF = {
    easy:    { nps: 1.30, pos: [0, 2],       off8: 1.60, off16: 99,   minBeats: 1.0,  chord: 0.00, hold: 0.30, real: 0.30, hats: false },
    medium:  { nps: 2.10, pos: [0, 2],       off8: 1.25, off16: 99,   minBeats: 0.5,  chord: 0.04, hold: 0.28, real: 0.24, hats: false },
    hard:    { nps: 4.40, pos: [0, 1, 2, 3], off8: 1.08, off16: 1.45, minBeats: 0.25, chord: 0.10, hold: 0.22, real: 0.16, hats: true },
    extreme: { nps: 6.80, pos: [0, 1, 2, 3], off8: 1.00, off16: 1.15, minBeats: 0.25, chord: 0.18, hold: 0.18, real: 0.10, hats: true },
  };

  // lane patterns for "beat" phrases (one lane per beat of the bar)
  const BEAT_PATTERNS = [[1, 2, 1, 2], [0, 1, 2, 1], [2, 1, 2, 1], [3, 2, 1, 2]];
  const BEAT_PATTERNS_HARD = [[0, 1, 2, 3], [3, 2, 1, 0]];

  /* ---------------------------------------------------------------- small helpers */

  const tick = () => new Promise(r => setTimeout(r, 0));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mean = (a) => { let s = 0; for (const v of a) s += v; return a.length ? s / a.length : 0; };

  function percentile(arr, q) {
    const s = Float64Array.from(arr).sort();
    if (!s.length) return 0;
    const pos = (s.length - 1) * q / 100, lo = Math.floor(pos), hi = Math.ceil(pos);
    return s[lo] + (s[hi] - s[lo]) * (pos - lo);
  }

  function median(arr) {
    const s = Float64Array.from(arr).sort(), n = s.length;
    return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0;
  }

  // centred moving average (like numpy convolve "same")
  function smooth(x, n) {
    if (n <= 1) return Float64Array.from(x);
    const out = new Float64Array(x.length), c = new Float64Array(x.length + 1);
    for (let i = 0; i < x.length; i++) c[i + 1] = c[i] + x[i];
    const left = Math.floor((n - 1) / 2) + ((n % 2) ? 0 : 1), right = n - left;
    for (let i = 0; i < x.length; i++) {
      const lo = Math.max(0, i - left + 1), hi = Math.min(x.length, i + right);
      out[i] = (c[hi] - c[lo]) / n;
    }
    return out;
  }

  // in-place radix-2 FFT; writes magnitudes of bins 0..N/2
  function fftMag(re, im, out) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const a = i + k, b = a + len / 2;
          const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
          re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
          const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
        }
      }
    }
    for (let k = 0; k <= n / 2; k++) out[k] = Math.hypot(re[k], im[k]);
  }

  // K-weighted loudness (BS.1770 style, gated) of a mono signal, in LUFS
  function loudness(y, fs) {
    const biq = (x, b, a) => {
      const out = new Float64Array(x.length);
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
      for (let i = 0; i < x.length; i++) {
        const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
        x2 = x1; x1 = x[i]; y2 = y1; y1 = v; out[i] = v;
      }
      return out;
    };
    let f0 = 1681.974450955533, G = 3.999843853973347, Q = 0.7071752369554196;
    let K = Math.tan(Math.PI * f0 / fs);
    const Vh = Math.pow(10, G / 20), Vb = Math.pow(Vh, 0.4996667741545416);
    let a0 = 1 + K / Q + K * K;
    let z = biq(y, [(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0], [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]);
    f0 = 38.13547087602444; Q = 0.5003270373238773; K = Math.tan(Math.PI * f0 / fs); a0 = 1 + K / Q + K * K;
    z = biq(z, [1, -2, 1], [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]);
    const n = Math.floor(0.4 * fs), blocks = [];
    for (let i = 0; i + n <= z.length; i += n) {
      let s = 0;
      for (let j = i; j < i + n; j++) s += z[j] * z[j];
      blocks.push(s / n);
    }
    const Lb = (ms) => -0.691 + 10 * Math.log10(ms + 1e-12);
    const g1 = blocks.filter(ms => Lb(ms) > -70);
    if (!g1.length) return -70;
    const rel = Lb(mean(g1)) - 10, g2 = blocks.filter(ms => Lb(ms) > rel);
    return Lb(mean(g2.length ? g2 : g1));
  }

  // tiny seeded random numbers, so a song always gets the same map
  class RNG {
    constructor(seed) { this.s = seed & 0x7fffffff; }
    r() { this.s = (Math.imul(1103515245, this.s) + 12345) & 0x7fffffff; return this.s / 0x7fffffff; }
  }

  // running median along time (per band) or across bands (per frame) of a frames x bands grid
  function medianFilter(src, frames, NB, half, alongTime) {
    const out = new Float32Array(src.length), buf = [];
    for (let f = 0; f < frames; f++) {
      for (let b = 0; b < NB; b++) {
        buf.length = 0;
        if (alongTime) { for (let g = Math.max(0, f - half); g <= Math.min(frames - 1, f + half); g++) buf.push(src[g * NB + b]); }
        else { for (let c = Math.max(0, b - half); c <= Math.min(NB - 1, b + half); c++) buf.push(src[f * NB + c]); }
        buf.sort((x, y) => x - y);
        out[f * NB + b] = buf[buf.length >> 1];
      }
    }
    return out;
  }

  // onset curve -> peaks stand out: subtract the local (1 s) average, scale so the loud hits are ~1
  function normOnsets(e, fps) {
    const base = smooth(e, Math.round(fps)), v = new Float64Array(e.length);
    for (let i = 0; i < e.length; i++) v[i] = Math.max(0, e[i] - base[i]);
    const p = percentile(v, 99) + 1e-9;
    for (let i = 0; i < v.length; i++) v[i] /= p;
    return v;
  }

  /* ---------------------------------------------------------------- 1. listen */

  async function listen(buffer, progress) {
    // mono, roughly 22 kHz
    const dec = Math.max(1, Math.round(buffer.sampleRate / 22050)), SR = buffer.sampleRate / dec;
    const len = Math.floor(buffer.length / dec), chans = [];
    for (let c = 0; c < buffer.numberOfChannels; c++) chans.push(buffer.getChannelData(c));
    const y = new Float32Array(len), norm = 1 / (dec * chans.length);
    for (let i = 0; i < len; i++) {
      let s = 0;
      for (const ch of chans) for (let d = 0; d < dec; d++) s += ch[i * dec + d];
      y[i] = s * norm;
    }
    const dur = buffer.duration;

    // loudness at full quality (downsampling would dull the treble and skew it)
    progress("Measuring volume", 0.03); await tick();
    const full = new Float32Array(buffer.length), cn = chans.length === 2 ? Math.SQRT1_2 : 1 / chans.length;
    for (let i = 0; i < buffer.length; i++) { let s = 0; for (const ch of chans) s += ch[i]; full[i] = s * cn; }
    const lufs = loudness(full, buffer.sampleRate);

    // frequency layout
    const frames = Math.max(1, Math.floor((len - NFFT) / HOP) + 1), nb = NFFT / 2 + 1, binHz = SR / NFFT;
    const win = new Float64Array(NFFT);
    for (let i = 0; i < NFFT; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / NFFT);
    const edges = [];
    for (let f = 40; f < Math.min(11000, SR / 2); f *= Math.pow(2, 0.25)) edges.push(f);   // quarter-octave bands
    const NB = edges.length - 1, bandHz = [], bandOf = new Int16Array(nb).fill(-1), pcOf = new Int8Array(nb).fill(-1);
    for (let b = 0; b < NB; b++) bandHz.push(Math.sqrt(edges[b] * edges[b + 1]));
    for (let k = 0; k < nb; k++) {
      const hz = k * binHz;
      for (let b = 0; b < NB; b++) if (hz >= edges[b] && hz < edges[b + 1]) bandOf[k] = b;
      if (hz > 60 && hz < 4000) pcOf[k] = ((Math.round(12 * Math.log2(hz / 440)) % 12) + 12) % 12;
    }
    // melody pitch candidates: D3 .. D6 (MIDI 50..86)
    const PMIN = 50, PMAX = 86, cand = [];
    for (let m = PMIN; m <= PMAX; m++) cand.push(440 * Math.pow(2, (m - 69) / 12) / binHz);

    const band = new Float32Array(frames * NB), chroma = new Float32Array(frames * 12);
    const rms = new Float64Array(frames), pitchRaw = new Float32Array(frames), sal = new Float32Array(frames);
    const re = new Float64Array(NFFT), im = new Float64Array(NFFT), mag = new Float64Array(nb);
    const lm = new Float64Array(nb), cs = new Float64Array(nb + 1), white = new Float64Array(nb), pw = new Float64Array(NB);

    for (let f = 0; f < frames; f++) {
      const o = f * HOP;
      for (let i = 0; i < NFFT; i++) { re[i] = (y[o + i] || 0) * win[i]; im[i] = 0; }
      fftMag(re, im, mag);
      pw.fill(0);
      let sq = 0;
      for (let k = 0; k < nb; k++) {
        const m2 = mag[k] * mag[k];
        sq += m2;
        if (bandOf[k] >= 0) pw[bandOf[k]] += m2;
        if (pcOf[k] >= 0) chroma[f * 12 + pcOf[k]] += mag[k];
        lm[k] = Math.log1p(100 * mag[k]);
        cs[k + 1] = cs[k] + lm[k];
      }
      for (let b = 0; b < NB; b++) band[f * NB + b] = Math.sqrt(pw[b]);
      rms[f] = Math.sqrt(sq / nb);
      // pitch: whiten the spectrum (peaks over their surroundings), then find the note whose harmonics line up best
      for (let k = 0; k < nb; k++) {
        const lo = Math.max(0, k - 12), hi = Math.min(nb, k + 13);
        white[k] = Math.max(0, lm[k] - (cs[hi] - cs[lo]) / (hi - lo));
      }
      let best = -1, bi = 0, tot = 0;
      for (let c = 0; c < cand.length; c++) {
        let s = 0, w = 1;
        for (let h = 1; h <= 5; h++, w *= 0.8) {
          const bin = cand[c] * h, i0 = Math.floor(bin);
          if (i0 + 1 >= nb) break;
          s += w * Math.max(white[i0], white[i0 + 1]);
        }
        tot += s;
        if (s > best) { best = s; bi = c; }
      }
      pitchRaw[f] = PMIN + bi;
      sal[f] = best - tot / cand.length;
      if (f % 600 === 0) { progress("Listening to the song", 0.05 + 0.45 * f / frames); await tick(); }
    }

    // split every band into its steady part (voice, chords) and its hits (drums)
    progress("Separating drums and voice", 0.5); await tick();
    const steadyMed = medianFilter(band, frames, NB, 8, true);
    await tick();
    const hitMed = medianFilter(band, frames, NB, 2, false);
    await tick();
    const harm = new Float32Array(band.length), perc = new Float32Array(band.length);
    for (let i = 0; i < band.length; i++) {
      const h2 = steadyMed[i] * steadyMed[i], p2 = hitMed[i] * hitMed[i], m = h2 / (h2 + p2 + 1e-12);
      harm[i] = band[i] * m;
      perc[i] = band[i] * (1 - m);
    }

    // onset strength of a layer: how much its bands get louder over ~2 frames
    const fps = SR / HOP;
    const flux = (src, lo, hi) => {
      const out = new Float64Array(frames), bs = [];
      for (let b = 0; b < NB; b++) if (bandHz[b] >= lo && bandHz[b] < hi) bs.push(b);
      for (let f = 2; f < frames; f++) {
        let s = 0;
        for (const b of bs) s += Math.max(0, Math.log1p(10 * src[f * NB + b]) - Math.log1p(10 * src[(f - 2) * NB + b]));
        out[f] = s;
      }
      return out;
    };
    // melody pitch, smoothed (median of 5 frames), and how clearly pitched each frame is (0..~1.5)
    const pitch = new Float32Array(frames);
    for (let f = 0; f < frames; f++) pitch[f] = median(pitchRaw.subarray(Math.max(0, f - 2), Math.min(frames, f + 3)));
    const s95 = percentile(sal, 95) + 1e-9;
    const voiced = new Float64Array(frames);
    for (let f = 0; f < frames; f++) {
      let h = 0, t = 0;
      for (let b = 0; b < NB; b++) if (bandHz[b] >= 200 && bandHz[b] < 3500) { h += harm[f * NB + b]; t += band[f * NB + b]; }
      voiced[f] = clamp(sal[f] / s95, 0, 1.5) * (t > 0 ? h / t : 0);
    }
    // the singer's syllables: the steady part getting louder, plus the melody jumping to a new note.
    // Right after a drum hit the steady part swells for a moment as the hit fades; those aren't syllables.
    const voiceRaw = flux(harm, 200, 3500), hitFlux = flux(perc, 30, 11000), h95 = percentile(hitFlux, 95) + 1e-9;
    for (let f = frames - 1; f >= 0; f--) {
      let recent = 0;
      for (let g = Math.max(0, f - 7); g < f - 1; g++) recent = Math.max(recent, hitFlux[g]);
      voiceRaw[f] /= 1 + 3 * Math.max(0, recent / h95 - 0.2);
    }
    const vr95 = percentile(voiceRaw, 95) + 1e-9;
    for (let f = 5; f < frames - 5; f++) {
      // the note just after this frame vs just before it, so a new note is marked where it starts
      const before = median(pitchRaw.subarray(f - 5, f)), after = median(pitchRaw.subarray(f, f + 5));
      if (Math.abs(after - before) >= 1 && voiced[f + 2] > 0.3) voiceRaw[f] += 0.6 * vr95 * Math.min(1, voiced[f + 2]);
    }

    let rmax = 0;
    for (const v of rms) rmax = Math.max(rmax, v);
    for (let i = 0; i < rms.length; i++) rms[i] /= (rmax + 1e-9);

    const ft0 = NFFT / 2 / SR, dt = HOP / SR;
    // value of a per-frame curve at time t (linear between frames)
    const at = (arr, t) => {
      const x = (t - ft0) / dt;
      if (x <= 0) return arr[0];
      if (x >= arr.length - 1) return arr[arr.length - 1];
      const i = Math.floor(x), fr = x - i;
      return arr[i] * (1 - fr) + arr[i + 1] * fr;
    };
    return {
      dur, SR, lufs, frames, ft0, dt, at, chroma, rms, pitch, voiced,
      full: normOnsets(flux(band, 30, 11000), fps),
      kick: normOnsets(flux(perc, 30, 150), fps),
      snare: normOnsets(flux(perc, 180, 5000), fps),
      hats: normOnsets(flux(perc, 5000, 11000), fps),
      voice: normOnsets(voiceRaw, fps),
    };
  }

  /* ---------------------------------------------------------------- 2. beat */

  // tempo: the grid with the strongest on-beat vs off-beat contrast
  async function findTempo(A) {
    const { dur, full, kick, at } = A;
    const gridScore = (bpm, step) => {
      const p = 60 / bpm;
      let best = [-1, 0];
      for (let ph = 0; ph < p; ph += step) {
        let a = 0, b = 0, c = 0, n = 0;
        for (let t = ph; t < dur - 0.5; t += p) { a += at(full, t); b += at(full, t + p / 2); c += at(full, t + p / 3); n++; }
        const v = n ? (a - 0.5 * b - 0.5 * c) / n : -1;
        if (v > best[0]) best = [v, ph];
      }
      return best;
    };
    let coarse = 120, cbest = -Infinity;
    for (let b = 75; b < 185; b += 0.25) {
      const v = gridScore(b, 0.01)[0];
      if (v > cbest) { cbest = v; coarse = b; }
    }
    await tick();
    let bpm = coarse, fbest = -Infinity;
    for (let b = coarse - 0.3; b < coarse + 0.3; b += 0.02) {
      const [v] = gridScore(b, 0.005);
      if (v > fbest) { fbest = v; bpm = b; }
    }
    const p = 60 / bpm;
    let beat0 = 0, pbest = -Infinity;
    for (let q = 0; q < p; q += 0.004) {
      let a = 0, l = 0, n = 0;
      for (let t = q; t < dur - 0.5; t += p) { a += at(full, t); l += at(kick, t); n++; }
      const v = (a + 0.5 * l) / Math.max(1, n);
      if (v > pbest) { pbest = v; beat0 = q; }
    }
    return { bpm, beat0 };
  }

  // the tempo grid, nudged toward nearby hits only where the song drifts (live recordings)
  function trackBeats(A, bpm, beat0) {
    const { full, ft0, dt, dur } = A, p = 60 / bpm, grid = [];
    for (let t = ((beat0 % p) + p) % p; t < dur; t += p) grid.push(t);
    const offs = grid.map(t => {
      let best = -1, bt = 0;
      for (let f = Math.max(0, Math.floor((t - 0.035 - ft0) / dt)); f < full.length; f++) {
        const ftm = ft0 + f * dt;
        if (ftm >= t + 0.035) break;
        if (ftm <= t - 0.035) continue;
        if (full[f] > best) { best = full[f]; bt = ftm - t; }
      }
      return best > 0.25 ? bt : NaN;
    });
    const good = [];
    offs.forEach((v, i) => { if (!isNaN(v)) good.push(i); });
    if (good.length < 8) return grid;
    const filled = offs.map((v, i) => {
      if (!isNaN(v)) return v;
      let j = 0;
      while (j < good.length && good[j] < i) j++;
      if (j === 0) return offs[good[0]];
      if (j === good.length) return offs[good[good.length - 1]];
      const a = good[j - 1], b = good[j];
      return offs[a] + (offs[b] - offs[a]) * (i - a) / (b - a);
    });
    const sm0 = filled.map((_, k) => median(filled.slice(Math.max(0, k - 8), k + 9))), mid0 = median(sm0);
    const sm = sm0.map(v => v - mid0);   // keep the song's phase; only follow drift relative to it
    if (percentile(sm.map(Math.abs), 90) < 0.02) return grid;
    return grid.map((t, k) => t + sm[k]);
  }

  // the board-flip sections: loud, busy, repeated 8-16 bar stretches (up to 3)
  function findChoruses(A, bpm, bar0, pct) {
    const { dur, rms, full, frames, chroma, ft0, dt } = A, p = 60 / bpm;
    const bars = [];
    for (let t = bar0; t < dur; t += 4 * p) bars.push(t);
    if (bars.length < 12) return [];
    const nb = bars.length - 1, fi = (t) => Math.max(0, Math.ceil((t - ft0) / dt));
    const energy = [], dens = [], Cb = [];
    for (let i = 0; i < nb; i++) {
      const a = fi(bars[i]), b = Math.min(frames, fi(bars[i + 1]));
      let e = 0, d = 0;
      const c = new Float64Array(12);
      for (let f = a; f < b; f++) { e += rms[f]; d += full[f]; for (let k = 0; k < 12; k++) c[k] += chroma[f * 12 + k]; }
      const n = Math.max(1, b - a);
      energy.push(e / n); dens.push(d / n);
      let nn = 0;
      for (let k = 0; k < 12; k++) { c[k] /= n; nn += c[k] * c[k]; }
      nn = Math.sqrt(nn) + 1e-9;
      for (let k = 0; k < 12; k++) c[k] /= nn;
      Cb.push(c);
    }
    const rep = new Float64Array(nb);
    for (let i = 0; i < nb - 3; i++) {
      let s = 0;
      for (let j = 0; j < nb - 3; j++) {
        if (Math.abs(i - j) < 8) continue;
        let d = 0;
        for (let q = 0; q < 4; q++) for (let k = 0; k < 12; k++) d += Cb[i + q][k] * Cb[j + q][k];
        s = Math.max(s, d / 4);
      }
      for (let q = 0; q < 4; q++) rep[i + q] = Math.max(rep[i + q], s);
    }
    const z = (v) => {
      const m = mean(v);
      let sd = 0;
      for (const x of v) sd += (x - m) * (x - m);
      sd = Math.sqrt(sd / v.length) + 1e-9;
      return Array.from(v, x => (x - m) / sd);
    };
    const zE = z(smooth(energy, 3)), zD = z(smooth(dens, 3)), zR = z(rep);
    const score = zE.map((v, i) => v + 0.4 * zD[i] + 0.6 * zR[i]);
    const thr = percentile(score, pct), on = score.map(v => v > thr);
    const blocks = [];
    for (let i = 0; i < nb; i += 4) blocks.push([i, Math.min(i + 4, nb)]);
    const flags = blocks.map(([s, e]) => { let c = 0; for (let i = s; i < e; i++) c += on[i]; return c / (e - s) >= 0.5; });
    const segs = [];
    for (let i = 0; i < blocks.length;) {
      if (flags[i]) {
        let j = i;
        while (j + 1 < blocks.length && flags[j + 1]) j++;
        segs.push([blocks[i][0], blocks[j][1]]);
        i = j + 1;
      } else i++;
    }
    const out = [];
    for (const [s, e] of segs) {
      if (e - s < 8) continue;
      const ts = bars[s];
      let te = bars[Math.min(e, nb)];
      if (ts < dur * 0.12) continue;
      if (e - s > 16) te = bars[s + 16];
      te = Math.min(te, dur - 4);
      out.push([ts, te, mean(score.slice(s, e))]);
    }
    out.sort((a, b) => b[2] - a[2]);
    return out.slice(0, 3).sort((a, b) => a[0] - b[0]).map(([s, e]) => [+s.toFixed(3), +e.toFixed(3)]);
  }

  // first index in a sorted array with a value >= x
  function lowerBound(arr, x) {
    let lo = 0, hi = arr.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < x) lo = m + 1; else hi = m; }
    return lo;
  }

  // which beat of the 4 is beat 1 (the one with the most kick)
  function downbeatPhase(A, beats) {
    let ph = 0, best = -1;
    for (let k = 0; k < 4; k++) {
      let s = 0, n = 0;
      for (let i = k; i < beats.length; i += 4) { s += A.at(A.kick, beats[i]); n++; }
      if (n && s / n > best) { best = s / n; ph = k; }
    }
    return ph;
  }

  // the 16th-note grid and what's happening on every spot of it
  function buildGrid(A, bpm, beat0, choruses) {
    const beats = trackBeats(A, bpm, beat0), pd = 60 / bpm, ph4 = downbeatPhase(A, beats);
    const { ft0, dt, frames, at, dur } = A;
    const peak = (arr, t) => {
      const i = Math.round((t - ft0) / dt);
      let m = 0;
      for (let k = Math.max(0, i - 2); k <= Math.min(arr.length - 1, i + 2); k++) m = Math.max(m, arr[k]);
      return m;
    };
    const edges = [];
    for (const [s, e] of choruses) edges.push(s, e);
    const loudCurve = smooth(A.rms, 160);
    const g = { beats, pd, t: [], beat: [], q: [], bar: [], pos16: [], phrase: [], K: [], S: [], Hh: [], V: [], F: [], vox: [], pitch: [], allowed: [], inFlip: [] };
    let lastPitch = 62;
    for (let i = 0; i < beats.length - 1; i++) {
      for (let k = 0; k < 4; k++) {
        const t = beats[i] + (beats[i + 1] - beats[i]) * k / 4, bar = Math.floor((i - ph4) / 4);
        g.t.push(t); g.beat.push(i); g.q.push(k); g.bar.push(bar);
        g.pos16.push((((i - ph4) % 4) + 4) % 4 * 4 + k);
        g.phrase.push(Math.floor(bar / 4));
        g.K.push(peak(A.kick, t)); g.S.push(peak(A.snare, t)); g.Hh.push(peak(A.hats, t));
        g.V.push(peak(A.voice, t)); g.F.push(peak(A.full, t));
        // the note sung just after the onset (skip the attack), and how clearly it's sung
        const f0 = Math.max(0, Math.round((t + 0.02 - ft0) / dt)), f1 = Math.min(frames, f0 + 8);
        const vs = [], ps = [];
        for (let f = f0; f < f1; f++) { vs.push(A.voiced[f]); if (A.voiced[f] > 0.25) ps.push(A.pitch[f]); }
        g.vox.push(mean(vs));
        if (ps.length) lastPitch = median(ps);
        g.pitch.push(lastPitch);
        g.allowed.push(at(loudCurve, t) > 0.06 && t > 1.2 && t < dur - 1.0 && !edges.some(ed => t > ed - GAP_BEFORE && t < ed + GAP_AFTER));
        g.inFlip.push(choruses.some(([s, e]) => t >= s && t < e));
      }
    }
    // syllables: each clear peak of the voice layer goes to its nearest grid spot (only if it's close)
    g.Vp = g.t.map(() => 0);
    const voice = A.voice;
    for (let f = 3; f < voice.length - 3; f++) {
      const v = voice[f];
      if (v < 0.12) continue;
      let isPeak = true;
      for (let k = -3; k <= 3 && isPeak; k++) if (k && voice[f + k] > v) isPeak = false;
      if (!isPeak) continue;
      const tp = ft0 + f * dt;
      let j = lowerBound(g.t, tp);
      if (j > 0 && (j >= g.t.length || tp - g.t[j - 1] < g.t[j] - tp)) j--;
      if (j < g.t.length && Math.abs(g.t[j] - tp) <= 0.045) g.Vp[j] = Math.max(g.Vp[j], v);
    }
    // spot lookup: bar -> 16th position -> spot index
    g.spotAt = new Map();
    g.t.forEach((_, i) => {
      if (!g.spotAt.has(g.bar[i])) g.spotAt.set(g.bar[i], new Map());
      g.spotAt.get(g.bar[i]).set(g.pos16[i], i);
    });
    g.bar0 = beats[Math.min(ph4, beats.length - 1)];
    return g;
  }

  /* ---------------------------------------------------------------- 3. phrases */

  // chooses a style for every 4-bar phrase and finds phrases that repeat an earlier one
  function planPhrases(A, g) {
    const ids = [...new Set(g.phrase)].sort((a, b) => a - b);
    const info = new Map();
    for (const ph of ids) info.set(ph, { spots: [], start: Infinity });
    g.t.forEach((t, i) => { const P = info.get(g.phrase[i]); P.spots.push(i); P.start = Math.min(P.start, t); });

    // how much each style has to "play" in each phrase
    const raw = {};
    for (const ph of ids) {
      const sp = info.get(ph).spots.filter(i => g.allowed[i]);
      const n = Math.max(1, sp.length);
      const voxMean = mean(sp.map(i => g.vox[i]));
      let syl = 0, drum = 0, sync = 0, onBeats = 0;
      for (const i of sp) {
        if (g.Vp[i] > 0.3 && g.vox[i] > 0.25) syl++;
        if (g.q[i] % 2 === 0) { onBeats++; if (g.K[i] > 0.4 || g.S[i] > 0.4) drum++; }
        if (g.q[i] !== 0 && g.F[i] > 0.35) sync++;
      }
      raw[ph] = { voxMean, vocals: voxMean * syl / n, drums: drum / Math.max(1, onBeats), groove: sync / n, active: sp.length > 8 };
    }
    // scale each style by how it usually is in this song
    const scale = {};
    for (const s of ["vocals", "drums", "groove"]) scale[s] = percentile(ids.filter(ph => raw[ph].active).map(ph => raw[ph][s]), 80) + 1e-9;

    // fingerprint: the rhythm of the whole mix, the rhythm of the singing and the harmony, over 4 bars
    const finger = new Map();
    for (const ph of ids) {
      const rhythm = new Float64Array(64), sung = new Float64Array(64), harmony = new Float64Array(12);
      let sungAmount = 0;
      for (const i of info.get(ph).spots) {
        const bi = g.bar[i] - ph * 4;
        if (bi >= 0 && bi < 4) { rhythm[bi * 16 + g.pos16[i]] = g.F[i]; sung[bi * 16 + g.pos16[i]] = g.Vp[i] * Math.min(1, g.vox[i] * 2); sungAmount += g.Vp[i]; }
      }
      const sp = info.get(ph).spots, f0 = Math.max(0, Math.round((g.t[sp[0]] - A.ft0) / A.dt));
      const f1 = Math.min(A.frames, Math.round((g.t[sp[sp.length - 1]] - A.ft0) / A.dt));
      for (let f = f0; f < f1; f++) for (let k = 0; k < 12; k++) harmony[k] += A.chroma[f * 12 + k];
      const unit = (v) => { let n = 0; for (const x of v) n += x * x; n = Math.sqrt(n) + 1e-9; return v.map(x => x / n); };
      finger.set(ph, { rhythm: unit(rhythm), sung: unit(sung), sings: sungAmount > 2, harmony: unit(harmony), full: sp.length === 64 });
    }
    const dot = (a, b) => { let s = 0; for (let k = 0; k < a.length; k++) s += a[k] * b[k]; return s; };

    const style = new Map(), copyOf = new Map(), order = [];
    for (const ph of ids) {
      const r = raw[ph], F = finger.get(ph);
      // a repeat of an earlier phrase plays exactly the same
      let best = null, bs = 0;
      if (F.full) {
        for (const c of order) {
          if (copyOf.has(c) || !finger.get(c).full) continue;
          const C = finger.get(c);
          if (F.sings !== C.sings) continue;   // one has singing, the other doesn't: not a repeat
          if (F.sings && dot(F.sung, C.sung) < 0.85) continue;   // different words / melody
          const sim = F.sings
            ? 0.3 * dot(F.rhythm, C.rhythm) + 0.45 * dot(F.sung, C.sung) + 0.25 * dot(F.harmony, C.harmony)
            : 0.6 * dot(F.rhythm, C.rhythm) + 0.4 * dot(F.harmony, C.harmony);
          if (sim > bs) { bs = sim; best = c; }
        }
      }
      if (best !== null && bs > 0.9) {
        copyOf.set(ph, best);
        style.set(ph, style.get(best));
        order.push(ph);
        continue;
      }
      const inFlip = info.get(ph).spots.some(i => g.inFlip[i]);
      const sc = {
        vocals: r.vocals / scale.vocals * 1.1 * (inFlip ? 1.15 : 1) * (r.voxMean < 0.22 ? 0.3 : 1),
        drums: r.drums / scale.drums,
        groove: r.groove / scale.groove * 0.95,
        beat: 0.5,
      };
      // keep going in the same style unless another one is clearly better, but not forever
      const prev = order.length ? style.get(order[order.length - 1]) : null;
      let run = 0;
      for (let k = order.length - 1; k >= 0 && style.get(order[k]) === prev; k--) run++;
      if (prev && run >= 3) sc[prev] *= 0.7;
      let pick = STYLES.reduce((a, b) => sc[b] > sc[a] ? b : a);
      if (prev && run < 3 && sc[prev] >= 0.85 * sc[pick]) pick = prev;
      style.set(ph, pick);
      order.push(ph);
    }
    // beat phrases each get a lane pattern (in order, so it changes from one beat phrase to the next)
    const pattern = new Map();
    let nBeat = 0;
    for (const ph of ids) {
      if (copyOf.has(ph)) pattern.set(ph, pattern.get(copyOf.get(ph)));
      else if (style.get(ph) === "beat") pattern.set(ph, nBeat++);
    }
    return { raw, scale, style, copyOf, pattern, starts: ids.map(ph => [+info.get(ph).start.toFixed(3), style.get(ph), copyOf.has(ph)]) };
  }

  /* ---------------------------------------------------------------- 4. notes */

  function makeChart(A, g, plan, diff, seed) {
    const P = DIFF[diff], rng = new RNG(seed), N = g.t.length, pd = g.pd;
    const styleAt = (i) => plan.style.get(g.phrase[i]);
    const posFor = (style) => (diff === "easy" && style !== "vocals") ? [0] : style === "beat" ? P.pos.filter(q => q % 2 === 0) : P.pos;

    // a) how much every spot wants a note, given its phrase's style
    const want = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      if (!g.allowed[i]) continue;
      const st = styleAt(i), q = g.q[i];
      if (!posFor(st).includes(q)) continue;
      let w, real;
      if (st === "vocals") { w = g.Vp[i] * (0.6 + 0.4 * Math.min(1, g.vox[i])); real = g.Vp[i]; }
      else if (st === "drums") { w = Math.max(g.K[i], g.S[i], P.hats ? 0.7 * g.Hh[i] : 0); real = w; }
      else if (st === "beat") { w = Math.max(g.K[i], g.S[i], g.F[i]); real = w; }
      else { w = g.F[i]; real = g.F[i]; }
      if (real < P.real) continue;
      let need = q === 2 ? P.off8 : (q % 2 ? P.off16 : 1);
      if (st === "vocals") need = 1 + (need - 1) * (q === 2 ? 0.5 : 0.85);   // singers sit on the "and" a lot; 16ths only when clear
      if (st === "beat" && q !== 0) need *= 1.2;
      if (g.pos16[i] === 0 || g.pos16[i] === 8) need *= 0.85;
      if (g.inFlip[i]) need *= 0.9;
      want[i] = w / need;
    }
    // each style on its own scale, so quieter layers (a soft singer) still get their notes
    for (const st of STYLES) {
      const vals = [];
      for (let i = 0; i < N; i++) if (want[i] > 0 && styleAt(i) === st) vals.push(want[i]);
      const p90 = percentile(vals, 90) || 1;
      for (let i = 0; i < N; i++) if (want[i] > 0 && styleAt(i) === st) want[i] /= p90;
    }

    // b) how many notes: pick a threshold that lands near the target density
    let beatSpots = 0;
    for (let i = 0; i < N; i++) if (g.allowed[i] && g.q[i] === 0) beatSpots++;
    const target = P.nps * Math.min(A.dur, beatSpots * pd) * Math.sqrt(clamp(2 * pd, 0.8, 1.25))   // a bit fewer notes on fast songs, more on slow ones;
    let lo = 0.01, hi = 3;
    for (let it = 0; it < 30; it++) {
      const mid = (lo + hi) / 2;
      let c = 0;
      for (let i = 0; i < N; i++) c += want[i] >= mid;
      if (c > target) lo = mid; else hi = mid;
    }
    const thr = lo, pick = new Uint8Array(N);
    for (let i = 0; i < N; i++) pick[i] = want[i] >= thr ? 1 : 0;

    // c) tidy up: a lone 16th or a lone "and" reads as random (singers excepted)
    for (let i = 0; i < N; i++) {
      if (!pick[i] || styleAt(i) === "vocals") continue;
      if (g.q[i] % 2 && !(pick[i - 1] || pick[i + 1]) && want[i] < thr * 1.6) pick[i] = 0;
      if (diff === "medium" && g.q[i] === 2 && !(pick[i - 2] || pick[i + 2]) && want[i] < thr * 1.5) pick[i] = 0;
    }

    // d) a repeated phrase takes its original's notes, spot for spot
    const twin = new Int32Array(N).fill(-1);
    for (let i = 0; i < N; i++) {
      const c = plan.copyOf.get(g.phrase[i]);
      if (c === undefined) continue;
      const bar = c * 4 + (g.bar[i] - g.phrase[i] * 4), m = g.spotAt.get(bar), j = m && m.get(g.pos16[i]);
      if (j === undefined) continue;
      twin[i] = j;
      pick[i] = g.allowed[i] && posFor(styleAt(i)).includes(g.q[i]) ? pick[j] : 0;
    }

    // e) spacing
    const sel = [];
    let lastT = -9;
    for (let i = 0; i < N; i++) {
      if (!pick[i]) continue;
      const bl = g.beats[Math.min(g.beat[i] + 1, g.beats.length - 1)] - g.beats[g.beat[i]];
      if (g.t[i] - lastT < P.minBeats * bl - 0.01) continue;
      sel.push(i);
      lastT = g.t[i];
    }

    // f) lanes
    // vocal phrases: the range of notes sung in the phrase becomes the 4 piano keys
    const range = new Map();
    for (const i of sel) {
      if (styleAt(i) !== "vocals") continue;
      const ph = g.phrase[i];
      if (!range.has(ph)) range.set(ph, []);
      range.get(ph).push(g.pitch[i]);
    }
    for (const [ph, ps] of range) range.set(ph, [percentile(ps, 10), percentile(ps, 90)]);

    const laneOf = new Map(), chordOf = new Map();
    const lanes = [];
    let lane = 1, prevPitch = null, trill = 1, lastDrum = null;
    sel.forEach((i, k) => {
      const st = styleAt(i), gap = k ? (g.t[i] - g.t[sel[k - 1]]) / pd : 9, prev = k ? lanes[k - 1] : null;
      const copied = twin[i] >= 0 ? laneOf.get(twin[i]) : undefined;
      if (copied !== undefined) {
        lane = copied;
      } else if (st === "vocals") {
        const [plo, phi] = range.get(g.phrase[i]);
        if (phi - plo >= 3) lane = clamp(Math.round((g.pitch[i] - plo) / (phi - plo) * 3), 0, 3);   // piano keys
        else lane = contourStep(lane, prevPitch, g.pitch[i], gap);
      } else if (st === "drums") {
        const kind = g.K[i] >= g.S[i] && (g.K[i] >= 0.7 * g.Hh[i] || !P.hats) ? "kick" : (g.S[i] >= 0.7 * g.Hh[i] || !P.hats) ? "snare" : "hat";
        const home = diff === "easy" ? { kick: [1, 1], snare: [2, 2], hat: [1, 2] } : { kick: [0, 1], snare: [3, 2], hat: [1, 2] };
        const fast = lastDrum && lastDrum.kind === kind && (g.t[i] - lastDrum.t) / pd < 1.01;   // e.g. a kick on every beat: two keys, like two hands
        lane = kind === "hat" ? (lastDrum && lastDrum.kind === "hat" && lastDrum.lane === 1 ? 2 : 1)
          : fast ? (lastDrum.lane === home[kind][0] ? home[kind][1] : home[kind][0]) : home[kind][0];
        lastDrum = { kind, t: g.t[i], lane };
        // kick and snare together = both hands
        if (diff !== "easy" && g.K[i] > 0.5 && g.S[i] > 0.5 && rng.r() < P.chord * 4) chordOf.set(i, kind === "kick" ? 3 : 0);
      } else if (st === "beat") {
        const pats = diff === "hard" || diff === "extreme" ? BEAT_PATTERNS.concat(BEAT_PATTERNS_HARD) : BEAT_PATTERNS;
        const pat = pats[(plan.pattern.get(g.phrase[i]) || 0) % pats.length], b = g.pos16[i] >> 2;
        lane = g.q[i] === 0 ? pat[b] : 3 - pat[b];
      } else {
        lane = contourStep(lane, prevPitch, g.pitch[i], gap);
      }
      // playable: no fast repeats on one key, no big jumps on the easy maps
      if (prev !== null && lane === prev && gap < 0.5) lane = lane < 3 ? lane + 1 : lane - 1;
      if (diff === "easy" && prev !== null && Math.abs(lane - prev) >= 2 && gap < 1.5) lane = prev + (lane > prev ? 1 : -1);
      if (diff === "medium" && prev !== null && Math.abs(lane - prev) === 3 && gap < 1.0) lane = lane === 0 ? 1 : 2;
      lanes.push(lane);
      laneOf.set(i, lane);
      prevPitch = g.pitch[i];
    });

    function contourStep(cur, from, to, gap) {
      let step = 0;
      if (from !== null) {
        const d = to - from;
        if (d >= 1) step = d >= 7 && diff === "extreme" ? 2 : 1;
        else if (d <= -1) step = d <= -7 && diff === "extreme" ? -2 : -1;
      }
      if (step === 0) {
        if (gap < 0.75) { step = trill; trill = -trill; }
        else if (rng.r() < 0.5) { step = trill; trill = -trill; }
      }
      let nl = cur + step;
      if (nl < 0 || nl > 3) nl = (cur - step >= 0 && cur - step <= 3) ? cur - step : clamp(nl, 0, 3);
      return nl;
    }

    let notes = sel.map((i, k) => [g.t[i], lanes[k], 0, i]);

    // g) chords: drums (both hands) and big hits on a phrase's first beat
    const extra = [];
    notes.forEach((n, k) => {
      const i = n[3], j = twin[i];
      let other = j >= 0 && chordOf.has(j) ? chordOf.get(j) : chordOf.get(i);
      if (other === undefined && j < 0 && styleAt(i) !== "drums" && P.chord && g.pos16[i] === 0 && g.bar[i] % 4 === 0 && g.K[i] > 0.55 && rng.r() < P.chord * 4) {
        other = 3 - n[1] === n[1] ? (n[1] + 2) % 4 : 3 - n[1];
        chordOf.set(i, other);
      }
      if (other === undefined || other === n[1]) return;
      // never makes a fast repeat with the notes around it
      const near = notes.concat(extra).filter(o => o !== n && Math.abs(o[0] - n[0]) < pd * 0.5 && o[1] === other);
      if (!near.length) extra.push([n[0], other, 0, -1]);
    });
    notes = notes.concat(extra).sort((a, b) => a[0] - b[0] || a[1] - b[1]);

    // h) holds: a sung note that keeps going, or a sound that rings out; never on drums or chords
    const sm10 = smooth(A.rms, 20), holdOf = new Map();
    const times = notes.map(n => n[0]);
    for (const n of notes) {
      const i = n[3];
      if (i < 0) continue;
      const st = styleAt(i);
      if (st === "drums" || notes.some(o => o !== n && Math.abs(o[0] - n[0]) < 0.01)) continue;
      // room: until the next note (Easy), or the next note on this key (you can tap other keys while holding)
      const nxt = diff === "easy" ? times.find(t => t > n[0] + 0.01) : (notes.find(o => o[0] > n[0] + 0.01 && o[1] === n[1]) || [])[0];
      const room = nxt !== undefined ? nxt - n[0] : 4 * pd;
      let len = 0;
      const j = twin[i];
      if (j >= 0 && holdOf.has(j)) len = holdOf.get(j);
      else if (j < 0) {
        let sustain = 0;
        if (st === "vocals") {
          const p0 = g.pitch[i];
          let f = Math.round((n[0] + 0.03 - A.ft0) / A.dt);
          while (f < A.frames && A.voiced[f] > 0.18 && Math.abs(A.pitch[f] - p0) <= 2) f++;
          sustain = A.ft0 + f * A.dt - n[0];
          if (rng.r() > Math.min(0.8, P.hold * 2.6)) sustain = 0;
        } else if (rng.r() < P.hold) {
          const f0 = Math.round((n[0] - A.ft0) / A.dt), lvl = Math.max(1e-3, A.at(sm10, n[0]));
          let f = f0 + 2;
          while (f < A.frames && A.rms[f] >= 0.6 * lvl) f++;
          sustain = A.ft0 + f * A.dt - n[0];
        }
        len = Math.floor(Math.min(4, sustain / pd));
      }
      len = Math.min(len, Math.floor((room - pd * 0.5) / pd));
      if (len < 1) continue;
      const end = n[0] + len * pd;
      if (end > A.dur - 1.5) continue;
      if (plan.flipEdges.some(ed => n[0] - 0.1 < ed + GAP_AFTER && end + 0.3 > ed - GAP_BEFORE)) continue;
      n[2] = +(len * pd).toFixed(4);
      holdOf.set(i, len);
    }
    return notes.map(n => [+n[0].toFixed(4), n[1], n[2]]);
  }

  // every difficulty for one song (same phrase plan for all of them)
  async function makeCharts(A, bpm, beat0, choruses) {
    const g = buildGrid(A, bpm, beat0, choruses), plan = planPhrases(A, g);
    plan.flipEdges = choruses.flat();
    const charts = {};
    for (let j = 0; j < DIFF_NAMES.length; j++) {
      charts[DIFF_NAMES[j]] = makeChart(A, g, plan, DIFF_NAMES[j], 4242 + j * 7919);
      await tick();
    }
    return { charts, phrases: plan.starts };
  }

  /* ---------------------------------------------------------------- the whole thing */

  // buffer: decoded audio. progress(label, 0..1). opts:
  //   tempo: { bpm, beat0 }   use these instead of finding the tempo
  //   choruses: [[s, e], ...] use these board flips instead of finding them
  //   tempoOnly: true         just the tempo and loudness (menu music)
  async function analyze(buffer, progress, opts = {}) {
    const A = await listen(buffer, progress);
    progress("Finding the beat", 0.62); await tick();
    const { bpm, beat0 } = opts.tempo || await findTempo(A);
    const base = { bpm: +bpm.toFixed(3), beat0: +beat0.toFixed(4), duration: +A.dur.toFixed(3), lufs: A.lufs };
    if (opts.tempoOnly) return base;
    progress("Finding the chorus", 0.72); await tick();
    let choruses = opts.choruses;
    if (!choruses) {
      const bar0 = buildGridBar0(A, bpm, beat0);
      for (const pct of [62, 52, 42]) { choruses = findChoruses(A, bpm, bar0, pct); if (choruses.length) break; }
    }
    progress("Making the maps", 0.8); await tick();
    const { charts, phrases } = await makeCharts(A, bpm, beat0, choruses);
    return Object.assign(base, { choruses, preview: +(choruses.length ? choruses[0][0] : A.dur * 0.3).toFixed(3), charts, phrases, mv: MAP_VERSION });
  }

  // first downbeat, moved back to the start of the song
  function buildGridBar0(A, bpm, beat0) {
    const beats = trackBeats(A, bpm, beat0), p = 60 / bpm;
    let bar0 = beats[Math.min(downbeatPhase(A, beats), beats.length - 1)];
    while (bar0 - 4 * p > 0) bar0 -= 4 * p;
    return bar0;
  }

  return { analyze, TARGET_LUFS, MAP_VERSION, internals: { listen, buildGrid, planPhrases, makeChart, DIFF } };   // internals: for tools/ only
})();

if (typeof module !== "undefined") module.exports = GEN;   // so tools/build-charts.js can use it in Node
