// Who is asking? Cloudflare Access signs a token for every request it lets through and puts it in the Cf-Access-Jwt-Assertion header.
// The Worker must check that token. The email header Access also sets is not enough on its own: other hostnames for the same Worker
// (preview URLs, for one) may sit outside the Access policy, and anyone can type an email into a header.
//
// This file has no Cloudflare-only imports, so tests/t22.js runs it in plain Node.

function b64urlBytes(s) {
  s = String(s).replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function b64urlJson(s) { return JSON.parse(new TextDecoder().decode(b64urlBytes(s))); }

let cache = { at: 0, jwks: null };
/* The team's public keys. ACCESS_JWKS (a JSON string) replaces the fetch, for tests and local runs only. */
async function loadJwks(env, now, fetchFn) {
  if (env.ACCESS_JWKS) return typeof env.ACCESS_JWKS === 'string' ? JSON.parse(env.ACCESS_JWKS) : env.ACCESS_JWKS;
  if (cache.jwks && now - cache.at < 36e5) return cache.jwks;
  const res = await fetchFn('https://' + env.ACCESS_TEAM + '.cloudflareaccess.com/cdn-cgi/access/certs');
  if (!res.ok) throw new Error('could not load the Access keys');
  cache = { at: now, jwks: await res.json() };
  return cache.jwks;
}

/* Returns { email } for a good token and null for anything else. Never throws. */
export async function verifyAccessJwt(token, env, now = Date.now(), fetchFn = fetch) {
  try {
    if (typeof token !== 'string' || token.length > 4096 || !env.ACCESS_TEAM || !env.ACCESS_AUD) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const header = b64urlJson(parts[0]);
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') return null;   // only the algorithm Access uses; never "none", never HS256
    const jwks = await loadJwks(env, now, fetchFn);
    const jwk = (jwks.keys || []).find((k) => k.kid === header.kid && k.kty === 'RSA');
    if (!jwk) return null;
    const key = await crypto.subtle.importKey('jwk', { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const good = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlBytes(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
    if (!good) return null;
    const p = b64urlJson(parts[1]);
    if (typeof p.exp !== 'number' || p.exp * 1000 <= now) return null;
    if (typeof p.nbf === 'number' && p.nbf * 1000 > now + 60000) return null;
    if (p.iss !== 'https://' + env.ACCESS_TEAM + '.cloudflareaccess.com') return null;
    const aud = Array.isArray(p.aud) ? p.aud : [p.aud];
    if (!aud.includes(env.ACCESS_AUD)) return null;
    if (typeof p.email !== 'string' || !/^[^\s@]+@[^\s@]+$/.test(p.email) || p.email.length > 200) return null;
    return { email: p.email.toLowerCase() };
  } catch (e) {
    return null;
  }
}

/* The signed-in person, or null. In local development only (DEV=1 in .dev.vars or --var), ?as=name or an x-dev-user header stands in for Access. */
export async function identify(request, env, now = Date.now(), fetchFn = fetch) {
  if (env.DEV === '1') {
    const as = new URL(request.url).searchParams.get('as') || request.headers.get('x-dev-user');
    if (as && /^[a-z0-9._+-]{1,40}(@[a-z0-9.-]{1,60})?$/i.test(as)) return { email: (as.includes('@') ? as : as + '@dev.test').toLowerCase(), dev: true };
  }
  const who = await verifyAccessJwt(request.headers.get('Cf-Access-Jwt-Assertion'), env, now, fetchFn);
  return who;
}

export function isKeeper(email, env) {
  return String(env.KEEPER_EMAILS || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean).includes(String(email).toLowerCase());
}
