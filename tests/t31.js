// A whole session, played through: the Keeper and three players in their own browsers against the real Worker (`wrangler dev`), one of them on a phone.
// "The Dry Well" takes two nights. Night one ends "to be continued"; night two picks it up, a hunter dies and is replaced, and the Keeper ends the session
// and hands out the awards. Then a practice session is thrown away, and a third session shows a badge counting up.
// Every step is checked, screenshots go to tests/out/night-*.png, and the tally is printed at the end as a player would paste it into chat.
require('fs').mkdirSync(require('path').join(__dirname,'out'),{recursive:true});
const { chromium } = require('playwright');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), WR = path.join(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js'), OUT = path.join(__dirname, 'out');
const PORT = 8799, B = 'http://127.0.0.1:' + PORT;
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

const hunter = (name, playbook, stats) => ({ share: true, hv: 'sheet', start: { hide: true, rolled: true }, settings: { fx: true, theme: 'dark', sound: false, tname: name.split(' ')[0] + "'s player" }, sheet: { name, playbook, luck: 7, harm: 0, xp: 0, stats } });
const DEE = hunter('Dee Ray', 'The Mundane', { charm: 2, cool: 1, sharp: 0, tough: 1, weird: -1 });
const MOSS = hunter('Old Moss', 'The Expert', { charm: 0, cool: 1, sharp: 2, tough: -1, weird: 1 });
const VALE = hunter('Sister Vale', 'The Divine', { charm: 1, cool: 1, sharp: -1, tough: 2, weird: 0 });

(async () => {
  spawnSync(process.execPath, [path.join(ROOT, 'tools', 'build.js')], { cwd: ROOT });   // the Worker serves dist/, so make sure it is the current page
  startServer(); await ready();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const watch = (p, who) => { p.on('pageerror', e => errs.push('PAGEERR(' + who + ') ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE(' + who + ') ' + m.text()); }); };
  const open = async (as, journal, viewport, opts) => {
    const ctx = await b.newContext(Object.assign({ viewport: viewport || { width: 1200, height: 900 }, colorScheme: 'dark' }, opts));
    await ctx.addInitScript(() => {
      window.__dice = [];
      const real = crypto.getRandomValues.bind(crypto);
      crypto.getRandomValues = function (a) { if (a instanceof Uint8Array && a.length === 1 && window.__dice.length) { a[0] = window.__dice.shift() - 1; return a; } return real(a); };
    });
    await ctx.addInitScript((j) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hunters-journal-v1', j); sessionStorage.setItem('seeded', '1'); } }, JSON.stringify(journal || {}));
    const p = await ctx.newPage(); watch(p, as);
    await p.goto(B + '/?as=' + as + '#play');
    await p.waitForFunction(() => window.__journal && window.__journal.tbl().state === 'live', null, { timeout: 8000 });
    return p;
  };
  const T = async (p, sel) => ((await p.textContent(sel)) || '').replace(/\s+/g, ' ').trim();
  const until = async (p, fn, arg, ms = 5000) => { try { await p.waitForFunction(fn, arg, { timeout: ms }); return true; } catch (e) { return false; } };
  const J = (p) => p.evaluate(() => { const j = window.__journal, s = j.S(), x = j.sess(); return { sess: x.sess, tallies: x.tallies.map(t => ({ n: t.n, mine: t.mine.map(a => a.b), full: !!t.full })), found: x.found, night: x.night, dlg: { kind: x.dlg.kind, step: x.dlg.step, n: x.dlg.order.length, open: document.getElementById('sessdlg').open }, badges: s.sheet.badges, pins: s.sheet.pins, career: s.sheet.career, hid: s.sheet.hid, tal: s.sheet.tal, luck: s.sheet.luck, harm: s.sheet.harm, bench: s.bench.map(e => ({ name: e.sheet.name, badges: Object.keys(e.sheet.badges), ended: e.ended && e.ended.how })), tseen: s.tseen, prev: s.prev }; });
  const shot = (p, name) => p.screenshot({ path: path.join(OUT, 'night-' + name + '.png') });
  const noScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  const tab = async (p, t) => { await p.evaluate((t) => { location.hash = '#' + t; }, t); await p.waitForTimeout(150); };
  let K, expected = 0;
  // one roll, through the page's own controls: pick the move on Play, the dice are the ones given, and wait for the table to have counted it
  const roll = async (p, move, d1, d2) => {
    await tab(p, 'play');
    await p.click('#play-moves [data-pmove="' + move + '"]');
    await p.evaluate(([x, y]) => { window.__dice.push(x, y); }, [d1, d2]);
    await p.click('#roll');
    await p.waitForFunction(() => !document.querySelector('#roll').disabled && !!document.querySelector('#copyroll'), null, { timeout: 8000 });
    expected++;
    await until(K, (n) => { const s = window.__journal.sess().sess; return !!s && s.rolls >= n; }, expected);
  };
  const harm = async (p, to) => { await tab(p, 'hunter'); await p.click('#harm button:nth-child(' + to + ')'); await p.waitForTimeout(120); };
  const sent = async (p) => { await p.evaluate(() => window.__journal.scheduleSave()); await p.waitForTimeout(900); };   // let the page save and send its card
  const closeDlg = async (p) => { if (await p.evaluate(() => document.getElementById('sessdlg').open)) await p.click('#sessdlg [data-ss="close"]'); };

  /* ================= before the game ================= */
  K = await open('kay', { settings: { fx: true, theme: 'dark', tname: 'Kay' } });
  const A = await open('alice', DEE), Bo = await open('bob', MOSS, { width: 390, height: 800 }), C = await open('carol', VALE);
  await until(K, () => window.__journal.tbl().members.filter(x => x.card).length === 3);
  await tab(K, 'party'); await K.click('[data-pv="desk"]');
  let txt = await T(K, '#ksess');
  check('the Keeper\'s desk has a session card, and says none is running', /No session is running/.test(txt) && /begins by itself at the first roll/.test(txt), txt.slice(0, 160));
  await K.click('#ksess [data-ss="name"]'); await K.fill('#ss-name', 'The Dry Well'); await K.click('#ksess [data-ss="name-save"]');
  check('the Keeper names the session before anyone rolls', await until(K, () => /The Dry Well/.test(document.querySelector('#ksess').textContent) && /Being played/.test(document.querySelector('#ksess').textContent)));
  check('a player has no session controls at all', await (async () => { await tab(A, 'party'); return (await A.locator('#ksess').count()) === 0 && (await A.locator('[data-ss="pause"], [data-ss="end"]').count()) === 0; })());
  let j = await J(A);
  check('every hunter has an id of its own, and the page is counting for session 1, part 1', /^[a-z0-9]{6,20}$/.test(j.hid) && j.sess && j.sess.n === 1 && j.night && j.night.k === '1.1' && j.night.hid === j.hid, JSON.stringify(j.night));
  check('before any session has ended, the badge card says 0 of 63 and nothing is pinned', await (async () => { await tab(A, 'hunter'); const t = await T(A, '#badgecard'); return /0 of 63/.test(t) && /0 of 5 pinned/.test(t) && (await A.locator('#badgecard .bgrid button').count()) === 63; })());
  check('secrets nobody has found show as question marks', await A.evaluate(() => [...document.querySelectorAll('#badgecard .bgrid button')].filter(x => /\?\?\?/.test(x.textContent)).length) === 10);

  /* ================= night one ================= */
  await roll(A, 'kick', 1, 1);    // Dee: snake eyes
  await roll(Bo, 'inv', 6, 4);    // Moss: 12 with his +2
  await roll(C, 'prot', 3, 4);
  await roll(A, 'act', 2, 2);
  await roll(Bo, 'read', 5, 5);
  await roll(C, 'prot', 4, 4);
  await roll(A, 'inv', 1, 3);     // Dee: three misses running
  await tab(A, 'play');
  check('after a miss the player can spend Luck on it', await A.isVisible('#spendluck'));
  await A.click('#spendluck');
  check('Luck spent on the roll shows as a 12 in everyone\'s feed', await until(Bo, () => { const r = window.__journal.tbl().rolls[0]; return r && r.luck === true && r.total === 12 && r.d1 === 1 && r.d2 === 3; }));
  await roll(Bo, 'inv', 4, 6);    // Moss: three 10+ in a row
  await roll(C, 'kick', 6, 6);    // Vale: boxcars
  await roll(C, 'help', 2, 5);
  await harm(A, 3);               // Dee takes 3 harm in one hit
  await harm(C, 2);
  await sent(A); await sent(C); await sent(Bo);
  await tab(K, 'party');
  txt = await T(K, '#ksess');
  check('the Keeper sees the night being counted: 3 hunters, 10 rolls', /3 hunters, 10 rolls/.test(txt) && /Being played/.test(txt), txt.slice(0, 200));
  await shot(K, '01-desk-live');

  // ---- the Keeper ends the episode: to be continued ----
  await K.click('#ksess [data-ss="pause"]');
  await K.fill('#ss-note', 'At the bottom of the well. The rope is fraying,\nand something below is counting.');
  await shot(K, '02-desk-ending-episode');
  await K.click('#ksess [data-ss="pause-go"]');
  check('everyone gets the "To be continued" screen at once', await until(A, () => document.getElementById('sessdlg').open) && await until(Bo, () => document.getElementById('sessdlg').open) && await until(C, () => document.getElementById('sessdlg').open) && await until(K, () => document.getElementById('sessdlg').open));
  txt = await T(A, '#sessdlg');
  check('it names the session and the part, and carries the Keeper\'s note', /To be continued/.test(txt) && /The Dry Well, part 1/.test(txt) && /something below is counting/.test(txt), txt.slice(0, 200));
  check('the note keeps its line break', (await A.evaluate(() => getComputedStyle(document.querySelector('#sessdlg .prevnote .hobody')).whiteSpace)) === 'pre-wrap');
  const rowsOf = (p) => p.evaluate(() => [...document.querySelectorAll('#sessdlg .sboard tbody tr')].map(tr => [...tr.cells].map(c => c.textContent.replace(/\s+/g, ' ').trim())));
  let rows = await rowsOf(A);
  const rowOf = (rs, who) => rs.find(r => r[0].indexOf(who) === 0) || [];
  check('the scoreboard so far: Dee 3 rolls, all misses, 3 harm, 1 Luck', JSON.stringify(rowOf(rows, 'Dee Ray').slice(1)) === '["3","0","0","3","3","1","5","3"]', JSON.stringify(rowOf(rows, 'Dee Ray')));
  check('Moss 3 rolls, all 10+, no harm; Vale 4 rolls with a 14 and 2 harm', JSON.stringify(rowOf(rows, 'Old Moss').slice(1)) === '["3","3","0","0","0","0","12","12"]' && JSON.stringify(rowOf(rows, 'Sister Vale').slice(1)) === '["4","2","2","0","2","0","14","8"]', JSON.stringify([rowOf(rows, 'Old Moss'), rowOf(rows, 'Sister Vale')]));
  check('each row says who is playing the hunter, and my own row is marked', /The Mundane/.test(rowOf(rows, 'Dee Ray')[0]) && /Dee's player/.test(rowOf(rows, 'Dee Ray')[0]) && (await A.locator('#sessdlg .sboard tr.me').count()) === 1);
  check('no badges are handed out yet, and it says so', /Badges are handed out when the Keeper ends the whole session/.test(txt) && (await A.locator('#sessdlg .award').count()) === 0);
  check('phone: the screen fits, and the scoreboard is cards, not a wide table', await noScroll(Bo) && (await Bo.evaluate(() => getComputedStyle(document.querySelector('#sessdlg .sboard thead')).display)) === 'none');
  await shot(A, '03-to-be-continued'); await shot(Bo, '04-to-be-continued-phone');
  check('the Keeper sees the same screen, without a "Finish my night" button', (await K.locator('#sessdlg [data-ss="ritual-cont"]').count()) === 0 && (await A.locator('#sessdlg [data-ss="ritual-cont"]').count()) === 1);
  await closeDlg(K);
  txt = await T(K, '#ksess');
  check('the desk now says "To be continued", shows the note, and says the next roll picks it up', /To be continued/.test(txt) && /something below is counting/.test(txt) && /carries on as part 2 at the next roll/.test(txt) && (await K.locator('#ksess [data-ss="pause"]').count()) === 0, txt.slice(0, 260));
  await shot(K, '05-desk-to-be-continued');

  // ---- a player finishes their night from that screen ----
  await A.click('#sessdlg [data-ss="ritual-cont"]');
  check('"Finish my night" opens the end-of-session steps on Play, with clean-up left off because the story is not over', await A.isVisible('#rit-h') && !(await A.isChecked('#rit-clear')) && !(await A.evaluate(() => document.getElementById('sessdlg').open)));
  await A.click('[data-rit="finish"]'); await A.click('[data-rit="close"]');
  await closeDlg(Bo); await closeDlg(C);
  j = await J(A);
  check('between parts the page is not counting for any part', j.sess.live === false && j.night === null, JSON.stringify(j.sess));
  // something that happens after the episode ended is not part of it
  await harm(Bo, 1); await sent(Bo); await harm(Bo, 1); await sent(Bo);   // and taken back: the same pip again

  /* ================= night two ================= */
  await tab(Bo, 'play');
  txt = await T(Bo, '#play-prev');
  check('next time, Play opens with "Previously" and the Keeper\'s note', /Previously/.test(txt) && /The Dry Well, part 1/.test(txt) && /rope is fraying/.test(txt), txt);
  await Bo.evaluate(() => window.scrollTo(0, 0)); await shot(Bo, '06-previously-phone');
  await Bo.click('#play-prev [data-ss="prev-ok"]');
  check('"Got it" puts it away for good', (await T(Bo, '#play-prev')) === '' && (await J(Bo)).prev === '1.1');
  await roll(A, 'kick', 5, 5);    // Dee: a 10+ straight after her misses
  j = await J(K);
  check('the first roll of the night carries the same session on as part 2', j.sess.n === 1 && j.sess.part === 2 && j.sess.live === true && j.sess.parts.length === 2 && j.sess.parts[0].rolls === 10 && j.sess.parts[1].rolls === 1, JSON.stringify(j.sess));
  check('and every page starts counting afresh for the new part', (await J(A)).night.k === '1.2' && (await J(C)).night.k === '1.2');
  await roll(A, 'magic', 6, 6);   // Dee: boxcars on her -1
  await roll(A, 'kick', 6, 2);    // and a six straight after
  await roll(Bo, 'manip', 3, 4); await roll(Bo, 'manip', 2, 5); await roll(Bo, 'help', 2, 4);   // Moss: seven, three times
  await roll(C, 'kick', 3, 3);
  await harm(A, 7);               // Dee is at death's door
  await harm(C, 8);               // Vale is dead
  await sent(C);
  await tab(C, 'hunter');
  await C.click('#hbar [data-hn="retire"]'); await C.selectOption('#hn-how', 'died'); await C.fill('#hn-note', 'Pulled into the well.'); await C.click('#hbar [data-hn="retire-go"]');
  await C.evaluate(() => { const s = window.__journal.S(); s.sheet.name = 'Brother Ash'; s.sheet.playbook = 'The Mundane'; s.hv = 'sheet'; window.__journal.scheduleSave(); });
  await C.waitForTimeout(900);
  await roll(C, 'act', 4, 4);     // her replacement's first roll
  await sent(A); await sent(Bo); await sent(C);
  j = await J(C);
  check('the player whose hunter died has a new hunter in play and the dead one on the shelf', j.bench.length === 1 && j.bench[0].name === 'Sister Vale' && j.bench[0].ended === 'died' && j.night.hid === j.hid, JSON.stringify(j.bench));

  // ---- the Keeper ends the session ----
  await tab(K, 'party');
  txt = await T(K, '#ksess');
  check('the desk counts both nights: 4 hunters, 18 rolls over 2 parts', /4 hunters, 18 rolls over 2 parts/.test(txt), txt.slice(0, 220));
  await K.click('#ksess [data-ss="end"]');
  check('ending it first shows the Keeper what would be handed out', await until(K, () => !!document.querySelector('#ksess .sboard') && document.querySelectorAll('#ksess .award').length > 10));
  txt = await T(K, '#ksess');
  check('with a choice of which parts are this session, and a note that only the Keeper can see it', (await K.locator('#ss-upto option').count()) === 2 && /Only you can see this/.test(txt) && (await K.inputValue('#ss-upto')) === '2');
  check('nobody else has been shown anything', !(await A.evaluate(() => document.getElementById('sessdlg').open)) && !(await Bo.evaluate(() => document.getElementById('sessdlg').open)));
  const pickOf = (name) => K.evaluate((n) => { const o = [...document.querySelectorAll('#ss-pick-carried option')].find(x => x.textContent === n); return o ? o.value : ''; }, name);
  await K.selectOption('#ss-pick-carried', await pickOf('Old Moss'));
  await until(K, () => [...document.querySelectorAll('#ksess .award')].some(x => /Carried the Night/.test(x.textContent)));
  await K.selectOption('#ss-pick-idea', await pickOf('Dee Ray'));
  check('the Keeper\'s picks join the list as they are chosen', await until(K, () => { const a = [...document.querySelectorAll('#ksess .award')].map(x => x.textContent); return a.some(x => /Carried the Night/.test(x) && /Old Moss/.test(x)) && a.some(x => /Worst Idea of the Night/.test(x) && /Dee Ray/.test(x)); }));
  await K.evaluate(() => document.querySelector('#ksess').scrollIntoView({ block: 'start' }));
  await shot(K, '07-desk-preview');
  await K.screenshot({ path: path.join(OUT, 'night-08-desk-preview-full.png'), fullPage: true });
  await K.click('#ksess [data-ss="end-ask"]');
  check('handing them out asks once more, and says it cannot be taken back', /cannot be taken back/.test(await T(K, '#ksess .confirm')));
  await K.click('#ksess [data-ss="end-yes"]');

  // ---- the tally, on every screen ----
  check('the tally opens on every screen at once', await until(A, () => document.getElementById('sessdlg').open) && await until(Bo, () => document.getElementById('sessdlg').open) && await until(C, () => document.getElementById('sessdlg').open) && await until(K, () => document.getElementById('sessdlg').open));
  j = await J(A);
  check('it starts by reading the awards out one at a time', j.dlg.kind === 'tally' && j.dlg.step === 0 && j.dlg.n > 15 && /The awards/.test(await T(A, '#sessdlg .sub')) && (await A.locator('#sessdlg .reveal .bdg.b-lg').count()) === 1, JSON.stringify(j.dlg));
  check('the token lands with a stamp', (await A.evaluate(() => getComputedStyle(document.querySelector('#sessdlg .reveal .bdg')).animationName)) === 'bdgstamp');
  await shot(A, '09-reveal');
  const first = await T(A, '#sessdlg .reveal h3');
  await A.click('#sessdlg [data-ss="next"]');
  check('Next moves on to the next award', (await J(A)).dlg.step === 1 && (await T(A, '#sessdlg .reveal h3')) !== first);
  check('left alone, it moves on by itself', await until(Bo, () => window.__journal.sess().dlg.step >= 1, null, 4000));
  await A.click('#sessdlg [data-ss="skip"]'); await Bo.click('#sessdlg [data-ss="skip"]'); await C.click('#sessdlg [data-ss="skip"]'); await K.click('#sessdlg [data-ss="skip"]');
  txt = await T(A, '#sessdlg');
  check('Skip goes straight to the end: the scoreboard, the awards, and your haul', /Session over/.test(txt) && /The scoreboard/.test(txt) && /The awards/.test(txt) && /Your haul/.test(txt) && /2 parts/.test(txt) && /18 rolls/.test(txt) && /4 hunters/.test(txt), txt.slice(0, 200));
  rows = await rowsOf(A);
  check('the scoreboard covers both nights: Dee 6 rolls, 7 harm, 1 Luck; a dead hunter is marked', JSON.stringify(rowOf(rows, 'Dee Ray').slice(1)) === '["6","2","1","3","7","1","11","3"]' && /Died/.test(rowOf(rows, 'Sister Vale')[0]) && rowOf(rows, 'Brother Ash')[1] === '1', JSON.stringify(rows.map(r => r.slice(0, 6))));
  check('a hunter who died is counted once: Vale took 2 the first night and 6 the second, 8 in all', rowOf(rows, 'Sister Vale')[5] === '8', rowOf(rows, 'Sister Vale').join(' | '));
  const awardsOf = (p, who) => p.evaluate((w) => [...document.querySelectorAll('#sessdlg h3')].find(h => h.textContent === 'The awards').nextElementSibling.querySelectorAll('.award').length && [...[...document.querySelectorAll('#sessdlg h3')].find(h => h.textContent === 'The awards').nextElementSibling.querySelectorAll('.award')].filter(a => a.querySelector('.who').textContent.indexOf(w) === 0).map(a => a.querySelector('b').textContent).sort(), who);
  const dee = await awardsOf(A, 'Dee Ray'), moss = await awardsOf(A, 'Old Moss'), vale = await awardsOf(A, 'Sister Vale'), ash = await awardsOf(A, 'Brother Ash');
  const want = (got, list) => list.every(x => got.includes(x));
  check('Dee: snake eyes, a cold streak, Luck spent, a comeback, boxcars on a minus, the number of the beast, death\'s door, a glass jaw', want(dee, ['Snake Eyes', 'Cold Streak', 'Lucky Devil', 'Comeback', 'Boxcars', 'Underdog', 'Number of the Beast', "Death's Door", 'Glass Jaw', 'Worst Idea of the Night']), dee.join(', '));
  check('Dee: the superlatives she won (most misses, the first roll, the lowest roll) and nothing she did not earn', want(dee, ['Dead Weight', 'Opening Act', 'Rock Bottom', 'Walking Wounded']) && !dee.includes('Punching Bag') && !dee.includes('Clean Sheet') && !dee.includes('Buried in the Dry') && !dee.includes('Carried the Night'), dee.join(', '));
  check('Dee also found a secret nobody planned: four natural doubles over the two nights', dee.includes('Twins'));
  check('Moss: a hot hand, an overachiever, lucky sevens, the most 10+, and the Keeper\'s pick', want(moss, ['Hot Hand', 'Overachiever', 'Lucky Seven', 'Golden Arm', 'Carried the Night', 'Not a Scratch', 'Clean Sheet']), moss.join(', '));
  check('Vale: boxcars, buried, dust to dust for dying with Luck in the bank, and the most harm of anyone (8 to Dee\'s 7)', want(vale, ['Boxcars', 'Buried in the Dry', 'Dust to Dust', 'Human Shield', 'Punching Bag', 'Peak']) && !vale.includes("Death's Door"), vale.join(', '));
  check('a tie is shared: Moss and Vale both had three mixed successes', moss.includes('Mixed Blessing') && vale.includes('Mixed Blessing'));
  check('her replacement gets only what he did: the last roll of the session', ash.join() === 'Last Word', ash.join(', '));
  check('the three secrets found tonight are flagged as found', (await A.locator('#sessdlg .award .chip.ok').count()) === 3);
  await A.evaluate(() => document.querySelector('#sessdlg').scrollTo(0, 0));
  await shot(A, '10-tally'); await shot(Bo, '11-tally-phone');
  check('phone: the tally fits', await noScroll(Bo));

  // ---- your haul, and pinning ----
  j = await J(A);
  check('the badges are on the hunter now, once each, with the milestones a first session brings', want(Object.keys(j.badges), ['snake', 'cold', 'devil', 'comeback', 'boxcars', 'underdog', 'beast', 'twins', 'door', 'jaw', 'wounded', 'weight', 'bottom', 'first', 'idea', 'meat', 'alive']) && Object.values(j.badges).every(x => x.n === 1) && j.tal.join() === '1', Object.keys(j.badges).join(','));
  check('and her career has begun: 1 session, 6 rolls, 3 misses, 7 harm', JSON.stringify(j.career) === '{"sessions":1,"rolls":6,"misses":3,"harm":7,"lvls":0}', JSON.stringify(j.career));
  check('the haul lists them, milestones included', (await A.locator('#sessdlg [data-ss-pin]').count()) === Object.keys(j.badges).length);
  await A.click('#sessdlg [data-ss-pin="snake"]'); await A.click('#sessdlg [data-ss-pin="beast"]');
  check('a badge is pinned from the haul', (await J(A)).pins.join() === 'snake,beast' && /Pinned/.test(await T(A, '#sessdlg [data-ss-pin="snake"]')));
  await A.evaluate(() => document.querySelector('#sessdlg [data-ss-pin="snake"]').scrollIntoView({ block: 'center' }));
  await shot(A, '12-haul');
  j = await J(C);
  check('the dead hunter keeps her badges on the shelf, and the new one has his own', want(j.bench[0].badges, ['boxcars', 'buried', 'dust', 'shield', 'meat']) && !j.bench[0].badges.includes('alive') && want(Object.keys(j.badges), ['last', 'meat', 'alive']) && !Object.keys(j.badges).includes('buried'), JSON.stringify([j.bench[0].badges, Object.keys(j.badges)]));
  check('the Keeper has no hunter and no haul', !/Your haul/.test(await T(K, '#sessdlg')) && (await K.locator('#sessdlg [data-ss="ritual"]').count()) === 0);
  // copy for chat
  await A.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await A.click('#sessdlg [data-ss="copy"]');
  await until(A, () => /Copied/.test(document.querySelector('#sessdlg-msg').textContent));
  const chat = await A.evaluate(() => navigator.clipboard.readText());
  check('Copy for chat gives the whole tally as plain lines', /^The Dry Well: session over\. 18 rolls/.test(chat) && /Dee Ray: 6 rolls/.test(chat) && /- Snake Eyes: Dee Ray\. Two ones\./.test(chat) && !/</.test(chat), chat.slice(0, 120));
  await closeDlg(A); await closeDlg(Bo); await closeDlg(C); await closeDlg(K);

  // ---- after the session ----
  check('the desk says the awards are out, and no session is running', /The awards are out/.test(await T(K, '#kmsg')) && /No session is running/.test(await T(K, '#ksess')));
  await tab(A, 'party');
  check('everyone can see Dee\'s pinned badges on her card', await until(Bo, () => { const c = [...document.querySelectorAll('.pcard')].find(x => /Dee Ray/.test(x.textContent)); return !!c && c.querySelectorAll('.pins .bdg').length === 2; }) || await (async () => { await tab(Bo, 'party'); return until(Bo, () => { const c = [...document.querySelectorAll('.pcard')].find(x => /Dee Ray/.test(x.textContent)); return !!c && c.querySelectorAll('.pins .bdg').length === 2; }); })());
  await tab(Bo, 'party'); await Bo.evaluate(() => { const c = [...document.querySelectorAll('.pcard')].find(x => /Dee Ray/.test(x.textContent)); if (c) c.scrollIntoView({ block: 'center' }); });
  await shot(Bo, '13-pinned-on-card-phone');
  check('a pinned badge on a card says what it is', (await Bo.evaluate(() => { const c = [...document.querySelectorAll('.pcard')].find(x => /Dee Ray/.test(x.textContent)); return c ? [...c.querySelectorAll('.pins .bdg')].map(x => x.getAttribute('aria-label')).join('|') : ''; })) === 'Snake Eyes|Number of the Beast');
  check('the Party tab offers the last session again', /Last session: The Dry Well/.test(await T(A, '#partybody')));
  await A.click('#partybody [data-ss="last"]');
  check('reopened, it goes straight to the end with no reading out', (await J(A)).dlg.step === (await J(A)).dlg.n && /Session over/.test(await T(A, '#sessdlg')));
  await closeDlg(A);
  await tab(A, 'hunter');
  txt = await T(A, '#badgecard');
  check('My sheet: the collection counts what was earned and what is pinned', new RegExp(Object.keys((await J(A)).badges).length + ' of 63').test(txt) && /2 of 5 pinned/.test(txt), txt.slice(0, 120));
  check('the three secrets found tonight now show their names to everyone, and the other seven are still hidden', await (async () => { await tab(Bo, 'hunter'); const t = await Bo.evaluate(() => [...document.querySelectorAll('#badgecard .bgrid button')].map(x => x.textContent)); return t.filter(x => /\?\?\?/.test(x)).length === 7 && t.some(x => /Number of the Beast/.test(x)) && t.some(x => /Dust to Dust/.test(x)) && t.some(x => /Twins/.test(x)); })());
  await A.click('#badgecard [data-bdg="beast"]');
  txt = await T(A, '#bdetail');
  check('tapping a badge shows how it was earned, its line, and when', /Number of the Beast/.test(txt) && /A 6 and a 6, then a 6 on your very next roll/.test(txt) && /Three sixes/.test(txt) && /Earned once/.test(txt) && /Rank 1 of 4/.test(txt) && /Pinned\. Unpin/.test(txt), txt);
  await A.click('#badgecard [data-bdg="hot"]');
  check('one not earned says how to earn it, without its line', /Roll 10 or more three times in a row/.test(await T(A, '#bdetail')) && /Not earned yet/.test(await T(A, '#bdetail')) && !/Somebody check those dice/.test(await T(A, '#bdetail')));
  await A.click('#badgecard [data-bdg="perfect"]');
  check('a secret nobody has found gives nothing away', /A secret/.test(await T(A, '#bdetail')) && !/Perfect Night/.test(await T(A, '#bdetail')) && !/12 or more times/.test(await T(A, '#bdetail')));
  for (const id of ['cold', 'devil', 'comeback']) { await A.click('#badgecard [data-bdg="' + id + '"]'); await A.click('#badgecard [data-bdg-pin="' + id + '"]'); }
  await A.click('#badgecard [data-bdg="door"]'); await A.click('#badgecard [data-bdg-pin="door"]');
  check('five pins at most: the sixth is refused, and says why', (await J(A)).pins.length === 5 && /Five are pinned already/.test(await T(A, '#bdg-msg')), (await J(A)).pins.join());
  await A.evaluate(() => document.querySelector('#badgecard').scrollIntoView({ block: 'start' }));
  await shot(A, '14-badges-on-my-sheet');
  await tab(Bo, 'hunter'); await Bo.evaluate(() => document.querySelector('#badgecard').scrollIntoView({ block: 'start' }));
  await shot(Bo, '15-badges-phone');
  check('phone: the badge card fits', await noScroll(Bo));

  // ---- it survives a reload, and is not handed out twice ----
  const before = JSON.stringify((await J(A)).badges);
  await sent(A); await A.reload(); await A.waitForFunction(() => window.__journal && window.__journal.tbl().state === 'live', null, { timeout: 8000 }); await A.waitForTimeout(500);
  j = await J(A);
  check('after a reload the badges, pins and career are as they were: nothing is handed out twice', JSON.stringify(j.badges) === before && j.pins.length === 5 && j.career.sessions === 1 && j.tallies.length === 1 && j.tallies[0].full, JSON.stringify(j.career));

  // ---- someone who was not there ----
  const D = await open('dave', hunter('Late Dave', 'The Crooked', { charm: 1, cool: 1, sharp: 1, tough: 0, weird: 0 }));
  await tab(D, 'party');
  check('a player who missed it finds a dot on the Party tab and the last session marked new', (await D.evaluate(() => document.getElementById('t-party').classList.contains('hasdot'))) && /Last session: The Dry Well/.test(await T(D, '#partybody')) && /New/.test(await T(D, '#partybody [data-ss="last"]')));
  await D.click('#partybody [data-ss="last"]');
  check('they can read the tally, have no haul, and the dot clears', /Session over/.test(await T(D, '#sessdlg')) && !/Your haul/.test(await T(D, '#sessdlg')) && Object.keys((await J(D)).badges).length === 0 && !(await D.evaluate(() => document.getElementById('t-party').classList.contains('hasdot'))));
  await closeDlg(D); await D.context().close();

  /* ================= a practice session, thrown away ================= */
  expected = 0;
  await roll(A, 'kick', 1, 1); await roll(Bo, 'kick', 4, 4);
  await tab(K, 'party');
  check('a new session began by itself at the next roll: session 2', /Session 2/.test(await T(K, '#ksess')) && /2 hunters, 2 rolls/.test(await T(K, '#ksess')));
  await K.click('#ksess [data-ss="end"]'); await until(K, () => !!document.querySelector('#ksess [data-ss="discard-ask"]'));
  await K.click('#ksess [data-ss="discard-ask"]');
  check('discarding asks first, and says nobody gets anything', /Nobody gets anything/.test(await T(K, '#ksess .confirm')));
  await K.click('#ksess [data-ss="discard-yes"]');
  check('the desk says it was discarded', await until(K, () => /Session discarded/.test((document.querySelector('#kmsg') || {}).textContent || '')));
  await A.waitForTimeout(600);
  j = await J(A);
  check('nobody is shown a tally, and nobody\'s badges or career moved', !j.dlg.open && j.badges.snake.n === 1 && j.career.sessions === 1 && j.tallies.length === 1 && j.sess === null, JSON.stringify([j.dlg, j.career]));

  /* ================= a third session: a badge counts up ================= */
  expected = 0;
  await roll(A, 'kick', 1, 1); await roll(Bo, 'kick', 5, 5);
  await sent(A); await sent(Bo);
  await tab(K, 'party'); await K.click('#ksess [data-ss="end"]'); await until(K, () => !!document.querySelector('#ksess [data-ss="end-ask"]'));
  check('with one part there is no question of which parts', (await K.locator('#ss-upto').count()) === 0);
  await K.click('#ksess [data-ss="end-ask"]'); await K.click('#ksess [data-ss="end-yes"]');
  await until(A, () => document.getElementById('sessdlg').open);
  await A.click('#sessdlg [data-ss="skip"]');
  j = await J(A);
  check('Snake Eyes earned again counts up to x2; the first-session milestone does not repeat, and surviving does', j.badges.snake.n === 2 && j.badges.meat.n === 1 && j.badges.alive.n === 2 && j.career.sessions === 2 && j.career.rolls === 7 && j.tal.join() === '1,3', JSON.stringify([j.badges.snake, j.badges.meat, j.badges.alive, j.career, j.tal]));
  check('the haul shows the count', /x2/.test(await A.evaluate(() => { const b = document.querySelector('#sessdlg [data-ss-pin="snake"]'); return b ? b.closest('.award').querySelector('.bdg').textContent : ''; })));
  check('earlier sessions can be picked from the tally', (await A.locator('#sess-old option').count()) === 2);
  await A.selectOption('#sess-old', '1');
  check('and looked at again', await until(A, () => /The Dry Well/.test(document.querySelector('#sessdlg-h').textContent) && /18 rolls/.test(document.querySelector('#sessdlg .sub').textContent)));
  await closeDlg(A); await closeDlg(Bo); await closeDlg(C); await closeDlg(K);

  /* ================= the tally as plain reading, for anyone who has motion or big moments switched off ================= */
  const Q = await open('carol', null, null, { reducedMotion: 'reduce' });   // Carol again, on another device that asks for less motion
  await tab(Q, 'party'); await Q.click('#partybody [data-ss="last"]');
  check('with reduced motion nothing animates: the tally is a plain list', (await J(Q)).dlg.step === (await J(Q)).dlg.n && (await Q.locator('#sessdlg .reveal').count()) === 0);
  await Q.context().close();

  /* ================= somebody at the table is not playing fair ================= */
  // Mallory talks to the table directly, not through the journal: markup in every name, badges that are not badges, numbers that are not numbers.
  const NASTY = '<img src=x onerror="window.__pwn=1"> <b>Mal</b>';
  const M = await (await b.newContext()).newPage(); watch(M, 'mallory');
  await M.goto(B + '/api/nothing?as=mallory');
  await M.evaluate(() => new Promise((res, rej) => { const ws = new WebSocket('ws://' + location.host + '/api/ws?as=mallory'); ws.onopen = () => res(); ws.onerror = () => rej(new Error('ws')); window.__ws = ws; }));
  const say = (o) => M.evaluate((o) => window.__ws.send(JSON.stringify(o)), o);
  await say({ t: 'hello', name: NASTY });
  await say({ t: 'card', card: { name: NASTY, playbook: NASTY, hid: 'cmallory00001', pins: ['constructor', '__proto__', '<img src=x onerror=window.__pwn=1>', 'snake', 'snake', 'hog', 'bag', 'arm', 'peak', 'first'], luck: 999, harm: -4 }, night: { k: '4.1', hid: 'cmallory00001', harm: 1e9, peak: 'x', luck: {}, left: -1, lvl: [], died: 'yes' } });
  expected = 0;
  await roll(A, 'kick', 4, 4);
  await say({ t: 'roll', roll: { move: NASTY, d1: 6, d2: 6, mod: 999, hid: 'cmallory00001', mv: '<script>', hm: 1e9 } });
  await say({ t: 'card', card: { name: NASTY, playbook: NASTY, hid: 'cmallory00001', pins: ['snake', 'hog'] }, night: { k: '4.1', hid: 'cmallory00001', harm: 1e9, peak: 'x', luck: {}, left: -1, lvl: [], died: 'yes' } });
  for (const t of ['sess-name', 'sess-pause', 'sess-end']) await say({ t, name: NASTY, note: NASTY, discard: true });
  await tab(K, 'party');
  await K.click('#ksess [data-ss="name"]'); await K.fill('#ss-name', NASTY); await K.click('#ksess [data-ss="name-save"]');
  await until(K, () => /Being played/.test(document.querySelector('#ksess').textContent) && !document.querySelector('#ss-name'));
  await K.click('#ksess [data-ss="pause"]'); await K.fill('#ss-note', NASTY + '\n<script>window.__pwn=2</script>'); await K.click('#ksess [data-ss="pause-go"]');
  await until(A, () => document.getElementById('sessdlg').open);
  const clean = (p) => p.evaluate(() => ({ pwn: window.__pwn, imgs: document.querySelectorAll('#sessdlg img, #sessdlg script, #sessdlg b:not(.sboard b):not(.award b), #ksess img, #ksess script, #play-prev img, .pcard img[src="x"]').length, text: document.querySelector('#sessdlg').textContent }));
  let c1 = await clean(A);
  check('hostile: markup in a session name, a note and a hunter\'s name is shown as plain text on the "to be continued" screen', c1.pwn === undefined && c1.imgs === 0 && c1.text.indexOf('<img src=x onerror=') >= 0 && c1.text.indexOf('<script>window.__pwn=2</script>') >= 0, JSON.stringify(c1).slice(0, 200));
  check('hostile: a player could not name, pause or end the session', (await J(A)).sess.live === false && (await J(A)).sess.n === 4);
  await closeDlg(A); await closeDlg(Bo); await closeDlg(C); await closeDlg(K);
  await tab(A, 'play');
  check('hostile: the "Previously" note on Play is plain text too', (await A.evaluate(() => ({ n: document.querySelectorAll('#play-prev img, #play-prev script, #play-prev b b').length, t: document.querySelector('#play-prev').textContent }))).n === 0 && /<script>window.__pwn=2<\/script>/.test(await T(A, '#play-prev')));
  await tab(A, 'party');
  const mal = await A.evaluate(() => { const c = [...document.querySelectorAll('.pcard')].find(x => /Mal/.test(x.textContent)); return c ? { pins: [...c.querySelectorAll('.pins .bdg')].map(x => x.getAttribute('aria-label')), imgs: c.querySelectorAll('img[src="x"]').length } : null; });
  check('hostile: only real badges are drawn from a list of pins, and a name with markup draws no picture', mal && mal.pins.join('|') === 'Snake Eyes|Spotlight Hog' && mal.imgs === 0, JSON.stringify(mal));
  await K.click('#ksess [data-ss="end"]'); await until(K, () => !!document.querySelector('#ksess [data-ss="end-ask"]'));
  const kr = await K.evaluate(() => { const r = [...document.querySelectorAll('#ksess .sboard tbody tr')].find(x => /Mal/.test(x.textContent)); return r ? [...r.cells].map(c => c.textContent.trim()) : null; });
  check('hostile: wild numbers are cut down to size (a +999 roll is +15, harm past 8 is 8)', kr && kr[1] === '1' && kr[7] === '27' && (await clean(K)).pwn === undefined && (await clean(K)).imgs === 0, JSON.stringify(kr));
  await K.click('#ksess [data-ss="end-ask"]'); await K.click('#ksess [data-ss="end-yes"]');
  await until(A, () => document.getElementById('sessdlg').open); await A.click('#sessdlg [data-ss="skip"]');
  c1 = await clean(A);
  check('hostile: the tally is plain text as well, and nothing ran on any screen', c1.pwn === undefined && c1.imgs === 0 && c1.text.indexOf('<img src=x onerror=') >= 0 && (await clean(Bo)).pwn === undefined && (await clean(C)).pwn === undefined && (await clean(K)).pwn === undefined, JSON.stringify(c1).slice(0, 160));
  // a page handed a tally full of rubbish keeps only what it knows
  const junk = await A.evaluate(() => {
    const j = window.__journal, before = JSON.stringify(j.S().sheet.badges);
    window.__journal.tbl().ws.onmessage({ data: JSON.stringify({ t: 'tally', tally: { n: 77, name: '<b>x</b>', at: 5, parts: 'no', rows: [{ id: 'nope', hid: 'x' }, null, 7, { id: j.tbl().me.id, hid: j.S().sheet.hid, name: '<i>me</i>', rolls: 1e12, harm: -5 }], table: null,
      awards: [{ b: 'constructor', id: j.tbl().me.id, hid: j.S().sheet.hid }, { b: '__proto__', id: j.tbl().me.id, hid: j.S().sheet.hid }, { b: 'nosuch', id: j.tbl().me.id, hid: j.S().sheet.hid }, null, 'x'], fresh: ['snake', 'perfect', 'constructor'] }, found: ['perfect', 'toString', 'snake'] }) });
    return { same: JSON.stringify(Object.keys(j.S().sheet.badges).filter(k => ['constructor', '__proto__', 'nosuch'].indexOf(k) >= 0)), rolls: j.S().sheet.career.rolls < 20000, found: j.sess().found.join(), open: document.getElementById('sessdlg').open, html: document.querySelectorAll('#sessdlg i, #sessdlg h2 b').length };
  });
  check('hostile: a tally full of rubbish adds no unknown badge, counts no absurd numbers, and finds only real secrets', junk.same === '[]' && junk.rolls && junk.found.indexOf('toString') < 0 && junk.found.indexOf('snake') < 0 && junk.found.indexOf('perfect') >= 0 && junk.html === 0, JSON.stringify(junk));
  await closeDlg(A); await closeDlg(Bo); await closeDlg(C); await closeDlg(K);

  // ---- the report: what a player would paste into the group chat after The Dry Well ----
  console.log('\n----- The tally, as copied for chat -----\n' + chat + '\n-----------------------------------------\n');
  console.log(results.map(r=>r.join(' | ')).join('\n'));
  const fails = results.filter(r=>r[0]==='FAIL').length;
  console.log('\nTOTAL', results.length, 'FAIL', fails); console.log('ERRORS', errs);
  await b.close(); stopServer();
  if (fails || errs.length) process.exit(1);
})().catch(e=>{ console.log(results.map(r=>r.join(' | ')).join('\n')); console.log('CRASH', e.message.split('\n').slice(0,8).join('\n')); console.log('ERRORS', errs); stopServer(); process.exit(1); });
