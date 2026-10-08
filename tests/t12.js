// Recorded dice sounds: nothing fetched while sound is off, only the sets in use are fetched, each bounce is a tray take plus a die take,
// gem keeps its made-up ring, and everything falls back to the made-up sounds when the recordings are missing.
// Recordings load with fetch, which does not work from file://, so this test serves the repo over http itself.
require('fs').mkdirSync(require('path').join(__dirname,'out'),{recursive:true});
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), http = require('http');
const ROOT = path.join(__dirname,'..');
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.jpg':'image/jpeg', '.png':'image/png', '.mp3':'audio/mpeg' };
const results = []; const errs = [];
function check(name, ok, extra){ results.push([ok?'PASS':'FAIL', name, extra===undefined?'':String(extra)]); }
// A stand-in for AudioContext that records what is played. A recorded take is named by the file it came from, a made-up sound is 'made-up'.
const STUB = () => {
  const au = window.__au = { ctx: 0, osc: 0, played: [], rates: [], biquads: [] };
  const param = (v) => ({ value: v, setValueAtTime(x){ this.value = x; }, exponentialRampToValueAtTime(){}, linearRampToValueAtTime(){} });
  const node = (extra) => Object.assign({ connect(){}, start(){}, stop(){} }, extra);
  const realFetch = window.fetch.bind(window);
  window.fetch = (u, o) => realFetch(u, o).then(r => { if (!/snd\//.test(String(u))) return r; const ab = r.arrayBuffer.bind(r); r.arrayBuffer = () => ab().then(b => { b.__url = String(u); return b; }); return r; });
  function Ctx(){ au.ctx++; this.sampleRate = 8000; this.currentTime = 0; this.state = 'running'; this.destination = node({}); }
  Ctx.prototype.resume = function(){};
  Ctx.prototype.createBuffer = function(c, n){ return { getChannelData(){ return new Float32Array(n); } }; };
  Ctx.prototype.decodeAudioData = function(ab, ok){ const u = ab.__url || '?'; setTimeout(() => ok({ tag: u.replace(/^.*snd\//, '').replace(/\d*\.mp3$/, ''), getChannelData(){ return Float32Array.of(0, .2 + (u.length % 7) / 10, -.1); } }), 5); };
  Ctx.prototype.createBufferSource = function(){ return node({ buffer: null, playbackRate: param(1), start(){ au.played.push(this.buffer && this.buffer.tag || 'made-up'); au.rates.push(+this.playbackRate.value.toFixed(2)); } }); };
  Ctx.prototype.createBiquadFilter = function(){ const b = node({ type: '', frequency: param(0), Q: param(0) }); au.biquads.push(b); return b; };
  Ctx.prototype.createGain = function(){ return node({ gain: param(1) }); };
  Ctx.prototype.createOscillator = function(){ au.osc++; return node({ type: '', frequency: param(0) }); };
  window.AudioContext = window.webkitAudioContext = Ctx;
};
(async () => {
  let block = false;
  const srv = http.createServer((q, r) => {
    const rel = decodeURIComponent(q.url.split('?')[0].split('#')[0]).replace(/^\/$/, '/index.html'), f = path.join(ROOT, rel);
    if ((block && /^\/snd\//.test(rel)) || f.indexOf(ROOT) !== 0 || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
  });
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok));
  const URL = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(()=>chromium.launch());
  const open = async (stub, seed) => {
    const ctx = await b.newContext({ viewport: { width: 1100, height: 900 }, colorScheme: 'dark', serviceWorkers: 'block' });
    if (stub) await ctx.addInitScript(STUB);
    if (seed) await ctx.addInitScript((v) => { if (!localStorage.getItem('hunters-journal-v1')) localStorage.setItem('hunters-journal-v1', JSON.stringify(v)); }, seed);
    const p = await ctx.newPage(); p.snd = [];
    p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
    p.on('console', m => { if (m.type()==='error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
    p.on('request', q => { const m = /\/snd\/([a-z_]+?)\d+\.mp3/.exec(q.url()); if (m) p.snd.push(m[1]); });
    await p.goto(URL + '#roll'); await p.waitForTimeout(600);
    return p;
  };
  const count = (list) => list.reduce((o, k) => { o[k] = (o[k] || 0) + 1; return o; }, {});
  const landed = async (p, n) => { await p.waitForFunction((n)=>{ window.dispatchEvent(new Event('pagehide')); const j=JSON.parse(localStorage.getItem('hunters-journal-v1')||'{}'); return (j.rolls||[]).length>=n && !document.getElementById('roll').disabled; }, n, { timeout: 6000 }); await p.waitForTimeout(200); };
  const sndOn = async (p) => { await p.evaluate(()=>{ document.getElementById('settings').open = true; }); await p.check('#set-snd'); };
  const ready = (p, sets) => p.waitForFunction((sets)=>sets.every(k=>__snd[k] && __snd[k].ready), sets, { timeout: 8000 });
  const played = (p) => p.evaluate(()=>{ const x = { played: __au.played.slice(), rates: __au.rates.slice(), osc: __au.osc, bq: __au.biquads.filter(q=>q.type==='bandpass').map(q=>Math.round(q.frequency.value)) }; __au.played = []; __au.rates = []; __au.osc = 0; __au.biquads = []; return x; });

  // ---- the real recordings, the real decoder ----
  let p = await open(false);
  await p.click('#roll'); await landed(p, 1);
  check('sound off: no recording is fetched, even after a roll', p.snd.length===0, p.snd.length);
  await sndOn(p); await ready(p, ['surface_felt', 'surface_soft', 'dicehit_plastic']);
  let sets = await p.evaluate(()=>{ const o = {}; for (const k in __snd) o[k] = { n: __snd[k].takes.length, sorted: __snd[k].takes.every((t, i, a)=>!i || a[i-1].pk <= t.pk), quiet: Math.min(...__snd[k].takes.map(t=>t.pk)), dur: Math.max(...__snd[k].takes.map(t=>t.b.duration)) }; return o; });
  check('sound on: bone on leather fetches the felt takes, the soft thuds and the plastic takes, nothing else', JSON.stringify(count(p.snd))===JSON.stringify({ surface_felt: 6, surface_soft: 5, dicehit_plastic: 15 }), JSON.stringify(count(p.snd)));
  check('the real files decode: 6 felt and 15 plastic takes, sorted quiet to loud, none silent', sets.surface_felt.n===6 && sets.dicehit_plastic.n===15 && sets.surface_felt.sorted && sets.dicehit_plastic.sorted && sets.surface_felt.quiet>.01 && sets.dicehit_plastic.quiet>.01, JSON.stringify(sets));
  check('takes are short', sets.surface_felt.dur<.6 && sets.dicehit_plastic.dur<.2, sets.surface_felt.dur+' '+sets.dicehit_plastic.dur);
  await p.click('#roll'); await landed(p, 2);
  check('a roll with the real recordings finishes without errors', errs.length===0, errs.join(' | '));

  // ---- what plays, counted with a stand-in ----
  p = await open(true);
  await sndOn(p); await ready(p, ['surface_felt', 'surface_soft', 'dicehit_plastic']); await p.waitForTimeout(600);
  let a = await played(p);
  check('turning sound on waits for the recordings, then plays one recorded sample hit', JSON.stringify(count(a.played))===JSON.stringify({ dicehit_plastic: 1, surface_felt: 1, surface_soft: 1 }) && a.osc===0, JSON.stringify(a.played));
  await p.click('#roll'); await landed(p, 1);
  a = await played(p); let c = count(a.played.filter(k=>/^(dicehit|surface)/.test(k)));
  check('bone on leather: 8 bounces, each a felt take over a soft thud plus a plastic take, no made-up clicks or thuds', c.surface_felt===8 && c.surface_soft===8 && c.dicehit_plastic===8 && a.bq.length===0, JSON.stringify(count(a.played)));
  check('the thud under leather is sped up so small speakers can play it', a.rates.filter((r, i)=>a.played[i]==='surface_soft').every(r=>r>2 && r<2.4), a.rates.join(','));
  check('leather plays the felt takes slower, for a deeper thud', a.rates.filter((r, i)=>a.played[i]==='surface_felt').every(r=>r>.74 && r<.9), a.rates.join(','));

  await p.click('#dp-open'); await p.click('[data-dp-tray="wood"]'); await p.click('[data-dp-set="finish"][data-v="metal"]');
  await ready(p, ['surface_wood_tray', 'dicehit_metal']);
  check('changing tray and finish fetches the new sets', p.snd.indexOf('surface_wood_tray')>=0 && p.snd.indexOf('dicehit_metal')>=0 && p.snd.indexOf('surface_wood_table')<0);
  await played(p); await p.click('#roll'); await landed(p, 2);
  a = await played(p); c = count(a.played);
  check('metal on wood: 8 wood tray takes and 8 metal takes', c.surface_wood_tray===8 && c.dicehit_metal===8, JSON.stringify(c));
  check('a heavy die lands a little deeper than the tray alone', a.rates.filter((r, i)=>a.played[i]==='surface_wood_tray').every(r=>r>.82 && r<.96), a.rates.join(','));

  await p.click('[data-dp-set="finish"][data-v="gem"]'); await ready(p, ['dicehit_glass']); await played(p); await p.click('#roll'); await landed(p, 3);
  a = await played(p); c = count(a.played);
  const gemRates = a.rates.filter((r, i)=>a.played[i]==='dicehit_glass');
  check('gem: 8 glass taps played fast, each with a ring, over the recorded tray', c.surface_wood_tray===8 && c.dicehit_glass===8 && !c.surface_soft && a.bq.length===0 && a.osc>=8 && gemRates.every(r=>r>3.7 && r<4.4), JSON.stringify(c)+' '+gemRates.join(','));
  await p.click('[data-dp-set="finish"][data-v="fuel"]'); await played(p); await p.click('#roll'); await landed(p, 4);
  a = await played(p); c = count(a.played);
  const fuelRates = a.rates.filter((r, i)=>a.played[i]==='dicehit_glass');
  check('fuel: the same glass taps, lower than gem', c.dicehit_glass===8 && fuelRates.every(r=>r>2.8 && r<3.2), fuelRates.join(','));

  // shaking: dice in the hand knock each other, the tray stays quiet
  await p.click('[data-dp-set="finish"][data-v="stone"]'); await ready(p, ['dicehit_wood']); await played(p);
  await p.locator('#roll').scrollIntoViewIfNeeded(); await p.waitForTimeout(100); await played(p);
  const box = await p.locator('#roll').boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down(); await p.waitForTimeout(700);
  a = await played(p); c = count(a.played);
  check('holding Roll: stone dice knock together (wood takes), no tray takes', c.dicehit_wood>=3 && !c.surface_wood_tray, JSON.stringify(c));
  await p.mouse.up(); await landed(p, 5);

  // a button in the dice maker plays one throw without rolling
  await p.locator('[data-dp-hear]').scrollIntoViewIfNeeded(); await played(p); await p.click('[data-dp-hear]'); await p.waitForTimeout(1100);
  a = await played(p); c = count(a.played);
  check('Hear these dice: one throw of sound (8 bounces) and no roll', c.dicehit_wood===8 && c.surface_wood_tray===8 && await p.evaluate(()=>{ window.dispatchEvent(new Event('pagehide')); return JSON.parse(localStorage.getItem('hunters-journal-v1')).rolls.length; })===5, JSON.stringify(c));

  // ---- recordings missing: the made-up sounds take over ----
  block = true;
  p = await open(true);
  await sndOn(p); await p.waitForTimeout(700); await played(p);
  await p.click('#roll'); await landed(p, 1);
  a = await played(p); c = count(a.played);
  check('no recordings on the server: every bounce is the made-up click and thud, and the roll works', c['made-up']>=16 && Object.keys(c).length===1 && a.bq.length===8, JSON.stringify(c));
  block = false;

  // ---- sound left on from last time: the first touch fetches, before any roll ----
  p = await open(true, { v: 1, settings: { fx: true, sound: true, vol: .6 } });
  check('sound already on: nothing is fetched until the first touch', p.snd.length===0, p.snd.length);
  await p.click('#dp-open'); await ready(p, ['surface_felt', 'surface_soft', 'dicehit_plastic']);
  check('the first touch fetches the recordings', p.snd.length===26, p.snd.length);

  console.log(results.map(r=>r.join(' | ')).join('\n'));
  const fails = results.filter(r=>r[0]==='FAIL').length;
  console.log('\nTOTAL', results.length, 'FAIL', fails); console.log('ERRORS', errs);
  await b.close(); srv.close();
  if (fails || errs.length) process.exit(1);
})().catch(e=>{ console.log(results.map(r=>r.join(' | ')).join('\n')); console.log('CRASH', e.message.split('\n').slice(0,6).join('\n')); process.exit(1); });
