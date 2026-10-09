// The Keeper's guide (H0): "Running the game" in the Guide. Counts and numbers are pinned to the Keeper's reference sheets (pages 5 and 6 of the consolidated PDF),
// the wording must be paraphrase (none of the sheet's own phrasing), and it must fit a phone in both themes.
require('fs').mkdirSync(require('path').join(__dirname,'out'),{recursive:true});
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://'+path.join(__dirname,'..','index.html');
const results = []; const errs = [];
function check(name, ok, extra){ results.push([ok?'PASS':'FAIL', name, extra===undefined?'':String(extra)]); }
// phrases taken straight from the sheet: none of them may appear in the guide
const SHEET = ['Make the world seem real', 'Put horror in everyday situations', 'Address the hunters, not the', 'Be a fan of the hunters', 'Momentarily inhibited', 'Boast and gloat',
  'Return from seeming destruction', 'Reveal future badness', 'Reveal off-screen badness', 'Turn their move back on them', 'Display inability or incompetence', 'Disobey the master',
  'Display a hint of conscience', 'Create a particular feeling', 'Something doesn\'t work properly', 'to run wild, destroying and killing', 'to usurp unnatural power', 'to tempt people into evil deeds',
  'Always Say', 'Hunter Basic Moves'];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(()=>chromium.launch());
  const open = async (scheme, viewport) => {
    const ctx = await b.newContext({ viewport: viewport || { width: 1100, height: 900 }, colorScheme: scheme });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
    p.on('console', m => { if (m.type()==='error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
    await p.goto(URL+'#guide'); await p.waitForTimeout(500);
    await p.evaluate(() => { document.querySelector('#sect-keeper').open = true; });
    return p;
  };
  let p = await open('dark');
  const info = await p.evaluate(() => {
    const s = document.querySelector('#sect-keeper'), chips = [...s.querySelectorAll('ul.chips')].map(u => u.querySelectorAll('li').length), tabs = [...s.querySelectorAll('table')].map(t => t.querySelectorAll('tr').length);
    return { chips, tabs, text: s.innerText.replace(/\s+/g, ' '), summary: s.querySelector('summary').textContent.trim(), n: document.querySelectorAll('#p-guide details.sect').length };
  });
  check('the section is in the Guide, after Behind the Keeper\'s screen', info.summary === 'Running the game (for the Keeper)' && await p.evaluate(() => document.querySelector('#sect-keeper').previousElementSibling.querySelector('summary').textContent.trim() === "Behind the Keeper's screen"));
  check('12 principles', info.chips[0] === 12, info.chips[0]);
  check('13 basic Keeper moves', info.chips[1] === 13, info.chips[1]);
  check('threat moves: 14 monster, 11 minion, 10 bystander, 11 location', info.chips.slice(2).join() === '14,11,10,11', info.chips.slice(2).join());
  check('harm moves: four rows', info.tabs[0] === 4, info.tabs[0]);
  check('threat types: 12 monsters, 10 minions, 9 bystanders, 10 locations', info.tabs.slice(1).join() === '12,10,9,10', info.tabs.slice(1).join());
  check('harm thresholds are exact', /0-harm or more/.test(info.text) && /1-harm or more/.test(info.text) && /8-harm or more.*Dying or dead/.test(info.text) && /take -1 forward/.test(info.text) && /take -1 ongoing/.test(info.text));
  check('monster numbers are exact (3 to 5 harm, armor 1 to 2, 8 to 12 to kill)', /usually 3 to 5 harm/.test(info.text) && /Armor is normally 1 to 2/.test(info.text) && /8 to 12 harm to kill/.test(info.text));
  check('minion numbers are exact (2 to 4 harm, armor 0 to 1, 5 to 10 to kill)', /usually 2 to 4 harm/.test(info.text) && /Armor is normally 0 to 1/.test(info.text) && /5 to 10 harm to kill/.test(info.text));
  check('the six countdown steps are in order', /Day, Shadows, Sunset, Dusk, Nightfall, Midnight/.test(info.text));
  check('end of session: 1 or 2 yes is 1 XP, 3 or 4 is 2, healing at the end of a mystery', /One or two yes answers is 1 XP for each hunter, three or four is 2/.test(info.text) && /heals 1 harm/.test(info.text) && /heals all of it/.test(info.text));
  const verb = SHEET.filter(x => info.text.toLowerCase().includes(x.toLowerCase()));
  check('none of the sheet\'s own phrasing is copied', verb.length === 0, verb.join(' | '));
  check('no em dashes, en dashes or emoji', !/[–—]/.test(info.text) && !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(info.text));
  check('the other Guide sections are untouched', info.n >= 11, info.n);

  for (const scheme of ['light', 'dark']) {
    p = await open(scheme, { width: 390, height: 800 });
    check('phone ' + scheme + ': no sideways scroll with the section open', await p.evaluate(() => document.documentElement.scrollWidth <= 390), await p.evaluate(() => document.documentElement.scrollWidth));
    check('phone ' + scheme + ': no table spills out of the page', await p.evaluate(() => [...document.querySelectorAll('#sect-keeper .tw')].every(w => w.getBoundingClientRect().right <= 391)));
    await p.locator('#sect-keeper h3').nth(5).scrollIntoViewIfNeeded();
    await p.screenshot({ path: path.join(__dirname,'out','keeper-guide-' + scheme + '.png') });
  }

  console.log(results.map(r=>r.join(' | ')).join('\n'));
  const fails = results.filter(r=>r[0]==='FAIL').length;
  console.log('\nTOTAL', results.length, 'FAIL', fails); console.log('ERRORS', errs);
  await b.close();
  if (fails || errs.length) process.exit(1);
})().catch(e=>{ console.log(results.map(r=>r.join(' | ')).join('\n')); console.log('CRASH', e.message.split('\n').slice(0,6).join('\n')); console.log('ERRORS', errs); process.exit(1); });
