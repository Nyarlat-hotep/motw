"""Makes the strip of flame frames for the big moments out of a Unity Labs flame flipbook and writes it into img/.

    python -I tools/make_fx.py <the unzipped Flame02 folder>

The flipbooks are CC0: https://unity.com/blog/engine-platform/free-vfx-image-sequences-flipbooks (Flame02, "Flipbooks").
Flame02_16x4.tga is 64 frames of a burning flame, 16 across and 4 down, each 128 x 256 on a clear ground.
fx-flame.webp is FRAMES of them, every STEP-th one, FW x FH each, side by side. The page has the same count
(`FXFLAME` and the `fxframes` keyframes), so change them together. The page shows no flames when the file is missing.
Needs Pillow with WebP. Run with -I: the flipbook is somebody else's file.
"""
import os, site, sys
sys.path.append(site.getusersitepackages())   # -I leaves the user's own packages out; Pillow lives there
from PIL import Image

SRC = os.path.join(sys.argv[1], 'Flame02_16x4.tga')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'img')
COLS, ROWS, CW, CH = 16, 4, 128, 256
FRAMES, STEP, FW, FH = 20, 2, 96, 192

sheet = Image.open(SRC).convert('RGBA')
assert sheet.size == (COLS * CW, ROWS * CH), sheet.size
strip = Image.new('RGBA', (FRAMES * FW, FH), (0, 0, 0, 0))
for i in range(FRAMES):
    n = i * STEP
    x, y = (n % COLS) * CW, (n // COLS) * CH
    frame = sheet.crop((x, y, x + CW, y + CH)).resize((FW, FH), Image.LANCZOS)
    # the faint outer haze is dark red, which reads as soot on a light page: keep the fire and let the haze go
    r, g, b, a = frame.split()
    a = a.point(lambda v: 0 if v < 14 else min(255, int((v - 14) * 1.22)))
    strip.paste(Image.merge('RGBA', (r, g, b, a)), (i * FW, 0))
path = os.path.join(OUT, 'fx-flame.webp')
strip.save(path, 'WEBP', quality=70, alpha_quality=75, method=6)
print('fx-flame.webp  %d frames of %d x %d  %.1f KB' % (FRAMES, FW, FH, os.path.getsize(path) / 1024.))
