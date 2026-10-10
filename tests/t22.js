// The table's two locks, run in plain Node (no server): worker/access.mjs checks who is asking (a Cloudflare Access token), worker/clean.mjs cleans what a page sends.
// A real RSA key pair signs the good tokens; the bad ones are forged, expired, for another audience, signed with another key or algorithm, or garbage.
const path = require('path'), { pathToFileURL } = require('url');
const results = [];
function check(name, ok, extra){ results.push([ok?'PASS':'FAIL', name, extra===undefined?'':String(extra)]); }
const load = (f) => import(pathToFileURL(path.join(__dirname, '..', 'worker', f)).href);
const b64 = (bytes) => Buffer.from(bytes).toString('base64url');
const enc = (o) => b64(Buffer.from(JSON.stringify(o)));
const ALG = { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' };

(async () => {
  const A = await load('access.mjs'), C = await load('clean.mjs');
  const pair = await crypto.subtle.generateKey(ALG, true, ['sign', 'verify']), other = await crypto.subtle.generateKey(ALG, true, ['sign', 'verify']);
  const pub = await crypto.subtle.exportKey('jwk', pair.publicKey);
  const env = { ACCESS_TEAM: 'friends', ACCESS_AUD: 'aud123', ACCESS_JWKS: JSON.stringify({ keys: [{ ...pub, kid: 'k1', alg: 'RS256', use: 'sig' }] }) };
  const NOW = 1_800_000_000_000, sec = NOW / 1000;
  const sign = async (payload, header = { alg: 'RS256', kid: 'k1', typ: 'JWT' }, key = pair.privateKey) => {
    const body = enc(header) + '.' + enc(payload);
    return body + '.' + b64(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, Buffer.from(body)));
  };
  const good = { iss: 'https://friends.cloudflareaccess.com', aud: ['aud123'], email: 'Jacob@Example.com', exp: sec + 3600, iat: sec - 10, nbf: sec - 10 };
  const v = (t, e = env, n = NOW, f) => A.verifyAccessJwt(t, e, n, f);

  // ---- tokens ----
  check('a good token gives the email, in lower case', JSON.stringify(await v(await sign(good))) === '{"email":"jacob@example.com"}');
  check('an audience that is a plain string works too', (await v(await sign({ ...good, aud: 'aud123' }))) !== null);
  check('another audience is refused', (await v(await sign({ ...good, aud: ['someone-else'] }))) === null);
  check('an expired token is refused', (await v(await sign({ ...good, exp: sec - 1 }))) === null);
  check('a token with no expiry is refused', (await v(await sign({ ...good, exp: undefined }))) === null);
  check('a token that starts far in the future is refused', (await v(await sign({ ...good, nbf: sec + 3600 }))) === null);
  check('a little clock drift is allowed', (await v(await sign({ ...good, nbf: sec + 30 }))) !== null);
  check('another issuer is refused', (await v(await sign({ ...good, iss: 'https://evil.cloudflareaccess.com' }))) === null);
  check('signed with a different key under the same name is refused', (await v(await sign(good, undefined, other.privateKey))) === null);
  const real = await sign(good), [h, , sg] = real.split('.');
  check('the payload changed after signing is refused', (await v(h + '.' + enc({ ...good, email: 'attacker@example.com' }) + '.' + sg)) === null);
  check('an unsigned token (alg none) is refused', (await v(enc({ alg: 'none', kid: 'k1' }) + '.' + enc(good) + '.')) === null && (await v(enc({ alg: 'none', kid: 'k1' }) + '.' + enc(good) + '.' + sg)) === null);
  check('an HS256 token is refused, so the public key cannot be used as a secret', (await v(await sign(good, { alg: 'HS256', kid: 'k1' }))) === null);
  check('an unknown key id is refused', (await v(await sign(good, { alg: 'RS256', kid: 'nope' }))) === null);
  check('a missing key id is refused', (await v(await sign(good, { alg: 'RS256' }))) === null);
  check('no email, or something that is not an email, is refused', (await v(await sign({ ...good, email: undefined }))) === null && (await v(await sign({ ...good, email: 'not an email' }))) === null && (await v(await sign({ ...good, email: 42 }))) === null);
  for (const junk of ['', 'a', 'a.b', 'a.b.c', '...', null, undefined, 42, {}, 'x'.repeat(5000), enc({ alg: 'RS256', kid: 'k1' }) + '.%%%.%%%']) {
    let r = 'threw'; try { r = await v(junk); } catch (e) { /* stays "threw" */ }
    if (r !== null) check('junk token refused without throwing: ' + String(junk).slice(0, 20), false, r);
  }
  check('twelve kinds of junk are refused without throwing', true);
  check('with no team or audience set it refuses everything (fails closed)', (await v(await sign(good), { ACCESS_JWKS: env.ACCESS_JWKS })) === null && (await v(await sign(good), { ...env, ACCESS_AUD: '' })) === null);

  // ---- fetching the team's keys ----
  const live = { ACCESS_TEAM: 'friends', ACCESS_AUD: 'aud123' };
  let calls = [];
  const fakeFetch = async (u) => { calls.push(u); return { ok: true, json: async () => JSON.parse(env.ACCESS_JWKS) }; };
  check('without a supplied key set it fetches from the team address', (await v(await sign(good), live, NOW, fakeFetch)) !== null && calls[0] === 'https://friends.cloudflareaccess.com/cdn-cgi/access/certs', calls.join());
  await v(await sign(good), live, NOW + 1000, fakeFetch);
  check('and keeps the keys for an hour', calls.length === 1, calls.length);
  await v(await sign({ ...good, exp: sec + 99999 }), live, NOW + 3700e3, fakeFetch);
  check('then fetches again', calls.length === 2, calls.length);

  // ---- who is asking ----
  const req = (u, hd = {}) => new Request('https://x.test' + u, { headers: hd });
  check('local development: ?as=alice stands in for Access', JSON.stringify(await A.identify(req('/api/me?as=alice'), { DEV: '1' })) === '{"email":"alice@dev.test","dev":true}');
  check('local development: so does an x-dev-user header', (await A.identify(req('/api/me', { 'x-dev-user': 'bob' }), { DEV: '1' })).email === 'bob@dev.test');
  check('WITHOUT DEV set, ?as=alice and the header do nothing', (await A.identify(req('/api/me?as=alice', { 'x-dev-user': 'alice' }), {})) === null && (await A.identify(req('/api/me?as=alice'), { DEV: '0' })) === null && (await A.identify(req('/api/me?as=alice'), { DEV: 'true' })) === null);
  check('a typed email header is not trusted', (await A.identify(req('/api/me', { 'Cf-Access-Authenticated-User-Email': 'jacob@example.com' }), env)) === null);
  check('a good Access token is', (await A.identify(req('/api/me', { 'Cf-Access-Jwt-Assertion': await sign({ ...good, exp: Date.now() / 1000 + 3600, nbf: Date.now() / 1000 - 5 }) }), env, Date.now())).email === 'jacob@example.com');
  check('odd dev names are not accepted', (await A.identify(req('/api/me?as=' + encodeURIComponent('a b<script>')), { DEV: '1' })) === null);
  check('Keeper is decided by the server list, case and spaces aside', A.isKeeper('Jacob@Example.com', { KEEPER_EMAILS: ' kay@example.com , jacob@example.com ' }) && !A.isKeeper('jacob@example.com', { KEEPER_EMAILS: '' }) && !A.isKeeper('jacob@example.com', {}) && !A.isKeeper('x@example.com', { KEEPER_EMAILS: 'jacob@example.com' }));

  // ---- cleaning what a page sends ----
  const card = C.cleanCard({ name: 'Dee\u0000 Ray\n', pronouns: 'she/her', playbook: 'The Mundane', catchline: 'x'.repeat(500), look: 'y', photo: 'data:image/jpeg;base64,AAAA', stats: { charm: 99, cool: -99, sharp: 'x', tough: 2.6, weird: null }, luck: 99, harm: -4, unstable: 'yes', xp: 1e9, level: NaN, armor: 5, weapons: new Array(20).fill('Axe'), moves: ['A', '', 7, 'B'], extra: 'dropped', __proto__x: 1 });
  check('card: control characters become spaces, long text is cut', card.name === 'Dee  Ray' && card.catchline.length === 200, JSON.stringify(card.name));
  check('card: numbers are clamped', card.stats.charm === 5 && card.stats.cool === -3 && card.stats.sharp === 0 && card.stats.tough === 3 && card.stats.weird === 0 && card.luck === 7 && card.harm === 0 && card.xp === 9 && card.level === 0, JSON.stringify(card.stats));
  check('card: unstable is true only for true', card.unstable === false && C.cleanCard({ unstable: true }).unstable === true);
  check('card: lists are cut and emptied of junk', card.weapons.length === 6 && card.moves.join() === 'A,B' && !('extra' in card));
  check('card: a small JPEG data URL is kept', card.photo === 'data:image/jpeg;base64,AAAA');
  check('card: other photos are dropped (a link, an SVG, a script, too big)', ['https://evil.test/x.jpg', 'data:image/svg+xml;base64,AAAA', 'data:text/html;base64,AAAA', 'javascript:alert(1)', 'data:image/jpeg;base64,' + 'A'.repeat(48001)].every((p) => C.cleanCard({ photo: p }).photo === ''));
  check('card: things that are not objects are refused', [null, undefined, 'a', 5, [], [1]].every((x) => C.cleanCard(x) === null));
  const hostile = JSON.parse('{"__proto__": {"polluted": 1}, "constructor": {"prototype": {"polluted": 2}}, "name": "x", "stats": {"__proto__": {"polluted": 3}}}');
  const clean = C.cleanCard(hostile);
  check('card: prototype tricks do nothing', ({}).polluted === undefined && clean.polluted === undefined && Object.keys(clean).join() === 'name,pronouns,playbook,catchline,look,photo,stats,luck,harm,unstable,xp,level,armor,weapons,moves,hid,pins,pinn,career,page');
  // which hunter, and the badges they pin
  const pinned = C.cleanCard({ name: 'x', hid: 'cmg1abc9zz', pins: ['snake', 'snake', 'nope', 7, '<b>', 'hog', 'bag', 'arm', 'peak', 'first', 'alive'] });
  check('card: the hunter\'s id is kept when it looks like one, and dropped when it does not', pinned.hid === 'cmg1abc9zz' && ['', 'ab', 'UPPERCASE1', 'has space1', '<script>x', 'x'.repeat(21), 7, null].every((h) => C.cleanCard({ hid: h }).hid === ''));
  check('card: pins are badges from the list, each once, five at most', JSON.stringify(pinned.pins) === '["snake","hog","bag","arm","peak"]' && C.cleanCard({ pins: 'snake' }).pins.length === 0 && C.cleanCard({ pins: ['constructor', '__proto__', 'toString'] }).pins.length === 0, JSON.stringify(pinned.pins));
  const dice = { a: { body: '#AABBCC', pip: '#102030', finish: 'bone"><script>', sigil: 'skull', glow: true }, b: { body: '#aabbcc', pip: '#102030', finish: 'resin', sigil: '', glow: 'yes' }, tray: 'wood' };
  const cd = C.cleanDice(dice);
  check('dice: colors lower-cased, names reduced to plain words, glow only for true', cd.a.body === '#aabbcc' && cd.a.finish === 'bonescript' && cd.b.glow === false && cd.tray === 'wood', JSON.stringify(cd.a));
  check('dice: a bad color or a missing die is refused', C.cleanDice({ ...dice, a: { ...dice.a, body: 'red' } }) === null && C.cleanDice({ ...dice, a: { ...dice.a, pip: 'url(x)' } }) === null && C.cleanDice({ a: dice.a }) === null && C.cleanDice('x') === null);
  const roll = C.cleanRoll({ move: 'Kick Some Ass', d1: 4, d2: 3, mod: 2, total: 9, tier: 'part', luck: false, dice });
  check('roll: a good one is kept, with its dice', roll.total === 9 && roll.tier === 'part' && roll.dice.a.body === '#aabbcc');
  check('roll: dice that are not real faces are refused', [{ d1: 0, d2: 3 }, { d1: 4, d2: 7 }, { d1: 4, d2: 2.5 }, { d1: '4', d2: 3 }, { d1: 4 }, {}, null, 'x', []].every((r) => C.cleanRoll(r) === null));
  const counted = C.cleanRoll({ d1: 4, d2: 3, mod: 2, hid: 'cmg1abc9zz', mv: 'kick', hm: 5 }), loose = C.cleanRoll({ d1: 4, d2: 3, hid: '../etc', mv: 'drop table', hm: 99 }), bare = C.cleanRoll({ d1: 4, d2: 3 });
  check('roll: the hunter, the basic move and the harm carried are kept for the session\'s count', counted.hid === 'cmg1abc9zz' && counted.mv === 'kick' && counted.hm === 5);
  check('roll: a hunter id that is not one, a move that is not one of the eight, and harm past 8 are put right', loose.hid === '' && loose.mv === '' && loose.hm === 8 && bare.hid === '' && bare.mv === '' && bare.hm === 0, JSON.stringify(loose));
  // a hunter's own numbers for the night
  const night = C.cleanNight({ k: '3.2', hid: 'cmg1abc9zz', harm: '4', peak: 12, hit: -3, luck: 2.4, left: 99, lvl: 'x', unst: 1, died: true, extra: '<b>' });
  check('night: numbers are clamped, flags are true only for true, and nothing extra gets through', JSON.stringify(night) === '{"k":"3.2","hid":"cmg1abc9zz","harm":4,"peak":8,"hit":0,"luck":2,"left":7,"lvl":0,"unst":false,"died":true}', JSON.stringify(night));
  check('night: without a session and part, or without a hunter, there is nothing to keep', [{ hid: 'cmg1abc9zz' }, { k: '3', hid: 'cmg1abc9zz' }, { k: '3.2' }, { k: '3.2; DROP', hid: 'cmg1abc9zz' }, { k: 3.2, hid: 'cmg1abc9zz' }, null, 'x', []].every((n) => C.cleanNight(n) === null));
  check('session: a name is one short line, and the note on where the table left off keeps its lines', C.cleanTitle('  The   Dry\n Well\u0000 ') === 'The Dry Well' && C.cleanTitle('x'.repeat(200)).length === 60 && C.cleanTitle(7) === '' && C.cleanNote('At the well.\r\n\r\nMoss is hurt.\u0007') === 'At the well.\n\nMoss is hurt.' && C.cleanNote('y'.repeat(900)).length === 600);
  const lie = C.cleanRoll({ d1: 1, d2: 2, mod: 0, total: 12, tier: 'full', luck: false });
  check('roll: the total and tier are worked out here, not believed', lie.total === 3 && lie.tier === 'miss' && C.cleanRoll({ d1: 4, d2: 3, mod: 2, total: 1, tier: 'miss' }).tier === 'part' && C.cleanRoll({ d1: 6, d2: 5, mod: 0 }).tier === 'full');
  check('roll: Luck makes it a 12 whatever the dice say', C.cleanRoll({ d1: 1, d2: 1, mod: 0, luck: true }).total === 12 && C.cleanRoll({ d1: 1, d2: 1, mod: 0, luck: true }).tier === 'full');
  check('roll: the modifier is clamped and luck is a plain true', C.cleanRoll({ d1: 6, d2: 6, mod: 500 }).mod === 15 && C.cleanRoll({ d1: 6, d2: 6, mod: -500 }).total === 12 - 15 + 0 && C.cleanRoll({ d1: 3, d2: 3, luck: 1 }).luck === false);
  const jpg = new Uint8Array(100); jpg.set([0xff, 0xd8, 0xff, 0xe0]);
  const webp = new Uint8Array(100); webp.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  const png = new Uint8Array(100); png.set([0x89, 0x50, 0x4e, 0x47]);
  const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>');
  check('pictures: JPEG and WebP are known by their first bytes', C.imageType(jpg) === 'image/jpeg' && C.imageType(webp) === 'image/webp');
  check('pictures: PNG, SVG, text, empty and too-short are not', [png, svg, new Uint8Array(0), new Uint8Array(5), null].every((b) => C.imageType(b) === null));
  const big = new Uint8Array(C.LIMITS.image + 1); big.set([0xff, 0xd8, 0xff]);
  check('pictures: one byte over the cap is refused, at the cap is fine', C.imageType(big) === null && C.imageType(big.subarray(0, C.LIMITS.image)) === 'image/jpeg');

  // ---- a hunter's page, and the art locker ----
  const realPng = new Uint8Array(100); realPng.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  check('art: a locker picture may be a PNG as well, by all eight of its first bytes; an SVG or a short file still may not', C.artType(realPng) === 'image/png' && C.artType(jpg) === 'image/jpeg' && C.artType(webp) === 'image/webp' && [png, svg, new Uint8Array(5), null].every((b) => C.artType(b) === null));
  check('art: a picture id is eighteen hex characters and nothing else', C.artId('0123456789abcdef01') === '0123456789abcdef01' && ['', '0123456789ABCDEF01', '../0123456789abcdef', '0123456789abcdef012', 7, null, ['0123456789abcdef01']].every((v) => C.artId(v) === ''));
  const pg = C.cleanPage({ mark: 'sk<ull"', epithet: '  <b>the Late</b>' + 'x'.repeat(80), frame: 'wan ted;', col: 'url(x)', bg: '../own', dim: 1e9, blur: -3, fw: 'wide', about: 'one\r\ntwo' + 'y'.repeat(900), cases: ['about', 'about', '<i>', 7, 'dice', 'a', 'b', 'c', 'd', 'e', 'f'],
    sig: { weapon: 'Axe\n', move: 9, extra: 'x' }, art: { bg: '0123456789abcdef01', frame: 'https://evil.test/a.png', pframe: null, gal: ['0123456789abcdef02', '0123456789abcdef02', 'zz', '0123456789abcdef03', '0123456789abcdef04', '0123456789abcdef05'] }, style: 'color:red', html: '<script>' });
  check('page: names are cut to plain words, so nothing can carry CSS or markup', pg.mark === 'skull' && pg.frame === 'wanted' && pg.col === 'urlx' && pg.bg === 'own' && pg.style === undefined && pg.html === undefined, JSON.stringify([pg.mark, pg.frame, pg.col, pg.bg]));
  check('page: numbers are clamped, text is cut, and only About keeps its line breaks', pg.dim === 90 && pg.blur === 0 && pg.fw === 18 && pg.epithet.length <= 40 && pg.about.length === 400 && pg.about.slice(0, 7) === 'one\ntwo' && pg.sig.weapon === 'Axe' && pg.sig.move === '' && Object.keys(pg.sig).join() === 'weapon,move,bond', JSON.stringify([pg.dim, pg.blur, pg.fw, pg.about.slice(0, 9)]));
  check('page: showcases are short words, each once, eight at most', pg.cases.join() === 'about,i,dice,a,b,c', pg.cases.join());
  check('page: pictures are ids only, three in the gallery at most', pg.art.bg === '0123456789abcdef01' && pg.art.frame === '' && pg.art.pframe === '' && pg.art.gal.join() === '0123456789abcdef02,0123456789abcdef03,0123456789abcdef04' && C.pageArt(pg).length === 4, JSON.stringify(pg.art));
  check('page: a card with no page, or one that is not an object, has none', [undefined, null, 'x', 7, []].every((v) => C.cleanCard({ name: 'x', page: v }).page === null) && C.pageArt(null).length === 0);
  const withPage = C.cleanCard({ name: 'x', pins: ['snake', 'hog'], pinn: [3, 1e9, 4, 5, 6, 7, 8], career: { sessions: 4, rolls: -2, misses: 'x', harm: 1e12 }, page: {} });
  check('card: pin counts and the career are numbers in range', withPage.pinn.join() === '3,999,4,5,6' && withPage.career.sessions === 4 && withPage.career.rolls === 0 && withPage.career.misses === 0 && withPage.career.harm === 1e7 && withPage.career.lvls === 0 && withPage.page.cases.length === 0, JSON.stringify([withPage.pinn, withPage.career]));
  check('names: tidied, cut to 30, and the fallback is used when nothing is left', C.cleanName('  Dee \n\t Ray  ') === 'Dee Ray' && C.cleanName('x'.repeat(100)).length === 30 && C.cleanName('\u0000\u0001', 'Player 1a2b') === 'Player 1a2b' && C.cleanName(42, 'F') === 'F');

  // what the Keeper posts
  const ho = C.cleanHandout({ title: '  The <b>gate</b>  ', kind: 'place', body: 'One\r\nTwo\rThree\n\n\n\n\n\nFour' + String.fromCharCode(7) + 'bell', images: [{ id: 'a'.repeat(18), alt: ' rust ' }, { id: 'A'.repeat(18) }, { id: 'b'.repeat(17) }, 'x', null, { id: 'c'.repeat(18), alt: 5 }], shown: true, pinned: true, id: 'mine', evil: 1 });
  check('handout: known keys only; shown, pinned and id are for the room to set, not the page', Object.keys(ho).sort().join() === 'body,images,kind,title');
  check('handout: the title is trimmed and markup stays plain text for the page to escape', ho.title === 'The <b>gate</b>' && ho.kind === 'place');
  check('handout: line breaks are kept (and tidied), other control characters are not', ho.body === 'One\nTwo\nThree\n\n\nFour bell', JSON.stringify(ho.body));
  check('handout: only well-formed picture ids are kept, with a description each', ho.images.length === 2 && ho.images[0].id === 'a'.repeat(18) && ho.images[0].alt === 'rust' && ho.images[1].id === 'c'.repeat(18) && ho.images[1].alt === '');
  const fat = C.cleanHandout({ title: 't'.repeat(200), kind: 'spell', body: 'b'.repeat(9000), images: Array.from({ length: 9 }, () => ({ id: 'd'.repeat(18), alt: 'a'.repeat(900) })) });
  check('handout: clamped to 80, 4,000, three pictures and 200; an unknown kind is a note', fat.title.length === 80 && fat.body.length === 4000 && fat.images.length === 3 && fat.images[0].alt.length === 200 && fat.kind === 'note');
  check('handout: an empty one, or something that is not one, is refused', [{}, { title: '   ', body: '\n\n' }, null, 'x', [], 7].every((h) => C.cleanHandout(h) === null));
  check('handout: a title is not needed if there are words or a picture', C.cleanHandout({ body: 'hello' }).title === 'Untitled' && C.cleanHandout({ images: [{ id: 'e'.repeat(18) }] }).images.length === 1);
  // the sign-in can arrive as the cookie Access sets in the browser, checked exactly like the header
  const tok = await sign(good);
  const cookieReq = (headers) => new Request('https://table.example/api/me', { headers });
  check('sign-in: the Access cookie is accepted when it holds a good token', ((await A.identify(cookieReq({ cookie: 'theme=dark; CF_Authorization=' + tok + '; other=1' }), env, NOW)) || {}).email === 'jacob@example.com');
  check('sign-in: a cookie with a forged token is refused', (await A.identify(cookieReq({ cookie: 'CF_Authorization=' + (await sign(good, undefined, other.privateKey)) }), env, NOW)) === null && (await A.identify(cookieReq({ cookie: 'CF_Authorization=garbage' }), env, NOW)) === null && (await A.identify(cookieReq({}), env, NOW)) === null);

  console.log(results.map(r=>r.join(' | ')).join('\n'));
  const fails = results.filter(r=>r[0]==='FAIL').length;
  console.log('\nTOTAL', results.length, 'FAIL', fails);
  if (fails) process.exit(1);
})().catch(e=>{ console.log(results.map(r=>r.join(' | ')).join('\n')); console.log('CRASH', e.stack.split('\n').slice(0,6).join('\n')); process.exit(1); });
