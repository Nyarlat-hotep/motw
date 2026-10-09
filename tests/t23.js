// Surprise me and catchphrases: names from six worlds in three registers (plain, funny, over the top), and a pool of catchphrases behind a More ideas button.
// The content rules are checked on the data itself; the buttons are checked in a browser.
require('fs').mkdirSync(require('path').join(__dirname,'out'),{recursive:true});
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const URL = 'file://'+path.join(__dirname,'..','index.html');
const results = []; const errs = [];
function check(name, ok, extra){ results.push([ok?'PASS':'FAIL', name, extra===undefined?'':String(extra)]); }
const src = fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const block = src.slice(src.indexOf('/*NAMEGEN*/'), src.indexOf('/*END NAMEGEN*/'));
const G = new Function(block + '; return { NM: NM, NMF: NMF, NMW: NMW, genName: genName, genNames: genNames };')();
const POOL = new Function(src.match(/var CATCHES = [^\n]*\n/)[0] + src.match(/var CATCHX = \{[\s\S]*?\n\};/)[0] + '; return { CATCHES: CATCHES, CATCHX: CATCHX };')();
const odd = (s) => s.split('').some(ch => ch.charCodeAt(0) > 126 || ch.charCodeAt(0) < 32);   // dashes, emoji, accents, control characters
const dupes = (a) => a.length - new Set(a).size;
const FAMS = Object.keys(G.NMF), KEYS = ['first', 'sur', 'title', 'nick', 'pun', 'epi', 'deed', 'role'];
const nicks = [].concat(...FAMS.map(f => G.NMF[f].nick)), puns = new Set([].concat(...FAMS.map(f => G.NMF[f].pun))), epis = [].concat(...FAMS.map(f => G.NMF[f].epi));
const isFunny = (n) => puns.has(n) || n.includes('"') || nicks.some(k => n.startsWith(k + ' '));
const isEpic = (n) => /,| the | of |Who /.test(n) || epis.some(e => n.startsWith(e + ' '));

(async () => {
  // ---- the data ----
  check('six worlds, all in the weights', FAMS.join() === 'appal,waste,retro,bayou,frontier,metro' && G.NMW.map(w => w[0]).join() === FAMS.join());
  check('every world has every list, each with enough in it', FAMS.every(f => KEYS.every(k => Array.isArray(G.NMF[f][k]) && G.NMF[f][k].length >= (k === 'pun' ? 5 : k === 'deed' || k === 'role' ? 5 : 8))), FAMS.map(f => f + ':' + KEYS.map(k => G.NMF[f][k].length).join('/')).join(' '));
  const all = [].concat(...FAMS.map(f => [].concat(...KEYS.map(k => G.NMF[f][k]))), G.NM.titleF, G.NM.titleM, G.NM.place);
  check('names and phrases are plain ASCII: no dashes, accents or emoji', all.filter(odd).length === 0, all.filter(odd).slice(0, 5).join(' | '));
  check('no list repeats an entry', FAMS.every(f => KEYS.every(k => dupes(G.NMF[f][k]) === 0)) && dupes(G.NM.fem) === 0 && dupes(G.NM.masc) === 0 && dupes(G.NM.sur) === 0 && dupes(G.NM.epi) === 0 && dupes(G.NM.place) === 0);
  check('the original Appalachian names are all still there', ['Abigail', 'Tabitha', 'Silas', 'Zebulon', 'Blevins', 'Tolliver', 'Sorrow Hollow', 'Lantern-Bearer'].every(x => [].concat(G.NM.fem, G.NM.masc, G.NM.sur, G.NM.place, G.NM.epi).includes(x)));
  let bad = [], longest = '';
  for (let i = 0; i < 6000; i++) { const n = G.genName(['plain', 'funny', 'epic'][i % 3], FAMS[i % FAMS.length]); if (!n || /undefined|NaN|null|\s\s|^\s|\s$|\.\.|,,/.test(n) || n.length > 95) bad.push(n); if (n.length > longest.length) longest = n; }
  check('six thousand generated names are all well formed and short enough for a card', bad.length === 0, bad.slice(0, 3).join(' | ') + ' longest(' + longest.length + '): ' + longest);
  check('titles never sit in front of a first name (Sister Lucien)', Array.from({ length: 3000 }, () => G.genName('epic')).every(n => !FAMS.some(f => G.NMF[f].title.some(t => G.NMF[f].first.some(g => n.startsWith(t + ' ' + g + ' ')))) || G.NM.titleF.concat(G.NM.titleM).some(t => n.startsWith(t + ' '))));
  const press = Array.from({ length: 300 }, () => G.genNames(6));
  check('every press of Surprise me gives six different names', press.every(p => p.length === 6 && dupes(p) === 0));
  check('and always some funny ones (two or more) and an over-the-top one', press.every(p => p.filter(isFunny).length >= 2 && p.filter(isEpic).length >= 1), (press.find(p => p.filter(isFunny).length < 2 || p.filter(isEpic).length < 1) || []).join(' | '));
  const seen = press.flat();
  const only = (f, k) => G.NMF[f][k].filter(x => FAMS.filter(g => G.NMF[g][k].includes(x)).length === 1 && !(k === 'sur' && G.NM.sur.includes(x) && f !== 'appal'));
  check('all six worlds show up in the names', FAMS.every(f => seen.some(n => only(f, 'sur').concat(only(f, 'nick'), only(f, 'epi'), only(f, 'first')).some(t => n.includes(t)))), FAMS.map(f => f + ':' + seen.filter(n => only(f, 'sur').concat(only(f, 'nick'), only(f, 'epi')).some(t => n.includes(t))).length).join(' '));
  check('and all three registers do', seen.filter(isFunny).length > 400 && seen.filter(isEpic).length > 200 && seen.filter(n => !isFunny(n) && !isEpic(n)).length > 400, [seen.filter(isFunny).length, seen.filter(isEpic).length, seen.filter(n => !isFunny(n) && !isEpic(n)).length].join('/'));

  const C = POOL.CATCHX;
  check('catchphrases: the original six are kept', POOL.CATCHES.length === 6 && POOL.CATCHES[0] === 'Not on my watch.');
  check('catchphrases: 24 plain, 24 funny, 24 over the top', C.plain.length === 24 && C.funny.length === 24 && C.epic.length === 24);
  const lines = [].concat(C.plain, C.funny, C.epic, POOL.CATCHES);
  check('catchphrases: plain ASCII, no repeats anywhere, short enough for two lines on the card', lines.filter(odd).length === 0 && dupes(lines) === 0 && lines.every(l => l.length >= 10 && l.length <= 60), lines.filter(l => l.length > 60).join(' | '));
  check('catchphrases: every line is a sentence that ends properly', lines.every(l => /[.!?]$/.test(l) && /^[A-Z]/.test(l)));

  // ---- the buttons ----
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const open = async (viewport) => {
    const ctx = await b.newContext({ viewport: viewport || { width: 1100, height: 900 }, colorScheme: 'dark' });
    await ctx.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hunters-journal-v1', JSON.stringify({ hv: 'build', wiz: 1 })); sessionStorage.setItem('seeded', '1'); } });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
    await p.goto(URL + '#hunter'); await p.waitForTimeout(600);
    return p;
  };
  const chipsOf = (p, sel) => p.$$eval(sel, els => els.map(e => e.textContent.replace(/^\+\s*/, '')));
  let p = await open();
  check('the builder is on Who they are', /Who are they/.test(await p.textContent('#wiz')));
  check('before pressing anything there is a hint about the worlds, and no name chips', (await p.locator('[data-wsug]').count()) === 0 && /plain to ridiculous/.test(await p.textContent('#wsugg')));
  await p.click('#wrand');
  let names = await chipsOf(p, '[data-wsug]');
  check('Surprise me gives six name chips', names.length === 6 && dupes(names) === 0, names.join(' | '));
  await p.locator('[data-wsug]').nth(2).click();
  check('tapping one fills the name exactly, quotes and all', (await p.inputValue('#w-name')) === names[2] && (await p.evaluate(() => window.__journal.S().sheet.name)) === names[2], names[2]);
  const ui = [];
  for (let i = 0; i < 40; i++) { await p.click('#wrand'); ui.push(...await chipsOf(p, '[data-wsug]')); }
  check('forty more presses through the real button all work and stay a mix', ui.length === 240 && ui.filter(isFunny).length > 60 && ui.filter(isEpic).length > 30 && ui.every(n => n.length <= 95), ui.length);
  let quoted = null;
  for (let i = 0; i < 40 && !quoted; i++) { await p.click('#wrand'); const cs = await chipsOf(p, '[data-wsug]'); const at = cs.findIndex(n => n.includes('"')); if (at >= 0) { quoted = cs[at]; await p.locator('[data-wsug]').nth(at).click(); } }
  check('a name with quote marks goes into the field and the saved sheet unharmed', quoted && (await p.inputValue('#w-name')) === quoted && (await p.evaluate(() => window.__journal.S().sheet.name)) === quoted, quoted);

  // catchphrases
  await p.reload(); await p.waitForTimeout(500);
  let cc = await chipsOf(p, '[data-wcatch]');
  check('the catchphrase chips start as the original six', cc.join('|') === POOL.CATCHES.join('|'), cc.join(' | '));
  check('there is a More ideas button', (await p.locator('#wcatchmore').count()) === 1);
  await p.click('#wcatchmore');
  let next = await chipsOf(p, '[data-wcatch]');
  check('More ideas deals six different ones, none of them the six on show', next.length === 6 && dupes(next) === 0 && next.every(x => !cc.includes(x)), next.join(' | '));
  check('two plain, two funny and two over the top', next.filter(x => C.plain.includes(x)).length === 2 && next.filter(x => C.funny.includes(x)).length === 2 && next.filter(x => C.epic.includes(x)).length === 2, next.join(' | '));
  check('the keyboard stays on the button', await p.evaluate(() => document.activeElement && document.activeElement.id === 'wcatchmore'));
  await p.locator('[data-wcatch]').nth(4).click();
  check('tapping one fills the field and the sheet', (await p.inputValue('#w-catch')) === next[4] && (await p.evaluate(() => window.__journal.S().sheet.catch)) === next[4], next[4]);
  await p.click('#wpills button >> nth=0'); await p.click('#wpills button >> nth=1'); await p.waitForTimeout(150);
  check('moving between steps keeps the ideas on show, not the original six', (await chipsOf(p, '[data-wcatch]')).join('|') === next.join('|'));
  const seenC = new Set(next);
  for (let i = 0; i < 60; i++) { await p.click('#wcatchmore'); (await chipsOf(p, '[data-wcatch]')).forEach(x => seenC.add(x)); }
  check('sixty more presses reach most of the pool (and nothing outside it)', [...seenC].every(x => lines.includes(x)) && seenC.size > 60, seenC.size);

  // phone
  p = await open({ width: 390, height: 800 });
  await p.click('#wrand'); await p.click('#wcatchmore');
  check('phone: no sideways scroll with the longest lines showing', await p.evaluate(() => document.documentElement.scrollWidth <= 390), await p.evaluate(() => document.documentElement.scrollWidth));
  await p.locator('#wsugg').scrollIntoViewIfNeeded(); await p.screenshot({ path: path.join(__dirname,'out','names-phone.png') });
  await p.locator('#wcatchbox').scrollIntoViewIfNeeded(); await p.screenshot({ path: path.join(__dirname,'out','catch-phone.png') });

  console.log(results.map(r=>r.join(' | ')).join('\n'));
  const fails = results.filter(r=>r[0]==='FAIL').length;
  console.log('\nTOTAL', results.length, 'FAIL', fails); console.log('ERRORS', errs);
  await b.close();
  if (fails || errs.length) process.exit(1);
})().catch(e=>{ console.log(results.map(r=>r.join(' | ')).join('\n')); console.log('CRASH', e.message.split('\n').slice(0,6).join('\n')); console.log('ERRORS', errs); process.exit(1); });
