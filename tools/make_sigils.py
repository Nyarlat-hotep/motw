"""Turns sigil artwork into one-color outlines and writes them into index.html.

Each picture is reduced to a stamp (where the mark is, and nothing else), traced, and stored as an SVG path that is
drawn in the die's pip color. They live in the page between /*SIGILART*/ and /*END SIGILART*/, so there are no
extra files to load and they work when the page is opened straight from disk.

    python tools/make_sigils.py <folder of source images>

Needs Pillow, numpy, scipy and contourpy (contourpy comes with matplotlib).
Sources work best as a bold, flat, light symbol on a plain dark background.
"""
import os, re, sys
import numpy as np
from PIL import Image, ImageFilter
from contourpy import contour_generator
from scipy.ndimage import label

SRC = sys.argv[1]
PAGE = os.path.join(os.path.dirname(__file__), '..', 'index.html')

def load(f): return np.asarray(Image.open(os.path.join(SRC, f)).convert('RGB')).astype(np.float32)
def lum(a): return a[..., 0] * .299 + a[..., 1] * .587 + a[..., 2] * .114
def ramp(x, lo, hi): return np.clip((x - lo) / float(hi - lo), 0, 1)
def disc(a, r):
    h, w = a.shape[:2]; yy, xx = np.mgrid[0:h, 0:w]
    return ((xx - w / 2.) ** 2 + (yy - h / 2.) ** 2) ** .5 < r * w / 2.

# one function per sigil: source picture in, "how much mark is here" (0 to 1) out
def pentagram():
    return ramp(lum(load('22.webp')), 70, 150)
def pentacle():
    a = load('21.webp'); gold = (a.max(-1) - a.min(-1)) / (a.max(-1) + 1)
    return np.maximum(ramp(110 - lum(a), 0, 50) * disc(a, .9), ramp(gold, .3, .45) * disc(a, .99))
def crescent():
    return ramp(lum(load('30.webp')), 55, 140)
def skull():
    a = load('24.webp'); bone = ramp(a[..., 0] - a[..., 2], 14, 30)   # bone is warm, the backdrop is grey
    bone = np.asarray(Image.fromarray((bone * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(7))).astype(np.float32) / 255
    near = np.asarray(Image.fromarray((bone * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(31))).astype(np.float32) / 255
    bone = np.maximum(bone, near * ramp(lum(a), 165, 190))          # shiny spots on the bone are white, not warm
    return bone * ramp(lum(a), 62, 92)                              # solid bone, open sockets, nose and jaw gaps
def antler():
    a = load('32.webp')
    return ramp(168 - lum(a), 0, 30) * disc(a, 1.2)                # the disc keeps the photo's dark corners out

# name: (function, blur before tracing, smallest island or hole kept, how closely the outline follows, in 240ths of the face)
SIGILS = {'pentagram': (pentagram, 1.2, 14, .5), 'pentacle': (pentacle, 1.2, 14, .5), 'crescent': (crescent, 1.5, 30, .35),
          'skull': (skull, 1.6, 16, .45), 'antler': (antler, 1.2, 60, .45)}

def square(alpha):
    """crop to the mark, centre it in a square with a small margin, 256px"""
    lab, n = label(alpha > .4)                        # throw away stray specks so they cannot shift the framing
    if n: alpha = alpha * np.isin(lab, 1 + np.flatnonzero(np.bincount(lab.ravel())[1:] > alpha.size * .0015))
    im = Image.fromarray((alpha * 255).astype(np.uint8))
    im = im.crop(im.point(lambda v: 255 if v > 40 else 0).getbbox()); s = int(max(im.size) * 1.08)
    sq = Image.new('L', (s, s), 0); sq.paste(im, ((s - im.width) // 2, (s - im.height) // 2))
    return sq.resize((256, 256), Image.LANCZOS)

def thin(p, eps):
    """drop points that sit within eps of the line through their neighbours (Ramer-Douglas-Peucker)"""
    keep = np.zeros(len(p), bool); keep[0] = keep[-1] = True; stack = [(0, len(p) - 1)]
    while stack:
        i, j = stack.pop()
        if j - i < 2: continue
        a, b = p[i], p[j]; ab = b - a; n = np.hypot(*ab) or 1e-9
        d = np.abs(ab[0] * (p[i + 1:j, 1] - a[1]) - ab[1] * (p[i + 1:j, 0] - a[0])) / n
        k = int(d.argmax())
        if d[k] > eps: keep[i + 1 + k] = True; stack += [(i, i + 1 + k), (i + 1 + k, j)]
    return p[keep]

def trace(mask, blur, small, eps):
    z = np.asarray(mask.filter(ImageFilter.GaussianBlur(blur))).astype(np.float32) / 255
    z = np.pad(z, 2)                                   # so every outline closes
    d = ''
    for line in contour_generator(z=z).lines(.5):
        p = (np.asarray(line) - 2) * 240 / 256.       # the face is 240 units across
        x, y = p[:, 0], p[:, 1]
        if abs(np.dot(x, np.roll(y, 1)) - np.dot(y, np.roll(x, 1))) / 2 < small: continue
        far = int(np.hypot(*(p - p[0]).T).argmax())   # an outline ends where it starts, so thin it as two halves
        p = np.rint(np.vstack([thin(p[:far + 1], eps), thin(p[far:], eps)[1:]])).astype(int)
        if len(p) < 4: continue
        d += 'M' + ' '.join('%d %d' % (q[0], q[1]) for q in p[:-1]) + 'z'
    return '<path fill="currentColor" fill-rule="evenodd" transform="scale(.1)" d="' + d + '"/>'

out = []
for name, (fn, blur, small, eps) in SIGILS.items():
    path = trace(square(fn()), blur, small, eps)
    out.append("  %s: '%s'" % (name, path)); print('%-10s %5.1f KB' % (name, len(path) / 1024.))
block = '/*SIGILART*/\nvar SIGILART = {\n' + ',\n'.join(out) + '\n};\n/*END SIGILART*/'
page = open(PAGE, encoding='utf-8').read()
new, n = re.subn(r'/\*SIGILART\*/.*?/\*END SIGILART\*/', lambda m: block, page, flags=re.S)
if n != 1: sys.exit('could not find the /*SIGILART*/ block in index.html')
open(PAGE, 'w', encoding='utf-8', newline='').write(new)
print('wrote', len(out), 'sigils into index.html')
