"""Turns source photos into the small art files the dice maker uses.

Die finishes become 256px grey tiles with the lighting flattened, so the page can lay them over any body colour.
Trays are cropped and saved as 1200px JPEGs. The reflection panorama for the 3D dice becomes img/env.jpg.

    python tools/make_textures.py <folder of source images>

The crop boxes below are (left, top, right, bottom) in source pixels.
"""
import os, sys
from PIL import Image, ImageFilter, ImageChops, ImageOps

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', 'img')

# finish: (source file, crop box, contrast)
DICE = {
    'gem':   ('2.webp',  (330, 300, 730, 700), 1.0),
    'stone': ('4.webp',  (100, 100, 800, 800), 1.0),
    'metal': ('8.webp',  (100, 100, 800, 800), 1.3),
    'resin': ('10.webp', (300, 380, 900, 980), 2.2),
    'bone':  ('15.webp', (130, 60, 760, 690), 1.3),
}
# tray: (source file, crop box or None)
TRAYS = {
    'slate': ('16.webp', None),
    'wood':  ('17.webp', (0, 0, 1600, 690)),
    'felt':  ('18.webp', (80, 50, 1520, 720)),
}

def flatten(im, contrast):
    """Grey, with slow changes in brightness removed and the average set to mid grey."""
    g = im.convert('L')
    low = g.filter(ImageFilter.GaussianBlur(g.width / 6.0))
    d = ImageChops.subtract(g, low, scale=1.0, offset=128)
    return d.point(lambda v: max(0, min(255, int(128 + (v - 128) * contrast * 1.6))))

for name, (f, box, c) in DICE.items():
    im = Image.open(os.path.join(SRC, f)).convert('RGB').crop(box)
    im = flatten(im, c).resize((256, 256), Image.LANCZOS)
    im.save(os.path.join(OUT, 'die-' + name + '.jpg'), quality=80, optimize=True)

for name, (f, box) in TRAYS.items():
    im = Image.open(os.path.join(SRC, f)).convert('RGB')
    if box: im = im.crop(box)
    im = im.resize((1200, round(1200 * im.height / im.width)), Image.LANCZOS)
    im.save(os.path.join(OUT, 'tray-' + name + '.jpg'), quality=78, optimize=True, progressive=True)

# what shiny and clear 3D dice reflect: a 2:1 panorama, kept small because it is only ever seen blurred in a die
ENV = '20.webp'
if os.path.exists(os.path.join(SRC, ENV)):
    Image.open(os.path.join(SRC, ENV)).convert('RGB').resize((1024, 512), Image.LANCZOS).save(os.path.join(OUT, 'env.jpg'), quality=82, optimize=True, progressive=True)

print('wrote', len(DICE), 'die textures and', len(TRAYS), 'trays')
