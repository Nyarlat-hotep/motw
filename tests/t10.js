// Luck candles: seven candle buttons on My sheet and Play, snuff on spend, guttering when Luck runs low, the flame and smoke pictures and the drawn stand-ins, reduced motion, phone width.
require('fs').mkdirSync(require('path').join(__dirname,'out'),{recursive:true});
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://'+path.join(__dirname,'..','index.html');
const results = []; const errs = [];
function check(name, ok, extra){ results.push([ok?'PASS':'FAIL', name, extra===undefined?'':String(extra)]); }
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(()=>chromium.launch());
  const open = async (opts) => {
    const ctx = await b.newContext(Object.assign({ viewport: { width: 1100, height: 900 }, colorScheme: 'dark' }, opts));
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
    p.on('console', m => { if (m.type()==='error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
    await p.goto(URL+'#play'); await p.waitForTimeout(600);
    return p;
  };
  const lit = (p, id) => p.locator('#'+id+' button[aria-pressed=true]').count();
  const snuffs = (p, id) => p.evaluate((id)=>[].map.call(document.querySelectorAll('#'+id+' button.snuff'), b=>+b.dataset.n), id);
  const anim = (p, sel) => p.evaluate((s)=>getComputedStyle(document.querySelector(s)).animationName, sel);

  // ---- Play ----
  const p = await open();
  check('play: seven candles, all lit', (await p.locator('#pl-luck button > svg').count())===7 && (await lit(p,'pl-luck'))===7);
  check('play: candles keep their labels', (await p.getAttribute('#pl-luck button[data-n="3"]','aria-label'))==='Luck 3');
  check('play: a lit flame flickers', (await anim(p,'#pl-luck button[data-n="1"] .fl'))==='cflick');
  check('play: the wax is shaded from the shared gradients', (await p.locator('svg.cdefs #cn-wax').count())===1 && /cn-wax/.test(await p.evaluate(()=>getComputedStyle(document.querySelector('#pl-luck .wx')).fill)));
  const strip = () => p.evaluate(()=>new DOMMatrix(getComputedStyle(document.querySelector('#pl-luck button[data-n="1"] .ff')).transform).m41);
  const s1 = await strip(); await p.waitForTimeout(250); const s2 = await strip();
  check('play: the picture flame steps through its frames', (await anim(p,'#pl-luck button[data-n="1"] .ff'))==='cframes' && s1!==s2 && Math.abs(s1%40)<0.01 && Math.abs(s2%40)<0.01, s1+' then '+s2);
  check('play: flame and smoke are the pictures when they are there', (await p.locator('#pl-luck button[data-n="1"] .fl image').count())===1 && (await p.locator('#pl-luck button[data-n="1"] g.sm image').count())===1 && (await p.locator('#pl-luck .fo').count())===0);
  check('play: note counts what is left', /7 of 7 left/.test(await p.textContent('#play-status .lucknote')));
  check('play: nothing snuffed on first draw', (await snuffs(p,'pl-luck')).length===0);
  await p.click('#pl-luck button[data-n="7"]');
  check('play: clicking the last candle puts it out', (await lit(p,'pl-luck'))===6);
  check('play: that candle plays the snuff', String(await snuffs(p,'pl-luck'))==='7' && (await anim(p,'#pl-luck button[data-n="7"] .fl'))==='snuff', await snuffs(p,'pl-luck'));
  check('play: an unlit flame ends hidden', (await p.evaluate(()=>getComputedStyle(document.querySelector('#pl-luck button[data-n="7"] .fl'),null).animationFillMode))==='both');
  await p.waitForTimeout(300); await p.click('#pl-xp button[data-n="1"]');   // anything that redraws the sheet
  check('play: a redraw part-way carries the snuff on', String(await snuffs(p,'pl-luck'))==='7' && parseFloat(await p.evaluate(()=>document.querySelector('#pl-luck button.snuff').style.getPropertyValue('--sn')))<=-0.3);
  await p.click('#pl-xp button[data-n="1"]'); await p.click('#pl-luck button[data-n="7"]');
  check('play: clicking it again relights, no snuff', (await lit(p,'pl-luck'))===7 && (await snuffs(p,'pl-luck')).length===0);

  // spend Luck to cancel a wound
  await p.click('#pl-take'); await p.click('#pl-undo');
  check('play: cancelling a wound snuffs candle 7', (await lit(p,'pl-luck'))===6 && String(await snuffs(p,'pl-luck'))==='7');
  await p.screenshot({ path: path.join(__dirname,'out','candles-play.png') });

  // spend Luck from the roller
  let guard = 0;
  do { await p.click('#roll'); await p.waitForTimeout(1500); } while (!(await p.locator('#spendluck').count()) && guard++ < 12);
  await p.click('#spendluck'); await p.waitForTimeout(100);
  check('roller: Spend Luck snuffs candle 6', (await lit(p,'pl-luck'))===5 && String(await snuffs(p,'pl-luck'))==='6', await snuffs(p,'pl-luck'));

  // running low and out
  await p.click('#pl-luck button[data-n="2"]');
  check('play: dropping to 2 snuffs 3, 4 and 5', String(await snuffs(p,'pl-luck'))==='3,4,5');
  check('play: two left says so and the flames gutter', /\blow\b/.test(await p.getAttribute('#pl-luck','class')) && /Running low: 2 left/.test(await p.textContent('#play-status .lucknote')) && (await anim(p,'#pl-luck button[data-n="1"] .fl'))==='cgutter');
  await p.click('#pl-luck button[data-n="1"]'); await p.click('#pl-luck button[data-n="1"]');
  check('play: none left reads Out of Luck', (await lit(p,'pl-luck'))===0 && /Out of Luck\. Bad things find you\./.test(await p.textContent('#play-status .lucknote')));

  // ---- My sheet shows the same thing ----
  await p.click('#t-hunter'); await p.click('#seg-sheet');
  check('sheet: seven candles, none lit, same note', (await p.locator('#luck button > svg').count())===7 && (await lit(p,'luck'))===0 && /Out of Luck/.test(await p.textContent('#lucktxt')));
  await p.click('#luck button[data-n="5"]');
  check('sheet: clicking candle 5 sets Luck to 5', (await lit(p,'luck'))===5 && /5 of 7 left/.test(await p.textContent('#lucktxt')) && !/\blow\b/.test(await p.getAttribute('#luck','class')));
  await p.locator('#luck').screenshot({ path: path.join(__dirname,'out','candles-sheet-dark.png') });
  await p.reload(); await p.waitForTimeout(500);
  check('Luck survives a reload', (await p.evaluate(()=>JSON.parse(localStorage.getItem('hunters-journal-v1')).sheet.luck))===5);

  // ---- without the pictures the page draws its own flame and smoke ----
  await p.evaluate(()=>{ __art.flame = __art.smoke = false; }); await p.click('#xp button[data-n="1"]'); await p.click('#xp button[data-n="1"]');
  check('no pictures: the flame and smoke are drawn', (await p.locator('#luck button[data-n="1"] .fl .fo').count())===1 && (await p.locator('#luck button[data-n="1"] path.sm').count())===1 && (await p.locator('#luck image').count())===0);
  await p.locator('#luck').screenshot({ path: path.join(__dirname,'out','candles-sheet-drawn.png') });

  // ---- light theme, phone width ----
  const m = await open({ viewport: { width: 390, height: 800 }, colorScheme: 'light' });
  check('phone: seven candles on one row', (await m.evaluate(()=>{ const t=[].map.call(document.querySelectorAll('#pl-luck button'), b=>b.getBoundingClientRect().top); return Math.max.apply(null,t)-Math.min.apply(null,t); }))<1);
  check('phone: no sideways scroll', (await m.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))<=0);
  await m.locator('#pl-luck').screenshot({ path: path.join(__dirname,'out','candles-play-light.png') });

  // ---- reduced motion ----
  const r = await open({ reducedMotion: 'reduce' });
  check('reduced motion: flames do not flicker', (await anim(r,'#pl-luck button[data-n="1"] .fl'))==='none' && (await anim(r,'#pl-luck button[data-n="1"] .ff'))==='none');
  await r.click('#pl-luck button[data-n="7"]');
  check('reduced motion: spending just switches the candle', (await lit(r,'pl-luck'))===6 && (await anim(r,'#pl-luck button[data-n="7"] .fl'))==='none' && (await anim(r,'#pl-luck button[data-n="7"] .sm'))==='none' &&
    (await r.evaluate(()=>getComputedStyle(document.querySelector('#pl-luck button[data-n="7"] .fl')).opacity))==='0');

  console.log(results.map(r=>r.join(' | ')).join('\n'));
  const fails = results.filter(r=>r[0]==='FAIL').length;
  console.log('\nTOTAL', results.length, 'FAIL', fails); console.log('ERRORS', errs);
  await b.close();
  if (fails || errs.length) process.exit(1);
})().catch(e=>{ console.log(results.map(r=>r.join(' | ')).join('\n')); console.log('CRASH', e.message.split('\n').slice(0,6).join('\n')); process.exit(1); });
