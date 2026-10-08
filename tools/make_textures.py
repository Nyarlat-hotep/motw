"""Turns source photos into the small art files the dice maker uses.

Die finishes become 256px grey tiles with the lighting flattened, so the page can lay them over any body colour.
Trays are cropped and saved as 1200px JPEGs. The reflection panorama for the 3D dice becomes img/env.jpg.

    python tools/make_textures.py <folder of source images> [<folder of Poly Haven downloads>]

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

# scratches for the clear shell of 3D fuel dice: kept as light marks on black, because the page adds it as light
GLASS = ('34.webp', (95, 95, 930, 930))
if os.path.exists(os.path.join(SRC, GLASS[0])):
    g = Image.open(os.path.join(SRC, GLASS[0])).convert('L').crop(GLASS[1]).resize((512, 512), Image.LANCZOS)
    g.point(lambda v: max(0, min(255, int((v - 26) * 1.9)))).save(os.path.join(OUT, 'die-glass.jpg'), quality=82, optimize=True)

# what shiny and clear 3D dice reflect: a 2:1 panorama, kept small because it is only ever seen blurred in a die
ENV = '20.webp'
if os.path.exists(os.path.join(SRC, ENV)):
    Image.open(os.path.join(SRC, ENV)).convert('RGB').resize((1024, 512), Image.LANCZOS).save(os.path.join(OUT, 'env.jpg'), quality=82, optimize=True, progressive=True)

# Trays for the 3D dice also get a relief map ("normal map"), so light catches grain, creases and scratches.
# The four photo trays have theirs worked out from the photo itself, which keeps every mark exactly where it is in the picture.
import numpy as np

def relief(color_path, out_path, strength):
    im = Image.open(color_path).convert('L'); im = im.resize((1024, round(1024 * im.height / im.width)), Image.LANCZOS)
    h = np.asarray(im.filter(ImageFilter.GaussianBlur(1.1))).astype(np.float32) / 255.
    dy, dx = np.gradient(h)                                   # brighter is treated as higher
    n = np.stack([-dx * strength, dy * strength, np.ones_like(h)], -1); n /= np.linalg.norm(n, axis=-1, keepdims=True)
    Image.fromarray(((n * .5 + .5) * 255).astype(np.uint8)).save(out_path, quality=84, optimize=True)

for name, strength in (('leather', 9), ('felt', 7), ('wood', 9), ('slate', 12)):
    color = os.path.join(OUT, 'tray.jpg' if name == 'leather' else 'tray-%s.jpg' % name)
    if os.path.exists(color): relief(color, os.path.join(OUT, 'tray-%s-n.jpg' % name), strength)

# Wasteland trays come whole from Poly Haven (https://polyhaven.com, CC0): color, relief and a map of how shiny each spot is.
# Give the folder holding "<id>_diff.jpg", "<id>_nor.jpg" and "<id>_rough.jpg" (the 1k JPG downloads) as a second argument.
PH = sys.argv[2] if len(sys.argv) > 2 else None
WASTE = {'rust': 'rusty_metal_04', 'dust': 'brown_mud_dry', 'concrete': 'concrete_floor_worn_001'}
made = 0
if PH:
    yy, xx = np.mgrid[0:576, 0:1200]
    edge = np.clip(1.08 - (((xx - 600) / 600.) ** 2 + ((yy - 288) / 288.) ** 2) * .5, .38, 1)[..., None]   # the same dark corners the photo trays have
    for name, pid in WASTE.items():
        top = lambda kind: Image.open(os.path.join(PH, '%s_%s.jpg' % (pid, kind))).convert('RGB').crop((0, 0, 1024, 512))
        c = np.asarray(top('diff').resize((1200, 576), Image.LANCZOS)).astype(np.float32) * edge
        Image.fromarray(c.clip(0, 255).astype(np.uint8)).save(os.path.join(OUT, 'tray-%s.jpg' % name), quality=78, optimize=True, progressive=True)
        top('nor').save(os.path.join(OUT, 'tray-%s-n.jpg' % name), quality=84, optimize=True)
        top('rough').convert('L').resize((512, 256), Image.LANCZOS).save(os.path.join(OUT, 'tray-%s-r.jpg' % name), quality=80, optimize=True)
        made += 1

print('wrote', len(DICE), 'die textures,', len(TRAYS), 'photo trays with relief and', made, 'wasteland trays')

