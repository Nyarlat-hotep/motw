// Session timeline and undo (T1, T2): every change to harm, Unstable, Luck, XP and hold leaves one line on Play; quick changes merge; undo works only while it is still safe; the sheet is never touched by removing a line.
require('fs').mkdirSync(require('path').join(__dirname,'out'),{recursive:true});
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://'+path.join(__dirname,'..','index.html');
const results = []; const errs = [];
function check(name, ok, extra){ results.push([ok?'PASS':'FAIL', name, extra===undefined?'':String(extra)]); }
const HUNTER = { sheet: { name: 'Dee Ray', playbook: 'The Mundane', luck: 5, stats: { charm: 0, cool: 0, sharp: 0, tough: 0, weird: 0 } } };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(()=>chromium.launch());
  const open = async (journal, viewport) => {
    const ctx = await b.newContext({ viewport: viewport || { width: 1100, height: 900 }, colorScheme: 'dark' });
    await ctx.addInitScript(() => {
      window.__dice = [];
      const real = crypto.getRandomValues.bind(crypto);
      crypto.getRandomValues = function (a) { if (a instanceof Uint8Array && a.length === 1 && window.__dice.length) { a[0] = window.__dice.shift() - 1; return a; } return real(a); };
    });
    await ctx.addInitScript((j) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hunters-journal-v1', j); sessionStorage.setItem('seeded', '1'); } }, JSON.stringify(journal));
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
    p.on('console', m => { if (m.type()==='error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
    await p.goto(URL+'#play'); await p.waitForTimeout(600);
    return p;
  };
  // the text of each line on the card, newest first (the second cell of each row)
  const lines = (p) => p.$$eval('#hist li', els => els.map(li => { const c = li.children; return c.length > 1 ? c[1].innerText.replace(/\s+/g, ' ').trim() : li.innerText.trim(); }));
  const hasUndo = (p, i) => p.$$eval('#hist li', (els, i) => !!(els[i] && els[i].querySelector('[data-evundo]')), i);
  const sheet = (p) => p.evaluate(() => { const J = window.__journal, S = J.S(); return { harm: S.sheet.harm, unstable: !!S.sheet.unstable, luck: S.sheet.luck, xp: S.sheet.xp, hold: S.hold.n, level: S.sheet.level }; });
  const age = (p) => p.evaluate(() => { const J = window.__journal, S = J.S(); S.session.events.forEach(e => { e.t -= 10000; }); });   // so the next change is not merged into the last
  const rollWith = async (p, a, c) => { await p.evaluate(([x, y]) => { window.__dice.push(x, y); }, [a, c]); await p.click('#roll'); await p.waitForSelector('#result .tier', { timeout: 4000 }); };

  let p = await open(HUNTER);
  let L, s;

  // ---- the card, a roll ----
  check('Play: the card is titled This session', (await p.textContent('#histttl')) === 'This session');
  check('Play: an empty session says so', /Nothing yet/.test(await p.textContent('#hist')));
  await rollWith(p, 4, 3);
  L = await lines(p);
  check('a roll leaves a line', L.length === 1 && L[0] === 'Kick Some Ass (4+3 +0)', L.join(' | '));
  check('a roll line has no Undo', !(await hasUndo(p, 0)));

  // ---- taking harm, and undoing it from the toast ----
  await p.click('[data-ph="1"]'); await p.click('[data-ph="1"]'); await p.click('#pl-take');
  L = await lines(p); s = await sheet(p);
  check('Take harm: one line, with its reason', L[0] === 'Took 3 harm (Harm 0 to 3)' && s.harm === 3, L[0]);
  check('a toast offers Undo', (await p.isVisible('#evtoast')) && /Took 3 harm/.test(await p.textContent('#evtoast-t')) && (await p.isVisible('#evtoast-undo')));
  await p.click('#evtoast-undo');
  s = await sheet(p);
  check('Undo from the toast puts harm back and removes the line', s.harm === 0 && (await lines(p)).length === 1, JSON.stringify(s));
  check('the toast says it is undone', /Undone/.test(await p.textContent('#evtoast-t')) && !(await p.isVisible('#evtoast-undo')));

  // ---- a pip that also marks Unstable is one line, and one undo puts both back ----
  await p.click('#pl-harm button[data-n="5"]');
  L = await lines(p);
  check('harm pip to 5: one line that also says Unstable', L[0] === 'Harm 0 to 5, now Unstable' && L.length === 2, L.join(' | '));
  await p.click('#hist [data-evundo]');
  s = await sheet(p);
  check('one undo restores harm and Unstable together', s.harm === 0 && s.unstable === false && (await lines(p)).length === 1, JSON.stringify(s));

  // ---- scrubbing Luck is one line; scrubbing back leaves none ----
  await p.click('#pl-luck button[data-n="4"]'); await p.click('#pl-luck button[data-n="3"]'); await p.click('#pl-luck button[data-n="2"]');
  L = await lines(p);
  check('Luck 5 to 2 by three quick clicks is one line', L[0] === 'Luck 5 to 2' && L.length === 2, L.join(' | '));
  await p.click('#pl-luck button[data-n="5"]');
  check('back where it started: the line is gone', (await lines(p)).length === 1 && (await sheet(p)).luck === 5);
  check('and no toast is left offering to undo it', !(await p.isVisible('#evtoast')));

  // ---- a stale undo is refused ----
  await age(p);
  await p.click('#pl-harm button[data-n="2"]'); await age(p); await p.click('#pl-heal1');
  L = await lines(p);
  check('Heal 1 is its own line, apart from the pip click', L[0] === 'Healed 1 (Harm 2 to 1)' && L[1] === 'Harm 0 to 2', L.join(' | '));
  check('only the newest change to a field offers Undo', (await hasUndo(p, 0)) && !(await hasUndo(p, 1)));
  await p.evaluate(() => { const J = window.__journal, S = J.S(); J.evUndo(S.session.events[1].id); });
  check('a stale undo says why and changes nothing', /changed again since/.test(await p.textContent('#evtoast-t')) && (await sheet(p)).harm === 1);
  await p.click('#hist li:nth-child(1) [data-evundo]');
  check('undoing the newer change first works', (await sheet(p)).harm === 2);
  await p.click('#hist li:nth-child(1) [data-evundo]');
  check('and then the older one', (await sheet(p)).harm === 0 && (await lines(p)).length === 1);

  // ---- spending Luck to cancel a wound changes harm and Luck, and one undo reverses both ----
  await age(p);
  await p.click('#pl-take'); await age(p); await p.click('#pl-undo');
  L = await lines(p); s = await sheet(p);
  check('cancel a wound: one line for harm and Luck together', L[0] === 'Spent Luck to cancel a wound (Harm 3 to 0, Luck 5 to 4)' && s.harm === 0 && s.luck === 4, L[0]);
  await p.click('#hist li:nth-child(1) [data-evundo]');
  s = await sheet(p);
  check('one undo brings back the wound and the Luck', s.harm === 3 && s.luck === 5, JSON.stringify(s));
  await p.click('#hist li:nth-child(1) [data-evundo]');   // the "Took 3 harm" line: harm back to 0
  check('the wound line can then be undone too', (await sheet(p)).harm === 0);

  // ---- buttons tied to a roll are logged but not undone from the list ----
  await age(p);
  await rollWith(p, 1, 1);
  await p.click('#markxp');
  L = await lines(p);
  check('Mark XP leaves a line', L[0] === 'Marked XP on a miss (XP 0 to 1)', L[0]);
  check('Mark XP has no Undo (its roll card would disagree)', !(await hasUndo(p, 0)));
  await p.click('#spendluck');
  L = await lines(p);
  check('Spend Luck on a roll leaves a line with no Undo', L[0] === 'Spent Luck: made the roll a 12 (Luck 5 to 4)' && !(await hasUndo(p, 0)), L[0]);
  check('and the roll line now says Luck made it a 12', /^Kick Some Ass \(Luck\) \(1\+1 \+0\)$/.test(L[2]), L[2]);

  // ---- hold: a roll that hands out hold is one line, not two; asking is a line without Undo ----
  await age(p);
  await p.click('[data-pmove="inv"]');
  const n0 = (await lines(p)).length;
  await rollWith(p, 6, 6);
  L = await lines(p);
  check('a roll that gives hold adds only the roll line', L.length === n0 + 1 && /^Investigate/.test(L[0]), L.slice(0, 2).join(' | '));
  check('the hold is there', (await sheet(p)).hold === 2);
  await p.click('[data-ask="0"]');
  L = await lines(p);
  check('asking a question is a line with the hold change', /^Asked: .+ \(Hold 2 to 1\)$/.test(L[0]), L[0]);
  check('asking has no Undo (tap the question again instead)', !(await hasUndo(p, 0)));

  // ---- a level-up is logged, not undone ----
  await age(p);
  await p.evaluate(() => { const J = window.__journal, S = J.S(); S.sheet.xp = 5; J.levelDone('Test pick'); });
  L = await lines(p);
  check('a level-up leaves a line', /^Levelled up \(.*Level 0 to 1\)$/.test(L[0]), L[0]);
  check('a level-up has no Undo', !(await hasUndo(p, 0)));

  // ---- removing a line, clearing the list: the sheet never changes ----
  const before = await sheet(p), count = (await lines(p)).length;
  await p.click('#hist li:nth-child(1) [data-evrm]');
  check('Remove drops one line', (await lines(p)).length === count - 1);
  check('and does not touch the sheet', JSON.stringify(await sheet(p)) === JSON.stringify(before));
  await p.click('#clearhist');
  check('Clear empties the timeline', /Nothing yet/.test(await p.textContent('#hist')));
  check('and does not touch the sheet either', JSON.stringify(await sheet(p)) === JSON.stringify(before));
  await p.click('#t-roll');
  check('Roller: the same card is "Recent rolls"', (await p.textContent('#histttl')) === 'Recent rolls');
  check('Roller: its rolls are still there after Clear on Play', (await p.locator('#hist li').count()) >= 3 && /Kick Some Ass/.test(await p.textContent('#hist')), await p.locator('#hist li').count());
  await p.click('#t-play');

  // ---- sessions and the cap ----
  await p.evaluate(() => { const J = window.__journal, S = J.S(); J.evAdd({ kind: 'xp', f: { xp: { from: 0, to: 1 } }, nu: true }); S.session.events[0].t -= 7 * 36e5; S.sheet.xp += 1; J.scheduleSave(); });
  check('after six quiet hours a change starts a new session', await p.evaluate(() => window.__journal.S().session.events.length === 1));
  await p.evaluate(() => { for (let i = 0; i < 210; i++) window.__journal.evAdd({ kind: 'xp', why: 'x', f: {}, nu: true }); });
  check('the timeline is capped at 200 lines', await p.evaluate(() => window.__journal.S().session.events.length === 200));
  await p.evaluate(() => { const J = window.__journal, S = J.S(); S.session.events = []; J.evBase(); });

  // ---- a reload keeps the timeline and does not invent lines ----
  await p.click('#pl-luck button[data-n="3"]');
  await p.waitForTimeout(800);
  const kept = await p.evaluate(() => window.__journal.S().session.events.length);
  await p.reload(); await p.waitForTimeout(700);
  check('reload keeps the lines and adds none', kept === 1 && (await p.evaluate(() => window.__journal.S().session.events.length)) === 1, kept);

  // ---- phone width, with lines and the toast showing ----
  p = await open(HUNTER, { width: 390, height: 800 });
  await rollWith(p, 4, 3);
  await p.click('#pl-harm button[data-n="5"]');
  await p.click('#pl-luck button[data-n="3"]');
  await p.waitForTimeout(200);
  check('phone: no sideways scroll', await p.evaluate(() => document.documentElement.scrollWidth <= 390), await p.evaluate(() => document.documentElement.scrollWidth));
  const tb = await p.evaluate(() => { const r = document.querySelector('#evtoast').getBoundingClientRect(); return [r.left, r.right, r.bottom, innerWidth, innerHeight]; });
  check('phone: the toast sits inside the screen', tb[0] >= 0 && tb[1] <= tb[3] && tb[2] <= tb[4], tb.join(','));
  await p.locator('#hist').scrollIntoViewIfNeeded();
  await p.screenshot({ path: path.join(__dirname,'out','timeline-phone.png') });

  console.log(results.map(r=>r.join(' | ')).join('\n'));
  const fails = results.filter(r=>r[0]==='FAIL').length;
  console.log('\nTOTAL', results.length, 'FAIL', fails); console.log('ERRORS', errs);
  await b.close();
  if (fails || errs.length) process.exit(1);
})().catch(e=>{ console.log(results.map(r=>r.join(' | ')).join('\n')); console.log('CRASH', e.message.split('\n').slice(0,6).join('\n')); console.log('ERRORS', errs); process.exit(1); });
