// Badges: the list and the drawing (docs/SPEC-CARDS.md, track J). Nothing awards a badge yet; this pins the list's rules and how a token is drawn
// (five kinds of metal, four ranks, a texture from the dice tiles),
// and writes a look sheet of every badge to tests/out/badges-dark.png and badges-light.png.
require('fs').mkdirSync(require('path').join(__dirname,'out'),{recursive:true});
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://'+path.join(__dirname,'..','index.html');
const results = []; const errs = [];
function check(name, ok, extra){ results.push([ok?'PASS':'FAIL', name, extra===undefined?'':String(extra)]); }
const plain = (s) => { for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); if (c < 32 || c > 126) return false; } return true; };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(()=>chromium.launch());
  const open = async (theme, opts, noPack) => {
    const ctx = await b.newContext(Object.assign({ viewport: { width: 1500, height: 900 }, colorScheme: theme === 'light' ? 'light' : 'dark' }, opts));
    await ctx.addInitScript((j) => { localStorage.setItem('hunters-journal-v1', j); }, JSON.stringify({ settings: { theme: theme || 'dark' } }));
    if (noPack) await ctx.route('**/sigils.js*', r => r.abort());
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
    p.on('console', m => { if (m.type()==='error' && !/Failed to load resource|ERR_FAILED/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
    await p.goto(URL); await p.waitForTimeout(700);
    return p;
  };

  // ---- the list ----
  let p = await open('dark');
  const B = await p.evaluate(() => window.__journal.badges);
  const ids = B.map(r => r[0]), icons = B.map(r => r[3]);
  const kinds = {}; B.forEach(r => { kinds[r[1]] = (kinds[r[1]] || 0) + 1; });
  check('63 badges: 26 feats, 16 superlatives, 5 Keeper\'s picks, 10 secrets, 6 milestones', B.length === 63 && kinds.f === 26 && kinds.s === 16 && kinds.k === 5 && kinds.x === 10 && kinds.m === 6, JSON.stringify(kinds));
  check('every id is short, lower case and used once', ids.every(i => /^[a-z]{2,12}$/.test(i)) && new Set(ids).size === ids.length, ids.filter((i, n) => ids.indexOf(i) !== n).join(','));
  check('every name is used once', new Set(B.map(r => r[2])).size === B.length);
  check('no two badges share an icon', new Set(icons).size === icons.length, icons.filter((i, n) => icons.indexOf(i) !== n).join(','));
  const bad = B.filter(r => !r.slice(2).every(plain) || /--/.test(r.join(' ')));
  check('names, rules and lines are plain keyboard characters, with no dashes standing in for a pause', bad.length === 0, bad.map(r => r[0]).join(','));
  const long = B.filter(r => r[2].length > 24 || r[4].length > 84 || r[5].length > 70);
  check('short enough for a card: name 24, rule 84, line 70', long.length === 0, long.map(r => r[0] + ' ' + r[2].length + '/' + r[4].length + '/' + r[5].length).join(', '));
  const lib = await p.evaluate(() => { const k = {}; (window.HJ_SIGILS || []).forEach(g => g[1].forEach(s => { k[s[0]] = 1; })); ['antler', 'lantern', 'crescent', 'eye', 'skull', 'cross', 'pentagram', 'pentacle', 'pupil'].forEach(c => { k[c] = 1; }); return k; });
  check('every icon is in the sigil library', icons.every(i => lib[i]), icons.filter(i => !lib[i]).join(','));
  check('every rule and every line ends as a sentence', B.every(r => /[.?]$/.test(r[4]) && /[.?]$/.test(r[5])), B.filter(r => !/[.?]$/.test(r[4]) || !/[.?]$/.test(r[5])).map(r => r[0]).join(','));

  // ---- the drawing ----
  const d = await p.evaluate(() => {
    const J = window.__journal, host = document.createElement('div'); host.id = 'bt'; host.style.cssText = 'position:absolute;left:0;top:0;z-index:99;background:var(--bg);padding:20px';
    host.innerHTML = J.badges.map(r => J.badgeSVG(r[0])).join('') + '<br>' + J.badgeSVG('bag', { n: 3, cls: 'b-lg' }) + J.badgeSVG('bag', { n: 1 }) + J.badgeSVG('bag', { n: 250 }) + J.badgeSVG('bag', { off: true }) + J.badgeSVG('dry', { hid: true }) + J.badgeSVG('bag', { hid: true }) + J.badgeSVG('bag', { cls: 'b-sm', label: false }) + J.badgeSVG('bag', { n: 6 }) + J.badgeSVG('bag', { n: 10 }) + J.badgeSVG('alive', { n: 2 });
    document.body.appendChild(host);
    const all = [...host.querySelectorAll('svg.bdg')], first = all.slice(0, J.badges.length), rest = all.slice(J.badges.length);
    const size = (e) => Math.round(e.getBoundingClientRect().width);
    const defs = document.getElementById('bdefs');
    return {
      n: first.length, labels: first.map(e => e.getAttribute('aria-label')), uses: first.map(e => e.querySelector('use').getAttribute('href')),
      symbols: J.badges.map(r => !!document.getElementById('bdg-s-' + r[3])), fills: first.map(e => e.querySelector('path').getAttribute('fill')),
      sizes: [size(first[0]), size(rest[0]), size(rest[6])],
      count3: rest[0].querySelector('text') && rest[0].querySelector('text').textContent, count1: !!rest[1].querySelector('text'), count250: rest[2].querySelector('text').textContent, label3: rest[0].getAttribute('aria-label'),
      off: { cls: rest[3].className.baseVal, fill: rest[3].querySelector('path').getAttribute('fill'), label: rest[3].getAttribute('aria-label'), color: getComputedStyle(rest[3]).color },
      hid: { cls: rest[4].className.baseVal, text: rest[4].textContent, label: rest[4].getAttribute('aria-label'), use: !!rest[4].querySelector('use') },
      hidFeat: rest[5].className.baseVal, quiet: rest[6].getAttribute('aria-hidden') + '|' + rest[6].getAttribute('aria-label'),
      ranks: [1, 2, 3, 5, 6, 9, 10, 400].map(n => J.badgeRank(n)).join(''),
      r: [rest[1], rest[0], rest[7], rest[8]].map(e => ({ cls: (/b-r\d/.exec(e.className.baseVal) || [''])[0], rings: e.querySelectorAll('circle[r="24.3"]').length, studs: e.querySelectorAll('circle[r="1.25"]').length, shine: e.querySelectorAll('.b-sh').length, wear: +e.querySelector('.b-tx').getAttribute('opacity') })),
      tx: { fill: first[0].querySelector('.b-tx').getAttribute('fill'), blend: getComputedStyle(first[0].querySelector('.b-tx')).mixBlendMode, onOff: !!rest[3].querySelector('.b-tx'), all: first.every(e => /^url\(#bdg-t[fskxm][0-3]\)$/.test(e.querySelector('.b-tx').getAttribute('fill'))), kinds: new Set(first.map(e => e.querySelector('.b-tx').getAttribute('fill'))).size },
      shineAnim: getComputedStyle(rest[8].querySelector('.b-sh')).animationName, rivets: rest[9].querySelectorAll('circle[r="2.1"]').length, rivetsOnCap: first[0].querySelectorAll('circle[r="2.1"]').length,
      defs: { one: document.querySelectorAll('#bdefs').length, parent: defs.parentNode.tagName, grads: defs.querySelectorAll('linearGradient, radialGradient').length, clips: defs.querySelectorAll('clipPath').length, syms: defs.querySelectorAll('symbol').length, dup: defs.querySelectorAll('symbol').length !== new Set([...defs.querySelectorAll('symbol')].map(s => s.id)).size },
      none: J.badgeSVG('nope') + J.badgeSVG('') + J.badgeSVG('constructor'), muted: getComputedStyle(document.documentElement).getPropertyValue('--muted').trim()
    };
  });
  check('every badge draws', d.n === 63);
  check('each is named for a screen reader', d.labels.every((l, i) => l === B[i][2]), d.labels.filter((l, i) => l !== B[i][2]).join(','));
  check('each carries its own icon from the sigil library, not the stand-in', d.uses.every((u, i) => u === '#bdg-s-' + B[i][3]) && d.symbols.every(Boolean), d.uses.filter((u, i) => u !== '#bdg-s-' + B[i][3]).join(','));
  check('each is filled with the metal of its kind', d.fills.every((f, i) => f === 'url(#bdg-b' + B[i][1] + ')'), d.fills.filter((f, i) => f !== 'url(#bdg-b' + B[i][1] + ')').join(','));
  check('three sizes: 56 in the collection, 112 for the reveal, 30 on a card', d.sizes.join() === '56,112,30', d.sizes);
  check('a count shows from the second time, and tops out', d.count3 === 'x3' && !d.count1 && d.count250 === '99+' && d.label3 === 'Punching Bag, earned 3 times', [d.count3, d.count1, d.count250, d.label3].join(' | '));
  check('not earned yet: an outline in the muted ink, and it says so', /\boff\b/.test(d.off.cls) && d.off.fill === 'none' && d.off.label === 'Punching Bag, not earned yet', JSON.stringify(d.off));
  check('a secret nobody has found gives nothing away', /\boff\b/.test(d.hid.cls) && d.hid.text === '?' && !d.hid.use && d.hid.label === 'A secret badge nobody has found yet', JSON.stringify(d.hid));
  check('only a secret can be hidden', !/\boff\b/.test(d.hidFeat), d.hidFeat);
  check('a token beside its own name is hidden from screen readers', d.quiet === 'true|null', d.quiet);
  check('one shared block of gradients and outlines, a direct child of the page, with one copy of each sigil', d.defs.one === 1 && d.defs.parent === 'BODY' && d.defs.grads === 11 && d.defs.clips === 5 && d.defs.syms === 63 && !d.defs.dup, JSON.stringify(d.defs));
  check('ranks: the 3rd, 6th and 10th time each move a badge up', d.ranks === '11223344', d.ranks);
  check('rank 1 is bare, rank 2 gains a ring, rank 3 studs on it, rank 4 a moving shine', JSON.stringify(d.r.map(x => [x.cls, x.rings, x.studs, x.shine])) === '[["b-r1",0,0,0],["b-r2",2,0,0],["b-r3",2,12,0],["b-r4",2,12,1]]' && d.shineAnim === 'bdgshine', JSON.stringify(d.r) + ' ' + d.shineAnim);
  check('each rank is cleaner metal: less wear every time', d.r[0].wear > d.r[1].wear && d.r[1].wear > d.r[2].wear && d.r[2].wear > d.r[3].wear && d.r[3].wear > 0, d.r.map(x => x.wear).join(' '));
  check('every earned token wears a texture of its own kind, turned one of four ways; an outline wears none', d.tx.all && d.tx.blend === 'overlay' && !d.tx.onOff && d.tx.kinds >= 15, JSON.stringify(d.tx));
  check('a milestone is a plate with four rivets, and nothing else has rivets', d.rivets === 4 && d.rivetsOnCap === 0, d.rivets + ' ' + d.rivetsOnCap);
  await p.waitForTimeout(500);
  const pats = await p.evaluate(() => [...document.querySelectorAll('#bdefs pattern')].map(x => x.id + ':' + x.querySelector('image').getAttribute('href')));
  check('the textures are the dice tiles: five kinds, four turns each', pats.length === 20 && ['f0:img/die-rust.jpg', 's1:img/die-bone.jpg', 'k2:img/die-marble.jpg', 'x3:img/die-stone.jpg', 'm0:img/die-rust.jpg'].every(w => pats.indexOf('bdg-t' + w) >= 0), pats.length + ' ' + pats.slice(0, 3).join(' '));
  check('an unknown id draws nothing', d.none === '', d.none.slice(0, 40));
  // painted, not just present: an earned token and its outline differ, and neither is the bare page
  const box = async (sel) => { const r = await p.evaluate((s) => { const e = document.querySelector(s).getBoundingClientRect(); return { x: Math.round(e.left), y: Math.round(e.top), width: Math.round(e.width), height: Math.round(e.height) }; }, sel); return p.screenshot({ clip: r }); };
  const earned = await box('#bt svg.bdg:nth-of-type(1)'), blank = await p.screenshot({ clip: { x: 1300, y: 860, width: 56, height: 36 } });
  check('a token is painted', earned.length > 2000 && blank.length < earned.length, earned.length + ' ' + blank.length);
  // the texture shows: with its patterns taken away the same token paints differently
  await p.evaluate(() => { document.querySelectorAll('#bdefs pattern').forEach(x => x.setAttribute('id', 'x-' + x.id)); });
  const bare0 = await box('#bt svg.bdg:nth-of-type(1)');
  await p.evaluate(() => { document.querySelectorAll('#bdefs pattern').forEach(x => x.setAttribute('id', x.id.slice(2))); });
  check('the texture changes what is painted, and a token without it is still painted', Buffer.compare(earned, bare0) !== 0 && bare0.length > 2000, earned.length + ' ' + bare0.length);
  await p.evaluate(() => { document.getElementById('bt').remove(); });

  // ---- on its own, for a canvas ----
  const solo = await p.evaluate(() => new Promise((done) => {
    const svg = window.__journal.badgeSVG('hog', { solo: 128, n: 2 });
    const im = new Image();
    im.onload = () => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d'); c.drawImage(im, 0, 0); let px = null, err = ''; try { px = [...c.getImageData(64, 12, 1, 1).data, ...c.getImageData(2, 2, 1, 1).data]; } catch (e) { err = e.message; } done({ w: im.naturalWidth, px, err, own: /<defs>.*bdg-bs.*<symbol id="bdg-s-pig"/.test(svg) && !/b-tx|b-sh/.test(svg), ns: /xmlns="http:\/\/www.w3.org\/2000\/svg"/.test(svg) }); };
    im.onerror = () => done({ w: 0, err: 'did not load' });
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }));
  check('solo: carries its own gradients and sigil, and leaves out what a picture cannot load', solo.own && solo.ns, JSON.stringify([solo.own, solo.ns]));
  check('solo: loads as a picture and paints on a canvas without locking it', solo.w === 128 && !solo.err && solo.px && solo.px[3] > 200 && solo.px[7] === 0, JSON.stringify(solo));

  // ---- the look sheets ----
  const sheet = async (pg, name) => {
    await pg.evaluate(() => {
      const J = window.__journal, kinds = [['f', 'Feats: everyone who does it gets one'], ['s', 'Superlatives: one winner a session'], ['k', "The Keeper's picks"], ['x', 'Secrets: hidden until someone at the table earns one'], ['m', 'Milestones: counted over a hunter\'s whole life']];
      const head = 'font-family:var(--display);font-size:20px;color:var(--accent);margin:20px 0 8px;border-bottom:1px solid var(--line);padding-bottom:4px';
      let h = '<div id="gal" style="position:absolute;left:0;top:0;width:1500px;z-index:99;background:var(--bg);color:var(--ink);padding:26px 30px 34px;box-sizing:border-box;font-family:var(--body)">';
      h += '<h2 style="font-family:var(--display);font-size:30px;margin:0 0 4px">Badges</h2><p class="small muted" style="margin:0">Drawn by the page itself: 63 badges in five kinds of metal. The wear on each is one of the dice textures.</p>';
      kinds.forEach(([k, title]) => {
        h += '<h3 style="' + head + '">' + title + '</h3><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px 18px">';
        J.badges.filter(r => r[1] === k).forEach(r => { h += '<div style="display:grid;grid-template-columns:76px 1fr;gap:10px;align-items:center">' + J.badgeSVG(r[0], { cls: 'b-xl', label: false }) + '<div><b style="font-family:var(--display);font-size:19px">' + r[2] + '</b><div class="small muted" style="line-height:1.25">' + r[4] + '</div><div class="small" style="font-style:italic;line-height:1.25;margin-top:2px">' + r[5] + '</div></div></div>'; });
        h += '</div>';
      });
      const cell = (svg, t) => '<div style="text-align:center">' + svg + '<div class="small muted" style="margin-top:6px">' + t + '</div></div>';
      h += '<h3 style="' + head + '">Ranks: the same badge earned again and again</h3><div style="display:flex;gap:30px;align-items:flex-end;flex-wrap:wrap">';
      [['bag', 1, 'once: worn'], ['bag', 3, '3 times: a ring'], ['bag', 6, '6 times: studs'], ['bag', 10, '10 times: a shine crosses it'], ['snake', 1, 'once'], ['snake', 3, '3 times'], ['snake', 6, '6 times'], ['snake', 10, '10 times'], ['alive', 1, 'once'], ['alive', 6, '6 times'], ['dry', 3, '3 times'], ['pet', 6, '6 times']].forEach(r => { h += cell(J.badgeSVG(r[0], { n: r[1], cls: 'b-lg' }), r[2]); });
      h += '</div><h3 style="' + head + '">States and sizes</h3><div style="display:flex;gap:26px;align-items:flex-end;flex-wrap:wrap">';
      h += cell(J.badgeSVG('bag', { cls: 'b-lg' }), 'the reveal') + cell(J.badgeSVG('bag', { n: 3, cls: 'b-lg' }), 'earned three times') + cell(J.badgeSVG('snake', {}), 'in the collection') + cell(J.badgeSVG('snake', { n: 12 }), 'twelve times') +
        cell(J.badgeSVG('snake', { off: true }), 'not earned yet') + cell(J.badgeSVG('hog', { off: true }), 'not earned yet') + cell(J.badgeSVG('carried', { off: true }), 'not earned yet') + cell(J.badgeSVG('dry', { hid: true }), 'a secret, not found') + cell(J.badgeSVG('dry', {}), 'a secret, found') +
        cell('<span style="display:inline-flex;gap:5px">' + ['weight', 'snake', 'carried', 'dry', 'alive'].map((id) => J.badgeSVG(id, { cls: 'b-sm' })).join('') + '</span>', 'five pinned on a card');
      h += '</div></div>';
      const st = document.createElement('style'); st.textContent = '.bdg.b-xl{width:72px;height:72px}'; document.head.appendChild(st);
      document.body.insertAdjacentHTML('beforeend', h); window.scrollTo(0, 0);
    });
    await pg.waitForTimeout(700);
    await (await pg.$('#gal')).screenshot({ path: path.join(__dirname,'out', name) });
  };
  await sheet(p, 'badges-dark.png');
  p = await open('light');
  const lt = await p.evaluate(() => { const h = document.createElement('div'); h.innerHTML = window.__journal.badgeSVG('bag', { off: true }) + window.__journal.badgeSVG('bag'); document.body.appendChild(h); const r = [getComputedStyle(h.firstChild).color, h.lastChild.querySelector('path').getAttribute('fill')]; h.remove(); return r; });
  check('light look: the outline follows the theme, the metal does not', lt[0] === 'rgb(101, 86, 79)' && lt[1] === 'url(#bdg-bs)', lt.join(' '));
  await sheet(p, 'badges-light.png');

  // ---- without the sigil library the page still draws badges, with the stand-in ----
  p = await open('dark', {}, true);
  const bare = await p.evaluate(() => { const s = window.__journal.badgeSVG('hog'); return { has: !!window.HJ_SIGILS, use: (/href="#([^"]+)"/.exec(s) || [])[1], sym: !!document.getElementById('bdg-s-skull') }; });
  check('no sigil library: every badge still draws, with a skull', !bare.has && bare.use === 'bdg-s-skull' && bare.sym, JSON.stringify(bare));

  console.log(results.map(r=>r.join(' | ')).join('\n'));
  const fails = results.filter(r=>r[0]==='FAIL').length;
  console.log('\nTOTAL', results.length, 'FAIL', fails); console.log('ERRORS', errs);
  await b.close();
  if (fails || errs.length) process.exit(1);
})().catch(e=>{ console.log(results.map(r=>r.join(' | ')).join('\n')); console.log('CRASH', e.message.split('\n').slice(0,6).join('\n')); console.log('ERRORS', errs); process.exit(1); });
