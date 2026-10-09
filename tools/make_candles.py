"""Makes the flame and the wisp of smoke for the Luck candles out of Kenney's Particle Pack and writes them into img/.

    python tools/make_candles.py <the unzipped pack folder>

The pack is CC0: https://kenney.nl/assets/particle-pack (Particle Pack 1.1).
Its sprites are white on clear, and it has one still flame. The moving flame is that one picture bent a little differently
in each frame: the tip leans, a ripple travels up it, and it stretches and breathes. Every motion comes back to where it started,
so the last frame runs into the first. Each frame is then coloured by how solid a pixel is: a pale core, an amber body,
an orange edge and a little blue at the foot. The smoke is left white, and the page darkens it by day.

candle-flame.png is FRAMES frames of FW x FH side by side. The page has the same three numbers (in `candleSVG` and the
`cframes` keyframes), so change them together. The page draws its own flame and smoke when these files are missing. Needs Pillow.
"""
import math, os, sys
from PIL import Image

SRC = os.path.join(sys.argv[1], 'PNG (Transparent)')
OUT = os.path.join(os.path.dirname(__file__), '..', 'img')
FRAMES, FW, FH = 16, 40, 72
TALL = 58          # how tall the flame stands in its frame when it is not stretching
SS = 3             # frames are drawn this many times too big and scaled down, which smooths the edges

# how solid a pixel is (0 to 1): the colour it gets
RAMP = [(0.0, (255, 84, 8)), (0.45, (255, 128, 18)), (0.72, (255, 176, 44)), (0.9, (255, 216, 104)), (1.0, (255, 244, 196))]
FOOT = (70, 120, 255)

def alpha(name):
    """the sprite's alpha, cropped to what is drawn"""
    a = Image.open(os.path.join(SRC, name)).convert('RGBA').split()[3]
    return a.crop(a.point(lambda v: 255 if v > 10 else 0).getbbox())

def ramp(t):
    for (t0, c0), (t1, c1) in zip(RAMP, RAMP[1:]):
        if t <= t1:
            k = (t - t0) / (t1 - t0); return [c0[j] + (c1[j] - c0[j]) * k for j in range(3)]
    return list(RAMP[-1][1])

def save(im, name):
    path = os.path.join(OUT, name); im.save(path, optimize=True)
    print('%-18s %3d x %3d  %.1f KB' % (name, im.width, im.height, os.path.getsize(path) / 1024.))

src = alpha('flame_05.png'); sw, sh = src.size; spx = src.load()
def sample(x, y):
    """the still flame at a point between pixels"""
    if x < 0 or y < 0 or x > sw - 1 or y > sh - 1: return 0.0
    x0, y0 = int(x), int(y); x1, y1 = min(x0 + 1, sw - 1), min(y0 + 1, sh - 1); fx, fy = x - x0, y - y0
    return ((spx[x0, y0] * (1 - fx) + spx[x1, y0] * fx) * (1 - fy) + (spx[x0, y1] * (1 - fx) + spx[x1, y1] * fx) * fy) / 255.0

TAU = 2 * math.pi
def frame(t):
    """the flame at time t (0 to 1, and 1 is 0 again), as alpha"""
    W, H = FW * SS, FH * SS; tall = TALL * SS; wide = tall * sw / float(sh)
    stretch = 1 + 0.07 * math.sin(TAU * t) + 0.035 * math.sin(TAU * 2 * t + 1.0)
    im = Image.new('L', (W, H)); px = im.load()
    for y in range(H):
        u = (H - 1 - y) / float(tall) / stretch                      # 0 at the foot, 1 at the tip
        if u > 1: continue
        lean = wide * (0.20 * u ** 1.8 * math.sin(TAU * t + 0.4) + 0.09 * u ** 1.3 * math.sin(TAU * (2 * t - 1.6 * u)))
        girth = 1 + 0.10 * (0.3 + 0.7 * u) * math.sin(TAU * (t - 1.2 * u) + 2.0)
        for x in range(W):
            v = sample(((x - W / 2.0 - lean) / girth / wide + 0.5) * (sw - 1), (1 - u) * (sh - 1))
            if v > 0: px[x, y] = int(round(255 * v))
    return im.resize((FW, FH), Image.LANCZOS)

strip = Image.new('RGBA', (FW * FRAMES, FH)); out = strip.load()
for f in range(FRAMES):
    a = frame(f / float(FRAMES)).load()
    for y in range(FH):
        foot = max(0.0, (y - (FH - 1 - TALL * 0.2)) / (TALL * 0.2))  # 0 above the bottom fifth of the flame, 1 at the very bottom
        for x in range(FW):
            t = (a[x, y] / 255.0) ** 0.6                             # the sprite fades towards its tip; lift that so the tip is still a flame
            k = foot * (1 - t) * 0.9
            out[f * FW + x, y] = tuple(int(c + (b - c) * k) for c, b in zip(ramp(t), FOOT)) + (int(round(255 * min(1.0, t * 1.15) ** 0.7)),)
save(strip, 'candle-flame.png')

a = alpha('trace_03.png'); a = a.resize((max(1, round(a.width * 128 / a.height)), 128), Image.LANCZOS)
smoke = Image.new('RGBA', a.size, (255, 255, 255, 0)); smoke.putalpha(a)
save(smoke, 'candle-smoke.png')
