// Copy for chat (A2): the last roll as one plain line on the clipboard. Exact wording, a negative modifier, spent Luck, an unnamed hunter, a blocked clipboard, the Play tab, phone width.
require('fs').mkdirSync(require('path').join(__dirname,'out'),{recursive:true});
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://'+path.join(__dirname,'..','index.html');
const results = []; const errs = [];
function check(name, ok, extra){ results.push([ok?'PASS':'FAIL', name, extra===undefined?'':String(extra)]); }
const hunter = (name, tough) => ({ sheet: { name, playbook: 'The Mundane', luck: 5, stats: { charm: 0, cool: 0, sharp: 0, tough, weird: 0 } } });
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(()=>chromium.launch());
  const open = async (journal, viewport) => {
    const ctx = await b.newContext({ viewport: viewport || { width: 1100, height: 900 }, colorScheme: 'dark' });
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
    // dice: push faces onto window.__dice and the next rolls use them in order
    await ctx.addInitScript(() => {
      window.__dice = [];
      const real = crypto.getRandomValues.bind(crypto);
      crypto.getRandomValues = function (a) { if (a instanceof Uint8Array && a.length === 1 && window.__dice.length) { a[0] = window.__dice.shift() - 1; return a; } return real(a); };
    });
    await ctx.addInitScript((j) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hunters-journal-v1', j); sessionStorage.setItem('seeded', '1'); } }, JSON.stringify(journal));
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
    p.on('console', m => { if (m.type()==='error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
    await p.goto(URL+'#roll'); await p.waitForTimeout(600);
    return p;
  };
  const roll = async (p, a, c) => { await p.evaluate(([x, y]) => { window.__dice.push(x, y); }, [a, c]); await p.click('#roll'); await p.waitForSelector('#copyroll', { timeout: 4000 }); };
  const copy = async (p) => { await p.click('#copyroll'); await p.waitForTimeout(150); return p.evaluate(() => navigator.clipboard.readText()); };

  // ---- a named hunter, Tough +2: a 4 and a 3 is a 9 ----
  let p = await open(hunter('Dee Ray', 2));
  check('no copy button before the first roll', (await p.locator('#copyroll').count()) === 0);
  await p.evaluate(() => { window.__dice.push(4, 3); }); await p.click('#roll');
  check('no copy button while the dice are in the air', (await p.locator('#copyroll').count()) === 0);
  await p.waitForSelector('#copyroll', { timeout: 4000 });
  let line = await copy(p);
  check('partial success line is exact', line === 'Dee Ray: Kick Some Ass, 9 (4 + 3, +2), partial success', line);
  check('says it was copied', /Copied/.test(await p.textContent('#copymsg')), await p.textContent('#copymsg'));

  // ---- a full success and a plain 2d6 style move name ----
  await roll(p, 6, 5);
  line = await copy(p);
  check('full success line', line === 'Dee Ray: Kick Some Ass, 13 (6 + 5, +2), full success', line);

  // ---- a negative modifier uses a plain hyphen, not the minus sign ----
  p = await open(hunter('Dee Ray', -1));
  await roll(p, 4, 3);
  line = await copy(p);
  check('miss with a negative modifier', line === 'Dee Ray: Kick Some Ass, 6 (4 + 3, -1), miss', line);
  check('no minus sign or other odd characters', /^[\x20-\x7e]+$/.test(line), line);

  // ---- Luck turns it into a 12, and the line says so ----
  await p.click('#spendluck'); await p.waitForTimeout(200);
  line = await copy(p);
  check('spent Luck line shows the dice as rolled', line === 'Dee Ray: Kick Some Ass, 12 (4 + 3, -1, spent Luck), full success', line);

  // ---- a name with stray spaces, and no name at all ----
  p = await open(hunter('  Dee    Ray  ', 0));
  await roll(p, 2, 2);
  check('stray spaces in a name are tidied', (await copy(p)) === 'Dee Ray: Kick Some Ass, 4 (2 + 2, +0), miss');
  p = await open(hunter('', 0));
  await roll(p, 3, 3);
  check('an unnamed hunter reads "A hunter"', (await copy(p)) === 'A hunter: Kick Some Ass, 6 (3 + 3, +0), miss');

  // ---- the clipboard is blocked: the line is shown to copy by hand ----
  p = await open(hunter('Dee Ray', 2));
  await p.evaluate(() => { Object.defineProperty(navigator.clipboard, 'writeText', { value: () => Promise.reject(new Error('blocked')) }); });
  await roll(p, 4, 3); await p.click('#copyroll'); await p.waitForTimeout(200);
  check('blocked: a box with the line appears', (await p.inputValue('#copybox')) === 'Dee Ray: Kick Some Ass, 9 (4 + 3, +2), partial success');
  check('blocked: the box is read-only and focused', await p.evaluate(() => document.activeElement.id === 'copybox' && document.activeElement.readOnly));

  // ---- the same button on Play ----
  p = await open(hunter('Dee Ray', 2));
  await p.click('#t-play'); await p.waitForTimeout(300);
  await p.evaluate(() => { window.__dice.push(5, 4); }); await p.click('#roll'); await p.waitForSelector('#p-play #copyroll', { timeout: 4000 });
  check('Play: the button is on the dice card', (await copy(p)) === 'Dee Ray: Kick Some Ass, 11 (5 + 4, +2), full success');

  // ---- phone width: the card still fits ----
  p = await open(hunter('Dee Ray', 2), { width: 390, height: 800 });
  await roll(p, 4, 3); await p.click('#copyroll'); await p.waitForTimeout(200);
  check('phone: no sideways scroll', await p.evaluate(() => document.documentElement.scrollWidth <= 390), await p.evaluate(() => document.documentElement.scrollWidth));
  await p.screenshot({ path: path.join(__dirname,'out','copyroll-phone.png') });

  console.log(results.map(r=>r.join(' | ')).join('\n'));
  const fails = results.filter(r=>r[0]==='FAIL').length;
  console.log('\nTOTAL', results.length, 'FAIL', fails); console.log('ERRORS', errs);
  await b.close();
  if (fails || errs.length) process.exit(1);
})().catch(e=>{ console.log(results.map(r=>r.join(' | ')).join('\n')); console.log('CRASH', e.message.split('\n').slice(0,6).join('\n')); console.log('ERRORS', errs); process.exit(1); });
