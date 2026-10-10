// Big moments: a ragged, burnt edge around the screen on a 12+, a miss and a level-up. Nothing crosses the middle of the screen, the layer is not drawn between moments,
// the colors follow the theme, a phone gets the finer edge, and reduced motion gets nothing.
require('fs').mkdirSync(require('path').join(__dirname,'out'),{recursive:true});
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://'+path.join(__dirname,'..','index.html');
const results = []; const errs = [];
function check(name, ok, extra){ results.push([ok?'PASS':'FAIL', name, extra===undefined?'':String(extra)]); }
const HUNTER = { sheet: { name: 'Dee Ray', playbook: 'The Mundane', luck: 5, stats: { charm: 0, cool: 0, sharp: 0, tough: 0, weird: 0 } } };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(()=>chromium.launch());
  const open = async (opts, theme) => {
    const ctx = await b.newContext(Object.assign({ viewport: { width: 1100, height: 900 }, colorScheme: 'dark' }, opts));
    // dice: push faces onto window.__dice and the next rolls use them in order
    await ctx.addInitScript(() => {
      window.__dice = [];
      const real = crypto.getRandomValues.bind(crypto);
      crypto.getRandomValues = function (a) { if (a instanceof Uint8Array && a.length === 1 && window.__dice.length) { a[0] = window.__dice.shift() - 1; return a; } return real(a); };
    });
    await ctx.addInitScript((j) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hunters-journal-v1', j); sessionStorage.setItem('seeded', '1'); } }, JSON.stringify(Object.assign({ settings: { fx: true, theme: theme || 'dark' } }, HUNTER)));
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
    p.on('console', m => { if (m.type()==='error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
    await p.goto(URL+'#roll'); await p.waitForTimeout(600);
    return p;
  };
  const roll = async (p, a, c) => {
    await p.evaluate(([x, y]) => { const h = document.querySelector('#copyroll'); if (h) h.remove(); window.__dice.push(x, y); }, [a, c]);
    await p.click('#roll'); await p.waitForSelector('#copyroll', { timeout: 4000 });
  };
  const fx = (p) => p.evaluate(() => {
    const f = document.getElementById('fx'), cs = getComputedStyle(f), r = getComputedStyle(f.querySelector('rect'));
    return { cls: f.className, anim: cs.animationName, dur: cs.animationDuration, vis: cs.visibility, op: +cs.opacity, bg: cs.backgroundImage + ' ' + cs.backgroundColor, shadow: cs.boxShadow, stroke: r.stroke, sw: r.strokeWidth, filter: r.filter, fill: r.fill };
  });
  // hold the effect still while it is bright, or (with no kind) put it away again
  const hold = (p, kind) => p.evaluate((k) => { const f = document.getElementById('fx'); f.className = ''; f.style.animationPlayState = k ? 'paused' : ''; f.style.animationDelay = k ? '-0.45s' : ''; void f.offsetWidth; if (k) f.className = 'fx-' + k; }, kind);
  const same = (x, y) => Buffer.compare(x, y) === 0;

  // ---- at rest ----
  let p = await open();
  let f = await fx(p);
  check('at rest the layer is not drawn', f.vis === 'hidden' && f.op === 0 && f.cls === '', JSON.stringify([f.vis, f.op, f.cls]));
  check('the layer has no fill of its own: no flash and no glow from the middle', /^none /.test(f.bg) && /rgba\(0, 0, 0, 0\)/.test(f.bg) && f.shadow === 'none' && f.fill === 'none', f.bg + ' | ' + f.shadow + ' | ' + f.fill);
  check('it never takes a click', (await p.evaluate(() => getComputedStyle(document.getElementById('fx')).pointerEvents)) === 'none');
  const label = await p.evaluate(() => document.querySelector('#set-fx').parentNode.textContent);
  check('the setting says what it does now', !/ightning/.test(await p.textContent('#settings')) && /burning edge/i.test(label), label);

  // ---- a 12 ----
  await roll(p, 6, 6);
  f = await fx(p);
  check('a 12 burns the edge', f.cls === 'fx-crit' && f.anim === 'fxburn' && f.dur === '1.6s', JSON.stringify([f.cls, f.anim, f.dur]));
  check('while it burns the layer is drawn', f.vis === 'visible', f.vis);
  check('dark: the edge is ember orange, roughened by the filter', f.stroke === 'rgb(184, 116, 28)' && /fxrough"?\)/.test(f.filter), f.stroke + ' ' + f.filter);
  await p.waitForTimeout(1900);
  f = await fx(p);
  check('afterwards it is put away again', f.vis === 'hidden' && f.op === 0, f.vis + ' ' + f.op);

  // ---- a miss ----
  await roll(p, 1, 1);
  f = await fx(p);
  const shook = await p.evaluate(() => document.querySelector('.wrap').classList.contains('shake'));
  check('a miss burns the edge red and shakes the page', f.cls === 'fx-miss' && f.anim === 'fxburn' && f.stroke === 'rgb(122, 22, 22)' && shook, JSON.stringify([f.cls, f.stroke, shook]));
  await p.waitForTimeout(1700);

  // ---- a level-up ----
  await p.evaluate(() => window.__journal.fxPlay('level'));
  f = await fx(p);
  check('a level-up burns the edge for longer', f.cls === 'fx-level' && f.anim === 'fxburn' && f.dur === '2.2s' && f.stroke === 'rgb(184, 116, 28)', JSON.stringify([f.cls, f.dur, f.stroke]));

  // ---- where it draws: the edges change, the middle does not ----
  p = await open();
  const mid = { x: 350, y: 300, width: 400, height: 300 }, edge = { x: 0, y: 300, width: 8, height: 200 }, top = { x: 300, y: 0, width: 400, height: 6 };
  const before = [await p.screenshot({ clip: mid }), await p.screenshot({ clip: edge }), await p.screenshot({ clip: top })];
  for (const kind of ['crit', 'miss', 'level']) {
    await hold(p, kind); await p.waitForTimeout(250);
    const op = (await fx(p)).op;
    check(kind + ': held while it is bright', op > .6, op);
    check(kind + ': the middle of the screen is untouched', same(before[0], await p.screenshot({ clip: mid })));
    check(kind + ': the left and top edges are lit', !same(before[1], await p.screenshot({ clip: edge })) && !same(before[2], await p.screenshot({ clip: top })));
    if (kind !== 'level') await p.screenshot({ path: path.join(__dirname,'out','moment-' + kind + '-dark.png') });
  }
  await hold(p, ''); await p.waitForTimeout(150);
  check('put away: the screen is exactly as it was', same(before[0], await p.screenshot({ clip: mid })) && same(before[1], await p.screenshot({ clip: edge })));

  // ---- the light look, and My device ----
  p = await open({}, 'light');
  await hold(p, 'crit'); f = await fx(p);
  check('light: a burnt brown edge', f.stroke === 'rgb(138, 74, 12)', f.stroke);
  await p.waitForTimeout(250); await p.screenshot({ path: path.join(__dirname,'out','moment-crit-light.png') });
  await hold(p, 'miss'); f = await fx(p);
  check('light: a miss is red', f.stroke === 'rgb(168, 36, 36)', f.stroke);
  p = await open({ colorScheme: 'dark' }, 'device');
  await hold(p, 'crit'); f = await fx(p);
  check('My device on a dark device: the dark colors', f.stroke === 'rgb(184, 116, 28)', f.stroke);

  // ---- a phone ----
  p = await open({ viewport: { width: 390, height: 800 } });
  await roll(p, 6, 6);
  f = await fx(p);
  check('phone: a thinner, finer edge', f.sw === '40px' && /fxrough-s"?\)/.test(f.filter), f.sw + ' ' + f.filter);
  const wide = await p.evaluate(() => document.documentElement.scrollWidth);
  check('phone: no sideways scroll while it burns', wide <= 390, wide);
  await p.waitForTimeout(1900);
  await p.locator('#roll').scrollIntoViewIfNeeded();
  const box = await p.evaluate(() => { const r = document.querySelector('#roll').getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2 - 40), y: Math.round(r.top + 6), width: 80, height: Math.round(r.height - 12) }; });
  const plain = await p.screenshot({ clip: box });
  await hold(p, 'crit'); await p.waitForTimeout(250);
  check('phone: the middle of the Roll button is not covered', same(plain, await p.screenshot({ clip: box })), JSON.stringify(box));
  await p.screenshot({ path: path.join(__dirname,'out','moment-crit-phone.png') });

  // ---- reduced motion, and switched off ----
  p = await open({ reducedMotion: 'reduce' });
  await roll(p, 6, 6);
  f = await fx(p);
  check('reduced motion: nothing is drawn on a 12', f.cls === '' && f.vis === 'hidden', f.cls + ' ' + f.vis);
  await p.evaluate(() => { document.getElementById('fx').className = 'fx-crit'; });
  f = await fx(p);
  check('reduced motion: even with the class set there is no animation', f.anim === 'none' && f.vis === 'hidden', f.anim + ' ' + f.vis);
  p = await open();
  await p.evaluate(() => { document.querySelector('#settings').open = true; }); await p.uncheck('#set-fx');
  await roll(p, 6, 6); await roll(p, 1, 1);
  f = await fx(p);
  check('switched off: nothing on a 12 or a miss', f.cls === '' && f.vis === 'hidden', f.cls);
  await p.evaluate(() => { document.querySelector('#settings').open = true; }); await p.check('#set-fx');
  f = await fx(p);
  check('switching it back on shows a sample', f.cls === 'fx-crit' && f.vis === 'visible', f.cls + ' ' + f.vis);

  console.log(results.map(r=>r.join(' | ')).join('\n'));
  const fails = results.filter(r=>r[0]==='FAIL').length;
  console.log('\nTOTAL', results.length, 'FAIL', fails); console.log('ERRORS', errs);
  await b.close();
  if (fails || errs.length) process.exit(1);
})().catch(e=>{ console.log(results.map(r=>r.join(' | ')).join('\n')); console.log('CRASH', e.message.split('\n').slice(0,6).join('\n')); console.log('ERRORS', errs); process.exit(1); });
