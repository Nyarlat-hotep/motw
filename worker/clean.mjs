// Everything a page sends to the table is someone else's data to every other page, so the server cleans it before keeping or passing it on:
// known keys only, every number clamped, every string cut to length with control characters removed. Anything that cannot be made safe becomes null.
// The page still checks and escapes whatever it receives (as it does for a dice code); this is the second lock, not the only one.
//
// No Cloudflare-only imports, so tests/t22.js runs it in plain Node.
import { MOVES, BADGE_IDS } from './awards.mjs';

const HEX = /^#[0-9a-f]{6}$/i;
const WORD = /[^a-z0-9_-]/gi;
const ci = (v, lo, hi, d) => { v = Math.round(Number(v)); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
// control characters, and the two Unicode line separators, become spaces; stops reading at the length limit
const odd = (c) => c < 32 || c === 127 || c === 0x2028 || c === 0x2029;
const str = (v, max) => { if (typeof v !== 'string') return ''; let o = ''; for (let i = 0; i < v.length && o.length < max; i++) o += odd(v.charCodeAt(i)) ? ' ' : v[i]; return o; };
const strt = (v, max) => str(v, max).trim();
// the same, but line breaks are kept (a handout's body is shown as plain text with its lines)
const text = (v, max) => { if (typeof v !== 'string') return ''; v = v.replace(/\r\n?/g, '\n'); let o = ''; for (let i = 0; i < v.length && o.length < max; i++) { const k = v.charCodeAt(i); o += k === 10 ? '\n' : odd(k) ? ' ' : v[i]; } return o.replace(/\n{4,}/g, '\n\n\n').trim(); };
const list = (a, n, m) => (Array.isArray(a) ? a.slice(0, n).map((x) => strt(x, m)).filter(Boolean) : []);
const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);

export const LIMITS = { message: 80000, card: 64000, roll: 1500, image: 700 * 1024, rolls: 50, images: 300, handouts: 60, tallies: 20, pins: 5 };
const HID = /^[a-z0-9]{6,20}$/;                 // a hunter's own id, made by the page once and kept for the hunter's life
export const hunterId = (v) => (typeof v === 'string' && HID.test(v) ? v : '');
export const KINDS = ['scene', 'clue', 'person', 'place', 'note'];

export function cleanName(v, fallback) {
  const s = str(v, 60).replace(/\s+/g, ' ').trim().slice(0, 30).trim();
  return s || fallback || '';
}

/* what the Party tab shows for one hunter: the same fields as the page's partyBody() */
export function cleanCard(c) {
  if (!isObj(c)) return null;
  const st = isObj(c.stats) ? c.stats : {};
  // a small JPEG made in the page; anything else is dropped rather than stored
  const photo = typeof c.photo === 'string' && c.photo.length <= 48000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]*$/.test(c.photo) ? c.photo : '';
  return {
    name: strt(c.name, 60), pronouns: strt(c.pronouns, 40), playbook: strt(c.playbook, 40), catchline: strt(c.catchline, 200), look: strt(c.look, 280), photo,
    stats: { charm: ci(st.charm, -3, 5, 0), cool: ci(st.cool, -3, 5, 0), sharp: ci(st.sharp, -3, 5, 0), tough: ci(st.tough, -3, 5, 0), weird: ci(st.weird, -3, 5, 0) },
    luck: ci(c.luck, 0, 7, 7), harm: ci(c.harm, 0, 8, 0), unstable: c.unstable === true, xp: ci(c.xp, 0, 9, 0), level: ci(c.level, 0, 20, 0), armor: ci(c.armor, 0, 9, 0),
    weapons: list(c.weapons, 6, 60), moves: list(c.moves, 12, 60),
    // which hunter this is, and the badges they have pinned: only ids from the list, each once, five at most
    hid: hunterId(c.hid), pins: (Array.isArray(c.pins) ? c.pins : []).filter((b, i, a) => typeof b === 'string' && BADGE_IDS.includes(b) && a.indexOf(b) === i).slice(0, LIMITS.pins)
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
  // for the session's count: which hunter rolled, which basic move it was (or none), and the harm they were carrying
  return { move: strt(r.move, 80), d1: r.d1, d2: r.d2, mod, total, tier: total >= 10 ? 'full' : total >= 7 ? 'part' : 'miss', luck, dice: cleanDice(r.dice),
    hid: hunterId(r.hid), mv: MOVES.includes(r.mv) ? r.mv : '', hm: ci(r.hm, 0, 8, 0) };
}

/* a hunter's own numbers for the part of the session being played: what only their page knows. k says which session and part the page believes it is counting for;
   the room keeps the numbers only when that is the part really in play. */
export function cleanNight(n) {
  if (!isObj(n) || typeof n.k !== 'string' || !/^\d{1,9}\.\d{1,4}$/.test(n.k)) return null;
  const hid = hunterId(n.hid); if (!hid) return null;
  return { k: n.k, hid, harm: ci(n.harm, 0, 99, 0), peak: ci(n.peak, 0, 8, 0), hit: ci(n.hit, 0, 8, 0), luck: ci(n.luck, 0, 7, 0), left: ci(n.left, 0, 7, 7), lvl: ci(n.lvl, 0, 9, 0), unst: n.unst === true, died: n.died === true };
}
/* what the Keeper calls a session, and the few lines on where the table left off */
export const cleanTitle = (v) => str(v, 120).replace(/\s+/g, ' ').trim().slice(0, 60).trim();
export const cleanNote = (v) => text(v, 600);

/* a picture the Keeper posts: JPEG or WebP, by its first bytes, within the size cap. Returns the type or null. */
export function imageType(bytes) {
  if (!bytes || bytes.length < 12 || bytes.length > LIMITS.image) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
  return null;
}

/* something the Keeper posts for the table: a title, a kind, plain text, and up to three pictures already uploaded (each with words for players who cannot see it).
   The room checks that the pictures exist; nothing here is ever treated as markup. */
export function cleanHandout(h) {
  if (!isObj(h)) return null;
  const title = strt(h.title, 80), body = text(h.body, 4000);
  const images = (Array.isArray(h.images) ? h.images : []).filter((x) => isObj(x) && typeof x.id === 'string' && /^[0-9a-f]{18}$/.test(x.id)).slice(0, 3).map((x) => ({ id: x.id, alt: strt(x.alt, 200) }));
  if (!title && !body && !images.length) return null;
  return { title: title || 'Untitled', kind: KINDS.includes(h.kind) ? h.kind : 'note', body, images };
}
