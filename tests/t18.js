// Look and ink (C1): a Dark / Light / My device switch and six inks. Dark is the default whatever the device says. Every ink must read at 4.5:1 or better in both themes, and the choice must survive a reload.
require('fs').mkdirSync(require('path').join(__dirname,'out'),{recursive:true});
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://'+path.join(__dirname,'..','index.html');
const results = []; const errs = [];
function check(name, ok, extra){ results.push([ok?'PASS':'FAIL', name, extra===undefined?'':String(extra)]); }
const lum = (h) => { h = h.replace('#', ''); const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(parseInt(h.slice(0, 2), 16)) + 0.7152 * f(parseInt(h.slice(2, 4), 16)) + 0.0722 * f(parseInt(h.slice(4, 6), 16)); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const rgbHex = (c) => { const m = c.match(/\d+/g).map(Number); return '#' + m.slice(0, 3).map(n => n.toString(16).padStart(2, '0')).join(''); };
const INKS = ['', 'moss', 'midnight', 'brass', 'rust', 'dust'];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(()=>chromium.launch());
  const open = async (scheme, journal, viewport) => {
    const ctx = await b.newContext({ viewport: viewport || { width: 1100, height: 900 }, colorScheme: scheme });
    if (journal) await ctx.addInitScript((x) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hunters-journal-v1', x); sessionStorage.setItem('seeded', '1'); } }, typeof journal === 'string' ? journal : JSON.stringify(journal));
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
    p.on('console', m => { if (m.type()==='error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
    await p.goto(URL+'#guide'); await p.waitForTimeout(500);
    await p.evaluate(() => { document.querySelector('#settings').open = true; });
    return p;
  };
  const tok = (p) => p.evaluate(() => { const cs = getComputedStyle(document.documentElement), g = (n) => cs.getPropertyValue(n).trim(); return { bg: g('--bg'), surface: g('--surface'), surface2: g('--surface2'), accent: g('--accent'), ink: g('--accent-ink'), attrs: [document.documentElement.getAttribute('data-theme'), document.documentElement.getAttribute('data-ink')] }; });
  const look = (p, v) => p.click('[data-look="' + v + '"]');
  const ink = (p, v) => p.click('.inkbtn[data-ink="' + v + '"]');

  // ---- defaults: dark, whatever the device says ----
  let p = await open('light');
  let t = await tok(p);
  check('default: the dark theme and no ink attribute', t.attrs[0] === 'dark' && t.attrs[1] === null, t.attrs.join(','));
  check('default on a light device: the dark colors and Oxblood', t.bg === '#110c0e' && t.accent === '#e0675b', t.bg + ' ' + t.accent);
  check('default: the page tells the browser it is dark, so its own controls match', (await p.evaluate(() => getComputedStyle(document.documentElement).colorScheme)) === 'dark');
  check('Dark and Oxblood show as chosen', (await p.getAttribute('[data-look="dark"]', 'aria-pressed')) === 'true' && (await p.getAttribute('.inkbtn[data-ink=""]', 'aria-pressed')) === 'true');
  check('Dark is offered first, then Light, then My device', (await p.locator('[data-look]').evaluateAll(a => a.map(x => x.dataset.look).join(','))) === 'dark,light,device');
  check('six inks are offered, each with a name', (await p.locator('.inkbtn').count()) === 6 && (await p.locator('.inkbtn').allTextContents()).every(x => x.trim().length > 2), (await p.locator('.inkbtn').allTextContents()).join(','));
  check('a first visit has saved nothing yet, and is dark before the page script has run', await (async () => { const c = await b.newContext({ colorScheme: 'light' }); const q = await c.newPage(); await q.addInitScript(() => { new MutationObserver((m, o) => { if (document.body) { window.__early = document.documentElement.getAttribute('data-theme') + (window.__journal ? ' late' : ''); o.disconnect(); } }).observe(document, { childList: true, subtree: true }); }); await q.goto(URL); await q.waitForTimeout(300); const v = await q.evaluate(() => window.__early); await c.close(); return v === 'dark'; })());

  // ---- light, and following the device ----
  await look(p, 'light'); t = await tok(p);
  check('Light gives the light colors', t.bg === '#efe8dc' && t.accent === '#8c1d2b' && t.attrs[0] === 'light', t.bg);
  await look(p, 'device'); t = await tok(p);
  check('My device on a light device: the light colors, no theme attribute', t.bg === '#efe8dc' && t.attrs[0] === null, t.bg + ' ' + t.attrs[0]);
  await look(p, 'dark'); t = await tok(p);
  check('Dark goes back to the dark colors', t.bg === '#110c0e' && t.attrs[0] === 'dark', t.bg);
  p = await open('dark');
  t = await tok(p);
  check('default on a dark device: the dark colors', t.bg === '#110c0e' && t.attrs[0] === 'dark', t.bg);
  await look(p, 'device'); t = await tok(p);
  check('My device on a dark device: the dark colors', t.bg === '#110c0e' && t.attrs[0] === null, t.bg);
  await look(p, 'light'); t = await tok(p);
  check('Light on a dark device gives the light colors', t.bg === '#efe8dc' && t.attrs[0] === 'light', t.bg);

  // ---- every ink, both themes: contrast and swatches ----
  for (const theme of ['light', 'dark']) {
    await look(p, theme);
    for (const id of INKS) {
      await ink(p, id); t = await tok(p);
      const r = [ratio(t.ink, t.accent), ratio(t.accent, t.bg), ratio(t.accent, t.surface), ratio(t.accent, t.surface2)];
      check(theme + ' ' + (id || 'oxblood') + ': button text and accent text reach 4.5:1', Math.min(...r) >= 4.5, r.map(x => x.toFixed(2)).join(' '));
      const sw = await p.evaluate((id) => { const el = document.querySelector('.inkbtn[data-ink="' + id + '"]'); return [el.style.getPropertyValue('--sl'), el.style.getPropertyValue('--sd'), getComputedStyle(el.querySelector('i')).backgroundColor]; }, id);
      check(theme + ' ' + (id || 'oxblood') + ': the swatch matches the real accent', rgbHex(sw[2]) === t.accent && sw[theme === 'light' ? 0 : 1] === t.accent, sw.join(' ') + ' vs ' + t.accent);
    }
  }
  check('the buttons really use the ink', rgbHex(await p.evaluate(() => getComputedStyle(document.querySelector('#bk-save')).backgroundColor)) === (await tok(p)).accent);

  // ---- an ink follows the device and the choice ----
  p = await open('light');
  await ink(p, 'rust');
  check('the default + Rust: the dark Rust', (await tok(p)).accent === '#f0894a');
  await look(p, 'light');
  check('then Light: the light Rust', (await tok(p)).accent === '#a3410d');
  await look(p, 'device');
  check('then My device on a light device: still the light Rust', (await tok(p)).accent === '#a3410d');
  await look(p, 'dark');
  check('then Dark: the dark Rust again', (await tok(p)).accent === '#f0894a');

  // ---- saved and restored ----
  await look(p, 'light'); await ink(p, 'moss'); await p.waitForTimeout(800);
  await p.reload(); await p.waitForTimeout(600);
  t = await tok(p);
  check('a reload keeps the choice', t.attrs[0] === 'light' && t.attrs[1] === 'moss' && t.accent === '#2f6b3a', t.attrs.join(',') + ' ' + t.accent);
  await p.evaluate(() => { document.querySelector('#settings').open = true; });
  check('and the buttons show it', (await p.getAttribute('[data-look="light"]', 'aria-pressed')) === 'true' && (await p.getAttribute('.inkbtn[data-ink="moss"]', 'aria-pressed')) === 'true');
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('hunters-journal-v1')).settings);
  check('it is saved with the journal, so a backup carries it', saved.theme === 'light' && saved.ink === 'moss', JSON.stringify(saved));

  // ---- My device survives a reload too ----
  await look(p, 'device'); await p.waitForTimeout(800);
  await p.reload(); await p.waitForTimeout(600);
  t = await tok(p);
  check('a reload keeps My device', t.attrs[0] === null && t.bg === '#efe8dc' && (await p.evaluate(() => JSON.parse(localStorage.getItem('hunters-journal-v1')).settings.theme)) === 'device', t.attrs[0] + ' ' + t.bg);

  // ---- old and odd saves: all of them are dark ----
  const DARK = (t) => t.attrs[0] === 'dark' && t.attrs[1] === null && t.bg === '#110c0e' && t.accent === '#e0675b';
  p = await open('light', { sheet: { name: 'Dee Ray' }, settings: { fx: true } });
  t = await tok(p);
  check('an old save with no look settings loads dark', DARK(t), t.attrs.join(',') + ' ' + t.bg);
  p = await open('light', { sheet: { name: 'Dee Ray' }, settings: { fx: true, theme: 'auto', ink: '' } });
  t = await tok(p);
  check('a save from before dark was the default (theme "auto") loads dark', DARK(t), t.attrs.join(',') + ' ' + t.bg);
  await p.evaluate(() => { document.querySelector('#settings').open = true; });
  check('and shows Dark as chosen', (await p.getAttribute('[data-look="dark"]', 'aria-pressed')) === 'true');
  check('and keeps the hunter', (await p.evaluate(() => window.__journal.S().sheet.name)) === 'Dee Ray');
  p = await open('light', { settings: { theme: 'banana', ink: 'nosuchink' } });
  t = await tok(p);
  check('an unknown theme and ink fall back to the defaults', DARK(t), t.attrs.join(','));
  p = await open('light', { settings: { theme: '"><x', ink: '"><script>window.__pwned=1</script>' } });
  t = await tok(p);
  check('hostile text in the saved look does nothing', DARK(t) && !(await p.evaluate(() => window.__pwned)));
  p = await open('light', 'not json at all {');
  t = await tok(p);
  check('a save that cannot be read still opens dark', t.attrs[0] === 'dark' && t.bg === '#110c0e', t.attrs.join(',') + ' ' + t.bg);

  // ---- phone width and a look at it ----
  for (const scheme of ['light', 'dark']) {
    p = await open('light', { settings: { ink: 'rust', theme: scheme } }, { width: 390, height: 800 });
    check('phone ' + scheme + ': no sideways scroll with the settings open', await p.evaluate(() => document.documentElement.scrollWidth <= 390), await p.evaluate(() => document.documentElement.scrollWidth));
    await p.locator('#inks').scrollIntoViewIfNeeded();
    await p.screenshot({ path: path.join(__dirname,'out','look-' + scheme + '-phone.png') });
  }

  console.log(results.map(r=>r.join(' | ')).join('\n'));
  const fails = results.filter(r=>r[0]==='FAIL').length;
  console.log('\nTOTAL', results.length, 'FAIL', fails); console.log('ERRORS', errs);
  await b.close();
  if (fails || errs.length) process.exit(1);
})().catch(e=>{ console.log(results.map(r=>r.join(' | ')).join('\n')); console.log('CRASH', e.message.split('\n').slice(0,6).join('\n')); console.log('ERRORS', errs); process.exit(1); });
