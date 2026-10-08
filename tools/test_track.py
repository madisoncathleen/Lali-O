"""Temporary test track: 120 BPM click, notes alternate between lanes 2 and 3 (S / K)."""
import json, subprocess, numpy as np
SR, BPM, DUR = 44100, 120, 62.0
P = 60 / BPM
START, END = 2.0, 58.0
CHORUS = [30.0, 44.0]
LANES = (1, 2)

# ---- audio: kick-like thump on beats, tick on 8ths, higher pitch in the flip section
t = np.arange(int(SR * DUR)) / SR
y = np.zeros_like(t)
def hit(at, freq, dec, amp):
    i0 = int(at * SR); n = int(SR * 0.25)
    tt = np.arange(n) / SR
    seg = amp * np.sin(2 * np.pi * freq * tt * (1 + 2 * np.exp(-tt * 40))) * np.exp(-tt * dec)
    y[i0:i0 + n] += seg[:len(y) - i0]
k = 0
b = START - 4 * P
while b < END + 1:
    inside = CHORUS[0] <= b < CHORUS[1]
    if b >= 0:
        down = k % 4 == 0
        hit(b, (880 if down else 660) if inside else (110 if down else 90), 18, 0.9 if down else 0.7)
        hit(b + P / 2, 3000 if inside else 2200, 60, 0.18)
    b += P; k += 1
y = y / np.abs(y).max() * 0.8
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
                "-c:a", "libmp3lame", "-b:a", "160k", "audio/test.mp3"], input=y.astype(np.float32).tobytes(), check=True)

# ---- charts
def keep(tm):  # clear the zone around each flip edge (same rule as the real maps)
    return all(not (e - 0.9 < tm < e + 0.55) for e in CHORUS)
def alt(step, start=START, end=END):
    out, i, tm = [], 0, start
    while tm < end:
        if keep(tm):
            out.append([round(tm, 4), LANES[i % 2], 0.0]); i += 1
        tm += step
    return out
def hard():
    out, i, tm = [], 0, START
    while tm < END:
        bar = int((tm - START) / (4 * P))
        step = P / 2 if bar % 2 == 0 else P / 4   # a bar of 8ths, then a bar of 16ths
        if keep(tm):
            out.append([round(tm, 4), LANES[i % 2], 0.0]); i += 1
        tm += step
    return out
charts = {"easy": alt(P), "medium": alt(P / 2), "hard": hard(), "extreme": alt(P / 4)}

song = dict(id="test", file="audio/test.mp3", title="Test Track", artist="Two lanes, back and forth \u00b7 no misses",
            bpm=BPM, beat0=START % P, duration=DUR, choruses=[CHORUS], preview=START, charts=charts, noMiss=True)
txt = open("charts.js").read()
data = json.loads(txt[txt.index("=") + 1:].strip().rstrip(";"))
data["songs"] = [s for s in data["songs"] if s["id"] != "test"] + [song]   # test track sits at the bottom
open("charts.js", "w").write("window.CHARTS = " + json.dumps(data, separators=(",", ":")) + ";\n")
print({d: len(c) for d, c in charts.items()})
