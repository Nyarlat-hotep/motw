# To do

Last tidied 2026-10-09 (evening). **The first session moved up: it is now Wednesday 2026-10-14.** Jacob wants to share the site with the group over the weekend of 2026-10-10. Feature details are in [SPEC.md](SPEC.md); the remaining work is cut into chunks in [WORKPLAN.md](WORKPLAN.md); this is the running list of what is left and who it is waiting on. Finished work is not listed here: it is in the git history.

## Start here next time

Written 2026-10-09, after the shared table and the Keeper's area were built against the local Worker.

1. **Sharing the link this weekend.** The live site (`hunters-journal.jcantrell1993.workers.dev`) is behind Cloudflare Access, so a link in Discord works for exactly the people on the Access list and nobody else. **Jacob:** add each friend's email to the Access policy (Zero Trust dashboard, Access, Applications, the hunters-journal application, its policy). Each friend opens the link, types their email, and gets a one-time code by email. Nothing in the code needs to change for this.
2. **Everything built on 2026-10-09 is on `main` and was pushed that afternoon, on Jacob's go-ahead**, so it is what the group sees: the morning's batch (copy for chat, the timeline with undo, the end-of-session ritual, looks and inks, more than one hunter, the Keeper's guide, new names, ratings only from the sheet) and the shared table with the Keeper's area. Every test passed before the push. Jacob had not tried the morning's batch first, so expect notes from him and fix those before anything new.
   **A second push that evening** added: dark as the default look, the scorched edge for big moments, each roller's own dice in "At the table" with a quiet clatter for someone else's roll, a fix for the Keeper's Save losing its click, and a README section for the two friends who are now collaborators on GitHub. Jacob has added the group's emails to Access (item 1 is done). He picked the scorched edge from a mock-up and has not yet judged it, or the clatter, in the real page.
3. **The shared table has not yet been seen working on the real Cloudflare account.** It passed against the local Worker (`tests/t25.js`, 84 checks, with the Keeper and two players in separate browsers); the push was the Worker's first real deploy, and the site sits behind Access where it cannot be checked from here. Still to do:
   - **Jacob:** open the Party tab on the live site. It should say "Live" with a green dot. If it says "The shared table is not switched on yet", the Worker is not answering: look at the Worker's logs in the Cloudflare dashboard before anything else. (The Access team name and audience tag in the root `wrangler.jsonc` were read from the address the live site redirects a signed-out visitor to; if sign-in is the fault, compare them with the dashboard.)
   - **Jacob:** say who the Keeper is. Their email goes in as a secret named `KEEPER_EMAILS` on the Worker in the Cloudflare dashboard (Workers and Pages, hunters-journal, Settings, Variables and Secrets). Until that is set nobody is the Keeper and the desk does not appear; everything else still works. Putting Jacob's own email there first is the quick way to try the desk.
   - With a second person: both show up in the list, a hunter card follows a change, a roll lands in "At the table", and a handout with a picture reaches the player. This is gate 4 and gate 5 of the backend trial, which could not be tried locally. Afterwards, look at the Durable Object usage in the dashboard against the free daily limits.
4. **Things only Jacob or the Keeper can judge** once it is live: the wording on the desk and the scene board, whether the bell on a new handout is welcome, and whether one table for the whole site is right (it is, until a second group wants in).

## Work plan progress

Chunk IDs are defined in [WORKPLAN.md](WORKPLAN.md).

| Chunk | What | State |
|---|---|---|
| A1, A2, A4, T1, T2, T3, C1, B1 to B3, N1, R1 | Small wins, timeline and undo, the ritual, looks and inks, more than one hunter, names, ratings | built, tested and pushed to `main` 2026-10-09. **Jacob:** try them |
| H0 | The Keeper's guide | built, tested and pushed to `main` 2026-10-09. **Jacob:** check it against the reference sheets |
| G0 | Backend trial | local half passed. The real-account half is the check in Start here, 3 |
| G1, G3 | The page talks to the Worker; live hunter cards | built, tested and pushed to `main` 2026-10-09. The seam is smaller than planned: `tableOn()`, `myId()` and `tbl`, with the claude.ai code left in place beside it |
| G2c | The Worker deploys with the site | root `wrangler.jsonc` changed and pushed 2026-10-09 |
| G4 | Shared roll feed | built and tested: each roll with the roller's own dice, a quiet clatter and a screen-reader line for someone else's roll, and a switch for both in Settings. **Jacob:** judge the clatter by ear |
| G6 | Roles and the Keeper | built and tested. **Jacob:** the Keeper's email |
| H1a, H1b, H1c | Handouts: the server, the Keeper's desk, the scene board and pinned banner | built, tested and pushed to `main` 2026-10-09 |
| H2 | The Keeper's overview | built and tested, at the foot of the Keeper's desk |
| H3 | Threat cards in Case files | not started. Ask the Keeper if wanted |
| G5, G7, G8 | Discord from the server, retiring the claude.ai path, a cloud copy of each journal | not started |
| A3, C2, D, E, F, I | See WORKPLAN.md | not started |

## Where the work is

| Branch | What it holds | State |
|---|---|---|
| `main` | Everything: the dice work, the Luck candles, the first-night pieces, the hunter card, the 2026-10-09 morning batch, and the shared table with the Keeper's area (the Worker in `worker/` now deploys with the site) | Pushed 2026-10-09, twice: the afternoon batch, then the evening one (dark by default, the scorched edge, dice in the roll feed, the Keeper's lost click) |

Every other branch was merged or replaced, and all were deleted on 2026-10-09. The first drawing of the Luck candles (commit d3358c3) went with them; the candles in `main` replaced it.

Pushing `main` deploys. Pushing any other branch does not.

## Before the session on Wednesday 2026-10-14

- [ ] **Jacob:** add the other players' emails, and the Keeper's, to the Cloudflare Access list. Nobody else can open the site until this is done.
- [ ] **Jacob:** the Keeper's email as the `KEEPER_EMAILS` secret on the Worker (see Start here, 3).
- [ ] With one friend: both open the Party tab, both turn on "Show my hunter and my rolls to the table", roll once each, and the Keeper shows one handout with a picture. That is the whole shared table in five minutes.
- [ ] Have one friend run a short practice: build a hunter, roll five moves, take harm, spend Luck.
- [ ] **Jacob:** tell the Keeper about "Running the game (for the Keeper)" in the Guide and the Keeper's desk on the Party tab, and read the guide against pages 5 and 6 of the reference PDF.
- [ ] **Jacob:** ask the Keeper whether Use Magic keeps its name in The Long Dry or gets renamed to fit the setting, and whether threat cards (H3) are wanted.
- [ ] **Jacob (optional, for A3):** make a test channel and webhook in Discord so a real post can be tried.

## Waiting on Jacob's eye and ear

All of this is live and none of it has had his review yet (nor has anything from 2026-10-09: see Start here). 3D dice and sound are both off until a player turns them on.

- [ ] **3D dice.** Judge them in motion: the fuel swish, the three lighting moods, the finishes. Try them on a phone.
- [ ] **Dice sounds (F1).** Nothing has been tuned by ear. A bounce is a die half and a tray half chosen separately, so there are 21 listens in all (14 finishes, 7 trays), not 98 pairs. Turn sound on and use "Hear these dice" in the dice maker, and note which are wrong. From the first, made-up pass: gem was the only die sound he liked, and leather and felt should land as more of a thud.
- [ ] **Big moments (the scorched edge).** He picked the style from a mock-up on 2026-10-09; judge the real thing in motion on a 12+, a miss and a level-up: how far the edge reaches in, how long it lasts, and the two colors. It draws correctly in WebKit (Safari's engine) in the tests; not yet seen on a real phone.
- [ ] **A friend's roll.** With a second person at the table and sound on: is the quiet clatter of their dice welcome, and is it the right loudness? It can be switched off under Settings.
- [ ] **Luck candles.** He saw them before they went live and asked for a flame with more frames, which they now have. Check the flame in motion, and what happens at 2 Luck or fewer.
- [ ] **Hunter card.** Open Save hunter card on My sheet with a real hunter and a photo, and drop the picture in the group chat to see how it reads there.
- [ ] **Start here and the Play lookup.** Read the wording as a first-time player would: the three steps on the Guide, and the "I want to..." list on Play.

## Dice maker

- [ ] D1: Let the preview dice be turned by dragging, to look at every face.
- [ ] D2: A search box in the sigil picker (there are over 250).
- [ ] More sigils when wanted: add entries to `tools/make_sigil_pack.py` and rerun. game-icons has about 4,000 unused. Eight card-suit, star and lightning glyphs were skipped because the Noto font used does not have them; game-icons has equivalents.
- [ ] The gold seal and ice compass artwork was too fine to read at die size. Redo as a flat white symbol on pure black with thick strokes if still wanted, then trace with `python tools/make_sigils.py <folder>`.
- [ ] D4: More finishes: copper or brass with patina, sandstone, obsidian, a second wood.
- [ ] D3: A wasteland color palette for bodies and pips (rust, sand, hazard yellow, oil black, coolant green), and two or three campaign sets.
- [ ] D5: Stronger source photos for bone and resin: their grain is faint.

## 3D dice

- [ ] E1: Check speed on a mid-range phone. If clear dice (gem, frost, fuel) are slow, fall back to the cheaper glass there.
- [ ] E3: Bring back the dimmed look before the first roll (lost when the tray moved into the 3D scene).
- [ ] E2: Make hold-to-shake move the 3D dice and the liquid.
- [ ] E4: Decide whether 3D should become the default once it has been through a real session.

## Dice sounds

- [ ] F3: Give chrome, marble, carbon, oil slick, magma and frost sounds of their own. Each borrows the nearest older finish for now.
- [ ] F2: **Before the site is ever public:** settle the license of the recordings copied from dice-box-threejs, or replace them. See `snd/README.md`. Checked 2026-10-09: the upstream repository's license page covers its code and says nothing about the audio, so replacing is the realistic route.
- [ ] Bone, stone, glass, leather, slate and concrete all use the nearest recording at a different speed, because nothing found was recorded with those. Leads not yet downloaded or heard:
  - [Kenney Casino Audio](https://opengameart.org/content/54-casino-sound-effects-cards-dice-chips): CC0, 12 dice handling sounds (throws, shakes, grabs).
  - [Halfwits and Failed Crits, Rolling Dice](https://halfwitsfailedcrits.itch.io/sfx-pack-rolling-dice): CC0, pay what you want, studio recorded.
  - [2 dice roll, 29 throws](https://lpc.opengameart.org/content/2-dice-roll-29-throws): CC0.
  - Glass marbles, the nearest real thing to a glass die: [D43thsilence's Marble Sounds Pack](https://freesound.org/people/D43thsilence/packs/41780/) and [Anthousai's marbles in a ceramic bowl](https://freesound.org/people/Anthousai/packs/25344/) on Freesound. Neither pack page shows its license; check each clip.
  - [Two dice rolled into a soft tray](https://freesound.org/people/WallyDM/sounds/815672/): CC0, for a truer leather landing.
  - Kenney's Impact Sounds (already used for glass and the soft thud) also has ceramic plate, tin and plank impacts that might suit slate or concrete.
  - [Rogue Waves, Cards and Dice](https://rogue-waves.itch.io/cardanddice): not free (24 euros), but the only pack found that records the same dice on felt, wood and cork.
  - Recording at home: a glass bead or marble dropped on a belt, a floor tile and a board, a few takes each, would settle it.

## Look and setting: The Long Dry

The campaign is a post-apocalyptic wasteland, and the journal was styled as a gothic Appalachian field journal before that was known. The dice maker now has wasteland trays, finishes, sigils and sets; nothing else has been rethemed.

- [ ] **Jacob:** try the Rust and Dust inks (under Settings) and say whether either becomes the default.
- [ ] **Jacob:** decide how far to go beyond that. Candidates, most visible first: header art, name generator (Appalachian names from the 1600s to 1800s), colors.

## Features still to build

Detail is in [WORKPLAN.md](WORKPLAN.md); the specs they refine are in [SPEC.md](SPEC.md).

- [ ] 5 to 7. The ritual, the timeline with undo, and the inks are built and pushed. Ambient sound (C2) is not.
- [ ] 8. Shared roll feed and live party: built and pushed; waiting for its first check on the real account (see Start here). Left over: Discord from the server (G5), retiring the claude.ai path (G7).
- [ ] The Keeper's area: the guide, the desk, the scene board and the overview are built. Left over: threat cards (H3), if the Keeper wants them.

## Later

- [ ] I1: A "hide the hints" setting for experienced players.
- [ ] I2: Custom and expansion playbooks.
- [ ] I3: An accessibility pass with a screen reader and keyboard only.
- [ ] A3: Post rolls to a Discord channel with a webhook (optional).
- [ ] G8: Keep a copy of each player's journal on the server (an idea, not yet asked for).

## Housekeeping

- [ ] `docs/ROADMAP.md` is partly out of date (it plans for Vercel or Netlify hosting and a claude.ai-only sign-in). A note at its top says so; G7 tidies it once the shared table is live.

## Decided, not doing

- The official playbook sheets and reference sheets are the source for rules. On 2026-10-08 all twelve playbooks, the basic and weird moves, and the harm, healing, Luck and level-up rules were compared with them line by line. What differed was fixed: the builder now asks for a playbook's own choices before moves and gear, as the sheets do; a pronouns field was added; and a few wordings were corrected (Protect Someone on a 10+, the telekinesis explosion's fire tag, two history prompts, the Divine's Boss from Beyond).
- The Harm row has eight pips where the printed sheet has seven boxes. The eighth is "8 harm kills", which the reference sheet states.
- Rules stay as built from the rulebook. A how-to-play video was checked on 2026-10-08 and nothing was changed to match it, including adding a "the Keeper never rolls" line to the Guide.
- **Big moments burn the edge of the screen; nothing flashes from the middle (Jacob, 2026-10-09).** The white double flash on a 12+ and the brass burst on a level-up are gone.
- **Dark is the default look for everyone (Jacob, 2026-10-09: the light look is too bright and jarring).** Settings still offers Light and My device. A journal saved before this, which held "follow my device" without anyone having picked it, opens dark too.
- **Ratings are not set by hand (Jacob, 2026-10-09; this replaces the 2026-10-08 decision to keep the hand-set range).** The sheet says "pick one line", so the builder offers only the playbook's lines, and after that a rating changes only through a level-up (or The Crooked's skill perk). The adjust buttons are gone from the builder, My sheet and the Roller. Once a hunter has levelled up, the lines lock, so tapping one cannot undo the level-ups. Old saves with hand-set ratings keep them and can pick a line while at level 0.
- Sigils are one-color stamps in the pip color, not full-color pictures (Jacob, 2026-10-08).
- 3D dice are flown along a set path to the numbers already rolled. No physics library (Jacob, 2026-10-08).
- Players' rolls and hunter cards share one switch, "Show my hunter and my rolls to the table", off by default (2026-10-09, my choice, open to Jacob changing it): one plain consent, and a player trying dice alone at home does not fill the table's feed.
- A player can fetch a Keeper's picture only while it is on a shown handout. A draft's picture answers "not found" to everyone but the Keeper (2026-10-09).
