// Everything a page sends to the table is someone else's data to every other page, so the server cleans it before keeping or passing it on:
// known keys only, every number clamped, every string cut to length with control characters removed. Anything that cannot be made safe becomes null.
// The page still checks and escapes whatever it receives (as it does for a dice code); this is the second lock, not the only one.
//
// No Cloudflare-only imports, so tests/t22.js runs it in plain Node.

const HEX = /^#[0-9a-f]{6}$/i;
const WORD = /[^a-z0-9_-]/gi;
const ci = (v, lo, hi, d) => { v = Math.round(Number(v)); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
// control characters, and the two Unicode line separators, become spaces; stops reading at the length limit
const odd = (c) => c < 32 || c === 127 || c === 0x2028 || c === 0x2029;
const str = (v, max) => { if (typeof v !== 'string') return ''; let o = ''; for (let i = 0; i < v.length && o.length < max; i++) o += odd(v.charCodeAt(i)) ? ' ' : v[i]; return o; };
const strt = (v, max) => str(v, max).trim();
const list = (a, n, m) => (Array.isArray(a) ? a.slice(0, n).map((x) => strt(x, m)).filter(Boolean) : []);
const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);

export const LIMITS = { message: 40000, card: 32000, roll: 1500, image: 700 * 1024, rolls: 50, images: 300 };

export function cleanName(v, fallback) {
  const s = str(v, 60).replace(/\s+/g, ' ').trim().slice(0, 30).trim();
  return s || fallback || '';
}

/* what the Party tab shows for one hunter: the same fields as the page's partyBody() */
export function cleanCard(c) {
  if (!isObj(c)) return null;
  const st = isObj(c.stats) ? c.stats : {};
  // a small JPEG made in the page; anything else is dropped rather than stored
  const photo = typeof c.photo === 'string' && c.photo.length <= 24000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]*$/.test(c.photo) ? c.photo : '';
  return {
    name: strt(c.name, 60), pronouns: strt(c.pronouns, 40), playbook: strt(c.playbook, 40), catchline: strt(c.catchline, 200), look: strt(c.look, 280), photo,
    stats: { charm: ci(st.charm, -3, 5, 0), cool: ci(st.cool, -3, 5, 0), sharp: ci(st.sharp, -3, 5, 0), tough: ci(st.tough, -3, 5, 0), weird: ci(st.weird, -3, 5, 0) },
    luck: ci(c.luck, 0, 7, 7), harm: ci(c.harm, 0, 8, 0), unstable: c.unstable === true, xp: ci(c.xp, 0, 9, 0), level: ci(c.level, 0, 20, 0), armor: ci(c.armor, 0, 9, 0),
    weapons: list(c.weapons, 6, 60), moves: list(c.moves, 12, 60)
  };
}

/* a player's two dice and tray, in the shape of the page's dice codes. The page runs them through strictDie again, which knows the finish and sigil lists. */
export function cleanDice(d) {
  if (!isObj(d)) return null;
  const one = (x) => (isObj(x) && HEX.test(x.body) && HEX.test(x.pip)
    ? { body: x.body.toLowerCase(), pip: x.pip.toLowerCase(), finish: str(x.finish, 24).replace(WORD, ''), sigil: str(x.sigil, 32).replace(WORD, ''), glow: x.glow === true } : null);
  const a = one(d.a), b = one(d.b);
  if (!a || !b) return null;
  return { a, b, tray: str(d.tray, 24).replace(WORD, '') };
}

/* one roll for the feed. The dice must be real faces; the total and the tier are worked out here from the dice, the modifier and Luck,
   so a page cannot post a roll that does not add up. (Rolls are still the player's own: the server cannot know the dice were fair.) */
export function cleanRoll(r) {
  if (!isObj(r)) return null;
  const face = (v) => Number.isInteger(v) && v >= 1 && v <= 6;
  if (!face(r.d1) || !face(r.d2)) return null;
  const mod = ci(r.mod, -15, 15, 0), luck = r.luck === true, total = luck ? 12 : r.d1 + r.d2 + mod;
  return { move: strt(r.move, 80), d1: r.d1, d2: r.d2, mod, total, tier: total >= 10 ? 'full' : total >= 7 ? 'part' : 'miss', luck, dice: cleanDice(r.dice) };
}

/* a picture the Keeper posts: JPEG or WebP, by its first bytes, within the size cap. Returns the type or null. */
export function imageType(bytes) {
  if (!bytes || bytes.length < 12 || bytes.length > LIMITS.image) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
  return null;
}
