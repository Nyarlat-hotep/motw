// 3D dice: off by default, loads three.js only when switched on, lands on the rolled numbers, fuel finish, fallback, phone width.
// Module scripts cannot load from file://, so this test serves the repo over http itself.
require('fs').mkdirSync(require('path').join(__dirname,'out'),{recursive:true});
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), http = require('http');
const ROOT = path.join(__dirname,'..');
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.jpg':'image/jpeg', '.png':'image/png', '.webmanifest':'application/manifest+json' };
const results = []; const errs = [];
function check(name, ok, extra){ results.push([ok?'PASS':'FAIL', name, extra===undefined?'':String(extra)]); }
(async () => {
  let noHdr = false;
  const srv = http.createServer((q, r) => {
    const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0].split('#')[0]).replace(/^\/$/, '/index.html'));
    if ((noHdr && /[.]hdr$/.test(f)) || f.indexOf(ROOT) !== 0 || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
  });
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok));
  const URL = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(()=>chromium.launch());
  const open = async (opts, seed, url) => {
    const ctx = await b.newContext(Object.assign({ viewport: { width: 1100, height: 900 }, colorScheme: 'dark', serviceWorkers: 'block' }, opts));
    if (seed) await ctx.addInitScript((v) => { if (!localStorage.getItem('hunters-journal-v1')) localStorage.setItem('hunters-journal-v1', JSON.stringify(v)); }, seed);
    const p = await ctx.newPage(); p.reqs = [];
    p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
    p.on('console', m => { if (m.type()==='error' && !/Failed to load resource|blocked by CORS policy/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
    p.on('request', q => p.reqs.push(q.url()));
    await p.goto((url || URL) + '#roll'); await p.waitForTimeout(700);
    return p;
  };
  const d3 = (p) => p.evaluate(() => ({ state: __d3.state, vals: __d3.dice.map(d => d.val), n: __d3.dice.length, anim: !!__d3.anim, cv: !!document.querySelector('#tray canvas.d3cv'), on: document.getElementById('tray').classList.contains('d3on'),
    up: __d3.dice.map(d => { const u = __d3.UP[d.val], v = new __d3.T.Vector3(u[0], u[1], u[2]).applyQuaternion(d.g.quaternion); return +v.y.toFixed(3); }), y: __d3.dice.map(d => +d.g.position.y.toFixed(3)) }));
  const lit = (p) => p.evaluate(() => { __d3.renderer.render(__d3.scene, __d3.cam); const c = document.createElement('canvas'); c.width = 200; c.height = 80; const x = c.getContext('2d'); x.drawImage(__d3.canvas, 0, 0, 200, 80); const d = x.getImageData(0, 0, 200, 80).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++; return n; });
  const labels = (p) => p.evaluate(() => [].map.call(document.querySelectorAll('#dice .slot'), s => +/(\d)$/.exec(s.getAttribute('aria-label'))[1]));

  // ---- off by default ----
  const p = await open();
  check('off by default: no canvas, three.js not fetched', !(await p.locator('#tray canvas').count()) && !p.reqs.some(u => /vendor\/three/.test(u)) && (await p.evaluate(() => __d3.state))==='');
  check('regular dice are showing', (await p.evaluate(() => getComputedStyle(document.getElementById('dice')).visibility))==='visible');
  check('Fuel is offered as a finish and Last Tank as a set', await p.evaluate(() => { document.getElementById('dp-open').click(); return !!document.querySelector('[data-dp-set="finish"][data-v="fuel"]') && !!document.querySelector('[data-dp-use="x:tank"]'); }));
  await p.click('[data-dp-use="x:tank"]');
  check('Last Tank without 3D: flat fuel look and a hint to turn 3D on', /fin-fuel/.test(await p.getAttribute('#dice .slot','class')) && (await p.locator('[data-dp-3d]').count())===1);
  check('Last Tank passes the pip readability rule', !(await p.locator('.dp-warn').count()));

  // ---- turn on from the hint ----
  await p.click('[data-dp-3d]'); await p.waitForFunction(() => __d3.state === 'on' && __d3.floorOn, null, { timeout: 15000 });
  let s = await d3(p);
  check('3D on: three.js fetched once, canvas over the tray, regular dice hidden', p.reqs.filter(u => /vendor\/three/.test(u)).length===1 && s.cv && s.on && (await p.evaluate(() => getComputedStyle(document.getElementById('dice')).visibility))==='hidden');
  check('the setting is saved and the switch shows it', await p.evaluate(() => { window.dispatchEvent(new Event('pagehide')); return JSON.parse(localStorage.getItem('hunters-journal-v1')).settings.dice3d === true && document.getElementById('set-3d').checked; }));
  check('two dice at rest showing what the page says', s.n===2 && String(s.vals)===String(await labels(p)) && s.up.every(v => v > .99) && s.y.every(v => v === .5), JSON.stringify(s));
  check('something is drawn', (await lit(p)) > 300, await lit(p));
  check('fuel dice have a liquid level with a lid on it', await p.evaluate(() => __d3.dice.every(d => !!d.plane && d.cap.geometry.drawRange.count >= 9)));
  check('the tray photo is the floor of the scene', await p.evaluate(() => __d3.floorOn && __d3.floor.visible && __d3.traySrc === 'img/tray-slate.jpg' && !__d3.sheet.visible));
  await p.locator('#tray').screenshot({ path: path.join(__dirname,'out','d3-fuel-rest.png') });

  // ---- a roll ----
  await p.click('#roll'); await p.waitForTimeout(450);
  s = await d3(p);
  check('mid-roll: dice are in the air and the button is locked', s.anim && s.y.some(v => v > .5) && await p.isDisabled('#roll'), JSON.stringify(s.y));
  await p.locator('#tray').screenshot({ path: path.join(__dirname,'out','d3-fuel-air.png') });
  await p.waitForFunction(() => !document.getElementById('roll').disabled, null, { timeout: 8000 }); await p.waitForTimeout(150);
  s = await d3(p); const lab = await labels(p);
  check('roll lands on the rolled numbers, face up, on the tray', String(s.vals)===String(lab) && s.up.every(v => v > .99) && s.y.every(v => v === .5), JSON.stringify(s)+' '+lab);
  check('total matches the 3D dice', (await p.evaluate(() => { window.dispatchEvent(new Event('pagehide')); const r = JSON.parse(localStorage.getItem('hunters-journal-v1')).rolls[0]; return r.d1 + ',' + r.d2; }))===String(s.vals));
  check('one roll was logged', (await p.evaluate(() => { window.dispatchEvent(new Event('pagehide')); return JSON.parse(localStorage.getItem('hunters-journal-v1')).rolls.length; }))===1);
  check('the liquid is still swishing just after the dice land', await p.evaluate(() => __d3.dice.some(d => Math.abs(d.sl.x) + Math.abs(d.sl.z) + Math.abs(d.sl.vx) + Math.abs(d.sl.vz) > .1)));
  await p.waitForFunction(() => !__d3.raf, null, { timeout: 30000 });
  check('the liquid settles and drawing stops', await p.evaluate(() => !__d3.anim && !__d3.raf && __d3.dice.every(d => Math.abs(d.sl.x) + Math.abs(d.sl.z) < .05)));

  // ---- skip ----
  await p.click('#roll'); await p.waitForTimeout(200); await p.click('#tray', { force: true }); await p.waitForTimeout(250);
  s = await d3(p);
  check('tapping the tray skips to the result', !(await p.isDisabled('#roll')) && String(s.vals)===String(await labels(p)) && s.up.every(v => v > .99) && s.y.every(v => v === .5), JSON.stringify(s));

  // ---- other finishes, sigil, restyle ----
  await p.click('[data-dp-use="default"]'); await p.waitForTimeout(150);
  check('changing the set rebuilds the 3D dice (bone has no liquid) and swaps the tray photo', await p.evaluate(() => __d3.dice.length === 2 && __d3.dice.every(d => !d.plane && d.die.finish === 'bone')) && await p.waitForFunction(() => __d3.traySrc === 'img/tray.jpg' && __d3.floorOn, null, { timeout: 8000 }).then(() => true, () => false));
  await p.locator('#tray').screenshot({ path: path.join(__dirname,'out','d3-bone.png') });
  for (const f of ['resin','metal','stone','wood','rust','gem']) { await p.click('[data-dp-set="finish"][data-v="'+f+'"]'); await p.waitForTimeout(120); await p.locator('#tray').screenshot({ path: path.join(__dirname,'out','d3-'+f+'.png') }); }
  check('each finish draws', (await lit(p)) > 300);
  await p.click('[data-dp-set="sigil"][data-v="skull"]'); await p.waitForTimeout(200);
  check('a sigil does not break the 3D dice', (await d3(p)).n===2);

  // ---- finishes made from material sets ----
  check('wood and rust are offered as finishes, and Scrapyard as a set', (await p.locator('[data-dp-set="finish"][data-v="wood"], [data-dp-set="finish"][data-v="rust"], [data-dp-use="x:scrap"]').count())===3);
  await p.click('[data-dp-use="x:scrap"]'); await p.waitForTimeout(400);
  check('Scrapyard passes the pip readability rule', !(await p.locator('.dp-warn').count()));
  check('rust dice: color detail, relief, shine and the rust layer all loaded, and each face has its own shine picture', await p.evaluate(()=>{ const t = __d3.tiles.rust || {}, m = __d3.dice[0].g.children[0].material[0]; return !!(t.grain && t.h && t.r && t.c) && __d3.dice[0].die.finish==='rust' && m.roughnessMap && m.roughnessMap !== m.bumpMap; }));
  check('metal and stone now have shine pictures too, bone still uses one photo', await p.evaluate(()=>!!(__d3.tiles.metal.r && __d3.tiles.metal.h && __d3.tiles.stone.r) && !__d3.tiles.bone.r));
  await p.locator('#tray').screenshot({ path: path.join(__dirname,'out','d3-scrapyard.png') });
  await p.click('[data-dp-use="default"]'); await p.waitForTimeout(200);

  // ---- trays with relief, and the wasteland trays ----
  check('wasteland trays are offered: rust, dust and concrete', (await p.locator('[data-dp-tray="rust"], [data-dp-tray="dust"], [data-dp-tray="concrete"]').count())===3);
  await p.click('[data-dp-tray="rust"]');
  const rustOk = await p.waitForFunction(()=>{ const m = __d3.floor.material; return __d3.traySrc==='img/tray-rust.jpg' && __d3.floorOn && m.normalMap && m.roughnessMap && /tray-rust-n/.test(m.normalMap.image.src) && /tray-rust-r/.test(m.roughnessMap.image.src); }, null, { timeout: 10000 }).then(()=>true, ()=>false);
  check('rust tray: its photo, relief and shine maps are all on the floor', rustOk);
  await p.locator('#tray').screenshot({ path: path.join(__dirname,'out','d3-rust-tray.png') });
  await p.click('[data-dp-tray="slate"]');
  const slateOk = await p.waitForFunction(()=>{ const m = __d3.floor.material; return __d3.traySrc==='img/tray-slate.jpg' && m.normalMap && /tray-slate-n/.test(m.normalMap.image.src) && !m.roughnessMap; }, null, { timeout: 10000 }).then(()=>true, ()=>false);
  check('slate tray: relief worked out from its own photo, and the rust maps are gone', slateOk);
  check('the flat tray underneath still shows the same tray', (await p.getAttribute('#tray','data-tray'))==='slate');

  // ---- lighting moods, and pips that give off light ----
  check('lighting: three moods offered, Garage chosen, its surroundings loaded', (await p.locator('[data-dp-light]').count())===3 && (await p.getAttribute('[data-dp-light="garage"]','aria-pressed'))==='true' && await p.waitForFunction(()=>__d3.envs && __d3.envs.garage && __d3.scene.environment===__d3.envs.garage, null, { timeout: 15000 }).then(()=>true, ()=>false));
  check('only the chosen mood is fetched', p.reqs.filter(u=>/env-garage[.]hdr/.test(u)).length===1 && !p.reqs.some(u=>/env-(dusk|night)[.]hdr/.test(u)));
  await p.click('[data-dp-light="lantern"]');
  await p.waitForFunction(()=>__d3.envs.lantern && __d3.scene.environment===__d3.envs.lantern, null, { timeout: 15000 });
  check('Lantern: a lamp is lit, the main light dims, and the choice is saved', await p.evaluate(()=>{ window.dispatchEvent(new Event('pagehide')); return __d3.lamp.intensity>0 && __d3.sun.intensity<1.5 && JSON.parse(localStorage.getItem('hunters-journal-v1')).settings.light==='lantern'; }));
  check('a mood changes the light only: same dice, same numbers', String((await d3(p)).vals)===String(await labels(p)) && (await d3(p)).n===2);
  await p.evaluate(()=>document.getElementById('dp-glow').click()); await p.waitForTimeout(200);
  check('glowing pips give off light of their own, and a halo on the tray', await p.evaluate(()=>{ const d = __d3.dice[0], m = d.g.children.find(c=>Array.isArray(c.material)).material[0]; return !!m.emissiveMap && m.emissiveIntensity>2 && !!d.halo; }));
  await p.locator('#tray').screenshot({ path: path.join(__dirname,'out','d3-lantern-glow.png') });
  check('still drawing', (await lit(p)) > 300);

  // ---- off again, and reload with it on ----
  await p.evaluate(() => document.getElementById('set-3d').click()); await p.waitForTimeout(100);
  check('switching off brings the regular dice back', (await p.evaluate(() => getComputedStyle(document.getElementById('dice')).visibility))==='visible' && !(await d3(p)).on);
  await p.evaluate(() => document.getElementById('set-3d').click()); await p.waitForTimeout(200);
  check('switching on again reuses the same canvas', (await p.locator('#tray canvas').count())===1 && (await d3(p)).state==='on');
  await p.evaluate(() => window.dispatchEvent(new Event('pagehide'))); await p.reload(); await p.waitForFunction(() => __d3.state === 'on', null, { timeout: 15000 });
  check('reload starts in 3D with the saved dice', (await d3(p)).n===2 && await p.evaluate(() => __d3.dice[0].die.finish === 'bone' && __d3.dice[0].die.glow === true));

  // ---- phone ----
  const m = await open({ viewport: { width: 390, height: 800 }, colorScheme: 'light' }, { v: 1, settings: { fx: true, sound: false, dice3d: true }, dice: { linked: true, a: { body: '#b8650f', finish: 'fuel', pip: '#fff4d6', glow: false, sigil: '' }, b: { body: '#b8650f', finish: 'fuel', pip: '#fff4d6', glow: false, sigil: '' }, tray: 'slate', sets: [] } });
  await m.waitForFunction(() => __d3.state === 'on', null, { timeout: 15000 });
  check('phone: canvas fills the tray, no sideways scroll', await m.evaluate(() => { const t = document.getElementById('tray'), c = __d3.canvas.getBoundingClientRect(); return Math.abs(c.width - t.clientWidth) < 2 && Math.abs(c.height - t.clientHeight) < 2 && document.documentElement.scrollWidth <= document.documentElement.clientWidth; }));
  await m.locator('#tray').screenshot({ path: path.join(__dirname,'out','d3-fuel-phone.png') });

  // ---- reduced motion: no flight ----
  const r = await open({ reducedMotion: 'reduce' }, { v: 1, settings: { fx: true, sound: false, dice3d: true } });
  await r.waitForFunction(() => __d3.state === 'on', null, { timeout: 15000 });
  await r.click('#roll'); await r.waitForTimeout(200);
  s = await d3(r);
  check('reduced motion: the dice just show the result', !s.anim && String(s.vals)===String(await labels(r)) && s.y.every(v => v === .5), JSON.stringify(s));

  // ---- a mood whose photo is missing falls back to the stand-in surroundings ----
  noHdr = true;
  const nh = await open({}, { v: 1, settings: { fx: true, sound: false, dice3d: true, light: 'dusk' } });
  await nh.waitForFunction(() => __d3.state === 'on', null, { timeout: 15000 }); await nh.waitForTimeout(600);
  check('missing lighting photo: 3D still runs on the stand-in, with the mood\'s lamps', await nh.evaluate(()=>__d3.scene.environment===__d3.plain && !__d3.envs.dusk && __d3.sun.intensity>3) && (await lit(nh)) > 300);
  noHdr = false;

  // ---- cannot load: fall back ----
  const fb = await open({}, { v: 1, settings: { fx: true, sound: false, dice3d: true } }, 'file://' + path.join(ROOT, 'index.html'));
  await fb.waitForTimeout(800);
  check('if three.js cannot load, the regular dice stay and a line says so', (await fb.evaluate(() => __d3.state))==='' && (await fb.evaluate(() => getComputedStyle(document.getElementById('dice')).visibility))==='visible' && /regular dice/.test(await fb.textContent('#d3msg')));
  await fb.click('#roll'); await fb.waitForFunction(() => !document.getElementById('roll').disabled, null, { timeout: 8000 });
  check('and rolling still works', (await fb.evaluate(() => { window.dispatchEvent(new Event('pagehide')); return JSON.parse(localStorage.getItem('hunters-journal-v1')).rolls.length; }))===1);

  console.log(results.map(r=>r.join(' | ')).join('\n'));
  const fails = results.filter(r=>r[0]==='FAIL').length;
  console.log('\nTOTAL', results.length, 'FAIL', fails); console.log('ERRORS', errs);
  await b.close(); srv.close();
  if (fails || errs.length) process.exit(1);
})().catch(e=>{ console.log(results.map(r=>r.join(' | ')).join('\n')); console.log('CRASH', e.message.split('\n').slice(0,6).join('\n')); process.exit(1); });
