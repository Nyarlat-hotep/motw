// The Keeper's area and the live table in the page (G3, G4, G6, H1, H2): run against the real Worker with `wrangler dev`, with the Keeper and two players in their own browsers.
// First the room's rules, spoken to directly over a socket: only the Keeper posts, and a draft (and its pictures) never reaches a player.
// Then the page: the Keeper's desk, the scene board, the pinned banner on Play, the picture dialog, live hunter cards, the roll feed, the Keeper's overview, reconnecting.
require('fs').mkdirSync(require('path').join(__dirname,'out'),{recursive:true});
const { chromium } = require('playwright');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), WR = path.join(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js'), OUT = path.join(__dirname, 'out');
const PORT = 8797, B = 'http://127.0.0.1:' + PORT;
const results = []; const errs = [];
function check(name, ok, extra){ results.push([ok?'PASS':'FAIL', name, extra===undefined?'':String(extra)]); }

let child = null, log = '';
function startServer() {
  const dir = path.join(OUT, 'wrangler-' + PORT);
  fs.rmSync(dir, { recursive: true, force: true });   // a fresh table every run
  child = spawn(process.execPath, [WR, 'dev', '--config', path.join(ROOT, 'worker', 'wrangler.jsonc'), '--port', String(PORT), '--ip', '127.0.0.1', '--persist-to', dir, '--var', 'DEV:1', '--var', 'KEEPER_EMAILS:kay@dev.test'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', d => { log += d; }); child.stderr.on('data', d => { log += d; });
}
async function ready() {
  for (let i = 0; i < 120; i++) { try { await fetch(B + '/api/me'); return; } catch (e) { await new Promise(r => setTimeout(r, 500)); } }
  throw new Error('wrangler dev did not start\n' + log.slice(-1500));
}
function stopServer() { try { fs.writeFileSync(path.join(OUT, 'wrangler-' + PORT + '.log'), log); } catch (e) { /* no folder */ } try { if (child) { if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F']); else child.kill('SIGKILL'); } } catch (e) { /* gone */ } child = null; }
process.on('exit', stopServer);

const HUNTER = { share: false, sheet: { name: 'Dee Ray', pronouns: 'she/her', playbook: 'The Mundane', catch: 'I am just here for the snacks.', luck: 5, harm: 0, xp: 1, stats: { charm: 2, cool: 1, sharp: 0, tough: 1, weird: -1 } } };
const SECOND = { share: false, sheet: { name: 'Old Moss', playbook: 'The Expert', luck: 6, harm: 0, stats: { charm: 0, cool: 1, sharp: 2, tough: -1, weird: 1 } } };
const NASTY = '<img src=x onerror="window.__pwn=1"> The <b>gate</b>';

(async () => {
  spawnSync(process.execPath, [path.join(ROOT, 'tools', 'build.js')], { cwd: ROOT });   // the Worker serves dist/, so make sure it is the current page
  startServer(); await ready();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const get = async (p) => { const r = await fetch(B + p); return { status: r.status, body: Buffer.from(await r.arrayBuffer()), h: r.headers }; };
  const watch = (p, who) => { p.on('pageerror', e => errs.push('PAGEERR(' + who + ') ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE(' + who + ') ' + m.text()); }); };

  /* ================= the room's rules, over a bare socket ================= */
  const join = async (as) => {
    const ctx = await b.newContext(); const p = await ctx.newPage(); watch(p, 'raw ' + as);
    await p.goto(B + '/api/nothing?as=' + as);   // any page on our origin will do; this one runs none of the journal
    await p.evaluate((as) => new Promise((res, rej) => {
      const ws = new WebSocket('ws://' + location.host + '/api/ws?as=' + as), box = window.__in = [];
      ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (x) { m = { t: 'raw', data: e.data }; } box.push(m); };
      ws.onopen = () => res(); ws.onerror = () => rej(new Error('ws error')); window.__ws = ws;
    }), as);
    return p;
  };
  const send = (p, o) => p.evaluate((o) => { window.__ws.send(JSON.stringify(o)); }, o);
  const wait = async (p, expr, ms = 3000) => { try { await p.waitForFunction((e) => window.__in.some((m) => eval(e)), expr, { timeout: ms }); } catch (e) { return null; } return p.evaluate((e) => window.__in.find((m) => eval(e)), expr); };
  const inbox = (p) => p.evaluate(() => JSON.stringify(window.__in));
  const clear = (p) => p.evaluate(() => { window.__in.length = 0; });
  const put = async (as, body) => { const r = await fetch(B + '/api/img?as=' + as, { method: 'PUT', body, headers: { connection: 'close' } }); return { status: r.status, json: await r.json().catch(() => null) }; };
  const fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'hunter.jpg'));

  const rk = await join('kay'), ra = await join('alice');
  let m = await wait(rk, "m.t === 'snap'");
  check('the Keeper is told they are the Keeper, and starts with no handouts', m.you.keeper === true && Array.isArray(m.handouts) && m.handouts.length === 0);
  check('the member list says who the Keeper is', m.members.find(x => x.id === m.you.id).keeper === true);
  m = await wait(ra, "m.t === 'snap'");
  check('a player is not the Keeper, and gets a handout list too', m.you.keeper === false && Array.isArray(m.handouts) && m.members.some(x => x.keeper === true));

  // a player cannot post
  await clear(ra); await clear(rk);
  await send(ra, { t: 'ho-save', h: { title: 'Player sneaks one in', body: 'x' }, show: true });
  check('a player who tries to post a handout is refused', !!(await wait(ra, "m.t === 'err' && m.why === 'Keeper only'")));
  await send(ra, { t: 'ho-show', id: '0'.repeat(18), shown: true }); await send(ra, { t: 'ho-pin', id: '0'.repeat(18), pinned: true }); await send(ra, { t: 'ho-del', id: '0'.repeat(18) });
  await ra.waitForTimeout(300);
  check('and so are show, pin and delete from a player', (await ra.evaluate(() => window.__in.filter(x => x.t === 'err' && x.why === 'Keeper only').length)) === 4);
  check('nothing a player tried reached the Keeper', !/Player sneaks/.test(await inbox(rk)));

  // a draft stays with the Keeper
  const up = await put('kay', fixture);
  check('the Keeper uploads a picture', up.status === 201 && /^[0-9a-f]{18}$/.test(up.json.id), JSON.stringify(up));
  const pic = up.json.id;
  await clear(ra); await clear(rk);
  await send(rk, { t: 'ho-save', h: { title: 'SECRET-DRAFT the cellar door', kind: 'clue', body: 'Line one\r\nLine two\u0007 bell', images: [{ id: pic, alt: 'A rusted door' }, { id: 'f'.repeat(18), alt: 'never uploaded' }, { id: 'nope' }], extra: '<script>' } });
  m = await wait(rk, "m.t === 'ho'");
  const draft = m && m.h;
  check('the Keeper gets their draft back, cleaned', draft && draft.shown === false && draft.pinned === false && draft.kind === 'clue' && draft.body === 'Line one\nLine two  bell' && !('extra' in draft), JSON.stringify(draft));
  check('a picture that was never uploaded is dropped from it', draft.images.length === 1 && draft.images[0].id === pic && draft.images[0].alt === 'A rusted door');
  check('and is told it was saved', !!(await wait(rk, "m.t === 'ho-saved' && m.id === '" + draft.id + "'")));
  await ra.waitForTimeout(500);
  check('DRAFT: nothing about it reaches a player\'s connection', !/SECRET-DRAFT|ho/.test(await ra.evaluate(() => JSON.stringify(window.__in.map(x => x.t)))) && !/SECRET-DRAFT/.test(await inbox(ra)), await inbox(ra));
  const rc = await join('carol'); m = await wait(rc, "m.t === 'snap'");
  check('DRAFT: a player who joins later does not get it in their snapshot', m.handouts.length === 0 && !/SECRET-DRAFT/.test(JSON.stringify(m)));
  const rk2 = await join('kay'); m = await wait(rk2, "m.t === 'snap'");
  check('but the Keeper does, on any of their own connections', m.handouts.length === 1 && m.handouts[0].title.startsWith('SECRET-DRAFT'));
  check('DRAFT: its picture does not exist for a player', (await get('/api/img/' + pic + '?as=alice')).status === 404);
  const kp = await get('/api/img/' + pic + '?as=kay');
  check('and does for the Keeper, byte for byte', kp.status === 200 && kp.body.equals(fixture) && kp.h.get('content-type') === 'image/jpeg' && kp.h.get('x-content-type-options') === 'nosniff');

  // show it
  await clear(ra); await clear(rc);
  await send(rk, { t: 'ho-show', id: draft.id, shown: true });
  m = await wait(ra, "m.t === 'ho'");
  check('SHOWN: the players get it, marked as new', m && m.fresh === true && m.h.shown === true && m.h.title.startsWith('SECRET-DRAFT') && m.h.images[0].id === pic && !!(await wait(rc, "m.t === 'ho'")));
  check('SHOWN: now a player can fetch its picture', (await get('/api/img/' + pic + '?as=alice')).status === 200);
  check('but still nobody who is not signed in', (await get('/api/img/' + pic)).status === 401);

  // an edit to a shown handout reaches players without being called new again
  await clear(ra);
  await send(rk, { t: 'ho-save', id: draft.id, h: { title: 'The cellar door', kind: 'not-a-kind', body: 'x'.repeat(5000), images: [{ id: pic, alt: 'y'.repeat(300) }, { id: pic }, { id: pic }, { id: pic }] } });
  m = await wait(ra, "m.t === 'ho'");
  check('an edit reaches players, clamped: body 4,000, three pictures, 200 for a description, an unknown kind becomes a note', m && m.fresh === false && m.h.title === 'The cellar door' && m.h.body.length === 4000 && m.h.images.length === 3 && m.h.images[0].alt.length === 200 && m.h.kind === 'note' && m.h.shown === true, m && JSON.stringify(m.h).slice(0, 120));
  await clear(rk); await send(rk, { t: 'ho-save', h: { title: '   ', body: '', images: [] } });
  check('an empty handout is refused', !!(await wait(rk, "m.t === 'err' && m.why === 'bad handout'")));
  await clear(rk); await send(rk, { t: 'ho-save', id: 'a'.repeat(18), h: { title: 'ghost' } });
  check('editing a handout that does not exist is refused, not created', !!(await wait(rk, "m.t === 'err' && m.why === 'no such handout'")));

  // pinning: one at a time
  await clear(rk); await send(rk, { t: 'ho-save', h: { title: 'Second thing', kind: 'scene', body: 'two' }, show: true });
  const second = (await wait(rk, "m.t === 'ho' && m.h.title === 'Second thing'")).h;
  await clear(ra); await send(rk, { t: 'ho-pin', id: draft.id, pinned: true });
  m = await wait(ra, "m.t === 'ho' && m.h.pinned === true");
  check('PIN: players are told which handout is pinned', m && m.h.id === draft.id && m.fresh === true);
  await clear(ra); await send(rk, { t: 'ho-pin', id: second.id, pinned: true });
  const unp = await wait(ra, "m.t === 'ho' && m.h.id === '" + draft.id + "' && m.h.pinned === false"), pinned = await wait(ra, "m.t === 'ho' && m.h.id === '" + second.id + "' && m.h.pinned === true");
  check('PIN: pinning another unpins the first, so there is only ever one', !!unp && !!pinned);
  const rd = await join('dan'); m = await wait(rd, "m.t === 'snap'");
  check('and a new arrival sees exactly one pinned', m.handouts.filter(h => h.pinned).length === 1 && m.handouts.length === 2);
  // pinning a draft shows it
  await clear(rk); await send(rk, { t: 'ho-save', h: { title: 'Third, a draft', body: 'three' } });
  const third = (await wait(rk, "m.t === 'ho' && m.h.title === 'Third, a draft'")).h;
  await clear(ra); await send(rk, { t: 'ho-pin', id: third.id, pinned: true });
  m = await wait(ra, "m.t === 'ho' && m.h.id === '" + third.id + "'");
  check('PIN: pinning a draft shows it', m && m.h.shown === true && m.h.pinned === true);

  // hide, delete
  await clear(ra); await send(rk, { t: 'ho-show', id: draft.id, shown: false });
  m = await wait(ra, "m.t === 'ho-gone'");
  check('HIDE: players are told to drop it, with nothing but its id', m && m.id === draft.id && Object.keys(m).sort().join() === 'id,t');
  check('HIDE: and its picture is out of reach again', (await get('/api/img/' + pic + '?as=alice')).status === 404 && (await get('/api/img/' + pic + '?as=kay')).status === 200);
  await clear(ra); await clear(rk); await send(rk, { t: 'ho-show', id: third.id, shown: false });
  m = await wait(rk, "m.t === 'ho' && m.h.id === '" + third.id + "'");
  check('HIDE: hiding the pinned one unpins it', m && m.h.shown === false && m.h.pinned === false);
  await clear(ra); await send(rk, { t: 'ho-del', id: second.id });
  check('DELETE: a shown handout disappears for players', !!(await wait(ra, "m.t === 'ho-gone' && m.id === '" + second.id + "'")));
  await clear(ra); await send(rk, { t: 'ho-del', id: third.id }); await ra.waitForTimeout(400);
  check('DELETE: deleting a draft tells players nothing at all', (await ra.evaluate(() => window.__in.length)) === 0, await inbox(ra));
  await send(rk, { t: 'ho-del', id: draft.id }); await rk.waitForTimeout(300);
  for (const p of [rk, rk2, ra, rc, rd]) await p.context().close();

  /* ================= the page ================= */
  const open = async (as, journal, viewport) => {
    const ctx = await b.newContext({ viewport: viewport || { width: 1200, height: 900 }, colorScheme: 'dark' });
    await ctx.addInitScript(() => {
      window.__dice = [];
      const real = crypto.getRandomValues.bind(crypto);
      crypto.getRandomValues = function (a) { if (a instanceof Uint8Array && a.length === 1 && window.__dice.length) { a[0] = window.__dice.shift() - 1; return a; } return real(a); };
    });
    await ctx.addInitScript((j) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hunters-journal-v1', j); sessionStorage.setItem('seeded', '1'); } }, JSON.stringify(journal || {}));
    const p = await ctx.newPage(); watch(p, as);
    await p.goto(B + '/?as=' + as + '#party');
    await p.waitForFunction(() => window.__journal && window.__journal.tbl().state === 'live', null, { timeout: 8000 });
    return p;
  };
  const T = async (p, sel) => ((await p.textContent(sel)) || '').replace(/\s+/g, ' ').trim();
  const tbl = (p) => p.evaluate(() => { const t = window.__journal.tbl(); return { state: t.state, view: t.view, me: t.me, hos: t.hos, members: t.members.map(x => ({ id: x.id, name: x.name, keeper: x.keeper, online: x.online, card: x.card })), rolls: t.rolls }; });
  const until = async (p, fn, arg, ms = 4000) => { try { await p.waitForFunction(fn, arg, { timeout: ms }); return true; } catch (e) { return false; } };
  const noScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

  const K = await open('kay', {}), A = await open('alice', HUNTER), Bo = await open('bob', SECOND);
  check('the page joins the table and says it is live', /Live/.test(await T(K, '#tblstate')) && /Live/.test(await T(A, '#tblstate')));
  check('the Keeper has a Keeper\'s desk; a player does not', (await K.locator('[data-pv="desk"]').count()) === 1 && (await A.locator('[data-pv="desk"]').count()) === 0 && (await A.locator('[data-pv="board"]').count()) === 1);
  check('everyone sees who is at the table, and who the Keeper is', await until(A, () => document.querySelectorAll('.seats .seat').length >= 3) && /Keeper/.test(await T(A, '.seats')) && /\(you\)/.test(await T(A, '.seats')));
  check('the Keeper is told they need not share a hunter', /You are the Keeper/.test(await T(K, '#partybody')) && !/You are the Keeper/.test(await T(A, '#partybody')));
  await A.evaluate(() => { window.__journal.tbl().view = 'desk'; }); await A.click('[data-pv="hunters"]');
  check('a player cannot reach the desk by asking for it', (await A.locator('.kdesk').count()) === 0);

  // names and live cards
  await A.fill('#tname', 'Alice at home'); await A.locator('#tname').blur();
  check('a name at the table reaches the others', await until(K, () => /Alice at home/.test(document.querySelector('.seats').textContent)));
  check('before sharing, nobody sees the hunter', !/Dee Ray/.test(await T(K, '#partybody')));
  await A.check('#share');
  check('LIVE CARD: turning on sharing puts the hunter on the Keeper\'s screen within two seconds', await until(K, () => /Dee Ray/.test(document.querySelector('#partybody').textContent), null, 2000));
  check('with who plays them', /played by Alice at home/.test(await T(K, '.pcard')));
  await A.evaluate(() => { const J = window.__journal; J.S().sheet.harm = 3; J.S().sheet.luck = 2; J.scheduleSave(); });
  check('LIVE CARD: a change to Harm and Luck follows', await until(K, () => { const m = window.__journal.tbl().members.find(x => x.card && x.card.name === 'Dee Ray'); return m && m.card.harm === 3 && m.card.luck === 2; }, null, 3000));
  await Bo.check('#share'); await until(K, () => window.__journal.tbl().members.filter(x => x.card).length === 2);

  // the roll feed
  // Alice rolls her own dice (blue metal that glows), and the Keeper has sound on, counted through the audio nodes the page makes
  await A.evaluate(() => { const J = window.__journal, d = { body: '#2244aa', finish: 'metal', pip: '#ffffff', glow: true, sigil: '' }; J.S().dice.linked = true; J.S().dice.a = d; J.S().dice.b = d; J.scheduleSave(); });
  const canHear = await K.evaluate(() => { window.__nodes = 0; window.__journal.S().settings.sound = true; if (!window.BaseAudioContext) return false; const P = BaseAudioContext.prototype, g = P.createGain; P.createGain = function () { window.__nodes++; return g.call(this); }; return true; });
  await A.click('#t-play'); await A.evaluate(() => { window.__dice.push(4, 3); }); await A.click('#roll');
  check('ROLL FEED: a roll shows up for the Keeper', await until(K, () => window.__journal.tbl().rolls.length === 1, null, 5000));
  await K.click('#t-play');
  const feed = await T(K, '#play-feed');
  check('with the hunter, the move, the dice and the result', /At the table/.test(feed) && /Dee Ray/.test(feed) && /\(4\+3/.test(feed) && /success|Miss/.test(feed), feed);
  check('and for the player who rolled', /Dee Ray/.test(await T(A, '#play-feed')));
  check('a player who is not sharing sends no rolls', await (async () => { const C = await open('carol', SECOND); await C.click('#t-play'); await C.evaluate(() => { window.__dice.push(6, 6); }); await C.click('#roll'); await C.waitForTimeout(2500); const n = (await tbl(K)).rolls.length; await C.context().close(); return n === 1; })());
  const row = await K.evaluate(() => { const li = document.querySelector('#play-feed .tfeed li'), sl = [...li.querySelectorAll('.mdie .slot')]; return { dice: sl.length, faces: sl.map(x => x.querySelector('.face').className).join(' | '), cls: sl[0].className, style: sl[0].getAttribute('style') || '', label: li.querySelector('.tdice').getAttribute('aria-label'), size: Math.round(li.querySelector('.mdie').getBoundingClientRect().width), face: sl.map(x => { const r = x.querySelector('.face').getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); }).join(' '), tag: [...document.querySelectorAll('#play-feed div')].length }; });
  check('ROLL FEED: the roll is drawn with two small dice showing the faces rolled', row.dice === 2 && /v4/.test(row.faces.split(' | ')[0]) && /v3/.test(row.faces.split(' | ')[1]) && row.label === 'Dice showing 4 and 3', JSON.stringify(row));
  check('they are the dice of whoever rolled: her finish, her glow, her colors', /fin-metal/.test(row.cls) && /glow/.test(row.cls) && /#2244aa/.test(row.style), row.cls + ' ' + row.style);
  check('each is a 26px die with its face scaled to fit', row.size === 26 && row.face === '26x26 26x26', row.size + ' ' + row.face);
  check('a roll by someone else is read out for screen readers, and not to the one who rolled', /^Dee Ray rolled 8 on .+: /.test(await T(K, '#tbl-say')) && (await T(A, '#tbl-say')) === '', await T(K, '#tbl-say'));
  await K.waitForTimeout(400);
  const heard = await K.evaluate(() => window.__nodes);
  check('with sound on, the dice of someone else are heard landing', heard > 0 || !canHear, canHear ? heard : 'this browser has no audio');
  await K.locator('#play-feed').scrollIntoViewIfNeeded();
  const dbox = await K.evaluate(() => { const r = document.querySelector('#play-feed .mdie').getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), width: 26, height: 26 }; });
  const drawn = await K.screenshot({ clip: dbox });
  await K.evaluate(() => { document.querySelector('#play-feed .mdie').style.visibility = 'hidden'; });
  const blank = await K.screenshot({ clip: dbox });
  await K.evaluate(() => { document.querySelector('#play-feed .mdie').style.visibility = ''; });
  check('and each die is really drawn, lying flat', Buffer.compare(drawn, blank) !== 0 && (await K.evaluate(() => getComputedStyle(document.querySelector('#play-feed .mdie .face')).transform)) === 'none');
  await K.locator('#play-feed').scrollIntoViewIfNeeded(); await K.locator('#play-feed').screenshot({ path: path.join(__dirname, 'out', 'table-feed-dice.png') });
  // switched off in Settings: the next roll is still shown, but makes no sound and is not read out
  await K.evaluate(() => { document.querySelector('#settings').open = true; document.querySelector('#tbl-say').textContent = ''; }); await K.uncheck('#set-tnote');
  await A.waitForSelector('#copyroll', { timeout: 5000 }); await A.evaluate(() => { window.__dice.push(4, 3); }); await A.click('#roll');
  check('ROLL FEED: a second roll arrives', await until(K, () => window.__journal.tbl().rolls.length === 2, null, 6000));
  await K.waitForTimeout(400);
  check('switched off: shown, but silent and not read out', (await K.locator('#play-feed .tfeed li').count()) === 2 && (await K.evaluate(() => window.__nodes)) === heard && (await T(K, '#tbl-say')) === '', (await K.evaluate(() => window.__nodes)) + ' ' + (await T(K, '#tbl-say')));
  check('and the choice is saved', (await K.evaluate(() => window.__journal.S().settings.tnote)) === false);
  await K.check('#set-tnote');
  const P = await open('pat', {}, { width: 390, height: 800 }); await P.click('#t-play'); await until(P, () => document.querySelectorAll('#play-feed .tfeed li').length === 2);
  check('phone: the feed with dice fits the screen', (await noScroll(P)) && (await P.evaluate(() => [...document.querySelectorAll('#play-feed .tfeed li > *')].every(e => { const r = e.getBoundingClientRect(), c = document.querySelector('#play-feed .card').getBoundingClientRect(); return r.left >= c.left - 1 && r.right <= c.right + 1; }))));
  await P.locator('#play-feed').scrollIntoViewIfNeeded(); await P.locator('#play-feed').screenshot({ path: path.join(__dirname, 'out', 'table-feed-dice-phone.png') }); await P.context().close();
  await K.click('#t-party');

  // the Keeper's overview
  await K.click('[data-pv="desk"]');
  const ov = await T(K, '.kov');
  check('OVERVIEW: the Keeper sees every shared hunter, most hurt first, with their last roll', ov.indexOf('Dee Ray') >= 0 && ov.indexOf('Old Moss') > ov.indexOf('Dee Ray') && /Last roll: .* 8|Last roll: .*, 8/.test(ov.replace(/\s+/g, ' ')) && /No rolls yet/.test(ov), ov);
  check('the overview is read-only', (await K.locator('.kov button, .kov input').count()) === 0);

  // write a handout with a picture, as a draft
  await K.click('[data-ho-new]');
  check('New handout opens the form with the cursor in the title', await K.evaluate(() => document.activeElement && document.activeElement.id === 'ho-title'));
  await K.fill('#ho-title', NASTY); await K.selectOption('#ho-kind', 'place');
  await K.fill('#ho-body', 'The gate hangs open.\nSomething dragged itself through the dust.');
  await K.setInputFiles('#ho-file', path.join(__dirname, 'fixtures', 'hunter.jpg'));
  check('PICTURE: it is prepared and uploaded from the page', await until(K, () => /Picture added/.test(document.querySelector('#ho-say').textContent), null, 8000), await T(K, '#ho-say'));
  check('and shown in the form with a place to describe it', (await K.locator('.kpic img').count()) === 1 && (await K.locator('#ho-alt-0').count()) === 1 && /cannot see it/.test(await T(K, '.kpic')));
  // typing is never interrupted by the table
  await K.focus('#ho-alt-0'); await K.keyboard.type('A leaning gate');
  await A.evaluate(() => { const J = window.__journal; J.S().sheet.harm = 4; J.scheduleSave(); });
  await until(K, () => { const m = window.__journal.tbl().members.find(x => x.card && x.card.name === 'Dee Ray'); return m && m.card.harm === 4; });
  await K.keyboard.type(' in the dust');
  check('TYPING: news from the table does not take the cursor or the words away', (await K.inputValue('#ho-alt-0')) === 'A leaning gate in the dust' && await K.evaluate(() => document.activeElement.id === 'ho-alt-0'));
  // a person holds the mouse button for a moment: the form must not be redrawn under the press, or the click is lost
  await K.click('[data-ho-save="draft"]', { delay: 150 });
  check('the draft is saved and listed as a draft, on the first click, though news arrived while typing', await until(K, () => !document.querySelector('#kform') && /Draft/.test((document.querySelector('.khos') || {}).textContent || '')), await T(K, '#partybody'));
  const kpic = (await tbl(K)).hos[0].images[0];
  check('with its picture and description', kpic && kpic.alt === 'A leaning gate in the dust');
  const sent = await get('/api/img/' + kpic.id + '?as=kay');
  check('PICTURE: what was sent is a JPEG under 700 KB', sent.status === 200 && sent.h.get('content-type') === 'image/jpeg' && sent.body.length <= 700 * 1024 && sent.body[0] === 0xff && sent.body[1] === 0xd8, sent.body.length);
  await A.waitForTimeout(600);
  check('DRAFT: the player\'s page holds nothing of it', (await tbl(A)).hos.length === 0 && !/leaning gate|dragged itself|hangs open|__pwn/.test(await A.evaluate(() => document.querySelector('.wrap').textContent + JSON.stringify(window.__journal.tbl()))));
  await A.click('#t-party'); await A.click('[data-pv="board"]');
  check('and their scene board says nothing has come yet', /Nothing from the Keeper yet/.test(await T(A, '#partybody')) && !(await A.evaluate(() => document.querySelector('#t-party').classList.contains('hasdot'))));
  await A.click('#t-play');
  await K.screenshot({ path: path.join(OUT, 't25-desk.png'), fullPage: true });

  // show it
  await K.click('.kho [data-ho-show]');
  check('SHOW: the player gets a notice within two seconds', await until(A, () => { const t = document.querySelector('#evtoast'); return t && !t.hidden && /New from the Keeper/.test(t.textContent); }, null, 2000), await T(A, '#evtoast'));
  check('and a dot on the Party tab', await A.evaluate(() => document.querySelector('#t-party').classList.contains('hasdot')) && /new from the Keeper/.test(await T(A, '#t-party')));
  await A.click('#t-party');
  check('opening Party goes straight to the scene board', (await tbl(A)).view === 'board' && (await A.locator('.ho').count()) === 1);
  const ho = await T(A, '.ho');
  check('BOARD: title, kind, words and the New mark are there', ho.indexOf('The gate') >= 0 && /Place/.test(ho) && /New/.test(ho) && /dragged itself/.test(ho), ho);
  check('BOARD: markup in the title is shown as plain text and runs nothing', (await A.evaluate(() => window.__pwn)) === undefined && (await K.evaluate(() => window.__pwn)) === undefined && (await A.locator('.ho h3 img, .ho h3 b').count()) === 0 && /<img src=x/.test(await T(A, '.ho h3')));
  check('BOARD: line breaks are kept', await A.evaluate(() => { const p = document.querySelector('.ho .hobody'); return getComputedStyle(p).whiteSpace === 'pre-wrap' && /open\.\nSomething/.test(p.textContent); }));
  check('BOARD: the picture loads, with its description as alt text and caption', await until(A, () => { const i = document.querySelector('.ho .hoimg img'); return i && i.complete && i.naturalWidth > 50; }, null, 5000) && (await A.getAttribute('.ho .hoimg img', 'alt')) === 'A leaning gate in the dust' && /A leaning gate in the dust/.test(await T(A, '.ho figcaption')));
  check('looking at the board clears the dot', !(await A.evaluate(() => document.querySelector('#t-party').classList.contains('hasdot'))));
  await A.screenshot({ path: path.join(OUT, 't25-board.png'), fullPage: true });

  // the picture dialog
  await A.focus('.ho .hoimg'); await A.keyboard.press('Enter');
  check('DIALOG: the picture opens with its description and a Close button', await A.evaluate(() => { const d = document.querySelector('#hodlg'); return d.open && document.querySelector('#hodlg-cap').textContent === 'A leaning gate in the dust' && document.activeElement.id === 'hodlg-close'; }));
  await A.keyboard.press('Escape');
  check('DIALOG: Escape closes it and focus goes back to the picture', await A.evaluate(() => !document.querySelector('#hodlg').open && document.activeElement.classList.contains('hoimg')));
  await A.click('.ho .hoimg'); await A.click('#hodlg-close');
  check('DIALOG: so does Close', await A.evaluate(() => !document.querySelector('#hodlg').open));

  // pin it: the banner on Play
  await A.click('#t-play');
  await K.click('.kho [data-ho-pin]');
  check('PIN: the banner appears at the top of the player\'s Play tab within two seconds', await until(A, () => { const d = document.querySelector('#pin-d'); return d && d.open && /The gate/.test(d.textContent) && /dragged itself/.test(d.textContent); }, null, 2000), await T(A, '#play-pin'));
  await A.click('#pin-d summary');
  await Bo.evaluate(() => { const J = window.__journal; J.S().sheet.harm = 1; J.scheduleSave(); }); await A.waitForTimeout(900);
  check('PIN: folded down it stays folded, showing its title', await A.evaluate(() => { const d = document.querySelector('#pin-d'); return d && !d.open && /From the Keeper/.test(d.querySelector('summary').textContent) && /gate/.test(d.querySelector('summary').textContent); }));
  check('the Keeper\'s list says Pinned', /Pinned/.test(await T(K, '.khos')));

  // edit while shown
  await K.click('.kho [data-ho-edit]'); await K.fill('#ho-title', 'The east gate'); await K.click('[data-ho-save="keep"]');
  check('EDIT: a change to a shown handout reaches the player, still pinned', await until(A, () => { const d = document.querySelector('#pin-d'); return d && /The east gate/.test(d.textContent); }, null, 3000));

  // a player who arrives late, and a phone
  const D = await open('dan', {}, { width: 390, height: 800 });
  check('LATE: someone who joins afterwards has the handout waiting, with a dot', (await tbl(D)).hos.length === 1 && await D.evaluate(() => document.querySelector('#t-party').classList.contains('hasdot')));
  await D.click('[data-pv="board"]');
  check('PHONE: the scene board fits 390 wide', await noScroll(D) && (await D.locator('.ho').count()) === 1);
  await D.screenshot({ path: path.join(OUT, 't25-board-phone.png'), fullPage: true });
  await D.click('#t-play');
  check('PHONE: so does Play with the banner', await noScroll(D) && (await D.locator('#pin-d').count()) === 1);
  await D.context().close();
  const KP = await open('kay', {}, { width: 390, height: 800 });
  await KP.click('[data-pv="desk"]'); await KP.click('.kho [data-ho-edit]');
  check('PHONE: the Keeper\'s desk and its form fit 390 wide', await noScroll(KP) && (await KP.locator('#kform').count()) === 1);
  await KP.screenshot({ path: path.join(OUT, 't25-desk-phone.png'), fullPage: true });
  await KP.context().close();

  // reconnecting
  await A.click('#t-party'); await A.click('[data-pv="hunters"]');
  await A.evaluate(() => { window.__journal.tbl().ws.close(); });
  check('RECONNECT: a dropped connection says so', await until(A, () => /Reconnecting/.test(document.querySelector('#tblstate').textContent), null, 3000));
  check('the others see that player as away', await until(K, () => { const m = window.__journal.tbl().members.find(x => x.name === 'Alice at home'); return m && m.online === false; }, null, 3000));
  await K.click('.kho [data-ho-edit]'); await K.fill('#ho-body', 'Changed while Alice was away.'); await K.click('[data-ho-save="keep"]');
  check('RECONNECT: it comes back on its own, caught up', await until(A, () => { const t = window.__journal.tbl(); return t.state === 'live' && t.hos.length === 1 && /while Alice was away/.test(t.hos[0].body); }, null, 8000), JSON.stringify((await tbl(A)).state));
  check('and the hunter is still on the table afterwards', await until(K, () => { const m = window.__journal.tbl().members.find(x => x.name === 'Alice at home'); return m && m.online === true && m.card && m.card.name === 'Dee Ray'; }, null, 4000));

  // hide and delete from the desk
  await K.click('.kho [data-ho-show]');
  check('HIDE: the handout leaves the player\'s board and Play', await until(A, () => window.__journal.tbl().hos.length === 0 && !document.querySelector('#pin-d'), null, 3000));
  await K.click('.kho [data-ho-del]');
  check('DELETE asks first', /Delete "The east gate"\?/.test(await T(K, '.kho .confirm')) && (await tbl(K)).hos.length === 1);
  await K.click('[data-ho-del-no]');
  check('Keep it keeps it', (await tbl(K)).hos.length === 1 && (await K.locator('.kho .confirm').count()) === 0);
  await K.click('.kho [data-ho-del]'); await K.click('[data-ho-del-yes]');
  check('Delete it deletes it', await until(K, () => window.__journal.tbl().hos.length === 0 && /No handouts yet/.test(document.querySelector('#partybody').textContent), null, 3000));

  // stop sharing
  await A.uncheck('#share');
  check('STOP SHARING: the hunter leaves the Keeper\'s screen', await until(K, () => !window.__journal.tbl().members.some(x => x.card && x.card.name === 'Dee Ray'), null, 3000));
  check('no email address ever reached a page', !/@/.test(JSON.stringify(await tbl(K)) + JSON.stringify(await tbl(A))));

  console.log(results.map(x => x.join(' | ')).join('\n'));
  const fails = results.filter(x => x[0] === 'FAIL').length;
  console.log('\nTOTAL', results.length, 'FAIL', fails); console.log('ERRORS', errs);
  await b.close(); stopServer();
  if (fails || errs.length) { console.log('--- server log tail ---\n' + log.slice(-1200)); process.exit(1); }
  process.exit(0);
})().catch((e) => { console.log(results.map(x => x.join(' | ')).join('\n')); console.log('CRASH', String(e.stack || e.message).split('\n').slice(0, 8).join('\n')); console.log('ERRORS', errs); stopServer(); console.log('--- server log tail ---\n' + log.slice(-2000)); process.exit(1); });
