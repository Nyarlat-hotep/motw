// The table: one room for the whole site. It keeps who is here, each player's shared hunter card, the last 50 rolls and the Keeper's pictures in its own SQLite
// storage, along with what the Keeper posts for the table (handouts), and talks to every open page over WebSockets. It sleeps between messages (WebSocket hibernation), so an idle table costs almost nothing.
//
// It is only reachable through index.mjs, which has already checked who is asking and passes that on in two internal headers.
import { DurableObject } from 'cloudflare:workers';
import { cleanCard, cleanDice, cleanHandout, cleanName, cleanRoll, imageType, LIMITS } from './clean.mjs';
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
    `);
    // a ping from a page is answered without waking the room
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    this.rate = new Map();
    this.env = env;
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
    ws.send(JSON.stringify({ t: 'snap', you: { id: me.id, name: me.name, keeper }, members, rolls, handouts: this.handouts(keeper) }));
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

    if (m.t.slice(0, 3) === 'ho-') {
      // Only the Keeper posts. The room decides who that is (from the sign-in, when the connection opened), never the page.
      if (!a.keeper) { ws.send(JSON.stringify({ t: 'err', why: 'Keeper only' })); return; }
      this.keeperMessage(ws, m);
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
