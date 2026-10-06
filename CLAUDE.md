# Hunter's Journal: notes for Claude Code

Single-file vanilla JS app for a Monster of the Week campaign. Owner: Jacob, a first-time player. Audience: him and his table. Tone: plain English, gothic Appalachian field journal.

## Rules for working here
- `index.html` is the source of truth. Edit it directly. ES5 style (var, function, no modules, no build step). Keep it one file.
- Playbook content lives in `data/*.json` (schema in `data/SCHEMA.md`). After editing, run `python3 tools/embed_data.py`.
- Playbook moves and descriptions are plain-English paraphrase on purpose. Do not paste text from the official playbooks. Mechanical facts stay exact: ratings lines, harm/armor numbers, tags, thresholds, pick counts.
- No emoji. Avoid em dashes in user-facing copy. Keep copy friendly and beginner-oriented.
- Support light and dark themes (CSS tokens in `:root`, dark overrides under `prefers-color-scheme` and `[data-theme]`). Check 390px width: no horizontal page scroll.
- All images are optional; the page probes each one on load and works without them.
- `sw.js` and `manifest.webmanifest` are the only other shipped files (offline copy and install). The page is fetched network-first, so a deploy shows up on the next online load. Bump `CACHE` in `sw.js` only to throw away old cached art.
- Ratings are parked per playbook (`S.sheet.pbs[name].stats`) by `setPlaybook()`; always change playbook through it.

## Architecture (all in index.html)
- State `S` (defaults in `defaults()`), merged with saved data by `merge(defaults(), saved)`. An empty-object base field takes the saved value wholesale. Saved to localStorage key `hunters-journal-v1` via `scheduleSave()` / `flush()`.
- `initStore()` also tries `window.claude` (db, user) for the claude.ai-hosted version. Outside claude.ai it falls back to localStorage. See docs/ROADMAP.md for replacing that with Supabase.
- Helpers: `$`, `$$`, `esc`, `clamp`, `fmt`, `getPath`/`setPath`, `uid`.
- Tabs: guide, roll, hunter, party, bestiary, tips, notes. Hunter has two views: Build (the wizard) and My sheet.
- Wizard: `WSTEPS` (8 steps), `renderWiz`, per-playbook picks in `S.sheet.pbs[playbookName]` = {rating, look, moves, gear, build, extras, imp}.
- Picked roll moves sync into `S.sheet.custom` and picked gear into `S.sheet.inventory`, each tagged with a `pbk` field so removal cleans up. See `syncPbMoves`, `syncPbGear`, `onPlaybookChange`.
- Roller: `BYID` holds basic and custom moves; `renderStage` shows the result tier and the move `note`.
- Level up: `levelPanel` / `levelDone` use the playbook's `improvements` and `advanced` lists.
- Name generator: block between `/*NAMEGEN*/` and `/*END NAMEGEN*/` (Appalachian names, 1600s-1800s, with Soulsborne-style titles).
- Party card: `partyBody()` builds what is shared.

## Tests
`npm install`, then `npm test`. `tests/t7.js` drives all 12 playbooks through the builder, gear, details, bonds, level-up and phone-width overflow in both themes (`node tests/t7.js chosen` runs one). `tests/t5.js` is the broader regression suite. Both open `index.html` with Playwright and write screenshots to `tests/out/`.

## Next big task
Shared login and live party table: see docs/ROADMAP.md.
