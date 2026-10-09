// Ratings follow the sheet: pick one line, and after that a rating only rises when the hunter levels up. No steppers on the Roller, My sheet or the builder.
// The Crooked's Deal with the Devil skill perk (+1 to two ratings) is the one creation-time change, and has its own picker. Lines lock once a hunter has levelled up.
require('fs').mkdirSync(require('path').join(__dirname,'out'),{recursive:true});
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const URL = 'file://'+path.join(__dirname,'..','index.html');
const results = []; const errs = [];
function check(name, ok, extra){ results.push([ok?'PASS':'FAIL', name, extra===undefined?'':String(extra)]); }
const STATS = ['charm', 'cool', 'sharp', 'tough', 'weird'];
const PB = {}; fs.readdirSync(path.join(__dirname,'..','data')).filter(f => f.endsWith('.json')).forEach(f => { const d = JSON.parse(fs.readFileSync(path.join(__dirname,'..','data',f),'utf8')); if (d.ratings) PB[d.name] = d; });
const lineOf = (d, i) => STATS.map(s => d.ratings[i][s]).join();
const SKILL = 'crooked-deal-with-the-devil';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(()=>chromium.launch());
  const open = async (journal, viewport, hash) => {
    const ctx = await b.newContext({ viewport: viewport || { width: 1100, height: 900 }, colorScheme: 'dark' });
    if (journal) await ctx.addInitScript((x) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hunters-journal-v1', x); sessionStorage.setItem('seeded', '1'); } }, JSON.stringify(journal));
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
    p.on('console', m => { if (m.type()==='error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
    await p.goto(URL + (hash || '#hunter')); await p.waitForTimeout(600);
    return p;
  };
  const st = (p) => p.evaluate(() => JSON.parse(JSON.stringify(window.__journal.S())));
  const statsStr = async (p) => { const x = (await st(p)).sheet.stats; return STATS.map(s => x[s]).join(); };
  const T = async (p, sel) => (await p.textContent(sel)).replace(/\s+/g, ' ').trim();
  const step = async (p, n) => { await p.click('#seg-build'); await p.click('#wpills button >> nth=' + n); await p.waitForTimeout(100); };
  const pick = (p, name) => p.locator('.pb', { hasText: name }).locator('button').click();
  const expertSheet = (extra) => ({ hv: 'build', wiz: 2, sheet: Object.assign({ name: 'Dee Ray', playbook: 'The Expert' }, extra || {}) });

  // ---- nothing in the page lets you type or step a rating ----
  let p = await open(expertSheet(), null, '#roll');
  check('Roller: no stepper for the rating, no leftover output', (await p.locator('[data-adj="stat"]').count()) === 0 && (await p.locator('#o-stat').count()) === 0);
  check('Roller: the other steppers (forward, ongoing, other) are still there', (await p.locator('[data-adj="forward"]').count()) === 2 && (await p.locator('[data-adj="ongoing"]').count()) === 2 && (await p.locator('[data-adj="other"]').count()) === 2);
  check('Roller: says where ratings come from', /Ratings come from the line you picked/.test(await T(p, '#p-roll')));
  await p.click('#t-guide');
  check('Guide: nothing invites adjusting a rating by hand', !/adjust[^.]*by hand|by hand[^.]*adjust/i.test(await T(p, '#p-guide')) && /Your ratings are the line you picked/.test(await T(p, '#p-hunter')));
  await p.click('#t-hunter'); await p.click('#seg-sheet');
  check('My sheet: five ratings, shown, with no buttons', (await p.locator('#sheetstats .sstat').count()) === 5 && (await p.locator('#sheetstats button').count()) === 0);
  await step(p, 2);
  check('Builder: no steppers, no total, and the heading no longer says adjust', (await p.locator('.wctl button').count()) === 0 && (await p.locator('[data-wsd]').count()) === 0 && !/adjust|by hand|Total of your five/i.test(await T(p, '#wiz')));
  check('Builder: it still explains what each rating means', /What do the ratings mean\?/.test(await T(p, '#wiz')) && (await p.locator('.wstat').count()) === 5);

  // ---- picking a line: every line of every playbook ----
  const names = Object.keys(PB); let bad = [];
  for (const name of names) {
    await step(p, 0); await pick(p, name); await step(p, 2);
    const d = PB[name], n = await p.locator('.wopt').count();
    if (n !== d.ratings.length) bad.push(name + ' has ' + n + ' lines, expected ' + d.ratings.length);
    for (let i = 0; i < d.ratings.length; i++) {
      await p.locator('.wopt').nth(i).click();
      const got = await statsStr(p);
      if (got !== lineOf(d, i)) bad.push(name + ' line ' + i + ': ' + got + ' vs ' + lineOf(d, i));
    }
  }
  check('all ' + names.length + ' playbooks: every line sets exactly its five ratings', names.length === 12 && bad.length === 0, bad.slice(0, 3).join(' | '));
  const shown = await p.$$eval('[data-wout]', els => els.map(e => e.textContent.trim()));
  check('the "what do they mean" list shows the live values', shown.length === 5 && shown.every(x => /^[+−]\d$/.test(x)), shown.join());

  // ---- a hunter who has levelled up: the lines lock, and level-ups still raise ratings ----
  const lvl = { hv: 'build', wiz: 2, sheet: { name: 'Dee Ray', playbook: 'The Expert', level: 1, xp: 0, stats: { charm: 2, cool: 0, sharp: 3, tough: -1, weird: 1 }, pbs: { 'The Expert': { rating: 0, look: {}, moves: {}, gear: {}, build: {}, extras: {}, imp: {}, skill: {} } } } };
  p = await open(lvl);
  await step(p, 2);
  const locked = await p.$$eval('.wopt', els => els.map(e => e.disabled));
  check('after a level-up every line is locked, with a plain reason', locked.length === PB['The Expert'].ratings.length && locked.every(Boolean) && /only change when you level up/.test(await T(p, '#wiz')));
  await p.evaluate(() => document.querySelectorAll('.wopt').forEach(e => { e.disabled = false; }));
  await p.locator('.wopt').nth(2).click();
  check('even if the button were forced on, the ratings are not put back to a line', (await statsStr(p)) === '2,0,3,-1,1', await statsStr(p));
  p = await open({ hv: 'sheet', sheet: { name: 'Dee Ray', playbook: 'The Expert', level: 0, xp: 5, stats: { charm: 0, cool: 0, sharp: 2, tough: 0, weird: 0 } } });
  await p.click('#dolevel');
  const sharp = p.locator('[data-lvl]', { hasText: /^Get \+1 Sharp/ });
  const had = await sharp.count();
  if (had) await sharp.first().click();
  check('level-up: +1 Sharp raises it by one, and the level goes up', had === 1 && (await st(p)).sheet.stats.sharp === 3 && (await st(p)).sheet.level === 1);
  await p.click('#seg-build'); await p.click('#wpills button >> nth=2');
  check('and the lines are then locked', (await p.$$eval('.wopt', els => els.every(e => e.disabled))));
  p = await open({ hv: 'sheet', sheet: { name: 'Dee Ray', playbook: 'The Expert', level: 0, xp: 5, stats: { charm: 0, cool: 0, sharp: 3, tough: 0, weird: 0 } } });
  await p.click('#dolevel');
  check('level-up: a rating already at its maximum cannot be raised again', await p.locator('[data-lvl]', { hasText: /^Get \+1 Sharp/ }).first().isDisabled().catch(() => true) || !(await p.locator('[data-lvl]', { hasText: /^Get \+1 Sharp/ }).count()) || (await p.locator('[data-lvl]', { hasText: /^Get \+1 Sharp/ }).first().click(), (await st(p)).sheet.stats.sharp <= 3));

  // ---- a save made before this change, with hand-set ratings ----
  const legacy = { hv: 'build', wiz: 2, sheet: { name: 'Old Save', playbook: 'The Mundane', level: 0, stats: { charm: 3, cool: 0, sharp: -2, tough: 1, weird: 4 }, pbs: { 'The Mundane': { rating: -1, look: {}, moves: {}, gear: {}, build: {}, extras: {}, imp: {}, stats: { charm: 3, cool: 0, sharp: -2, tough: 1, weird: 4 } } } } };
  p = await open(legacy);
  check('an old hand-set save keeps its ratings', (await statsStr(p)) === '3,0,-2,1,4');
  await p.click('#seg-sheet');
  check('and shows them', (await p.$$eval('#sheetstats .sstat output', e => e.map(x => x.textContent.trim()))).join() === '+3,+0,−2,+1,+4');
  await step(p, 2);
  check('at level 0 its lines are open, so it can be put right', (await p.$$eval('.wopt', els => els.every(e => !e.disabled))) && (await p.locator('.wopt').count()) === PB['The Mundane'].ratings.length);
  await p.locator('.wopt').nth(0).click();
  check('and a line replaces the hand-set ratings', (await statsStr(p)) === lineOf(PB['The Mundane'], 0));

  // ---- The Crooked: the skill perk ----
  const C = PB['The Crooked'];
  p = await open({ hv: 'build', wiz: 0 });
  await pick(p, 'The Crooked'); await step(p, 2); await p.locator('.wopt').nth(0).click();
  const base = lineOf(C, 0).split(',').map(Number);
  await step(p, 4);
  check('Moves: no skill panel until Deal with the Devil is picked', (await p.locator('[data-wskill]').count()) === 0);
  await p.locator('[data-wmv="' + SKILL + '"]').click();
  check('picking it shows the skill panel, with five ratings', (await p.locator('[data-wskill]').count()) === 5 && /skill perk/.test(await T(p, '#wiz')));
  await p.locator('[data-wskill="charm"]').click(); await p.locator('[data-wskill="sharp"]').click();
  let want = base.slice(); want[0] += 1; want[2] += 1;
  check('two ratings picked: each goes up by 1', (await statsStr(p)) === want.join(), (await statsStr(p)) + ' vs ' + want.join());
  check('and the chips say which', /Charm [+−]\d \(skill\)/.test(await T(p, '#wiz')) && (await p.getAttribute('[data-wskill="charm"]', 'aria-pressed')) === 'true');
  await p.locator('[data-wskill="tough"]').click();
  check('a third is refused, with a reason, and nothing changes', (await statsStr(p)) === want.join() && /Two ratings at most/.test(await T(p, '#wskillmsg')), await T(p, '#wskillmsg'));
  await p.locator('[data-wskill="charm"]').click();
  want[0] -= 1;
  check('tapping one again takes its +1 back', (await statsStr(p)) === want.join() && (await T(p, '#wskillmsg')) === '');
  await p.locator('[data-wskill="charm"]').click(); want[0] += 1;
  await step(p, 2); await p.locator('.wopt').nth(1).click();
  const l1 = lineOf(C, 1).split(',').map(Number); l1[0] += 1; l1[2] += 1;
  check('choosing a different line keeps the skill bonus on top of it', (await statsStr(p)) === l1.join(), (await statsStr(p)) + ' vs ' + l1.join());
  await step(p, 4);
  await p.locator('[data-wmv="' + SKILL + '"]').click();
  check('putting the move back takes the bonus off, and the panel goes', (await statsStr(p)) === lineOf(C, 1) && (await p.locator('[data-wskill]').count()) === 0 && Object.keys((await st(p)).sheet.pbs['The Crooked'].skill).length === 0);
  await p.locator('[data-wmv="' + SKILL + '"]').click();
  await p.locator('[data-wskill="cool"]').click(); await p.locator('[data-wskill="weird"]').click();
  const withSkill = await statsStr(p);
  await step(p, 0); await pick(p, 'The Expert');
  check('switching playbook leaves the Crooked ratings parked, bonus and all', (await statsStr(p)) === '0,0,0,0,0');
  await pick(p, 'The Crooked');
  check('and switching back brings them, and the skill picks, back', (await statsStr(p)) === withSkill && (await st(p)).sheet.pbs['The Crooked'].skill.cool === true, await statsStr(p) + ' vs ' + withSkill);
  await p.waitForTimeout(700); await p.reload(); await p.waitForTimeout(600);
  check('a reload keeps all of it', (await statsStr(p)) === withSkill && (await st(p)).sheet.pbs['The Crooked'].skill.weird === true);
  await step(p, 4);
  check('and after a reload the skill panel is still there, with its two picks marked', (await p.locator('[data-wskill]').count()) === 5 && (await p.locator('[data-wskill][aria-pressed="true"]').count()) === 2);
  await step(p, 0); await pick(p, 'The Expert'); await step(p, 4);
  check('The Expert has no skill panel', (await p.locator('[data-wskill]').count()) === 0);

  // the +3 limit, and a levelled-up Crooked
  const top = { hv: 'build', wiz: 4, sheet: { name: 'Dee Ray', playbook: 'The Crooked', stats: { charm: 0, cool: 3, sharp: 0, tough: 0, weird: 0 }, pbs: { 'The Crooked': { rating: -1, look: {}, moves: { [SKILL]: true }, gear: {}, build: {}, extras: {}, imp: {}, skill: {} } } } };
  p = await open(top);
  await p.locator('[data-wskill="cool"]').click();
  check('a rating already at +3 cannot take the perk', (await statsStr(p)) === '0,3,0,0,0' && /already \+3/.test(await T(p, '#wskillmsg')), await T(p, '#wskillmsg'));
  top.sheet.level = 1;
  p = await open(top);
  check('after a level-up the skill chips are locked too', (await p.$$eval('[data-wskill]', els => els.length === 5 && els.every(e => e.disabled))));

  // ---- phone width ----
  p = await open({ hv: 'build', wiz: 4, sheet: { name: 'Dee Ray', playbook: 'The Crooked', pbs: { 'The Crooked': { rating: 0, look: {}, moves: { [SKILL]: true }, gear: {}, build: {}, extras: {}, imp: {}, skill: {} } } } }, { width: 390, height: 800 });
  await p.locator('[data-wskill="charm"]').click();
  check('phone: no sideways scroll with the skill panel', await p.evaluate(() => document.documentElement.scrollWidth <= 390), await p.evaluate(() => document.documentElement.scrollWidth));
  await p.locator('.wskill').scrollIntoViewIfNeeded(); await p.screenshot({ path: path.join(__dirname,'out','skill-phone.png') });
  await step(p, 2);
  check('phone: no sideways scroll on the ratings step', await p.evaluate(() => document.documentElement.scrollWidth <= 390));
  await p.screenshot({ path: path.join(__dirname,'out','ratings-phone.png') });
  await p.click('#seg-sheet');
  await p.locator('#sheetstats').scrollIntoViewIfNeeded(); await p.screenshot({ path: path.join(__dirname,'out','sheet-ratings-phone.png') });

  console.log(results.map(r=>r.join(' | ')).join('\n'));
  const fails = results.filter(r=>r[0]==='FAIL').length;
  console.log('\nTOTAL', results.length, 'FAIL', fails); console.log('ERRORS', errs);
  await b.close();
  if (fails || errs.length) process.exit(1);
})().catch(e=>{ console.log(results.map(r=>r.join(' | ')).join('\n')); console.log('CRASH', e.message.split('\n').slice(0,6).join('\n')); console.log('ERRORS', errs); process.exit(1); });
