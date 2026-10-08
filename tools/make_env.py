"""Shrinks lighting environments (HDR panoramas) for the 3D dice and writes them to img/.

    python tools/make_env.py <folder holding the 1k .hdr files>

Sources are from Poly Haven (https://polyhaven.com, CC0): abandoned_garage, rogland_sunset and rogland_clear_night,
downloaded as "<name>_1k.hdr". Needs ffmpeg on the path (to read them) and numpy.

They are only ever seen blurred and reflected in a die, so 512 x 256 is plenty. Brightness is kept as real numbers,
not squeezed into 0 to 1, because that range is the whole point of using them. The very brightest spots (the sun)
are capped: the page lights the scene from that direction with a lamp of its own, and an uncapped sun sparkles.
Prints where the brightest light sits, which the page needs to line its own lamp up with it.
"""
import math, os, subprocess, sys
import numpy as np

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', 'img')
W, H, CAP = 512, 256, 40.0
# name in img/: source file
ENVS = {'env-garage': 'abandoned_garage_1k.hdr', 'env-dusk': 'rogland_sunset_1k.hdr', 'env-night': 'rogland_clear_night_1k.hdr'}

def read(path):
    w, h = [int(v) for v in subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', path], capture_output=True, text=True).stdout.strip().split(',')]
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'gbrpf32le', '-'], capture_output=True).stdout
    g, b, r = np.frombuffer(raw, np.float32).reshape(3, h, w)          # ffmpeg hands planes back as green, blue, red
    return np.stack([r, g, b], -1)

def shrink(a):
    fy, fx = a.shape[0] // H, a.shape[1] // W
    return a[:H * fy, :W * fx].reshape(H, fy, W, fx, 3).mean((1, 3))

def write(path, a):
    """Radiance .hdr, stored flat (no run-length packing): red, green, blue and a shared exponent per pixel."""
    m = a.max(-1); mant, exp = np.frexp(np.maximum(m, 1e-32))
    scale = np.where(m > 1e-32, mant * 256.0 / np.maximum(m, 1e-32), 0)
    rgbe = np.zeros(a.shape[:2] + (4,), np.uint8)
    rgbe[..., :3] = np.clip(a * scale[..., None], 0, 255).astype(np.uint8)
    rgbe[..., 3] = np.where(m > 1e-32, exp + 128, 0).astype(np.uint8)
    with open(path, 'wb') as f:
        f.write(('#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y %d +X %d\n' % (H, W)).encode('ascii')); f.write(rgbe.tobytes())

for name, src in ENVS.items():
    a = shrink(read(os.path.join(SRC, src)))
    lum = a.mean(-1); y, x = np.unravel_index(lum.argmax(), lum.shape)
    az = ((x + .5) / W - .5) * 360; el = (.5 - (y + .5) / H) * 180        # where three.js will see that spot: degrees round from +x toward +z, and up
    write(os.path.join(OUT, name + '.hdr'), np.minimum(a, CAP))
    print('%-10s brightest %7.1f at azimuth %6.1f, elevation %5.1f. Average light %.2f, typical %.3f' % (name, lum.max(), az, el, np.minimum(a, CAP).mean(), np.median(lum)))
