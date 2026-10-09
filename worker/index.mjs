// The Worker in front of the table. Everything under /api/ is checked here (who is asking, and are they allowed) before it reaches the room.
// Everything else is the static site, which the assets setting serves without waking this Worker at all.
import { identify, isKeeper } from './access.mjs';
export { Table } from './table.mjs';

const fail = (status, error) => new Response(JSON.stringify({ error }), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS ? env.ASSETS.fetch(request) : fail(404, 'not found');
    const who = await identify(request, env);
    if (!who) return fail(401, 'sign-in needed');
    // The room trusts these two headers, so ours replace whatever the page sent.
    const headers = new Headers(request.headers);
    headers.delete('x-member-email'); headers.delete('x-member-keeper');
    headers.set('x-member-email', who.email);
    headers.set('x-member-keeper', isKeeper(who.email, env) ? '1' : '0');
    return env.TABLE.get(env.TABLE.idFromName('main')).fetch(new Request(request, { headers }));
  }
};
