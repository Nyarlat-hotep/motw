// The session at the table (track J): counting, parts, the Keeper ending an episode or the whole session. Run against the real Worker with `wrangler dev`.
// First the room's rules, spoken to directly over sockets: a session begins by itself, only the Keeper runs it, an episode can end "to be continued" and pick up
// at the next roll, a quiet table begins a new part by itself, ending hands out the awards, and later parts the Keeper leaves out become the next session.
// The page's side of it (the Keeper's controls, the two screens, badges on the hunter) is tests/t31.js, which plays a whole session.
require('fs').mkdirSync(require('path').join(__dirname,'out'),{recursive:true});
const { chromium } = require('playwright');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), WR = path.join(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js'), OUT = path.join(__dirname, 'out');
const PORT = 8798, B = 'http://127.0.0.1:' + PORT, GAP = 1500;
const results = []; const errs = [];
function check(name, ok, extra){ results.push([ok?'PASS':'FAIL', name, extra===undefined?'':String(extra)]); }

let child = null, log = '';
function startServer() {
  const dir = path.join(OUT, 'wrangler-' + PORT);
  fs.rmSync(dir, { recursive: true, force: true });   // a fresh table every run
  child = spawn(process.execPath, [WR, 'dev', '--config', path.join(ROOT, 'worker', 'wrangler.jsonc'), '--port', String(PORT), '--ip', '127.0.0.1', '--persist-to', dir, '--var', 'DEV:1', '--var', 'KEEPER_EMAILS:kay@dev.test', '--var', 'GAP_MS:' + GAP], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', d => { log += d; }); child.stderr.on('data', d => { log += d; });
}
async function ready() {
  for (let i = 0; i < 120; i++) { try { await fetch(B + '/api/me'); return; } catch (e) { await new Promise(r => setTimeout(r, 500)); } }
  throw new Error('wrangler dev did not start\n' + log.slice(-1500));
}
function stopServer() { try { fs.writeFileSync(path.join(OUT, 'wrangler-' + PORT + '.log'), log); } catch (e) { /* no folder */ } try { if (child) { if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F']); else child.kill('SIGKILL'); } } catch (e) { /* gone */ } child = null; }
process.on('exit', stopServer);

(async () => {
  spawnSync(process.execPath, [path.join(ROOT, 'tools', 'build.js')], { cwd: ROOT });   // the Worker serves dist/, so make sure it is the current page
  startServer(); await ready();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const watch = (p, who) => { p.on('pageerror', e => errs.push('PAGEERR(' + who + ') ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE(' + who + ') ' + m.text()); }); };

  /* ================= the room's rules, over bare sockets ================= */
  const join = async (as) => {
    const ctx = await b.newContext(); const p = await ctx.newPage(); watch(p, 'raw ' + as);
    await p.goto(B + '/api/nothing?as=' + as);
    await p.evaluate((as) => new Promise((res, rej) => {
      const ws = new WebSocket('ws://' + location.host + '/api/ws?as=' + as), box = window.__in = [];
      ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (x) { m = { t: 'raw', data: e.data }; } box.push(m); };
      ws.onopen = () => res(); ws.onerror = () => rej(new Error('ws error')); window.__ws = ws;
    }), as);
    return p;
  };
  const send = (p, o) => p.evaluate((o) => { window.__ws.send(JSON.stringify(o)); }, o);
  const wait = async (p, expr, ms = 3000) => { try { await p.waitForFunction((e) => window.__in.some((m) => eval(e)), expr, { timeout: ms }); } catch (e) { return null; } return p.evaluate((e) => window.__in.filter((m) => eval(e)).pop(), expr); };
  const clear = async (...ps) => { for (const p of ps) await p.evaluate(() => { window.__in.length = 0; }); };
  const has = (p, expr) => p.evaluate((e) => window.__in.some((m) => eval(e)), expr);
  const HA = 'calicehunter1', HB = 'cbobhunter22', HA2 = 'calicesecond3';
  const roll = (p, hid, d1, d2, mod, mv, hm) => send(p, { t: 'roll', roll: { move: mv || 'A roll', d1, d2, mod: mod || 0, hid, mv: mv || '', hm: hm || 0 } });
  const card = (p, name, hid, night, pins) => send(p, { t: 'card', card: { name, playbook: 'The Mundane', hid, pins: pins || [] }, night });
  const nums = (k, hid, o) => Object.assign({ k, hid, harm: 0, peak: 0, hit: 0, luck: 0, left: 7, lvl: 0, unst: false, died: false }, o);
  const sess = async (p) => (await wait(p, "m.t === 'sess'")).s;

  const rk = await join('kay'), ra = await join('alice'), rb = await join('bob');
  let m = await wait(rk, "m.t === 'snap'");
  check('before anyone rolls there is no session, nothing found and nothing awarded', m.sess === null && Array.isArray(m.found) && m.found.length === 0 && Array.isArray(m.tallies) && m.tallies.length === 0, JSON.stringify([m.sess, m.found, m.tallies]));
  const idA = (await wait(ra, "m.t === 'snap'")).you.id, idB = (await wait(rb, "m.t === 'snap'")).you.id;

  // ---- a session begins by itself ----
  await clear(rk, ra, rb);
  await card(ra, 'Dee Ray', HA); await card(rb, 'Old Moss', HB);
  await roll(ra, HA, 1, 1, 0, 'kick');
  let s = await sess(rk);
  check('the first shared roll begins session 1, part 1, and everyone is told', s && s.n === 1 && s.part === 1 && s.live === true && s.rolls === 1 && s.hunters === 1 && s.parts.length === 1 && !!(await wait(rb, "m.t === 'sess' && m.s && m.s.rolls === 1")), JSON.stringify(s));
  await clear(rk);
  await send(ra, { t: 'roll', roll: { move: 'Old page', d1: 3, d2: 3, mod: 0 } });
  await wait(rk, "m.t === 'roll' && m.roll.move === 'Old page'");
  check('a roll that does not say which hunter made it is in the feed but not in the count', !(await has(rk, "m.t === 'sess'")));
  await roll(rb, HB, 4, 4, 1, 'inv'); await roll(ra, HA, 2, 1, 0, 'kick'); await roll(ra, HA, 1, 3, 0, 'act');
  s = await wait(rk, "m.t === 'sess' && m.s.rolls === 4");
  check('rolls and hunters are counted as they come', s && s.s.hunters === 2 && s.s.parts[0].rolls === 4, JSON.stringify(s && s.s));

  // ---- the hunters' own numbers ----
  await clear(ra);
  await card(ra, 'Dee Ray', HA, nums('1.1', HA, { harm: 4, peak: 4, hit: 3, left: 6, unst: true }));
  await card(rb, 'Old Moss', HB, nums('1.1', HB, { luck: 2, left: 4 }));
  await ra.waitForTimeout(300);
  check('numbers for the part in play are taken without comment', !(await has(ra, "m.t === 'sess'")));
  await card(ra, 'Dee Ray', HA, nums('9.9', HA, { harm: 50 }));
  check('numbers for some other part are not kept, and that page is told where the session is', !!(await wait(ra, "m.t === 'sess' && m.s.n === 1 && m.s.part === 1")));

  // ---- only the Keeper runs the session ----
  await clear(ra, rk, rb);
  for (const t of ['sess-name', 'sess-pause', 'sess-note', 'sess-preview', 'sess-end']) await send(ra, { t, name: 'Mine now', note: 'x', discard: true });
  await ra.waitForTimeout(400);
  check('a player who tries to name, pause, preview or end the session is refused every time', (await ra.evaluate(() => window.__in.filter(x => x.t === 'err' && x.why === 'Keeper only').length)) === 5);
  check('and nothing changed for anyone', !(await has(rk, "m.t === 'sess' || m.t === 'tally' || m.t === 'recap'")) && !(await has(rb, "m.t === 'sess' || m.t === 'tally' || m.t === 'recap'")));

  // ---- Luck spent on a roll ----
  await clear(rk, ra);
  await send(ra, { t: 'roll-luck', d1: 1, d2: 3 });
  m = await wait(rk, "m.t === 'roll-fix'");
  check('Luck spent on the last roll turns it into a 12 in everyone\'s feed', m && m.roll.total === 12 && m.roll.luck === true && m.roll.tier === 'full' && m.roll.id === idA, JSON.stringify(m));
  await clear(rk); await send(ra, { t: 'roll-luck', d1: 1, d2: 3 }); await send(rb, { t: 'roll-luck', d1: 6, d2: 6 }); await rk.waitForTimeout(300);
  check('it cannot be spent twice on one roll, or on dice that were not rolled', !(await has(rk, "m.t === 'roll-fix'")));

  // ---- the Keeper names it, then ends the episode: to be continued ----
  await clear(rk, ra, rb);
  await send(rk, { t: 'sess-name', name: '  The   Dry Well <b>' });
  s = await sess(ra);
  check('the Keeper names the session, and everyone sees the name as plain text', s.name === 'The Dry Well <b>', s.name);
  await clear(rk, ra, rb);
  await send(rk, { t: 'sess-pause', note: 'At the bottom of the well.\n\nMoss is holding the rope.' });
  const recap = await wait(rb, "m.t === 'recap'");
  s = (await wait(rb, "m.t === 'sess' && m.s.live === false")).s;
  check('ending the episode tells everyone "to be continued", with the Keeper\'s note and the night so far', recap && recap.r.n === 1 && recap.r.part === 1 && /bottom of the well/.test(recap.r.note) && recap.r.rows.length === 2 && recap.r.table.rolls === 4, JSON.stringify(recap && recap.r).slice(0, 300));
  const rowA = recap.r.rows.find(r => r.id === idA);
  check('the recap is a scoreboard: rolls by result, harm and Luck, the hunter and the player', rowA && rowA.name === 'Dee Ray' && rowA.rolls === 3 && rowA.miss === 3 && rowA.harm === 4 && rowA.who && recap.r.rows.find(r => r.id === idB).luck === 2, JSON.stringify(rowA));
  check('a recap hands out nothing', !('awards' in recap.r));
  check('the session is still open, waiting, with the part closed and its note kept', s.live === false && s.part === 1 && s.parts[0].closed > 0 && /holding the rope/.test(s.parts[0].note), JSON.stringify(s));
  await clear(rk); await send(rk, { t: 'sess-pause', note: 'again' });
  check('an episode cannot be ended twice', !!(await wait(rk, "m.t === 'err' && m.why === 'already paused'")));
  await clear(ra);
  await card(ra, 'Dee Ray', HA, nums('1.1', HA, { harm: 7 })); await ra.waitForTimeout(300);
  await send(rk, { t: 'sess-note', p: 1, note: 'At the bottom of the well. Moss has the rope.' });
  s = (await wait(ra, "m.t === 'sess' && /has the rope/.test(m.s.parts[0].note)")).s;
  check('the Keeper can reword where a finished part left off', !!s);
  await clear(rk); await send(rk, { t: 'sess-note', p: 5, note: 'x' });
  check('but not for a part that does not exist', !!(await wait(rk, "m.t === 'err' && m.why === 'no such part'")));

  // ---- next week: the next roll is part 2 of the same session ----
  await clear(rk, ra, rb);
  await roll(rb, HB, 5, 5, 0, 'kick');
  s = (await wait(ra, "m.t === 'sess' && m.s.part === 2")).s;
  check('the next roll carries the same session on as part 2', s.n === 1 && s.live === true && s.rolls === 5 && s.parts.length === 2 && s.parts[1].rolls === 1 && s.parts[0].rolls === 4, JSON.stringify(s));
  await card(ra, 'Dee Ray', HA, nums('1.2', HA, { harm: 1, peak: 5, hit: 1, left: 6 }));
  await roll(ra, HA, 6, 6, 1, 'kick', 5);
  await rk.waitForTimeout(GAP + 400);

  // ---- a quiet table begins a new part by itself ----
  await clear(rk);
  await roll(rb, HB, 4, 3, 0, 'read');
  s = (await wait(rk, "m.t === 'sess' && m.s.part === 3")).s;
  check('after a long quiet the next roll is a new part, with nobody pressing anything', s.n === 1 && s.parts.length === 3 && s.parts[1].closed > 0 && s.parts[2].rolls === 1 && s.live === true, JSON.stringify(s));
  check('the part that went quiet is closed at its last roll, not at the new one', s.parts[1].closed === s.parts[1].last && s.parts[2].started > s.parts[1].closed);
  await card(rb, 'Old Moss', HB, nums('1.3', HB, { harm: 2, peak: 2, hit: 2, left: 4 }));
  await roll(ra, HA2, 3, 3, 0, 'help');   // Alice has brought in a second hunter

  // ---- what ending it would hand out: for the Keeper only ----
  await clear(rk, ra);
  await send(rk, { t: 'sess-preview', upto: 2, picks: { carried: idB + '/' + HB, idea: 'nobody/here' } });
  m = await wait(rk, "m.t === 'sess-preview'");
  const pv = m && m.tally, aw = (t, id, hid) => t.awards.filter(a => a.id === id && (!hid || a.hid === hid)).map(a => a.b).sort();
  check('the Keeper is shown what parts 1 and 2 would award', m && m.upto === 2 && pv.table.rolls === 6 && pv.parts.length === 2 && pv.rows.length === 2, JSON.stringify(pv && pv.table));
  check('the count covers both nights: Dee\'s snake eyes and three misses in part 1, then a 13 on two sixes in part 2', ['snake', 'cold', 'weight', 'devil', 'boxcars', 'over', 'thirteen', 'comeback', 'first', 'last', 'bag', 'jaw'].every(x => aw(pv, idA).includes(x)) && !aw(pv, idA).includes('clutch') && !aw(pv, idB).includes('snake'), aw(pv, idA).join(','));
  check('harm adds up across the two parts, and the late change after the episode ended was not counted', pv.rows.find(r => r.id === idA).harm === 5 && pv.rows.find(r => r.id === idA).unst === false, JSON.stringify(pv.rows.find(r => r.id === idA)));
  check('the Keeper\'s pick is in the preview, and a pick for nobody is not', aw(pv, idB).includes('carried') && !pv.awards.some(a => a.b === 'idea'));
  check('a preview awards nothing and tells nobody else', !(await has(ra, "m.t === 'sess-preview' || m.t === 'tally'")) && pv.fresh.includes('thirteen'));
  await send(rk, { t: 'sess-preview', upto: 99 });
  m = await wait(rk, "m.t === 'sess-preview' && m.upto === 3");
  check('asking for more parts than there are means all of them', m && m.tally.parts.length === 3 && m.tally.rows.length === 3 && m.tally.table.rolls === 8, JSON.stringify(m && m.tally.table));

  // ---- the Keeper ends it: parts 1 and 2 are awarded, part 3 becomes the next session ----
  await clear(rk, ra, rb);
  await send(rk, { t: 'sess-end', upto: 2, picks: { carried: idB + '/' + HB } });
  const tl = await wait(rb, "m.t === 'tally'");
  const done = await wait(rk, "m.t === 'sess-done'");
  check('ending it sends the tally to everyone, and tells the Keeper it is done', tl && tl.tally.n === 1 && tl.tally.name === 'The Dry Well <b>' && tl.tally.at > 0 && done && done.awarded === true && done.n === 1 && !!(await wait(ra, "m.t === 'tally'")), JSON.stringify(done));
  check('the tally is what the preview showed', JSON.stringify(tl.tally.awards) === JSON.stringify(pv.awards) && tl.tally.table.rolls === 6);
  check('the secret that was found is now known to the table', tl.found.includes('thirteen') && tl.tally.fresh.includes('thirteen'));
  s = (await wait(ra, "m.t === 'sess' && m.s && m.s.n === 2")).s;
  check('the part left out is now session 2, part 1, still live, with its rolls', s.part === 1 && s.live === true && s.rolls === 2 && s.hunters === 2 && s.name === '' && s.parts.length === 1, JSON.stringify(s));
  await clear(rk); await send(ra, { t: 'sess-end' }); await send(ra, { t: 'tally-get', n: 1 });
  m = await wait(ra, "m.t === 'tally' && m.old === true");
  check('anyone can look at a finished tally again', m && m.tally.n === 1 && m.tally.awards.length === pv.awards.length);

  // ---- someone who was away catches up ----
  const rc = await join('alice');
  m = await wait(rc, "m.t === 'snap'");
  check('a page that connects later is told what its own hunters were awarded, and gets the newest tally whole', m.tallies.length === 1 && m.tallies[0].n === 1 && m.tallies[0].full && m.tallies[0].full.rows.length === 2 && m.tallies[0].mine.every(a => a.hid === HA) && m.tallies[0].mine.map(a => a.b).includes('snake') && m.found.includes('thirteen') && m.sess.n === 2, JSON.stringify(m.tallies[0].mine));
  const rd = await join('bob');
  m = await wait(rd, "m.t === 'snap'");
  check('and only its own: Bob is not told Dee\'s', m.tallies[0].mine.every(a => a.hid === HB) && m.tallies[0].mine.map(a => a.b).includes('carried') && !m.tallies[0].mine.map(a => a.b).includes('snake'));

  // ---- discarding: a practice night leaves nothing ----
  await clear(rk, ra, rb);
  await send(rk, { t: 'sess-end', discard: true });
  const gone = await wait(rk, "m.t === 'sess-done' && m.discarded === true");
  s = await wait(ra, "m.t === 'sess' && m.s === null");
  check('a discarded session awards nothing and is gone', gone && gone.awarded === false && !!s && !(await has(ra, "m.t === 'tally'")) && !(await has(rb, "m.t === 'tally'")));
  await clear(rk); await send(rk, { t: 'sess-end' });
  check('with no session there is nothing to end', !!(await wait(rk, "m.t === 'err' && m.why === 'no session'")));

  // ---- a session named ahead of time, and one with nobody in it ----
  await clear(rk, ra);
  await send(rk, { t: 'sess-name', name: 'Next week' });
  s = (await wait(ra, "m.t === 'sess' && m.s && m.s.name === 'Next week'")).s;
  check('the Keeper can name a session before anyone rolls', s.n === 3 && s.rolls === 0 && s.live === true);
  await rk.waitForTimeout(GAP + 300); await clear(ra);
  await roll(ra, HA, 4, 4, 0, 'kick');
  s = (await wait(ra, "m.t === 'sess' && m.s.rolls === 1")).s;
  check('its first roll is part 1 however long ago it was named', s.n === 3 && s.part === 1 && s.parts.length === 1 && s.parts[0].started === s.parts[0].last, JSON.stringify(s));
  await send(rk, { t: 'sess-end', discard: true }); await wait(rk, "m.t === 'sess-done'");
  await clear(rk, ra); await send(rk, { t: 'sess-name', name: 'Empty' }); await wait(rk, "m.t === 'sess' && m.s && m.s.name === 'Empty'");
  await clear(rk, ra); await send(rk, { t: 'sess-end' });
  m = await wait(rk, "m.t === 'sess-done'");
  check('ending a session nobody rolled in hands out nothing and sends no tally', m && m.awarded === false && !(await has(ra, "m.t === 'tally'")));

  // ---- a second finished session: the newest comes whole, the older by its awards ----
  await clear(rk, ra, rb);
  await roll(ra, HA, 5, 5, 0, 'kick'); await roll(rb, HB, 1, 2, 0, 'kick'); await send(rk, { t: 'sess-end' });
  m = await wait(ra, "m.t === 'tally' && !m.old");
  const re = await join('alice'); m = await wait(re, "m.t === 'snap'");
  check('two finished sessions: both listed newest first, only the newest whole', m.tallies.length === 2 && m.tallies[0].n > m.tallies[1].n && !!m.tallies[0].full && m.tallies[1].full === null && m.tallies[1].mine.length > 0, JSON.stringify(m.tallies.map(t => [t.n, !!t.full, t.mine.length])));

  console.log(results.map(r=>r.join(' | ')).join('\n'));
  const fails = results.filter(r=>r[0]==='FAIL').length;
  console.log('\nTOTAL', results.length, 'FAIL', fails); console.log('ERRORS', errs);
  await b.close(); stopServer();
  if (fails || errs.length) process.exit(1);
})().catch(e=>{ console.log(results.map(r=>r.join(' | ')).join('\n')); console.log('CRASH', e.message.split('\n').slice(0,6).join('\n')); console.log('ERRORS', errs); stopServer(); process.exit(1); });
