// The round portrait's crop: which part of the photo the circle on Play and the Roller shows, set by dragging or by three sliders under the photo on My sheet.
require('fs').mkdirSync(require('path').join(__dirname,'out'),{recursive:true});
const { chromium } = require('playwright');
const path = require('path'); const zlib = require('zlib');
const URL = 'file://'+path.join(__dirname,'..','index.html');
const results = []; const errs = [];
function check(name, ok, extra){ results.push([ok?'PASS':'FAIL', name, extra===undefined?'':String(extra)]); }
// the color of one pixel of the page, read out of a 1 by 1 screenshot
function rgb(png) {
  let i = 8, idat = [];
  while (i < png.length) { const len = png.readUInt32BE(i), type = png.toString('latin1', i + 4, i + 8); if (type === 'IDAT') idat.push(png.subarray(i + 8, i + 8 + len)); i += 12 + len; }
  const raw = zlib.inflateSync(Buffer.concat(idat)); return [raw[1], raw[2], raw[3]];
}
const near = (c, want) => c.every((v, i) => Math.abs(v - want[i]) < 40);
const RED = [200, 30, 30], YELLOW = [220, 200, 40], GREEN = [30, 160, 60], BLUE = [40, 60, 200];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(()=>chromium.launch());
  // a tall photo in four bands, top to bottom: red to 30%, yellow to 45%, green to 55%, blue below. Which band sits in the middle of the circle says where the crop is.
  const mk = await (await b.newContext()).newPage();
  const photo = await mk.evaluate((cols) => { const c = document.createElement('canvas'); c.width = 300; c.height = 600; const x = c.getContext('2d'); [[0, .3], [.3, .45], [.45, .55], [.55, 1]].forEach((r, i) => { x.fillStyle = 'rgb(' + cols[i].join(',') + ')'; x.fillRect(0, r[0] * 600, 300, (r[1] - r[0]) * 600 + 1); }); return { jpg: c.toDataURL('image/jpeg', .95), png: c.toDataURL('image/png') }; }, [RED, YELLOW, GREEN, BLUE]);
  const wide = await mk.evaluate(() => { const c = document.createElement('canvas'); c.width = 600; c.height = 300; const x = c.getContext('2d'); x.fillStyle = '#888'; x.fillRect(0, 0, 600, 300); return c.toDataURL('image/png'); });
  await mk.context().close();

  const open = async (save, opts, hash) => {
    const ctx = await b.newContext(Object.assign({ viewport: { width: 1100, height: 900 }, colorScheme: 'dark' }, opts));
    await ctx.addInitScript((j) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hunters-journal-v1', j); sessionStorage.setItem('seeded', '1'); } }, JSON.stringify(save));
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
    p.on('console', m => { if (m.type()==='error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
    await p.goto(URL + (hash || '#play')); await p.waitForTimeout(700);
    return p;
  };
  const sheet = (more) => ({ hv: 'sheet', sheet: Object.assign({ name: 'Dee Ray', playbook: 'The Mundane', luck: 5, photo: photo.jpg, stats: { charm: 0, cool: 0, sharp: 0, tough: 0, weird: 0 } }, more) });
  const mid = async (p, sel) => { const r = await p.evaluate((s) => { const e = document.querySelector(s); e.scrollIntoView({ block: 'center' }); const q = e.getBoundingClientRect(); return { x: Math.round(q.left + q.width / 2), y: Math.round(q.top + q.height / 2), w: q.width, h: q.height }; }, sel); return { r, c: rgb(await p.screenshot({ clip: { x: r.x, y: r.y, width: 1, height: 1 } })) }; };
  const crop = (p) => p.evaluate(() => window.__journal.S().sheet.crop);
  const slide = (p, id, v) => p.evaluate(([i, val]) => { const e = document.getElementById(i); e.value = val; e.dispatchEvent(new Event('input', { bubbles: true })); }, [id, v]);

  // ---- as it comes: a little above the middle, where faces are ----
  let p = await open(sheet());
  let m = await mid(p, '.pwho .avc');
  check('Play: the round portrait is a 48px circle with the photo inside', m.r.w === 48 && m.r.h === 48 && await p.evaluate(() => getComputedStyle(document.querySelector('.pwho .avc')).borderRadius === '50%' && getComputedStyle(document.querySelector('.pwho .avc')).overflow === 'hidden'), JSON.stringify(m.r));
  check('a new hunter starts at 50, 30, 1', JSON.stringify(await crop(p)) === '{"x":50,"y":30,"z":1}', JSON.stringify(await crop(p)));
  check('so the circle shows above the middle of a tall photo, not its middle', near(m.c, YELLOW), m.c);
  check('the picture is not stretched', await p.evaluate(() => getComputedStyle(document.querySelector('.pwho .avc img')).objectFit) === 'cover');

  // ---- the editor ----
  await p.goto(URL + '#hunter'); await p.waitForTimeout(400);
  check('My sheet offers the crop, closed to begin with', await p.isVisible('#cropbtn') && !(await p.isVisible('#cropbox')) && await p.getAttribute('#cropbtn', 'aria-expanded') === 'false');
  await p.click('#cropbtn');
  check('it opens under the photo', await p.isVisible('#cropbox') && await p.getAttribute('#cropbtn', 'aria-expanded') === 'true');
  m = await mid(p, '#cropview');
  check('the preview shows what the circle shows', near(m.c, YELLOW), m.c);
  check('a tall photo cannot move sideways until it is zoomed, so that slider waits', await p.isDisabled('#cropx') && !(await p.isDisabled('#cropy')));
  await slide(p, 'cropy', 0);
  m = await mid(p, '#cropview');
  check('Up, down at 0 shows the top of the photo', (await crop(p)).y === 0 && near(m.c, RED), JSON.stringify(await crop(p)) + ' ' + m.c);
  await slide(p, 'cropy', 100);
  m = await mid(p, '#cropview');
  check('and at 100 the bottom', near(m.c, BLUE), m.c);
  await slide(p, 'cropy', 50);
  check('the middle is the middle', near((await mid(p, '#cropview')).c, GREEN));
  await slide(p, 'cropzoom', 200);
  check('zooming in frees the sideways slider', (await crop(p)).z === 2 && !(await p.isDisabled('#cropx')), JSON.stringify(await crop(p)));
  // the frame stays filled at the extremes: every corner of the square round the circle is photo, never the frame's own background
  let gaps = 0;
  for (const [x, y] of [[0, 0], [100, 0], [0, 100], [100, 100]]) {
    await slide(p, 'cropx', x); await slide(p, 'cropy', y);
    const r = (await mid(p, '#cropview')).r;
    for (const [dx, dy] of [[-45, -45], [45, -45], [-45, 45], [45, 45]]) { const c = rgb(await p.screenshot({ clip: { x: r.x + dx, y: r.y + dy, width: 1, height: 1 } })); if (![RED, YELLOW, GREEN, BLUE].some(w => near(c, w))) gaps++; }
  }
  check('zoomed and pushed into each corner, the circle is still full of photo', gaps === 0, gaps);
  await p.click('#cropreset');
  check('Reset puts it back', JSON.stringify(await crop(p)) === '{"x":50,"y":30,"z":1}', JSON.stringify(await crop(p)));

  // ---- dragging: the picture follows the pointer ----
  let r = (await mid(p, '#cropview')).r;
  await p.mouse.move(r.x, r.y); await p.mouse.down(); await p.mouse.move(r.x + 5, r.y + 20, { steps: 3 }); await p.mouse.move(r.x + 30, r.y + 43, { steps: 4 });
  const during = await p.evaluate(() => document.getElementById('cropview').classList.contains('drag'));
  await p.mouse.up();
  let c = await crop(p);
  check('pulling the photo down shows more of its top', during && c.y < 5 && c.y >= 0 && c.x === 50, JSON.stringify(c));
  check('the circle shows the top now', near((await mid(p, '#cropview')).c, RED));
  check('letting go ends the drag', !(await p.evaluate(() => document.getElementById('cropview').classList.contains('drag'))));
  await p.mouse.move(r.x, r.y); await p.mouse.down(); await p.mouse.move(r.x, r.y - 400, { steps: 4 }); await p.mouse.up();
  c = await crop(p);
  check('it cannot be dragged off the end', c.y === 100, JSON.stringify(c));
  await slide(p, 'cropy', 2);
  await p.click('#cropdone');
  check('Done closes it and hands the focus back', !(await p.isVisible('#cropbox')) && await p.evaluate(() => document.activeElement.id) === 'cropbtn');

  // ---- it is used everywhere the circle is, and it is saved ----
  await p.goto(URL + '#play'); await p.waitForTimeout(300);
  check('Play follows', near((await mid(p, '.pwho .avc')).c, RED));
  await p.goto(URL + '#roll'); await p.waitForTimeout(300);
  m = await mid(p, '.rollas .avc');
  check('the Roller follows', m.r.w === 44 && near(m.c, RED), JSON.stringify(m.r) + ' ' + m.c);
  await p.waitForTimeout(900); await p.reload(); await p.waitForTimeout(700);
  check('it is still there after a reload', (await crop(p)).y === 2 && near((await mid(p, '.rollas .avc')).c, RED), JSON.stringify(await crop(p)));
  await p.screenshot({ path: path.join(__dirname,'out','crop-roller.png') });

  // ---- a different photo starts over; no photo falls back to the playbook's picture or nothing ----
  await p.goto(URL + '#hunter'); await p.waitForTimeout(300);
  await p.setInputFiles('#photo', { name: 'wide.png', mimeType: 'image/png', buffer: Buffer.from(wide.split(',')[1], 'base64') });
  await p.waitForTimeout(500);
  check('a new photo starts from the usual place', JSON.stringify(await crop(p)) === '{"x":50,"y":30,"z":1}', JSON.stringify(await crop(p)));
  await p.click('#cropbtn');
  check('a wide photo moves sideways and not up and down', !(await p.isDisabled('#cropx')) && await p.isDisabled('#cropy'));
  await p.screenshot({ path: path.join(__dirname,'out','crop-editor.png') });
  await slide(p, 'cropx', 80);
  await p.click('#rmphoto'); await p.waitForTimeout(300);
  check('removing the photo starts over too', JSON.stringify(await crop(p)) === '{"x":50,"y":30,"z":1}', JSON.stringify(await crop(p)));

  // ---- each hunter has their own ----
  p = await open(sheet({ crop: { x: 50, y: 0, z: 1 } }), {}, '#hunter');
  await p.click('[data-hn="new"]'); await p.waitForTimeout(400);
  check('a new hunter has no crop to offer and starts fresh', JSON.stringify(await crop(p)) === '{"x":50,"y":30,"z":1}' && !(await p.isVisible('#cropbtn')), JSON.stringify(await crop(p)));
  check('with no photo and no playbook the circle is an empty disc', await p.evaluate(() => { const s = window.__journal.S().sheet; return !s.photo && !s.playbook; }) && await p.evaluate(() => !!document.querySelector('#play-status .av') && !document.querySelector('#play-status .avc')));
  await p.click('[data-hn="switch"]'); await p.waitForTimeout(400);
  check('switching back brings the first hunter\'s crop with them', (await crop(p)).y === 0, JSON.stringify(await crop(p)));

  // ---- an odd or hostile save cannot get past the three numbers ----
  p = await open(sheet({ crop: { x: '50%;background:url(//x)', y: 9999, z: -5, extra: 'x' } }));
  const st = await p.evaluate(() => document.querySelector('.pwho .avc img').getAttribute('style'));
  check('text where a number belongs is ignored, and numbers are kept in range', st === 'object-position:50% 100%;transform-origin:50% 100%;transform:scale(1)', st);
  p = await open(sheet({ crop: 'javascript:alert(1)' }));
  check('a crop that is not a set of numbers at all gives the usual place', await p.evaluate(() => document.querySelector('.pwho .avc img').getAttribute('style')) === 'object-position:50% 30%;transform-origin:50% 30%;transform:scale(1)');
  const old = sheet(); delete old.sheet.crop;
  p = await open(old);
  check('a save from before this has the usual place', JSON.stringify(await crop(p)) === '{"x":50,"y":30,"z":1}');

  // ---- a phone ----
  p = await open(sheet(), { viewport: { width: 390, height: 800 } }, '#hunter');
  await p.click('#cropbtn');
  const ph = await p.evaluate(() => { const b = document.getElementById('cropbox').getBoundingClientRect(); return { wide: document.documentElement.scrollWidth, l: b.left, r: b.right, ta: getComputedStyle(document.getElementById('cropview')).touchAction }; });
  check('phone: the editor fits and the page does not scroll sideways', ph.wide <= 390 && ph.l >= 0 && ph.r <= 390, JSON.stringify(ph));
  check('phone: a finger on the preview moves the photo, not the page', ph.ta === 'none', ph.ta);
  await p.evaluate(() => document.getElementById('cropbox').scrollIntoView({ block: 'center' }));
  await p.screenshot({ path: path.join(__dirname,'out','crop-phone.png') });

  console.log(results.map(r=>r.join(' | ')).join('\n'));
  const fails = results.filter(r=>r[0]==='FAIL').length;
  console.log('\nTOTAL', results.length, 'FAIL', fails); console.log('ERRORS', errs);
  await b.close();
  if (fails || errs.length) process.exit(1);
})().catch(e=>{ console.log(results.map(r=>r.join(' | ')).join('\n')); console.log('CRASH', e.message.split('\n').slice(0,6).join('\n')); console.log('ERRORS', errs); process.exit(1); });
