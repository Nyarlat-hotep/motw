// Hunter card: the 1200 x 630 picture for chat. A full hunter with a photo, an empty one and one with very long text; download; dark whatever the theme; phone width.
require('fs').mkdirSync(require('path').join(__dirname,'out'),{recursive:true});
const { chromium } = require('playwright');
const followDevice = require('./look');
const fs = require('fs'), path = require('path');
const URL = 'file://'+path.join(__dirname,'..','index.html');
const results = []; const errs = [];
function check(name, ok, extra){ results.push([ok?'PASS':'FAIL', name, extra===undefined?'':String(extra)]); }
const PHOTO = 'data:image/jpeg;base64,'+fs.readFileSync(path.join(__dirname,'fixtures','hunter.jpg')).toString('base64');
const move = (n, name) => ({ id: 'm'+n, name, stat: 'sharp', trig: 'When you test the card', full: 'Good.', part: 'Fine.', miss: 'Bad.', note: '' });
const gear = (n, name, type, val) => ({ id: 'g'+n, name, type, val, eq: true, note: '' });
const FULL = { sheet: { name: 'Dee Ray', pronouns: 'she/her', playbook: 'The Mundane', catch: 'I am just here for the snacks.', photo: PHOTO, stats: { charm: 2, cool: 1, sharp: 0, tough: 1, weird: -1 }, luck: 5, harm: 2, xp: 3, level: 3,
  custom: [move(1,'Panic Button'), move(2,'Trust Me')], inventory: [gear(1,'Sledge-hammer','Weapon',3), gear(2,'Pocket knife','Weapon',1), gear(3,'Leather jacket','Armor',1)] } };
const LONG = { sheet: { name: 'Bartholomew Ezekiel Montgomery-Featherstonehaugh the Third of Greater Ashgrove Hollow', pronouns: 'they/them, or whatever suits the mood of the evening', playbook: 'The Spell-Slinger',
  catch: 'I have said it before and I will say it again until somebody in this godforsaken valley finally listens: you do not, under any circumstances, read the Latin out loud, and you certainly do not read it out loud twice.', stats: { charm: -1, cool: 3, sharp: 2, tough: -2, weird: 3 }, luck: 1, harm: 6, unstable: true, xp: 4, level: 12,
  custom: Array.from({length:14}, (_, i) => move(i, 'An Exceedingly Long-Winded Move Name Number '+(i+1))), inventory: Array.from({length:6}, (_, i) => gear(i, 'Great-grandmother\'s ceremonial silver-inlaid boar spear number '+(i+1), 'Weapon', 2)).concat([gear(9,'Plate','Armor',2)]) } };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(()=>chromium.launch());
  // journal: a saved journal to start from, put in place before the page's own script runs
  const open = async (opts, journal) => {
    const ctx = await b.newContext(Object.assign({ viewport: { width: 1100, height: 900 }, colorScheme: 'dark', acceptDownloads: true }, opts));
    if (journal) await ctx.addInitScript((j) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hunters-journal-v1', j); sessionStorage.setItem('seeded', '1'); } }, JSON.stringify(journal));
    if (opts && opts.colorScheme === 'light') await followDevice(ctx);
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
    p.on('console', m => { if (m.type()==='error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
    await p.goto(URL+'#hunter'); await p.waitForTimeout(600);
    return p;
  };
  const card = async (p, file) => {
    await p.click('#seg-sheet'); await p.click('#hv-sheet [data-hcard]'); await p.waitForTimeout(1500);   // the typefaces and the photo arrive after the first drawing
    const r = await p.evaluate(()=>{ const cv=document.querySelector('#hc-canvas'); const px=cv.getContext('2d').getImageData(5,5,1,1).data; return { open: document.querySelector('#hcdlg').open, w: cv.width, h: cv.height, url: cv.toDataURL('image/png'), boxes: window.__card.boxes, photo: window.__card.photo, corner: [px[0],px[1],px[2]].join(','), label: cv.getAttribute('aria-label') }; });
    fs.writeFileSync(path.join(__dirname,'out',file), Buffer.from(r.url.split(',')[1],'base64'));
    r.txt = r.boxes.map(x=>x.t).join(' | ');
    r.fits = r.boxes.filter(x=>x.w > x.max + .5 || x.x < 34 || x.x + x.w > 1166 || x.y < 60 || x.y > 596);
    return r;
  };

  // ---- a full hunter with a photo ----
  let p = await open({}, FULL);
  let r = await card(p, 'card-full.png');
  check('full: the card opens at 1200 x 630', r.open && r.w===1200 && r.h===630);
  check('full: a real picture, not a blank', r.url.length>60000, r.url.length);
  check('full: the photo is drawn', r.photo===true);
  check('full: name, playbook, pronouns and level', /\| Dee Ray \|/.test(' | '+r.txt+' | ') && /The Mundane\s+·\s+she\/her\s+·\s+Level 3/.test(r.txt), r.txt);
  check('full: catchphrase in quotes', r.txt.includes('“I am just here for the snacks.”'));
  check('full: all five ratings', ['+2','+1','+0','+1','−1','Charm','Cool','Sharp','Tough','Weird'].every(t=>r.boxes.some(x=>x.t===t)), r.txt);
  check('full: moves and gear by name', /Panic Button\s+·\s+Trust Me/.test(r.txt) && r.txt.includes('Sledge-hammer, Pocket knife') && r.txt.includes('Armor 1'), r.txt);
  check('full: every piece of text fits its box', r.fits.length===0, JSON.stringify(r.fits));
  check('full: the picture says who it is for screen readers', r.label==='Hunter card for Dee Ray');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#hc-save')]);
  const png = fs.readFileSync(await dl.path());
  check('download: named after the hunter', dl.suggestedFilename()==='hunter-card-dee-ray.png', dl.suggestedFilename());
  check('download: a PNG of the right size', png.slice(1,4).toString()==='PNG' && png.readUInt32BE(16)===1200 && png.readUInt32BE(20)===630 && png.length>40000, png.length);
  check('download: says so', /Picture downloaded/.test(await p.textContent('#hc-msg')));
  if (await p.locator('#hc-copy').isVisible()) { await p.click('#hc-copy'); await p.waitForTimeout(400); check('copy: reports how it went', /Picture copied|Copying was blocked/.test(await p.textContent('#hc-msg')), await p.textContent('#hc-msg')); }
  await p.click('#hc-close');
  check('close shuts the card', !(await p.evaluate(()=>document.querySelector('#hcdlg').open)));
  await p.click('#hv-sheet [data-hcard]'); await p.waitForTimeout(200); await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  check('Escape shuts it too', !(await p.evaluate(()=>document.querySelector('#hcdlg').open)));
  await p.click('#seg-build'); await p.locator('#wpills button').nth(7).click(); await p.waitForTimeout(100); await p.click('#wbody [data-hcard]'); await p.waitForTimeout(300);
  check('the builder\'s review step opens it as well', await p.evaluate(()=>document.querySelector('#hcdlg').open));

  // ---- nobody yet ----
  p = await open();
  r = await card(p, 'card-empty.png');
  check('empty: still a card', r.open && r.url.length>20000 && r.photo===false, r.url.length);
  check('empty: says what is missing', r.boxes.some(x=>x.t==='Unnamed hunter') && /No playbook yet\s+·\s+Level 0/.test(r.txt) && r.boxes.some(x=>x.t==='None picked yet') && r.boxes.some(x=>x.t==='?') && !r.txt.includes('Carries'), r.txt);
  check('empty: text fits', r.fits.length===0, JSON.stringify(r.fits));

  // ---- very long everything ----
  p = await open({}, LONG);
  r = await card(p, 'card-long.png');
  check('long: text is cut to fit, never spilling', r.fits.length===0, JSON.stringify(r.fits));
  check('long: the name is cut with three dots', r.boxes.some(x=>/^Bartholomew.*\.\.\.$/.test(x.t)), r.txt.slice(0,200));
  check('long: as many moves as fit, then a count of the rest', /Move Name Number 1\s+·/.test(r.txt) && /Move Name Number \d\s+·\s+and 1[0-3] more/.test(r.txt.replace(/ \| /g,' ')), r.txt);
  check('long: the same for what they carry', /Great-grandmother's ceremonial.*[.][.][.], and 5 more/.test(r.txt), r.txt);
  check('long: the level stays in view when the pronouns are long', /they\/them.*\.\.\.\s+·\s+Level 12/.test(r.txt), r.txt);
  check('long: the catchphrase stops at two lines', r.boxes.filter(x=>/^“|Latin|listens/.test(x.t)).length<=2);
  check('long: unstable shows with the armor', r.boxes.some(x=>/^Unstable, armor 2$/.test(x.t)), r.txt);
  check('long: the playbook initial stands in for a photo', r.photo===false && r.boxes.some(x=>x.t==='S'));

  // ---- light theme and a phone: the picture stays dark and the box fits ----
  p = await open({ viewport: { width: 390, height: 800 }, colorScheme: 'light' }, FULL);
  r = await card(p, 'card-light-page.png');
  check('light page: the card is still dark', r.corner==='17,12,14', r.corner);
  const fit = await p.evaluate(()=>{ const d=document.querySelector('#hcdlg').getBoundingClientRect(), c=document.querySelector('#hc-canvas').getBoundingClientRect(); return [document.documentElement.scrollWidth-document.documentElement.clientWidth, Math.round(d.left), Math.round(d.right), Math.round(c.width)]; });
  check('phone: the box fits the screen', fit[0]<=0 && fit[1]>=0 && fit[2]<=390 && fit[3]<=366, fit.join(','));
  await p.screenshot({ path: path.join(__dirname,'out','card-phone.png') });

  console.log(results.map(r=>r.join(' | ')).join('\n'));
  const fails = results.filter(r=>r[0]==='FAIL').length;
  console.log('\nTOTAL', results.length, 'FAIL', fails); console.log('ERRORS', errs);
  await b.close();
  if (fails || errs.length) process.exit(1);
})().catch(e=>{ console.log(results.map(r=>r.join(' | ')).join('\n')); console.log('CRASH', e.message.split('\n').slice(0,6).join('\n')); console.log('ERRORS', errs); process.exit(1); });
