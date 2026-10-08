"""Builds the pack of ready-made sigils and writes it into index.html between /*SIGILPACK*/ and /*END SIGILPACK*/.

    python tools/make_sigil_pack.py <a folder to keep downloads in>

Three sources, fetched into that folder the first time and reused after:

  game-icons.net   one-color game icons. CC BY 3.0, so the journal's credits must name the authors;
                   this script writes the list of authors actually used into the page (SIGILCREDIT).
                   https://github.com/game-icons/icons
  Noto Sans Runic  the runes. SIL Open Font License 1.1 (see vendor/OFL-Noto.txt).
  Noto Sans Symbols  alchemical and planetary signs. Same license.

To add a sigil, add a line to PICKS (or RUNES / SIGNS) and run this again. Each costs about 1 to 3 KB in the page.
Needs fontTools (it comes with matplotlib) and curl.
"""
import io, os, re, subprocess, sys, unicodedata
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.svgLib.path import parse_path

CACHE = sys.argv[1]
PAGE = os.path.join(os.path.dirname(__file__), '..', 'index.html')
ICONS = 'https://raw.githubusercontent.com/game-icons/icons/master/%s/%s.svg'
FONTS = {'runic': 'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-runic@latest/runic-400-normal.ttf',
         'symbols': 'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-symbols@latest/symbols-400-normal.ttf'}
AUTHORS = {'lorc': 'Lorc', 'delapouite': 'Delapouite', 'skoll': 'Skoll', 'caro-asercion': 'Caro Asercion', 'cathelineau': 'Cathelineau', 'carl-olsen': 'Carl Olsen', 'faithtoken': 'Faithtoken'}

# group: [(author folder, file name, key saved with the die, label shown to the player)]
PICKS = [
    ('Wasteland', [('lorc', 'gas-mask', 'gasmask', 'Gas mask'), ('delapouite', 'jerrycan', 'jerrycan', 'Jerrycan'), ('skoll', 'oil-drum', 'oildrum', 'Oil drum'),
                   ('lorc', 'biohazard', 'biohazard', 'Biohazard'), ('lorc', 'radioactive', 'radioactive', 'Radioactive'), ('lorc', 'hazard-sign', 'hazard', 'Hazard sign'),
                   ('lorc', 'skull-crossed-bones', 'jollyroger', 'Skull and bones'), ('lorc', 'scorpion', 'scorpion', 'Scorpion'), ('lorc', 'vulture', 'vulture', 'Vulture'),
                   ('delapouite', 'cactus', 'cactus', 'Cactus'), ('lorc', 'cog', 'cog', 'Cog'), ('delapouite', 'monkey-wrench', 'wrench', 'Wrench'),
                   ('delapouite', 'tire-tracks', 'tracks', 'Tire tracks'), ('delapouite', 'anarchy', 'anarchy', 'Anarchy')]),
    ('Monsters', [('delapouite', 'vampire-dracula', 'vampire', 'Vampire'), ('delapouite', 'shambling-zombie', 'zombie', 'Zombie'), ('lorc', 'werewolf', 'werewolf', 'Werewolf'),
                  ('lorc', 'wolf-head', 'wolf', 'Wolf'), ('lorc', 'dragon-head', 'dragon', 'Dragon'), ('delapouite', 'kraken-tentacle', 'tentacle', 'Tentacle'),
                  ('lorc', 'cyclops', 'cyclops', 'Cyclops'), ('cathelineau', 'witch-face', 'witch', 'Witch'), ('delapouite', 'mummy-head', 'mummy', 'Mummy'),
                  ('lorc', 'daemon-skull', 'demon', 'Demon skull'), ('delapouite', 'gargoyle', 'gargoyle', 'Gargoyle'), ('delapouite', 'bat', 'bat', 'Bat'),
                  ('carl-olsen', 'spider-alt', 'spider', 'Spider'), ('lorc', 'raven', 'raven', 'Raven'), ('lorc', 'bestial-fangs', 'fangs', 'Fangs')]),
    ('Spirits', [('lorc', 'ghost', 'ghost', 'Ghost'), ('delapouite', 'floating-ghost', 'wraith', 'Wraith'), ('lorc', 'spectre', 'spectre', 'Spectre'),
                 ('lorc', 'haunting', 'haunting', 'Haunting'), ('lorc', 'grim-reaper', 'reaper', 'Grim reaper'), ('lorc', 'spark-spirit', 'spirit', 'Spirit'),
                 ('lorc', 'candle-skull', 'candleskull', 'Candle skull'), ('lorc', 'reaper-scythe', 'scythe', 'Scythe')]),
    ('Symbols', [('lorc', 'ankh', 'ankh', 'Ankh'), ('delapouite', 'triquetra', 'triquetra', 'Triquetra'), ('delapouite', 'all-seeing-eye', 'allseeing', 'All-seeing eye'),
                 ('delapouite', 'eye-of-horus', 'horus', 'Eye of Horus'), ('lorc', 'omega', 'omega', 'Omega'), ('lorc', 'crossed-bones', 'bones', 'Crossed bones'),
                 ('lorc', 'rune-stone', 'runestone', 'Rune stone'), ('lorc', 'pentagram-rose', 'rose', 'Pentagram rose'), ('caro-asercion', 'heraldic-sun', 'heraldsun', 'Heraldic sun'),
                 ('delapouite', 'hand-of-god', 'handofgod', 'Hand of god'), ('lorc', 'ouroboros', 'ouroboros', 'Ouroboros'), ('lorc', 'hourglass', 'hourglass', 'Hourglass')]),
    ('Tarot', [('caro-asercion', 'tarot-%02d-%s' % (i, f), 'tarot-' + k, n) for i, (f, k, n) in enumerate([
        ('the-fool', 'fool', 'The Fool'), ('the-magician', 'magician', 'The Magician'), ('the-high-priestess', 'priestess', 'The High Priestess'), ('the-empress', 'empress', 'The Empress'),
        ('the-emperor', 'emperor', 'The Emperor'), ('the-hierophant', 'hierophant', 'The Hierophant'), ('the-lovers', 'lovers', 'The Lovers'), ('the-chariot', 'chariot', 'The Chariot'),
        ('strength', 'strength', 'Strength'), ('the-hermit', 'hermit', 'The Hermit'), ('wheel-of-fortune', 'wheel', 'Wheel of Fortune'), ('justice', 'justice', 'Justice'),
        ('the-hanged-man', 'hanged', 'The Hanged Man'), ('death', 'death', 'Death'), ('temperance', 'temperance', 'Temperance'), ('the-devil', 'devil', 'The Devil'),
        ('the-tower', 'tower', 'The Tower'), ('the-star', 'star', 'The Star'), ('the-moon', 'moon', 'The Moon'), ('the-sun', 'sun', 'The Sun'),
        ('judgement', 'judgement', 'Judgement'), ('the-world', 'world', 'The World')])]),
]
# the Elder Futhark, in order: (code point, key, label)
RUNES = [(0x16A0, 'fehu', 'Fehu'), (0x16A2, 'uruz', 'Uruz'), (0x16A6, 'thurisaz', 'Thurisaz'), (0x16A8, 'ansuz', 'Ansuz'), (0x16B1, 'raido', 'Raido'), (0x16B2, 'kaunan', 'Kaunan'),
         (0x16B7, 'gebo', 'Gebo'), (0x16B9, 'wunjo', 'Wunjo'), (0x16BA, 'hagalaz', 'Hagalaz'), (0x16BE, 'naudiz', 'Naudiz'), (0x16C1, 'isaz', 'Isaz'), (0x16C3, 'jera', 'Jera'),
         (0x16C7, 'eihwaz', 'Eihwaz'), (0x16C8, 'perth', 'Perth'), (0x16C9, 'algiz', 'Algiz'), (0x16CA, 'sowilo', 'Sowilo'), (0x16CF, 'tiwaz', 'Tiwaz'), (0x16D2, 'berkanan', 'Berkanan'),
         (0x16D6, 'ehwaz', 'Ehwaz'), (0x16D7, 'mannaz', 'Mannaz'), (0x16DA, 'laguz', 'Laguz'), (0x16DC, 'ingwaz', 'Ingwaz'), (0x16DF, 'othala', 'Othala'), (0x16DE, 'dagaz', 'Dagaz')]
# elements, the three primes, and the old signs for the sun, the moon and the metals
SIGNS = [(0x1F702, 'fire', 'Fire'), (0x1F704, 'water', 'Water'), (0x1F701, 'air', 'Air'), (0x1F703, 'earth', 'Earth'), (0x1F700, 'aether', 'Quintessence'),
         (0x1F70D, 'sulfur', 'Sulfur'), (0x1F714, 'salt', 'Salt'), (0x263F, 'mercury', 'Mercury'), (0x1F71A, 'gold', 'Gold'), (0x263D, 'silver', 'Moon (silver)'),
         (0x2642, 'iron', 'Mars (iron)'), (0x2640, 'copper', 'Venus (copper)'), (0x2644, 'lead', 'Saturn (lead)'), (0x2643, 'tin', 'Jupiter (tin)')]

def fetch(url, name):
    path = os.path.join(CACHE, name)
    if not os.path.exists(path) or os.path.getsize(path) < 100:
        subprocess.run(['curl', '-sLf', url, '-o', path])
    return path if os.path.exists(path) and os.path.getsize(path) >= 100 else None

num = lambda v: str(int(round(v)))            # whole numbers on a 240-wide face: plenty at die size, and far shorter

def icon(author, name):
    f = fetch(ICONS % (author, name), '%s.%s.svg' % (author, name))
    if not f: return None
    paths = re.findall(r'<path[^>]*\sd="([^"]+)"', io.open(f, encoding='utf-8').read())
    if not paths: return None
    pen = SVGPathPen(None, ntos=num); s = 240 / 512.
    parse_path(paths[-1], TransformPen(pen, (s, 0, 0, s, 0, 0)))     # the last path is the drawing; the first is a black square behind it
    return pen.getCommands()

def glyph(font, cp):
    cmap = font.getBestCmap(); gs = font.getGlyphSet()
    if cp not in cmap: return None
    bp = BoundsPen(gs); gs[cmap[cp]].draw(bp)
    if not bp.bounds: return None
    x0, y0, x1, y1 = bp.bounds; s = 190.0 / max(x1 - x0, y1 - y0)   # fit a 240 box with a margin, the right way up
    pen = SVGPathPen(gs, ntos=num); gs[cmap[cp]].draw(TransformPen(pen, (s, 0, 0, -s, 120 - (x0 + x1) / 2 * s, 120 + (y0 + y1) / 2 * s)))
    return pen.getCommands()

os.makedirs(CACHE, exist_ok=True)
groups, used, seen, missed = [], [], set(), []
for group, picks in PICKS:
    rows = []
    for author, name, key, label in picks:
        d = icon(author, name)
        if not d: missed.append('%s/%s' % (author, name)); continue
        assert key not in seen, key; seen.add(key); rows.append((key, label, d))
        if AUTHORS[author] not in used: used.append(AUTHORS[author])
    groups.append((group, rows))
for group, key, table, prefix in (('Runes', 'runic', RUNES, 'rune-'), ('Elements', 'symbols', SIGNS, 'sign-')):
    f = fetch(FONTS[key], key + '.ttf'); font = TTFont(f) if f else None; rows = []
    for cp, k, label in table:
        d = glyph(font, cp) if font else None
        if not d: missed.append('%s U+%04X' % (label, cp)); continue
        print('  %-22s U+%04X %s' % (label, cp, unicodedata.name(chr(cp), '?')))
        assert prefix + k not in seen; seen.add(prefix + k); rows.append((prefix + k, label, d))
    groups.append((group, rows))

js = lambda s: "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'"
out = ['/*SIGILPACK*/', '/* made by tools/make_sigil_pack.py: [group, [[key, label, outline], ...]] */', 'var SIGILPACK = [']
out += ['  [%s, [\n%s\n  ]]%s' % (js(g), ',\n'.join('    [%s, %s, %s]' % (js(k), js(l), js(d)) for k, l, d in rows), ',' if i < len(groups) - 1 else '') for i, (g, rows) in enumerate(groups)]
out += ['];', 'var SIGILCREDIT = %s;' % js(', '.join(used)), '/*END SIGILPACK*/']
block = '\n'.join(out)
page = io.open(PAGE, encoding='utf-8', newline='').read()
new, n = re.subn(r'/\*SIGILPACK\*/.*?/\*END SIGILPACK\*/', lambda m: block, page, flags=re.S)
if n != 1: sys.exit('could not find the /*SIGILPACK*/ block in index.html')
io.open(PAGE, 'w', encoding='utf-8', newline='').write(new)
for g, rows in groups: print('%-10s %3d sigils, %5.1f KB' % (g, len(rows), sum(len(d) for _, _, d in rows) / 1024.))
print('total %.1f KB. Icon authors to credit: %s' % (len(block) / 1024., ', '.join(used)))
if missed: print('NOT FOUND, skipped:', ', '.join(missed))
