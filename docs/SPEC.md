# Spec: dice maker, sound, and the "legendary" set

Written 2026-10-05. Next session is planned around 2026-10-19; the group plays online on laptops and desktops.

This covers eight features. The first four need no server and are the target for the next two weeks. The rest are specified so they can be picked up in any order afterwards.

| # | Feature | Needs a server | Size | Order |
|---|---|---|---|---|
| 1 | Custom dice maker | no | M | 1 |
| 2 | Dice sounds | no | S | 2 |
| 3 | Luck as seven candles | no | S | 3 |
| 4 | Hunter card image | no | M | 4 |
| 5 | End-of-session ritual | no | S | 5 |
| 6 | Session timeline | no | M | 6 |
| 7 | Ink themes and ambient sound | no | S | 7 |
| 8 | Shared roll feed | yes | L | 8 |

Rules that apply to all of it (from CLAUDE.md): one file, ES5, no build step for the page itself, light and dark themes, no sideways scroll at 390px, no emoji, plain friendly copy, everything optional art-wise, reduced motion respected. Every new piece of saved state goes in `defaults()` so `merge()` carries old saves forward.

---

## 1. Custom dice maker

Status: built 2026-10-06. Two starter sets moved off the colours in the table to pass the readability rule: The Chosen is old gold rather than pale gold (white pips), and The Monstrous is blood red rather than deep red (black pips). The Divine's gold pips are a dark gold for the same reason.

### What the player gets
A "Customize dice" button under the dice tray (it travels with `#rollkit`, so it shows on Play and Roller). It opens a panel with a live preview made of the real 3D dice. Changes apply at once and save with the journal.

### Options, first version
- **Body colour:** eight swatches plus a free colour picker.
- **Finish:** bone (today's look), resin (glossy), metal, stone, gem (translucent).
- **Pip colour:** swatches plus a free picker.
- **Glow:** off or on. Pips get a soft outer glow in their own colour ("ember" dice).
- **Sigil on the 6:** none, antler, lantern, crescent, eye, skull, cross. Replaces the six pips.
- **Pair:** matched (one style for both) or mismatched (style each die on its own tab).
- **Tray:** leather (today), felt, wood, slate. If `img/tray.jpg` is present it is only used for leather.
- **Sets:** the default (Bone and Oxblood, identical to today) plus one starter per playbook, and "Save as my set" with a name (up to 12 saved). The set for your own playbook is listed first and marked "Made for The Chosen" (or whichever you play). Any player can use any set.

  | Playbook | Set | Body | Finish | Pips | Sigil | Tray |
  |---|---|---|---|---|---|---|
  | The Chosen | Destiny's Edge | pale gold | metal | white, glow | cross | slate |
  | The Crooked | Loaded Pair | ivory | resin | black | eye | felt |
  | The Divine | Halo | white | gem | gold, glow | cross | slate |
  | The Expert | Old Library | parchment | bone | ink blue | lantern | wood |
  | The Flake | Red String | corkboard tan | stone | red | eye | wood |
  | The Initiate | Sect Relic | verdigris green | metal | bone | crescent | slate |
  | The Monstrous | Blood Moon | deep red | resin | black | antler | leather |
  | The Mundane | Kitchen Drawer | plain white | resin | black | none | wood |
  | The Professional | Field Issue | gunmetal | metal | white | none | felt |
  | The Spell-Slinger | Coal Ember | charcoal | stone | orange, glow | crescent | slate |
  | The Spooky | Graveyard Jade | jade green | gem | pale green, glow | skull | leather |
  | The Wronged | Silver and Salt | silver | metal | oxblood | skull | leather |

  Exact colours are chosen during the build and each must pass the readability rule below.
- **Dice code:** "Copy code" and "Paste a code" so friends can trade sets without a server.
- **Reset:** back to Bone and Oxblood.

### Data
```
S.dice = {
  linked: true,
  a: DIE, b: DIE,
  tray: 'leather',                 // leather | felt | wood | slate
  sets: [ { name: 'My set', a: DIE, b: DIE, tray: 'leather' } ]
}
DIE = { body: '#e9dcba', finish: 'bone', pip: '#6a1420', glow: false, sigil: '' }
```
`linked: true` means `b` mirrors `a` on every change. Starter sets live in a `DICESETS` constant keyed by playbook id, not in saved state.

### How it is drawn
- `.face` currently hardcodes its gradient and pip colours. Move those to custom properties (`--die`, `--die-hi`, `--die-lo`, `--pip`, `--pip-hi`) set inline on each `.slot` by `cubeHTML(v, idx)`, with fallbacks equal to today's values so the default look does not change.
- `--die-hi` and `--die-lo` are derived from the body colour in JS (lighten and darken by fixed amounts). One helper: `dieVars(die)`.
- Finish is a class on the slot (`fin-bone`, `fin-resin`, `fin-metal`, `fin-stone`, `fin-gem`) that changes only the `box-shadow` and gradient recipe. Gem also sets face opacity to about .82 and turns off `backface-visibility: hidden` so the far faces show through.
- `faceHTML(v, die)` keeps the nine-cell pip grid for every face except a 6 with a sigil. The slot's `aria-label` ("Die showing 4") stays as it is.
- Sigils are inline SVG paths in a `SIGILS` map, drawn with `fill: currentColor` in the pip colour. Only the 6 face uses one.
- Tray surfaces are four background recipes on `.tray` chosen by a `data-tray` attribute.

### Dice codes
- Format: `HJD1.` followed by base64url of compact JSON for `{ a, b, tray }` (and `name` if present).
- Codes come from other people, so import is strict: parse inside try/catch, accept only known keys, colours must match `/^#[0-9a-f]{6}$/i`, enums must be in their lists, name is trimmed to 40 characters and always passed through `esc()`. Anything else is rejected with "That is not a dice code." Nothing from a code is ever written into HTML or CSS without that check.

### Readability rule
Compute the contrast ratio between pip and body colour (WCAG relative luminance). Below 3:1, show a warning under the preview with a "Fix it" button that swaps the pip to near-black or near-white, whichever contrasts more. The player may ignore it.

### Out of scope for this version
Numerals or Roman numerals in place of pips (decided against for now), a sigil on faces other than the 6, images on faces, landing effects, physics, other people seeing your dice (that arrives with feature 8).

### Done when
- Default dice are pixel-identical to today for a player who never opens the panel.
- All options apply live, survive a reload, and are in backups.
- A code copied on one browser loads the same dice on another; a malformed or hostile code is refused.
- Works in both themes, no overflow at 390px, panel is keyboard-usable.
- Tests: defaults unchanged; change body colour and check the computed face background; a sigil replaces the pips on the 6 only; mismatched dice keep separate styles; all twelve playbook sets pass the readability rule; code round-trip; bad codes rejected (including one with markup in the name); reload keeps the set.

---

## 2. Dice sounds

### Today
`clack(v)` plays one band-passed noise burst per bounce, and `sound(kind)` plays a rumble for crit, miss and level-up. Sound is off by default (`S.settings.sound`). It is thin and the same for every die.

### Change
- **Layered hit:** each bounce is a short click (high band-pass) plus a low thump (sine dropping in pitch), scaled by the bounce strength already passed in from `throwDice`.
- **Materials:** a `SFX` table keyed by finish gives click frequency, Q, decay and ring. Starting values: bone 1900 Hz / short; resin 2600 Hz / short; metal 3800 Hz / long ring; stone 900 Hz / dull; gem 5200 Hz / bright ring. The tray sets the thump: leather soft, felt softest, wood hollow and louder, slate hard.
- **Mismatched pairs** sound different per die, since each uses its own finish.
- **Hold to shake:** holding the Roll button for more than 250 ms starts a looping rattle and a small jiggle of the resting dice; releasing throws. A normal click or Enter/Space rolls at once, as today. Reduced motion: no jiggle, sound only.
- **Stingers:** 10+ a low bell (two detuned sines), 12+ the existing thunder plus the bell, miss the existing thud. Partial success stays silent.
- **Volume:** `S.settings.vol` (0 to 1, default .6) with a slider under the sound switch. Sound stays off by default because the group is on a call and it can reach a microphone; the settings copy says so.

### Done when
No audio nodes are created while sound is off. With sound on, a roll makes one hit per bounce per die and at most one stinger. Hold-to-shake never double-rolls. Tests stub `AudioContext` and count nodes; they also cover hold, release, and click paths.

---

## 3. Luck as seven candles

### What the player gets
On Play and My sheet, the seven Luck pips become seven small candles. A lit candle is a Luck point you still have. Spending one snuffs it: the flame shrinks, a wisp of smoke rises, and the wick glows for a moment. The Roller's "Spend Luck" button and Play's "cancel that wound" trigger the same animation.

### How
- Candles are inline SVG (wax, wick, flame), not photos, so they recolour with the theme and need no files. The flame reuses the `lampflicker` keyframes with a random delay per candle.
- They stay buttons with the same behaviour and labels as today's pips (`aria-pressed`, "Luck 3"), so tests and keyboard use keep working.
- At 2 Luck or fewer the row gets a "running low" tint. At 0 the playbook's Luck special stays visible and a line reads "Out of Luck. Bad things find you."
- Reduced motion: no flicker, the candle simply switches state.
- Harm keeps its numbered pips for now. A matching treatment (cracks or blood drops) is a possible follow-up, not part of this.

### Done when
Luck reads correctly at a glance in both themes, clicking still sets Luck, spending from Roller and Play animates the right candle, and nothing moves under reduced motion.

---

## 4. Hunter card image

### What the player gets
A "Save hunter card" button on My sheet and on the builder's Review step. It produces a 1200 x 630 PNG: portrait on the left, then name, playbook, catchphrase, the five ratings, Luck, Harm and level, move names, and equipped gear, in the journal's type and colours. Buttons: Download, and Copy image where the browser allows it.

### How
- Draw on a `<canvas>` with the 2D API. Wait for `document.fonts.ready` first so the Fell and Garamond faces are used.
- Content comes from `partyBody()` so the card and the Party tab never disagree.
- Portrait: the uploaded photo (a data URL, always safe to draw) or the playbook portrait. When the page is opened from a file, drawing a file image taints the canvas, so in that case skip the portrait and draw the playbook initial in a frame.
- Long names and move lists are measured and wrapped or trimmed with an ellipsis. Up to eight moves, then "and 3 more".
- The card always uses the dark palette, whatever the page theme, so it looks the same in a chat.
- Download uses the same blob approach as the backup file.

### Done when
A full hunter, an empty hunter and a hunter with very long text all produce a legible card with no text outside its box. Test: generate, check canvas size and that the data URL is non-trivial.

---

## 5. End-of-session ritual

### What the player gets
An "End session" button on Play. It opens a short guided panel:
1. Which case was this? (pick an open case, or none)
2. The four end-of-session questions, as today's checkboxes.
3. XP: shows "1 or 2 yes: 1 XP, 3 or 4: 2 XP", and applies it once.
4. Healing: "No time to rest: heal 1" or "Plenty of time: heal all" or "Neither".
5. Clean-up: clears forward, ongoing, other and hold.
6. Writes a dated line into the case's session log (see feature 6 for what goes in it) and offers "Download backup".

### How
Reuses `EOS`, `eosXp()` and the case's `eos` and `xpApplied` fields so the Case files tab shows the same answers. The panel is one function, `renderRitual(step)`, rendered into the Play screen in place of the moves column while it is open.

### Done when
XP cannot be applied twice for the same case and session, healing matches the Guide's rule, and closing the panel half-way changes nothing.

---

## 6. Session timeline

### What the player gets
On Play, "Recent rolls" becomes "This session": rolls plus harm taken, healing, Luck spent, XP marked, hold spent and level-ups, newest first, each one line. Any line can be removed. At the end-of-session ritual the timeline is turned into a short paragraph-per-event list and appended to the chosen case's session log, where it can be edited freely.

### Data
```
S.session = { started: 0, events: [ { t: 1760000000000, kind: 'roll', text: 'Kick Some Ass: 9, partial success' } ] }
```
Kinds: roll, harm, heal, luck, xp, hold, level. Capped at 200 events. A session starts at the first event after the previous one was ended, or after six hours of quiet.

### How
One helper, `logEvent(kind, text)`, called from the existing handlers (`finish()` in `doRoll`, the harm, Luck and XP handlers on Play and My sheet, `levelDone`). The Roller tab keeps its last-ten list, drawn from the same events filtered to rolls. `S.rolls` stays for old saves and is no longer written.

### Done when
Every action that changes Harm, Luck, XP or hold through a button leaves one line; direct pip clicks leave none (they are corrections, not events). Removing a line never changes the sheet.

---

## 7. Ink themes and ambient sound

### Ink themes
- A "Look" setting: Follow my device, Light, Dark (the CSS already supports `data-theme`, there is just no switch), and an ink: Oxblood (today), Graveyard moss, Midnight blue, Brass.
- An ink only overrides `--accent`, `--accent-ink` and `--brass` for both themes via `[data-ink="moss"]` and so on. Every pair must pass 4.5:1 contrast for text on its button.
- Saved in `S.settings.theme` and `S.settings.ink`.

### Ambient sound
- Three loops, off by default, under the sound settings: wind, night insects, hearth. Synthesised with filtered noise (and random soft crackles for the hearth) so there are no audio files; volume follows the master slider at a lower level.
- Stops when the tab is hidden. Never starts without a click (browser rule and good manners on a call).

### Done when
Themes switch without a reload and persist; ambient sound creates no audio nodes while off.

---

## 8. Shared roll feed (and the shared table)

### What the group gets
On Play, a "Table" strip showing the last few rolls from everyone: who, which move, the total and tier, thrown with that player's own dice. The Party tab shows everyone's hunter card live. This is the piece that makes the dice maker social.

### Decision to make first: where the shared state lives
The roadmap assumed Supabase. Since the site now runs on Cloudflare Workers behind Cloudflare Access, there is a second option worth weighing before any building:

| | Supabase | Cloudflare (Worker plus a Durable Object room) |
|---|---|---|
| Sign-in | Its own (magic link); a second login on top of the Access gate | None extra: Access already knows who you are, and passes the verified email to the Worker |
| Live updates | Realtime subscriptions, well documented | WebSockets from the Durable Object; more code to write |
| Storage | Postgres with row-level security | Durable Object storage or D1 |
| Vendors | Two | One |
| Unknowns | Free-tier pausing on idle projects | Durable Objects pricing and limits need checking for a free account |

Neither has been tested for this app. The first task is a half-day spike of each, then choose.

### Shape, whichever backend
- A table is a room with a short join code. Members: the emails allowed through Access, or Supabase users who entered the code.
- `party_cards`: one per member, the output of `partyBody()` plus `dice` (the member's `S.dice.a`, `b`, `tray`).
- `rolls`: `{ who, hunter, move, d1, d2, mod, total, tier, luck, at }`, last 50 kept.
- The client keeps localStorage as the source of truth and works offline; sharing is opt-in with the existing "Show my hunter to the table" switch.
- Incoming data is other people's data: every field is validated and escaped exactly like a dice code.

### Done when
Two browsers signed in as different people see each other's cards and rolls within a couple of seconds, and a player who goes offline can still play and catches up on reconnect.

---

## Decisions
Settled by Jacob on 2026-10-05:
1. **Pips and sigils only.** No numerals in the dice maker.
2. **Mismatched pairs are in** from the first version.
3. **One starter set per playbook** (twelve), plus the default.

Still open:
4. **Backend for feature 8:** undecided, see the table above.

## Suggested build order for the next two weeks
1. Dice maker (feature 1), then sounds (2), since sound depends on finish and tray.
2. Luck candles (3).
3. Hunter card image (4).
4. If time remains: end-of-session ritual (5).

Before any of it: finish the Cloudflare Access setup (one-time PIN login and the list of allowed emails) so the group can open the site.
