"""Makes the strip of dust puffs out of Kenney's Smoke Particles and writes it into img/.

    python -I tools/make_puff.py <the unzipped pack's PNG folder>

The pack is CC0: https://kenney.nl/assets/smoke-particles. "White puff" holds 25 different puffs (they are
variations, not the frames of one puff), each about 380 x 350, white on a clear ground.
fx-puff.webp is PUFFS of them, FW x FH each, side by side, kept white: the page tints them
with a filter (`--puff`). The page has the same count (`FXPUFF`), so change them together.
The page shows no dust when the file is missing.
Needs Pillow with WebP. Run with -I: the pack is somebody else's file.
"""
import os, site, sys
sys.path.append(site.getusersitepackages())   # -I leaves the user's own packages out; Pillow lives there
from PIL import Image

SRC = os.path.join(sys.argv[1], 'White puff')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'img')
PICK = [0, 3, 7, 8, 12, 15, 19, 22]   # eight that differ most in outline
PUFFS, FW, FH = len(PICK), 96, 88

strip = Image.new('RGBA', (PUFFS * FW, FH), (255, 255, 255, 0))
for i, n in enumerate(PICK):
    im = Image.open(os.path.join(SRC, 'whitePuff%02d.png' % n)).convert('RGBA')
    k = min(FW / im.size[0], FH / im.size[1])   # they are not all one size: fit each inside its cell
    w, h = int(im.size[0] * k), int(im.size[1] * k)
    a = im.resize((w, h), Image.LANCZOS).split()[3]
    white = Image.new('RGBA', (w, h), (255, 255, 255, 255))
    white.putalpha(a)
    strip.paste(white, (i * FW + (FW - w) // 2, (FH - h) // 2))
path = os.path.join(OUT, 'fx-puff.webp')
strip.save(path, 'WEBP', quality=60, alpha_quality=70, method=6)
print('fx-puff.webp  %d puffs of %d x %d  %.1f KB' % (PUFFS, FW, FH, os.path.getsize(path) / 1024.))
