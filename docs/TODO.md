# To do

Last tidied 2026-10-09. Next session is around 2026-10-19. Feature details are in [SPEC.md](SPEC.md); the remaining work is cut into chunks in [WORKPLAN.md](WORKPLAN.md); this is the running list of what is left and who it is waiting on. Finished work is not listed here: it is in the git history.

## Start here next time

Written 2026-10-09, after the work plan was cut into chunks and a first batch of it was built.

1. **Hear what Jacob found.** He is trying the live site: the candles, the hunter card, the Start here card and the "I want to..." list on Play are all new and none has had a second look. Fix what he reports first.
2. **Try what was built on 2026-10-09** (committed on the branch `workplan-wave1`, not merged and not pushed, so not live). Every test passes. Say what to change before any of it goes live.
   - On Play: Copy for chat on the result card, This session with Undo, End the session.
   - Under Settings: the Look and ink choice (six inks, two for The Long Dry).
   - On the Hunter tab: New hunter, Switch, Retire or mark lost, and the shelf.
   - In the Guide: the Keeper's guide, "Running the game".
   - In the builder: **Surprise me** now deals names from six worlds (plain, funny and over the top), and **More ideas** under Catchphrase deals new lines. **Ratings are now only the line you pick**, plus level-ups; the adjust-by-hand buttons are gone from the builder, My sheet and the Roller. The Crooked's skill perk has its own picker on the Moves step.
3. **Backend trial (G0): the local half passed** (50 checks against a real local Worker and Durable Object, with two browsers as two players). A card change reached the other browser in 7 ms; a closed connection catches up on return; a 600 KB picture goes up and comes back with the right headers; forged identities are refused. What is left needs a Cloudflare account: a login on this machine (`npx wrangler login`), the Access team name and application audience tag from the Zero Trust dashboard, and a decision on how to test behind Access (a throwaway hostname in the Access policy, or approval to put a dormant Worker on `main`). `wrangler` is installed (yes from Jacob, 2026-10-09). Tracks G and H carry on from here once that is settled.
4. **Carry on down the work plan** (WORKPLAN.md, "Proposed order"): the table seam (G1) needs no approvals and prepares the client for the Worker.

Still blocking the first session: the other players cannot open the site until their emails are on the Cloudflare Access list (below).

## Work plan progress

Chunk IDs are defined in [WORKPLAN.md](WORKPLAN.md). Everything built on 2026-10-09 is committed on the branch `workplan-wave1` (not merged into `main`, not pushed, so not live).

| Chunk | What | State |
|---|---|---|
| A1 | Make the t5 check deterministic | built and tested 2026-10-09, on branch `workplan-wave1` |
| A4 | Honest message in the Party tab | built and tested 2026-10-09, on branch `workplan-wave1` |
| A2 | Copy roll to chat | built and tested 2026-10-09, on branch `workplan-wave1` |
| T1 | Session timeline | built and tested 2026-10-09, on branch `workplan-wave1` |
| T2 | Undo | built and tested 2026-10-09, on branch `workplan-wave1` |
| T3 | End-of-session ritual | built and tested 2026-10-09, on branch `workplan-wave1` |
| C1 | Look setting and inks (Rust, Dust) | built and tested 2026-10-09, on branch `workplan-wave1` |
| G0 | Backend trial | local half passed 2026-10-09 (`worker/`, tests t21 and t22). Real-account half waiting on Jacob. |
| B1 to B3 | More than one hunter | built and tested 2026-10-09, on branch `workplan-wave1` |
| G1 to G6 | The shared table | waits on G0 |
| H0 | The Keeper's guide | built and tested 2026-10-09, on branch `workplan-wave1`. **Jacob:** check it against the reference sheets |
| H1 to H3 | The Keeper's area (scene board and handouts) | waits on G2 and G6 |
| N1 | Surprise me names from six worlds, and more catchphrases | built and tested 2026-10-09, on branch `workplan-wave1` |
| R1 | Ratings only from the picked line and level-ups; no hand-adjusting; skill perk picker | built and tested 2026-10-09, on branch `workplan-wave1` |
| A3, C2, D, E, F, I | See WORKPLAN.md | not started |

## Where the work is

| Branch | What it holds | State |
|---|---|---|
| `main` | The live site: the dice work, the Luck candles, the builder and rules matched to the official sheets, the first-night pieces and the hunter card | Deployed 2026-10-08 |
| `workplan-wave1` | Everything built on 2026-10-09: the work plan, copy for chat, the session timeline with undo, the end-of-session ritual, looks and inks, more than one hunter, the Keeper's guide, new names and catchphrases, ratings only from the sheet, and the Worker trial (`worker/`) | Committed locally on 2026-10-09, not merged, not pushed. Branches do not deploy. |
| `first-night`, `luck-candles-v2`, `luck-candles` | Work that is now in `main`, and the first candles it replaced | Merged or replaced. Safe to delete. |

Pushing `main` deploys. Pushing any other branch does not.

## Before the session on the 19th

- [ ] **Jacob:** add the other players' emails to the Cloudflare Access list. Nobody else can open the site until this is done.
- [ ] Have one friend open the site a few days early and run a short practice: build a hunter, roll five moves, take harm, spend Luck.
- [ ] **Jacob:** ask the Keeper whether Use Magic keeps its name in The Long Dry or gets renamed to fit the setting.
- [ ] **Jacob:** read the new "Running the game (for the Keeper)" section in the Guide against the Keeper's pages of the reference PDF (pages 5 and 6), and tell the Keeper it is there.
- [ ] **Jacob:** ask the Keeper for their email (needed for the Keeper's area, G6) and whether they want the scene board and handouts (H1) and threat cards (H3).
- [ ] **Jacob (optional, for A3):** make a test channel and webhook in Discord so a real post can be tried.

## Waiting on Jacob's eye and ear

All of this is live and none of it has had his review yet. 3D dice and sound are both off until a player turns them on.

- [ ] **3D dice.** Judge them in motion: the fuel swish, the three lighting moods, the finishes. Try them on a phone.
- [ ] **Dice sounds (F1).** Nothing has been tuned by ear. A bounce is a die half and a tray half chosen separately, so there are 21 listens in all (14 finishes, 7 trays), not 98 pairs. Turn sound on and use "Hear these dice" in the dice maker, and note which are wrong. From the first, made-up pass: gem was the only die sound he liked, and leather and felt should land as more of a thud.
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

- [ ] C1: Rust and Dust inks next to the existing look, plus a Look switch (device, light, dark). Reversible, touches no art or copy.
- [ ] **Jacob:** decide how far to go beyond that. Candidates, most visible first: header art, name generator (Appalachian names from the 1600s to 1800s), colors.

## Features still to build

Detail is in [WORKPLAN.md](WORKPLAN.md); the specs they refine are in [SPEC.md](SPEC.md).

- [ ] 5. End-of-session ritual (T3)
- [ ] 6. Session timeline (T1), and undo built on it (T2)
- [ ] 7. Ink themes (C1) and ambient sound (C2)
- [ ] 8. Shared roll feed and live party (G0 to G8). The Party tab does not work on the live site today: it reads its table from `window.claude`, which only exists inside claude.ai. G1 puts that behind a seam; G0 picks the backend. Cloudflare first (Access already knows who each player is; Supabase's free projects pause after 7 days idle).
- [ ] The Keeper's area (H0 to H3): a guide for running the game, then a scene board where the Keeper posts descriptions and pictures for the table.

## Later

- [ ] T2: A general undo for mid-session mis-clicks on harm, XP and Luck. Level-ups are not covered in the first version.
- [ ] I1: A "hide the hints" setting for experienced players.
- [ ] I2: Custom and expansion playbooks.
- [ ] H2: Something for the Keeper: at least a view of everyone's Harm and Luck. Depends on feature 8.
- [ ] I3: An accessibility pass with a screen reader and keyboard only.
- [ ] A3: Post rolls to a Discord channel with a webhook (optional).
- [ ] G8: Keep a copy of each player's journal on the server (an idea, not yet asked for).

## Housekeeping

- [ ] `docs/ROADMAP.md` is partly out of date (it plans for Vercel or Netlify hosting and a claude.ai-only sign-in). A note at its top says so; G7 tidies it once the shared table is live.

## Decided, not doing

- The official playbook sheets and reference sheets are the source for rules. On 2026-10-08 all twelve playbooks, the basic and weird moves, and the harm, healing, Luck and level-up rules were compared with them line by line. What differed was fixed: the builder now asks for a playbook's own choices before moves and gear, as the sheets do; a pronouns field was added; and a few wordings were corrected (Protect Someone on a 10+, the telekinesis explosion's fire tag, two history prompts, the Divine's Boss from Beyond).
- The Harm row has eight pips where the printed sheet has seven boxes. The eighth is "8 harm kills", which the reference sheet states.
- Rules stay as built from the rulebook. A how-to-play video was checked on 2026-10-08 and nothing was changed to match it, including adding a "the Keeper never rolls" line to the Guide.
- **Ratings are not set by hand (Jacob, 2026-10-09; this replaces the 2026-10-08 decision to keep the hand-set range).** The sheet says "pick one line", so the builder offers only the playbook's lines, and after that a rating changes only through a level-up (or The Crooked's skill perk). The adjust buttons are gone from the builder, My sheet and the Roller. Once a hunter has levelled up, the lines lock, so tapping one cannot undo the level-ups. Old saves with hand-set ratings keep them and can pick a line while at level 0.
- Sigils are one-color stamps in the pip color, not full-color pictures (Jacob, 2026-10-08).
- 3D dice are flown along a set path to the numbers already rolled. No physics library (Jacob, 2026-10-08).
