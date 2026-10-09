# Hunter's Journal: notes for Claude Code

A vanilla JS companion app for a Monster of the Week campaign, almost all of it in one file. Owner: Jacob, a first-time player. Audience: him and his table, who play online. Tone: plain English. The app is styled as a gothic Appalachian field journal; the campaign itself ("The Long Dry") is a post-apocalyptic wasteland, and how far to retheme is Jacob's open decision (docs/TODO.md).

## Rules for working here
- `index.html` is the source of truth. Edit it directly. ES5 style (var, function, no modules, no build step). Keep it one file.
- Playbook content lives in `data/*.json` (schema in `data/SCHEMA.md`). After editing, run `python3 tools/embed_data.py`.
- Playbook moves and descriptions are plain-English paraphrase on purpose. Do not paste text from the official playbooks. Mechanical facts stay exact: ratings lines, harm/armor numbers, tags, thresholds, pick counts.
- No emoji. Avoid em dashes in user-facing copy. Keep copy friendly and beginner-oriented.
- Support light and dark themes (CSS tokens in `:root`, dark overrides under `prefers-color-scheme` and `[data-theme]`). Check 390px width: no horizontal page scroll.
- Everything outside `index.html` is optional at run time. The page probes each image, sound and script it wants and works without any of them. Keep it that way.
- Ratings are parked per playbook (`S.sheet.pbs[name].stats`) by `setPlaybook()`; always change playbook through it.
- Pushing `main` deploys the site. Other branches do not. docs/TODO.md says which branch holds what.
- When writing JavaScript with the Write tool, do not use `\uXXXX` escapes: they are turned into the literal characters in the file (a `\u0027` became an apostrophe inside a string, and `\u2028` in a regex broke the script). Use `String.fromCharCode`, a char-code check, or the other quote style. If a shell command with quotes inside heredocs misbehaves, write the script to a file and run that.
- The stylesheet is one big block, so check a class name is free before using it (`grep -n "\.name" index.html`). A new `.hbar` was silently clipped by the health bar's existing `.hbar` rule (12px high, hidden overflow); the text was in the page, so text checks passed and only a screenshot showed it. Look at new UI in a screenshot, and check that new cards are not cut off, not just that their text exists.

## Files besides index.html
- `sw.js`, `manifest.webmanifest`: offline copy and install. The page is fetched network-first, so a deploy shows up on the next online load. Bump `CACHE` in `sw.js` only to throw away old cached art.
- `sigils.js`: the generated sigil library, loaded by a plain script tag before the page's own script.
- `worker/`: the shared table's Cloudflare Worker and Durable Object, as plain ES modules (`.mjs`, so Node can load them in tests). `access.mjs` checks the Cloudflare Access token (never trust the email header alone), `clean.mjs` cleans everything a page sends (known keys, clamped numbers, cut strings, JPEG or WebP by first bytes), `table.mjs` is the room (SQLite storage, hibernating WebSockets, the last 50 rolls, the Keeper's pictures, rate limits), and `index.mjs` is the front door. Its own config is `worker/wrangler.jsonc`; the root `wrangler.jsonc` is what deploys the live site and is untouched. Run it with `npm run build` then `npx wrangler dev --config worker/wrangler.jsonc --var DEV:1` (DEV:1 lets `?as=name` stand in for Access on your own machine; never set it on a deployed Worker). Local secrets go in `.dev.vars`, which git ignores. Worker code may use modern JavaScript; the one-file ES5 rule is for the page.
- `vendor/`: three.js 0.170 (the last single-file build) and its HDR loader for the optional 3D dice, with their licenses and the Noto font license.
- `img/`: art, die and tray textures, lighting environments. `snd/`: dice recordings (read `snd/README.md`).
- `tools/`: scripts that make the generated files. `tests/`: Playwright checks. `docs/`: SPEC, ROADMAP, TODO.
- Hosting: `npm run build` copies what the site needs into `dist/`. Deploy that folder, not the repo root.

## Architecture (all in index.html)
- State `S` (defaults in `defaults()`), merged with saved data by `merge(defaults(), saved)`, which keeps only keys that `defaults()` has. An empty-object base field takes the saved value wholesale. Saved to localStorage key `hunters-journal-v1` via `scheduleSave()` / `flush()`.
- `initStore()` also tries `window.claude` (db, user) for a claude.ai-hosted copy. Elsewhere it falls back to localStorage. See docs/ROADMAP.md for replacing that with a shared backend.
- Helpers: `$`, `$$`, `esc`, `clamp`, `fmt`, `getPath`/`setPath`, `uid`.
- Tabs: guide, play, roll, hunter, party, bestiary, tips, notes. Play (`renderPlay`) is the mid-session screen; the dice card `#rollkit` is moved between `#roll-home` and `#play-stage` by `showTab`, so roller ids stay unique. Hold from Investigate and Read a Bad Situation lives in `S.hold`.
- Hunter has two views: Build (the wizard) and My sheet.
- Wizard: `WSTEPS` (8 steps), `renderWiz`, per-playbook picks in `S.sheet.pbs[playbookName]` = {rating, look, moves, gear, build, extras, imp, skill}.
- Picked roll moves sync into `S.sheet.custom` and picked gear into `S.sheet.inventory`, each tagged with a `pbk` field so removal cleans up. See `syncPbMoves`, `syncPbGear`, `onPlaybookChange`.
- Roller: `BYID` holds basic and custom moves; `renderStage` shows the result tier and the move `note`.
- Level up: `levelPanel` / `levelDone` use the playbook's `improvements` and `advanced` lists. An improvement of kind `advance` opens `advPanel()`, which asks which two moves become advanced and records them in `S.sheet.adv` (by move id). The Roller's Advanced box and the 12+ result in `renderStage` read the same map.
- First night: `renderStart()` draws the "Start here" card at the top of the Guide (build a hunter, try a roll, download a backup) until it is hidden (`S.start`). `bkNudge()` is the "download a backup" line shown on the builder's Review step and after a case's session XP is added; every backup goes through `bkSave()`, which stamps `S.bkAt`. On Play, the "I want to..." lookup (`WANTS`, `wantList()`) picks the move for a plain-English aim.
- Hunter card: `hcOpen()` shows a 1200 x 630 picture of the hunter in the `#hcdlg` dialog and `hcDraw()` paints it on a canvas, always in the dark colors, from `partyBody()`. Text goes through `hcT()`, which records each piece and the width it was allowed in `window.__card.boxes` so tests can check nothing spills.
- Names and catchphrases: the block between `/*NAMEGEN*/` and `/*END NAMEGEN*/` holds six worlds in `NMF` (`appal`, `waste`, `retro`, `bayou`, `frontier`, `metro`), each with first names, surnames, titles, nicknames, whole funny names, epithets, deeds and roles, weighted by `NMW`. `genName(register, world)` makes one name in the register `plain`, `funny` or `epic`, and `genNames(6)` always deals a mix of all three. The original Appalachian patterns live on as `nmClassic`. Names are original and invented in the spirit of Mad Max, Fallout, Hunt: Showdown, Old Gods of Appalachia and similar worlds; do not add names borrowed from a story. `CATCHES` is the six lines shown first and `CATCHX` the pool behind More ideas (`pickCatches`, `wizCatch`). tests/t23.js pins the rules: ASCII only, no repeats, short enough for a card.
- History: builder step 7 and the "History and bonds" card on My sheet both edit `S.sheet.bonds` ({who, tie, note, theirs}). `note` is the history you picked for them, `theirs` is what they picked for you. Each playbook's list is `history` in its data file.
- Party card: `partyBody()` builds what is shared.
- Luck candles: `luckPips()` draws the seven Luck buttons as inline SVG candles on My sheet (`#luck`) and Play (`#pl-luck`), each from its own row in `CANDLES`. The gradients they share are in the `svg.cdefs` block at the top of the body, and the colors that differ by theme are the `--cw-*` tokens. Change Luck through `setLuck()` so the spent candle plays its snuff. The flame and smoke are `img/candle-flame.png` and `img/candle-smoke.png` when those are there, and are drawn when not. The flame picture is a strip of 16 frames that the `cframes` keyframes step through; the frame count and size are written in both the page and `tools/make_candles.py`.
- Session timeline and undo: `S.session` = { started, events }, newest first, capped at 200. `evTrack()` runs from `scheduleSave()` and compares harm, Unstable, Luck, XP, hold and level with a snapshot (`evSnap`), so every control that changes one leaves a line without calling anything. A control that has a reason calls `evSay(why, noUndo)` just before it saves. Changes to the same field within five seconds merge into one line. Rolls are added by `finish()` in `doRoll` (`evRoll`). An event with an `f` record can be undone while every field still holds its `to` value (`evCanUndo`, `evUndo`); level-ups, Mark XP, Spend Luck on a roll and hold questions are logged with `nu: true` and have no Undo. After code that replaces the whole save (`S = merge(...)`), call `evBase()` so the swap is not logged. The same card (`#hist`) is "This session" on Play and "Recent rolls" on the Roller (`S.rolls` is still written).
- End of session: `rit` (not saved) drives a panel that `renderPlay` puts in place of the moves column. `ritFinish()` marks XP once per case per session (`c.xpAt` against `S.session.started`), heals if chosen, clears the roller's bonuses and hold, writes the timeline into the case log, and starts a fresh timeline. The backup nudge is in its last step.
- Look: `S.settings.theme` (auto, light, dark) and `S.settings.ink` set `data-theme` and `data-ink` on the page (`applyLook`); a script in the head does the same before the first paint. An ink only changes `--accent` and `--accent-ink`, in three CSS rules each (light, dark by device, dark by choice). `INKS` holds the swatch colors and must match the CSS; tests/t18.js checks it and the 4.5:1 contrast of every ink.
- Copy for chat: `rollLine()` and `copyRoll()` on the result card.
- Ratings: they come from the playbook's lines (`wizRatings`, `data-wrate`) and from level-ups, and nowhere else; there is deliberately no stepper for them on the Roller, My sheet or the builder (Jacob, 2026-10-09). Lines lock once `S.sheet.level > 0`, so tapping one cannot erase level-ups. The one creation-time change is The Crooked's skill perk (`SKILLMOVE`, `wizSkill`, `st.skill` in the playbook's `pbs` entry): +1 to two ratings, never above +3, removed again if the move is unpicked. `pbs[name].stats` parks the totals when a playbook is switched away from.
- More than one hunter: the hunter in play is always `S.sheet` and `S.hold`; spares are on `S.bench` as { id, sheet, hold, parked, ended }, where `ended` is null or { how, note, date } for a hunter who died, retired or was lost. `switchHunter`, `newHunter` and `retireHunter` copy before they swap (`benchOf`), then `takeHunter` and `hunterChanged` re-render. Dice, settings, cases, bestiary and the timeline belong to the player and do not change with the hunter. `benchClean()` checks every spare after any whole-save load (`initStore`, restore); call it after any new place that does `S = merge(...)`. The bar on the Hunter tab is `#hbar` (`renderHunters`), styled by `.hunters`.
- The table's Worker is in `worker/` (see "Files besides index.html"). It is not used by the page yet; the page's Party tab still talks to `window.claude`, and docs/WORKPLAN.md tracks G1 to G6 for connecting them.
- Tests reach in through `window.__journal` (state, `evAdd`, `evUndo`, `levelDone`, and so on). The dice come from `crypto.getRandomValues` (`rnd6`), so tests queue faces on `window.__dice` with an init script (see tests/t15.js).

## Dice

### Dice maker
- `S.dice` holds two dice, the tray and saved sets. A die is {body, finish, pip, glow, sigil}. Starter sets: `DICESETS` (one per playbook, keyed by `pbSlug()`) and `XSETS` (campaign sets).
- `cubeHTML` draws the flat dice, styling each through `curDie()` and `dieVars()`.
- Saved dice go through `cleanDie()` and dice codes (`HJD1.`) through the stricter `strictDie()` before anything reaches HTML or CSS. Keep it that way: codes come from other people.
- Finishes are listed in `FINISHES`. A newer finish names an older one in `FINLIKE` and borrows its flat look and its sound. Adding a finish means: `FINISHES`, `FINLIKE`, a `D3MAT` entry, flat CSS if it needs its own, and tiles if it has any.
- Trays are listed in `TRAYS`, with flat CSS per tray, `D3TRAY` for the 3D floor, and `TRAYSFX` / `TRAYSND` for sound.

### 3D dice
- Optional and off by default (`S.settings.dice3d`). `d3Apply()` loads three.js with a dynamic import, so it only works over http, not from a file.
- A canvas sits over `#tray`, and `d3Sync()` copies whatever the flat dice in `#dice` show. The flat dice stay the source of truth and the fallback.
- `d3Throw()` flies the dice along a set path to the numbers already rolled. There is no physics.
- The tray photo is the floor of the scene (`d3Tray()`, fed by `applyTray()`), which is what lets clear dice refract it. Without a photo the floor is a transparent shadow catcher and clear dice use a tinted stand-in.
- `fuel` is a clear shell around a see-through liquid box cut by a clipping plane. `d3Liquid()` moves the surface and `d3Cut()` cuts the liquid there and rebuilds the lid.
- Lighting is one of three moods (`D3MOODS`, saved as `S.settings.light`): a photographed HDR surrounding (`img/env-*.hdr`) plus our own lamp lined up with its brightest light. `img/env.jpg` is the stand-in until a mood's photo arrives.
- Glowing pips, and magma's flows, carry an emissive map, so they give off light.
- The dice maker's preview (`d3Preview()`) is the same scene drawn from a second camera with both dice six up, copied onto a 2D canvas in `#dp-tray`. It redraws only when `d3Kick()` has marked it dirty.

### Sound
- Everything goes through `audio()`, which returns null while `S.settings.sound` is off, so no audio nodes exist until the player turns sound on.
- `hit(die, v)` is one bounce, in two halves: the die and the tray. Each half plays a recording from `snd/` when its set has loaded (`DIESND`, `TRAYSND`, `sndLoad`, `sndPlay`) and a made-up sound otherwise (`SFX`, `TRAYSFX`).
- Recordings are fetched only with sound on, only the sets in use, and only over http.
- `stinger(total)` is the end-of-roll sound. Holding Roll shakes (`shakeStart` / `shakeEnd`). `hearDice()` plays one throw without rolling.
- The license of the recordings copied from dice-box-threejs is unsettled: read `snd/README.md` before making the site public.

### Sigils
- `SIGILS` holds inline SVG drawn in the pip color; only the 6 face carries one. Three lots: hand-drawn (in the table), traced from Jacob's artwork (the `/*SIGILART*/` block), and the library in `sigils.js`.
- `SIGGROUPS` lays them out in the dice maker, `SIGLABEL` names them, and `SIGNAMES` (every key a die may carry) is built from the table.
- A key is saved with the die, so never rename one.
- The game-icons ones are CC BY 3.0: the Credits section in the page lists their authors from `SIGILCREDIT`. Never drop that section.

### Where the generated files come from
| Made | By | From |
|---|---|---|
| `img/die-*.jpg`, `img/tray*.jpg` and their `-n` relief, `-r` shine, `-h`, `-e`, `-c` tiles | `python tools/make_textures.py <photos> [<Poly Haven folder> [<ambientCG folder>]]` | Jacob's Qwen photos; Poly Haven and ambientCG material sets (CC0). Crop boxes and the list of materials are in the script. `DIEART` in the page says which finish has which tiles. |
| `img/env-*.hdr` | `python tools/make_env.py <folder>` | Poly Haven HDRIs (CC0) |
| `/*SIGILART*/` in the page | `python tools/make_sigils.py <folder>` | Jacob's sigil artwork, isolated and traced |
| `sigils.js` | `python tools/make_sigil_pack.py <download folder>` | game-icons.net (CC BY 3.0) and the Noto fonts (OFL). Add an entry to `PICKS` and rerun. |
| `snd/dicehit_glass*`, `snd/surface_soft*` | `python tools/make_sounds.py <pack's Audio folder>` | Kenney's Impact Sounds (CC0). The other recordings were copied as they are. |
| `img/candle-flame.png`, `img/candle-smoke.png` | `python tools/make_candles.py <the unzipped pack>` | Kenney's Particle Pack (CC0) |
| the embedded playbooks | `python3 tools/embed_data.py` | `data/*.json` |

## Tests
`npm install`, then `npm test`. All of them drive the page with Playwright and write screenshots to `tests/out/` (not in git).
- `tests/t7.js`: all 12 playbooks through the builder, gear, details, history, level-up and phone-width overflow in both themes (`node tests/t7.js chosen` runs one).
- `tests/t5.js`: the broad regression suite. It forces its rolls through the `window.__dice` queue, so it no longer depends on luck.
- `tests/t15.js`: copy for chat. `tests/t16.js`: the session timeline and undo. `tests/t17.js`: the end-of-session ritual. `tests/t18.js`: the look setting and inks. `tests/t19.js`: more than one hunter. `tests/t20.js`: the Keeper's guide section (counts and numbers pinned to the Keeper's reference sheets, and a check that the sheet's own phrasing is not copied). `tests/t21.js`: the Worker and room, run with `wrangler dev` and two browsers as two players. `tests/t22.js`: the Access token check and the input cleaning, in plain Node. `tests/t23.js`: names and catchphrases. `tests/t24.js`: ratings only from the sheet's lines, the lock after a level-up, and The Crooked's skill perk.
- `tests/t8.js`: the dice maker and sigils. `tests/t9.js`: dice sounds, with a counting stand-in for AudioContext. `tests/t10.js`: the Luck candles. `tests/t13.js`: the first-night pieces (start card, backup nudges, the Play lookup, switching playbook, advanced moves). `tests/t14.js`: the hunter card.
- `tests/t11.js`: 3D dice. `tests/t12.js`: recorded sounds. These two serve the repo over http themselves.

## What is next
See docs/TODO.md for the running list. It opens with where to start next time, then a progress table for the work plan, which branch holds what, what is waiting on Jacob, and what is left to build. docs/WORKPLAN.md cuts the remaining work into chunks (A1, T2, G3 and so on) with a proposed order; docs/SPEC.md holds the feature specs they refine. The shared table and the Keeper's scene board are tracks G and H of the work plan, and the backend trial (G0) decides how they are built. docs/ROADMAP.md is the older Supabase plan, kept for that option.
