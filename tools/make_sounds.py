"""Copies the recordings the dice sounds use out of Kenney's Impact Sounds pack into snd/.

    python tools/make_sounds.py <the pack's Audio folder>

The pack is CC0: https://kenney.nl/assets/impact-sounds (Impact Sounds 1.0, 2019).
Needs ffmpeg on the path. Files become mono MP3 so every browser can play them, cut to at most half a second.
The other recordings in snd/ were copied as they are from another project; see snd/README.md.
"""
import os, subprocess, sys

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', 'snd')

# set name in snd/: the pack's files it is made from
SETS = {
    'dicehit_glass': ['impactGlass_light_%03d.ogg' % i for i in range(5)],   # a light tap on glass: gem and fuel dice, played much faster
    'surface_soft': ['impactSoft_medium_%03d.ogg' % i for i in range(5)],    # a soft, low thud: laid under leather and felt landings
}

n = 0
for name, files in SETS.items():
    for i, f in enumerate(files):
        out = os.path.join(OUT, '%s%d.mp3' % (name, i + 1))
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(SRC, f), '-ac', '1', '-ar', '44100', '-t', '0.5',
                        '-af', 'afade=t=out:st=0.4:d=0.1', '-codec:a', 'libmp3lame', '-q:a', '4', out], check=True)
        n += 1
print('wrote', n, 'recordings into snd/')
