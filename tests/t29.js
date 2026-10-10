// Who gets which badge: worker/awards.mjs, run in plain Node with made-up nights (no server). One night for each rule, then the edges:
// ties, minimums, a hunter playing alone, a night where nobody earns anything, a session in several parts, the Keeper's picks, and secrets found for the first time.
// It also holds the rules against the page's own list of badges, so a badge cannot be added to one and forgotten in the other.
const fs = require('fs'), path = require('path'), vm = require('vm'), { pathToFileURL } = require('url');
const results = [];
function check(name, ok, extra){ results.push([ok?'PASS':'FAIL', name, extra===undefined?'':String(extra)]); }

(async () => {
  const A = await import(pathToFileURL(path.join(__dirname, '..', 'worker', 'awards.mjs')).href);

  // ---- the page's list and the rules name the same badges ----
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const a0 = html.indexOf('var BADGES = ['), ctx = {};
  vm.runInNewContext(html.slice(a0, html.indexOf('];', a0) + 2).replace('var BADGES', 'BADGES'), ctx);
  const page = ctx.BADGES, pageSession = page.filter(r => r[1] !== 'm').map(r => r[0]).sort(), pageMiles = page.filter(r => r[1] === 'm').map(r => r[0]).sort();
  check('every badge a session can hand out has a rule, and every rule has a badge', JSON.stringify(pageSession) === JSON.stringify(A.SESSION_BADGES.slice().sort()), pageSession.filter(i => !A.SESSION_BADGES.includes(i)).join(',') + ' | ' + A.SESSION_BADGES.filter(i => !pageSession.includes(i)).join(','));
  check('the milestones are the page\'s six', JSON.stringify(pageMiles) === JSON.stringify(A.MILESTONES.slice().sort()));
  check('the Keeper\'s picks are the page\'s wax seals', JSON.stringify(page.filter(r => r[1] === 'k').map(r => r[0]).sort()) === JSON.stringify(A.PICKS.slice().sort()));
  check('the secrets are the page\'s black nuts', JSON.stringify(page.filter(r => r[1] === 'x').map(r => r[0]).sort()) === JSON.stringify(A.SECRETS.slice().sort()));
  check('no rule is listed twice', new Set(A.BADGE_IDS).size === A.BADGE_IDS.length && A.BADGE_IDS.length === 63, A.BADGE_IDS.length);

  // ---- building a night ----
  // roll('a', 3, 4, 1, 'kick') is hunter a rolling 3 and 4 with +1 on Kick Some Ass. A night is a list of those, in order.
  let seq = 0;
  const R = (who, d1, d2, mod, mv, more) => Object.assign({ seq: ++seq, p: 1, id: who, hid: 'h' + who, d1, d2, mod: mod || 0, mv: mv || '', hm: 0, luck: false, at: seq * 1000 }, more || {});
  const N = (who, night, more) => Object.assign({ p: 1, id: who, hid: 'h' + who, who: 'Player ' + who, name: 'Hunter ' + who, playbook: 'The Mundane', at: 1, night: night === null ? null : Object.assign({ harm: 0, peak: 0, hit: 0, luck: 0, left: 7, lvl: 0, unst: false, died: false }, night) }, more || {});
  const play = (rolls, hunters, more) => A.tally(Object.assign({ n: 1, name: 'Test night', at: 5, parts: [{ p: 1, started: 1, last: 2 }], rolls, hunters: hunters || [], picks: {}, found: [] }, more || {}));
  const got = (t, who) => t.awards.filter(a => a.id === who).map(a => a.b).sort();
  const gets = (t, who, b) => got(t, who).includes(b);
  const filler = (who, n, d1, d2, mod, mv) => Array.from({ length: n }, () => R(who, d1 || 4, d2 || 4, mod || 0, mv));   // n plain 8s by default: a 7 to 9, nothing special

  // ---- feats, one rule at a time: the night that earns it, and the nearest night that does not ----
  const feat = (id, yes, no, hYes, hNo) => {
    const t1 = play(yes, hYes), t2 = play(no, hNo);
    check(id + ': earned', gets(t1, 'a', id), got(t1, 'a').join(','));
    check(id + ': not earned by the near miss', !gets(t2, 'a', id), got(t2, 'a').join(','));
  };
  feat('snake', [R('a', 1, 1)], [R('a', 1, 2)]);
  feat('boxcars', [R('a', 6, 6)], [R('a', 6, 5)]);
  feat('cold', [R('a', 1, 2), R('a', 2, 2), R('a', 1, 4)], [R('a', 1, 2), R('a', 2, 2), R('a', 4, 4), R('a', 1, 4)]);
  feat('hot', [R('a', 5, 5), R('a', 6, 4), R('a', 4, 4, 2)], [R('a', 5, 5), R('a', 4, 4), R('a', 6, 4), R('a', 5, 5)]);
  feat('clean', filler('a', 6), filler('a', 5).concat([R('a', 1, 2)]));
  feat('over', [R('a', 6, 5, 1)], [R('a', 6, 5, 0)]);
  check('over: Luck does not make an Overachiever', !gets(play([R('a', 2, 2, 0, '', { luck: true })]), 'a', 'over'));
  feat('devil', [R('a', 2, 2, 0, '', { luck: true })], [R('a', 2, 2)]);
  feat('fumes', [R('a', 4, 4)], [R('a', 4, 4)], [N('a', { left: 0 })], [N('a', { left: 1 })]);
  feat('door', [R('a', 4, 4)], [R('a', 4, 4)], [N('a', { peak: 7, harm: 7 })], [N('a', { peak: 6, harm: 6 })]);
  check('door: not for a hunter who died', !gets(play([R('a', 4, 4)], [N('a', { peak: 8, harm: 8, died: true })]), 'a', 'door'));
  feat('scratch', filler('a', 6), filler('a', 6), [N('a', {})], [N('a', { harm: 1, peak: 1, hit: 1 })]);
  check('scratch: needs the hunter\'s own numbers, so an old page earns none', !gets(play(filler('a', 6), [N('a', null)]), 'a', 'scratch') && !gets(play(filler('a', 6)), 'a', 'scratch'));
  feat('wiser', [R('a', 4, 4)], [R('a', 4, 4)], [N('a', { lvl: 1 })], [N('a', {})]);
  feat('bench', [R('a', 4, 4), R('a', 4, 4)].concat(filler('b', 18)), [R('a', 4, 4), R('a', 4, 4), R('a', 4, 4)].concat(filler('b', 18)));
  check('bench: not on a quiet night', !gets(play([R('a', 4, 4)].concat(filler('b', 18))), 'a', 'bench'));
  feat('buried', [R('a', 4, 4)], [R('a', 4, 4)], [N('a', { died: true, harm: 8, peak: 8 })], [N('a', { harm: 7, peak: 7 })]);
  feat('fence', filler('a', 5), filler('a', 4));
  feat('comeback', [R('a', 1, 2), R('a', 1, 3), R('a', 5, 5)], [R('a', 1, 2), R('a', 4, 4), R('a', 5, 5)]);
  feat('jaw', [R('a', 4, 4)], [R('a', 4, 4)], [N('a', { hit: 3, harm: 3, peak: 3 })], [N('a', { hit: 2, harm: 4, peak: 4 })]);
  feat('hoard', [R('a', 1, 2), R('a', 1, 2), R('a', 1, 2)], [R('a', 1, 2), R('a', 1, 2), R('a', 1, 2)], [N('a', { left: 4 })], [N('a', { left: 4, luck: 1 })]);
  check('hoard: not with only 3 Luck left', !gets(play([R('a', 1, 2), R('a', 1, 2), R('a', 1, 2)], [N('a', { left: 3 })]), 'a', 'hoard'));
  feat('trigger', filler('a', 5, 4, 4, 0, 'kick'), filler('a', 4, 4, 4, 0, 'kick'));
  feat('pacifist', filler('a', 8, 4, 4, 0, 'inv'), filler('a', 7, 4, 4, 0, 'inv').concat([R('a', 4, 4, 0, 'kick')]));
  feat('pony', filler('a', 4, 4, 4, 0, 'manip').concat(filler('a', 2, 4, 4, 0, 'inv')), filler('a', 3, 4, 4, 0, 'manip').concat(filler('a', 3, 4, 4, 0, 'inv')));
  feat('wounded', [R('a', 4, 4)], [R('a', 4, 4)], [N('a', { unst: true, harm: 4, peak: 4 })], [N('a', { harm: 4, peak: 4 })]);
  feat('seven', [R('a', 3, 4), R('a', 2, 4, 1), R('a', 5, 3, -1)], [R('a', 3, 4), R('a', 2, 4, 1), R('a', 5, 3)]);
  feat('clutch', [R('a', 5, 5, 0, '', { hm: 6 })], [R('a', 5, 5, 0, '', { hm: 5 })]);
  feat('disaster', [R('a', 1, 2), R('a', 2, 2), R('a', 1, 3, 3)], [R('a', 1, 2), R('a', 2, 2), R('a', 2, 3)]);
  feat('roller', [R('a', 5, 5), R('a', 6, 4, -3), R('a', 6, 6)], [R('a', 5, 5), R('a', 6, 4), R('a', 5, 4, 3)]);
  feat('underdog', [R('a', 6, 5, -1)], [R('a', 6, 5, 0)]);
  // secrets
  feat('dry', filler('a', 6), filler('a', 5).concat([R('a', 5, 5)]));
  feat('dust', [R('a', 4, 4)], [R('a', 4, 4)], [N('a', { died: true, left: 3 })], [N('a', { died: true, left: 2 })]);
  feat('again', [R('a', 2, 5), R('a', 5, 2), R('a', 2, 5)], [R('a', 2, 5), R('a', 5, 2), R('a', 2, 4)]);
  feat('twins', [R('a', 2, 2), R('a', 3, 3), R('a', 4, 4), R('a', 5, 5)], [R('a', 2, 2), R('a', 3, 3), R('a', 4, 4), R('a', 5, 4)]);
  feat('jack', A.MOVES.map(m => R('a', 4, 4, 0, m)), A.MOVES.slice(1).map(m => R('a', 4, 4, 0, m)).concat([R('a', 4, 4)]));
  feat('deal', [R('a', 1, 1, 0, '', { luck: true })], [R('a', 1, 2, 0, '', { luck: true })]);
  feat('beast', [R('a', 6, 6), R('a', 2, 6)], [R('a', 6, 6), R('a', 4, 4), R('a', 2, 6)]);
  feat('thirteen', [R('a', 6, 6, 1)], [R('a', 6, 6, 2)]);
  check('a streak is one hunter\'s own: someone else rolling in between does not break it', gets(play([R('a', 1, 2), R('b', 5, 5), R('a', 2, 2), R('b', 5, 5), R('a', 1, 4)]), 'a', 'cold'));

  // ---- superlatives ----
  const sup = (id, mine, theirs, hs) => { const t = play(mine.concat(theirs), hs); return [gets(t, 'a', id), gets(t, 'b', id)]; };
  const beat = (id, a, b, hs) => { const r = sup(id, a, b, hs); check(id + ': the one with the most wins it alone', r[0] && !r[1], r.join()); };
  beat('weight', [R('a', 1, 2), R('a', 1, 2), R('a', 1, 2)], [R('b', 1, 2), R('b', 1, 2)]);
  beat('arm', [R('a', 5, 5), R('a', 5, 5), R('a', 5, 5)], [R('b', 5, 5)]);
  beat('bag', [R('a', 4, 4)], [R('b', 4, 4)], [N('a', { harm: 4, peak: 4, hit: 2 }), N('b', { harm: 3, peak: 3, hit: 1 })]);
  beat('hitter', [R('a', 4, 4, 0, 'kick'), R('a', 4, 4, 0, 'kick')], [R('b', 4, 4, 0, 'kick'), R('b', 1, 2, 0, 'kick')]);
  beat('hog', filler('a', 8), filler('b', 7));
  beat('nosy', [R('a', 4, 4, 0, 'inv'), R('a', 4, 4, 0, 'read'), R('a', 4, 4, 0, 'inv')], [R('b', 4, 4, 0, 'inv')]);
  beat('shield', filler('a', 2, 4, 4, 0, 'prot'), filler('b', 1, 4, 4, 0, 'prot'));
  beat('tongue', filler('a', 2, 4, 4, 0, 'manip'), filler('b', 2, 1, 2, 0, 'manip'));
  beat('fire', filler('a', 2, 4, 4, 0, 'magic'), filler('b', 1, 4, 4, 0, 'magic'));
  beat('wing', filler('a', 2, 4, 4, 0, 'help'), filler('b', 1, 4, 4, 0, 'help'));
  beat('bottom', [R('a', 1, 1, -1)], [R('b', 1, 1)]);
  beat('peak', [R('a', 6, 6, 3)], [R('b', 6, 6, 2)]);
  beat('mixed', filler('a', 3), filler('b', 2));
  beat('spender', [R('a', 4, 4)], [R('b', 4, 4)], [N('a', { luck: 2, left: 5 }), N('b', { luck: 1, left: 6 })]);
  check('first and last go by the order of the rolls', (() => { const t = play([R('a', 4, 4), R('b', 4, 4), R('a', 4, 4), R('b', 4, 4)]); return gets(t, 'a', 'first') && !gets(t, 'b', 'first') && gets(t, 'b', 'last') && !gets(t, 'a', 'last'); })());
  check('a tie is shared', sup('hog', filler('a', 8), filler('b', 8)).join() === 'true,true');
  check('under the minimum nobody wins: two misses is not Dead Weight', sup('weight', [R('a', 1, 2), R('a', 1, 2)], [R('b', 4, 4)]).join() === 'false,false');
  check('a hunter playing alone wins no superlatives, and no first or last', (() => { const t = play(filler('a', 9).concat([R('a', 1, 1), R('a', 1, 2), R('a', 1, 2)])); const g = got(t, 'a'); return !g.includes('hog') && !g.includes('weight') && !g.includes('first') && !g.includes('bottom') && g.includes('snake'); })(), got(play(filler('a', 9)), 'a').join(','));
  check('harm and Luck superlatives need the hunter\'s own numbers', sup('bag', [R('a', 4, 4)], [R('b', 4, 4)], [N('a', null), N('b', null)]).join() === 'false,false');

  // ---- the whole table at once ----
  let t = play([R('a', 4, 4), R('b', 4, 4), R('c', 4, 4)], [N('a', { harm: 1, peak: 1, hit: 1 }), N('b', { harm: 2, peak: 2, hit: 2 }), N('c', { harm: 1, peak: 1, hit: 1 })]);
  check('bath: three hunters, all hurt, all get it', ['a', 'b', 'c'].every(w => gets(t, w, 'bath')));
  t = play([R('a', 4, 4), R('b', 4, 4), R('c', 4, 4)], [N('a', { harm: 1, peak: 1, hit: 1 }), N('b', { harm: 2, peak: 2, hit: 2 }), N('c', {})]);
  check('bath: not if one walked away clean', !t.awards.some(a => a.b === 'bath'));
  t = play([R('a', 4, 4), R('b', 4, 4)], [N('a', { harm: 1, peak: 1, hit: 1 }), N('b', { harm: 2, peak: 2, hit: 2 })]);
  check('bath: not with only two hunters', !t.awards.some(a => a.b === 'bath'));
  t = play(filler('a', 6).concat(filler('b', 6)));
  check('perfect: twelve rolls and no miss, everyone who rolled gets it', gets(t, 'a', 'perfect') && gets(t, 'b', 'perfect'));
  t = play(filler('a', 6).concat(filler('b', 5), [R('b', 1, 2)]));
  check('perfect: one miss anywhere and nobody does', !t.awards.some(a => a.b === 'perfect'));

  // ---- a night where nothing happens, and one where nobody came ----
  t = play([R('a', 4, 4), R('b', 4, 3)]);
  check('a quiet night hands out only what two rolls can: first, last, lowest and highest', JSON.stringify(t.awards.map(a => a.b + ':' + a.id).sort()) === JSON.stringify(['bottom:b', 'first:a', 'last:b', 'peak:a']), JSON.stringify(t.awards));
  t = play([], []);
  check('an empty session is an empty tally, not an error', t.rows.length === 0 && t.awards.length === 0 && t.table.rolls === 0);
  t = play([R('a', 4, 4)], [N('a', {}), N('z', {})]);
  check('someone who only had the page open is not on the scoreboard', t.rows.length === 1 && t.rows[0].id === 'a', t.rows.map(r => r.id).join());

  // ---- the scoreboard ----
  t = play([R('a', 6, 6, 1), R('a', 1, 1), R('a', 4, 4), R('b', 5, 5)], [N('a', { harm: 3, peak: 5, hit: 2, luck: 1, left: 4, lvl: 1 }), N('b', {})]);
  const ra = t.rows.find(r => r.id === 'a');
  check('a row counts rolls by result, the best and the worst, and carries harm, Luck and the name', ra.rolls === 3 && ra.full === 1 && ra.part === 1 && ra.miss === 1 && ra.best === 13 && ra.worst === 2 && ra.harm === 3 && ra.luck === 1 && ra.left === 4 && ra.name === 'Hunter a' && ra.who === 'Player a' && ra.playbook === 'The Mundane', JSON.stringify(ra));
  check('the table\'s totals add up, and the busiest hunter is first', t.table.rolls === 4 && t.table.miss === 1 && t.table.part === 1 && t.table.full === 2 && t.table.hunters === 2 && t.rows[0].id === 'a', JSON.stringify(t.table));
  check('a row does not carry the roll list out', !('list' in ra));
  check('nobody gets the same badge twice in one session', new Set(t.awards.map(a => a.b + a.id + a.hid)).size === t.awards.length);

  // ---- a session in parts ----
  seq = 0;
  const p1 = [R('a', 1, 2), R('a', 1, 2), R('b', 4, 4)], p2 = [R('a', 1, 3, 0, '', { p: 2 }), R('b', 5, 5, 0, '', { p: 2 })];
  const hs = [N('a', { harm: 2, peak: 2, hit: 2, luck: 1, left: 6 }), N('b', {}), N('a', { harm: 3, peak: 5, hit: 3, luck: 0, left: 6, unst: true }, { p: 2, at: 9 }), N('b', { lvl: 1 }, { p: 2, at: 9 })];
  t = play(p1.concat(p2), hs, { parts: [{ p: 1, started: 1, last: 2, note: 'At the well.' }, { p: 2, started: 10, last: 11 }] });
  const pa = t.rows.find(r => r.id === 'a');
  check('parts: a streak runs on from one night into the next', gets(t, 'a', 'cold'));
  check('parts: harm and Luck add up across nights, the worst hit is the worst of any night, and what is left is the last night\'s word', pa.harm === 5 && pa.luck === 1 && pa.left === 6 && pa.unst === true && gets(t, 'a', 'jaw') && gets(t, 'a', 'wounded'), JSON.stringify(pa));
  check('parts: each part keeps its own roll count and the Keeper\'s note', JSON.stringify(t.parts.map(p => [p.p, p.rolls, p.note])) === '[[1,3,"At the well."],[2,2,""]]', JSON.stringify(t.parts));
  check('parts: first is the first roll of the first night, last the last of the last', gets(t, 'a', 'first') && gets(t, 'b', 'last'));
  t = play(p1, hs.filter(h => h.p === 1), { parts: [{ p: 1, started: 1, last: 2 }] });
  check('parts: awarding only the first part leaves the second out', !gets(t, 'a', 'cold') && t.table.rolls === 3 && t.rows.find(r => r.id === 'a').harm === 2);

  // ---- one player, two hunters ----
  seq = 0;
  t = play([R('a', 1, 1), R('a', 4, 4, 0, '', { hid: 'second' }), R('b', 4, 4)], [N('a', { died: true, harm: 8, peak: 8, hit: 4 }), N('a', {}, { hid: 'second', name: 'The Replacement' })]);
  check('a player whose hunter dies and who brings another has two rows, each with their own badges', t.rows.filter(r => r.id === 'a').length === 2 && t.awards.some(a => a.b === 'buried' && a.hid === 'ha') && !t.awards.some(a => a.b === 'buried' && a.hid === 'second') && t.awards.some(a => a.b === 'snake' && a.hid === 'ha') && !t.awards.some(a => a.b === 'snake' && a.hid === 'second'), JSON.stringify(t.awards));

  // ---- the Keeper's picks ----
  seq = 0;
  const two = [R('a', 4, 4), R('b', 4, 4)];
  t = play(two, [], { picks: { carried: 'a/ha', idea: 'b/hb', quote: 'nobody/here', snake: 'a/ha', pet: 7, thorn: 'a/ha' } });
  check('a pick goes to the hunter the Keeper named', gets(t, 'a', 'carried') && gets(t, 'b', 'idea') && gets(t, 'a', 'thorn'));
  check('a pick for someone who was not there, a pick that is not a hunter, and a pick of a badge that is not the Keeper\'s are all ignored', !t.awards.some(a => a.b === 'quote' || a.b === 'pet' || a.b === 'snake'), JSON.stringify(t.awards));
  check('the scoreboard without awards hands out nothing, picks included', play(two.concat([R('a', 1, 1)]), [], { awards: false, picks: { carried: 'a/ha' } }).awards.length === 0);

  // ---- secrets found for the first time ----
  seq = 0;
  t = play([R('a', 6, 6, 1), R('b', 4, 4)], [], { found: [] });
  check('a secret earned for the first time at this table is marked as found', JSON.stringify(t.fresh) === '["thirteen"]', JSON.stringify(t.fresh));
  t = play([R('a', 6, 6, 1), R('b', 6, 6, 1)], [], { found: ['thirteen'] });
  check('once found it is not news again, and two hunters finding one secret is one find', t.fresh.length === 0 && play([R('a', 6, 6, 1), R('b', 6, 6, 1)]).fresh.length === 1);

  // ---- odd input does not throw ----
  let threw = '';
  try { A.tally({}); A.tally({ rolls: [{ seq: 1, p: 1, id: 'a', hid: 'h', d1: 3, d2: 3, mod: 0 }], hunters: [{ p: 1, id: 'a', hid: 'h', night: null }], picks: null }); A.tally({ n: 2, parts: null, rolls: null, hunters: null }); } catch (e) { threw = e.message; }
  check('missing pieces do not throw', threw === '', threw);

  console.log(results.map(r=>r.join(' | ')).join('\n'));
  const fails = results.filter(r=>r[0]==='FAIL').length;
  console.log('\nTOTAL', results.length, 'FAIL', fails);
  if (fails) process.exit(1);
})().catch(e=>{ console.log(results.map(r=>r.join(' | ')).join('\n')); console.log('CRASH', e.stack.split('\n').slice(0,6).join('\n')); process.exit(1); });
