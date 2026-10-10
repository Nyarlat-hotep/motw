// The hunter's page (track L): a frame, a trim color, a mark and a title, a background, showcases, and the player's own pictures.
// First the page on its own, from a file: what a look may hold, the Customize screen on the Hunter tab, every frame, the colors' contrast, a phone, the card picture.
// Then against the real Worker with `wrangler dev`: the art locker's rules spoken to directly, and three browsers (the Keeper and two players) at one table.
require('fs').mkdirSync(require('path').join(__dirname,'out'),{recursive:true});
const { chromium } = require('playwright');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), WR = path.join(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js'), OUT = path.join(__dirname, 'out');
const PORT = 8796, B = 'http://127.0.0.1:' + PORT, FILE = 'file://' + path.join(ROOT, 'index.html');
const results = []; const errs = [];
function check(name, ok, extra){ results.push([ok?'PASS':'FAIL', name, extra===undefined?'':String(extra)]); }
const fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'hunter.jpg')), PHOTO = 'data:image/jpeg;base64,' + fixture.toString('base64');
const NASTY = '<img src=x onerror="window.__pwn=1">';
const lum = (h) => { const c = [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4)); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const HUNTER = (page, more) => Object.assign({ hv: 'page', share: false, settings: { fx: true, theme: 'dark' },
  sheet: { name: 'Dee Ray', pronouns: 'she/her', playbook: 'The Mundane', catch: 'I am just here for the snacks.', photo: PHOTO, thumb: PHOTO, tv: 99, luck: 5, harm: 2, xp: 3, level: 2, hid: 'abc123def4',
    stats: { charm: 2, cool: 1, sharp: 0, tough: 1, weird: -1 }, badges: { snake: { n: 3, first: 1, last: 2 }, bag: { n: 1, first: 1, last: 1 } }, pins: ['snake', 'bag'], career: { sessions: 4, rolls: 61, misses: 19, harm: 14, lvls: 2 },
    inventory: [{ id: 'a', name: 'Crowbar', type: 'Weapon', val: 2, eq: true }], bonds: [{ who: 'Old Moss', tie: '', note: '', theirs: '' }], page: page || {} } }, more || {});

let child = null, log = '';
function startServer() {
  const dir = path.join(OUT, 'wrangler-' + PORT);
  fs.rmSync(dir, { recursive: true, force: true });
  child = spawn(process.execPath, [WR, 'dev', '--config', path.join(ROOT, 'worker', 'wrangler.jsonc'), '--port', String(PORT), '--ip', '127.0.0.1', '--persist-to', dir, '--var', 'DEV:1', '--var', 'KEEPER_EMAILS:kay@dev.test'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', d => { log += d; }); child.stderr.on('data', d => { log += d; });
}
async function ready() {
  for (let i = 0; i < 120; i++) { try { await fetch(B + '/api/me'); return; } catch (e) { await new Promise(r => setTimeout(r, 500)); } }
  throw new Error('wrangler dev did not start\n' + log.slice(-1500));
}
function stopServer() { try { fs.writeFileSync(path.join(OUT, 'wrangler-' + PORT + '.log'), log); } catch (e) { /* no folder */ } try { if (child) { if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F']); else child.kill('SIGKILL'); } } catch (e) { /* gone */ } child = null; }
process.on('exit', stopServer);

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const watch = (p, who) => { p.on('pageerror', e => errs.push('PAGEERR(' + who + ') ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE(' + who + ') ' + m.text()); }); };
  const open = async (url, save, vp, who) => {
    const ctx = await b.newContext({ viewport: vp || { width: 1180, height: 950 }, colorScheme: 'dark' });
    await ctx.addInitScript((j) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hunters-journal-v1', j); sessionStorage.setItem('seeded', '1'); } }, JSON.stringify(save));
    const p = await ctx.newPage(); watch(p, who || 'file');
    await p.goto(url); await p.waitForTimeout(700);
    return p;
  };
  const S = (p) => p.evaluate(() => window.__journal.S());
  const wide = (p) => p.evaluate(() => document.documentElement.scrollWidth);

  /* ================= the page on its own ================= */
  let p = await open(FILE + '#hunter', HUNTER());
  // what a look may hold
  const dirty = await p.evaluate((nasty) => window.__journal.pageClean({ mark: 'constructor', epithet: nasty + 'x'.repeat(80), frame: '__proto__', col: 'toString', bg: 'javascript:alert(1)', dim: 1e9, blur: -5, fw: 'x', about: 'a' + String.fromCharCode(0) + 'b\nc' + 'y'.repeat(900),
    cases: ['about', 'about', 'nope', 7, 'constructor', 'dice'], sig: { weapon: nasty, move: 7, bond: null }, art: { bg: '../../etc', frame: '0123456789abcdef01', pframe: 'https://evil.test/x.png', gal: ['0123456789abcdef02', '0123456789abcdef02', 'zz', '0123456789abcdef03', '0123456789abcdef04', '0123456789abcdef05'] }, extra: 'dropped' }), NASTY);
  check('a look keeps only what the page knows: an unknown mark, frame, color and background are dropped', dirty.mark === '' && dirty.frame === '' && dirty.col === '' && dirty.bg === '' && dirty.extra === undefined, JSON.stringify([dirty.mark, dirty.frame, dirty.col, dirty.bg]));
  check('numbers are clamped and text is cut', dirty.dim === 90 && dirty.blur === 0 && dirty.fw === 18 && dirty.epithet.length === 40 && dirty.about.length === 400 && dirty.about.slice(0, 5) === 'a b\nc', JSON.stringify([dirty.dim, dirty.blur, dirty.fw, dirty.epithet.length, dirty.about.length]));
  check('showcases are ones from the list, each once', dirty.cases.join() === 'about,dice', dirty.cases.join());
  check('pictures are ids and nothing else: no path, no address, three in the gallery at most', dirty.art.bg === '' && dirty.art.frame === '0123456789abcdef01' && dirty.art.pframe === '' && dirty.art.gal.join() === '0123456789abcdef02,0123456789abcdef03,0123456789abcdef04', JSON.stringify(dirty.art));
  const blank = await p.evaluate(() => [window.__journal.pageClean(null), window.__journal.pageClean('x'), window.__journal.pageClean([1])].map(x => x.cases.join() + '|' + x.frame + '|' + x.dim));
  check('nothing at all gives the plain page with the four first showcases', blank.every(x => x === 'badges,sig,about,dice||55'), blank.join(' '));
  // every color can be read on every frame
  const trims = await p.evaluate(() => { const J = window.__journal, out = []; const dice = [['#c9a227', '#111111'], ['#111111', '#0a0a0a'], ['#ffffff', '#fefefe'], ['#2b2a2e', '#ff8a2a'], ['#f5f5f2', '#111111']];
    const sfs = [['light', '#e6dccb']].concat(J.frames.filter(f => f.pal === 'light').map(f => ['light', f.sf]), [['dark', '#26191d']], J.frames.filter(f => f.pal === 'dark').map(f => ['dark', f.sf]));
    sfs.forEach(([pal, sf]) => { ['ox', 'moss', 'midnight', 'brass', 'rust', 'dust'].forEach(c => out.push([c, pal, sf, J.trimFor(c, null, pal, sf)])); dice.forEach(d => out.push(['dice ' + d[0], pal, sf, J.trimFor('dice', { a: { body: d[0], pip: d[1] } }, pal, sf)])); });
    return out; });
  const weak = trims.filter(t => !/^#[0-9a-f]{6}$/i.test(t[3]) || contrast(t[3], t[2]) < 4.5);
  check('every trim color reaches 4.5 to 1 on every frame it can sit on (' + trims.length + ' pairs), even from black or white dice', trims.length >= 70 && weak.length === 0, JSON.stringify(weak.slice(0, 4)));
  check('The journal\'s own color, and dice that are not dice, give no trim of their own', (await p.evaluate(() => [window.__journal.trimFor('', null, 'dark', '#26191d'), window.__journal.trimFor('dice', null, 'dark', '#26191d'), window.__journal.trimFor('dice', { a: { body: 'red', pip: 'url(x)' } }, 'dark', '#26191d')].join('|'))) === '||');

  // the Customize screen
  check('the Hunter tab has a third view, My page, and it opens on it', (await p.locator('#seg-page').getAttribute('aria-pressed')) === 'true' && await p.locator('#hv-page').isVisible() && !(await p.locator('#hv-sheet').isVisible()));
  let look = () => p.evaluate(() => { const h = document.querySelector('#czprev .hpage'), c = document.querySelector('#czprev .pcard'); return { page: h.className, card: c.className, cases: [...h.querySelectorAll('[data-case]')].map(e => e.dataset.case).join(), name: h.querySelector('h2').textContent.trim(), epi: (h.querySelector('.epi') || {}).textContent || '', cepi: (c.querySelector('.epi') || {}).textContent || '', mark: !!h.querySelector('h2 svg.mk'), cmark: !!c.querySelector('h3 svg.mk'), bg: !!h.querySelector('.frbg'), open: c.querySelectorAll('[data-hpage]').length }; });
  let l = await look();
  check('a Mundane starts on the journal page, with the four first showcases', /\bfr-journal\b/.test(l.page) && /\bfr-journal\b/.test(l.card) && l.cases === 'badges,sig,about,dice' && l.name === 'Dee Ray', JSON.stringify(l));
  check('the preview is not a way out of the page: no Open page button in it', l.open === 0);
  check('an empty showcase of mine says what goes in it', (await p.locator('#czprev [data-case="about"] .hp-hint').count()) === 1 && (await p.locator('#czprev [data-case="sig"] .hp-hint').count()) === 1);
  for (const f of ['wanted', 'dossier', 'tarot', 'tag', 'scrap']) {
    await p.click('[data-cz="frame"][data-v="' + f + '"]'); l = await look();
    const pal = /wanted|dossier/.test(f) ? 'pal-light' : 'pal-dark';
    const read = await p.evaluate(() => { const h = document.querySelector('#czprev .hpage'), cs = getComputedStyle(h), pc = cs.getPropertyValue('--pc').trim(), m = getComputedStyle(h.querySelector('.hp-id .small.muted')).color; return { ink: cs.color, pc, muted: m, focus: document.activeElement && document.activeElement.dataset.v }; });
    check(f + ': the page and the card both wear it, with its own paper or metal', new RegExp('\\bfr-' + f + '\\b').test(l.page) && new RegExp('\\bfr-' + f + '\\b').test(l.card) && l.page.indexOf(pal) > 0 && l.card.indexOf(pal) > 0, l.page + ' / ' + l.card);
    check(f + ': the button pressed keeps the focus, and nothing scrolls sideways', read.focus === f && (await wide(p)) <= 1180, JSON.stringify(read));
    await p.locator('#czprev').screenshot({ path: path.join(OUT, 'hp-' + f + '.png') });
  }
  check('the frame is saved with the hunter', (await S(p)).sheet.page.frame === 'scrap');
  await p.click('[data-cz="frame"][data-v=""]'); l = await look();
  check('Suits my playbook goes back to the playbook\'s own frame', /\bfr-journal\b/.test(l.page) && (await S(p)).sheet.page.frame === '');
  await p.evaluate(() => { window.__journal.S().sheet.playbook = 'The Professional'; }); await p.click('[data-cz="col"][data-v=""]'); l = await look();
  check('a Professional starts on the agency dossier', /\bfr-dossier\b/.test(l.page), l.page);
  await p.evaluate(() => { window.__journal.S().sheet.playbook = 'The Mundane'; });

  // color
  await p.click('[data-cz="col"][data-v="moss"]');
  let pc = await p.evaluate(() => { const h = document.querySelector('#czprev .hpage'); return { pc: getComputedStyle(h).getPropertyValue('--pc').trim(), style: h.getAttribute('style') }; });
  check('an ink colors the trim: the dark page gets the ink\'s dark color', pc.pc.toLowerCase() === '#7fcf8e' && /--pcl:#2f6b3a/i.test(pc.style), JSON.stringify(pc));
  await p.click('[data-cz="col"][data-v="dice"]');
  pc = await p.evaluate(() => getComputedStyle(document.querySelector('#czprev .hpage')).getPropertyValue('--pc').trim());
  check('Match my dice takes a color from the dice that can be read on the page', /^#[0-9a-f]{6}$/i.test(pc) && contrast(pc, '#26191d') >= 4.5, pc);

  // title and mark
  await p.fill('#cz-epi', NASTY); l = await look();
  check('a title is shown as plain text on the page and the card, never as markup', l.epi === NASTY.slice(0, 40) && l.cepi === NASTY.slice(0, 40) && (await p.evaluate(() => window.__pwn)) === undefined && (await p.locator('#czprev img[src="x"]').count()) === 0, l.epi);
  check('typing does not redraw the choices under the cursor', (await p.evaluate(() => document.activeElement.id)) === 'cz-epi');
  await p.fill('#cz-epi', 'the Dust Saint');
  await p.click('[data-cz="epi"]');
  const sug = (await S(p)).sheet.page.epithet;
  check('Suggest one deals a title from the name lists', /^the \S/.test(sug) && sug.length <= 40 && sug !== 'the Dust Saint', sug);
  await p.fill('#cz-epi', 'the Dust Saint');
  const all = await p.locator('.czmarks button').count();
  await p.fill('#cz-q', 'skull');
  const some = await p.locator('.czmarks button').count();
  check('the marks can be searched by name (' + all + ' in all)', all > 300 && some > 0 && some < 30 && /of \d+ match/.test(await p.textContent('#czmarkn')) && (await p.evaluate(() => document.activeElement.id)) === 'cz-q', all + ' ' + some);
  await p.click('.czmarks [data-v="skull"]'); l = await look();
  check('a mark sits beside the name on the page and the card', l.mark && l.cmark && (await S(p)).sheet.page.mark === 'skull');
  await p.fill('#cz-q', 'zzzz');
  check('a search with no match says so', /0 of/.test(await p.textContent('#czmarkn')) && (await p.locator('.czmarks').count()) === 0);
  await p.fill('#cz-q', '');

  // background
  await p.click('[data-cz="bg"][data-v="rust"]');
  let bg = await p.evaluate(() => { const g = document.querySelector('#czprev .hpage .frbg'), c = document.querySelector('#czprev .pcard .frbg'); return { img: g.style.backgroundImage, dim: g.style.getPropertyValue('--dim'), cdim: c.style.getPropertyValue('--dim'), sliders: !!document.getElementById('cz-dim') }; });
  check('a background from the journal\'s own textures, dimmed (more on the small card)', /tray-rust\.jpg/.test(bg.img) && bg.dim === '0.55' && bg.cdim === '0.77' && bg.sliders, JSON.stringify(bg));
  await p.evaluate(() => { const e = document.getElementById('cz-dim'); e.value = 80; e.dispatchEvent(new Event('input', { bubbles: true })); const f = document.getElementById('cz-blur'); f.value = 6; f.dispatchEvent(new Event('input', { bubbles: true })); });
  bg = await p.evaluate(() => { const g = document.querySelector('#czprev .hpage .frbg'); return { dim: g.style.getPropertyValue('--dim'), blur: g.style.filter }; });
  check('Dim and Blur move the preview', bg.dim === '0.8' && /blur\(6px\)/.test(bg.blur) && (await S(p)).sheet.page.dim === 80, JSON.stringify(bg));
  await p.click('[data-cz="bg"][data-v="own"]');
  check('My own picture, with no table, says how to get one and leaves the page plain', /Upload a picture/.test(await p.textContent('#czopts')) && (await p.locator('#czprev .frbg').count()) === 0);
  check('without the table, Your pictures says they are kept there', /kept at the shared table/.test(await p.textContent('#czartcard')) && (await p.locator('[data-cz="art-add"]').count()) === 0);
  await p.click('[data-cz="bg"][data-v=""]');

  // showcases
  l = await look();
  check('an About with nothing in it still shows on my own page, with a hint', (await p.locator('#czprev [data-case="about"] .hp-hint').count()) === 1 || l.cases.indexOf('about') < 0, l.cases);
  await p.fill('#cz-about', 'Drove a van.\n' + NASTY); l = await look();
  check('About keeps its lines and is plain text', /about/.test(l.cases) && (await p.textContent('#czprev .hp-about')) === 'Drove a van.\n' + NASTY && (await p.evaluate(() => window.__pwn)) === undefined);
  await p.selectOption('#cz-sw', 'Crowbar'); await p.selectOption('#cz-sm', 'Kick Some Ass'); await p.selectOption('#cz-sb', 'Old Moss');
  check('Signature features a weapon from the inventory, a move and a bond', /Crowbar/.test(await p.textContent('#czprev [data-case="sig"]')) && /Kick Some Ass/.test(await p.textContent('#czprev [data-case="sig"]')) && /Old Moss/.test(await p.textContent('#czprev [data-case="sig"]')));
  await p.uncheck('[data-cz-case="about"]'); l = await look();
  check('unticking a showcase takes it off the page', l.cases === 'badges,sig,dice', l.cases);
  await p.check('[data-cz-case="career"]'); await p.click('[data-cz="case-up"][data-v="career"]'); await p.click('[data-cz="case-up"][data-v="career"]'); l = await look();
  check('ticking one adds it, and Up moves it', l.cases === 'badges,career,sig,dice' && /61/.test(await p.textContent('#czprev [data-case="career"]')), l.cases);
  check('the badge case shows the pinned badges with their counts and lines', /Snake Eyes/.test(await p.textContent('#czprev [data-case="badges"]')) && /x3/.test(await p.textContent('#czprev [data-case="badges"]')) && (await p.locator('#czprev [data-case="badges"] svg.bdg').count()) === 2);
  check('the dice are the player\'s own two', (await p.locator('#czprev [data-case="dice"] .mdie').count()) === 2);
  await p.screenshot({ path: path.join(OUT, 'hp-customize.png'), fullPage: true });
  // it lasts
  await p.evaluate(() => window.__journal.scheduleSave()); await p.waitForTimeout(900); await p.reload(); await p.waitForTimeout(700);
  const kept = (await S(p)).sheet.page;
  check('the page is saved and comes back after a reload', kept.mark === 'skull' && kept.epithet === 'the Dust Saint' && kept.col === 'dice' && kept.cases.join() === 'badges,career,sig,dice' && kept.sig.weapon === 'Crowbar', JSON.stringify(kept));
  // the card picture
  await p.click('#seg-sheet'); await p.click('#hv-sheet [data-hcard]'); await p.waitForFunction(() => window.__card.pins === 2 && window.__card.mark && window.__card.photo, null, { timeout: 8000 }).catch(() => {});
  const card = await p.evaluate(() => ({ pins: window.__card.pins, mark: window.__card.mark, trim: window.__card.trim, spill: window.__card.boxes.filter(x => x.w > x.max + .5).length, title: window.__card.boxes.some(x => x.t === 'the Dust Saint'), kicker: window.__card.boxes.some(x => x.t === 'Monster of the Week') }));
  check('the card picture carries the title, the mark, the trim color and the pinned badges, and nothing spills', card.pins === 2 && card.mark && /^#[0-9a-f]{6}$/i.test(card.trim) && card.spill === 0 && card.title && !card.kicker, JSON.stringify(card));
  await p.locator('#hc-canvas').screenshot({ path: path.join(OUT, 'hp-card-picture.png') });
  await p.click('#hc-close');
  // a hunter with no look at all is the card it always was
  p = await open(FILE + '#hunter', HUNTER({}, { hv: 'sheet' }));
  await p.click('#hv-sheet [data-hcard]'); await p.waitForFunction(() => window.__card.photo, null, { timeout: 8000 }).catch(() => {});
  const plain = await p.evaluate(() => ({ mark: window.__card.mark, kicker: window.__card.boxes.some(x => x.t === 'Monster of the Week'), spill: window.__card.boxes.filter(x => x.w > x.max + .5).length }));
  check('with no title and no mark the card picture is as it was', !plain.mark && plain.kicker && plain.spill === 0, JSON.stringify(plain));
  // a phone, in the light look
  p = await open(FILE + '#hunter', HUNTER({ frame: 'tarot', mark: 'skull', epithet: 'the Dust Saint of the Seven Dry Wells', col: 'rust', bg: 'dust', cases: ['badges', 'sig', 'about', 'dice', 'career'], about: 'x '.repeat(190), sig: { weapon: 'Crowbar', move: 'Kick Some Ass', bond: 'Old Moss' } }, { settings: { fx: true, theme: 'light' } }), { width: 390, height: 800 });
  check('phone: My page fits, and nothing scrolls sideways', (await wide(p)) <= 390, await wide(p));
  const cut = await p.evaluate(() => [...document.querySelectorAll('#czprev .hpage, #czprev .pcard')].map(e => { const r = e.getBoundingClientRect(); return [...e.querySelectorAll('h2, h3, p, li, dd')].filter(x => { const b = x.getBoundingClientRect(); return b.width && (b.right > r.right + 1 || b.left < r.left - 1); }).length; }).join());
  check('phone: nothing inside the page or the card pokes out of its frame', cut === '0,0', cut);
  for (const f of ['wanted', 'dossier', 'tag', 'scrap', 'journal']) { await p.click('[data-cz="frame"][data-v="' + f + '"]'); const w = await wide(p); if (w > 390) check('phone: ' + f + ' fits', false, w); }
  check('phone: every frame fits', (await wide(p)) <= 390);
  await p.screenshot({ path: path.join(OUT, 'hp-phone.png'), fullPage: true });

  /* ================= at the table ================= */
  spawnSync(process.execPath, [path.join(ROOT, 'tools', 'build.js')], { cwd: ROOT });
  startServer(); await ready();
  const api = async (as, method, p2, body) => { const r = await fetch(B + p2 + (p2.indexOf('?') < 0 ? '?' : '&') + 'as=' + as, { method, body, headers: { connection: 'close' } }); const buf = Buffer.from(await r.arrayBuffer()); let json = null; try { json = JSON.parse(buf.toString()); } catch (e) { /* a picture */ } return { status: r.status, json, body: buf, h: r.headers }; };
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40)]);
  // the locker's rules
  let r = await api('alice', 'PUT', '/api/art', fixture);
  check('a player can put a picture in their own locker', r.status === 201 && /^[0-9a-f]{18}$/.test(r.json.id) && r.json.mime === 'image/jpeg', JSON.stringify(r.json));
  const a1 = r.json.id;
  r = await api('alice', 'PUT', '/api/art', png);
  check('a PNG is taken too, for a frame with a clear middle', r.status === 201 && r.json.mime === 'image/png', JSON.stringify(r.json));
  const a2 = r.json.id;
  const bad = [];
  for (const body of [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), Buffer.from('GIF89a' + 'x'.repeat(40)), Buffer.from('<html><script>alert(1)</script></html>'), Buffer.alloc(4)]) bad.push((await api('alice', 'PUT', '/api/art', body)).status);
  check('an SVG, a GIF, a web page and rubbish are refused', bad.every(s => s === 415), bad.join());
  const big = Buffer.alloc(700 * 1024 + 10); big[0] = 0xff; big[1] = 0xd8; big[2] = 0xff;
  check('a picture over 700 KB is refused', (await api('alice', 'PUT', '/api/art', big)).status === 413);
  for (let i = 0; i < 4; i++) await api('alice', 'PUT', '/api/art', fixture);
  r = await api('alice', 'PUT', '/api/art', fixture);
  check('the locker holds six, and the seventh is refused', r.status === 409 && r.json.error === 'locker full', JSON.stringify(r.json));
  r = await api('alice', 'GET', '/api/art');
  check('a player can list their own pictures', r.status === 200 && r.json.art.length === 6 && r.json.art.some(x => x.id === a1) && r.json.art.every(x => x.owner === undefined), JSON.stringify(r.json).slice(0, 200));
  r = await api('bob', 'GET', '/api/art?all=1');
  check('another player\'s list is their own, even if they ask for everyone\'s', r.status === 200 && r.json.art.length === 0);
  r = await api('kay', 'GET', '/api/art?all=1');
  check('the Keeper can list everyone\'s, with whose each is', r.status === 200 && r.json.art.length === 6 && r.json.art.every(x => /^[0-9a-f]{12}$/.test(x.owner) && typeof x.name === 'string'));
  r = await api('bob', 'GET', '/api/art/' + a1);
  check('anyone at the table can look at a picture, and it comes back as a picture that cannot run', r.status === 200 && r.h.get('content-type') === 'image/jpeg' && r.h.get('x-content-type-options') === 'nosniff' && /default-src 'none'/.test(r.h.get('content-security-policy')) && Buffer.compare(r.body, fixture) === 0);
  check('a picture that is not there is not found', (await api('bob', 'GET', '/api/art/' + '0'.repeat(18))).status === 404 && (await api('bob', 'GET', '/api/art/..%2f..%2fme')).status === 404);
  check('nobody signed in gets nothing', (await fetch(B + '/api/art/' + a1)).status === 401 && (await fetch(B + '/api/art', { method: 'PUT', body: fixture })).status === 401);
  check('another player cannot remove it', (await api('bob', 'DELETE', '/api/art/' + a1)).status === 403 && (await api('bob', 'GET', '/api/art/' + a1)).status === 200);
  const other = await fetch(B + '/api/art/' + a2 + '?as=alice', { method: 'DELETE', headers: { origin: 'https://evil.test' } });
  check('a page on another site cannot remove it either', other.status === 403);
  check('its owner can', (await api('alice', 'DELETE', '/api/art/' + a2)).status === 200 && (await api('bob', 'GET', '/api/art/' + a2)).status === 404);
  for (const x of (await api('alice', 'GET', '/api/art')).json.art) if (x.id !== a1) await api('alice', 'DELETE', '/api/art/' + x.id);
  const b1 = (await api('bob', 'PUT', '/api/art', fixture)).json.id;

  // three browsers at one table
  const ALICE = HUNTER({ frame: 'wanted', mark: 'skull', epithet: 'the Dust Saint', col: 'moss', about: 'Drove a van.', cases: ['badges', 'sig', 'about', 'dice', 'career', 'gallery'], sig: { weapon: 'Crowbar', move: 'Kick Some Ass', bond: 'Old Moss' }, art: { bg: b1, frame: '', pframe: '', gal: [b1] }, bg: 'own' }, { share: true });
  const BOB = { hv: 'sheet', share: true, settings: { fx: true, theme: 'dark' }, sheet: { name: 'Old Moss', playbook: 'The Expert', luck: 6, harm: 0, hid: 'bob123bob4', stats: { charm: 0, cool: 1, sharp: 2, tough: -1, weird: 1 } } };
  const pa = await open(B + '/?as=alice#hunter', ALICE, null, 'alice'), pb = await open(B + '/?as=bob#party', BOB, null, 'bob'), pk = await open(B + '/?as=kay#party', { settings: { fx: true, theme: 'dark' } }, null, 'kay');
  await pb.waitForSelector('.pcard:not(.you)', { timeout: 8000 });
  await pa.waitForSelector('.czart li', { timeout: 8000 });
  let seen = async () => pb.evaluate(() => { const c = document.querySelector('.pcard:not(.you)'); return c ? { cls: c.className, epi: (c.querySelector('.epi') || {}).textContent || '', mark: !!c.querySelector('h3 svg.mk'), top: (c.querySelector('.frtop') || {}).textContent || '', bg: !!c.querySelector('.frbg'), pc: getComputedStyle(c).getPropertyValue('--pc').trim(), seat: document.querySelectorAll('.seat svg.mk').length } : null; });
  let sv = await seen();
  check('another player sees the frame, the title, the mark and the color on the card', /\bfr-wanted\b/.test(sv.cls) && /pal-light/.test(sv.cls) && sv.epi === 'the Dust Saint' && sv.mark && /Wanted/.test(sv.top) && /^#[0-9a-f]{6}$/i.test(sv.pc), JSON.stringify(sv));
  check('and the mark beside the player\'s name in the list of who is here', sv.seat === 1);
  check('a card that names somebody else\'s picture has it taken off by the table', !sv.bg && (await pb.evaluate(() => JSON.stringify(window.__journal.S() && [...document.querySelectorAll('.pcard:not(.you) [data-artimg]')].length))) === '0');
  check('and the player who named it has it taken off their own page too, once their locker has been read', (await S(pa)).sheet.page.art.bg === '' && (await S(pa)).sheet.page.art.gal.length === 0);
  // Alice uses her own picture as her background and in her gallery
  await pa.click('[data-cz="art-use"][data-v="bg"][data-id="' + a1 + '"]'); await pa.click('[data-cz="art-use"][data-v="gal"][data-id="' + a1 + '"]');
  check('pressing Background on a picture of mine puts it behind my page', (await pa.evaluate(() => document.querySelector('#czprev .hpage .frbg').style.backgroundImage)).indexOf('/api/art/' + a1) > 0 && /used as background, gallery/.test(await pa.textContent('.czart')));
  await pb.waitForSelector('.pcard:not(.you) .frbg', { timeout: 6000 }).catch(() => {});
  sv = await seen();
  check('and the other player sees it within a few seconds', sv.bg, JSON.stringify(sv));
  // upload through the page
  const [chooser] = await Promise.all([pa.waitForEvent('filechooser'), pa.click('[data-cz="art-add"][data-v="pic"]')]);
  await chooser.setFiles(path.join(__dirname, 'fixtures', 'hunter.jpg'));
  await pa.waitForFunction(() => document.querySelectorAll('.czart li').length === 2, null, { timeout: 10000 }).catch(() => {});
  check('a picture chosen in the page is shrunk, sent and listed', (await pa.locator('.czart li').count()) === 2 && /Picture added/.test(await pa.textContent('#cz-say')), await pa.textContent('#cz-say'));
  const mine = (await api('alice', 'GET', '/api/art')).json.art;
  const sent = await api('alice', 'GET', '/api/art/' + mine[mine.length - 1].id);
  check('what was sent is a JPEG redrawn by the page, not the file as it was', sent.h.get('content-type') === 'image/jpeg' && Buffer.compare(sent.body, fixture) !== 0 && sent.body.length <= 700 * 1024, sent.body.length);
  // Bob opens Alice's page
  await pb.click('.pcard:not(.you) [data-hpage]'); await pb.waitForSelector('#hpdlg[open] .hpage');
  const dlg = await pb.evaluate(() => { const h = document.querySelector('#hpdlg .hpage'); return { cls: h.className, cases: [...h.querySelectorAll('[data-case]')].map(e => e.dataset.case).join(), by: h.querySelector('.hp-id .small.muted').textContent, gal: h.querySelectorAll('[data-artimg]').length, edit: document.getElementById('hpdlg-edit').hidden, hints: h.querySelectorAll('.hp-hint').length, focus: document.activeElement.id, lv: h.querySelector('.lvplate').getAttribute('aria-label') }; });
  check('Open page shows the whole page: the frame, the showcases in the player\'s order, who plays them, the level', /\bfr-wanted\b/.test(dlg.cls) && dlg.cases === 'badges,sig,about,dice,career,gallery' && /played by/.test(dlg.by) && dlg.lv === 'Level 2' && dlg.focus === 'hpdlg-close', JSON.stringify(dlg));
  check('somebody else\'s page has no hints and no Customize button', dlg.hints === 0 && dlg.edit === true && dlg.gal === 1);
  await pb.screenshot({ path: path.join(OUT, 'hp-open-page.png') });
  await pa.fill('#cz-epi', 'the Late'); await pa.evaluate(() => window.__journal.scheduleSave());
  await pb.waitForFunction(() => /the Late/.test(document.querySelector('#hpdlg .epi').textContent), null, { timeout: 6000 }).catch(() => {});
  check('the open page follows the player\'s changes', /the Late/.test(await pb.textContent('#hpdlg .epi')));
  await pb.click('#hpdlg-close');
  check('closing it gives the focus back to the button that opened it', (await pb.evaluate(() => document.activeElement.dataset.hpage || '')).length === 12);
  await pb.click('.pcard.you [data-hpage]'); await pb.waitForSelector('#hpdlg[open] .hpage');
  check('my own page offers Customize', (await pb.locator('#hpdlg-edit').isVisible()));
  await pb.click('#hpdlg-edit');
  check('which goes to My page on the Hunter tab', (await S(pb)).tab === 'hunter' && (await S(pb)).hv === 'page' && await pb.locator('#czopts').isVisible());
  await pb.click('#t-party');
  // the roll feed
  await pa.click('#t-roll'); await pa.click('#roll'); await pa.waitForSelector('#copyroll', { timeout: 6000 });
  await pb.click('#t-play'); await pb.waitForSelector('.tfeed li', { timeout: 6000 }).catch(() => {});
  check('a roll in the feed carries the roller\'s mark', (await pb.locator('.tfeed li svg.mk').count()) === 1);
  await pb.click('#t-party');
  // the Keeper removes a picture
  await pk.click('[data-pv="desk"]'); await pk.waitForSelector('.kart li', { timeout: 6000 });
  check('the Keeper\'s desk lists the players\' pictures with whose they are', (await pk.locator('.kart li').count()) === 3 && /Player|alice|bob/i.test(await pk.textContent('.kart')));
  const target = '.kart [data-kart="del"][data-id="' + a1 + '"]';
  await pk.click(target); await pk.click('.kart [data-kart="yes"][data-id="' + a1 + '"]');
  await pb.waitForFunction(() => !document.querySelector('.pcard:not(.you) .frbg'), null, { timeout: 6000 }).catch(() => {});
  sv = await seen();
  check('a picture the Keeper removes comes off the card on everyone\'s screen', !sv.bg && (await api('bob', 'GET', '/api/art/' + a1)).status === 404, JSON.stringify(sv));
  await pa.click('#t-hunter'); await pa.waitForFunction((n) => document.querySelectorAll('.czart li').length === n, 1, { timeout: 6000 }).catch(() => {});
  const after = (await S(pa)).sheet.page;
  check('and off its owner\'s page and out of their locker list', after.art.bg === '' && after.art.gal.length === 0 && (await pa.locator('.czart li').count()) === 1, JSON.stringify(after.art));
  // a hostile player
  const pm = await (await b.newContext()).newPage(); watch(pm, 'mallory');
  await pm.goto(B + '/api/nothing?as=mallory');
  await pm.evaluate(([nasty, stolen]) => new Promise((res) => { const ws = new WebSocket('ws://' + location.host + '/api/ws?as=mallory'); ws.onopen = () => { ws.send(JSON.stringify({ t: 'card', card: { name: 'Mal ' + nasty, playbook: 'The Crooked', level: 3, pins: ['snake'], pinn: [1e9],
    page: { mark: '"><script>window.__pwn=2</script>', epithet: nasty, frame: 'own"><b>', col: 'red;background:url(https://evil.test/x)', bg: 'own', dim: -50, fw: 9999, about: nasty + '\n' + nasty, cases: ['about', '<b>', 'sig', 'gallery'], sig: { weapon: nasty, move: nasty, bond: nasty }, art: { bg: stolen, frame: stolen, pframe: 'https://evil.test/a.png', gal: [stolen, 'x'] } } } })); setTimeout(res, 500); }; }), [NASTY, b1]);
  await pb.waitForFunction(() => document.querySelectorAll('.pcard').length === 3, null, { timeout: 6000 }).catch(() => {});
  const mal = await pb.evaluate(() => { const c = [...document.querySelectorAll('.pcard')].find(x => /Mal/.test(x.textContent)); return c ? { cls: c.className, style: c.getAttribute('style') || '', html: c.innerHTML, pwn: window.__pwn, live: c.querySelectorAll('script, img[src="x"], [onerror], b, a[href]').length, text: c.querySelector('.epi').textContent } : null; });
  check('a card full of markup is shown as text: nothing runs, no picture of somebody else\'s, and the frame falls back to the playbook\'s', !!mal && mal.pwn === undefined && /\bfr-wanted\b/.test(mal.cls) && mal.live === 0 && mal.text.indexOf('<img') === 0 && !/evil\.test/.test(mal.html) && !/api\/art/.test(mal.html + mal.style) && !/url\(/.test(mal.style), mal && (mal.cls + ' | ' + mal.style + ' | ' + mal.live));
  await pb.click('.pcard:not(.you) [data-hpage] >> nth=-1').catch(() => {});
  const btn = await pb.evaluate(() => { const c = [...document.querySelectorAll('.pcard')].find(x => /Mal/.test(x.textContent)); c.querySelector('[data-hpage]').click(); const h = document.querySelector('#hpdlg .hpage'); return { pwn: window.__pwn, imgs: [...h.querySelectorAll('img')].map(i => i.getAttribute('src')).join(' '), about: (h.querySelector('.hp-about') || {}).textContent || '', n: h.querySelector('.bdg') ? 1 : 0 }; });
  check('and so is their page', btn.pwn === undefined && !/evil|api\/art|^x$| x /.test(btn.imgs) && btn.about.indexOf('<img') === 0, JSON.stringify(btn));
  await pb.screenshot({ path: path.join(OUT, 'hp-hostile.png') });

  console.log(results.map(r=>r.join(' | ')).join('\n'));
  const fails = results.filter(r=>r[0]==='FAIL').length;
  console.log('\nTOTAL', results.length, 'FAIL', fails); console.log('ERRORS', errs);
  await b.close(); stopServer();
  if (fails || errs.length) process.exit(1);
  process.exit(0);
})().catch(e=>{ console.log(results.map(r=>r.join(' | ')).join('\n')); console.log('CRASH', e.message.split('\n').slice(0,6).join('\n')); console.log('ERRORS', errs); stopServer(); process.exit(1); });
