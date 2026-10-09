// End-of-session ritual (T3): a panel on Play that takes the moves column's place, changes nothing until Finish, then marks XP once per case per session, heals if chosen,
// clears the roller's bonuses and hold, writes the timeline into the case log, offers a backup, and starts a fresh timeline.
require('fs').mkdirSync(require('path').join(__dirname,'out'),{recursive:true});
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://'+path.join(__dirname,'..','index.html');
const results = []; const errs = [];
function check(name, ok, extra){ results.push([ok?'PASS':'FAIL', name, extra===undefined?'':String(extra)]); }
const CASE = (id, title, log) => ({ id, example: false, open: true, title, date: '', hook: '', threats: '', weakness: '', npcs: '', loose: '', log: log || '', clock: 0, eos: [false, false, false, false], xpApplied: false, recap: '' });
const journal = (extra) => Object.assign({ sheet: { name: 'Dee Ray', playbook: 'The Mundane', luck: 5, stats: { charm: 0, cool: 0, sharp: 0, tough: 0, weird: 0 } },
  cases: [CASE('c1', 'The Hollow Dumpster', 'Session 1: found the handprints.'), CASE('c2', 'The Quiet Lake', '')] }, extra || {});
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(()=>chromium.launch());
  const open = async (j, viewport) => {
    const ctx = await b.newContext({ viewport: viewport || { width: 1100, height: 900 }, colorScheme: 'dark' });
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
    await ctx.addInitScript(() => {
      window.__dice = [];
      const real = crypto.getRandomValues.bind(crypto);
      crypto.getRandomValues = function (a) { if (a instanceof Uint8Array && a.length === 1 && window.__dice.length) { a[0] = window.__dice.shift() - 1; return a; } return real(a); };
    });
    await ctx.addInitScript((x) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hunters-journal-v1', x); sessionStorage.setItem('seeded', '1'); } }, JSON.stringify(j));
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
    p.on('console', m => { if (m.type()==='error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
    await p.goto(URL+'#play'); await p.waitForTimeout(600);
    return p;
  };
  const st = (p) => p.evaluate(() => window.__journal.S());
  const T = async (p, sel) => (await p.textContent(sel)).replace(/\s+/g, ' ').trim();
  const rollWith = async (p, a, c) => { await p.evaluate(([x, y]) => { window.__dice.push(x, y); }, [a, c]); await p.click('#roll'); await p.waitForSelector('#result .tier', { timeout: 4000 }); };
  const answers = async (p, ...ix) => { for (const i of ix) await p.check('[data-riteos="' + i + '"]'); };

  // ---- opening the panel ----
  let p = await open(journal({ roller: { move: 'kick', stat: 'tough', forward: 1, ongoing: 1, other: -1 }, hold: { n: 2, move: 'inv', asked: [] } }));
  check('Play has an End the session button', (await p.locator('[data-rit="open"]').count()) === 1);
  check('the moves are showing before it opens', (await p.locator('#play-moves .pmoves').count()) > 0);
  await p.click('[data-rit="open"]');
  check('the panel opens in the moves column', (await p.locator('#play-moves #rit-h').count()) === 1 && (await p.locator('#play-moves .pmoves').count()) === 0);
  check('focus lands on its heading', await p.evaluate(() => document.activeElement && document.activeElement.id === 'rit-h'));
  check('it starts on the newest real case', (await p.inputValue('#rit-case')) === 'c1');
  check('and offers No case', (await p.locator('#rit-case option').allTextContents()).some(t => /No case/.test(t)));
  check('with no answers the plan marks no XP', /mark no XP/.test(await T(p, '#rit-plan')), await T(p, '#rit-plan'));
  await answers(p, 0);
  check('one yes is 1 XP', /XP to mark: 1\./.test(await T(p, '#play-moves')) && /mark 1 XP \(you have 0\)/.test(await T(p, '#rit-plan')));
  await answers(p, 2, 3);
  check('three yes is 2 XP', /XP to mark: 2\./.test(await T(p, '#play-moves')));
  check('healing is off when unhurt', (await p.locator('input[name="ritheal"][value="one"]').isDisabled()) && /unhurt/.test(await T(p, '#play-moves')));

  // ---- cancel changes nothing ----
  let s = await st(p);
  check('so far nothing has changed on the sheet', s.sheet.xp === 0 && s.cases[0].xpApplied === false && s.cases[0].eos.every(x => !x));
  await p.click('[data-rit="cancel"]');
  s = await st(p);
  check('Cancel closes the panel and changes nothing', (await p.locator('#rit-h').count()) === 0 && s.sheet.xp === 0 && s.roller.forward === 1 && s.hold.n === 2 && s.cases[0].log === 'Session 1: found the handprints.');

  // ---- a real session: a roll and a wound, then the ritual ----
  await rollWith(p, 4, 3);
  await p.click('[data-ph="1"]'); await p.click('[data-ph="1"]'); await p.click('#pl-take');
  s = await st(p);
  check('the session has two lines before ending it', s.session.events.length === 2 && s.sheet.harm === 3, s.session.events.length);
  await p.click('[data-rit="open"]');
  await answers(p, 0, 2);
  check('healing is offered when hurt', !(await p.locator('input[name="ritheal"][value="one"]').isDisabled()) && /You have 3 harm/.test(await T(p, '#play-moves')));
  await p.check('input[name="ritheal"][value="one"]');
  check('keyboard focus stays on the radio after the panel redraws', await p.evaluate(() => document.activeElement.name === 'ritheal' && document.activeElement.value === 'one'));
  check('the plan now says heal 1 and write into the case', /heal 1 harm/.test(await T(p, '#rit-plan')) && /write tonight into "The Hollow Dumpster"/.test(await T(p, '#rit-plan')), await T(p, '#rit-plan'));
  await p.click('[data-rit="finish"]');
  s = await st(p);
  check('Finish: 1 XP marked', s.sheet.xp === 1, s.sheet.xp);
  check('Finish: 1 harm healed (3 to 2), still unstable-free', s.sheet.harm === 2 && s.sheet.unstable === false, s.sheet.harm);
  check('Finish: forward, ongoing, other and hold are cleared', s.roller.forward === 0 && s.roller.ongoing === 0 && s.roller.other === 0 && s.hold.n === 0);
  check('Finish: a fresh timeline starts, and the ritual left no lines of its own', s.session.events.length === 0);
  const c1 = s.cases[0];
  check('the case remembers the answers and the XP', c1.eos.join() === 'true,false,true,false' && c1.xpApplied === true && c1.xpAt > 0);
  check('the old log is kept, with a blank line before tonight', /^Session 1: found the handprints\.\n\nSession ended \d{4}-\d{2}-\d{2} \(Dee Ray\)\./.test(c1.log), JSON.stringify(c1.log.slice(0, 120)));
  check('the log has the answers, what was done, and the lines oldest first',
    /Yes to: conclude the current mystery; learn something new and important about the world\./.test(c1.log) && /Marked 1 XP\. Healed 1 harm\. Cleared forward, ongoing, other and hold\./.test(c1.log)
    && c1.log.indexOf('- Kick Some Ass: 8 (4+3 +1), partial success') > 0 && c1.log.indexOf('- Kick Some Ass') < c1.log.indexOf('- Took 3 harm (Harm 0 to 3)'), c1.log);
  check('the done panel says where it was written', /Session ended/.test(await T(p, '#rit-h')) && /Written into "The Hollow Dumpster"/.test(await T(p, '#play-moves')));
  check('and offers a backup', /Session over\. Save what happened tonight\. Last backup: never/.test(await T(p, '#play-moves .bknudge')), await T(p, '#play-moves .bknudge'));
  check('and shows the text to copy', (await p.inputValue('#rit-text')) === c1.log.split('\n\n')[1]);
  await p.click('[data-rit="copy"]'); await p.waitForTimeout(150);
  check('Copy this puts it on the clipboard', (await p.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n') === c1.log.split('\n\n')[1] && /Copied/.test(await T(p, '#rit-msg')));
  check('the timeline card on Play is empty again', /Nothing yet/.test(await T(p, '#hist')));
  await p.click('[data-rit="close"]');
  check('Close brings the moves back', (await p.locator('#rit-h').count()) === 0 && (await p.locator('#play-moves .pmoves').count()) > 0);
  await p.click('#t-notes'); await p.waitForTimeout(150);
  check('the case file shows the XP as added, and no backup note of its own', /Added to my sheet/.test(await T(p, 'details.case[data-id="c1"]')) && (await p.locator('details.case .bknudge').count()) === 0);
  await p.click('#t-play');

  // ---- running it again straight away cannot add the XP twice ----
  await p.click('[data-rit="open"]');
  check('the same case: XP is already on the sheet tonight', /already on your sheet tonight/.test(await T(p, '#play-moves')) && /leave XP alone/.test(await T(p, '#rit-plan')));
  check('the earlier answers are shown', await p.isChecked('[data-riteos="0"]') && await p.isChecked('[data-riteos="2"]'));
  await p.click('[data-rit="finish"]');
  s = await st(p);
  check('finishing again adds no XP', s.sheet.xp === 1, s.sheet.xp);
  check('and writes nothing twice to the case', (s.cases[0].log.match(/Session ended/g) || []).length === 1);
  check('the panel says there was nothing new to write', /Nothing new to write/.test(await T(p, '#play-moves')), await T(p, '#play-moves'));
  await p.click('[data-rit="close"]');

  // ---- a new session: answers start blank, and XP can be added again ----
  await rollWith(p, 5, 5);
  await p.click('[data-rit="open"]');
  check('a new session starts with blank answers', !(await p.isChecked('[data-riteos="0"]')) && !(await p.isChecked('[data-riteos="2"]')));
  check('and XP is open again', !/already on your sheet/.test(await T(p, '#play-moves')));
  await answers(p, 1);
  await p.click('[data-rit="finish"]');
  s = await st(p);
  check('the second session adds its XP', s.sheet.xp === 2 && (s.cases[0].log.match(/Session ended/g) || []).length === 2, s.sheet.xp);
  await p.click('[data-rit="close"]');

  // ---- XP added from the case file during the session counts ----
  await rollWith(p, 3, 4);
  await p.click('#t-notes'); await p.waitForTimeout(150);
  await p.locator('details.case[data-id="c2"] [data-eos]').first().check();
  await p.locator('details.case[data-id="c2"] [data-applyxp]').click(); await p.waitForTimeout(150);
  await p.click('#t-play'); await p.click('[data-rit="open"]');
  await p.selectOption('#rit-case', 'c2');
  check('XP added in the case file is not added again', /already on your sheet tonight/.test(await T(p, '#play-moves')) && /XP to mark|already/.test(await T(p, '#play-moves')));
  await p.click('[data-rit="cancel"]');

  // ---- no case chosen: XP still counts, nothing is written to a case ----
  await rollWith(p, 2, 2);
  const logs = (await st(p)).cases.map(c => c.log);
  await p.click('[data-rit="open"]');
  await p.selectOption('#rit-case', '');
  check('with no case the plan says it writes no log', /write no log/.test(await T(p, '#rit-plan')));
  await answers(p, 0);
  const xpBefore = (await st(p)).sheet.xp;
  await p.click('[data-rit="finish"]');
  s = await st(p);
  check('no case: XP is still marked', s.sheet.xp === xpBefore + 1, s.sheet.xp);
  check('no case: no case log changed', JSON.stringify(s.cases.map(c => c.log)) === JSON.stringify(logs));
  check('no case: the panel says nothing was written to a case', /nothing was written to a case file/.test(await T(p, '#play-moves')) && /Session ended/.test(await p.inputValue('#rit-text')));
  await p.click('[data-rit="close"]');

  // ---- a journal with only the example case starts on No case ----
  p = await open({ sheet: { name: 'Dee Ray', playbook: 'The Mundane', stats: { charm: 0, cool: 0, sharp: 0, tough: 0, weird: 0 } } });
  await p.click('[data-rit="open"]');
  check('only the example case: it starts on No case', (await p.inputValue('#rit-case')) === '');

  // ---- hostile text in a case title is shown as text ----
  p = await open(journal({ cases: [CASE('c9', '<img src=x onerror="window.__pwned=1">', '')] }));
  await p.click('[data-rit="open"]');
  check('markup in a case title is only text in the list', (await p.locator('#play-moves img').count()) === 0 && (await p.locator('#rit-case option').nth(1).textContent()).includes('<img'));
  await p.click('[data-rit="finish"]');
  check('and in the done panel', (await p.locator('#play-moves img').count()) === 0 && !(await p.evaluate(() => window.__pwned)));

  // ---- phone width, panel and done state ----
  p = await open(journal(), { width: 390, height: 800 });
  await rollWith(p, 4, 3);
  await p.click('[data-rit="open"]');
  check('phone: no sideways scroll with the panel open', await p.evaluate(() => document.documentElement.scrollWidth <= 390), await p.evaluate(() => document.documentElement.scrollWidth));
  await p.locator('#rit-h').scrollIntoViewIfNeeded();
  await p.screenshot({ path: path.join(__dirname,'out','ritual-phone.png') });
  await answers(p, 0);
  await p.click('[data-rit="finish"]');
  check('phone: no sideways scroll when done', await p.evaluate(() => document.documentElement.scrollWidth <= 390));
  await p.locator('#rit-h').scrollIntoViewIfNeeded();
  await p.screenshot({ path: path.join(__dirname,'out','ritual-done-phone.png') });

  console.log(results.map(r=>r.join(' | ')).join('\n'));
  const fails = results.filter(r=>r[0]==='FAIL').length;
  console.log('\nTOTAL', results.length, 'FAIL', fails); console.log('ERRORS', errs);
  await b.close();
  if (fails || errs.length) process.exit(1);
})().catch(e=>{ console.log(results.map(r=>r.join(' | ')).join('\n')); console.log('CRASH', e.message.split('\n').slice(0,6).join('\n')); console.log('ERRORS', errs); process.exit(1); });
