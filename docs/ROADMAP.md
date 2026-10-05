# Roadmap: shared login and a live party table

## Why
Inside claude.ai the page saved to the viewer's account and shared a Party card through `window.claude` (db, user, sample, downloads). Outside claude.ai those are absent, so the app silently falls back to localStorage and the Party tab is empty. Goal: friends sign in on a hosted site and see each other's cards.

## Plan
1. Host: Vercel, Netlify or Cloudflare Pages from this private repo. GitHub Pages needs a paid plan for private repos (check before relying on it).
2. Backend: Supabase (Postgres + Auth + Realtime). Friends are NOT repo contributors; they sign in on the site.
3. Tables
   - `profiles(id uuid pk = auth.uid, name text)`
   - `journals(user_id uuid pk, data jsonb, updated_at)`: each player's full saved state. RLS: owner only.
   - `tables(id uuid pk, code text unique, owner uuid)` and `members(table_id, user_id)`.
   - `party_cards(table_id, user_id, card jsonb, updated_at)`: the shared card (what `partyBody()` returns). RLS: readable by members of that table, writable by its own user.
4. Replace in `index.html`:
   - `initStore()` / `flush()`: save to `journals` when signed in; keep localStorage as fallback and offline copy.
   - `renderParty()` / the share toggle: read and subscribe to `party_cards` for the joined table; publish this player's card from `partyBody()`.
   - Add a minimal sign-in (email magic link) and "Join a table with a code" UI.
5. The Cases tab's "ask Claude" helper used `window.claude.use('sample')`. Either hide it outside claude.ai (already the case) or add a serverless function that calls the Claude API.
6. Keep working offline at the table: localStorage stays the source of truth between syncs.

## Not in scope
Do not commit secrets. The Supabase anon key is fine in the client only when Row Level Security is on for every table.
