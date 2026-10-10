// Big moments. A miss burns a ragged red edge round the screen and shakes the page. A 12+ and a level-up are good news and look it: the edge glows gold, flames flare up
// along the bottom and embers rise out of them. Nothing crosses the middle of the screen, the layers are not drawn between moments,
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
    return { cls: f.className, anim: cs.animationName, dur: cs.animationDuration, bite: getComputedStyle(f.querySelector('svg')).animationName, vis: cs.visibility, op: +cs.opacity, bg: cs.backgroundImage + ' ' + cs.backgroundColor, shadow: cs.boxShadow, stroke: r.stroke, sw: r.strokeWidth, filter: r.filter, fill: r.fill };
  });
  // hold the effect still while it is bright (it peaks about 50ms in), or (with no kind) put it away again
  const hold = (p, kind) => p.evaluate((k) => { const f = document.getElementById('fx'); f.className = ''; f.style.animationPlayState = k ? 'paused' : ''; f.style.animationDelay = k ? '-0.05s' : ''; void f.offsetWidth; if (k) f.className = 'fx-' + k; }, kind);
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
  check('a 12 burns the edge, and it is over inside a second', f.cls === 'fx-crit' && f.anim === 'fxburn' && f.dur === '0.8s' && f.bite === 'fxbite', JSON.stringify([f.cls, f.anim, f.dur, f.bite]));
  check('while it burns the layer is drawn', f.vis === 'visible', f.vis);
  check('dark: on a 12 the edge is gold, roughened by the filter', f.stroke === 'rgb(242, 188, 60)' && /fxrough"?\)/.test(f.filter), f.stroke + ' ' + f.filter);
  const glory = (pg) => pg.evaluate(() => { const g = document.getElementById('fxg'), H = innerHeight, box = (e) => e.getBoundingClientRect(); const fl = [...g.querySelectorAll('.fl')], em = [...g.querySelectorAll('.em')];
    return { cls: g.className, vis: getComputedStyle(g).visibility, fl: fl.length, em: em.length, pe: getComputedStyle(g).pointerEvents, art: window.__art.fxflame,
      top: Math.min.apply(null, fl.concat(em).map(e => box(e).top / H).concat([1])), frames: fl[0] ? getComputedStyle(fl[0].firstChild).animationName + ' ' + getComputedStyle(fl[0].firstChild).animationTimingFunction : '',
      spread: fl.length ? [Math.min.apply(null, fl.map(e => box(e).left)), Math.max.apply(null, fl.map(e => box(e).right))] : [], wide: document.documentElement.scrollWidth }; });
  let g = await glory(p);
  check('a 12 lights the fire: flames across the bottom and embers, and it never takes a click', g.cls === 'on' && g.vis === 'visible' && g.art && g.fl >= 8 && g.em >= 16 && g.pe === 'none', JSON.stringify(g));
  check('the flames are real frames: a strip of 20 stepped behind each window', /^fxframes steps\(20/.test(g.frames), g.frames);
  check('they reach from one side of the screen to the other', g.spread[0] <= 20 && g.spread[1] >= 1080, g.spread.join(' '));
  check('fire and embers start in the lowest three tenths of the screen', g.top >= .68, g.top);
  await p.waitForTimeout(1100);
  f = await fx(p);
  check('afterwards it is put away again', f.vis === 'hidden' && f.op === 0, f.vis + ' ' + f.op);
  await p.waitForTimeout(900); g = await glory(p);
  check('and the fire is cleared away', g.cls === '' && g.vis === 'hidden' && g.fl === 0 && g.em === 0, JSON.stringify(g));

  // ---- a miss ----
  await roll(p, 1, 1);
  f = await fx(p);
  const shook = await p.evaluate(() => document.querySelector('.wrap').classList.contains('shake'));
  check('a miss burns the edge red and shakes the page', f.cls === 'fx-miss' && f.anim === 'fxburn' && f.dur === '0.6s' && f.stroke === 'rgb(122, 22, 22)' && shook, JSON.stringify([f.cls, f.dur, f.stroke, shook]));
  g = await glory(p);
  check('a miss gets no fire and no gold', g.cls === '' && g.fl === 0 && g.em === 0, JSON.stringify(g));
  await p.waitForTimeout(1000);

  // ---- a level-up ----
  await p.evaluate(() => window.__journal.fxPlay('level'));
  f = await fx(p);
  check('a level-up glows gold for longer, in two strikes', f.cls === 'fx-level' && f.anim === 'fxburn2' && f.dur === '1.3s' && f.bite === 'fxbite2' && f.stroke === 'rgb(242, 188, 60)', JSON.stringify([f.cls, f.anim, f.dur, f.bite, f.stroke]));
  g = await glory(p);
  const lv = await p.evaluate(() => getComputedStyle(document.querySelector('#fxg .fl')).animationName);
  check('and its fire flares twice, with more embers', g.cls === 'on lv' && lv === 'fxflare2' && g.em >= 22, JSON.stringify([g.cls, lv, g.em]));
  // a miss straight after puts the fire out at once
  await p.evaluate(() => window.__journal.fxPlay('miss')); g = await glory(p);
  check('a miss straight after good news puts the fire out', g.cls === '' && g.fl === 0, JSON.stringify(g));

  // ---- how it moves: full strength within three frames, mostly gone by half a second, and nothing left at the end ----
  const at = (p, kind, ms) => p.evaluate(([k, t]) => { const f = document.getElementById('fx'), s = f.querySelector('svg'); f.className = ''; [f, s].forEach(e => { e.style.animationPlayState = 'paused'; e.style.animationDelay = (-t / 1000) + 's'; }); void f.offsetWidth; f.className = 'fx-' + k;
    const m = new DOMMatrix(getComputedStyle(s).transform); const o = +getComputedStyle(f).opacity; f.className = ''; [f, s].forEach(e => { e.style.animationPlayState = ''; e.style.animationDelay = ''; }); return { op: o, scale: m.a }; }, [kind, ms]);
  for (const [kind, total] of [['crit', 800], ['miss', 600], ['level', 1300]]) {
    const hit = await at(p, kind, 50), late = await at(p, kind, total * .7), start = await at(p, kind, 0);
    check(kind + (kind === 'level' ? ': the first, lighter strike has landed 50ms in' : ': at full strength 50ms in'), hit.op >= (kind === 'level' ? .8 : .95), hit.op);
    check(kind + ': it starts outside the screen and snaps in past its resting place', start.scale > 1.03 && hit.scale < 1, start.scale + ' then ' + hit.scale);
    check(kind + ': guttering out by seven tenths of the way', late.op < .55 && late.op > 0 && Math.abs(late.scale - 1) < .002, JSON.stringify(late));
  }
  const second = await at(p, 'level', 338), between = await at(p, 'level', 270);
  check('level-up: the second strike is harder than the first and reaches further in', second.op > .97 && between.op < .4 && second.scale < .975, JSON.stringify([between, second]));

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
  await p.evaluate(() => window.__journal.fxPlay('level')); await p.waitForTimeout(420);
  const lit = await p.screenshot({ clip: { x: 300, y: 760, width: 500, height: 130 } });
  check('with the fire burning, the middle of the screen is still untouched', same(before[0], await p.screenshot({ clip: mid })));
  await p.screenshot({ path: path.join(__dirname,'out','moment-fire-dark.png') });
  await p.waitForTimeout(2300);
  check('the fire did draw along the bottom, and has gone', !same(lit, await p.screenshot({ clip: { x: 300, y: 760, width: 500, height: 130 } })));
  check('put away: the screen is exactly as it was', same(before[0], await p.screenshot({ clip: mid })) && same(before[1], await p.screenshot({ clip: edge })));

  // ---- the light look, and My device ----
  p = await open({}, 'light');
  await hold(p, 'crit'); f = await fx(p);
  check('light: a deeper gold edge', f.stroke === 'rgb(201, 138, 18)', f.stroke);
  await p.waitForTimeout(250); await p.screenshot({ path: path.join(__dirname,'out','moment-crit-light.png') });
  await hold(p, 'miss'); f = await fx(p);
  check('light: a miss is red', f.stroke === 'rgb(168, 36, 36)', f.stroke);
  p = await open({ colorScheme: 'dark' }, 'device');
  await hold(p, 'crit'); f = await fx(p);
  check('My device on a dark device: the dark colors', f.stroke === 'rgb(242, 188, 60)', f.stroke);

  // ---- a phone ----
  p = await open({ viewport: { width: 390, height: 800 } });
  await roll(p, 6, 6);
  f = await fx(p);
  check('phone: a thinner, finer edge', f.sw === '40px' && /fxrough-s"?\)/.test(f.filter), f.sw + ' ' + f.filter);
  const wide = await p.evaluate(() => document.documentElement.scrollWidth);
  check('phone: no sideways scroll while it burns', wide <= 390, wide);
  g = await glory(p);
  check('phone: the fire fits the narrow screen and stays low', g.fl >= 4 && g.top >= .68 && g.wide <= 390, JSON.stringify(g));
  await p.waitForTimeout(1100);
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
  g = await glory(p);
  check('reduced motion: no fire either', g.cls === '' && g.fl === 0 && g.em === 0, JSON.stringify(g));
  await p.evaluate(() => { document.getElementById('fx').className = 'fx-crit'; });
  f = await fx(p);
  check('reduced motion: even with the class set there is no animation', f.anim === 'none' && f.vis === 'hidden', f.anim + ' ' + f.vis);
  p = await open();
  await p.evaluate(() => { document.querySelector('#settings').open = true; }); await p.uncheck('#set-fx');
  await roll(p, 6, 6); await roll(p, 1, 1);
  f = await fx(p);
  check('switched off: nothing on a 12 or a miss', f.cls === '' && f.vis === 'hidden' && (await glory(p)).em === 0, f.cls);
  await p.evaluate(() => { document.querySelector('#settings').open = true; }); await p.check('#set-fx');
  f = await fx(p);
  check('switching it back on shows a sample', f.cls === 'fx-crit' && f.vis === 'visible', f.cls + ' ' + f.vis);

  console.log(results.map(r=>r.join(' | ')).join('\n'));
  const fails = results.filter(r=>r[0]==='FAIL').length;
  console.log('\nTOTAL', results.length, 'FAIL', fails); console.log('ERRORS', errs);
  await b.close();
  if (fails || errs.length) process.exit(1);
})().catch(e=>{ console.log(results.map(r=>r.join(' | ')).join('\n')); console.log('CRASH', e.message.split('\n').slice(0,6).join('\n')); console.log('ERRORS', errs); process.exit(1); });
