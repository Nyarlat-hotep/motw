require('fs').mkdirSync(require('path').join(__dirname,'out'),{recursive:true});
const { chromium } = require('playwright');
const ids=['chosen','crooked','divine','expert','flake','initiate','monstrous','mundane','professional','spellslinger','spooky','wronged'];
const DATA=ids.map(i=>require('../data/'+i+'.json'));
const pmin=(p,o)=>o?0:(Array.isArray(p)?p[0]:(p|0)), pmax=p=>Array.isArray(p)?p[1]:(p|0);
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}).catch(()=>chromium.launch());
 let pass=0, fail=0; const check=(n,ok,x)=>{ if(ok) pass++; else {fail++; console.log('FAIL',n,x===undefined?'':x);} };
 const only=process.argv[2];
 for (const d of DATA) {
  if (only && d.id!==only) continue;
  const ctx=await b.newContext({viewport:{width:900,height:900}}); const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e))); p.on('console',m=>{ if(m.type()==='error' && !/ERR_FILE_NOT_FOUND|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  const T=d.id+': ';
  const st=async()=>{ await p.waitForTimeout(650); return JSON.parse(await p.evaluate(()=>localStorage.getItem('hunters-journal-v1'))); };
  await p.goto('file://'+require('path').join(__dirname,'..','index.html')+''); await p.waitForTimeout(700);
  await p.click('#t-hunter'); await p.waitForTimeout(200);
  check(T+'8 pills', await p.locator('#wpills button').count()===8);
  check(T+'12 cards', await p.locator('#wcards .pb').count()===12);
  await p.locator('.pb', {has:p.locator('h4',{hasText:new RegExp('^'+d.name.replace(/[-]/g,'\\-')+'$')})}).locator('[data-pick]').click();
  await p.click('.wnav .btn:has-text("Next")'); await p.waitForTimeout(100);
  // step 2 look
  check(T+'look groups', await p.locator('.wlook').count()===d.look.length, await p.locator('.wlook').count());
  for (let i=0;i<d.look.length;i++) await p.locator('.wlook').nth(i).locator('[data-wlk]').first().click();
  await p.fill('#w-name','Test '+d.id);
  await p.click('.wnav .btn:has-text("Next")'); await p.waitForTimeout(100);
  // step 3 ratings
  check(T+'5 rating lines', await p.locator('.wopt').count()===d.ratings.length, await p.locator('.wopt').count());
  await p.locator('.wopt').nth(d.ratings.length-1).click();
  let s=await st(); const R=d.ratings[d.ratings.length-1];
  check(T+'stats applied', ['charm','cool','sharp','tough','weird'].every(k=>s.sheet.stats[k]===R[k]), JSON.stringify(s.sheet.stats)+JSON.stringify(R));
  await p.click('.wnav .btn:has-text("Next")'); await p.waitForTimeout(100);
  // step 4 moves
  const nAuto=d.moves.auto.length;
  check(T+'auto moves shown', await p.locator('.wmove .chip.ok').count()===nAuto, await p.locator('.wmove .chip.ok').count());
  const pickBtns=p.locator('[data-wmv]');
  check(T+'choices count', await pickBtns.count()===d.moves.choices.length);
  for (let i=0;i<d.moves.pick;i++) await pickBtns.nth(i).click();
  check(T+'counter full', (await p.textContent('.wcount')).includes(d.moves.pick+' of '+d.moves.pick), await p.textContent('.wcount'));
  if (d.moves.choices.length>d.moves.pick) { await pickBtns.nth(d.moves.pick).click(); check(T+'limit msg', (await p.textContent('#wmsg')).includes('picked all'), await p.textContent('#wmsg')); check(T+'still capped', await p.locator('[data-wmv][aria-pressed=true]').count()===d.moves.pick); }
  s=await st();
  const rolls=d.moves.auto.concat(d.moves.choices.slice(0,d.moves.pick)).filter(m=>m.kind==='roll');
  check(T+'roll moves synced', s.sheet.custom.filter(c=>c.pbk).length===rolls.length, s.sheet.custom.filter(c=>c.pbk).length+' vs '+rolls.length);
  // undo one then redo
  await pickBtns.nth(0).click(); await pickBtns.nth(0).click();
  await p.click('.wnav .btn:has-text("Next")'); await p.waitForTimeout(100);
  // step 5 gear
  const gears=d.gear;
  for (const g of gears) {
   if (g.kind==='builder') {
    const base=g.parts[0]; await p.locator('[data-wbp^="'+g.id+'|'+base.id+'|"]').first().click();
    for (const part of g.parts.slice(1)) { if (part.options) await p.locator('[data-wbp^="'+g.id+'|'+part.id+'|"]').first().click(); else if (part.text) await p.locator('[data-wbq^="'+g.id+'|"]').first().click().catch(()=>{}); }
    continue;
   }
   if (g.auto) continue;
   const cards=p.locator('[data-wgg^="'+g.id+'|"]'); const mx=pmax(g.pick);
   for (let i=0;i<mx;i++) await cards.nth(i).click();
   if (g.items.length>mx && mx>0) { await cards.nth(mx).click(); }
  }
  s=await st();
  const wantInv=(function(){ let n=0; for (const g of gears){ if(g.kind==='builder') n++; else if(g.auto) n+=g.items.length; else n+=pmax(g.pick); } return n; })();
  check(T+'inventory synced', s.sheet.inventory.filter(i=>i.pbk).length===wantInv, s.sheet.inventory.filter(i=>i.pbk).length+' vs '+wantInv);
  const wpn=s.sheet.inventory.filter(i=>i.pbk && i.type==='Weapon'); check(T+'weapons equipped', wpn.every(w=>w.eq));
  await p.screenshot({path:require('path').join(__dirname,'out','pb-gear-'+d.id+'.png'),fullPage:true});
  await p.click('.wnav .btn:has-text("Next")'); await p.waitForTimeout(100);
  // step 6 extras
  for (const g of d.extras) {
   if (g.text||!g.options) { await p.locator('[data-wext="'+g.id+'"]').fill('Test text'); continue; }
   const need=pmin(g.pick,false); const cards=p.locator('[data-wxg^="'+g.id+'|"]');
   for (let i=0;i<need;i++) await cards.nth(i).click();
  }
  check(T+'luck special shown', (await p.textContent('#wbody')).length>50 && await p.locator('#wbody .note').count()>=1);
  await p.click('.wnav .btn:has-text("Next")'); await p.waitForTimeout(100);
  // step 7 bonds
  check(T+'history prompts', await p.locator('[data-whist]').count()===d.history.length, await p.locator('[data-whist]').count());
  await p.locator('[data-whist]').first().click(); await p.fill('#w-bwho','Sam'); await p.click('#wbondform .btn');
  check(T+'bond added', await p.locator('#wbondlist li:not(.empty)').count()===1);
  check(T+'bond note from prompt', (await st()).sheet.bonds[0].note.length>5);
  await p.click('.wnav .btn:has-text("Next")'); await p.waitForTimeout(100);
  const rev=await p.textContent('#wbody');
  check(T+'review complete', rev.includes('Everything is filled in'), rev.slice(0,600));
  check(T+'review shows name', rev.includes('Test '+d.id));
  await p.screenshot({path:require('path').join(__dirname,'out','pb-review-'+d.id+'.png'),fullPage:true});
  // sheet card
  await p.click('#wtosheet'); await p.waitForTimeout(150);
  const card=await p.textContent('#pbcard');
  check(T+'pbcard has luck special', /Luck special/.test(card)); check(T+'pbcard names moves', d.moves.auto.concat(d.moves.choices.slice(0,d.moves.pick)).every(m=>card.includes(m.name)), card.slice(0,300));
  // roller gets roll moves
  if (rolls.length) { await p.click('#t-roll'); await p.waitForTimeout(200); const t=await p.textContent('#moves, #p-roll'); check(T+'roller lists '+rolls[0].name, t.includes(rolls[0].name)); }
  // level up
  await p.click('#t-hunter'); await p.waitForTimeout(100);
  await p.locator('#xp button').nth(4).click(); await p.waitForTimeout(100);
  check(T+'level ready', await p.locator('#dolevel').count()===1);
  await p.click('#dolevel'); await p.waitForTimeout(100);
  const opts=await p.locator('[data-lvl]').count(); check(T+'improvement options', opts>=Math.max(1,d.improvements.length-3), opts);
  await p.locator('[data-lvl]:not([disabled])').first().click(); await p.waitForTimeout(150);
  if (await p.locator('[data-lvlstat]').count()) await p.locator('[data-lvlstat]:not([disabled])').first().click();
  check(T+'level increments', (await p.textContent('#lvl')).trim()==='1', await p.textContent('#lvl'));
  // switch playbook cleans: old moves, gear and ratings leave with the old playbook and come back with it
  const before=await st(); const other=DATA.find(x=>x.id!==d.id).name;
  await p.selectOption('#f-pb', other); let sw=await st();
  check(T+'switch clears ratings', Object.values(sw.sheet.stats).every(v=>v===0), JSON.stringify(sw.sheet.stats));
  check(T+'switch clears playbook gear and moves', !sw.sheet.inventory.some(i=>i.pbk&&i.pbk.indexOf(d.id+'|')===0) && !sw.sheet.custom.some(c=>c.pbk&&d.moves.auto.concat(d.moves.choices).some(m=>m.id===c.pbk)));
  await p.selectOption('#f-pb', d.name); sw=await st();
  check(T+'switch back restores ratings', JSON.stringify(sw.sheet.stats)===JSON.stringify(before.sheet.stats), JSON.stringify(sw.sheet.stats)+' vs '+JSON.stringify(before.sheet.stats));
  check(T+'switch back restores gear', sw.sheet.inventory.filter(i=>i.pbk).length===before.sheet.inventory.filter(i=>i.pbk).length);
  check(T+'no errors', errs.length===0, errs.join(' | '));
  await ctx.close();
 }
 // overflow checks both themes at phone width, step by step
 if (!only) {
  for (const theme of ['light','dark']) {
   const ctx=await b.newContext({viewport:{width:390,height:800}, colorScheme:theme}); const p=await ctx.newPage();
   await p.goto('file://'+require('path').join(__dirname,'..','index.html')+''); await p.waitForTimeout(700);
   await p.click('#t-hunter');
   await p.locator('.pb', {hasText:'The Chosen'}).locator('[data-pick]').click();
   for (let i=0;i<8;i++) {
    await p.evaluate(n=>{},0);
    const ov=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    check('overflow '+theme+' step '+(i+1), ov<=0, ov);
    if (i===3) await p.screenshot({path:require('path').join(__dirname,'out','m-'+theme+'-moves.png'),fullPage:true});
    if (i===4) await p.screenshot({path:require('path').join(__dirname,'out','m-'+theme+'-gear.png'),fullPage:true});
    if (i<7) await p.click('.wnav .btn:has-text("Next")');
    await p.waitForTimeout(100);
   }
   await ctx.close();
  }
 }
 console.log('TOTAL pass',pass,'fail',fail);
 await b.close();
})();
