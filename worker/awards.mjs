// Who gets which badge. One function, tally(), takes everything the table kept about a session (every roll, and each hunter's own numbers for harm and Luck)
// and returns the scoreboard and the awards. Nothing here stores or sends anything, so tests/t29.js runs it in plain Node with made-up nights.
//
// The names, lines and icons of the badges are in the page (BADGES in index.html). This file has the rule for each one that a session can hand out;
// tests/t29.js checks the two lists name the same badges. Milestones are worked out by the page from a hunter's whole career, so they are not here.
//
// Rolls are counted as rolled: a miss rescued with Luck is still a miss here, and earns Lucky Devil as well.

export const MOVES = ['kick', 'act', 'help', 'inv', 'manip', 'prot', 'read', 'magic'];   // the eight basic moves, by the page's own ids
export const GAP = 3 * 36e5;                                                                // three quiet hours and the next roll begins a new part
export const PICKS = ['carried', 'idea', 'quote', 'thorn', 'pet'];                          // the Keeper's to hand out
export const MILESTONES = ['meat', 'alive', 'century', 'flyer', 'scars', 'stripes'];

export const tierOf = (t) => (t >= 10 ? 'full' : t >= 7 ? 'part' : 'miss');
const count = (list, f) => { let n = 0; for (const r of list) if (f(r)) n++; return n; };
const run = (list, f, len) => { let n = 0; for (const r of list) { n = f(r) ? n + 1 : 0; if (n >= len) return true; } return false; };
const pair = (r) => Math.min(r.d1, r.d2) * 10 + Math.max(r.d1, r.d2);
const mostOfOneMove = (h) => { const c = {}; let top = 0; for (const r of h.list) if (r.mv) { c[r.mv] = (c[r.mv] || 0) + 1; top = Math.max(top, c[r.mv]); } return top; };

/* Feats and the secrets one hunter can earn alone: everyone the rule is true for gets one. h is a hunter's row, T the table's totals.
   A rule that needs the hunter's own numbers (harm, Luck) asks for h.has first: a page that never sent them earns nothing by default. */
const FEATS = {
  snake: (h) => h.list.some((r) => r.d1 === 1 && r.d2 === 1),
  boxcars: (h) => h.list.some((r) => r.d1 === 6 && r.d2 === 6),
  cold: (h) => run(h.list, (r) => r.tier === 'miss', 3),
  hot: (h) => run(h.list, (r) => r.tier === 'full', 3),
  clean: (h) => h.rolls >= 6 && h.miss === 0,
  over: (h) => h.list.some((r) => r.total >= 12),
  devil: (h) => h.list.some((r) => r.luck),
  fumes: (h) => h.has && h.left === 0,
  door: (h) => h.has && h.peak >= 7 && !h.died,
  scratch: (h) => h.has && h.rolls >= 6 && h.harm === 0,
  wiser: (h) => h.has && h.lvl >= 1,
  bench: (h, T) => h.rolls >= 1 && h.rolls <= 2 && T.rolls >= 20,
  buried: (h) => h.has && h.died,
  fence: (h) => h.part >= 5,
  comeback: (h) => h.list.some((r, i) => i >= 2 && r.tier === 'full' && h.list[i - 1].tier === 'miss' && h.list[i - 2].tier === 'miss'),
  jaw: (h) => h.has && h.hit >= 3,
  hoard: (h) => h.has && h.miss >= 3 && h.luck === 0 && h.left >= 4,
  trigger: (h) => count(h.list, (r) => r.mv === 'kick') >= 5,
  pacifist: (h) => h.rolls >= 8 && count(h.list, (r) => r.mv === 'kick') === 0,
  pony: (h) => h.rolls >= 6 && mostOfOneMove(h) * 3 >= h.rolls * 2,
  wounded: (h) => h.has && h.unst && !h.died,
  seven: (h) => count(h.list, (r) => r.total === 7) >= 3,
  clutch: (h) => h.list.some((r) => r.tier === 'full' && r.hm >= 6),
  disaster: (h) => count(h.list, (r) => r.nat <= 4) >= 3,
  roller: (h) => count(h.list, (r) => r.nat >= 10) >= 3,
  underdog: (h) => h.list.some((r) => r.tier === 'full' && r.mod <= -1),
  // secrets
  dry: (h) => h.rolls >= 6 && h.full === 0,
  dust: (h) => h.has && h.died && h.left >= 3,
  again: (h) => h.list.some((r, i) => i >= 2 && pair(r) === pair(h.list[i - 1]) && pair(r) === pair(h.list[i - 2])),
  twins: (h) => count(h.list, (r) => r.d1 === r.d2) >= 4,
  jack: (h) => MOVES.every((m) => h.list.some((r) => r.mv === m)),
  deal: (h) => h.list.some((r) => r.luck && r.d1 === 1 && r.d2 === 1),
  beast: (h) => h.list.some((r, i) => i >= 1 && (r.d1 === 6 || r.d2 === 6) && h.list[i - 1].d1 === 6 && h.list[i - 1].d2 === 6),
  thirteen: (h) => h.list.some((r) => r.total === 13)
};
/* Superlatives: [what is measured, the least that can win, and 'min' when the lowest wins]. One winner a session, a tie is shared, and there must be two hunters rolling. */
const SUPERS = {
  weight: [(h) => h.miss, 3],
  arm: [(h) => h.full, 3],
  bag: [(h) => (h.has ? h.harm : null), 3],
  hitter: [(h) => count(h.list, (r) => r.mv === 'kick' && r.total >= 7), 2],
  hog: [(h) => h.rolls, 8],
  nosy: [(h) => count(h.list, (r) => r.mv === 'inv' || r.mv === 'read'), 3],
  shield: [(h) => count(h.list, (r) => r.mv === 'prot'), 2],
  tongue: [(h) => count(h.list, (r) => r.mv === 'manip' && r.total >= 7), 2],
  fire: [(h) => count(h.list, (r) => r.mv === 'magic'), 2],
  wing: [(h) => count(h.list, (r) => r.mv === 'help'), 2],
  bottom: [(h) => h.worst, null, 'min'],
  peak: [(h) => h.best, null],
  mixed: [(h) => h.part, 3],
  spender: [(h) => (h.has ? h.luck : null), 2]
};
/* decided by the order of the rolls, or by the whole table at once */
const SPECIAL = ['first', 'last', 'bath', 'perfect'];
/* every badge a session can hand out: the list tests/t29.js holds against the page's */
export const SESSION_BADGES = Object.keys(FEATS).concat(Object.keys(SUPERS), SPECIAL, PICKS);
export const BADGE_IDS = SESSION_BADGES.concat(MILESTONES);
export const SECRETS = ['dry', 'dust', 'again', 'twins', 'jack', 'deal', 'bath', 'beast', 'thirteen', 'perfect'];

/* in:  { n, name, at, parts: [{ p, started, last, closed, note }], rolls: [{ seq, p, id, hid, d1, d2, mod, mv, hm, luck, at }],
          hunters: [{ p, id, hid, who, name, playbook, night: { harm, peak, hit, luck, left, lvl, unst, died } | null, at }], picks: { badge: 'id/hid' }, found: [secret ids] }
   out: { n, name, at, parts: [{ p, started, last, rolls, note }], rows: [one a hunter], table: { rolls, miss, part, full, hunters }, awards: [{ b, id, hid }], fresh: [secrets found for the first time] }
   A hunter is a player's id and the hunter's own id together, so a player whose hunter dies and who brings in another has two rows. */
export function tally(input) {
  const rolls = (input.rolls || []).slice().sort((a, b) => a.seq - b.seq);
  const H = new Map();
  const row = (id, hid) => {
    const k = id + '/' + hid; let h = H.get(k);
    if (!h) { h = { id, hid, who: '', name: '', playbook: '', rolls: 0, miss: 0, part: 0, full: 0, best: null, worst: null, harm: 0, luck: 0, left: null, lvl: 0, peak: 0, hit: 0, died: false, unst: false, has: false, list: [] }; H.set(k, h); }
    return h;
  };
  // each part's numbers for harm and Luck add up; what is left at the end is the last part's word
  for (const x of (input.hunters || []).slice().sort((a, b) => a.p - b.p || a.at - b.at)) {
    const h = row(x.id, x.hid), n = x.night;
    if (x.name) h.name = x.name; if (x.playbook) h.playbook = x.playbook; if (x.who) h.who = x.who;
    if (n) { h.has = true; h.harm += n.harm; h.luck += n.luck; h.lvl += n.lvl; h.peak = Math.max(h.peak, n.peak); h.hit = Math.max(h.hit, n.hit); h.died = h.died || n.died; h.left = n.left; h.unst = n.unst; }
  }
  for (const r of rolls) {
    const h = row(r.id, r.hid), nat = r.d1 + r.d2, total = nat + r.mod, tier = tierOf(total);
    h.list.push({ d1: r.d1, d2: r.d2, mod: r.mod, mv: r.mv || '', hm: r.hm || 0, luck: !!r.luck, nat, total, tier });
    h.rolls++; h[tier]++;
    h.best = h.best === null ? total : Math.max(h.best, total); h.worst = h.worst === null ? total : Math.min(h.worst, total);
  }
  // somebody who only had the page open is not part of the night
  const rows = [...H.values()].filter((h) => h.rolls > 0 || h.harm > 0 || h.luck > 0 || h.lvl > 0 || h.died);
  const rollers = rows.filter((h) => h.rolls > 0);
  const T = { rolls: rolls.length, miss: 0, part: 0, full: 0, hunters: rows.length };
  for (const h of rows) { T.miss += h.miss; T.part += h.part; T.full += h.full; }

  const awards = [], has = new Set();
  const give = (b, h) => { const k = b + ' ' + h.id + '/' + h.hid; if (!has.has(k)) { has.add(k); awards.push({ b, id: h.id, hid: h.hid }); } };
  if (input.awards !== false) {
    for (const h of rows) for (const b of Object.keys(FEATS)) if (FEATS[b](h, T)) give(b, h);
    if (rollers.length >= 2) {
      for (const b of Object.keys(SUPERS)) {
        const [val, least, lowest] = SUPERS[b];
        let best = null;
        for (const h of rollers) { const v = val(h); if (v === null || v === undefined) continue; if (best === null || (lowest ? v < best : v > best)) best = v; }
        if (best === null || (least !== null && best < least)) continue;
        for (const h of rollers) if (val(h) === best) give(b, h);
      }
      const at = (r) => H.get(r.id + '/' + r.hid);
      give('first', at(rolls[0])); give('last', at(rolls[rolls.length - 1]));
    }
    const known = rows.filter((h) => h.has);
    if (rows.length >= 3 && known.length === rows.length && known.every((h) => h.harm > 0)) for (const h of rows) give('bath', h);
    if (T.rolls >= 12 && T.miss === 0) for (const h of rollers) give('perfect', h);
    const picks = input.picks && typeof input.picks === 'object' ? input.picks : {};
    for (const b of PICKS) { const h = typeof picks[b] === 'string' ? H.get(picks[b]) : null; if (h && rows.includes(h)) give(b, h); }
  }
  const found = new Set(input.found || []);
  const fresh = [...new Set(awards.map((a) => a.b).filter((b) => SECRETS.includes(b) && !found.has(b)))];
  rows.sort((a, b) => b.rolls - a.rolls || String(a.name).localeCompare(String(b.name)));
  return {
    n: input.n, name: input.name || '', at: input.at || 0,
    parts: (input.parts || []).map((p) => ({ p: p.p, started: p.started, last: p.last, note: p.note || '', rolls: count(rolls, (r) => r.p === p.p) })),
    rows: rows.map((h) => ({ id: h.id, hid: h.hid, who: h.who, name: h.name, playbook: h.playbook, rolls: h.rolls, miss: h.miss, part: h.part, full: h.full, best: h.best, worst: h.worst, has: h.has, harm: h.harm, luck: h.luck, left: h.left, lvl: h.lvl, died: h.died, unst: h.unst })),
    table: T, awards, fresh
  };
}
