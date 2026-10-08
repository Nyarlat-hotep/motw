"""Builds the pack of ready-made sigils and writes it to sigils.js, which the page loads if it is there.

    python tools/make_sigil_pack.py <a folder to keep downloads in>

Three sources, fetched into that folder the first time and reused after:

  game-icons.net   one-color game icons. CC BY 3.0, so the journal's credits must name the authors;
                   this script writes the list of authors actually used into sigils.js (HJ_SIGIL_CREDIT).
                   https://github.com/game-icons/icons
  Noto Sans Runic  the runes. SIL Open Font License 1.1 (see vendor/OFL-Noto.txt).
  Noto Sans Symbols  alchemical signs, the zodiac and other glyphs. Same license.

To add a sigil, add an entry to PICKS and run this again. An icon is (author folder, file name, key, label);
a letter from a font is ('runic' or 'symbols', code point, key, label). The key is what is saved with a die,
so never rename one. Anything not found is skipped and listed at the end.
Needs fontTools (it comes with matplotlib) and curl.
"""
import io, os, re, subprocess, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.svgLib.path import parse_path

CACHE = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', 'sigils.js')
ICONS = 'https://raw.githubusercontent.com/game-icons/icons/master/%s/%s.svg'
FONTS = {'runic': 'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-runic@latest/runic-400-normal.ttf',
         'symbols': 'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-symbols@latest/symbols-400-normal.ttf'}
AUTHORS = {'lorc': 'Lorc', 'delapouite': 'Delapouite', 'skoll': 'Skoll', 'caro-asercion': 'Caro Asercion', 'cathelineau': 'Cathelineau', 'carl-olsen': 'Carl Olsen',
           'faithtoken': 'Faithtoken', 'darkzaitzev': 'DarkZaitzev', 'sparker': 'Sparker', 'john-colburn': 'John Colburn', 'sbed': 'Sbed'}

def L(author, *rows):
    """rows of 'file-name key Label words' for one author"""
    out = []
    for r in rows:
        f, k, label = r.split(' ', 2); out.append((author, f, k, label))
    return out
lorc = lambda *r: L('lorc', *r)
dela = lambda *r: L('delapouite', *r)

TAROT = [('the-fool', 'fool', 'The Fool'), ('the-magician', 'magician', 'The Magician'), ('the-high-priestess', 'priestess', 'The High Priestess'), ('the-empress', 'empress', 'The Empress'),
         ('the-emperor', 'emperor', 'The Emperor'), ('the-hierophant', 'hierophant', 'The Hierophant'), ('the-lovers', 'lovers', 'The Lovers'), ('the-chariot', 'chariot', 'The Chariot'),
         ('strength', 'strength', 'Strength'), ('the-hermit', 'hermit', 'The Hermit'), ('wheel-of-fortune', 'wheel', 'Wheel of Fortune'), ('justice', 'justice', 'Justice'),
         ('the-hanged-man', 'hanged', 'The Hanged Man'), ('death', 'death', 'Death'), ('temperance', 'temperance', 'Temperance'), ('the-devil', 'devil', 'The Devil'),
         ('the-tower', 'tower', 'The Tower'), ('the-star', 'star', 'The Star'), ('the-moon', 'moon', 'The Moon'), ('the-sun', 'sun', 'The Sun'),
         ('judgement', 'judgement', 'Judgement'), ('the-world', 'world', 'The World')]
FUTHARK = [(0x16A0, 'fehu', 'Fehu'), (0x16A2, 'uruz', 'Uruz'), (0x16A6, 'thurisaz', 'Thurisaz'), (0x16A8, 'ansuz', 'Ansuz'), (0x16B1, 'raido', 'Raido'), (0x16B2, 'kaunan', 'Kaunan'),
           (0x16B7, 'gebo', 'Gebo'), (0x16B9, 'wunjo', 'Wunjo'), (0x16BA, 'hagalaz', 'Hagalaz'), (0x16BE, 'naudiz', 'Naudiz'), (0x16C1, 'isaz', 'Isaz'), (0x16C3, 'jera', 'Jera'),
           (0x16C7, 'eihwaz', 'Eihwaz'), (0x16C8, 'perth', 'Perth'), (0x16C9, 'algiz', 'Algiz'), (0x16CA, 'sowilo', 'Sowilo'), (0x16CF, 'tiwaz', 'Tiwaz'), (0x16D2, 'berkanan', 'Berkanan'),
           (0x16D6, 'ehwaz', 'Ehwaz'), (0x16D7, 'mannaz', 'Mannaz'), (0x16DA, 'laguz', 'Laguz'), (0x16DC, 'ingwaz', 'Ingwaz'), (0x16DF, 'othala', 'Othala'), (0x16DE, 'dagaz', 'Dagaz')]
ZODIAC = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']

PICKS = [
    ('Wasteland', lorc('gas-mask gasmask Gas mask', 'biohazard biohazard Biohazard', 'radioactive radioactive Radioactive', 'hazard-sign hazard Hazard sign',
                       'skull-crossed-bones jollyroger Skull and bones', 'scorpion scorpion Scorpion', 'vulture vulture Vulture', 'cog cog Cog')
                + dela('jerrycan jerrycan Jerrycan', 'cactus cactus Cactus', 'monkey-wrench wrench Wrench', 'tire-tracks tracks Tire tracks', 'anarchy anarchy Anarchy',
                       'gas-pump gaspump Gas pump', 'fuel-tank fueltank Fuel tank', 'oil-pump oilpump Oil pump', 'oil-rig oilrig Oil rig', 'car-wheel wheel Wheel',
                       'spark-plug sparkplug Spark plug', 'car-battery battery Battery', 'steering-wheel steering Steering wheel', 'crowbar crowbar Crowbar', 'jeep jeep Jeep',
                       'nuclear-waste waste Nuclear waste', 'desert desert Desert', 'steampunk-goggles goggles Goggles', 'full-motorcycle-helmet helmet Helmet',
                       'hexagonal-nut nut Nut', 'stop-sign stopsign Stop sign', 'spiked-shoulder-armor pauldron Spiked armor', 'valve valve Valve', 'horizon-road road Road',
                       'tire-iron-cross tireiron Tire irons', 'radio-tower radiotower Radio tower')
                + L('skoll', 'oil-drum oildrum Oil drum', 'nuclear-bomb bomb Bomb') + L('caro-asercion', 'warlord-helmet warlord Warlord helmet')),
    ('Hunter', dela('revolver revolver Revolver', 'sawed-off-shotgun shotgun Shotgun', 'silver-bullet silverbullet Silver bullet', 'shotgun-rounds shells Shells',
                    'heart-stake stake Stake', 'stake-hammer stakehammer Stake and hammer', 'holy-water holywater Holy water', 'crucifix crucifix Crucifix', 'katana katana Katana',
                    'chainsaw chainsaw Chainsaw', 'dynamite dynamite Dynamite', 'flamethrower flamethrower Flamethrower', 'two-handed-sword greatsword Greatsword',
                    'spell-book spellbook Spell book', 'old-lantern oldlantern Old lantern', 'torch torch Torch', 'holy-hand-grenade holygrenade Holy grenade', 'bow-arrow bow Bow')
             + lorc('bowie-knife knife Knife', 'battle-axe axe Battle axe', 'wolf-trap trap Trap', 'crossed-axes axes Crossed axes', 'crossed-swords swords Crossed swords')
             + L('carl-olsen', 'crossbow crossbow Crossbow')),
    ('Monsters', dela('vampire-dracula vampire Vampire', 'shambling-zombie zombie Zombie', 'kraken-tentacle tentacle Tentacle', 'mummy-head mummy Mummy', 'gargoyle gargoyle Gargoyle',
                      'bat bat Bat', 'goblin-head goblin Goblin', 'orc-head orc Orc', 'ogre ogre Ogre', 'devil-mask devilmask Devil mask', 'alien-bug alienbug Alien bug',
                      'shambling-mound mound Shambling mound', 'brain-tentacle mindflayer Brain tentacle', 'resting-vampire coffinvampire Resting vampire', 'jason-mask hockeymask Hockey mask',
                      'spiked-dragon-head drake Drake')
               + lorc('werewolf werewolf Werewolf', 'wolf-head wolf Wolf', 'dragon-head dragon Dragon', 'cyclops cyclops Cyclops', 'daemon-skull demon Demon skull', 'raven raven Raven',
                      'bestial-fangs fangs Fangs', 'behold beholder Watcher', 'alien-skull alienskull Alien skull', 'carrion carrion Carrion', 'centipede centipede Centipede',
                      'beast-eye beasteye Beast eye')
               + L('cathelineau', 'witch-face witch Witch', 'medusa-head medusa Medusa') + L('carl-olsen', 'spider-alt spider Spider')),
    ('Beasts', lorc('owl owl Owl', 'stag-head stag Stag', 'snake snake Snake', 'frog frog Frog', 'fox-head fox Fox', 'hound hound Hound', 'lion lion Lion', 'octopus octopus Octopus',
                    'crab crab Crab', 'gecko gecko Gecko', 'bull-horns bullhorns Bull horns', 'ram ram Ram', 'cat cat Cat', 'wasp-sting wasp Wasp', 'scarab-beetle scarab Scarab',
                    'tick tick Tick', 'shark-jaws sharkjaws Shark jaws', 'maggot maggot Maggot', 'jellyfish jellyfish Jellyfish')
             + dela('bear-head bear Bear', 'rat rat Rat', 'cobra cobra Cobra', 'rattlesnake rattlesnake Rattlesnake', 'tiger-head tiger Tiger', 'giant-squid squid Giant squid',
                    'eagle-head eagle Eagle')
             + L('skoll', 'goat goat Goat') + L('caro-asercion', 'boar boar Boar', 'hyena-head hyena Hyena', 'barn-owl barnowl Barn owl')),
    ('Spirits', lorc('ghost ghost Ghost', 'spectre spectre Spectre', 'haunting haunting Haunting', 'grim-reaper reaper Grim reaper', 'spark-spirit spirit Spirit',
                     'candle-skull candleskull Candle skull', 'reaper-scythe scythe Scythe', 'coffin coffin Coffin')
              + dela('floating-ghost wraith Wraith', 'skeletal-hand bonehand Skeletal hand', 'graveyard graveyard Graveyard', 'executioner-hood executioner Executioner',
                     'warlock-hood warlock Warlock', 'candles candles Candles', 'magic-potion potion Potion', 'shattered-heart brokenheart Shattered heart', 'star-altar altar Altar',
                     'secret-book secretbook Secret book')
              + L('darkzaitzev', 'severed-hand severedhand Severed hand', 'hooded-figure hooded Hooded figure', 'cauldron cauldron Cauldron') + L('skoll', 'hasty-grave grave Grave')),
    ('Symbols', lorc('ankh ankh Ankh', 'omega omega Omega', 'crossed-bones bones Crossed bones', 'rune-stone runestone Rune stone', 'pentagram-rose rose Pentagram rose',
                     'ouroboros ouroboros Ouroboros', 'hourglass hourglass Hourglass', 'heavy-thorny-triskelion triskelion Triskelion', 'anchor anchor Anchor')
              + dela('triquetra triquetra Triquetra', 'all-seeing-eye allseeing All-seeing eye', 'eye-of-horus horus Eye of Horus', 'hand-of-god handofgod Hand of god',
                     'yin-yang yinyang Yin and yang', 'eye-target eyetarget Eye target', 'millenium-key key Key', 'aztec-calendar-sun sunstone Sun stone', 'jewel-crown crown Crown')
              + L('caro-asercion', 'heraldic-sun heraldsun Heraldic sun')),
    ('Tarot', [('caro-asercion', 'tarot-%02d-%s' % (i, f), 'tarot-' + k, n) for i, (f, k, n) in enumerate(TAROT)]),
    ('Runes', [('runic', cp, 'rune-' + k, n) for cp, k, n in FUTHARK]),
    ('Elements', [('symbols', cp, 'sign-' + k, n) for cp, k, n in [
        (0x1F702, 'fire', 'Fire'), (0x1F704, 'water', 'Water'), (0x1F701, 'air', 'Air'), (0x1F703, 'earth', 'Earth'), (0x1F700, 'aether', 'Quintessence'),
        (0x1F70D, 'sulfur', 'Sulfur'), (0x1F714, 'salt', 'Salt'), (0x263F, 'mercury', 'Mercury'), (0x1F71A, 'gold', 'Gold'), (0x263D, 'silver', 'Moon (silver)'),
        (0x2642, 'iron', 'Mars (iron)'), (0x2640, 'copper', 'Venus (copper)'), (0x2644, 'lead', 'Saturn (lead)'), (0x2643, 'tin', 'Jupiter (tin)')]]),
    ('Zodiac', [('symbols', 0x2648 + i, 'zodiac-' + n.lower(), n) for i, n in enumerate(ZODIAC)]),
    ('Glyphs', [('symbols', cp, 'glyph-' + k, n) for cp, k, n in [
        (0x2660, 'spade', 'Spade'), (0x2665, 'heart', 'Heart'), (0x2666, 'diamond', 'Diamond'), (0x2663, 'club', 'Club'), (0x2605, 'star', 'Star'), (0x2620, 'crossbones', 'Skull glyph'),
        (0x262F, 'yinyang', 'Yin yang glyph'), (0x2694, 'swords', 'Swords glyph'), (0x2696, 'scales', 'Scales'), (0x2697, 'alembic', 'Alembic'), (0x269B, 'atom', 'Atom'),
        (0x269C, 'fleur', 'Fleur-de-lis'), (0x26A1, 'bolt', 'Lightning'), (0x2604, 'comet', 'Comet'), (0x2693, 'anchor', 'Anchor glyph'), (0x2692, 'hammers', 'Hammer and pick')]]),
]

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

fonts = {}
def glyph(key, cp):
    if key not in fonts:
        f = fetch(FONTS[key], key + '.ttf'); fonts[key] = TTFont(f) if f else None
    font = fonts[key]
    if not font: return None
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
    for src, what, key, label in picks:
        d = glyph(src, what) if src in FONTS else icon(src, what)
        if not d: missed.append('%s U+%04X' % (label, what) if src in FONTS else '%s/%s' % (src, what)); continue
        assert key not in seen, 'key used twice: ' + key
        seen.add(key); rows.append((key, label, d))
        if src not in FONTS and AUTHORS[src] not in used: used.append(AUTHORS[src])
    groups.append((group, rows))

js = lambda s: "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'"
out = ['/* Ready-made dice sigils for Hunter\'s Journal. Made by tools/make_sigil_pack.py; do not edit by hand.',
       '   Icons from game-icons.net by ' + ', '.join(used) + ' (CC BY 3.0). Runes and other glyphs from the Noto fonts (SIL OFL 1.1).',
       '   Shape: [group, [[key, label, outline on a 240-wide face], ...]] */', 'window.HJ_SIGILS = [']
out += ['  [%s, [\n%s\n  ]]%s' % (js(g), ',\n'.join('    [%s, %s, %s]' % (js(k), js(l), js(d)) for k, l, d in rows), ',' if i < len(groups) - 1 else '') for i, (g, rows) in enumerate(groups)]
out += ['];', 'window.HJ_SIGIL_CREDIT = %s;' % js(', '.join(used)), '']
text = '\n'.join(out)
io.open(OUT, 'w', encoding='utf-8', newline='').write(text)
for g, rows in groups: print('%-10s %3d sigils, %5.1f KB' % (g, len(rows), sum(len(d) for _, _, d in rows) / 1024.))
print('total %d sigils, %.1f KB in sigils.js. Icon authors to credit: %s' % (len(seen), len(text) / 1024., ', '.join(used)))
if missed: print('NOT FOUND, skipped:', ', '.join(missed))
