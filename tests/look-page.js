// Not a test: writes a look sheet of the hunter's page in every frame to tests/out/page-<frame>-<theme>.png, plus the Customize screen and a phone.
//   node tests/look-page.js [frame ...]
require('fs').mkdirSync(require('path').join(__dirname,'out'),{recursive:true});
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const URL = 'file://'+path.join(__dirname,'..','index.html');
const PHOTO = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, 'fixtures', 'hunter.jpg')).toString('base64');
const FRAMES = process.argv.slice(2).length ? process.argv.slice(2) : ['journal', 'wanted', 'dossier', 'tarot', 'tag', 'scrap'];
const SAVE = (frame, theme, more) => ({ hv: 'page', settings: { fx: true, theme },
  sheet: Object.assign({ name: 'Dee Ray', pronouns: 'she/her', playbook: 'The Mundane', catch: 'I am just here for the snacks.', look: 'Denim jacket, split knuckles, a thermos she never puts down.', photo: PHOTO, thumb: PHOTO, tv: 99, luck: 5, harm: 2, xp: 3, level: 2,
    stats: { charm: 2, cool: 1, sharp: 0, tough: 1, weird: -1 }, hid: 'abc123def4',
    badges: { snake: { n: 3, first: 1, last: 2 }, bag: { n: 1, first: 1, last: 1 }, peak: { n: 6, first: 1, last: 2 }, first: { n: 1, first: 1, last: 1 } }, pins: ['snake', 'bag', 'peak', 'first'],
    career: { sessions: 4, rolls: 61, misses: 19, harm: 14, lvls: 2 },
    inventory: [{ id: 'a', name: 'Crowbar', type: 'Weapon', val: 2, eq: true }],
    bonds: [{ who: 'Old Moss', tie: '', note: '', theirs: '' }],
    page: Object.assign({ mark: 'skull', epithet: 'the Dust Saint', frame, col: 'dice', bg: '', about: 'Drove a delivery van until the night the road ate her route.\nStill owes the company the van.', cases: ['badges', 'sig', 'about', 'dice', 'career'], sig: { weapon: 'Crowbar', move: 'Kick Some Ass', bond: 'Old Moss' } }, more || {}) }),
  dice: { linked: true, a: { body: '#c9a227', finish: 'rust', pip: '#111111', glow: false, sigil: 'skull' }, b: { body: '#c9a227', finish: 'rust', pip: '#111111', glow: false, sigil: 'skull' }, tray: 'rust', sets: [] } });
(async () => {
  const b = await chromium.launch();
  const shot = async (name, save, vp, sel) => {
    const ctx = await b.newContext({ viewport: vp, colorScheme: 'dark' });
    await ctx.addInitScript((j) => { localStorage.setItem('hunters-journal-v1', j); }, JSON.stringify(save));
    const p = await ctx.newPage();
    p.on('pageerror', e => console.log('PAGEERR', name, e.message));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|CORS/.test(m.text())) console.log('CONSOLE', name, m.text()); });
    await p.goto(URL + '#hunter'); await p.waitForTimeout(900);
    const wide = await p.evaluate(() => document.documentElement.scrollWidth);
    if (wide > vp.width) console.log('SIDEWAYS SCROLL', name, wide);
    if (sel) await p.locator(sel).screenshot({ path: path.join(__dirname, 'out', name) }); else await p.screenshot({ path: path.join(__dirname, 'out', name), fullPage: true });
    console.log(name);
    await ctx.close();
  };
  for (const f of FRAMES) {
    await shot('page-' + f + '-dark.png', SAVE(f, 'dark'), { width: 1180, height: 1000 }, '#czprev');
    await shot('page-' + f + '-light.png', SAVE(f, 'light', { col: 'moss', bg: f === 'journal' ? 'dust' : '' }), { width: 1180, height: 1000 }, '#czprev');
  }
  if (process.argv.length <= 2) {
    await shot('page-customize-dark.png', SAVE('', 'dark', { bg: 'rust', dim: 60 }), { width: 1180, height: 1000 });
    await shot('page-customize-phone.png', SAVE('tarot', 'dark'), { width: 390, height: 800 });
  }
  await b.close();
})().catch(e => { console.log('CRASH', e.message); process.exit(1); });
