#!/usr/bin/env python3
"""Scroll FPS of the reader on the connected Android phone.

Open a chapter in a release build, zoom to the level to measure, then run:

    python3 scripts/scroll-fps.py [swipes]

It resets gfxinfo, flings the reader upward and reads the frame timings back
after each fling. framestats keeps only the last 120 frames, so the FPS is
taken over those frames of each fling; the gfxinfo totals cover every frame.
The swipe coordinates assume a 1080x2340 portrait screen.
"""
import subprocess, sys, time, re, statistics

PKG = 'com.comreader'
SWIPES = int(sys.argv[1]) if len(sys.argv) > 1 else 10

def adb(*args):
    return subprocess.run(['adb', 'shell', *args], capture_output=True, text=True).stdout

def framestats():
    out = adb('dumpsys', 'gfxinfo', PKG, 'framestats')
    frames = {}
    header = None
    for line in out.splitlines():
        if line.startswith('Flags,'):
            header = line.strip().strip(',').split(',')
            continue
        if header and re.match(r'^\d+,', line):
            vals = line.strip().strip(',').split(',')
            if len(vals) < len(header):
                continue
            row = dict(zip(header, (int(v) for v in vals[:len(header)])))
            if row['Flags'] != 0 or row['FrameCompleted'] == 0:
                continue
            frames[row['IntendedVsync']] = row
        elif line.startswith('---PROFILEDATA---'):
            continue
    return frames, out

adb('dumpsys', 'gfxinfo', PKG, 'reset')
frames = {}
for i in range(SWIPES):
    adb('input', 'swipe', '540', '1900', '540', '500', '300')
    time.sleep(1.6)
    f, _ = framestats()
    frames.update(f)

summary = adb('dumpsys', 'gfxinfo', PKG)
keys = sorted(frames)
# Frames are consecutive while the list is moving; a longer gap is the pause between flings.
gaps = [(b - a) / 1e6 for a, b in zip(keys, keys[1:]) if (b - a) / 1e6 < 100]
durations = [(frames[k]['FrameCompleted'] - frames[k]['IntendedVsync']) / 1e6 for k in keys]
interval = statistics.median(frames[k]['FrameInterval'] for k in keys) / 1e6 if 'FrameInterval' in frames[keys[0]] else None
print('frames captured:', len(keys), ' moving intervals:', len(gaps))
print('display frame interval (ms):', interval, ' refresh (Hz):', round(1000 / interval, 1) if interval else None)
print('median gap between frames (ms):', round(statistics.median(gaps), 2))
print('average FPS while moving:', round(1000 * len(gaps) / sum(gaps), 1))
print('frame time ms  p50 %.1f  p90 %.1f  p95 %.1f  p99 %.1f  max %.1f' % tuple(
    sorted(durations)[min(len(durations) - 1, int(len(durations) * q))] for q in (0.5, 0.9, 0.95, 0.99, 1.0)))
if interval:
    missed = sum(1 for g in gaps if g > interval * 1.5)
    print('intervals longer than 1.5 frames:', missed, '(%.1f%%)' % (100 * missed / len(gaps)))
for line in summary.splitlines():
    if re.match(r'\s*(Total frames rendered|Janky frames|50th|90th|95th|99th percentile|Number Missed Vsync|Number Slow UI thread|Number Frame deadline missed)', line):
        print('gfxinfo:', line.strip())
