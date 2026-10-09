// First night: the start-here card, backup nudges, the "I want to" lookup on Play, what switching playbook says, and marking moves advanced at level-up.
require('fs').mkdirSync(require('path').join(__dirname,'out'),{recursive:true});
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://'+path.join(__dirname,'..','index.html');
const results = []; const errs = [];
function check(name, ok, extra){ results.push([ok?'PASS':'FAIL', name, extra===undefined?'':String(extra)]); }
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(()=>chromium.launch());
  // journal: a saved journal to start from. It is put in place before the page's own script runs, once per tab.
  const open = async (opts, hash, journal) => {
    const ctx = await b.newContext(Object.assign({ viewport: { width: 1100, height: 900 }, colorScheme: 'dark', acceptDownloads: true }, opts));
    if (journal) await ctx.addInitScript((j) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hunters-journal-v1', j); sessionStorage.setItem('seeded', '1'); } }, JSON.stringify(journal));
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
    p.on('console', m => { if (m.type()==='error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
    await p.goto(URL+(hash||'')); await p.waitForTimeout(600);
    return p;
  };
  const st = async (p) => { await p.waitForTimeout(650); return JSON.parse(await p.evaluate(()=>localStorage.getItem('hunters-journal-v1'))); };
  const T = async (p, s) => (await p.textContent(s)).replace(/\s+/g,' ').trim();
  const next = async (p) => { await p.click('.wnav .btn:has-text("Next")'); await p.waitForTimeout(100); };

  // ---- start here, on a fresh journal ----
  let p = await open();
  check('guide opens with the start-here card', await p.locator('#start .start').isVisible() && /New to this/.test(await T(p,'#start')));
  check('three steps, none done yet', (await p.locator('#start .startlist li').count())===3 && (await p.locator('#start .startlist li.done').count())===0 && /Last backup: never/.test(await T(p,'#start')));
  await p.screenshot({ path: path.join(__dirname,'out','start-fresh.png') });
  await p.click('#start [data-sgo="build"]');
  check('Build a hunter opens the builder', (await p.getAttribute('#t-hunter','aria-selected'))==='true' && await p.locator('#wpills').isVisible());

  // build a Mundane: no details to pick, so it is quick
  await p.locator('.pb', {has:p.locator('h4',{hasText:/^The Mundane$/})}).locator('[data-pick]').click(); await next(p);
  await p.fill('#w-name','Dee Ray'); await next(p);
  await p.locator('.wopt').first().click(); await next(p);
  await next(p);                                                             // details: nothing for the Mundane
  for (const i of [0,3,5]) await p.locator('[data-wmv]').nth(i).click(); await next(p);   // one move with no roll, then Panic Button and Trust Me, which roll
  const groups = await p.evaluate(()=>[...new Set([].map.call(document.querySelectorAll('[data-wgg]'), e=>e.dataset.wgg.split('|')[0]))]);
  await p.locator('[data-wgg^="'+groups[0]+'|"]').nth(0).click(); await p.locator('[data-wgg^="'+groups[0]+'|"]').nth(1).click(); await p.locator('[data-wgg^="'+groups[1]+'|"]').nth(0).click();
  await p.locator('#wpills button').nth(7).click(); await p.waitForTimeout(150);
  const rev = await T(p,'#wbody');
  check('review: history can wait, and the backup nudge still shows', /Add a bond or two/.test(rev) && await p.locator('#wbody .bknudge').isVisible() && /saved in this browser, on this device only\. Last backup: never/.test(rev), rev.slice(0,300));

  // ---- backup from the nudge ----
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#wbody .bknudge [data-bk]')]);
  check('nudge downloads a backup file', /^hunters-journal-backup-\d{4}-\d\d-\d\d\.json$/.test(dl.suggestedFilename()), dl.suggestedFilename());
  const file = JSON.parse(require('fs').readFileSync(await dl.path(),'utf8'));
  check('the backup holds the journal', file.app==='hunters-journal' && file.journal.sheet.name==='Dee Ray' && file.journal.sheet.playbook==='The Mundane');
  check('nudge says so and the date updates', /Backup downloaded/.test(await T(p,'#wbody .bknudge [data-bkmsg]')) && (await T(p,'#wbody [data-bkago]'))==='today' && (await st(p)).bkAt>0);

  // ---- on to Play, and the "I want to" lookup ----
  await p.click('#wtoplay');
  check('Go to Play opens Play', (await p.getAttribute('#t-play','aria-selected'))==='true');
  const opts = await p.evaluate(()=>[].map.call(document.querySelectorAll('#pl-want option'), o=>o.textContent));
  check('lookup lists everyday wants, own moves and the two non-moves', opts[0]==='I want to...' && opts.includes('fight something') && opts.includes('give first aid') && opts.includes('something else') && opts.some(o=>/^Panic Button: when you need to escape/.test(o)), opts.join(' | '));
  check('own moves sit in their own group', (await p.locator('#pl-want optgroup').count())===2 && (await p.getAttribute('#pl-want optgroup >> nth=0','label'))==='Use one of my own moves');
  await p.selectOption('#pl-want',{label:'fight something'}); await p.waitForTimeout(100);
  check('fight something picks Kick Some Ass', (await T(p,'.pmove[aria-pressed="true"] span'))==='Kick Some Ass' && (await T(p,'#play-sel h3'))==='Kick Some Ass' && /That is Kick Some Ass/.test(await T(p,'.want p')));
  await p.selectOption('#pl-want',{label:'talk someone into something'}); await p.waitForTimeout(100);
  check('talking someone round picks Manipulate Someone and its stat', (await T(p,'#play-sel h3'))==='Manipulate Someone' && (await p.getAttribute('[data-pstat="charm"]','aria-pressed'))==='true');
  await p.selectOption('#pl-want',{label:opts.find(o=>/^Panic Button/.test(o))}); await p.waitForTimeout(100);
  check('an own move can be picked from the lookup', (await T(p,'#play-sel h3'))==='Panic Button');
  await p.selectOption('#pl-want',{label:'give first aid'}); await p.waitForTimeout(100);
  check('first aid explains there is no roll and leaves the move alone', /First aid needs no roll/.test(await T(p,'.want p')) && (await T(p,'#play-sel h3'))==='Panic Button');
  await p.selectOption('#pl-want',{label:'something else'}); await p.waitForTimeout(100);
  check('something else says it is not a move', /it is not a move/.test(await T(p,'.want p')));
  await p.locator('[data-pmove="act"]').click(); await p.waitForTimeout(100);
  check('picking a move by hand clears the advice', (await p.locator('.want p').count())===0);
  await p.screenshot({ path: path.join(__dirname,'out','play-want.png') });

  // ---- one roll, and the card is complete ----
  await p.click('#roll'); await p.waitForTimeout(1600);
  check('a roll is remembered', (await st(p)).start.rolled===true);
  await p.click('#t-guide'); await p.waitForTimeout(100);
  check('all three steps done', (await p.locator('#start .startlist li.done').count())===3 && /You are ready for the first session/.test(await T(p,'#start')), await T(p,'#start'));
  await p.screenshot({ path: path.join(__dirname,'out','start-done.png') });
  await p.click('#start [data-shide]');
  check('hide puts the card away', !(await p.locator('#start').isVisible()));
  await p.waitForTimeout(700); await p.reload(); await p.waitForTimeout(500); await p.click('#t-guide');
  check('and it stays away after a reload', !(await p.locator('#start').isVisible()) && (await st(p)).start.hide===true);

  // ---- switching playbook part-way says what happens to the picks ----
  await p.click('#t-hunter'); await p.click('#seg-build'); await p.locator('#wpills button').nth(0).click(); await p.waitForTimeout(100);
  check('no switch note until you switch', (await p.locator('#wswitch').count())===0);
  await p.locator('.pb', {has:p.locator('h4',{hasText:/^The Expert$/})}).locator('[data-pick]').click(); await p.waitForTimeout(150);
  const sw = await T(p,'#wswitch');
  check('switching says the old picks are set aside, not deleted', /Switched from The Mundane to The Expert/.test(sw) && /ratings, look, moves, gear and details are set aside, not deleted/.test(sw) && /name, catchphrase and history stay/.test(sw) && !/are back/.test(sw), sw);
  let s = await st(p);
  check('the old moves left the sheet with the old playbook', s.sheet.playbook==='The Expert' && s.sheet.custom.filter(c=>c.pbk).length===0 && s.sheet.name==='Dee Ray');
  await p.locator('.pb', {has:p.locator('h4',{hasText:/^The Mundane$/})}).locator('[data-pick]').click(); await p.waitForTimeout(150);
  const sb = await T(p,'#wswitch');
  check('switching back from an untouched playbook only says the earlier picks are back', /^The picks you made earlier for The Mundane are back\. Your name/.test(sb) && !/set aside/.test(sb), sb);
  s = await st(p);
  check('and they are', s.sheet.custom.filter(c=>c.pbk).length>=1 && s.sheet.inventory.filter(i=>i.pbk).length===3);
  await p.locator('#wpills button').nth(1).click(); await p.locator('#wpills button').nth(0).click(); await p.waitForTimeout(100);
  check('the note goes once you move on', (await p.locator('#wswitch').count())===0);

  // ---- the backup offer after a session now lives in the end-of-session ritual (tests/t17.js); the case file no longer shows one ----
  await p.click('#t-notes'); await p.waitForTimeout(150);
  await p.locator('details.case [data-eos]').first().check(); await p.waitForTimeout(100);
  await p.locator('details.case [data-applyxp]').first().click(); await p.waitForTimeout(150);
  check('adding the session XP from the case file shows no backup note (it moved to the ritual)', (await p.locator('details.case .bknudge').count())===0 && /Added to my sheet/.test(await T(p,'details.case')));

  // ---- marking moves advanced at level-up ----
  s = await st(p); s.sheet.level = 5; s.sheet.xp = 5;
  p = await open({}, '', s);
  await p.click('#t-hunter'); await p.click('#seg-sheet'); await p.click('#dolevel'); await p.waitForTimeout(100);
  let adv = p.locator('[data-lvl]', { hasText: /^Mark two of the basic moves as advanced$/ });
  check('after five level-ups the advanced improvements are offered', (await adv.count())===1);
  await adv.click(); await p.waitForTimeout(100);
  check('it asks which two, from the basic and weird moves', /Which two moves become advanced/.test(await T(p,'#lvlup')) && (await p.locator('[data-lvladv]').count())===16 && await p.locator('[data-lvlgo]').isDisabled());
  await p.click('[data-lvladv="kick"]'); await p.click('[data-lvladv="magic"]'); await p.waitForTimeout(50);
  check('two picked: no third, and the button unlocks', await p.locator('[data-lvladv="act"]').isDisabled() && await p.locator('[data-lvlgo]').isEnabled());
  await p.click('[data-lvladv="magic"]'); await p.click('[data-lvladv="inv"]'); await p.waitForTimeout(50);
  await p.click('[data-lvlgo]'); await p.waitForTimeout(150);
  s = await st(p);
  check('the two moves are marked and the level goes up', s.sheet.level===6 && s.sheet.adv.kick===true && s.sheet.adv.inv===true && !s.sheet.adv.magic && Object.keys(s.sheet.adv).length===2, JSON.stringify(s.sheet.adv));
  check('the sheet notes which', /Level 6: Advanced: Kick Some Ass and Investigate a Mystery/.test(s.sheet.moves), s.sheet.moves);
  await p.click('#t-roll'); await p.selectOption('#mv','kick'); await p.waitForTimeout(100);
  check('roller: the box is ticked for a marked move', await p.isChecked('#adv'));
  await p.selectOption('#mv','act'); await p.waitForTimeout(100);
  check('roller: and clear for one that is not', !(await p.isChecked('#adv')));
  await p.selectOption('#mv','kick'); await p.click('#roll'); await p.waitForTimeout(1600);
  if (await p.locator('#spendluck').count()) { await p.click('#spendluck'); await p.waitForTimeout(150); }
  check('a 12 on a marked move shows its advanced result', /12\+ Advanced: Pick an enhanced effect instead/.test(await T(p,'#rollkit')), (await T(p,'#rollkit')).slice(0,300));
  await p.selectOption('#mv','act'); await p.click('#roll'); await p.waitForTimeout(1600);
  if (await p.locator('#spendluck').count()) { await p.click('#spendluck'); await p.waitForTimeout(150); }
  check('a 12 on an unmarked move only says the result exists', !/12\+ Advanced:/.test(await T(p,'#rollkit')) && /has an Advanced result/.test(await T(p,'#rollkit')));
  await p.click('#t-play'); await p.waitForTimeout(100);
  check('play: a marked move says advanced', /advanced/.test(await T(p,'[data-pmove="kick"]')) && !/advanced/.test(await T(p,'[data-pmove="act"]')));
  s = await st(p); s.sheet.xp = 5;
  p = await open({}, '', s); adv = p.locator('[data-lvl]', { hasText: /^Mark two of the basic moves as advanced$/ });
  await p.click('#t-hunter'); await p.click('#seg-sheet'); await p.click('#dolevel'); await p.waitForTimeout(100);
  check('the first advance is used up; the second is still there', (await adv.count())===0 && (await p.locator('[data-lvl]', { hasText: /^Mark another two of the basic moves as advanced$/ }).count())===1);
  await p.locator('[data-lvl]', { hasText: /^Mark another two/ }).click(); await p.waitForTimeout(100);
  check('moves already advanced are not offered again', (await p.locator('[data-lvladv]').count())===14 && (await p.locator('[data-lvladv="kick"]').count())===0);

  // ---- phone width, light theme ----
  const m = await open({ viewport: { width: 390, height: 800 }, colorScheme: 'light' });
  const over = () => m.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  check('phone: start card fits', (await over())<=0 && await m.locator('#start .start').isVisible(), await over());
  await m.screenshot({ path: path.join(__dirname,'out','start-phone.png') });
  await m.click('#t-play'); await m.waitForTimeout(150);
  check('phone: play with the lookup fits', (await over())<=0 && await m.locator('#pl-want').isVisible(), await over());

  console.log(results.map(r=>r.join(' | ')).join('\n'));
  const fails = results.filter(r=>r[0]==='FAIL').length;
  console.log('\nTOTAL', results.length, 'FAIL', fails); console.log('ERRORS', errs);
  await b.close();
  if (fails || errs.length) process.exit(1);
})().catch(e=>{ console.log(results.map(r=>r.join(' | ')).join('\n')); console.log('CRASH', e.message.split('\n').slice(0,6).join('\n')); console.log('ERRORS', errs); process.exit(1); });
