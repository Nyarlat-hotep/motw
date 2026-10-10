// The table: one room for the whole site. It keeps who is here, each player's shared hunter card, the last 50 rolls and the Keeper's pictures in its own SQLite
// storage, along with what the Keeper posts for the table (handouts), and talks to every open page over WebSockets. It sleeps between messages (WebSocket hibernation), so an idle table costs almost nothing.
//
// It also keeps count of the session being played, for the awards at the end (docs/SPEC-CARDS.md, track J):
//   - There is one session in play at a time. It begins by itself at the first shared roll, and ends only when the Keeper ends it (awards) or discards it.
//   - A session is made of parts, one for each night it takes. A part ends when the Keeper ends the episode ("to be continued"), or by itself when the table
//     has been quiet for three hours; the next roll then begins the next part of the same session. Nothing is lost if nobody presses anything.
//   - Every roll of the session is kept (who, which hunter, the dice, the modifier, the move), and each hunter's own numbers for harm and Luck, part by part.
//     worker/awards.mjs turns those into the scoreboard and the badges. The last 20 finished tallies are kept so a page can catch up on what its hunters earned.
//
// It is only reachable through index.mjs, which has already checked who is asking and passes that on in two internal headers.
import { DurableObject } from 'cloudflare:workers';
import { cleanCard, cleanDice, cleanHandout, cleanName, cleanNight, cleanNote, cleanRoll, cleanTitle, imageType, LIMITS } from './clean.mjs';
import { tally, GAP } from './awards.mjs';
import { isKeeper } from './access.mjs';

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: JSON_HEADERS });

async function memberId(email) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('hunters-journal:' + email));
  return Array.from(new Uint8Array(h)).slice(0, 6).map((b) => b.toString(16).padStart(2, '0')).join('');
}
function randomId() { return Array.from(crypto.getRandomValues(new Uint8Array(9))).map((b) => b.toString(16).padStart(2, '0')).join(''); }

export class Table extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS members (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, seen INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS cards (id TEXT PRIMARY KEY, card TEXT NOT NULL, dice TEXT, at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS rolls (n INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL, roll TEXT NOT NULL, at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, mime TEXT NOT NULL, bytes BLOB NOT NULL, at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS handouts (id TEXT PRIMARY KEY, h TEXT NOT NULL, shown INTEGER NOT NULL DEFAULT 0, pinned INTEGER NOT NULL DEFAULT 0, at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (n INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL DEFAULT '', state TEXT NOT NULL, part INTEGER NOT NULL, live INTEGER NOT NULL, started INTEGER NOT NULL, last INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS parts (s INTEGER NOT NULL, p INTEGER NOT NULL, started INTEGER NOT NULL, last INTEGER NOT NULL, closed INTEGER, note TEXT NOT NULL DEFAULT '', PRIMARY KEY (s, p));
      CREATE TABLE IF NOT EXISTS srolls (seq INTEGER PRIMARY KEY AUTOINCREMENT, s INTEGER NOT NULL, p INTEGER NOT NULL, id TEXT NOT NULL, hid TEXT NOT NULL, d1 INTEGER NOT NULL, d2 INTEGER NOT NULL, mod INTEGER NOT NULL, mv TEXT NOT NULL, hm INTEGER NOT NULL, luck INTEGER NOT NULL DEFAULT 0, feed INTEGER, at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS shunters (s INTEGER NOT NULL, p INTEGER NOT NULL, id TEXT NOT NULL, hid TEXT NOT NULL, name TEXT NOT NULL, playbook TEXT NOT NULL, night TEXT, at INTEGER NOT NULL, PRIMARY KEY (s, p, id, hid));
      CREATE TABLE IF NOT EXISTS tallies (n INTEGER PRIMARY KEY, t TEXT NOT NULL, at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS found (b TEXT PRIMARY KEY, at INTEGER NOT NULL);
    `);
    // a ping from a page is answered without waking the room
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    this.rate = new Map();
    this.env = env;
    // how long the table must be quiet before the next roll counts as a new night. On your own machine a test can shorten it; a deployed Worker never does.
    this.gap = env.DEV === '1' && Number(env.GAP_MS) > 0 ? Number(env.GAP_MS) : GAP;
  }

  /* ---------- HTTP ---------- */
  async fetch(request) {
    try { return await this.handle(request); }
    finally {
      // A refusal that never read the upload (not the Keeper, too big, wrong type) must cancel it: left unread, the runtime throws an uncaught error
      // after the response goes out, and an uncaught error can reset this whole object. That cost a request a 500 before this was here.
      if (request.body && !request.bodyUsed) { try { await request.body.cancel(); } catch (e) { /* already closed */ } }
    }
  }
  async handle(request) {
    const url = new URL(request.url), email = request.headers.get('x-member-email');
    if (!email) return json({ error: 'sign-in needed' }, 401);
    const keeper = request.headers.get('x-member-keeper') === '1';
    // A page on another site must not be able to act as the signed-in player (the Access cookie goes along with it), so anything but a plain read needs our own origin.
    const origin = request.headers.get('origin');
    if ((request.method !== 'GET' || request.headers.get('upgrade')) && origin && origin !== url.origin) return json({ error: 'wrong origin' }, 403);
    const me = await this.member(email);

    if (url.pathname === '/api/me') return json({ id: me.id, name: me.name, keeper });

    if (url.pathname === '/api/ws') {
      if (request.headers.get('upgrade') !== 'websocket') return json({ error: 'WebSocket only' }, 426);
      const pair = new WebSocketPair(), server = pair[1];
      this.ctx.acceptWebSocket(server, [me.id]);
      server.serializeAttachment({ id: me.id, keeper });
      this.sendSnapshot(server, me, keeper);
      this.broadcast({ t: 'online', id: me.id, online: true, name: me.name, keeper }, server);
      return new Response(null, { status: 101, webSocket: pair[0] });
    }

    if (url.pathname === '/api/img' && request.method === 'PUT') {
      if (!keeper) return json({ error: 'Keeper only' }, 403);
      const len = Number(request.headers.get('content-length') || 0);
      if (len > LIMITS.image) return json({ error: 'too big' }, 413);
      const bytes = new Uint8Array(await request.arrayBuffer());
      if (bytes.length > LIMITS.image) return json({ error: 'too big' }, 413);
      const mime = imageType(bytes);
      if (!mime) return json({ error: 'JPEG or WebP only' }, 415);
      this.sweep();
      if (this.sql.exec('SELECT COUNT(*) AS n FROM images').one().n >= LIMITS.images) return json({ error: 'too many pictures' }, 507);
      const id = randomId();
      this.sql.exec('INSERT INTO images (id, mime, bytes, at) VALUES (?, ?, ?, ?)', id, mime, bytes, Date.now());
      return json({ id, mime, size: bytes.length }, 201);
    }

    const img = url.pathname.match(/^\/api\/img\/([0-9a-f]{18})$/);
    if (img && request.method === 'GET') {
      const row = this.sql.exec('SELECT mime, bytes FROM images WHERE id = ?', img[1]).toArray()[0];
      // A player can only fetch a picture that is on a handout the Keeper has shown. A draft's picture is the Keeper's alone, and to anyone else it does not exist.
      if (!row || (!keeper && !this.pictures(true).has(img[1]))) return json({ error: 'not found' }, 404);
      // The type is the one the server worked out from the bytes, never one the uploader named. Nothing here can run as a page.
      return new Response(row.bytes, { headers: { 'content-type': row.mime, 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'; sandbox", 'cache-control': 'private, max-age=86400, immutable', 'content-disposition': 'inline' } });
    }
    return json({ error: 'not found' }, 404);
  }

  async member(email) {
    const id = await memberId(email), row = this.sql.exec('SELECT id, name FROM members WHERE id = ?', id).toArray()[0];
    if (row) { this.sql.exec('UPDATE members SET seen = ? WHERE id = ?', Date.now(), id); return row; }
    const name = 'Player ' + id.slice(0, 4);
    this.sql.exec('INSERT INTO members (id, email, name, seen) VALUES (?, ?, ?, ?)', id, email, name, Date.now());
    return { id, name };
  }

  /* ---------- what a page is told ---------- */
  /* who has a connection open. A socket that is closing still shows up in getWebSockets(), so it is left out (by identity and by state). */
  online(closing) {
    const ids = new Set();
    for (const w of this.ctx.getWebSockets()) { if (w === closing || w.readyState !== 1) continue; const a = w.deserializeAttachment(); if (a) ids.add(a.id); }
    return ids;
  }
  broadcast(msg, except) {
    const text = JSON.stringify(msg);
    for (const w of this.ctx.getWebSockets()) { if (w !== except) { try { w.send(text); } catch (e) { /* a closing socket */ } } }
  }
  sendSnapshot(ws, me, keeper) {
    const on = this.online(); on.add(me.id);
    const cards = new Map(this.sql.exec('SELECT id, card, dice, at FROM cards').toArray().map((r) => [r.id, r]));
    const members = this.sql.exec('SELECT id, name, email FROM members').toArray().map((m) => {
      const c = cards.get(m.id);
      return { id: m.id, name: m.name, keeper: isKeeper(m.email, this.env), online: on.has(m.id), card: c ? JSON.parse(c.card) : null, dice: c && c.dice ? JSON.parse(c.dice) : null, at: c ? c.at : 0 };
    });
    const rolls = this.sql.exec('SELECT n, id, roll, at FROM rolls ORDER BY n DESC LIMIT ?', LIMITS.rolls).toArray().map((r) => ({ n: r.n, id: r.id, at: r.at, ...JSON.parse(r.roll) }));
    ws.send(JSON.stringify({ t: 'snap', you: { id: me.id, name: me.name, keeper }, members, rolls, handouts: this.handouts(keeper), sess: this.header(), found: this.found(), tallies: this.tallyList(me.id) }));
  }

  /* ---------- the session being played ---------- */
  cur() { return this.sql.exec("SELECT n, name, state, part, live, started, last FROM sessions WHERE state = 'open' ORDER BY n DESC LIMIT 1").toArray()[0] || null; }
  begin(now, name) {
    const n = this.sql.exec("INSERT INTO sessions (name, state, part, live, started, last) VALUES (?, 'open', 1, 1, ?, ?) RETURNING n", name || '', now, now).one().n;
    this.sql.exec('INSERT INTO parts (s, p, started, last) VALUES (?, 1, ?, ?)', n, now, now);
    return this.cur();
  }
  rollsIn(s, p) { return this.sql.exec('SELECT COUNT(*) AS c FROM srolls WHERE s = ? AND p = ?', s, p).one().c; }
  /* A roll has arrived: which session and part does it belong in? Begins a session if there is none, the next part if the Keeper ended the last one or the table
     has been quiet for three hours, and otherwise carries on. Returns the session, and whether anything began. */
  step(now) {
    let s = this.cur(), began = false;
    if (!s) { s = this.begin(now, ''); began = true; }
    else if (!s.live || (now - s.last >= this.gap && this.rollsIn(s.n, s.part) > 0)) {
      if (s.live) this.sql.exec('UPDATE parts SET closed = ? WHERE s = ? AND p = ?', s.last, s.n, s.part);   // nobody ended the episode: it ended when the table went quiet
      this.sql.exec('UPDATE sessions SET part = part + 1, live = 1 WHERE n = ?', s.n);
      this.sql.exec('INSERT INTO parts (s, p, started, last) VALUES (?, ?, ?, ?)', s.n, s.part + 1, now, now);
      s = this.cur(); began = true;
    }
    this.sql.exec('UPDATE sessions SET last = ? WHERE n = ?', now, s.n);
    this.sql.exec('UPDATE parts SET last = ? WHERE s = ? AND p = ?', now, s.n, s.part);
    if (this.rollsIn(s.n, s.part) === 0) this.sql.exec('UPDATE parts SET started = ? WHERE s = ? AND p = ?', now, s.n, s.part);   // a session named ahead of time starts its clock at the first roll
    s.last = now;
    return { s, began };
  }
  /* what every page is told about the session in play: no rolls, no names, only its shape */
  header() {
    const s = this.cur(); if (!s) return null;
    const parts = this.sql.exec('SELECT p, started, last, closed, note, (SELECT COUNT(*) FROM srolls r WHERE r.s = parts.s AND r.p = parts.p) AS rolls FROM parts WHERE s = ? ORDER BY p', s.n).toArray();
    const hunters = this.sql.exec("SELECT COUNT(DISTINCT id || '/' || hid) AS c FROM srolls WHERE s = ?", s.n).one().c;
    return { n: s.n, name: s.name, part: s.part, live: !!s.live, started: s.started, last: s.last, hunters, rolls: parts.reduce((t, x) => t + x.rolls, 0),
      parts: parts.map((x) => ({ p: x.p, started: x.started, last: x.last, closed: x.closed || 0, note: x.note, rolls: x.rolls })) };
  }
  tellSession() { this.broadcast({ t: 'sess', s: this.header() }); }
  found() { return this.sql.exec('SELECT b FROM found').toArray().map((r) => r.b); }
  /* the finished sessions, newest first: for each, what this member's hunters were awarded, so a page that was away (or restored an old backup) can catch up. The newest comes whole. */
  tallyList(id) {
    return this.sql.exec('SELECT n, t, at FROM tallies ORDER BY n DESC LIMIT ?', LIMITS.tallies).toArray().map((r, i) => {
      const t = JSON.parse(r.t);
      return { n: r.n, name: t.name, at: r.at, mine: t.awards.filter((a) => a.id === id).map((a) => ({ b: a.b, hid: a.hid })), rows: t.rows.filter((h) => h.id === id), full: i === 0 ? t : null };
    });
  }
  /* everything the table kept about parts 1 to upto of a session, handed to the rules */
  count(s, upto, picks, awards) {
    const parts = this.sql.exec('SELECT p, started, last, closed, note FROM parts WHERE s = ? AND p <= ? ORDER BY p', s.n, upto).toArray();
    const rolls = this.sql.exec('SELECT seq, p, id, hid, d1, d2, mod, mv, hm, luck, at FROM srolls WHERE s = ? AND p <= ? ORDER BY seq', s.n, upto).toArray();
    const who = new Map(this.sql.exec('SELECT id, name FROM members').toArray().map((m) => [m.id, m.name]));
    const cards = new Map(this.sql.exec('SELECT id, card FROM cards').toArray().map((c) => [c.id, JSON.parse(c.card)]));
    const hunters = this.sql.exec('SELECT p, id, hid, name, playbook, night, at FROM shunters WHERE s = ? AND p <= ? ORDER BY p, at', s.n, upto).toArray()
      .map((h) => ({ p: h.p, id: h.id, hid: h.hid, who: who.get(h.id) || '', name: h.name, playbook: h.playbook, night: h.night ? JSON.parse(h.night) : null, at: h.at }));
    // a hunter who rolled but whose page never sent their own numbers still needs a name: the card they are showing now, if it is the same hunter
    const known = new Set(hunters.map((h) => h.id + '/' + h.hid));
    for (const r of rolls) {
      const k = r.id + '/' + r.hid; if (known.has(k)) continue; known.add(k);
      const c = cards.get(r.id), same = c && c.hid === r.hid;
      hunters.push({ p: r.p, id: r.id, hid: r.hid, who: who.get(r.id) || '', name: same ? c.name : '', playbook: same ? c.playbook : '', night: null, at: r.at });
    }
    return tally({ n: s.n, name: s.name, at: Date.now(), parts, rolls: rolls.map((r) => ({ ...r, luck: !!r.luck })), hunters, picks, found: this.found(), awards });
  }
  /* The Keeper ends the session (or throws it away). Parts after `upto` were a new story the Keeper had not got round to separating: they become the next session. */
  finish(s, upto, picks, discard) {
    const t = discard ? null : this.count(s, upto, picks, true), now = Date.now();
    const empty = !discard && t.rows.length === 0;
    if (upto < s.part) {
      const first = this.sql.exec('SELECT started FROM parts WHERE s = ? AND p = ?', s.n, upto + 1).one().started;
      const n = this.sql.exec("INSERT INTO sessions (name, state, part, live, started, last) VALUES ('', 'open', ?, ?, ?, ?) RETURNING n", s.part - upto, s.live, first, s.last).one().n;
      for (const tb of ['parts', 'srolls', 'shunters']) this.sql.exec('UPDATE ' + tb + ' SET s = ?, p = p - ? WHERE s = ? AND p > ?', n, upto, s.n, upto);
    }
    this.sql.exec('UPDATE sessions SET state = ?, part = ?, live = 0 WHERE n = ?', discard || empty ? 'discarded' : 'ended', upto, s.n);
    if (discard || empty) { for (const tb of ['parts', 'srolls', 'shunters']) this.sql.exec('DELETE FROM ' + tb + ' WHERE s = ?', s.n); return null; }
    t.at = now;
    this.sql.exec('INSERT INTO tallies (n, t, at) VALUES (?, ?, ?)', s.n, JSON.stringify(t), now);
    for (const b of t.fresh) this.sql.exec('INSERT OR IGNORE INTO found (b, at) VALUES (?, ?)', b, now);
    // only the last 20 are kept, and the rolls of a session go when its tally does
    for (const old of this.sql.exec('SELECT n FROM tallies ORDER BY n DESC LIMIT -1 OFFSET ?', LIMITS.tallies).toArray()) {
      this.sql.exec('DELETE FROM tallies WHERE n = ?', old.n);
      for (const tb of ['parts', 'srolls', 'shunters']) this.sql.exec('DELETE FROM ' + tb + ' WHERE s = ?', old.n);
    }
    return t;
  }
  sessionMessage(ws, m) {
    const say = (why) => ws.send(JSON.stringify({ t: 'err', why }));
    const s = this.cur(), now = Date.now();
    if (m.t === 'sess-name') {
      const name = cleanTitle(m.name);
      if (s) this.sql.exec('UPDATE sessions SET name = ? WHERE n = ?', name, s.n); else if (name) this.begin(now, name); else return;
      this.tellSession();
      return;
    }
    if (!s) return say('no session');
    const upto = Number.isInteger(m.upto) && m.upto >= 1 && m.upto <= s.part ? m.upto : s.part;
    if (m.t === 'sess-pause') {
      // the episode ends here and the session waits: the next roll, whenever it comes, is the next part
      if (!s.live) return say('already paused');
      const note = cleanNote(m.note);
      this.sql.exec('UPDATE parts SET closed = ?, note = ? WHERE s = ? AND p = ?', now, note, s.n, s.part);
      this.sql.exec('UPDATE sessions SET live = 0 WHERE n = ?', s.n);
      const board = this.count(s, s.part, null, false);
      this.broadcast({ t: 'recap', r: { n: s.n, name: s.name, part: s.part, note, at: now, rows: board.rows, table: board.table, parts: board.parts } });
      this.tellSession();
    } else if (m.t === 'sess-note') {
      // the Keeper rewrites where a finished part left off
      const p = Number.isInteger(m.p) ? m.p : 0;
      if (!this.sql.exec('SELECT 1 AS k FROM parts WHERE s = ? AND p = ? AND closed IS NOT NULL', s.n, p).toArray().length) return say('no such part');
      this.sql.exec('UPDATE parts SET note = ? WHERE s = ? AND p = ?', cleanNote(m.note), s.n, p);
      this.tellSession();
    } else if (m.t === 'sess-preview') {
      // what ending it now would hand out: for the Keeper's eyes only
      ws.send(JSON.stringify({ t: 'sess-preview', upto, tally: this.count(s, upto, m.picks, true) }));
    } else if (m.t === 'sess-end') {
      const done = this.finish(s, upto, m.picks, m.discard === true);
      if (done) this.broadcast({ t: 'tally', tally: done, found: this.found() });
      ws.send(JSON.stringify({ t: 'sess-done', n: s.n, awarded: !!done, discarded: m.discard === true }));
      this.tellSession();
    }
  }

  /* ---------- what the Keeper posts ---------- */
  handoutOf(row) { return { id: row.id, ...JSON.parse(row.h), shown: !!row.shown, pinned: !!row.pinned, at: row.at }; }
  /* The Keeper gets every handout. Everyone else gets only the shown ones: a draft never leaves the room for a player's page, not even hidden. */
  handouts(keeper) {
    return this.sql.exec('SELECT id, h, shown, pinned, at FROM handouts' + (keeper ? '' : ' WHERE shown = 1') + ' ORDER BY at DESC').toArray().map((r) => this.handoutOf(r));
  }
  /* the ids of every picture on a handout (only the shown ones when asked) */
  pictures(shownOnly) {
    const ids = new Set();
    for (const r of this.sql.exec('SELECT h FROM handouts' + (shownOnly ? ' WHERE shown = 1' : '')).toArray()) { for (const i of JSON.parse(r.h).images || []) ids.add(i.id); }
    return ids;
  }
  /* pictures no handout uses any more. An hour's grace, so one just uploaded for a handout still being written is not lost. */
  sweep() {
    const used = this.pictures(false), old = Date.now() - 36e5;
    for (const r of this.sql.exec('SELECT id FROM images WHERE at < ?', old).toArray()) { if (!used.has(r.id)) this.sql.exec('DELETE FROM images WHERE id = ?', r.id); }
  }
  /* tell every page about one handout. The Keeper's pages get it whatever its state; a player's page gets it only while it is shown, and is told to drop it when it is hidden or deleted. */
  tell(id, wasShown, fresh) {
    const row = this.sql.exec('SELECT id, h, shown, pinned, at FROM handouts WHERE id = ?', id).toArray()[0];
    const h = row ? this.handoutOf(row) : null;
    const full = JSON.stringify(h ? { t: 'ho', h } : { t: 'ho-gone', id });
    const pub = h && h.shown ? JSON.stringify({ t: 'ho', h, fresh: !!fresh }) : wasShown ? JSON.stringify({ t: 'ho-gone', id }) : null;
    for (const w of this.ctx.getWebSockets()) {
      const a = w.deserializeAttachment() || {}, text = a.keeper ? full : pub;
      if (text) { try { w.send(text); } catch (e) { /* a closing socket */ } }
    }
  }
  keeperMessage(ws, m) {
    const say = (why) => ws.send(JSON.stringify({ t: 'err', why }));
    const id = typeof m.id === 'string' && /^[0-9a-f]{18}$/.test(m.id) ? m.id : '';
    const row = id ? this.sql.exec('SELECT id, shown, pinned, at FROM handouts WHERE id = ?', id).toArray()[0] : null;
    const now = Date.now();
    const unpinOthers = (keep) => { for (const r of this.sql.exec('SELECT id FROM handouts WHERE pinned = 1 AND id != ?', keep).toArray()) { this.sql.exec('UPDATE handouts SET pinned = 0 WHERE id = ?', r.id); this.tell(r.id, true, false); } };

    if (m.t === 'ho-save') {
      const h = cleanHandout(m.h);
      if (!h) return say('bad handout');
      if (m.id !== undefined && !row) return say('no such handout');
      h.images = h.images.filter((i) => this.sql.exec('SELECT 1 AS k FROM images WHERE id = ?', i.id).toArray().length);   // only pictures that were really uploaded
      const text = JSON.stringify(h);
      if (row) {
        const shown = m.show === true ? 1 : m.show === false ? 0 : row.shown;
        this.sql.exec('UPDATE handouts SET h = ?, shown = ?, pinned = ?, at = ? WHERE id = ?', text, shown, shown ? row.pinned : 0, now, row.id);
        this.tell(row.id, !!row.shown, shown && !row.shown);
        ws.send(JSON.stringify({ t: 'ho-saved', id: row.id }));
      } else {
        if (this.sql.exec('SELECT COUNT(*) AS n FROM handouts').one().n >= LIMITS.handouts) return say('too many handouts');
        const nid = randomId(), shown = m.show === true ? 1 : 0;
        this.sql.exec('INSERT INTO handouts (id, h, shown, pinned, at) VALUES (?, ?, ?, 0, ?)', nid, text, shown, now);
        this.tell(nid, false, !!shown);
        ws.send(JSON.stringify({ t: 'ho-saved', id: nid }));
      }
      this.sweep();
    } else if (!row) {
      say('no such handout');
    } else if (m.t === 'ho-show') {
      const shown = m.shown === true ? 1 : 0;
      this.sql.exec('UPDATE handouts SET shown = ?, pinned = ?, at = ? WHERE id = ?', shown, shown ? row.pinned : 0, shown && !row.shown ? now : row.at, row.id);
      this.tell(row.id, !!row.shown, shown && !row.shown);
    } else if (m.t === 'ho-pin') {
      const pinned = m.pinned === true ? 1 : 0;
      if (pinned) unpinOthers(row.id);   // one pinned at a time
      this.sql.exec('UPDATE handouts SET pinned = ?, shown = ?, at = ? WHERE id = ?', pinned, pinned ? 1 : row.shown, pinned && !row.shown ? now : row.at, row.id);
      this.tell(row.id, !!row.shown, pinned && !row.pinned);
    } else if (m.t === 'ho-del') {
      this.sql.exec('DELETE FROM handouts WHERE id = ?', row.id);
      this.tell(row.id, !!row.shown, false);
      this.sweep();
    }
  }

  /* ---------- WebSocket ---------- */
  slow(ws) {   // ten messages a second, with room for a burst of twenty
    const now = Date.now(), r = this.rate.get(ws) || { tokens: 20, at: now, strikes: 0 };
    r.tokens = Math.min(20, r.tokens + (now - r.at) / 100); r.at = now;
    const ok = r.tokens >= 1; if (ok) r.tokens -= 1; else r.strikes++;
    this.rate.set(ws, r);
    if (r.strikes > 200) ws.close(1008, 'too fast');
    return !ok;
  }
  async webSocketMessage(ws, raw) {
    const a = ws.deserializeAttachment() || {};
    if (!a.id) { ws.close(1008, 'unknown'); return; }
    if (this.slow(ws)) { ws.send(JSON.stringify({ t: 'err', why: 'slow down' })); return; }
    if (typeof raw !== 'string' || raw.length > LIMITS.message) { ws.send(JSON.stringify({ t: 'err', why: 'too big' })); return; }
    let m; try { m = JSON.parse(raw); } catch (e) { ws.send(JSON.stringify({ t: 'err', why: 'not JSON' })); return; }
    if (!m || typeof m !== 'object' || typeof m.t !== 'string') return;

    if (m.t.slice(0, 3) === 'ho-' || m.t.slice(0, 5) === 'sess-') {
      // Only the Keeper posts, and only the Keeper runs the session. The room decides who that is (from the sign-in, when the connection opened), never the page.
      if (!a.keeper) { ws.send(JSON.stringify({ t: 'err', why: 'Keeper only' })); return; }
      if (m.t.slice(0, 3) === 'ho-') this.keeperMessage(ws, m); else this.sessionMessage(ws, m);
    } else if (m.t === 'tally-get') {
      // an older finished session, to look at again
      const row = Number.isInteger(m.n) ? this.sql.exec('SELECT t FROM tallies WHERE n = ?', m.n).toArray()[0] : null;
      if (row) ws.send(JSON.stringify({ t: 'tally', tally: JSON.parse(row.t), old: true }));
    } else if (m.t === 'hello') {
      const row = this.sql.exec('SELECT name FROM members WHERE id = ?', a.id).toArray()[0];
      const name = cleanName(m.name, row ? row.name : 'Player');
      this.sql.exec('UPDATE members SET name = ? WHERE id = ?', name, a.id);
      this.broadcast({ t: 'name', id: a.id, name });
    } else if (m.t === 'card') {
      const card = cleanCard(m.card), dice = cleanDice(m.dice);
      if (!card) { ws.send(JSON.stringify({ t: 'err', why: 'bad card' })); return; }
      const text = JSON.stringify(card);
      if (text.length > LIMITS.card) { ws.send(JSON.stringify({ t: 'err', why: 'too big' })); return; }
      const at = Date.now();
      this.sql.exec('INSERT INTO cards (id, card, dice, at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET card = excluded.card, dice = excluded.dice, at = excluded.at', a.id, text, dice ? JSON.stringify(dice) : null, at);
      this.broadcast({ t: 'card', id: a.id, card, dice, at });
      // the hunter's own numbers for the part being played ride along with the card. They are kept only for the part really in play:
      // a page that is counting for another one is told where the session is, and counts again from there.
      const night = cleanNight(m.night), s = night ? this.cur() : null;
      if (night && s && s.live && night.k === s.n + '.' + s.part) {
        const { k, hid, ...nums } = night;
        this.sql.exec('INSERT INTO shunters (s, p, id, hid, name, playbook, night, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(s, p, id, hid) DO UPDATE SET name = excluded.name, playbook = excluded.playbook, night = excluded.night, at = excluded.at',
          s.n, s.part, a.id, hid, card.hid === hid ? card.name : '', card.hid === hid ? card.playbook : '', JSON.stringify(nums), at);
      } else if (night && (!s || night.k !== s.n + '.' + s.part)) ws.send(JSON.stringify({ t: 'sess', s: this.header() }));
    } else if (m.t === 'unshare') {
      this.sql.exec('DELETE FROM cards WHERE id = ?', a.id);
      this.broadcast({ t: 'gone', id: a.id });
    } else if (m.t === 'roll') {
      const roll = cleanRoll(m.roll);
      if (!roll) { ws.send(JSON.stringify({ t: 'err', why: 'bad roll' })); return; }
      const at = Date.now();
      const n = this.sql.exec('INSERT INTO rolls (id, roll, at) VALUES (?, ?, ?) RETURNING n', a.id, JSON.stringify(roll), at).one().n;
      this.sql.exec('DELETE FROM rolls WHERE n <= ?', n - LIMITS.rolls);
      this.broadcast({ t: 'roll', roll: { n, id: a.id, at, ...roll } });
      // a roll that says which hunter made it is counted for the session. (A page from before this sends none, and its rolls are only in the feed.)
      if (roll.hid) {
        const { s } = this.step(at);
        this.sql.exec('INSERT INTO srolls (s, p, id, hid, d1, d2, mod, mv, hm, luck, feed, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)', s.n, s.part, a.id, roll.hid, roll.d1, roll.d2, roll.mod, roll.mv, roll.hm, n, at);
        this.tellSession();
      }
    } else if (m.t === 'roll-luck') {
      // Luck spent on the roll this player just made: the feed shows the 12 it became, and the session remembers it was bought
      const row = this.sql.exec('SELECT n, roll, at FROM rolls WHERE id = ? ORDER BY n DESC LIMIT 1', a.id).toArray()[0];
      const roll = row ? JSON.parse(row.roll) : null;
      if (!roll || roll.luck || roll.d1 !== m.d1 || roll.d2 !== m.d2 || Date.now() - row.at > 30 * 60000) return;
      roll.luck = true; roll.total = 12; roll.tier = 'full';
      this.sql.exec('UPDATE rolls SET roll = ? WHERE n = ?', JSON.stringify(roll), row.n);
      this.sql.exec('UPDATE srolls SET luck = 1 WHERE feed = ? AND id = ?', row.n, a.id);
      this.broadcast({ t: 'roll-fix', roll: { n: row.n, id: a.id, at: row.at, ...roll } });
    }
  }
  webSocketClose(ws) {
    this.rate.delete(ws);
    const a = ws.deserializeAttachment();
    try { ws.close(); } catch (e) { /* already closed */ }
    if (a && !this.online(ws).has(a.id)) this.broadcast({ t: 'online', id: a.id, online: false }, ws);
  }
  webSocketError(ws) { this.webSocketClose(ws); }
}
