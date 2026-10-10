// Big moments. Bad news is at the edge of the screen: a miss burns a ragged red edge round it and shakes the page. Good news is where the player is looking.
// A 12+ happens at the dice (Jacob chose it on 2026-10-10 from three): a ring and sparks from each die, a hop, the total in gold.
// A level-up is the same idea at the level number on My sheet (his ask the same day): three rings, two sprays of sparks, the number jumps and lands gold, its card glints.
// Neither puts anything at the edge of the screen. Nothing is drawn between moments, the colors follow the theme, a phone gets the finer edge, and reduced motion gets nothing.
require('fs').mkdirSync(require('path').join(__dirname,'out'),{recursive:true});
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://'+path.join(__dirname,'..','index.html');
const results = []; const errs = [];
function check(name, ok, extra){ results.push([ok?'PASS':'FAIL', name, extra===undefined?'':String(extra)]); }
const HUNTER = { hv: 'sheet', sheet: { name: 'Dee Ray', playbook: 'The Mundane', luck: 5, xp: 5, level: 2, stats: { charm: 0, cool: 0, sharp: 0, tough: 0, weird: 0 } } };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(()=>chromium.launch());
  const open = async (opts, theme, more, tab) => {
    const ctx = await b.newContext(Object.assign({ viewport: { width: 1100, height: 900 }, colorScheme: 'dark' }, opts));
    // dice: push faces onto window.__dice and the next rolls use them in order
    await ctx.addInitScript(() => {
      window.__dice = [];
      const real = crypto.getRandomValues.bind(crypto);
      crypto.getRandomValues = function (a) { if (a instanceof Uint8Array && a.length === 1 && window.__dice.length) { a[0] = window.__dice.shift() - 1; return a; } return real(a); };
    });
    await ctx.addInitScript((j) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hunters-journal-v1', j); sessionStorage.setItem('seeded', '1'); } }, JSON.stringify(Object.assign({ settings: Object.assign({ fx: true, theme: theme || 'dark' }, more || {}) }, HUNTER)));
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
    p.on('console', m => { if (m.type()==='error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
    await p.goto(URL+'#' + (tab || 'roll')); await p.waitForTimeout(600);
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
  // hold the edge still while it is bright (it peaks about 50ms in), or (with no kind) put it away again
  const hold = (p, kind) => p.evaluate((k) => { const f = document.getElementById('fx'); f.className = ''; f.style.animationPlayState = k ? 'paused' : ''; f.style.animationDelay = k ? '-0.05s' : ''; void f.offsetWidth; if (k) f.className = 'fx-' + k; }, kind);
  const same = (x, y) => Buffer.compare(x, y) === 0;
  // the 12+ at the dice
  const burst = (pg) => pg.evaluate(() => { const fxb = document.getElementById('trayfx'); if (!fxb) return { on: false, sparks: 0, rings: 0, tray: document.getElementById('tray').classList.contains('crit') };
    const rings = [...fxb.querySelectorAll('.rng')].map(e => e.getBoundingClientRect()), dice = [...document.querySelectorAll('#dice .slot')].map(e => e.getBoundingClientRect()), tb = document.getElementById('tray').getBoundingClientRect(), mid = (r) => r.left + r.width / 2;
    return { on: true, sparks: fxb.querySelectorAll('.spk').length, rings: rings.length, at: Math.abs(mid(rings[0]) - mid(dice[0])) < 12 && Math.abs(mid(rings[2]) - mid(dice[1])) < 12, inside: fxb.parentNode.id === 'tray' && getComputedStyle(fxb).overflow === 'hidden' && fxb.getBoundingClientRect().right <= tb.right + 1,
      hop: getComputedStyle(document.querySelector('#dice .slot')).animationName, ring: getComputedStyle(fxb.querySelector('.rng')).animationName, ringDur: parseFloat(getComputedStyle(fxb.querySelector('.rng')).animationDuration), gold: /sumgold/.test(getComputedStyle(document.getElementById('sum')).animationName),
      pe: getComputedStyle(fxb).pointerEvents, hidden: document.getElementById('tray').getAttribute('aria-hidden'), wide: document.documentElement.scrollWidth, boom: !!document.querySelector('#result .tier.boom') }; });
  // the level-up at the level number
  const lvl = (pg) => pg.evaluate(() => { const box = document.getElementById('lvfx'), el = document.getElementById('lvl'), r = el.getBoundingClientRect(); const base = { n: +el.textContent, up: el.classList.contains('up'), glint: document.querySelectorAll('.card.lvcard').length, wide: document.documentElement.scrollWidth };
    if (!box) return Object.assign({ on: false }, base);
    const b = box.getBoundingClientRect(), ring = box.querySelector('.rng'), spk = [...box.querySelectorAll('.spk')];
    return Object.assign({ on: true, rings: box.querySelectorAll('.rng').length, sparks: spk.length, late: spk.filter(e => parseFloat(getComputedStyle(e).animationDelay) >= .19).length, at: Math.abs(b.left - (r.left + r.width / 2)) < 2 && Math.abs(b.top - (r.top + r.height / 2)) < 2, ring: getComputedStyle(ring).animationName, ringDur: parseFloat(getComputedStyle(ring).animationDuration), ringCol: getComputedStyle(ring).borderTopColor,
      pop: getComputedStyle(el).animationName, card: el.closest('.card').classList.contains('lvcard') ? getComputedStyle(el.closest('.card')).animationName : '', pe: getComputedStyle(box).pointerEvents, pos: getComputedStyle(box).position, hidden: box.getAttribute('aria-hidden'), inBody: box.parentNode === document.body }, base); });
  const levelUp = async (pg) => { await pg.click('#dolevel'); await pg.locator('[data-lvl]:not([disabled])').first().click(); };

  // ---- at rest ----
  let p = await open();
  let f = await fx(p);
  check('at rest the edge is not drawn', f.vis === 'hidden' && f.op === 0 && f.cls === '', JSON.stringify([f.vis, f.op, f.cls]));
  check('the layer has no fill of its own: no flash and no glow from the middle', /^none /.test(f.bg) && /rgba\(0, 0, 0, 0\)/.test(f.bg) && f.shadow === 'none' && f.fill === 'none', f.bg + ' | ' + f.shadow + ' | ' + f.fill);
  check('it never takes a click', (await p.evaluate(() => getComputedStyle(document.getElementById('fx')).pointerEvents)) === 'none');
  const label = await p.evaluate(() => document.querySelector('#set-fx').parentNode.textContent);
  check('the setting says what it does now', !/ightning/.test(await p.textContent('#settings')) && /sparks at the dice on a 12\+ and at your level/i.test(label) && /burnt edge/i.test(label), label);
  check('the looks that were not chosen have left no trace: no picker, no stamp, no sweep, no fire', (await p.evaluate(() => document.querySelectorAll('[data-crit], #critpick, #fxs, #seal12, #fxg').length)) === 0 && (await p.evaluate(() => window.__art.fxflame)) === undefined);
  let d = await burst(p);
  check('at rest there is nothing in the tray but the dice', !d.on && !d.tray);

  // ---- a 12: at the dice ----
  await roll(p, 6, 6);
  d = await burst(p);
  check('a 12: a ring and a spray of sparks leave each die', d.on && d.rings === 4 && d.sparks >= 24 && d.at, JSON.stringify(d));
  check('a 12: the dice hop, the total lands gold and the result pops', d.hop === 'chop' && d.gold && d.boom, JSON.stringify(d));
  check('a 12: it is quick: the ring is gone in under half a second', d.ring === 'cring' && d.ringDur <= .5, d.ring + ' ' + d.ringDur);
  check('a 12: it stays inside the tray, never takes a click, and is not read out', d.inside && d.pe === 'none' && d.hidden === 'true' && d.wide <= 1100, JSON.stringify(d));
  f = await fx(p);
  check('a 12: nothing at the edge of the screen', f.cls === '' && f.vis === 'hidden', JSON.stringify([f.cls, f.vis]));
  await p.screenshot({ path: path.join(__dirname,'out','moment-crit-dark.png') });
  await p.waitForTimeout(1400); d = await burst(p);
  check('a 12: cleared away inside a second and a half', !d.on && !d.tray && !(await p.evaluate(() => document.getElementById('sum').classList.contains('gold'))), JSON.stringify(d));
  await roll(p, 6, 6);
  await p.evaluate(() => { window.__dice.push(3, 4); document.querySelector('#copyroll').remove(); document.querySelector('#roll').click(); });
  d = await burst(p);
  check('throwing again straight away clears the sparks of the last roll', !d.on && !d.tray, JSON.stringify(d));
  await p.waitForSelector('#copyroll', { timeout: 4000 }); d = await burst(p);
  check('and a plain roll gets none', !d.on);
  p = await open({}, 'dark', { crit: 'fire' });
  await roll(p, 6, 6); d = await burst(p); f = await fx(p);
  check('a save from while there was a choice still gets the dice', d.on && d.sparks >= 24 && f.cls === '' && (await p.evaluate(() => window.__journal.S().settings.crit)) === undefined, JSON.stringify([d.on, f.cls]));

  // ---- a miss ----
  p = await open();
  await roll(p, 1, 1);
  f = await fx(p);
  const shook = await p.evaluate(() => document.querySelector('.wrap').classList.contains('shake'));
  check('a miss burns the edge red and shakes the page', f.cls === 'fx-miss' && f.anim === 'fxburn' && f.dur === '0.6s' && f.bite === 'fxbite' && f.stroke === 'rgb(122, 22, 22)' && /fxrough"?\)/.test(f.filter) && shook, JSON.stringify([f.cls, f.dur, f.stroke, shook]));
  check('while it burns the layer is drawn', f.vis === 'visible', f.vis);
  d = await burst(p);
  check('a miss gets no gold and no sparks', !d.on && !(await p.evaluate(() => !!document.getElementById('lvfx'))));
  await p.waitForTimeout(900);
  f = await fx(p);
  check('afterwards it is put away again', f.vis === 'hidden' && f.op === 0, f.vis + ' ' + f.op);

  // ---- a level-up: at the level ----
  p = await open({}, 'dark', null, 'hunter');
  let v = await lvl(p);
  check('at rest there is nothing at the level', !v.on && !v.up && v.glint === 0 && v.n === 2, JSON.stringify(v));
  await levelUp(p);
  v = await lvl(p); f = await fx(p);
  check('a level-up bursts at the level number: three rings and two sprays of sparks, the second a beat later', v.on && v.at && v.rings === 3 && v.sparks === 30 && v.late === 12 && v.n === 3, JSON.stringify(v));
  check('the number jumps and lands gold, and its card glints', /lvpop/.test(v.pop) && /sumgold/.test(v.pop) && v.up && v.card === 'lvglow' && v.glint === 1, JSON.stringify(v));
  check('it is a little bigger than a 12+ and still quick', v.ring === 'cring2' && v.ringDur > .5 && v.ringDur <= .7, v.ring + ' ' + v.ringDur);
  check('it lies over the page, never takes a click, is not read out, and nothing scrolls sideways', v.inBody && v.pos === 'fixed' && v.pe === 'none' && v.hidden === 'true' && v.wide <= 1100, JSON.stringify(v));
  check('a level-up puts nothing at the edge of the screen and does not set the dice off', f.cls === '' && f.vis === 'hidden' && !(await burst(p)).on, JSON.stringify([f.cls, f.vis]));
  check('dark: the rings are pale gold', v.ringCol === 'rgb(255, 243, 207)', v.ringCol);
  await p.waitForTimeout(120); await p.screenshot({ path: path.join(__dirname,'out','moment-level-dark.png') });
  await p.waitForTimeout(1600); v = await lvl(p);
  check('a level-up: cleared away inside two seconds', !v.on && !v.up && v.glint === 0, JSON.stringify(v));
  // from another tab the number is not on screen: there is the sound and nothing else, and no error
  await p.click('#t-roll'); await p.evaluate(() => window.__journal.fxPlay('level')); v = await lvl(p);
  check('with My sheet out of sight there is nothing to burst from, and nothing goes wrong', !v.on && !v.up);
  await p.click('#t-hunter'); await p.evaluate(() => window.__journal.fxPlay('level')); await p.evaluate(() => window.__journal.fxPlay('miss'));
  v = await lvl(p); f = await fx(p);
  check('a miss straight after a level-up clears the sparks and burns the edge', !v.on && !v.up && f.cls === 'fx-miss', JSON.stringify([v.on, f.cls]));
  await p.waitForTimeout(800);

  // ---- how the edge moves: full strength within three frames, mostly gone by half a second, and nothing left at the end ----
  const at = (p, kind, ms) => p.evaluate(([k, t]) => { const f = document.getElementById('fx'), s = f.querySelector('svg'); f.className = ''; [f, s].forEach(e => { e.style.animationPlayState = 'paused'; e.style.animationDelay = (-t / 1000) + 's'; }); void f.offsetWidth; f.className = 'fx-' + k;
    const m = new DOMMatrix(getComputedStyle(s).transform); const o = +getComputedStyle(f).opacity; f.className = ''; [f, s].forEach(e => { e.style.animationPlayState = ''; e.style.animationDelay = ''; }); return { op: o, scale: m.a }; }, [kind, ms]);
  const hit = await at(p, 'miss', 50), late = await at(p, 'miss', 420), start = await at(p, 'miss', 0);
  check('miss: at full strength 50ms in', hit.op >= .95, hit.op);
  check('miss: it starts outside the screen and snaps in past its resting place', start.scale > 1.03 && hit.scale < 1, start.scale + ' then ' + hit.scale);
  check('miss: guttering out by seven tenths of the way', late.op < .55 && late.op > 0 && Math.abs(late.scale - 1) < .002, JSON.stringify(late));

  // ---- where it draws: the edges change, the middle does not ----
  p = await open();
  const mid = { x: 350, y: 300, width: 400, height: 300 }, edge = { x: 0, y: 300, width: 8, height: 200 }, top = { x: 300, y: 0, width: 400, height: 6 };
  const before = [await p.screenshot({ clip: mid }), await p.screenshot({ clip: edge }), await p.screenshot({ clip: top })];
  await hold(p, 'miss'); await p.waitForTimeout(250);
  check('miss: held while it is bright', (await fx(p)).op > .6, (await fx(p)).op);
  check('miss: the middle of the screen is untouched', same(before[0], await p.screenshot({ clip: mid })));
  check('miss: the left and top edges are lit', !same(before[1], await p.screenshot({ clip: edge })) && !same(before[2], await p.screenshot({ clip: top })));
  await p.screenshot({ path: path.join(__dirname,'out','moment-miss-dark.png') });
  await hold(p, ''); await p.waitForTimeout(150);
  check('put away: the screen is exactly as it was', same(before[0], await p.screenshot({ clip: mid })) && same(before[1], await p.screenshot({ clip: edge })));
  // good news leaves the edges alone
  await roll(p, 6, 6); await p.waitForTimeout(120);
  check('a 12: the left and top edges of the screen are exactly as they were', same(before[1], await p.screenshot({ clip: edge })) && same(before[2], await p.screenshot({ clip: top })));

  // ---- the light look, and My device ----
  p = await open({}, 'light');
  await hold(p, 'miss'); f = await fx(p);
  check('light: a miss is red', f.stroke === 'rgb(168, 36, 36)', f.stroke);
  await hold(p, ''); await roll(p, 6, 6); d = await burst(p);
  const gold = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--flare').trim());
  check('light: a 12 bursts at the dice just the same, and the total uses the light look\'s gold', d.on && d.sparks >= 24 && d.gold && gold === '#c98a12', gold);
  await p.screenshot({ path: path.join(__dirname,'out','moment-crit-light.png') });
  p = await open({}, 'light', null, 'hunter');
  await levelUp(p); v = await lvl(p);
  check('light: a level-up bursts in a deeper gold that shows on a pale sheet', v.on && v.sparks === 30 && v.ringCol === 'rgb(143, 93, 0)', v.ringCol);
  await p.waitForTimeout(120); await p.screenshot({ path: path.join(__dirname,'out','moment-level-light.png') });
  p = await open({ colorScheme: 'dark' }, 'device');
  await hold(p, 'miss'); f = await fx(p);
  check('My device on a dark device: the dark colors', f.stroke === 'rgb(122, 22, 22)', f.stroke);

  // ---- a phone ----
  p = await open({ viewport: { width: 390, height: 800 } });
  await roll(p, 6, 6);
  d = await burst(p);
  check('phone: a 12 bursts at both dice, inside the tray, and nothing scrolls sideways', d.on && d.rings === 4 && d.at && d.inside && d.wide <= 390, JSON.stringify(d));
  await p.screenshot({ path: path.join(__dirname,'out','moment-crit-phone.png') });
  await p.waitForTimeout(1300);
  await roll(p, 1, 1);
  f = await fx(p);
  check('phone: a miss has a thinner, finer edge', f.sw === '40px' && /fxrough-s"?\)/.test(f.filter), f.sw + ' ' + f.filter);
  check('phone: no sideways scroll while it burns', (await p.evaluate(() => document.documentElement.scrollWidth)) <= 390);
  await p.waitForTimeout(900);
  await p.locator('#roll').scrollIntoViewIfNeeded();
  const box = await p.evaluate(() => { const r = document.querySelector('#roll').getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2 - 40), y: Math.round(r.top + 6), width: 80, height: Math.round(r.height - 12) }; });
  const plain = await p.screenshot({ clip: box });
  await hold(p, 'miss'); await p.waitForTimeout(250);
  check('phone: the middle of the Roll button is not covered', same(plain, await p.screenshot({ clip: box })), JSON.stringify(box));
  p = await open({ viewport: { width: 390, height: 800 } }, 'dark', null, 'hunter');
  await p.locator('#dolevel').scrollIntoViewIfNeeded(); await levelUp(p); v = await lvl(p);
  check('phone: a level-up bursts at the level number and nothing scrolls sideways', v.on && v.at && v.sparks === 30 && v.wide <= 390, JSON.stringify(v));
  await p.waitForTimeout(120); await p.screenshot({ path: path.join(__dirname,'out','moment-level-phone.png') });

  // ---- reduced motion, and switched off ----
  p = await open({ reducedMotion: 'reduce' });
  await roll(p, 6, 6);
  d = await burst(p); f = await fx(p);
  check('reduced motion: nothing at the dice on a 12, and nothing at the edge', !d.on && !d.tray && f.cls === '' && f.vis === 'hidden', JSON.stringify(d));
  await p.evaluate(() => { document.getElementById('fx').className = 'fx-miss'; document.getElementById('tray').classList.add('crit'); });
  f = await fx(p);
  check('reduced motion: even with the classes set there is no animation', f.anim === 'none' && f.vis === 'hidden' && (await p.evaluate(() => getComputedStyle(document.querySelector('#dice .slot')).animationName)) === 'none', f.anim + ' ' + f.vis);
  p = await open({ reducedMotion: 'reduce' }, 'dark', null, 'hunter');
  await levelUp(p); v = await lvl(p);
  check('reduced motion: a level-up still happens, with nothing drawn', v.n === 3 && !v.on && !v.up && v.glint === 0, JSON.stringify(v));
  await p.evaluate(() => { document.getElementById('lvl').classList.add('up'); document.getElementById('lvl').closest('.card').classList.add('lvcard'); });
  check('reduced motion: even with the classes set the number and the card do not move', (await p.evaluate(() => getComputedStyle(document.getElementById('lvl')).animationName + ' ' + getComputedStyle(document.querySelector('.card.lvcard')).animationName)) === 'none none');
  p = await open();
  await p.evaluate(() => { document.querySelector('#settings').open = true; }); await p.uncheck('#set-fx');
  await roll(p, 6, 6); d = await burst(p);
  await roll(p, 1, 1);
  f = await fx(p);
  await p.click('#t-hunter'); await levelUp(p); v = await lvl(p);
  check('switched off: nothing on a 12, a miss or a level-up', !d.on && f.cls === '' && f.vis === 'hidden' && !v.on && !v.up && v.n === 3, f.cls);
  await p.click('#t-roll'); await p.evaluate(() => { document.querySelector('#settings').open = true; }); await p.check('#set-fx');
  check('switching it back on shows a sample at the dice', (await burst(p)).on);

  console.log(results.map(r=>r.join(' | ')).join('\n'));
  const fails = results.filter(r=>r[0]==='FAIL').length;
  console.log('\nTOTAL', results.length, 'FAIL', fails); console.log('ERRORS', errs);
  await b.close();
  if (fails || errs.length) process.exit(1);
})().catch(e=>{ console.log(results.map(r=>r.join(' | ')).join('\n')); console.log('CRASH', e.message.split('\n').slice(0,6).join('\n')); console.log('ERRORS', errs); process.exit(1); });
