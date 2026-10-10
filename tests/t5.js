require('fs').mkdirSync(require('path').join(__dirname,'out'),{recursive:true});
const { chromium } = require('playwright');
const followDevice = require('./look');
const fs = require('fs');
const STUB = fs.readFileSync(require('path').join(__dirname,'fixtures','stub.txt'),'utf8');
const results = []; const errs = [];
function check(name, ok, extra){ results.push([ok?'PASS':'FAIL', name, extra===undefined?'':String(extra)]); }
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(()=>chromium.launch());
  const ctx = await b.newContext({ viewport: { width: 1100, height: 900 }, colorScheme: 'dark' });
  await ctx.addInitScript(STUB);
  // The page rolls from crypto.getRandomValues. Push die faces (1 to 6) onto window.__dice and the next rolls use them in order; with the queue empty, rolls are random as usual.
  await ctx.addInitScript(() => {
    window.__dice = [];
    const real = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = function (a) {
      if (a instanceof Uint8Array && a.length === 1 && window.__dice.length) { a[0] = window.__dice.shift() - 1; return a; }
      return real(a);
    };
  });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  p.on('console', m => { if (m.type()==='error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  await p.goto('file://'+require('path').join(__dirname,'..','index.html')+''); await p.waitForTimeout(700);
  const T = async (s) => (await p.textContent(s)).replace(/\s+/g,' ').trim();
  const vis = async (s) => p.locator(s).first().isVisible();

  // ---- TABS + keyboard ----
  for (const t of ['guide','play','roll','hunter','party','bestiary','tips','notes']) {
    await p.click('#t-'+t);
    check('tab '+t+' shows its panel only', await vis('#p-'+t) && (await p.locator('.panel:visible').count())===1);
    check('tab '+t+' aria-selected', (await p.getAttribute('#t-'+t,'aria-selected'))==='true');
  }
  await p.goto('file://'+require('path').join(__dirname,'..','index.html')+'#bestiary'); await p.waitForTimeout(300);
  check('deep link #bestiary opens Bestiary', await vis('#p-bestiary'));

  // ---- GUIDE ----
  await p.click('#t-guide');
  check('guide sections render', (await p.locator('details.sect').count())>=8, await p.locator('details.sect').count());
  const first = p.locator('details.sect').nth(1); await first.locator('summary').click();
  check('guide section toggles open', await first.evaluate(e=>e.open));
  check('basic moves rendered (8)', (await p.locator('#basic-moves .move').count())===8);
  check('weird moves rendered (8)', (await p.locator('#weird-moves .move').count())===8);
  await p.evaluate(()=>{document.querySelector('#weird-moves').closest('details').open=true;});
  await p.locator('#weird-moves [data-roll="empath"]').scrollIntoViewIfNeeded(); await p.click('#weird-moves [data-roll="empath"]');
  check('"Roll it" jumps to Roller with that move selected', await vis('#p-roll') && (await p.inputValue('#mv'))==='empath');
  check('stat switches to Weird for Empath', (await p.getAttribute('.statbtn[data-stat=weird]','aria-pressed'))==='true');

  // ---- ROLLER ----
  await p.selectOption('#mv','inv');
  check('moving to Investigate selects Sharp', (await p.getAttribute('.statbtn[data-stat=sharp]','aria-pressed'))==='true');
  check('the Roller has no stepper for ratings (they come from the sheet)', (await p.locator('[data-adj="stat"]').count())===0 && (await p.locator('#o-stat').count())===0);
  await p.click('[data-adj=forward][data-d="1"]'); await p.click('[data-adj=ongoing][data-d="1"]'); await p.click('[data-adj=other][data-d="-1"]');
  check('steppers update', (await T('#o-forward'))==='+1' && (await T('#o-ongoing'))==='+1' && (await T('#o-other'))==='−1', await T('#o-forward')+' '+await T('#o-ongoing')+' '+await T('#o-other'));
  const odds = await T('#odds'); check('odds bars show three bands', /10\+.*7-9.*6 or less/.test(odds), odds);
  await p.check('#adv');
  const t0 = Date.now(); await p.click('#roll');
  check('roll disables button while dice are in the air', await p.evaluate(()=>document.querySelector('#roll').disabled));
  check('tray marked as rolling', await p.evaluate(()=>document.querySelector('#tray').classList.contains('rolling')));
  await p.waitForSelector('.tier', {timeout:4000});
  const dur = Date.now()-t0; check('roll resolves in ~1.2-2.2s', dur<2600, dur+'ms');
  const sumTxt = await T('#sum small'); const nums = sumTxt.match(/(\d+)\s*\+\s*(\d+)/);
  check('breakdown shows both dice', !!nums, sumTxt);
  const total = parseInt(await p.evaluate(()=>document.querySelector('#sum').firstChild.textContent)); const d1=+nums[1], d2=+nums[2];
  check('total = dice + bonuses (+1 fwd +1 ong -1 other = +1)', total === d1+d2+1, total+' vs '+(d1+d2+1));
  check('forward and other cleared, ongoing kept', (await T('#o-forward'))==='+0' && (await T('#o-other'))==='+0' && (await T('#o-ongoing'))==='+1');
  const faces = await p.evaluate(()=>[...document.querySelectorAll('.slot')].map(s=>+s.getAttribute('aria-label').match(/\d/)[0]));
  check('dice faces equal rolled dice', faces[0]===d1 && faces[1]===d2, faces.join(',')+' vs '+d1+','+d2);
  check('history logged', (await p.locator('#hist li').count())>=1 && /Investigate/.test(await T('#hist li')));
  // luck + xp buttons
  // Two 1s plus the +1 still set on the roller is a 3, always a miss.
  await p.evaluate(()=>{ window.__dice.push(1, 1); });
  await p.click('#roll'); await p.waitForSelector('#markxp', {timeout:4000});
  check('forced roll is a miss', /Miss/.test(await T('#result .tier')), await T('#result .tier'));
  await p.click('#markxp'); check('Mark XP on a miss disables itself', await p.locator('#markxp').isDisabled());
  const lucky0 = await p.evaluate(()=>/\((\d) left\)/.exec(document.body.textContent)?.[1]);
  check('Spend Luck is offered after a miss', (await p.locator('#spendluck').count())===1);
  await p.click('#spendluck'); await p.waitForTimeout(150);
  check('Spend Luck makes it a 12 and costs 1', (await T('#sum')).startsWith('12') && (await T('#rollas')).includes('Luck 6'), await T('#rollas'));
  check('a 12 is marked at the dice, with no burnt edge', await p.evaluate(()=>!!document.getElementById('trayfx') && document.getElementById('fx').className===''));
  await p.click('#clearhist'); check('Clear empties history', /No rolls yet/.test(await T('#hist')));

  // ---- HUNTER: BUILD ----
  await p.click('#t-hunter'); await p.click('#seg-build');
  check('build view shows 8-step wizard + 12 playbooks', (await p.locator('#wpills button').count())===8 && (await p.locator('#wcards .pb').count())===12);
  await p.click('.wnav .btn:has-text("Next")'); check('wizard Next advances to step 2', (await p.textContent('.wstep')).includes('Step 2 of 8')); await p.click('.wnav .btn:has-text("Back")');
  await p.locator('.pb', {hasText:'The Expert'}).locator('button').click();
  check('pick playbook marks it picked', (await p.locator('.pb[data-picked=true] h4').textContent())==='The Expert');
  check('playbook art loads when available (chosen/expert/spell-slinger test files)', (!require('fs').existsSync(require('path').join(__dirname,'..','img','pb-expert.jpg')) || await p.locator('.pb:has(h4:text("The Expert")) img.pbimg').count()===1));

  // ---- HUNTER: SHEET ----
  await p.click('#seg-sheet');
  check('sheet shows picked playbook', (await p.inputValue('#f-pb'))==='The Expert');
  await p.fill('#f-name','Dee Ray'); await p.fill('#f-catch','Not tonight.'); await p.fill('#f-look','Burn scar on left hand'); await p.fill('#f-back','Lost a brother to something in the mine.');
  await p.setInputFiles('#photo',require('path').join(__dirname,'fixtures','hunter.jpg')); await p.waitForTimeout(500);
  check('photo upload shows portrait', (await p.locator('#portrait img.portrait').count())===1 && /Photo added/.test(await T('#photomsg')));
  check('the sheet shows five ratings and has no buttons to change them', (await p.locator('#sheetstats .sstat').count())===5 && (await p.locator('#sheetstats button').count())===0 && (await p.locator('[data-sd]').count())===0);
  await p.click('#seg-build'); await p.click('#wpills button >> nth=2'); await p.locator('.wopt').nth(1).click(); await p.click('#seg-sheet');
  const line = require('../data/expert.json').ratings[1], sgn = v => (v>=0?'+':'−')+Math.abs(v);
  const shown = await p.$$eval('#sheetstats .sstat output', els=>els.map(e=>e.textContent.trim()));
  check('the sheet shows the ratings line that was picked', shown.join()===['charm','cool','sharp','tough','weird'].map(k=>sgn(line[k])).join(), shown.join()+' vs '+JSON.stringify(line));
  await p.click('#luck button[data-n="3"]'); check('luck pip set to 3', (await p.locator('#luck button[aria-pressed=true]').count())===3);
  await p.click('#harm button[data-n="5"]'); check('harm 5 marks unstable', await p.isChecked('#unstable') && /Serious/.test(await T('#harmtxt')));
  await p.click('#heal1'); check('heal 1 -> harm 4 still unstable', (await p.locator('#harm button[aria-pressed=true]').count())===4 && await p.isChecked('#unstable'));
  await p.click('#heal1'); check('heal to 3 clears unstable', !(await p.isChecked('#unstable')));
  await p.click('#healall'); check('heal all', (await p.locator('#harm button[aria-pressed=true]').count())===0);
  for (let i=1;i<=5;i++) await p.click(`#xp button[data-n="${i}"]`).catch(()=>{});
  check('5 XP shows level-up bar', await p.locator('#dolevel').count()===1);
  await p.click('#dolevel'); if (await p.locator('[data-lvl]').count()) { await p.locator('[data-lvl]:not([disabled])').first().click(); if (await p.locator('[data-lvlstat]').count()) await p.locator('[data-lvlstat]:not([disabled])').first().click(); } check('level up: level 1, xp spent', (await T('#lvl'))==='1' && (await p.locator('#xp button[aria-pressed=true]').count())===0);
  // inventory
  await p.fill('#newname','Fire axe'); await p.selectOption('#newtype','Weapon'); await p.click('#addform button[type=submit]');
  await p.click('[data-quick="8"]'); await p.click('[data-quick="0"]');
  check('3 inventory items', (await p.locator('.item').count())===3);
  await p.locator('.item').nth(0).locator('[data-i=eq]').check(); await p.locator('.item').nth(0).locator('[data-i=val]').fill('3');
  await p.locator('.item').nth(1).locator('[data-i=eq]').check();
  check('inventory summary tracks armor + weapons', /Armor 1/.test(await T('#invsum')) && /1 weapon equipped/.test(await T('#invsum')), await T('#invsum'));
  await p.locator('.item').nth(2).locator('[data-q="1"]').click(); await p.locator('.item').nth(2).locator('[data-q="1"]').click();
  check('qty stepper', (await T('.item:nth-child(3) .qty output'))==='3');
  await p.locator('.item').nth(2).locator('[data-rm]').click(); check('remove item', (await p.locator('.item').count())===2 && /Removed/.test(await T('#invundo')));
  await p.click('#undorm'); check('undo restores item', (await p.locator('.item').count())===3);
  // bonds + custom moves
  await p.click('#addbond'); await p.fill('.bond [data-b=who]','Hector'); await p.selectOption('.bond [data-b=tie]','Mentor'); await p.fill('.bond [data-b=note]','Taught me to read a room'); await p.fill('.bond [data-b=theirs]','Pulled me out of a fire');
  check('history: what they picked for you is saved', await p.evaluate(()=>{ window.dispatchEvent(new Event('pagehide')); return JSON.parse(localStorage.getItem('hunters-journal-v1')).sheet.bonds[0].theirs; })==='Pulled me out of a fire');
  check('bond added', (await p.locator('.bond').count())===1);
  await p.fill('#mvpaste','Last Stand: When you stand your ground against a monster, roll +Tough. On a 10+, the monster backs off and you take +1 forward. On a 7-9, you hold but take 1 harm. On a miss, it breaks through.'); await p.click('#mvparse');
  check('pasted move parsed into fields', (await p.inputValue('.cm [data-m=name]'))==='Last Stand' && (await p.inputValue('.cm [data-m=stat]'))==='tough' && /backs off/.test(await p.inputValue('.cm [data-m=full]')));
  await p.click('#mvadd'); check('blank move added', (await p.locator('.cm').count())===2);
  await p.locator('.cm').nth(1).locator('[data-rmm]').click(); check('custom move removed', (await p.locator('.cm').count())===1);
  // roller reflects sheet
  await p.click('#t-roll');
  check('Roller header shows hunter, armor and Luck', /Dee Ray/.test(await T('#rollas')) && /Armor 1/.test(await T('#rollas')) && /Luck 3/.test(await T('#rollas')), await T('#rollas'));
  await p.selectOption('#mv', {label:'Last Stand (+Tough)'});
  await p.click('#roll'); await p.waitForSelector('.tier'); await p.waitForTimeout(300);
  check('custom move rolls with its own text', /Last Stand/.test(await T('#hist li')));
  await p.selectOption('#mv','kick'); await p.click('#roll'); await p.waitForTimeout(1500);
  check('Kick Some Ass shows equipped weapon + armor', /Fire axe \(3-harm\)/.test(await T('#result')) && /Armor 1/.test(await T('#result')), (await T('#result')).slice(0,160));

  // ---- CASE FILES ----
  await p.click('#t-notes');
  check('example case present', (await p.locator('details.case').count())===1 && /Example/.test(await T('details.case summary')));
  await p.click('#newcase'); await p.fill('details.case[open] input[data-f=title]','The Quiet Church');
  check('new case at top, title live-updates', /The Quiet Church/.test(await T('details.case:first-of-type summary')));
  await p.fill('details.case:first-of-type textarea[data-f=hook]','Bells ring at 3am with no bell.'); await p.fill('details.case:first-of-type textarea[data-f=threats]','Something in the belfry. Smells of wet wool.');
  await p.click('details.case:first-of-type [data-clock="3"]'); check('countdown clock to Sunset', (await p.locator('details.case:first-of-type .clock button[aria-pressed=true]').count())===3);
  await p.check('details.case:first-of-type [data-eos="0"]'); await p.check('details.case:first-of-type [data-eos="1"]'); await p.check('details.case:first-of-type [data-eos="2"]');
  check('3 yes answers = 2 XP', /XP for this session: 2/.test(await T('details.case:first-of-type')), '');
  const xpBefore = await p.evaluate(()=>0);
  await p.click('details.case:first-of-type [data-applyxp]'); check('Add to sheet disables itself', await p.locator('details.case:first-of-type [data-applyxp]').isDisabled());
  await p.fill('#q','belfry'); check('search filters cases', (await p.locator('details.case').count())===1); await p.fill('#q','');
  await p.click('details.case:first-of-type [data-tobest]'); check('Add to Bestiary from case', /Added/.test(await T('details.case:first-of-type [data-tobest]')));
  await p.click('details.case:first-of-type [data-recap]'); await p.waitForTimeout(600);
  check('recap streams into the case', /Something breathes/.test(await p.inputValue('details.case:first-of-type textarea[data-f=recap]')));
  await p.click('details.case:first-of-type [data-del]'); await p.click('details.case:first-of-type [data-del]');
  check('delete needs two presses and then removes', (await p.locator('details.case').count())===1);

  // ---- BESTIARY ----
  await p.click('#t-bestiary');
  check('bestiary has example + added entry', (await p.locator('details.beast').count())===2, await p.locator('details.beast').count());
  await p.click('#newbeast'); const nb = p.locator('details.beast').first();
  await nb.locator('input[data-bf=name]').fill('Belfry Thing'); await nb.locator('select[data-bf=kind]').selectOption('Minion');
  const nb2 = p.locator('details.beast').first();
  check('minion motivations offered', (await nb2.locator('select[data-bf=motiv] option').allTextContents()).some(x=>/Cultist/.test(x)));
  await nb2.locator('select[data-bf=motiv]').selectOption('Scout'); await nb2.locator('select[data-bf=status]').selectOption('Cornered');
  await nb2.locator('[data-taken="1"]').click(); await nb2.locator('[data-taken="1"]').click(); await nb2.locator('[data-taken="-1"]').click();
  check('harm taken tracker', (await T('details.beast:first-of-type .combat output'))==='1');
  await p.selectOption('#bstat','Cornered'); check('status filter', (await p.locator('details.beast').count())===1); await p.selectOption('#bstat','');
  await p.fill('#bq','nothing-matches'); check('empty search state', /Nothing matches/.test(await T('#beasts'))); await p.fill('#bq','');
  await p.locator('details.beast').first().locator('[data-delbeast]').click(); await p.locator('details.beast').first().locator('[data-delbeast]').click();
  check('delete entry (two presses)', (await p.locator('details.beast').count())===2);

  // ---- PARTY ----
  await p.click('#t-party');
  await p.evaluate(()=>window.__seed('pal9',{name:'Alex Reyes',playbook:'The Chosen',catchline:'Read the label.',look:'Tall',photo:'',stats:{charm:0,cool:1,sharp:2,tough:-1,weird:1},luck:4,harm:5,unstable:true,xp:3,level:1,armor:0,weapons:[],moves:[],updated:Date.now()-60000}));
  await p.waitForTimeout(200);
  check('other hunter appears with "played by"', /Alex Reyes/.test(await T('#partybody')) && /played by Alex/.test(await T('#partybody')));
  check('unstable hunter flagged in strip', /Alex Reyes unstable/.test(await T('.strip')));
  await p.check('#share'); await p.waitForTimeout(900);
  const doc = await p.evaluate(()=>window.__store['party/me123']);
  check('sharing writes only public fields', !!doc && doc.name==='Dee Ray' && doc.moves.includes('Last Stand') && !('backstory' in doc) && !('inventory' in doc) && !('bonds' in doc), doc && Object.keys(doc).join(','));
  check('shared card has a photo thumbnail', !!doc && doc.photo.startsWith('data:image/jpeg') && doc.photo.length<=40000, doc && doc.photo.length);
  // sharp enough: the kept portrait is up to 900px on its long side, and the copy for the table 360px (it is shown about 120px wide, on screens three times as dense)
  const dims = await p.evaluate(async (thumb) => { const size = (src) => new Promise(r => { const i = new Image(); i.onload = () => r([i.naturalWidth, i.naturalHeight]); i.onerror = () => r([0, 0]); i.src = src; }); const sh = JSON.parse(localStorage.getItem('hunters-journal-v1')).sheet; return { photo: await size(sh.photo), thumb: await size(thumb), tv: sh.tv, kb: Math.round(sh.photo.length / 1024) }; }, doc.photo);
  check('the portrait is kept at 900px on its long side', Math.max(...dims.photo) === 900 && dims.kb < 400, JSON.stringify(dims));
  check('the copy for the table is 360px on its long side, or as near as fits', Math.max(...dims.thumb) <= 360 && Math.max(...dims.thumb) >= 240 && dims.tv === 2, JSON.stringify(dims));
  await p.click('#t-hunter'); await p.click('#seg-sheet'); await p.click('#luck button[data-n="2"]'); await p.waitForTimeout(900);
  check('sheet change syncs to table doc', (await p.evaluate(()=>window.__store['party/me123'].luck))===2);
  check('bond name suggestions include table hunters', (await p.evaluate(()=>[...document.querySelectorAll('#partynames option')].map(o=>o.value))).includes('Alex Reyes'));
  await p.click('#t-party'); await p.uncheck('#share'); await p.waitForTimeout(400);
  check('unsharing removes your card', await p.evaluate(()=>!('party/me123' in window.__store)));

  // ---- SETTINGS / BACKUP ----
  await p.click('#settings > summary');
  await p.uncheck('#set-fx'); await p.click('#t-roll'); await p.evaluate(()=>{document.getElementById('fx').className='';});
  for (let i=0;i<6;i++){ await p.click('#roll'); await p.waitForTimeout(1400); }
  check('effects off: no effect class set', await p.evaluate(()=>document.getElementById('fx').className)==='');
  await p.check('#set-fx');
  await p.click('#bk-save'); await p.waitForTimeout(200);
  const saved = await p.evaluate(()=>window.__saved[0]);
  check('backup file offered with journal', !!saved && /hunters-journal-backup-.*\.json/.test(saved.filename) && JSON.parse(saved.data).journal.sheet.name==='Dee Ray');
  await p.click('#t-hunter'); await p.click('#seg-sheet'); await p.fill('#f-name','Someone Else');
  await p.fill('#rs-text','not json'); await p.click('#rs-check'); check('bad backup rejected', /not a readable backup/.test(await T('#bk-msg')));
  await p.fill('#rs-text', JSON.stringify({app:'other'})); await p.click('#rs-check'); check('wrong app rejected', /not a Hunter/.test(await T('#bk-msg')));
  await p.fill('#rs-text', saved.data); await p.click('#rs-check'); check('valid backup asks to confirm', /Replace your journal/.test(await T('#rs-confirm')));
  await p.click('#rs-no'); check('cancel leaves journal alone', (await p.inputValue('#f-name'))==='Someone Else');
  await p.fill('#rs-text', saved.data); await p.click('#rs-check'); await p.click('#rs-go'); await p.waitForTimeout(300);
  check('restore brings back name, bonds, moves, items', (await p.inputValue('#f-name'))==='Dee Ray' && (await p.locator('.bond').count())===1 && (await p.locator('.cm').count())===1 && (await p.locator('.item').count())===3);

  // ---- PERSISTENCE ----
  await p.waitForTimeout(800); await p.reload(); await p.waitForTimeout(700);
  await p.click('#t-hunter'); await p.click('#seg-sheet');
  check('everything survives reload', (await p.inputValue('#f-name'))==='Dee Ray' && (await p.locator('.item').count())===3 && (await p.locator('#portrait img.portrait').count())===1);
  await p.click('#t-bestiary'); check('bestiary survives reload', (await p.locator('details.beast').count())===2);

  // ---- LAYOUT / THEMES ----
  for (const [scheme,w] of [['light',1100],['dark',390],['light',390]]) {
    const c2 = await b.newContext({ viewport: { width: w, height: 800 }, colorScheme: scheme }); await c2.addInitScript(STUB); if (scheme==='light') await followDevice(c2); const q = await c2.newPage();
    q.on('pageerror', e => errs.push('PAGEERR2 ' + e.message));
    await q.goto('file://'+require('path').join(__dirname,'..','index.html')+''); await q.waitForTimeout(500);
    let worst = 0;
    for (const t of ['guide','play','roll','hunter','party','bestiary','tips','notes']) { await q.click('#t-'+t); if (t==='hunter') await q.click('#seg-sheet'); worst = Math.max(worst, await q.evaluate(()=>document.documentElement.scrollWidth-innerWidth)); }
    check(`no horizontal overflow, ${scheme} ${w}px`, worst<=0, worst);
    const bg = await q.evaluate(()=>getComputedStyle(document.body).backgroundColor), fg = await q.evaluate(()=>getComputedStyle(document.body).color);
    check(`theme tokens apply, ${scheme}`, (scheme==='dark') === (parseInt(bg.match(/\d+/)[0])<60), bg+' / '+fg);
    await c2.close();
  }
  // reduced motion
  const rc = await b.newContext({ viewport:{width:900,height:800}, reducedMotion:'reduce'}); await rc.addInitScript(STUB); const rq = await rc.newPage();
  await rq.goto('file://'+require('path').join(__dirname,'..','index.html')+''); await rq.click('#t-roll'); await rq.click('#roll'); await rq.waitForTimeout(250);
  check('reduced motion: result is immediate, no flash overlay animation', await rq.locator('.tier').count()===1 && (await rq.evaluate(()=>getComputedStyle(document.getElementById('fx')).animationName))==='none');
  // keyboard
  await p.click('#t-guide'); await p.focus('#t-guide'); await p.keyboard.press('Tab'); check('keyboard Tab moves focus between tabs', await p.evaluate(()=>document.activeElement.id)==='t-play');
  await p.keyboard.press('Enter'); await p.waitForTimeout(100); check('Enter activates focused tab', await vis('#p-play'));
  // ---- PLAY ----
  const pp = await ctx.newPage(); pp.on('pageerror', e => errs.push('PAGEERR play ' + e.message));
  await pp.setViewportSize({ width: 1300, height: 900 });
  await pp.goto('file://'+require('path').join(__dirname,'..','index.html')+'#play'); await pp.waitForTimeout(700);
  const PT = async (s) => (await pp.textContent(s)).replace(/\s+/g,' ').trim();
  check('play: dice card moves into Play', await pp.evaluate(()=>document.getElementById('rollkit').parentElement.id)==='play-stage');
  check('play: three columns on a laptop', await pp.evaluate(()=>getComputedStyle(document.querySelector('.play')).gridTemplateColumns.split(' ').length)===3);
  check('play: no sideways scroll', await pp.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)<=0);
  check('play: 8 basic move buttons', (await pp.locator('#play-moves .card:not(.want)').first().locator('.pmove').count())===8);
  await pp.click('[data-pmove="inv"]');
  check('play: picking a move selects it and its stat', (await pp.getAttribute('[data-pmove="inv"]','aria-pressed'))==='true' && (await pp.getAttribute('[data-pstat="sharp"]','aria-pressed'))==='true' && /Investigate a Mystery/.test(await PT('#play-sel')));
  await pp.click('[data-padj="other"][data-d="1"]'); await pp.click('[data-padj="other"][data-d="1"]'); await pp.click('[data-padj="other"][data-d="1"]'); await pp.click('[data-padj="other"][data-d="1"]'); await pp.click('[data-padj="other"][data-d="1"]');
  await pp.click('#roll'); await pp.waitForSelector('.tier', {timeout:4000}); await pp.waitForTimeout(100);
  check('play: +5 always hits, so hold is granted', /Hold [12]\. Tap/.test(await PT('#result')), await PT('#result'));
  const holdBefore = +(await PT('#result')).match(/Hold (\d)\. Tap/)[1];
  await pp.locator('[data-ask]').first().click();
  check('play: asking a question spends 1 hold', +(await PT('#result')).match(/Hold (\d)\. (?:Tap|All)/)[1]===holdBefore-1 && (await pp.getAttribute('[data-ask="0"]','aria-pressed'))==='true');
  await pp.click('#t-roll'); check('play: dice card returns to the Roller', await pp.evaluate(()=>document.getElementById('rollkit').parentElement.id)==='roll-home');
  await pp.click('#t-play');
  const harm0 = await pp.locator('#pl-harm button[aria-pressed=true]').count(), luck0 = await pp.locator('#pl-luck button[aria-pressed=true]').count();
  await pp.check('#pl-ign'); await pp.click('[data-ph="1"]'); await pp.click('[data-ph="1"]'); await pp.click('#pl-take');
  check('play: take 3 harm, ignoring armor', (await pp.locator('#pl-harm button[aria-pressed=true]').count())===Math.min(8,harm0+3) && /Took 3 harm/.test(await PT('.pmsg')), await PT('.pmsg'));
  await pp.click('#pl-undo');
  check('play: Luck cancels the wound', (await pp.locator('#pl-harm button[aria-pressed=true]').count())===harm0 && (await pp.locator('#pl-luck button[aria-pressed=true]').count())===luck0-1);
  await pp.close();

  console.log(results.map(r=>r.join(' | ')).join('\n'));
  const fails = results.filter(r=>r[0]==='FAIL').length;
  console.log('\nTOTAL', results.length, 'FAIL', fails); console.log('ERRORS', errs);
  await b.close();
})().catch(e=>{ console.log(results.map(r=>r.join(' | ')).join('\n')); console.log('CRASH', e.message.split('\n').slice(0,6).join('\n')); process.exit(1); });
