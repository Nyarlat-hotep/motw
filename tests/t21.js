// The backend trial (G0): the Worker and its Durable Object table, run locally with `wrangler dev`, driven by two real browsers acting as two players.
// Gates from docs/WORKPLAN.md covered here: 1 two browsers see each other within about two seconds, 2 a closed connection catches up, 3 a 600 KB picture goes up and comes back
// with the right headers, 4 a forged identity is refused (the token itself is tested in tests/t22.js), 6 the site still loads when the API is not signed in.
// Not covered here, because they need a real Cloudflare account: gate 4 behind real Access, and gate 5 (usage against the free daily limits).
require('fs').mkdirSync(require('path').join(__dirname,'out'),{recursive:true});
const { chromium } = require('playwright');
const { spawn, spawnSync } = require('child_process');
const http = require('http');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), WR = path.join(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const results = []; const errs = [];
function check(name, ok, extra){ results.push([ok?'PASS':'FAIL', name, extra===undefined?'':String(extra)]); }

const servers = [];
function start(port, vars) {
  const dir = path.join(__dirname, 'out', 'wrangler-' + port);
  fs.rmSync(dir, { recursive: true, force: true });   // a fresh table every run
  const args = [WR, 'dev', '--config', path.join(ROOT, 'worker', 'wrangler.jsonc'), '--port', String(port), '--ip', '127.0.0.1', '--persist-to', dir];
  vars.forEach(v => args.push('--var', v));
  const child = spawn(process.execPath, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; child.stdout.on('data', d => { log += d; }); child.stderr.on('data', d => { log += d; });
  const s = { port, child, log: () => log, base: 'http://127.0.0.1:' + port };
  servers.push(s);
  return s;
}
async function ready(s) {
  for (let i = 0; i < 120; i++) { try { await fetch(s.base + '/api/me'); return true; } catch (e) { await new Promise(r => setTimeout(r, 500)); } }
  throw new Error('wrangler dev did not start on ' + s.port + '\n' + s.log().slice(-1500));
}
function saveLogs() { servers.forEach((x) => { try { fs.writeFileSync(path.join(__dirname, 'out', 'wrangler-' + x.port + '.log'), x.log()); } catch (e) { /* no folder yet */ } }); }
function stopAll() {
  saveLogs(); for (const s of servers) { try { if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(s.child.pid), '/T', '/F']); else s.child.kill('SIGKILL'); } catch (e) { /* gone */ } } }
process.on('exit', stopAll);

// a raw upgrade request, so the Origin header can be set to anything (a browser would not let a page do that)
function upgrade(base, p, origin) {
  return new Promise((resolve) => {
    const u = new URL(base + p), headers = { Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': Buffer.from('0123456789abcdef').toString('base64') };
    if (origin) headers.Origin = origin;
    const req = http.request({ host: u.hostname, port: u.port, path: u.pathname + u.search, headers });
    req.on('upgrade', (res, socket) => { socket.destroy(); resolve(res.statusCode); });
    req.on('response', (res) => { res.resume(); resolve(res.statusCode); });
    req.on('error', () => resolve(0)); req.end();
  });
}

(async () => {
  spawnSync(process.execPath, [path.join(ROOT, 'tools', 'build.js')], { cwd: ROOT });   // the Worker serves dist/, so make sure it is the current page
  const dev = start(8799, ['DEV:1', 'KEEPER_EMAILS:kay@dev.test']);
  // the second server is set up like the real one: no DEV, and the key set of a throwaway "Access" so a signed token can be tried
  const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const stranger = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  const prod = start(8798, ['ACCESS_TEAM:friends', 'ACCESS_AUD:aud123', 'ACCESS_JWKS:' + JSON.stringify({ keys: [{ ...jwk, kid: 'k1', alg: 'RS256', use: 'sig' }] })]);
  await Promise.all([ready(dev), ready(prod)]);
  const B = dev.base, enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const sign = async (payload, key) => { const body = enc({ alg: 'RS256', kid: 'k1', typ: 'JWT' }) + '.' + enc(payload); return body + '.' + Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, Buffer.from(body))).toString('base64url'); };
  const get = async (base, p, headers) => { const r = await fetch(base + p, { headers }); return { status: r.status, h: r.headers, body: Buffer.from(await r.arrayBuffer()) }; };

  // ---- the site, and who may call the API ----
  let r = await get(B, '/');
  check('the site is served as it always was, no Worker involved', r.status === 200 && /Hunter's Journal/.test(r.body.toString()) && /text\/html/.test(r.h.get('content-type')));
  check('the offline worker and manifest are served too', (await get(B, '/sw.js')).status === 200 && (await get(B, '/manifest.webmanifest')).status === 200);
  r = await get(B, '/api/me');
  check('the API refuses someone nobody has signed in', r.status === 401 && JSON.parse(r.body).error === 'sign-in needed' && r.h.get('cache-control') === 'no-store');
  r = await get(B, '/api/nothing?as=alice');
  check('an unknown API path is a plain 404', r.status === 404);
  r = await get(B, '/api/me?as=alice'); const alice = JSON.parse(r.body);
  check('local development: ?as=alice signs in as alice', r.status === 200 && /^[0-9a-f]{12}$/.test(alice.id) && alice.keeper === false && /^Player [0-9a-f]{4}$/.test(alice.name), r.body.toString());
  check('the Keeper is picked by the server list', JSON.parse((await get(B, '/api/me?as=kay')).body).keeper === true && alice.keeper === false);
  check('and the same person always gets the same id, which is not their email', JSON.parse((await get(B, '/api/me?as=alice')).body).id === alice.id && !JSON.stringify(alice).includes('dev.test'));

  // ---- set up like the real thing: no dev sign-in, a signed token from "Access" ----
  const NOW = Date.now() / 1000, good = { iss: 'https://friends.cloudflareaccess.com', aud: ['aud123'], email: 'jacob@example.com', exp: NOW + 3600, nbf: NOW - 5 };
  const P = prod.base;
  check('real mode: ?as=alice and the dev header do nothing', (await get(P, '/api/me?as=alice')).status === 401 && (await get(P, '/api/me', { 'x-dev-user': 'alice' })).status === 401);
  check('real mode: a typed-in Access email header is not believed', (await get(P, '/api/me', { 'Cf-Access-Authenticated-User-Email': 'jacob@example.com' })).status === 401);
  check('real mode: a token signed by someone else is refused', (await get(P, '/api/me', { 'Cf-Access-Jwt-Assertion': await sign(good, stranger.privateKey) })).status === 401);
  check('real mode: a token for another audience or an old one is refused', (await get(P, '/api/me', { 'Cf-Access-Jwt-Assertion': await sign({ ...good, aud: ['x'] }, pair.privateKey) })).status === 401 && (await get(P, '/api/me', { 'Cf-Access-Jwt-Assertion': await sign({ ...good, exp: NOW - 5 }, pair.privateKey) })).status === 401);
  r = await get(P, '/api/me', { 'Cf-Access-Jwt-Assertion': await sign(good, pair.privateKey) });
  check('real mode: a properly signed token gets in', r.status === 200 && /^[0-9a-f]{12}$/.test(JSON.parse(r.body).id), r.body.toString());
  check('real mode: a forged internal header cannot make someone the Keeper or someone else', JSON.parse((await get(P, '/api/me', { 'Cf-Access-Jwt-Assertion': await sign(good, pair.privateKey), 'x-member-keeper': '1', 'x-member-email': 'kay@dev.test' })).body).keeper === false);

  // ---- two browsers, two players ----
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const join = async (as) => {
    const ctx = await b.newContext({ viewport: { width: 900, height: 700 } });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
    await p.goto(B + '/'); await p.waitForTimeout(400);
    await p.evaluate((as) => new Promise((res, rej) => {
      const ws = new WebSocket('ws://' + location.host + '/api/ws?as=' + as), box = window.__in = [];
      ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (x) { m = { t: 'raw', data: e.data }; } m._r = Date.now(); box.push(m); };
      ws.onopen = () => res(); ws.onerror = () => rej(new Error('ws error')); window.__ws = ws;
    }), as);
    return p;
  };
  const send = (p, o) => p.evaluate((o) => { window.__sent = Date.now(); window.__ws.send(typeof o === 'string' ? o : JSON.stringify(o)); return window.__sent; }, o);
  const wait = async (p, expr, ms = 3000) => { try { await p.waitForFunction((e) => window.__in.some((m) => eval(e)), expr, { timeout: ms }); } catch (e) { return null; } return p.evaluate((e) => window.__in.find((m) => eval(e)), expr); };
  const clear = (p) => p.evaluate(() => { window.__in.length = 0; });
  const DICE = { a: { body: '#e9dcba', pip: '#6a1420', finish: 'bone', sigil: '', glow: false }, b: { body: '#e9dcba', pip: '#6a1420', finish: 'bone', sigil: '', glow: false }, tray: 'leather' };

  const pa = await join('alice');
  let m = await wait(pa, "m.t === 'snap'");
  check('connecting gives a snapshot with who you are and who is here', m && m.you.id === alice.id && m.members.length >= 1 && m.members.find(x => x.id === alice.id).online === true && Array.isArray(m.rolls), m && JSON.stringify(m).slice(0, 200));
  await clear(pa);
  const pb = await join('bob');
  m = await wait(pb, "m.t === 'snap'");
  const bob = m.you;
  check('the second player sees the first in their snapshot', m.members.some(x => x.id === alice.id && x.online));
  check('and the first is told the second arrived', !!(await wait(pa, "m.t === 'online' && m.online === true && m.id === '" + bob.id + "'")));
  check('no email is ever sent to a page', !JSON.stringify(m).includes('@') && !JSON.stringify(await pa.evaluate(() => window.__in)).includes('@'));

  // gate 1: a card change reaches the other browser fast, and cleaned
  await clear(pb);
  const t0 = await send(pa, { t: 'card', card: { name: 'Dee Ray', playbook: 'The Mundane', luck: 99, harm: 3, stats: { charm: 2, cool: 1, sharp: 0, tough: 1, weird: -1 }, hacked: '<script>', moves: ['Panic Button'] }, dice: DICE });
  m = await wait(pb, "m.t === 'card' && m.id === '" + alice.id + "'");
  check('GATE 1: a card change reaches the other browser within two seconds', !!m && m._r - t0 < 2000, m && (m._r - t0) + ' ms');
  check('the card arrives cleaned: luck clamped, unknown keys gone, dice kept', m.card.luck === 7 && m.card.harm === 3 && !('hacked' in m.card) && m.card.moves[0] === 'Panic Button' && m.dice.a.body === '#e9dcba' && m.dice.tray === 'leather', JSON.stringify(m.card).slice(0, 120));
  // names
  await clear(pb); await send(pa, { t: 'hello', name: '  Alice <b>the Bold</b> and a very long surname indeed  ' });
  m = await wait(pb, "m.t === 'name'");
  check('a name is tidied and cut to 30 (markup stays as plain text for the page to escape)', m && m.id === alice.id && m.name.length <= 30 && m.name.startsWith('Alice <b>the Bold</b>'), m && m.name);

  // rolls
  await clear(pa); await clear(pb);
  await send(pb, { t: 'roll', roll: { move: 'Kick Some Ass', d1: 1, d2: 2, mod: 0, total: 12, tier: 'full', luck: false, dice: DICE } });
  const ma = await wait(pa, "m.t === 'roll'"), mb = await wait(pb, "m.t === 'roll'");
  check('a roll reaches everyone, the roller included, in the same order', ma && mb && ma.roll.n === mb.roll.n && ma.roll.id === bob.id);
  check('and the server worked out the total and tier itself (a lie of 12 became 3, a miss)', ma.roll.total === 3 && ma.roll.tier === 'miss' && ma.roll.dice.a.pip === '#6a1420', JSON.stringify(ma.roll).slice(0, 140));
  await clear(pb); await send(pb, { t: 'roll', roll: { d1: 7, d2: 2, tier: 'full' } });
  check('a roll with a die that is not a face is refused', !!(await wait(pb, "m.t === 'err' && m.why === 'bad roll'")));
  await clear(pb); await send(pb, 'this is not json');
  check('something that is not JSON is refused, politely', !!(await wait(pb, "m.t === 'err' && m.why === 'not JSON'")));
  await clear(pb); await send(pb, JSON.stringify({ t: 'card', card: { name: 'x'.repeat(90000) } }));
  check('a message over 80 KB is refused', !!(await wait(pb, "m.t === 'err' && m.why === 'too big'")));
  await clear(pb); await send(pb, 'ping');
  check('a ping is answered with a pong, without waking the table', !!(await wait(pb, "m.t === 'raw' && m.data === 'pong'")));
  await clear(pb); await send(pb, { t: 'unknown-thing', x: 1 }); await send(pb, '{"t": 5}'); await send(pb, 'null');
  await pb.waitForTimeout(300);
  check('unknown or odd messages are ignored and the connection stays open', await pb.evaluate(() => window.__ws.readyState === 1));
  // a burst is cut off by the rate limit...
  await pa.evaluate(() => { for (let i = 0; i < 60; i++) window.__ws.send(JSON.stringify({ t: 'roll', roll: { move: 'Burst ' + i, d1: 3, d2: 3, mod: 0 } })); });
  await pa.waitForTimeout(400);
  const spam = await pa.evaluate(() => ({ slow: window.__in.filter((x) => x.t === 'err' && x.why === 'slow down').length, rolls: window.__in.filter((x) => x.t === 'roll').length }));
  check('sixty messages in an instant: the burst is cut off with "slow down"', spam.slow > 0 && spam.rolls < 61 && spam.rolls >= 15, JSON.stringify(spam));
  // ...but a steady pace is fine, and the table keeps only the last 50
  for (let batch = 0; batch < 4; batch++) {
    await pa.waitForTimeout(1700);
    await pa.evaluate((k) => { for (let i = 0; i < 15; i++) window.__ws.send(JSON.stringify({ t: 'roll', roll: { move: 'Late ' + k + '-' + i, d1: 3, d2: 3, mod: 0 } })); }, batch);
  }
  await pa.waitForTimeout(600);
  const pc = await join('carol'); m = await wait(pc, "m.t === 'snap'");
  check('the table keeps the last 50 rolls, newest first', m.rolls.length === 50 && m.rolls[0].n > m.rolls[49].n && m.rolls[0].move === 'Late 3-14', m.rolls.length + ' ' + m.rolls[0].move);

  // unshare
  await clear(pb); await send(pa, { t: 'unshare' });
  m = await wait(pb, "m.t === 'gone'");
  check('stopping sharing removes the card for everyone', m && m.id === alice.id);
  await send(pa, { t: 'card', card: { name: 'Dee Ray', luck: 5 }, dice: DICE });
  await pa.waitForTimeout(300);

  // gate 2: close, change, reopen, catch up
  await pb.evaluate(() => window.__ws.close()); await pb.waitForTimeout(300);
  check('a closed connection is noticed by the others', !!(await wait(pa, "m.t === 'online' && m.online === false && m.id === '" + bob.id + "'")));
  await send(pa, { t: 'card', card: { name: 'Dee Ray', luck: 2, harm: 4, unstable: true }, dice: DICE });
  await pa.waitForTimeout(300);
  await pb.evaluate(() => new Promise((res) => { const ws = new WebSocket('ws://' + location.host + '/api/ws?as=bob'); window.__in = []; ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (x) { m = { t: 'raw' }; } window.__in.push(m); }; ws.onopen = res; window.__ws = ws; }));
  m = await wait(pb, "m.t === 'snap'");
  const was = m.members.find(x => x.id === alice.id);
  check('GATE 2: after reconnecting, the snapshot already holds what changed while away', was && was.card.luck === 2 && was.card.harm === 4 && was.card.unstable === true && was.online === true, was && JSON.stringify(was.card).slice(0, 90));
  check('and the history is there too', m.rolls.length === 50);

  // ---- origin: another site cannot act as a signed-in player ----
  check('a WebSocket from another site is refused', (await upgrade(B, '/api/ws?as=alice', 'http://evil.test')) === 403);
  check('a WebSocket from our own site is accepted', (await upgrade(B, '/api/ws?as=alice', B)) === 101);
  check('so is one with no Origin (not a browser)', (await upgrade(B, '/api/ws?as=alice')) === 101);
  check('and a WebSocket with nobody signed in is refused', (await upgrade(B, '/api/ws', B)) === 401);

  // ---- gate 3: the Keeper's pictures ----
  const jpg600 = Buffer.alloc(600 * 1024, 7); jpg600.set([0xff, 0xd8, 0xff, 0xe0]);
  // A server that refuses early may drop the connection before the whole body is sent: that is a refusal too (status 0), and the page's upload code must treat it as one.
  // a fresh connection each time: after an early refusal the server closes the old one, and a reused one would fail
  const put = async (as, body, extra) => { try { const rr = await fetch(B + '/api/img?as=' + as, { method: 'PUT', body, headers: Object.assign({ connection: 'close' }, extra || {}) }); const text = await rr.text(); let j = null; try { j = JSON.parse(text); } catch (e) { /* not JSON */ } return { status: rr.status, json: j, text: text.slice(0, 300) }; } catch (e) { return { status: 0, json: null, text: 'threw: ' + e.message + ' / ' + (e.cause && e.cause.message) }; } };
  r = await put('alice', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]));
  check('only the Keeper can upload', r.status === 403);
  r = await put('kay', jpg600);
  check('GATE 3: a 600 KB JPEG uploads', r.status === 201 && /^[0-9a-f]{18}$/.test(r.json.id) && r.json.mime === 'image/jpeg' && r.json.size === jpg600.length, JSON.stringify(r));
  const id = r.json.id;
  check('a picture that is not on a shown handout does not exist for a player (tests/t25.js follows one through draft, shown and hidden)', (await get(B, '/api/img/' + id + '?as=alice')).status === 404);
  r = await get(B, '/api/img/' + id + '?as=kay');
  check('and comes back byte for byte to the Keeper', r.status === 200 && r.body.equals(jpg600));
  check('with a type chosen by the server, no sniffing, and a locked-down policy', r.h.get('content-type') === 'image/jpeg' && r.h.get('x-content-type-options') === 'nosniff' && /default-src 'none'; sandbox/.test(r.h.get('content-security-policy')) && /^private/.test(r.h.get('cache-control')), [...r.h.entries()].map(x => x.join('=')).join(' | '));
  check('but not to someone who is not signed in', (await get(B, '/api/img/' + id)).status === 401);
  check('an id that does not exist, or is not an id, is a 404', (await get(B, '/api/img/000000000000000000?as=alice')).status === 404 && (await get(B, '/api/img/..%2F..%2Fetc?as=alice')).status === 404 && (await get(B, '/api/img/' + id + 'x?as=alice')).status === 404);
  const png = Buffer.alloc(2000); png.set([0x89, 0x50, 0x4e, 0x47]);
  check('a PNG is refused, even if it claims to be a JPEG', (await put('kay', png, { 'content-type': 'image/jpeg' })).status === 415);
  check('an SVG with a script in it is refused', (await put('kay', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'), { 'content-type': 'image/jpeg' })).status === 415);
  const webp = Buffer.alloc(3000); webp.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  r = await put('kay', webp);
  check('a WebP is accepted and served as WebP', r.status === 201 && (await get(B, '/api/img/' + r.json.id + '?as=kay')).h.get('content-type') === 'image/webp');
  const huge = Buffer.alloc(700 * 1024 + 1, 7); huge.set([0xff, 0xd8, 0xff]);
  r = await put('kay', huge);
  check('one byte over 700 KB is refused, and not stored', r.status === 413 || r.status === 0, r.status);
  const rr = await fetch(B + '/api/img?as=kay', { method: 'PUT', body: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), headers: { origin: 'http://evil.test', connection: 'close' } });
  check('an upload from another site is refused', rr.status === 403);

  // in a real browser: upload a real picture, then show it
  const fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'hunter.jpg'));
  const shown = await pa.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const up = await fetch('/api/img?as=kay', { method: 'PUT', body: bytes });
    const j = await up.json();
    const img = new Image(); img.src = '/api/img/' + j.id + '?as=kay';
    await img.decode();
    return { w: img.naturalWidth, h: img.naturalHeight, status: up.status };
  }, fixture.toString('base64'));
  check('a real JPEG uploaded from a page decodes and shows in an image tag', shown.status === 201 && shown.w > 50 && shown.h > 50, JSON.stringify(shown));

  // ---- gate 6: the page itself, against the real-mode server, nobody signed in ----
  const pp = await (await b.newContext()).newPage();
  pp.on('pageerror', e => errs.push('PAGEERR(real mode) ' + e.message));
  pp.on('console', mm => { if (mm.type() === 'error' && !/Failed to load resource/.test(mm.text())) errs.push('CONSOLE(real mode) ' + mm.text()); });
  await pp.goto(P + '/#party'); await pp.waitForTimeout(800);
  check('GATE 6: the journal loads and plays with the table refusing everyone', (await pp.textContent('#partybody')).includes('not switched on yet') && (await pp.locator('#roll').count()) === 1);

  console.log(results.map(x => x.join(' | ')).join('\n'));
  const fails = results.filter(x => x[0] === 'FAIL').length;
  console.log('\nTOTAL', results.length, 'FAIL', fails); console.log('ERRORS', errs);
  await b.close();
  stopAll();
  if (fails || errs.length) { console.log('--- dev server log tail ---\n' + dev.log().slice(-1200)); process.exit(1); }
  process.exit(0);
})().catch((e) => { console.log(results.map(x => x.join(' | ')).join('\n')); console.log('CRASH', e.message.split('\n').slice(0, 8).join('\n')); console.log('ERRORS', errs); stopAll(); if (servers[0]) console.log('--- dev server log tail ---' + String.fromCharCode(10) + servers[0].log().slice(-2500)); process.exit(1); });
