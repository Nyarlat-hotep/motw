// More than one hunter per save (B1 to B3): new hunter, switch, retire or mark lost, bring back, delete. The hunter in play stays in S.sheet and S.hold; spares sit on S.bench.
require('fs').mkdirSync(require('path').join(__dirname,'out'),{recursive:true});
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const URL = 'file://'+path.join(__dirname,'..','index.html');
const results = []; const errs = [];
function check(name, ok, extra){ results.push([ok?'PASS':'FAIL', name, extra===undefined?'':String(extra)]); }
const PHOTO = 'data:image/jpeg;base64,'+fs.readFileSync(path.join(__dirname,'fixtures','hunter.jpg')).toString('base64');
const RICH = { sheet: { name: 'Dee Ray', pronouns: 'she/her', playbook: 'The Mundane', catch: 'I am just here for the snacks.', look: 'Tired eyes', backstory: 'Ran a diner.', photo: PHOTO,
    stats: { charm: 2, cool: 1, sharp: 0, tough: 1, weird: -1 }, luck: 4, harm: 2, unstable: false, xp: 3, level: 2, adv: { kick: true },
    bonds: [{ who: 'Sam', tie: 'Friend', note: 'Owes me one', theirs: 'Trusts me' }],
    custom: [{ id: 'm1', name: 'Panic Button', stat: 'sharp', trig: 'When you push it', full: 'Good.', part: 'Fine.', miss: 'Bad.', note: '' }],
    inventory: [{ id: 'g1', name: 'Sledgehammer', type: 'Weapon', val: 3, eq: true, note: '' }] },
  hold: { n: 2, move: 'inv', asked: [0] }, roller: { move: 'kick', stat: 'tough', forward: 1, ongoing: 1, other: 0 } };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(()=>chromium.launch());
  const open = async (j, viewport) => {
    const ctx = await b.newContext({ viewport: viewport || { width: 1100, height: 900 }, colorScheme: 'dark' });
    await ctx.addInitScript((x) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hunters-journal-v1', x); sessionStorage.setItem('seeded', '1'); } }, JSON.stringify(j));
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
    p.on('console', m => { if (m.type()==='error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
    await p.goto(URL+'#hunter'); await p.waitForTimeout(600);
    return p;
  };
  const st = (p) => p.evaluate(() => JSON.parse(JSON.stringify(window.__journal.S())));
  const T = async (p, sel) => (await p.textContent(sel)).replace(/\s+/g, ' ').trim();
  const unclipped = (p) => p.evaluate(() => { const c = document.querySelector('#hbar .card'); return !!c && c.scrollHeight <= c.clientHeight + 1 && c.getBoundingClientRect().height > 60; });
  const same = (a, b2) => JSON.stringify(a) === JSON.stringify(b2);
  const rename = async (p, name) => { await p.evaluate((n) => { const J = window.__journal; J.S().sheet.name = n; J.scheduleSave(); }, name); };

  // ---- a first hunter, and the bar ----
  let p = await open(RICH);
  check('the bar says who is in play', /Playing\s*Dee Ray/.test(await T(p, '#hbar')) && /The Mundane/.test(await T(p, '#hbar')), await T(p, '#hbar'));
  check('the bar is not cut off', await unclipped(p), await p.evaluate(() => { const c = document.querySelector('#hbar .card'); return c.scrollHeight + ' in ' + c.clientHeight; }));
  check('with no spare hunters there is no Other hunters list', !/Other hunters/.test(await T(p, '#hbar')));
  const A = await st(p);
  check('an old save with no bench loads with an empty one', Array.isArray(A.bench) && A.bench.length === 0);

  // ---- a new hunter parks the old one exactly ----
  await p.click('[data-hn="new"]');
  let s = await st(p);
  check('New hunter: a blank hunter is in play', s.sheet.name === '' && s.sheet.playbook === '' && s.sheet.luck === 7 && s.sheet.xp === 0 && s.sheet.level === 0 && s.hold.n === 0);
  check('the builder is on step 1', s.hv === 'build' && s.wiz === 0 && /Step 1 of 8/.test(await T(p, '.wstep')), await T(p, '.wstep'));
  check('the old hunter is on the bench, field for field', s.bench.length === 1 && same(s.bench[0].sheet, A.sheet) && same(s.bench[0].hold, A.hold));
  check('the photo, move, gear and history came along', s.bench[0].sheet.photo === PHOTO && s.bench[0].sheet.custom.length === 1 && s.bench[0].sheet.inventory.length === 1 && s.bench[0].sheet.bonds.length === 1);
  check('dice, cases, bestiary and settings were not touched', same(s.dice, A.dice) && same(s.cases, A.cases) && same(s.bestiary, A.bestiary) && same(s.settings, A.settings));
  check('forward and ongoing do not follow to the new hunter', s.roller.forward === 0 && s.roller.ongoing === 0);
  check('the bar lists the old hunter as a spare', /Other hunters/.test(await T(p, '#hbar')) && /Dee Ray/.test(await T(p, '#hbar')));

  // ---- switching back, and the new one being parked in turn ----
  await rename(p, 'Bram');
  const B = await st(p);
  await p.click('[data-hn="switch"]');
  s = await st(p);
  check('Play this hunter: the first hunter is back, field for field', same(s.sheet, A.sheet) && same(s.hold, A.hold));
  check('and the second is parked, field for field', s.bench.length === 1 && same(s.bench[0].sheet, B.sheet) && s.bench[0].sheet.name === 'Bram');
  check('switching lands on My sheet', s.hv === 'sheet' && (await p.isVisible('#hv-sheet')));
  check('the sheet on screen is the first hunter', (await p.inputValue('#f-name').catch(() => '')) === 'Dee Ray' || /Dee Ray/.test(await p.evaluate(() => document.querySelector('#hv-sheet').innerText)));

  // ---- timeline lines about a hunter cannot undo anything on the next ----
  await p.click('#t-play'); await p.click('#pl-harm button[data-n="4"]'); await p.click('#t-hunter');
  check('a harm change leaves an undoable line', await p.evaluate(() => window.__journal.evList().some(e => !e.nu)));
  await p.click('[data-hn="switch"]');
  check('after a switch, no old line can be undone', await p.evaluate(() => { const l = window.__journal.evList(); return l.length > 0 && l.every(e => e.nu); }));
  await p.click('[data-hn="switch"]');   // back to Dee Ray

  // ---- retire: the next hunter takes over ----
  const A2 = await st(p);   // Dee Ray as she is now, after the harm taken above
  await p.click('[data-hn="retire"]');
  check('Retire asks what happened, and nothing has changed yet', (await p.isVisible('#hn-how')) && (await st(p)).sheet.name === 'Dee Ray');
  await p.click('[data-hn="retire-no"]');
  check('Cancel puts the buttons back', (await p.locator('#hn-how').count()) === 0 && (await p.locator('[data-hn="retire"]').count()) === 1);
  await p.click('[data-hn="retire"]'); await p.selectOption('#hn-how', 'died'); await p.fill('#hn-note', 'Saved the town, and paid for it');
  await p.click('[data-hn="retire-go"]');
  s = await st(p);
  const gone = s.bench.filter(e => e.ended);
  check('the next hunter is in play', s.sheet.name === 'Bram', s.sheet.name);
  check('the retired hunter is on the shelf with how, note and date', gone.length === 1 && gone[0].ended.how === 'died' && gone[0].ended.note === 'Saved the town, and paid for it' && /^\d{4}-\d{2}-\d{2}$/.test(gone[0].ended.date));
  check('their sheet is kept whole', same(gone[0].sheet, A2.sheet) && gone[0].sheet.photo === PHOTO);
  check('the shelf shows them', /Gone but not forgotten/.test(await T(p, '#hbar')) && /Died/.test(await T(p, '#hbar')) && /Saved the town/.test(await T(p, '#hbar')), await T(p, '#hbar'));
  check('and a gone hunter is not in the Other hunters list', !/Other hunters/.test(await T(p, '#hbar')));

  // ---- bring back ----
  await p.click('[data-hn="back"]');
  s = await st(p);
  check('Bring back: they are in play again and no longer marked gone', s.sheet.name === 'Dee Ray' && s.bench.every(e => !e.ended) && same(s.sheet, A2.sheet));
  check('the one who was in play is a spare again', s.bench.length === 1 && s.bench[0].sheet.name === 'Bram');

  // ---- retiring with no spare starts a blank hunter ----
  await p.click('[data-hn="retire"]'); await p.selectOption('#hn-how', 'retired'); await p.click('[data-hn="retire-go"]');   // Dee retires, Bram takes over
  await p.click('[data-hn="retire"]'); await p.selectOption('#hn-how', 'lost'); await p.click('[data-hn="retire-go"]');       // Bram is lost, nobody is left
  s = await st(p);
  check('no spare: a blank hunter starts in the builder', s.sheet.name === '' && s.hv === 'build' && s.wiz === 0 && s.bench.length === 2 && s.bench.every(e => e.ended));
  check('with both lists the bar is not cut off', await unclipped(p));
  check('both are on the shelf, with how', (await p.locator('#hbar .hlist li').count()) === 2 && /Lost/.test(await T(p, '#hbar')) && /Retired/.test(await T(p, '#hbar')));

  // ---- delete takes two presses ----
  await p.locator('#hbar [data-hn="del"]').first().click();
  check('the first press only asks', /Press again to delete for good/.test(await T(p, '#hbar')) && (await st(p)).bench.length === 2);
  await p.locator('#hbar [data-hn="del"]').first().click();
  check('the second press deletes that one', (await st(p)).bench.length === 1 && (await p.locator('#hbar .hlist li').count()) === 1);

  // ---- it all survives a reload ----
  await rename(p, 'Cass'); await p.waitForTimeout(800);
  await p.reload(); await p.waitForTimeout(700);
  s = await st(p);
  check('a reload keeps the hunter in play and the shelf', s.sheet.name === 'Cass' && s.bench.length === 1 && s.bench[0].ended && (await T(p, '#hbar')).includes('Gone but not forgotten'));

  // ---- a bad or old bench in a save ----
  const odd = { sheet: { name: 'Dee Ray' }, bench: [
    null, 'text', { sheet: 'nope' }, { sheet: ['no'] },
    { id: '"><b>', sheet: { name: '<img src=x onerror="window.__pwned=1">', playbook: '<b>x</b>' }, hold: 'x', ended: null },
    { id: 'old1', sheet: { name: 'Old Timer' }, ended: { how: 'exploded', note: '<img src=x onerror="window.__pwned=2">', date: '2025-01-01' } } ] };
  p = await open(odd);
  s = await st(p);
  check('junk entries are dropped and the rest kept', s.bench.length === 2, s.bench.length);
  check('a hostile id is replaced', s.bench.every(e => /^[\w-]{1,40}$/.test(e.id)));
  check('an unknown way of ending becomes Lost', s.bench[1].ended && s.bench[1].ended.how === 'lost');
  check('missing fields are filled in from the current defaults', s.bench[0].sheet.luck === 7 && s.bench[0].sheet.stats.charm === 0 && s.bench[0].hold.n === 0 && Array.isArray(s.bench[0].sheet.custom));
  check('markup in names and notes is only text', (await p.locator('#hbar img, #hbar b > b').count()) === 0 && !(await p.evaluate(() => window.__pwned)) && (await T(p, '#hbar')).includes('<img'));
  await p.click('[data-hn="switch"]');
  s = await st(p);
  check('an old entry can be played and the page does not break', s.sheet.name.includes('<img') && s.bench.some(e => e.sheet.name === 'Dee Ray'));

  // ---- the page says so when the browser will not keep the save ----
  p = await open(RICH);
  await p.evaluate(() => { const real = Storage.prototype.setItem; window.__real = real; Storage.prototype.setItem = function (k, v) { if (k === 'hunters-journal-v1') throw new Error('QuotaExceededError'); return real.call(this, k, v); }; });
  await p.click('[data-hn="new"]'); await p.waitForTimeout(900);
  check('a failed save is shown, not hidden', /NOT saved/.test(await T(p, '#sync')), await T(p, '#sync'));
  await p.evaluate(() => { Storage.prototype.setItem = window.__real; });
  await rename(p, 'Eve'); await p.waitForTimeout(900);
  check('and it goes back to normal once saving works', /Saved on this device/.test(await T(p, '#sync')), await T(p, '#sync'));

  // ---- phone width ----
  p = await open(RICH, { width: 390, height: 800 });
  await p.click('[data-hn="new"]'); await rename(p, 'A rather long name for a hunter who is on the shelf and keeps going'); await p.click('[data-hn="new"]');
  await p.click('[data-hn="retire"]'); await p.fill('#hn-note', 'A very long line to remember them by, '.repeat(5)); await p.click('[data-hn="retire-go"]');
  check('phone: the bar is not cut off', await unclipped(p));
  check('phone: no sideways scroll with both lists', await p.evaluate(() => document.documentElement.scrollWidth <= 390), await p.evaluate(() => document.documentElement.scrollWidth));
  await p.locator('#hbar').scrollIntoViewIfNeeded();
  await p.screenshot({ path: path.join(__dirname,'out','hunters-phone.png') });

  console.log(results.map(r=>r.join(' | ')).join('\n'));
  const fails = results.filter(r=>r[0]==='FAIL').length;
  console.log('\nTOTAL', results.length, 'FAIL', fails); console.log('ERRORS', errs);
  await b.close();
  if (fails || errs.length) process.exit(1);
})().catch(e=>{ console.log(results.map(r=>r.join(' | ')).join('\n')); console.log('CRASH', e.message.split('\n').slice(0,6).join('\n')); console.log('ERRORS', errs); process.exit(1); });
