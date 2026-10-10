// Dice maker: defaults untouched, live options, sigil, mismatched pairs, starter sets, dice codes, reload, phone width.
require('fs').mkdirSync(require('path').join(__dirname,'out'),{recursive:true});
const { chromium } = require('playwright');
const followDevice = require('./look');
const path = require('path');
const URL = 'file://'+path.join(__dirname,'..','index.html');
const results = []; const errs = [];
function check(name, ok, extra){ results.push([ok?'PASS':'FAIL', name, extra===undefined?'':String(extra)]); }
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(()=>chromium.launch());
  const ctx = await b.newContext({ viewport: { width: 1100, height: 900 }, colorScheme: 'dark' });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  p.on('console', m => { if (m.type()==='error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  await p.goto(URL+'#roll'); await p.waitForTimeout(600);
  const saved = () => p.evaluate(()=>{ window.dispatchEvent(new Event('pagehide')); return JSON.parse(localStorage.getItem('hunters-journal-v1')||'{}').dice; });
  const faceBg = (sel) => p.evaluate((s)=>getComputedStyle(document.querySelector(s+' .face')).backgroundImage, sel);
  const slot = (i, root) => p.evaluate(([i,root])=>{ const s=document.querySelectorAll(root+' .slot')[i]; return { cls:s.className, style:s.getAttribute('style')||'', label:s.getAttribute('aria-label'), sig:s.querySelectorAll('.face.sig').length, sigOn6:!!s.querySelector('.face.fc-6.sig'), pipFaces:s.querySelectorAll('.face:not(.sig)').length }; }, [i, root||'#dice']);
  const msg = async () => (await p.textContent('#dp-msg')).trim();

  // ---- defaults: a player who never opens the panel sees today's dice ----
  const d0 = await slot(0);
  check('default die has no inline colors and the bone finish', d0.style==='' && /\bfin-bone\b/.test(d0.cls) && !/glow/.test(d0.cls), d0.cls+' | '+d0.style);
  check('default face gradient is the original bone', /rgb\(247, 238, 217\).*rgb\(230, 214, 178\).*rgb\(211, 192, 150\)/.test(await faceBg('#dice')), await faceBg('#dice'));
  check('default pip gradient is the original oxblood', /rgb\(141, 34, 48\).*rgb\(74, 14, 22\)/.test(await p.evaluate(()=>getComputedStyle(document.querySelector('#dice .face i.on')).backgroundImage)));
  check('default die keeps six pip faces and its label', d0.pipFaces===6 && d0.sig===0 && /^Die showing \d$/.test(d0.label), d0.label);
  check('tray starts as leather', (await p.getAttribute('#tray','data-tray'))==='leather');
  check('panel starts closed', await p.evaluate(()=>document.getElementById('dicepanel').hidden));

  // ---- open, live options ----
  await p.click('#dp-open');
  check('Customize dice opens the panel', await p.isVisible('#dicepanel') && (await p.getAttribute('#dp-open','aria-expanded'))==='true');
  check('preview is two real 3D dice', (await p.locator('#dp-dice .slot .cube3').count())===2);
  await p.click('[data-dp-set="body"][data-v="#1f6b50"]');
  check('body color applies to the tray dice', /rgb\(31, 107, 80\)/.test(await faceBg('#dice')), await faceBg('#dice'));
  check('body color applies to the preview', /rgb\(31, 107, 80\)/.test(await faceBg('#dp-dice')));
  check('matched pair: second die follows', /--die:#1f6b50/.test((await slot(1)).style));
  check('swatch reports pressed', (await p.getAttribute('[data-dp-set="body"][data-v="#1f6b50"]','aria-pressed'))==='true');
  check('focus stays on the control after a change', await p.evaluate(()=>document.activeElement && document.activeElement.getAttribute('data-v'))==='#1f6b50');
  await p.fill('input[data-dp-col="pip"]', '#ffcc00');
  check('free color picker sets the pips', /--pip-c:#ffcc00/.test((await slot(0)).style), (await slot(0)).style);
  await p.click('[data-dp-set="finish"][data-v="gem"]');
  const gem = await p.evaluate(()=>{ const f=getComputedStyle(document.querySelector('#dice .face')); return f.opacity+' '+f.backfaceVisibility; });
  check('gem finish is translucent and shows far faces', /fin-gem/.test((await slot(0)).cls) && gem==='0.82 visible', gem);
  await p.check('#dp-glow');
  check('glow adds an outer glow to the pips', /glow/.test((await slot(0)).cls) && /rgb\(255, 204, 0\)/.test(await p.evaluate(()=>getComputedStyle(document.querySelector('#dice .face i.on')).boxShadow)));
  await p.click('[data-dp-set="sigil"][data-v="skull"]');
  const sg = await slot(0);
  check('a sigil replaces the pips on the 6 only', sg.sig===1 && sg.sigOn6 && sg.pipFaces===5, JSON.stringify(sg));
  check('die label is unchanged by a sigil', /^Die showing \d$/.test(sg.label));
  await p.click('[data-dp-tray="slate"]');
  check('tray surface changes on both trays', (await p.getAttribute('#tray','data-tray'))==='slate' && (await p.getAttribute('#dp-tray','data-tray'))==='slate' && /tray-slate.jpg/.test(await p.evaluate(()=>document.getElementById('tray').style.backgroundImage)));

  // ---- readability rule ----
  await p.click('[data-dp-set="body"][data-v="#f5f5f2"]'); await p.click('[data-dp-set="pip"][data-v="#ffffff"]');
  check('low contrast shows a warning', (await p.locator('#dp-warn [data-dp-fix]').count())===1);
  await p.click('#dp-warn [data-dp-fix]');
  check('"Fix it" swaps to a readable pip', (await p.locator('#dp-warn [data-dp-fix]').count())===0 && /--pip-c:#111111/.test((await slot(0)).style), (await slot(0)).style);
  const bad = await p.evaluate(()=>{ return [...document.querySelectorAll('[data-dp-use^="pb:"]')].map(function(b){ b.click(); return document.querySelector('#dp-warn [data-dp-fix]') ? b.getAttribute('data-dp-use') : ''; }).filter(Boolean); });
  check('all twelve playbook sets exist and pass the readability rule', (await p.locator('[data-dp-use^="pb:"]').count())===12 && bad.length===0, bad.join(','));

  // ---- mismatched pair ----
  await p.click('#dp-reset');
  check('reset returns to the default dice', (await slot(0)).style==='' && (await p.getAttribute('#tray','data-tray'))==='leather' && /Bone and Oxblood/.test(await msg()));
  await p.click('[data-dp-pair="0"]'); await p.click('[data-dp-tab="1"]');
  await p.click('[data-dp-set="body"][data-v="#24365e"]'); await p.click('[data-dp-set="pip"][data-v="#ffffff"]'); await p.click('[data-dp-set="finish"][data-v="metal"]'); await p.click('[data-dp-set="sigil"][data-v="crescent"]');
  const m0 = await slot(0), m1 = await slot(1);
  check('mismatched dice keep separate styles', m0.style==='' && /fin-bone/.test(m0.cls) && m0.sig===0 && /--die:#24365e/.test(m1.style) && /fin-metal/.test(m1.cls) && m1.sig===1, m0.cls+' / '+m1.cls);
  await p.click('[data-dp-tab="0"]');
  check('die tabs show each die\'s own settings', (await p.getAttribute('[data-dp-set="finish"][data-v="bone"]','aria-pressed'))==='true');

  // ---- sets ----
  await p.fill('#dp-name', 'Night <b>shift</b>'); await p.click('#dp-save');
  check('save as my set lists it, escaped', (await p.locator('[data-dp-use="my:0"]').count())===1 && (await p.locator('#dp-sets b').count())===0 && /Night <b>shift<\/b>/.test(await p.textContent('[data-dp-use="my:0"]')));
  await p.click('#dp-save');
  check('saving the same name again replaces it', (await p.locator('[data-dp-use^="my:"]').count())===1);
  await p.click('[data-dp-use="pb:wronged"]');
  check('a playbook set applies and re-links the pair', /--die:#c3c7cc/.test((await slot(1)).style) && (await p.getAttribute('[data-dp-pair="1"]','aria-pressed'))==='true' && (await p.getAttribute('[data-dp-use="pb:wronged"]','aria-pressed'))==='true');
  await p.click('[data-dp-use="my:0"]');
  check('my set brings back the mismatched pair', (await slot(0)).style==='' && /--die:#24365e/.test((await slot(1)).style) && (await p.getAttribute('[data-dp-pair="0"]','aria-pressed'))==='true');

  // ---- dice codes ----
  const code = await p.evaluate(()=>{ document.getElementById('dp-name').value='Night shift'; let got=''; navigator.clipboard.writeText = function(t){ got=t; return Promise.resolve(); }; document.getElementById('dp-copy').click(); return got; });
  check('copy code gives an HJD1 code', /^HJD1\.[A-Za-z0-9_-]+$/.test(code), code.slice(0,24));
  const sv = await saved();
  check('dice are in saved state (and so in backups)', sv && sv.linked===false && sv.b.body==='#24365e' && sv.sets.length===1);

  // a second browser loads the same dice from the code
  const ctx2 = await b.newContext({ viewport: { width: 1100, height: 900 } });
  let q = await ctx2.newPage(); q.on('pageerror', e => errs.push('PAGEERR2 ' + e.message));
  await q.goto(URL+'#roll'); await q.waitForTimeout(500); await q.click('#dp-open');
  await q.fill('#dp-code', '  '+code+'  '); await q.click('#dp-load');
  const q1 = await q.evaluate(()=>{ const s=document.querySelectorAll('#dice .slot'); return [s[0].getAttribute('style')||'', s[1].getAttribute('style')||'', s[1].className, s[1].querySelectorAll('.face.sig').length, document.getElementById('dp-msg').textContent, document.getElementById('dp-name').value].join(' | '); });
  check('code round-trip: another browser gets the same dice', /^ \| .*--die:#24365e.*fin-metal.*\| 1 \| Loaded "Night shift"\. \| Night shift$/.test(q1), q1);
  const enc = (o) => 'HJD1.'+Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const D = { body:'#112233', finish:'bone', pip:'#ffffff', glow:false, sigil:'' };
  const before = await q.evaluate(()=>document.getElementById('dice').innerHTML);
  const hostile = {
    'empty': '', 'plain text': 'hello', 'wrong prefix': code.replace('HJD1','HJD2'), 'not base64 json': 'HJD1.abc', 'a JSON array': enc([1,2]),
    'missing die b': enc({ a:D, tray:'felt' }), 'unknown tray': enc({ a:D, b:D, tray:'lava' }), 'unknown finish': enc({ a:Object.assign({},D,{finish:'gold'}), b:D, tray:'felt' }),
    'css in a color': enc({ a:Object.assign({},D,{body:'red;background:url(//x)'}), b:D, tray:'felt' }), 'markup in a color': enc({ a:Object.assign({},D,{pip:'"><img src=x onerror=alert(1)>'}), b:D, tray:'felt' }),
    'color as an array': enc({ a:Object.assign({},D,{body:['#112233']}), b:D, tray:'felt' }), 'markup as a sigil': enc({ a:Object.assign({},D,{sigil:'<svg onload=alert(1)>'}), b:D, tray:'felt' }),
    'glow as a string': enc({ a:Object.assign({},D,{glow:'yes'}), b:D, tray:'felt' }), 'name as an object': enc({ a:D, b:D, tray:'felt', name:{ x:1 } })
  };
  for (const k of Object.keys(hostile)) {
    await q.fill('#dp-code', hostile[k]); await q.click('#dp-load');
    check('bad code refused: '+k, (await q.textContent('#dp-msg'))==='That is not a dice code.' && (await q.evaluate(()=>document.getElementById('dice').innerHTML))===before);
  }
  let alerted = false; q.on('dialog', d => { alerted = true; d.dismiss(); });
  await q.fill('#dp-code', enc({ a:D, b:D, tray:'felt', name:'<img src=x onerror=alert(1)> '+'x'.repeat(80), extra:'<script>alert(2)</script>' })); await q.click('#dp-load'); await q.click('#dp-save'); await q.waitForTimeout(200);
  const nm = await q.inputValue('#dp-name');
  check('a code with markup in its name loads as plain text, trimmed to 40', !alerted && nm.length===40 && (await q.locator('#dicepanel img').count())===0 && /<img/.test(await q.textContent('[data-dp-use^="my:"] >> nth=-1')) && /--die:#112233/.test(await q.evaluate(()=>document.querySelector('#dice .slot').getAttribute('style'))), nm);
  // tampered saved state never reaches the page raw
  await q.close(); await ctx2.close();
  const ctx4 = await b.newContext({ viewport: { width: 1100, height: 900 } });
  await ctx4.addInitScript(()=>{ localStorage.setItem('hunters-journal-v1', JSON.stringify({ v:1, dice:{ linked:false, a:{ body:'red" onmouseover="alert(3)', finish:'x"><img src=x onerror=alert(4)>', pip:'#00ff00', glow:'1', sigil:'nope' }, b:'junk', tray:'"><b>', sets:'nope' } })); });
  q = await ctx4.newPage(); q.on('pageerror', e => errs.push('PAGEERR4 ' + e.message)); q.on('dialog', d => { alerted = true; d.dismiss(); });
  await q.goto(URL+'#roll'); await q.waitForTimeout(500); await q.click('#dp-open');
  const t1 = await q.evaluate(()=>{ const s=document.querySelector('#dice .slot'); return s.className+' | '+(s.getAttribute('style')||'')+' | '+document.getElementById('tray').getAttribute('data-tray')+' | '+document.querySelectorAll('#rollkit img').length; });
  check('tampered saved dice fall back field by field', !alerted && /^slot fin-bone \| --pip-hi:#[0-9a-f]{6};--pip:#[0-9a-f]{6};--pip-c:#00ff00; \| leather \| 0$/.test(t1), t1);
  await q.close(); await ctx4.close();

  // ---- reload keeps the set ----
  await p.reload(); await p.waitForTimeout(600);
  const r0 = await slot(0), r1 = await slot(1);
  check('reload keeps the dice', r0.style==='' && /--die:#24365e/.test(r1.style) && /fin-metal/.test(r1.cls) && r1.sig===1, r1.cls+' | '+r1.style);
  await p.click('#dp-open');
  check('reload keeps saved sets', (await p.locator('[data-dp-use="my:0"]').count())===1);
  await p.click('[data-dp-del="0"]');
  check('a saved set can be removed', (await p.locator('[data-dp-use^="my:"]').count())===0);

  // ---- a roll throws the custom dice, panel travels with the dice card ----
  await p.click('[data-dp-use="pb:spooky"]'); await p.click('#roll');
  check('dice in the air use the chosen finish', /fin-gem/.test((await slot(0)).cls) && await p.evaluate(()=>document.getElementById('tray').classList.contains('rolling')));
  await p.waitForSelector('.tier', { timeout: 4000 });
  check('landed dice keep the style', /fin-gem/.test((await slot(1)).cls) && /--die:#1f6b50/.test((await slot(1)).style));
  await p.click('#t-play');
  check('panel travels to Play with the dice card', await p.evaluate(()=>document.getElementById('dicepanel').closest('#play-stage')!==null) && await p.isVisible('#dp-open'));
  await p.click('#t-roll');

  // ---- keyboard ----
  await p.click('#dp-close');
  check('Done closes the panel and returns focus', await p.evaluate(()=>document.getElementById('dicepanel').hidden && document.activeElement.id==='dp-open'));
  await p.keyboard.press('Enter'); await p.keyboard.press('Tab'); await p.keyboard.press('Tab');
  await p.keyboard.press('Tab'); await p.keyboard.press('Space');
  check('panel is keyboard-usable (Enter opens, Tab reaches options, Space picks)', await p.isVisible('#dicepanel') && (await p.getAttribute('[data-dp-pair="0"]','aria-pressed'))==='true', await p.evaluate(()=>document.activeElement.outerHTML.slice(0,80)));

  // ---- phone width, both themes ----
  for (const scheme of ['dark','light']) {
    const c3 = await b.newContext({ viewport: { width: 390, height: 800 }, colorScheme: scheme });
    if (scheme === 'light') await followDevice(c3);
    const m = await c3.newPage(); m.on('pageerror', e => errs.push('PAGEERR3 ' + e.message));
    await m.goto(URL+'#roll'); await m.waitForTimeout(500); await m.click('#dp-open');
    await m.click('[data-dp-pair="0"]'); await m.click('[data-dp-use="pb:spellslinger"]'); await m.fill('#dp-name','A fairly long name for a set of dice ok'); await m.click('#dp-save');
    const ov = await m.evaluate(()=>document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check('no sideways scroll at 390px with the panel open ('+scheme+')', ov<=0, ov);
    const lbl = await m.evaluate(()=>{ const e=document.querySelector('#dicepanel .lbl'), c=getComputedStyle(e).color; return c; });
    check('panel renders in the '+scheme+' theme', !!lbl, lbl);
    await m.locator('#dicepanel').screenshot({ path: path.join(__dirname,'out','dice-panel-'+scheme+'.png') });
    await m.close(); await c3.close();
  }

  // ---- gallery screenshot of the twelve playbook sets, for eyeballing ----
  await p.evaluate(()=>{
    const g=document.createElement('div'); g.id='gal'; g.style.cssText='display:grid;grid-template-columns:repeat(4,260px);gap:6px;padding:6px;background:#111;width:max-content';
    [...document.querySelectorAll('[data-dp-use^="pb:"]')].map(b=>b.getAttribute('data-dp-use')).forEach(function(k){ document.querySelector('[data-dp-use="'+k+'"]').click(); const t=document.getElementById('dp-tray').cloneNode(true); t.removeAttribute('id'); t.style.margin='0'; const w=document.createElement('div'); w.innerHTML='<div style="color:#fff;font:13px sans-serif;padding:2px">'+k.slice(3)+'</div>'; w.appendChild(t); g.appendChild(w); });
    document.body.insertBefore(g, document.body.firstChild);
  });
  check('traced sigils: pentagram and pentacle are offered, and the skull is the traced art', await p.evaluate(()=>{ const q=(n)=>document.querySelector('[data-dp-set="sigil"][data-v="'+n+'"] svg path'); return !!q('pentagram') && !!q('pentacle') && q('skull').getAttribute('transform')==='scale(.1)' && q('skull').getAttribute('d').length>500; }));
  // ---- the sigil pack: groups, a grid per group, and a pack sigil on a die ----
  const grp = (name) => p.evaluate((name)=>{ [...document.querySelectorAll('[data-dp-sg]')].find(b=>b.textContent===name).click(); return document.querySelectorAll('.siggrid [data-dp-set="sigil"]').length - 1; }, name);
  check('sigils come in groups', (await p.evaluate(()=>[...document.querySelectorAll('[data-dp-sg]')].map(b=>b.textContent).join(',')))==='Classic,Wasteland,Hunter,Monsters,Beasts,Spirits,Symbols,Tarot,Runes,Elements,Zodiac,Glyphs');
  check('Tarot has all 22 cards, Runes all 24, and every sigil button has a name', (await grp('Tarot'))===22 && (await grp('Runes'))===24 && await p.evaluate(()=>[...document.querySelectorAll('.siggrid [data-v]')].every(b=>!b.getAttribute('data-v') || (b.getAttribute('aria-label')||'').length>2)));
  await grp('Tarot'); await p.click('.siggrid [data-v="tarot-moon"]');
  const moon = await slot(0);
  check('choosing The Moon puts it on the 6 only, names it, and marks it chosen', moon.sig===1 && moon.sigOn6 && /The Moon/.test(await p.textContent('#dp-opts .signame')) && (await p.getAttribute('.siggrid [data-v="tarot-moon"]','aria-pressed'))==='true');
  check('the picker stays on the group you were browsing', await p.evaluate(()=>[...document.querySelectorAll('[data-dp-sg]')].find(b=>b.textContent==='Tarot').getAttribute('aria-pressed'))==='true');
  check('a pack sigil is saved with the die', (await saved()).a.sigil==='tarot-moon');
  await grp('Runes'); await p.click('.siggrid [data-v="rune-algiz"]');
  check('a rune works the same way', (await saved()).a.sigil==='rune-algiz' && (await slot(0)).sigOn6);
  check('credits name the icon authors and the fonts', await p.evaluate(()=>{ const c = document.getElementById('credits').textContent; return /Lorc/.test(c) && /Delapouite/.test(c) && /Caro Asercion/.test(c) && /game-icons\.net/.test(c) && /Open Font License/.test(c); }));
  check('the library holds over 200 sigils, every key unique and allowed on a die', await p.evaluate(()=>{ const keys = new Set(); let n = 0; window.HJ_SIGILS.forEach(g=>g[1].forEach(s=>{ keys.add(s[0]); n++; })); return n > 200 && keys.size === n; }));
  check('fourteen finishes are offered, Oil slick by its full name', (await p.locator('[data-dp-set="finish"]').count())===14 && (await p.textContent('[data-dp-set="finish"][data-v="oil"]'))==='Oil slick');
  await p.click('[data-dp-set="finish"][data-v="magma"]');
  check('a newer finish also carries the class of the one it is like', (await slot(0)).cls.split(' ').indexOf('fin-magma')>=0 && (await slot(0)).cls.split(' ').indexOf('fin-stone')>=0 && (await saved()).a.finish==='magma');
  await p.click('[data-dp-set="finish"][data-v="bone"]');
  for (const k of ['rig','slick','core','scrap','tank']) { await p.click('[data-dp-use="x:'+k+'"]'); if (await p.locator('.dp-warn').count()) check('campaign set '+k+' passes the readability rule', false); }
  check('campaign sets are readable and use sigils from the library', (await saved()).a.finish==='fuel' && await p.evaluate(()=>{ document.querySelector('[data-dp-use="x:rig"]').click(); return !!document.querySelector('#dice .face.sig svg path'); }));
  await p.click('[data-dp-use="default"]');
  await p.locator('#dp-opts').screenshot({ path: path.join(__dirname,'out','dice-sigil-picker.png') });
  await p.click('.siggrid [data-v=""]');

  await p.locator('#gal').screenshot({ path: path.join(__dirname,'out','dice-sets.png') });

  // ---- without sigils.js the journal still works, with the classic sigils ----
  const ctxN = await b.newContext({ viewport: { width: 1100, height: 900 } });
  await ctxN.route('**/sigils.js', r => r.abort());
  const pn = await ctxN.newPage(); let nErr = 0; pn.on('pageerror', () => nErr++);
  await pn.goto(URL+'#roll'); await pn.waitForTimeout(600); await pn.click('#dp-open');
  check('no sigils.js: one group, the nine classics, no errors, and rolling works', nErr===0 && (await pn.locator('[data-dp-sg]').count())===1 && (await pn.locator('.siggrid [data-dp-set="sigil"]').count())===10 && await pn.evaluate(()=>{ document.getElementById('roll').click(); return true; }));

  console.log(results.map(r=>r.join(' | ')).join('\n'));
  const fails = results.filter(r=>r[0]==='FAIL').length;
  console.log('\nTOTAL', results.length, 'FAIL', fails); console.log('ERRORS', errs);
  await b.close();
  if (fails || errs.length) process.exit(1);
})().catch(e=>{ console.log(results.map(r=>r.join(' | ')).join('\n')); console.log('CRASH', e.message.split('\n').slice(0,6).join('\n')); process.exit(1); });
