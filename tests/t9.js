// Dice sounds: silent while off, one hit per bounce per die, materials, stingers, volume, and hold-to-shake never double-rolling.
require('fs').mkdirSync(require('path').join(__dirname,'out'),{recursive:true});
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://'+path.join(__dirname,'..','index.html');
const results = []; const errs = [];
function check(name, ok, extra){ results.push([ok?'PASS':'FAIL', name, extra===undefined?'':String(extra)]); }
// A counting stand-in for AudioContext. window.__au records every context and node the page creates.
const STUB = () => {
  const au = window.__au = { ctx: 0, gain: 0, osc: 0, src: 0, biquads: [], oscs: [], master: null };
  const param = (v) => ({ value: v, setValueAtTime(x){ this.value = x; }, exponentialRampToValueAtTime(){}, linearRampToValueAtTime(){} });
  const node = (extra) => Object.assign({ connect(){}, start(){}, stop(){} }, extra);
  function Ctx(){ au.ctx++; this.sampleRate = 8000; this.currentTime = 0; this.state = 'running'; this.destination = node({}); }
  Ctx.prototype.resume = function(){};
  Ctx.prototype.createBuffer = function(c, n){ return { getChannelData(){ return new Float32Array(n); } }; };
  Ctx.prototype.createBufferSource = function(){ au.src++; return node({ buffer: null }); };
  Ctx.prototype.createBiquadFilter = function(){ const b = node({ type: '', frequency: param(0), Q: param(0) }); au.biquads.push(b); return b; };
  Ctx.prototype.createGain = function(){ au.gain++; const g = node({ gain: param(1) }); if (!au.master) au.master = g; return g; };
  Ctx.prototype.createOscillator = function(){ au.osc++; const o = node({ type: '', frequency: param(0) }); au.oscs.push(o); return o; };
  window.AudioContext = window.webkitAudioContext = Ctx;
};
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(()=>chromium.launch());
  const open = async (opts) => {
    const ctx = await b.newContext(Object.assign({ viewport: { width: 1100, height: 900 }, colorScheme: 'dark' }, opts||{}));
    await ctx.addInitScript(STUB);
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
    p.on('console', m => { if (m.type()==='error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
    await p.goto(URL+'#roll'); await p.waitForTimeout(600);
    return p;
  };
  const au = (p) => p.evaluate(()=>({ ctx: __au.ctx, gain: __au.gain, osc: __au.osc, src: __au.src, bq: __au.biquads.filter(x=>x.type==='bandpass').map(x=>Math.round(x.frequency.value)), lp: __au.biquads.filter(x=>x.type==='lowpass').map(x=>Math.round(x.frequency.value)), master: __au.master ? __au.master.gain.value : null }));
  const reset = (p) => p.evaluate(()=>{ __au.gain = 0; __au.osc = 0; __au.src = 0; __au.biquads = []; __au.oscs = []; });
  // the Recent rolls list only shows ten, so count from saved state (kept to thirty)
  const rolls = (p) => p.evaluate(()=>{ window.dispatchEvent(new Event('pagehide')); const j=JSON.parse(localStorage.getItem('hunters-journal-v1')||'{}'); return (j.rolls||[]).length; });
  const landed = async (p, n) => { await p.waitForFunction((n)=>{ window.dispatchEvent(new Event('pagehide')); const j=JSON.parse(localStorage.getItem('hunters-journal-v1')||'{}'); return (j.rolls||[]).length>=n && !document.getElementById('roll').disabled; }, n, { timeout: 5000 }); await p.waitForTimeout(150); };
  const total = (p) => p.evaluate(()=>parseInt(document.querySelector('#sum').firstChild.textContent, 10));
  const sndOn = async (p) => { await p.evaluate(()=>{ document.getElementById('settings').open = true; }); await p.check('#set-snd'); await p.waitForTimeout(50); };

  // ---- sound off: nothing is ever created ----
  let p = await open();
  await p.click('#roll'); await landed(p, 1);
  const box = await p.locator('#roll').boundingBox();
  const hold = async (pg, ms) => { await pg.mouse.move(box.x+box.width/2, box.y+box.height/2); await pg.mouse.down(); await pg.waitForTimeout(ms); };
  await p.locator('#roll').scrollIntoViewIfNeeded();
  const rb = async (pg) => { const r = await pg.locator('#roll').boundingBox(); box.x=r.x; box.y=r.y; box.width=r.width; box.height=r.height; };
  await rb(p); await hold(p, 500); await p.mouse.up(); await landed(p, 2);
  let a = await au(p);
  check('sound off: no audio context and no nodes, even after a roll and a shake', a.ctx===0 && a.gain===0 && a.osc===0 && a.src===0, JSON.stringify(a));
  check('volume slider starts at 60', (await p.inputValue('#set-vol'))==='60');

  // ---- sound on: one hit per bounce per die, at most one stinger ----
  await sndOn(p);
  a = await au(p);
  check('turning sound on plays one sample hit through a master gain', a.ctx===1 && a.src===2 && a.osc===1 && a.master===0.6, JSON.stringify(a));
  for (let i = 0; i < 6; i++) {
    await reset(p); const n0 = await rolls(p);
    await p.click('#roll'); await landed(p, n0+1); await p.waitForTimeout(250);
    const t = await total(p); a = await au(p);
    const miss = t < 7, bell = t >= 10, crit = t >= 12;
    const wantSrc = 16 + (miss || crit ? 1 : 0), wantOsc = 8 + (bell ? 3 : 0) + (miss ? 1 : 0);
    check('roll '+(i+1)+' (total '+t+'): 8 hits, each a click and a thud, and '+(miss?'the thud':crit?'bell and thunder':bell?'the bell':'no stinger'), a.src===wantSrc && a.osc===wantOsc && a.ctx===1, 'src '+a.src+'/'+wantSrc+' osc '+a.osc+'/'+wantOsc);
    if (i===0) check('bone dice click around 1500 Hz', a.bq.length===8 && a.bq.every(f=>f>1380 && f<1620), a.bq.join(','));
    if (i===0) check('leather tray: every hit has a low thud under 400 Hz', a.lp.filter(f=>f===340).length===8, a.lp.join(','));
  }

  // ---- materials: each die sounds like its own finish, the tray sets the thump ----
  await p.click('#dp-open'); await p.click('[data-dp-pair="0"]'); await p.click('[data-dp-tab="1"]'); await p.click('[data-dp-set="finish"][data-v="metal"]'); await p.click('[data-dp-tray="wood"]');
  await reset(p); let n0 = await rolls(p);
  await p.click('#roll'); await landed(p, n0+1); await p.waitForTimeout(250);
  a = await au(p);
  const lo = a.bq.filter(f=>f>1380 && f<1620).length, hi = a.bq.filter(f=>f>3500 && f<4100).length;
  check('mismatched pair: four bone clicks and four metal clicks', lo===4 && hi===4, a.bq.join(','));
  const t2 = await total(p);
  check('metal rings: two extra tones per metal hit', a.osc === 8 + 8 + (t2>=10?3:0) + (t2<7?1:0), a.osc);
  const thump = await p.evaluate(()=>__au.oscs.map(o=>Math.round(o.frequency.value)).filter(f=>f===240).length);
  check('wood tray sets the thud for every hit', thump===8 && a.lp.filter(f=>f===750).length===8, a.lp.join(","));

  // ---- volume ----
  await p.evaluate(()=>{ const s=document.getElementById('set-vol'); s.value='25'; s.dispatchEvent(new Event('input',{bubbles:true})); s.dispatchEvent(new Event('change',{bubbles:true})); });
  a = await au(p);
  check('volume slider drives the master gain', a.master===0.25, a.master);
  const sv = await p.evaluate(()=>{ window.dispatchEvent(new Event('pagehide')); return JSON.parse(localStorage.getItem('hunters-journal-v1')).settings; });
  check('sound and volume are saved', sv.sound===true && sv.vol===0.25, JSON.stringify(sv));

  // ---- hold to shake ----
  await p.click('#dp-close');
  n0 = await rolls(p); await reset(p);
  await rb(p); await hold(p, 600);
  const mid = await p.evaluate(()=>({ shaking: document.getElementById('dice').classList.contains('shaking'), disabled: document.getElementById('roll').disabled }));
  a = await au(p);
  check('holding Roll shakes the dice and rattles without rolling yet', mid.shaking && !mid.disabled && (await rolls(p))===n0 && a.src>=3, JSON.stringify(mid)+' src '+a.src);
  await p.mouse.up();
  check('letting go throws the dice', await p.evaluate(()=>document.getElementById('roll').disabled && !document.getElementById('dice').classList.contains('shaking')));
  await landed(p, n0+1); await p.waitForTimeout(500);
  check('hold and release rolls exactly once', (await rolls(p))===n0+1, (await rolls(p))-n0);
  const srcAfter = (await au(p)).src; await p.waitForTimeout(400);
  check('the rattle stops after the throw', (await au(p)).src===srcAfter);
  n0 = await rolls(p); await rb(p); await hold(p, 500); await p.mouse.move(box.x+box.width/2, box.y-200); await landed(p, n0+1); await p.mouse.up(); await p.waitForTimeout(300);
  check('sliding off the button while shaking throws once', (await rolls(p))===n0+1);
  n0 = await rolls(p); await p.click('#roll'); await landed(p, n0+1); await p.waitForTimeout(500);
  check('a plain click still rolls at once, once', (await rolls(p))===n0+1);
  n0 = await rolls(p); await p.focus('#roll'); await p.keyboard.press('Enter'); await landed(p, n0+1);
  await p.keyboard.press('Space'); await landed(p, n0+2); await p.waitForTimeout(300);
  check('Enter and Space each roll once', (await rolls(p))===n0+2, (await rolls(p))-n0);
  await p.close();

  // ---- reduced motion: no jiggle, still exactly one roll per release ----
  p = await open({ reducedMotion: 'reduce' });
  await sndOn(p); await reset(p);
  await p.locator('#roll').scrollIntoViewIfNeeded(); await rb(p);
  await hold(p, 500);
  const anim = await p.evaluate(()=>getComputedStyle(document.querySelector('#dice .slot .dx')).animationName);
  check('reduced motion: the shake makes sound but nothing moves', anim==='none' && (await au(p)).src>=2, anim);
  await p.mouse.up(); await p.waitForTimeout(600);
  check('reduced motion: hold and release rolls exactly once', (await rolls(p))===1, await rolls(p));
  await reset(p); await p.click('#roll'); await p.waitForTimeout(300);
  const t3 = await total(p); a = await au(p);
  check('reduced motion: no bounce sounds, only the stinger', a.src===(t3<7||t3>=12?1:0) && a.osc===(t3>=10?3:0)+(t3<7?1:0), 'total '+t3+' '+JSON.stringify(a));
  await p.close();

  // ---- phone width ----
  const c3 = await b.newContext({ viewport: { width: 390, height: 800 } }); const m = await c3.newPage();
  await m.goto(URL+'#roll'); await m.waitForTimeout(400); await m.evaluate(()=>{ document.getElementById('settings').open = true; });
  const ov = await m.evaluate(()=>document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('no sideways scroll at 390px with settings open', ov<=0, ov);
  await m.locator('#settings').screenshot({ path: path.join(__dirname,'out','sound-settings.png') });

  console.log(results.map(r=>r.join(' | ')).join('\n'));
  const fails = results.filter(r=>r[0]==='FAIL').length;
  console.log('\nTOTAL', results.length, 'FAIL', fails); console.log('ERRORS', errs);
  await b.close();
  if (fails || errs.length) process.exit(1);
})().catch(e=>{ console.log(results.map(r=>r.join(' | ')).join('\n')); console.log('CRASH', e.message.split('\n').slice(0,6).join('\n')); process.exit(1); });
