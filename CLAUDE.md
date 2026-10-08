# Hunter's Journal: notes for Claude Code

Single-file vanilla JS app for a Monster of the Week campaign. Owner: Jacob, a first-time player. Audience: him and his table. Tone: plain English, gothic Appalachian field journal.

## Rules for working here
- `index.html` is the source of truth. Edit it directly. ES5 style (var, function, no modules, no build step). Keep it one file.
- Playbook content lives in `data/*.json` (schema in `data/SCHEMA.md`). After editing, run `python3 tools/embed_data.py`.
- Playbook moves and descriptions are plain-English paraphrase on purpose. Do not paste text from the official playbooks. Mechanical facts stay exact: ratings lines, harm/armor numbers, tags, thresholds, pick counts.
- No emoji. Avoid em dashes in user-facing copy. Keep copy friendly and beginner-oriented.
- Support light and dark themes (CSS tokens in `:root`, dark overrides under `prefers-color-scheme` and `[data-theme]`). Check 390px width: no horizontal page scroll.
- All images are optional; the page probes each one on load and works without them. Die grain (`img/die-<finish>.jpg`) and tray photos (`img/tray-<tray>.jpg`, leather is `img/tray.jpg`) are made from source photos by `python tools/make_textures.py <folder>`; the crop boxes live in that script.
- `sw.js` and `manifest.webmanifest` are the only other shipped files (offline copy and install). The page is fetched network-first, so a deploy shows up on the next online load. Bump `CACHE` in `sw.js` only to throw away old cached art.
- Ratings are parked per playbook (`S.sheet.pbs[name].stats`) by `setPlaybook()`; always change playbook through it.

## Architecture (all in index.html)
- State `S` (defaults in `defaults()`), merged with saved data by `merge(defaults(), saved)`. An empty-object base field takes the saved value wholesale. Saved to localStorage key `hunters-journal-v1` via `scheduleSave()` / `flush()`.
- `initStore()` also tries `window.claude` (db, user) for the claude.ai-hosted version. Outside claude.ai it falls back to localStorage. See docs/ROADMAP.md for replacing that with Supabase.
- Helpers: `$`, `$$`, `esc`, `clamp`, `fmt`, `getPath`/`setPath`, `uid`.
- Tabs: guide, play, roll, hunter, party, bestiary, tips, notes. Play (`renderPlay`) is the mid-session screen; the dice card `#rollkit` is moved between `#roll-home` and `#play-stage` by `showTab`, so roller ids stay unique. Hold from Investigate and Read a Bad Situation lives in `S.hold`.
- Hosting: `npm run build` writes `dist/` (page, worker, manifest, art). Deploy that folder, not the repo root.
- Hunter has two views: Build (the wizard) and My sheet.
- Wizard: `WSTEPS` (8 steps), `renderWiz`, per-playbook picks in `S.sheet.pbs[playbookName]` = {rating, look, moves, gear, build, extras, imp}.
- Picked roll moves sync into `S.sheet.custom` and picked gear into `S.sheet.inventory`, each tagged with a `pbk` field so removal cleans up. See `syncPbMoves`, `syncPbGear`, `onPlaybookChange`.
- Roller: `BYID` holds basic and custom moves; `renderStage` shows the result tier and the move `note`.
- Level up: `levelPanel` / `levelDone` use the playbook's `improvements` and `advanced` lists.
- Name generator: block between `/*NAMEGEN*/` and `/*END NAMEGEN*/` (Appalachian names, 1600s-1800s, with Soulsborne-style titles).
- History: builder step 7 and the "History and bonds" card on My sheet both edit `S.sheet.bonds` ({who, tie, note, theirs}). `note` is the history you picked for them, `theirs` is what they picked for you. Each playbook's list is `history` in its data file.
- Party card: `partyBody()` builds what is shared.
- Dice maker: `S.dice` (two dice, tray, saved sets), starter sets in `DICESETS` keyed by `pbSlug()`. `cubeHTML` styles each die through `curDie()` and `dieVars()`. Saved dice go through `cleanDie()` and dice codes (`HJD1.`) through the stricter `strictDie()` before anything reaches HTML or CSS; keep it that way.

## Tests
`npm install`, then `npm test`. `tests/t7.js` drives all 12 playbooks through the builder, gear, details, bonds, level-up and phone-width overflow in both themes (`node tests/t7.js chosen` runs one). `tests/t5.js` is the broader regression suite. `tests/t8.js` covers the dice maker. All three open `index.html` with Playwright and write screenshots to `tests/out/`.

## Next big task
Build from docs/SPEC.md, in its suggested order. The dice maker (feature 1) is built; next are dice sounds, Luck candles and the hunter card image. The shared table (docs/ROADMAP.md) comes after, and its backend choice is still open: see feature 8 in the spec.
