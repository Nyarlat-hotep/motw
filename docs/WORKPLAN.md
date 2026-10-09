# Work plan

Written 2026-10-09. **The first session moved from the 19th to Wednesday 2026-10-14 (Jacob, 2026-10-09), so where this file says "the 19th" read the 14th; the shared table and the Keeper's area were pulled forward and built the same day.** This cuts the list Jacob handed over on 2026-10-09 into chunks small enough to build, test and ship one at a time. [SPEC.md](SPEC.md) still holds the detailed specs for features 1 to 8. This file says how the remaining work is cut up, in what order, and what each piece is waiting on. [TODO.md](TODO.md) stays the running list and points here.

## How to read this

- Chunk IDs (A1, T2, G3 and so on) are stable. Use them in commits and in TODO.md.
- Sizes are rough and mine: **S** is a few hours, **M** about a day, **L** two days or more (an L is split before it is started, and the plan below has already split them).
- Every chunk can ship on its own, leaves the page working without any extras, adds or extends a Playwright check, and ends by updating TODO.md. New test files continue from `tests/t15.js` and are added to the `test` script in `package.json`.
- **Jacob:** marks what only he can do or decide.
- Rules for all of it are still the ones in CLAUDE.md: one-file ES5 page, no build step for the page, light and dark themes, no sideways scroll at 390px, no emoji, plain friendly copy, reduced motion respected, new saved state goes in `defaults()`.

## What the code check found (this changes the plan)

1. **The Party tab does not work on the live site.** It reads and writes its table through `window.claude` (`store.db`, `startParty`, `pushParty`), which exists only inside claude.ai. On Cloudflare it shows "Open the journal from claude.ai". So feature 8 is bigger than a roll feed: it replaces the Party tab's whole data layer. Chunk G1 isolates that layer behind one seam so the backend choice stays small.
2. **One hunter lives in `S.sheet`**, with 109 references to it. More than one hunter has to park the spare ones beside it, not turn `S.sheet` into a list (chunk B1).
3. **Dice are saved separately, under `S.dice`, per player.** A dead hunter loses their sheet, not their dice. (I said both would be lost when I suggested this; that was wrong.)
4. **Rolls come from `crypto.getRandomValues`** (`rnd6`). That makes the flaky t5 check fixable by feeding the test a fixed result (A1), and gives every later test a way to force a roll.
5. **Limits, checked 2026-10-09** (these answer the "unchecked" note in spec 8):
   - Cloudflare free plan: only SQLite-backed Durable Objects, 100,000 requests a day, 100,000 rows written a day, 5 GB stored in total, and a single row or blob up to 2 MB. A downsized picture fits in the room's own storage. R2 (files) has a free 10 GB a month and free egress, but the page does not say whether a payment method is needed. ([Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/), [limits](https://developers.cloudflare.com/durable-objects/platform/limits/), [R2 pricing](https://developers.cloudflare.com/r2/pricing/))
   - Supabase free plan: 500 MB database, 1 GB files, 200 realtime connections, and **a project pauses after 7 days of inactivity**. A group that meets every week or two will hit that, so it would need a keep-alive ping. ([Supabase pricing](https://supabase.com/pricing))
   - Discord webhooks answer a browser cross-origin preflight (tested with a dummy id; nothing was posted). A real post still needs a test webhook, see A3.
   - The dice recordings copied from dice-box-threejs: that repository's MIT license covers its code, and its page says nothing about where the audio came from. The question in `snd/README.md` is still open and replacing the files is the realistic answer (F2).

## Proposed order

Jacob asked for the backend trial first, so it is first. It runs beside the small wins, because the shared table cannot be ready for the 19th either way.

| Wave | Chunks | Why here |
|---|---|---|
| 0, now | G0 backend trial; A1 flaky test; A4 honest Party message | G0 gates all of tracks G and H. A1 and A4 take minutes. |
| 1, before the 19th | A2 copy roll to chat; T1 timeline; T2 undo; T3 end-of-session ritual; C1 look and inks | Everything here works with no backend and helps the first session: rolls reach the group chat, mis-clicks are recoverable, the Long Dry look can be tried. |
| 2, the week after | B1 to B3 more than one hunter; then G1 to G4, G6 (the shared table); H0 Keeper's guide | B is independent of the backend and should land before a hunter can die. G follows G0's answer. |
| 3, then | H1 to H3 Keeper area; A3 Discord; D, E, F tracks; C2 ambient sound; I tracks | Order by taste. D, E and F wait on Jacob's eye and ear. |

If the 19th arrives with Wave 1 only partly done, the order inside it is A2, T1, T2, then the rest.

## Assumed unless Jacob says otherwise

1. The backend trial tries Cloudflare first and runs the Supabase trial only if Cloudflare fails its gates (G0). TODO.md said a half-day of each.
2. **One table for the whole site.** The Cloudflare Access email list is the membership list. Join codes wait until a second group wants them.
3. Pip clicks are logged so they can be undone, merged when they come quickly. This changes spec 6, which said pip clicks leave no event.
4. When a player switches hunters, **their dice stay with them**.
5. Only the Keeper posts to the scene board in the first version. Players can look, not post.
6. The Long Dry inks (Rust, Dust) are offered next to the existing look. The default stays Oxblood until Jacob picks.

---

## Track A: Small wins

### A1. Make the t5 check deterministic (XS)
**Built 2026-10-09.** `tests/t5.js` now queues dice on `window.__dice`; 30 forced rolls in a row and two full runs passed. The same queue is in t15, t16 and t17.

`rnd6()` draws a byte from `crypto.getRandomValues` and keeps it if it is under 252. In `tests/t5.js`, add an init script that wraps `crypto.getRandomValues` and takes bytes from a queue in `window.__dice` when it has any (byte 0 gives a 1, byte 5 gives a 6; never queue 252 or more). Replace the "roll until a miss, up to 25 times" loop with a queued 1 and 1, which is a miss for a default hunter (stats are 0). Do the same wherever the file waits for a particular result.
Done when `node tests/t5.js` passes 20 runs in a row. The queue is then the standard way for later tests to force a result.

### A2. Copy roll to chat (S)
**Built 2026-10-09** (`rollLine()`, `copyRoll()`, `tests/t15.js`).

A "Copy for chat" button on the result card. The card is shared by the Roller and Play, so one change covers both (`renderStage`; the numbers are in `last`). One click puts a line on the clipboard:

    Mara: Kick Some Ass, 9 (4 + 3, +2), partial success

- Format: hunter name, move, total, then the two dice and the modifier, then the tier in lower case. A spent Luck adds ", spent Luck". An unnamed hunter reads "A hunter". Use a plain hyphen for a negative modifier, not the minus sign `fmt()` returns, because chat apps mangle it.
- A line under the button says "Copied" (`role="status"`). If the browser blocks the clipboard, show the line in a selectable box instead.
- Disabled while the dice are rolling. Keyboard-usable. No new saved state.
Tests: force a 4 and a 3 with the queue from A1 and check the exact string; the Luck-spent version; the clipboard-blocked fallback; a negative modifier.

### A3. Post rolls to Discord (S, optional)
Settings gets "Post my rolls to a Discord channel", off by default, with a field for a webhook URL.
- The URL is a secret: anyone who has it can post in the channel. Keep it in its own localStorage key (`hunters-journal-hook`), **never in `S`**, so it cannot end up in a backup file. Mask it in the field and offer "Remove".
- Accept only `https://discord.com/api/webhooks/<digits>/<token>` (and the older `discordapp.com`).
- Post after the dice settle, from `finish()`, never on the click, so nothing is spoiled early. Body: `username` (the hunter's name, 80 characters at most), `content` (the A2 line), and `allowed_mentions: { parse: [] }` so a hunter named "@everyone" cannot ping the channel.
- A failure (offline, 404, rate limited) shows one quiet line under the result and never blocks the roll.
- When the shared table exists (G5), move the URL to the server and delete this field.
Tests: stub `fetch` and check URL, body and `allowed_mentions`; nothing is sent when off; the URL is absent from `backupText()`.
**Jacob:** make a test channel and webhook, paste it once, and confirm a real post lands.

### A4. Say the truth in the Party tab (XS)
**Built 2026-10-09.** The message now says the shared table is not switched on yet and has a Save hunter card button; no test read the old wording.

Until G3 lands, replace the claude.ai message ("Open the journal from claude.ai while signed in") with plain words: the shared table is not switched on yet, and Save hunter card (My sheet) is how to show the group a hunter for now. Check which tests read the old wording before changing it.


### A5. Names and catchphrases, from more worlds (S)
**Built 2026-10-09** (`tests/t23.js`). Surprise me now deals six names from six worlds: the old Appalachian hollows (the original names, extended), the wasteland, a retro 1950s bunker world, the Louisiana bayou, the frontier, and the metro tunnels. Each comes in three registers, plain, funny and over the top, and a press always gives some of each. Everything is made up in the spirit of those worlds (Mad Max, Fallout, Hunt: Showdown, Old Gods of Appalachia, Metro and the weird west), with no character names borrowed. The catchphrase chips start as the original six; More ideas deals six more from a pool of 72 (plain, funny, over the top). The test checks every list for repeats, accents, dashes and emoji, that thousands of generated names are well formed, and that all six worlds and all three registers come up.

### A6. Ratings come only from the sheet (S)
**Built 2026-10-09** (`tests/t24.js`), at Jacob's request, to follow the character-creation pages of the PDF. The builder offers only the playbook's lines ("pick one line"); the adjust-by-hand steppers are gone from the builder, My sheet and the Roller; after that a rating changes only through a level-up. Once a hunter has levelled up the lines lock, because tapping one would put the ratings back and lose the level-ups. The Crooked's Deal with the Devil move has a skill perk, "+1 to two ratings", which is the one creation-time change the PDF makes, so it has its own picker on the Moves step (never above +3, taken off again if the move is put back, kept when switching playbook). Old saves with hand-set ratings keep them and can pick a line while at level 0.

---

## Track T: Session timeline, undo and the ritual (features 5 and 6)

### T1. Session timeline (M)
**Built 2026-10-09** (`tests/t16.js`). As built, it differs from the plan below in three ways, each for a reason:
- It does not call `logEvent` from each control. Every save compares harm, Unstable, Luck, XP, hold and level with a snapshot (`evTrack`, called from `scheduleSave`), so any control, including ones written later, leaves a line. Controls call `evSay(reason)` first when they have a reason to give.
- `S.rolls` is still written, so the Roller keeps its last ten rolls when a session ends. The timeline records rolls too.
- The hold a roll hands out is part of the roll's line, not a second line.

The plan as first written:
- Every event may carry an `undo` list of `{ field, from, to }` entries. Fields are `harm`, `unstable`, `luck`, `xp` and `hold`. One action can touch several: Play's "cancel that wound" changes harm, unstable and Luck together, and is one event.
- **Pip clicks are logged too** (this changes spec 6). If the same field changes again within five seconds, update that event's `to` and text instead of adding a line, and drop the event if the value ends where it started. Scrubbing Luck from 7 to 4 is one line.
- `logEvent(kind, text, undo)` is called from `finish()` in `doRoll`, Mark XP, Spend Luck, the harm, Luck, XP and hold controls on Play and My sheet, the case "apply XP" button, and `levelDone`.
- "This session" replaces "Recent rolls" on Play. The Roller keeps its last ten rolls, drawn from the same events. `S.rolls` stays for old saves and is no longer written.
- Removing a line never changes the sheet. Cap 200 events. A session starts at the first event after the last one ended, or after six hours of quiet.
Tests: each control leaves one line; coalescing; removing a line leaves the sheet alone; an old save with `rolls` and no `session` loads.

### T2. Undo (S to M)
**Built 2026-10-09** (`tests/t16.js`). Not undoable from the list, beyond level-ups: Mark XP and Spend Luck on a roll (the roll card would disagree with the sheet), and asking a hold question (tap the question again to take it back, which already worked). Spent Luck and XP from the pips, Take harm, Heal, and cancel-a-wound are all undoable.

- After any logged change a toast says what happened and offers Undo for eight seconds ("Harm 2 to 3. Undo"). The newest event for each field also shows an Undo button in the timeline.
- Undo only runs if every field still holds its `to` value. If not: "That changed again since. Undo the newer change first." Nothing is overwritten silently.
- A successful undo restores all the fields in the record together (harm and unstable, harm and Luck) and removes the line.
- Not undoable in this version: level-ups (they touch the level, XP, the picked improvement and advanced moves) and rolls. The level-up button already asks first. Say so in the toast's place: "Level-ups cannot be undone here. Edit the sheet by hand."
Tests: change then undo for every field; a stale undo is refused; a scrub undoes in one step; cancel-a-wound undo restores harm, unstable and Luck.

### T3. End-of-session ritual (M)
**Built 2026-10-09** (`tests/t17.js`). One panel with five short sections and a plan line, not a click-through wizard: fewer hidden states and the same result. XP is allowed once per case per session, where a session runs until the timeline's next line, so running Finish twice cannot double it. The backup nudge moved out of the case file into the panel's last step (t13 changed to match). Healing is described as for when a mystery ends, as the reference sheet says.

Build spec 5, and make it write the session into the case log as spec 6 describes. Two additions: the backup nudge that now sits in the case file (`bkNudge`) moves to the ritual's last step, and finishing the ritual starts a fresh `S.session`. Closing the panel half-way changes nothing, and XP cannot be applied twice (the case's `xpApplied` flag already guards this).

---

## Track B: More than one hunter per save

### B1. The bench (M)
**Built 2026-10-09** with B2 and B3 (`tests/t19.js`). As built: photos are not shrunk when a hunter is parked, because the upload already scales them to 420px (about 30 to 60 KB). Instead, a save that the browser refuses is now shown on screen ("NOT saved: this browser has no room left. Download a backup now."); before, `flush()` said "Saved on this device" regardless. Every spare hunter loaded from a save or backup is checked and filled in with the current defaults (`benchClean`). Old timeline lines are marked not undoable when hunters change. Ended hunters can be brought back but have no hunter card of their own: bring them back to see their sheet.

- `S.bench = []`. Each entry is `{ id, sheet, hold, parked: <timestamp>, ended: null }`. The active hunter stays in `S.sheet` and `S.hold`, so none of the 109 and 9 references change.
- `switchHunter(id)` copies the active hunter onto the bench, then copies the chosen one into place. `newHunter()` parks the active one and starts a blank sheet at builder step 1. Park by deep copy first, swap second, so a crash half-way loses nothing.
- Per hunter: `sheet`, `hold`. Per player (do not switch): `dice`, `settings`, `cases`, `bestiary`, `session`, backups. The roller's forward, ongoing and other reset on a switch.
- A parked hunter's photo is shrunk to 640px JPEG. localStorage holds about 5 MB for the whole journal and photos are the heavy part. If saving fails, say so on screen (`lsWrite` already returns false; today nothing shows it).
- `bench` defaults to `[]`, so old saves load. Backups and restores carry it because they carry all of `S`.

### B2. Switcher and the shelf (M)
**Built 2026-10-09.** The bar is `#hbar` on the Hunter tab. Its class is `hunters`, not `hbar`: `.hbar` is already the health bar's style, which clipped the card until a screenshot showed it, so t19 now also checks that the card is not cut off.

- A bar at the top of the Hunter tab: who is being played, Switch, New hunter.
- The spare hunters listed with Switch and Delete. Delete asks first and offers a backup (`bkNudge`).
- "Retire or mark lost" on My sheet asks how it ended (died, retired, lost) and a line of text, parks the hunter as ended, and moves on to another hunter or a new one. Ended hunters sit on a "Gone but not forgotten" shelf, read-only, and can still make their hunter card.
- The hunter card, Party card and copy-roll line already read `S.sheet`, so they follow the active hunter with no change.

### B3. Tests (S)
`tests/t15.js` or the next free number: park and switch round-trips every field exactly; a photo is shrunk on parking; an old save loads; backup then restore keeps the bench; an ended hunter cannot be made active; no sideways scroll at 390px.

---

## Track C: Look, inks and ambient sound (feature 7)

### C1. Look setting and inks (M)
**Built 2026-10-09** (`tests/t18.js`). Inks change only `--accent` and `--accent-ink`; `--brass` is used as text in several places and stays the second color for every ink. A small script in the page head applies a saved Light or Dark choice before the first paint. The test reads the real computed colors, and every ink passes 4.5:1 in both themes.

Build the first half of spec 7 and add two inks for The Long Dry.
- Settings gets **Look** (follow my device, light, dark; sets `data-theme`, which the CSS already supports) and **Ink**.
- Inks: the four in the spec (Oxblood stays the default, Graveyard moss, Midnight blue, Brass) plus **Rust** (burnt orange) and **Dust** (sand and ochre). This is the cheap, reversible way to try the wasteland feel without touching art or copy.
- An ink overrides `--accent`, `--accent-ink` and `--brass`. Those tokens are set in three places (`:root`, the dark `prefers-color-scheme` block, and `:root[data-theme="dark"]`), so each ink needs rules in all three.
- Contrast is a test, not a promise: for every ink in both themes, `--accent-ink` on `--accent` and `--accent` on `--bg` and `--surface` must reach 4.5:1.
- The Luck candle colors and the hunter card keep their own palettes for now; the card is deliberately the same everywhere.
- Saved in `S.settings.theme` and `S.settings.ink`.
**Jacob:** try Rust and Dust, and decide whether either becomes the default.

### C2. Ambient sound (S to M)
Build the second half of spec 7: three synthesized loops (wind, night insects, hearth), off by default, quieter than the master volume, stopped when the tab is hidden, never started without a click. No audio nodes exist while it is off.

---

## Track D: Dice maker polish

| ID | Size | What | Notes |
|---|---|---|---|
| D1 | M | Drag to turn the preview so every face can be seen | Pointer events on the preview tray rotate the two dice together; a Reset button; `touch-action: none` on the preview only; arrow keys turn it too; nothing is saved. The preview is the second camera copied to a 2D canvas (`d3Preview`) and redraws only when `d3Kick()` marks it dirty, so dragging must call that. Without 3D the flat preview stays as it is. |
| D2 | S | Search box in the sigil picker (250+ now) | Filters `SIGLABEL` names as you type, across all groups; "No sigil matches" state; keyboard-usable; searches names only at first. |
| D3 | S | Wasteland palette and sets | Swatches for body and pip: rust, sand, hazard yellow, oil black, coolant green. Two or three new campaign sets in `XSETS`. Every set must pass the 3:1 readability rule in a test. **Jacob:** names and which look best. |
| D4a | M | Sandstone and obsidian finishes | Stone family. |
| D4b | M | Copper or brass with patina | Metal family. |
| D4c | M | A second wood | |
| D5 | S | Stronger source photos for bone and resin | Their grain is faint. |

Each finish in D4 follows the checklist in CLAUDE.md: `FINISHES`, `FINLIKE`, a `D3MAT` entry, flat CSS if needed, tiles and the `DIEART` map. A new finish borrows the nearest older finish's sound until F3. Textures come from Poly Haven or ambientCG (CC0) or Jacob's own Qwen images. **Jacob:** approve each download after I name the file, source and size. Run `tools/make_textures.py` for tiles.

---

## Track E: 3D dice

| ID | Size | What | Notes |
|---|---|---|---|
| E1 | S | Speed probe and an automatic fallback | `?perf=1` shows frames per second during a throw (3D only works over http, so a query flag is safe; the hash is already used for tabs). If the median frame time over the first two throws is over 33 ms, clear dice (gem, frost, fuel) drop to the cheaper glass and the choice is remembered. **Jacob:** run it on his phone and report the numbers. |
| E2 | M | Hold-to-shake moves the 3D dice and the liquid | The flat dice already jiggle. In the scene, nudge both dice and slosh the fuel while Roll is held; release throws as now. Reduced motion: sound only. |
| E3 | S | Dimmed look before the first roll | Lost when the tray moved into the 3D scene. |
| E4 | gate | Should 3D be the default? | Not a build. After one real session: if nobody switched it off and E1 shows a steady 30 fps or better on at least one phone and one laptop, turn it on by default for devices that pass the probe and leave the rest off. **Jacob** decides. |

---

## Track F: Dice sounds

| ID | Size | What | Notes |
|---|---|---|---|
| F1 | S, **Jacob** | Tune by ear | A bounce is two halves chosen separately, the die and the tray, so 14 finishes plus 7 trays is 21 listens, not 98 pairs. Use "Hear these dice" in the dice maker, write OK or wrong beside each in TODO.md, and I change the mapping and speeds (`DIESND`, `TRAYSND`), which are data. |
| F2 | M | Replace the dice-box-threejs recordings with ones whose license is stated | This settles the open question in `snd/README.md`. Leads are in TODO.md: Kenney Casino Audio, Halfwits and Failed Crits, "2 dice roll, 29 throws", WallyDM's soft tray, glass marbles on Freesound. **Jacob:** approve each download (source, size). Extend `tools/make_sounds.py`, remap, delete the old files, close the question. Must be done **before the site is ever public**. |
| F3 | S to M | Own sounds for chrome, marble, carbon, oil slick, magma and frost | Each borrows the nearest older finish today. Best done after F2 so the new recordings are the source. |

---

## Track G: The shared table (feature 8)

Everything in G and H is on the server side of a seam (G1), so the page still works with no server, and the choice of backend touches one adapter.

### G0. Backend trial (S to M)
**Local half done 2026-10-09; the half that needs a Cloudflare account is waiting on Jacob.** `wrangler` is installed (Jacob said yes). The trial code is in `worker/` with its own config (`worker/wrangler.jsonc`, name `hunters-journal-spike`), so the root `wrangler.jsonc` that deploys the live site is untouched. Run it with `npm run build` then `npx wrangler dev --config worker/wrangler.jsonc --var DEV:1`. Tests: `tests/t21.js` (the Worker and room, two browsers, 50 checks) and `tests/t22.js` (the sign-in check and input cleaning in plain Node, 46 checks).

| Gate | Result |
|---|---|
| 1. Two browsers see each other within about two seconds | Passed: a card change arrived in 7 ms. |
| 2. A closed connection catches up | Passed: the snapshot on reconnect holds what changed while away, and the last 50 rolls. |
| 3. A 600 KB picture goes up and comes back with the right headers | Passed: byte for byte, type set by the server, `nosniff`, a locked-down policy, private cache. PNG, SVG and oversize are refused; a real JPEG from a page decodes in an image tag. |
| 4. Forged identity refused, real Access accepted | Passed locally: a signed token is accepted; a token signed by someone else, for another audience, expired, unsigned, or HS256 is refused; typed-in email headers, `?as=` and the dev header do nothing without `DEV`. **Not yet tried against real Access**, which needs the team name and audience tag. |
| 5. A four-hour session uses well under a tenth of the free limits | **Not measurable locally.** Estimate: card updates are debounced, so a table of five sends a few thousand messages and writes a few thousand rows in four hours, against 100,000 rows a day. Check the dashboard on the first real session. |
| 6. The page loads and plays when the table refuses everyone | Passed: against a server set up like the real one, with nobody signed in. |

The trial found and fixed three real faults, all now under test: other players were never told someone went offline (a closing socket still counted as open); an upload refused early, without reading it, threw an uncaught error that reset the room and failed the next request (the room now cancels unread bodies); and a roll's total and tier were taken on the page's word (the server now works them out from the dice).

Two things to carry into the page's code. When the room refuses an upload early (not the Keeper, too big, wrong type), the server closes that connection without reading the picture, so the next request on a reused connection can fail with "network connection lost": the Keeper's upload code should retry once on a fresh connection. And the local server logs `Can't read from request stream after response has been sent` after each early refusal; it came from the front Worker's copy of the body, caused no failure in any run, and is worth a look on the real account.

**Decision:** Cloudflare passes everything that can be tried locally, so the Supabase half-day is not needed unless the real-account half fails.

Cloudflare first. The shape: a Worker with one Durable Object holding the table, with WebSockets to the pages. Access already knows who each player is, it is one vendor, and Supabase's seven-day pause is a poor fit for a game that meets every week or two.

The trial passes if all of these hold:
1. Two browsers with different test identities see each other's hunter card change within about two seconds.
2. Close one browser's connection, change something in the other, reopen: it catches up.
3. A 600 KB JPEG uploads and comes back with the right headers.
4. Deployed behind Access: an allowed email works, and a forged identity header is refused (see "Sign-in" below).
5. A simulated four-hour session uses well under a tenth of the free daily limits (read the dashboard).
6. With the Worker down or `/api` returning an error, the page still loads and plays.

If any gate fails and cannot be fixed that day, spend the second half-day on Supabase with the same gates, plus a keep-alive ping for its idle pause. Write the answer into TODO.md. If Cloudflare passes, the trial code becomes the start of G2.
**Jacob:** say yes to `wrangler` as a dev dependency; log in to Cloudflare once on this machine (`npx wrangler login`) for the real-account trial; and either add a throwaway hostname to the Access policy or approve a dormant Worker on `main`. I ask before pushing `main`.

### G1. The table seam (S to M)
**Built 2026-10-09, smaller than planned.** There is no `TBL` object with adapters. The page's table code is the `tbl` block in `index.html`; `tableOn()` and `myId()` are what the Party tab asks, and `pushParty` and `unshareParty` hand over to the Worker when `tbl.on` is set. The claude.ai code is untouched beside it and still runs inside claude.ai (G7 removes it).

Put the Party tab's data layer behind one object, `TBL`: `start()`, `publish(card, dice)`, `unpublish()`, `sendRoll(roll)`, and events `members`, `roll`, `status`. The current claude.ai code moves into an adapter called `claude`. A `none` adapter is what the live site uses until G3, and tests get a fake. No visible change; every existing test passes against the unchanged stub.

### G2. Worker, sign-in and the room (split in three)
**Mostly done by the trial (2026-10-09):** `worker/access.mjs` (G2a sign-in), `worker/clean.mjs` and `worker/table.mjs` (G2b the room: cards, rolls, pictures, presence, rate limit, size limits), `worker/index.mjs`. Left: the Keeper's handouts on the server (H1a), merging the config into the root `wrangler.jsonc` (G2c), and the real Access team name and audience tag.

The Worker lives in `worker/`. It is its own small ES-module program that wrangler bundles. The page stays ES5 with no build step; the one-file rule is about the page.
- **G2a, Worker and sign-in (M).** `/api/me` returns who you are. **Sign-in:** the Worker must verify the `Cf-Access-Jwt-Assertion` token against the team's keys and check its audience tag. It must not trust the email header alone, because other hostnames for the same Worker (preview URLs) may sit outside the Access policy. In local dev only, `.dev.vars` sets `DEV=1` and a test identity; add `.dev.vars` to `.gitignore`. **Jacob:** the Access team domain and application audience tag from the Zero Trust dashboard (neither is a secret). Config: `main`, `assets.run_worker_first` for `/api/*` (confirm the exact field in the trial), the Durable Object binding and a `new_sqlite_classes` migration. A broken Worker must not take the static site down: `/api` fails closed, everything else keeps serving.
- **G2b, the room (M).** One Durable Object named for the site's single table. WebSocket with hibernation. SQLite tables: `members`, `cards`, `rolls`, `handouts`, `images`. Hard caps on every message: a card 32 KB, a roll 1 KB, text fields trimmed, ten messages a second per socket. Last 50 rolls kept. The server never sends anyone's email to a page; members are shown by display name.
- **G2c, deploy and docs (S).** Wrangler config, `npm run build` unchanged for the page, a note in CLAUDE.md on how the Worker is run locally (`npx wrangler dev`) and tested.

### G3. Live hunter cards (M)
**Built 2026-10-09** (`tests/t25.js`). As built: the page asks `/api/me` once and stays as it was if nothing answers; a status line (Joining, Live, Reconnecting, Offline); a list of who is at the table with the Keeper marked; "Your name at the table" (`S.settings.tname`); reconnects on its own with a growing wait, and a ping every 25 seconds finds a dead connection. A redraw never happens under someone typing in the Party tab.

A `cloud` adapter. It publishes `partyBody()` plus the player's dice whenever it changes (debounced like `pushParty`), and the Party tab renders from the member list. The "Show my hunter to the table" switch stays, off by default. A display-name setting ("Your name at the table"), 30 characters, stored with the member. A status line: Live, Reconnecting, Offline. Play continues offline and resyncs on reconnect.
**Everything arriving from the table is other people's data.** Check every field and length, run dice through `strictDie`, and pass every string through `esc()`, exactly as a dice code is treated. Write the Worker tests with two Playwright contexts against `wrangler dev`.

### G4. Shared roll feed (M)
**Built 2026-10-09 as a plain list** ("At the table" on Play, last five). Rolls go out only while "Show my hunter and my rolls to the table" is on. Not built: the roller's own dice drawn in the feed, the live-region announcement and its mute, the quiet stinger. A Luck spend after the roll is not sent.

`finish()` sends the roll. An "At the table" strip on Play shows the last five from everyone: name, move, total, tier, and the roller's two dice drawn with that player's own dice. That needs `cubeHTML(v, idx)` to accept a die as well as an index, with the incoming die passed through `strictDie`. A polite live region announces other players' rolls, and a mute switch silences it. If sound is on, a friend's roll can play the stinger quietly. Mismatched dice are shown as the roller set them.

### G5. Discord from the server (S, optional)
The Keeper sets one webhook on the server and the Worker posts every roll. The client field from A3 is removed. This keeps the URL off players' machines.

### G6. Roles and the Keeper (S to M)
**Built 2026-10-09.** `KEEPER_EMAILS` is read by the Worker and the room; on the real account it is a secret set in the dashboard, so the address is not in the repo. The member list marks the Keeper.

The Keeper is identified by email on a server-side list (`KEEPER_EMAILS` as a Worker variable). The server decides; the page only reads `me.keeper` to show the controls. The Keeper has no hunter and does not have to share one. A "Keeper" badge in the member list.
**Jacob:** the Keeper's email.

### G7. Retire the claude.ai path (S, optional cleanup)
Once the cloud adapter is live, remove the `window.claude` account storage and the test stub, and update CLAUDE.md and ROADMAP.md.

### G8. A cloud copy of my journal (M, an idea, not asked for)
The Start here card and the backup nudges exist because a journal lives in one browser. With the room in place, each player's backup could be kept on the server under their own sign-in and restored with a button. Worth deciding once G2 is done.

---

## Track H: The Keeper's area

The ask: some way for the Keeper to post pictures and descriptions that the other players can see. The Keeper's private prep already has a home: Case files hold the hook, threats, weakness, NPCs, loose ends, log and the six-step countdown (`CLOCK`: Day, Shadows, Sunset, Dusk, Nightfall, Midnight). That stays private and local. What is new is a way to **send things to the table**.

### H0. The Keeper's guide (S, needs no server)
**Built 2026-10-09** (`tests/t20.js`), as a new Guide section after "Behind the Keeper's screen", which stays as the short player-facing version. The test pins every count and number to the sheet and fails if any of the sheet's own phrasing appears; it caught four short lines that matched the sheet word for word, now reworded. Still needs **Jacob** to read it against the PDF.

A "Running the game" section in the Guide for whoever is Keeper: the agenda and principles, the basic Keeper moves, how to make a mystery, the kinds of threat (monster, minion, bystander, location) with their motivations, the six-step countdown, and the end-of-session questions. Plain-English paraphrase from pages 5 and 6 of the Reference Sheets PDF; nothing pasted; the mechanical facts exact. **Jacob:** check it against the PDF the way the playbooks were checked on 2026-10-08. Can ship at any time, even before the shared table.

### H1. Handouts and the scene board (L, in three)
**Built 2026-10-09** (`tests/t25.js`, and `cleanHandout` in `tests/t22.js`). As built it differs in three ways. A player can fetch a picture only while it is on a shown handout (stricter than "any signed-in member"). A picture no handout uses is deleted an hour after upload. Opening the Party tab with something unseen goes straight to the scene board, and new handouts carry a New mark until looked at (`S.hoseen`).

A handout is `{ id, title, body, kind, images, shown, pinned, at }`. Title up to 80 characters; body up to 4,000 characters of plain text; up to three pictures; `kind` is a label (scene, clue, person, place, note). Up to 60 handouts.

**H1a. Server side (M).** Depends on G2b and G6.
- Only the Keeper can create, edit, show, hide, pin or delete. The server enforces it.
- **Drafts are never sent to anyone but the Keeper.** Hiding on the page is not enough; the server filters.
- Pictures: the server accepts JPEG or WebP only, checks the first bytes, caps each at 700 KB, and stores it in the room's SQLite (a row holds up to 2 MB). Served from `/api/img/<id>` only to signed-in members, with the type set by the server, `X-Content-Type-Options: nosniff` and a locked-down content policy. Never SVG. Never HTML.

**H1b. The Keeper's editor (M).** (An upload that fails on a dropped connection retries once; see the note under G0.)
- A "Keeper's desk" view in the Party tab, visible only to the Keeper.
- Pictures are prepared in the browser before upload: drawn onto a canvas (which drops camera data such as location), scaled to 1600px on the long side, saved as JPEG, quality lowered until under 700 KB.
- Each picture asks for a short description ("Describe this for players who cannot see it"). It becomes the alt text and the caption.
- Each handout is a Draft or Shown. Shown can be pinned (one pinned at a time). Hide again and delete are always available. Delete asks first.

**H1c. What the players see (M).**
- A "Scene board" view in the Party tab: shown handouts, newest first.
- The pinned handout is a banner at the top of Play that collapses to its title.
- Pictures open in a dialog with the description underneath and a Close button; Escape closes it; focus returns to where it was.
- When the Keeper shows or pins something, connected players get a toast, "New from the Keeper: <title>", and the tab shows a dot until they look. A soft bell only if sound is on. Offline players see it on reconnect.
- Text is shown as plain text with line breaks kept. No formatting and no automatic links in the first version.

Tests: a draft never reaches a player context (check the player's socket traffic, not just the screen); an oversized or wrong-type image is refused; a script tag in the title is shown as text; the Keeper's pin appears on a player's Play within a couple of seconds; a player cannot call a Keeper-only endpoint.

### H2. Keeper's overview (S)
**Built 2026-10-09**, at the foot of the Keeper's desk.

A dense, read-only list of every hunter's Harm, Luck, XP, unstable flag and last roll, most hurt first, for the Keeper. The data comes from the cards G3 already delivers. The Keeper cannot edit anyone's sheet.

### H3. Threat cards in Case files (M, optional)
Turn the free-text threats box into optional cards (kind, name, motivation, weakness, notes) and add "Send to the table" on a threat or NPC that makes a draft handout from it. Optionally show the countdown's current step to the table as a mood line ("Dusk is coming"), switched on by the Keeper. Ask the Keeper whether this is wanted before building.

---

## Track I: Later

| ID | Size | What | Notes |
|---|---|---|---|
| I1 | S | Hide the hints | Today only a handful of elements carry a `hint` or `tip` class; the Start here card, the "I want to..." list, move notes and the wizard's help text are separate. First task: list what counts as a hint and tag each with `data-hint`. Then one setting, `S.settings.hints`, and one CSS rule. A test lists the tagged elements. |
| I2a | M | Custom playbook importer | A JSON file in the `data/SCHEMA.md` shape, checked as strictly as a dice code, kept in the save, offered in the builder. |
| I2b | M | Builder support for custom playbooks | Choices, moves, gear and level-up lists read from the imported data. |
| I2c | per playbook | Expansion playbook content | Paraphrase only, never pasted. **Jacob:** which books and which playbooks. |
| I3 | M | Screen-reader and keyboard pass | Add axe-core as a dev dependency for automated checks; fix landmarks, tab order, dialog focus and return, live regions for roll results and Luck changes, labels on pips and candles, a text alternative for the 3D canvas. **Jacob or a friend:** a short NVDA run, since I cannot run a screen reader. |

---

## What each chunk needs from Jacob

| Chunk | What |
|---|---|
| G0 | Yes to `wrangler`; Cloudflare login; Access hostname decision; confirm Cloudflare-first |
| G2a | Access team domain and audience tag |
| G6 | The Keeper's email |
| A3 | A test Discord webhook |
| C1 | Look at Rust and Dust; pick a default |
| D3, D4, F2 | Approve downloads; name and pick sets |
| E1 | Phone frame-rate numbers |
| F1 | Listening notes (21 listens) |
| H0 | Check the Keeper's guide against the PDF |
| H3 | Ask the Keeper if wanted |
| I2c | Which expansion playbooks |
| I3 | A short screen-reader run |
