# To do

Last tidied 2026-10-10. **The first session is Wednesday 2026-10-14.** Jacob is sharing the site with the group over the weekend of 2026-10-10. Feature details are in [SPEC.md](SPEC.md); the remaining work is cut into chunks in [WORKPLAN.md](WORKPLAN.md); session awards and card looks are in [SPEC-CARDS.md](SPEC-CARDS.md); this is the running list of what is left and who it is waiting on. Finished work is not listed here: it is in the git history.

## Start here next time

Written 2026-10-10 (fourth pass, late that night).

1. **Merged into `main` and pushed late on 2026-10-10, on Jacob's word ("merge, commit, and push"): the new 12+ and level-up, dust at the tally, and the first run at the hunter's page.** Every test passed first. It was built on the branch `hunter-page`, which is still on GitHub and now the same as `main`. It changed the Worker (a new `art` table and four `/api/art` routes), so this was also a Worker deploy. How branches are used from here (he asked about gitflow the same day): `main` stays what the table is using, work goes on a short branch, and the branch is merged when he says. The README has a new section, "How it is built", written for the two collaborators who asked what the project is made of.
2. **The 12+ is settled: "this is the one for sure, I love this look" (Jacob, 2026-10-10).** He had said the gold edge and fire "looks cheap or pasted on" and is "too much, too long", asked to be shown three, and chose **the dice**: a gold ring and a spray of sparks burst from each die, the dice hop, and the total turns gold for a moment. The other two looks and the picker have been taken out. **A level-up follows it** (his ask, the same night: "something in the same spirit of the dice burst"): rings and sparks at the level number on My sheet, the number jumps and lands gold, its card glints. The gold edge and the flames are gone from the page altogether. **Jacob: level a hunter up and judge it in motion.** Also new the same night: a badge stamping down at the tally now kicks up dust.
3. **Jacob to try the hunter's page**: Hunter tab, **My page**. What is there: six frames drawn in code (journal page, wanted poster, agency dossier, tarot card, dog tag, scrap plate; each playbook starts on one that suits it), a trim color (any ink, or Match my dice), a mark from the 351 sigils with a search box, a title under the name with Suggest one, a background (six of the journal's textures, or your own picture) with Dim and Blur, six showcases you tick and order (Badge case, Signature, About, The dice, Career, Gallery), and **Your pictures**: up to six uploads kept at the table, each usable as a background, a card frame, a portrait frame or a gallery picture. On the Party tab every card wears its look and has **Open page**. The mark shows beside names in the seat list and the roll feed. The card picture now has the title, the mark, the trim color and the pinned badges (which finishes J6).
   - **Uploads need the live table**, and before this push they had only been run against the local Worker. First things to try on the real site: upload a picture and a frame with a clear middle, use them, and have a second player open the page.
   - Not judged by eye yet: the frames in motion on a phone, an uploaded frame (the Border slider), and long names in the dossier and dog tag frames, which use a typewriter face.
4. **He said 3D dice, dice sounds and the Luck candles are all good** (2026-10-10). Those three are off the waiting list below.
5. **He and the Keeper and players will test over the next couple of days** (the shared table, the session card, ending an episode and a session). Expect notes, and fix those before anything new.
6. **After that, my pick of what is next** (he said to go on with what I want once these are done): portrait treatments (L8), then a flame or ember frame (L10). (The puff of dust when a badge stamps down was done the same night.) D2 is half done: the mark picker has a search box, the dice maker's sigil picker should get the same one.

## For Jacob to answer: badges and the hunter's page

[SPEC-CARDS.md](SPEC-CARDS.md) was revised on 2026-10-10 with what he said that day: the badges are liked, make them deeper, every icon should make sense, add textures, and the card should be customizable "at the level of someone's Steam page", with frames chosen from ones drawn in code or uploaded as the player's own artwork. He has been sent the sheet of 63.

Still open. None of these stops J1, and the spec says what I will build to if he does not answer:

- **The assumptions (A1 to A9 in the spec).** The three that change the build most: only hunters shared with the table earn badges; a session starts by itself at the first shared roll after three quiet hours; a miss rescued with Luck still counts as a miss.
- **The 63 badges.** Any to drop, add or re-rule? Are the roast lines the right amount of rough? Is the 3rd, 6th and 10th time the right pace for ranks?
- **Five pinned badges** on a card: right number?
- **Uploads:** six pictures a player, shrunk under 700 KB each, and the Keeper can remove any of them. Right?
- **A guestbook** on each hunter's page: wanted?
- **The order:** should any of the hunter's page jump ahead of finishing the awards?

## Downloaded on 2026-10-10 (not in the repo)

Jacob approved these that day. They are in `Hunters Journal/downloads/`, beside the repo, each in its own folder, with the zips in `downloads/zips/`.

| What | From | Size | License | Used yet |
|---|---|---|---|---|
| `sigil-cache/`: 284 icons and two fonts | game-icons.net (its GitHub repository) and the Noto fonts | 1.4 MB | CC BY 3.0; SIL OFL 1.1 | yes: `sigils.js` is made from it. 99 of the icons are new; the rest are the ones already in the journal, fetched again because the first download folder was gone |
| `kenney-smoke/`: 77 smoke, explosion and flash sprites | kenney.nl, Smoke Particles | 6.0 MB zip | CC0 | yes: `img/fx-puff.webp` is eight of its white puffs (`tools/make_puff.py`), the dust a badge kicks up when it stamps down at the tally |
| `unity-Flame02/`, `unity-Flame03/`, `unity-SmallFlame01/`: three flame flipbooks, 64 frames each (16 by 4), as TGA and EXR | Unity Labs' free VFX flipbooks | 17.9 MB of zips | CC0 | no (Flame02 was, for the big moments, until 2026-10-10). Meant for a flame frame on the hunter's page (L10) |

To use a flipbook, write a tool beside `tools/make_candles.py` that cuts the frames wanted out of the TGA, shrinks them and saves a strip into `img/`; the page then steps through it the way the candle flame does.

## Work plan progress

Chunk IDs are defined in [WORKPLAN.md](WORKPLAN.md).

| Chunk | What | State |
|---|---|---|
| A1, A2, A4, T1, T2, T3, C1, B1 to B3, N1, R1 | Small wins, timeline and undo, the ritual, looks and inks, more than one hunter, names, ratings | built, tested and pushed to `main` 2026-10-09. **Jacob:** try them |
| H0 | The Keeper's guide | built, tested and pushed to `main` 2026-10-09. **Jacob:** check it against the reference sheets |
| G0 | Backend trial | local half passed. On the real account the Party tab says "Live" (Jacob, 2026-10-10); two people at once is still untried |
| G1, G3 | The page talks to the Worker; live hunter cards | built, tested and pushed to `main` 2026-10-09. The seam is smaller than planned: `tableOn()`, `myId()` and `tbl`, with the claude.ai code left in place beside it |
| G2c | The Worker deploys with the site | root `wrangler.jsonc` changed and pushed 2026-10-09 |
| G4 | Shared roll feed | built and tested: each roll with the roller's own dice, a quiet clatter and a screen-reader line for someone else's roll, and a switch for both in Settings. **Jacob:** judge the clatter by ear |
| G6 | Roles and the Keeper | built and tested. The Keeper's email is set on the Worker (Jacob, 2026-10-10) |
| H1a, H1b, H1c | Handouts: the server, the Keeper's desk, the scene board and pinned banner | built, tested and pushed to `main` 2026-10-09 |
| H2 | The Keeper's overview | built and tested, at the foot of the Keeper's desk |
| H3 | Threat cards in Case files | not started. Ask the Keeper if wanted |
| G5, G7, G8 | Discord from the server, retiring the claude.ai path, a cloud copy of each journal | not started |
| A3, C2, D, E, F, I | See WORKPLAN.md | not started |
| J0 | The badge list and the token: 63 badges, five kinds, ranks, textures, icons | built, tested and pushed to `main` 2026-10-10 (`tests/t27.js`). Nothing shows a badge yet |
| J1 to J5, J9 | Session awards: counting, the rules, running the session (with episodes), the tally, badges on the hunter, milestones | built, tested and pushed to `main` 2026-10-10 (`tests/t29.js`, `t30.js`, `t31.js`). Not yet seen working on the real account |
| J6 | Badges on the card picture | built and tested 2026-10-10 (`tests/t32.js`), with the hunter's page. Pushed to `main` the same night |
| J7, J8 | Jacob's pass over the names and lines; the Keeper asks the end-of-session questions for the table | not started |
| L0 | Crop for the round portrait | built, tested and pushed to `main` 2026-10-10 (`tests/t28.js`). **Jacob:** try it with his own photo |
| L1 to L7 | The hunter's page: a mark and a title, colors, the page and its showcases, six frames in code, the art locker, your own background, your own card frame and portrait frame | built and tested 2026-10-10 (`tests/t32.js`). Pushed to `main` the same night. **Jacob:** try My page on the Hunter tab |
| L9 (part) | More showcases | Career and Gallery are built. Bonds, Trophy kills and Fallen are not |
| L8, L10 to L13 | Portrait treatments, motion, a guestbook, card codes, wear and tear | not started |

## Where the work is

| Branch | What it holds | State |
|---|---|---|
| `main` | Everything pushed: the dice work, the Luck candles, the first-night pieces, the hunter card, the 2026-10-09 morning batch, and the shared table with the Keeper's area (the Worker in `worker/` now deploys with the site) | Pushed 2026-10-09, twice, and three times on 2026-10-10 (the third is the hunter's page batch, see Start here): first the punchier big moments, the round portrait's crop, 99 more sigils and the badge list and token; then the session awards (counting, episodes, the Keeper's controls, the tally, badges on the hunter) and the gold 12+ |
| `hunter-page` | The same as `main` since it was merged on 2026-10-10 | Merged and pushed. Can be deleted, or reused for the next batch |

Every branch from before 2026-10-09 was merged or replaced, and all were deleted that day. The first drawing of the Luck candles (commit d3358c3) went with them; the candles in `main` replaced it.

Pushing `main` deploys. Pushing any other branch does not.


## Before the session on Wednesday 2026-10-14

- [ ] With one friend: both open the Party tab, both turn on "Show my hunter and my rolls to the table", roll once each, and the Keeper shows one handout with a picture. That is the whole shared table in five minutes.
- [ ] Have one friend run a short practice: build a hunter, roll five moves, take harm, spend Luck.
- [ ] **Jacob:** tell the Keeper about "Running the game (for the Keeper)" in the Guide and the Keeper's desk on the Party tab, and read the guide against pages 5 and 6 of the reference PDF.
- [ ] **Jacob:** ask the Keeper whether threat cards (H3) are wanted.
- [ ] **Jacob:** tell the Keeper about "The session" on the Keeper's desk: nothing to press to start, "End the episode" if the story is not finished, "End the session" when it is.
- [ ] **Jacob (optional, for A3):** make a test channel and webhook in Discord so a real post can be tried.

## Waiting on Jacob's eye and ear

All of this is live and none of it has had his review yet (nor has anything from 2026-10-09: see Start here). 3D dice and sound are both off until a player turns them on.

- [x] **3D dice, dice sounds and the Luck candles: "all good" (Jacob, 2026-10-10).** Kept below for the detail on sounds, in case he wants to go finish by finish later.
- [ ] **Dice sounds (F1), finish by finish.** Good overall (above); nothing has been tuned one at a time. A bounce is a die half and a tray half chosen separately, so there are 21 listens in all (14 finishes, 7 trays), not 98 pairs. Turn sound on and use "Hear these dice" in the dice maker, and note which are wrong. From the first, made-up pass: gem was the only die sound he liked, and leather and felt should land as more of a thud.
- [x] **The 12+.** Settled on the third try (2026-10-10): sparks and a ring at the dice. See Start here and "Decided".
- [ ] **A level-up.** Redone 2026-10-10 in the spirit of the dice burst, at his ask: rings and sparks at the level number on My sheet. Not seen by him in motion yet.
- [ ] **The hunter's page.** My page on the Hunter tab: the six frames, the colors, the showcases. See Start here.
- [ ] **The tally's reveal.** A token stamps down for each award, about two seconds each (a second and a half past twelve awards), with Next and Skip. Is that the right pace for a night with thirty awards?
- [ ] **A friend's roll.** With a second person at the table and sound on: is the quiet clatter of their dice welcome, and is it the right loudness? It can be switched off under Settings.
- [ ] **Portrait photos.** They were kept at 420px and sent to the table at 160px, which looked soft; from 2026-10-09 they are kept at 900px and sent at 360px. A photo added before that stays soft on My sheet and in the card picture until it is added again (the original was never kept). The copy on the Party tab is remade by itself, a little sharper.
- [ ] **Hunter card.** Open Save hunter card on My sheet with a real hunter and a photo, and drop the picture in the group chat to see how it reads there.
- [ ] **Start here and the Play lookup.** Read the wording as a first-time player would: the three steps on the Guide, and the "I want to..." list on Play.

## Frame animations

Jacob asked (2026-10-10) about open source frame animations for hunter cards, badges and the big moments. He notices motion, and one shape nudged by a transform reads as unfinished to him, so real frames are worth having. He approved two downloads the same day, which are now on disk (see "Downloaded on 2026-10-10" above): Kenney's Smoke Particles and three Unity flame flipbooks.

- [x] **Flames on the big moments.** Done 2026-10-10 and taken out again the same day: Jacob found them cheap on a 12+, and good news now happens at the dice and at the level number. `tools/make_fx.py` still makes the strip, for a flame frame on the hunter's page (L10).
- [x] **A badge stamping down** at the reveal (J4): done 2026-10-10, dust from `img/fx-puff.webp` (`puffsHTML`). **Jacob:** judge it in motion at the next tally.
- [ ] **Flame, ember and smoke frames for the hunter's page** (L10).
- Other leads, not downloaded: [Fire FX by Mikodrak](https://opengameart.org/content/fire-fx-burning-fire-animation) (CC0, a 40-frame looping flame, 1.2 MB); Kenney's Particle Pack (CC0, the pack the candle flame came from: sparks, flares, scorch marks); the other 25 Unity flipbooks (fireballs, explosions, wispy smoke). Pixel-art packs are plentiful but would clash with the journal's look. Lottie needs a player script and its free files are not CC0.
- **How the page plays them:** the way the candle flame does, a strip of frames stepped through by a CSS `steps()` animation, loaded only if the file is there. No library.

## Dice maker

- [ ] D1: Let the preview dice be turned by dragging, to look at every face.
- [ ] D2: A search box in the dice maker's sigil picker (there are 351 now). The hunter's page has one for marks (`czMarks`, 2026-10-10): use the same.
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
- **Good news and bad news look different (Jacob, 2026-10-10).** A miss keeps the red burnt edge and the shake, which he likes. The gold edge with fire for a 12+ did not land either.
- **A 12+ happens at the dice (Jacob, 2026-10-10: "this is the one for sure, I love this look").** A gold ring and sparks from each die, a hop, the total in gold. Nothing at the edge of the screen. Chosen from three; the other two were a stamp beside the total and a band of light across the page.
- **A level-up is in the same spirit (Jacob, 2026-10-10):** rings and sparks at the level number. Bad news is at the edge of the screen (the miss, which he likes); good news is where the player is looking.
- **The hunter's page takes a bit of everything at once (Jacob, 2026-10-10):** asked whether to start with frames, the page or uploads, he said a combination of all three, so the first run built some of each.
- **A session can take more than one night (Jacob, 2026-10-10).** The Keeper ends an episode "to be continued" and the next roll carries the same session on; badges come only when the Keeper ends the whole session. A quiet gap of three hours also begins a new part by itself, so nothing is lost if nobody presses anything. This replaced the earlier plan of a new session after three quiet hours and a list of un-ended sessions.
- **The group plays by the standard rules (Jacob, 2026-10-10).** Use Magic keeps its name; nothing is renamed for The Long Dry.
- Rules stay as built from the rulebook. A how-to-play video was checked on 2026-10-08 and nothing was changed to match it, including adding a "the Keeper never rolls" line to the Guide.
- **Big moments burn the edge of the screen; nothing flashes from the middle (Jacob, 2026-10-09).** The white double flash on a 12+ and the brass burst on a level-up are gone.
- **Dark is the default look for everyone (Jacob, 2026-10-09: the light look is too bright and jarring).** Settings still offers Light and My device. A journal saved before this, which held "follow my device" without anyone having picked it, opens dark too.
- **Ratings are not set by hand (Jacob, 2026-10-09; this replaces the 2026-10-08 decision to keep the hand-set range).** The sheet says "pick one line", so the builder offers only the playbook's lines, and after that a rating changes only through a level-up (or The Crooked's skill perk). The adjust buttons are gone from the builder, My sheet and the Roller. Once a hunter has levelled up, the lines lock, so tapping one cannot undo the level-ups. Old saves with hand-set ratings keep them and can pick a line while at level 0.
- Sigils are one-color stamps in the pip color, not full-color pictures (Jacob, 2026-10-08).
- 3D dice are flown along a set path to the numbers already rolled. No physics library (Jacob, 2026-10-08).
- Players' rolls and hunter cards share one switch, "Show my hunter and my rolls to the table", off by default (2026-10-09, my choice, open to Jacob changing it): one plain consent, and a player trying dice alone at home does not fill the table's feed.
- A player can fetch a Keeper's picture only while it is on a shown handout. A draft's picture answers "not found" to everyone but the Keeper (2026-10-09).
