# To do

Last tidied 2026-10-08. Next session is around 2026-10-19. Feature details are in [SPEC.md](SPEC.md); this is the running list of what is left and who it is waiting on. Finished work is not listed here: it is in the git history.

## Where the work is

| Branch | What it holds | State |
|---|---|---|
| `main` | The site: all the dice work (3D dice, lighting, 14 finishes, 7 trays, the sigil library, recorded dice sounds), the Luck candles, and the builder and rules matched to the official sheets | Dice work deployed 2026-10-08. The candles and the rules fixes were merged the same day and go live with the next push. |
| `luck-candles-v2`, `luck-candles` | The candle work, and the first candles it replaced | Both merged or replaced. Safe to delete. |

Pushing `main` deploys. Pushing any other branch does not.

## Before the session on the 19th

- [ ] **Jacob:** add the other players' emails to the Cloudflare Access list. Nobody else can open the site until this is done.
- [ ] Have one friend open the site a few days early and run a short practice: build a hunter, roll five moves, take harm, spend Luck.
- [ ] **Jacob:** ask the Keeper whether Use Magic keeps its name in The Long Dry or gets renamed to fit the setting.

## Waiting on Jacob's eye and ear

The dice work below is live, but none of it has had his review yet. 3D dice and sound are both off until a player turns them on.

- [ ] **3D dice.** Judge them in motion: the fuel swish, the three lighting moods, the finishes. Try them on a phone.
- [ ] **Dice sounds.** Nothing has been tuned by ear. Turn sound on and use "Hear these dice" in the dice maker to try each die on each tray, and note which pairs are wrong. From the first, made-up pass: gem was the only die sound he liked, and leather and felt should land as more of a thud.
## Dice maker

- [ ] Let the preview dice be turned by dragging, to look at every face.
- [ ] A search box in the sigil picker (there are over 250).
- [ ] More sigils when wanted: add entries to `tools/make_sigil_pack.py` and rerun. game-icons has about 4,000 unused. Eight card-suit, star and lightning glyphs were skipped because the Noto font used does not have them; game-icons has equivalents.
- [ ] The gold seal and ice compass artwork was too fine to read at die size. Redo as a flat white symbol on pure black with thick strokes if still wanted, then trace with `python tools/make_sigils.py <folder>`.
- [ ] More finishes: copper or brass with patina, sandstone, obsidian, a second wood.
- [ ] A wasteland color palette for bodies and pips (rust, sand, hazard yellow, oil black, coolant green).
- [ ] Stronger source photos for bone and resin: their grain is faint.

## 3D dice

- [ ] Check speed on a mid-range phone. If clear dice (gem, frost, fuel) are slow, fall back to the cheaper glass there.
- [ ] Bring back the dimmed look before the first roll (lost when the tray moved into the 3D scene).
- [ ] Make hold-to-shake move the 3D dice and the liquid.
- [ ] Decide whether 3D should become the default once it has been through a real session.

## Dice sounds

- [ ] Give chrome, marble, carbon, oil slick, magma and frost sounds of their own. Each borrows the nearest older finish for now.
- [ ] **Before the site is ever public:** settle the license of the recordings copied from dice-box-threejs, or replace them. See `snd/README.md`.
- [ ] Bone, stone, glass, leather, slate and concrete all use the nearest recording at a different speed, because nothing found was recorded with those. Leads not yet downloaded or heard:
  - [Kenney Casino Audio](https://opengameart.org/content/54-casino-sound-effects-cards-dice-chips): CC0, 12 dice handling sounds (throws, shakes, grabs).
  - [Halfwits and Failed Crits, Rolling Dice](https://halfwitsfailedcrits.itch.io/sfx-pack-rolling-dice): CC0, pay what you want, studio recorded.
  - [2 dice roll, 29 throws](https://lpc.opengameart.org/content/2-dice-roll-29-throws): CC0.
  - Glass marbles, the nearest real thing to a glass die: [D43thsilence's Marble Sounds Pack](https://freesound.org/people/D43thsilence/packs/41780/) and [Anthousai's marbles in a ceramic bowl](https://freesound.org/people/Anthousai/packs/25344/) on Freesound. Neither pack page shows its license; check each clip.
  - [Two dice rolled into a soft tray](https://freesound.org/people/WallyDM/sounds/815672/): CC0, for a truer leather landing.
  - Kenney's Impact Sounds (already used for glass and the soft thud) also has ceramic plate, tin and plank impacts that might suit slate or concrete.
  - [Rogue Waves, Cards and Dice](https://rogue-waves.itch.io/cardanddice): not free (24 euros), but the only pack found that records the same dice on felt, wood and cork.
  - Recording at home: a glass bead or marble dropped on a belt, a floor tile and a board, a few takes each, would settle it.

## Gaps for new players

From the review on 2026-10-07. Small, and they help most on the first night.

- [ ] A first-run "start here" path: build a hunter, then go to Play.
- [ ] A nudge to download a backup after building a hunter and at the end of a session. Saves live in one browser on one device.
- [ ] An "I want to..." lookup on Play that points to the right move.
- [ ] Check: changing playbook halfway through the builder says clearly what will be lost.
- [ ] Check: a move marked advanced at level-up shows its 12+ result in the Roller.

## Look and setting: The Long Dry

The campaign is a post-apocalyptic wasteland, and the journal was styled as a gothic Appalachian field journal before that was known. The dice maker now has wasteland trays, finishes, sigils and sets; nothing else has been rethemed.

- [ ] **Jacob:** decide how far to go. Candidates, most visible first: header art, name generator (Appalachian names from the 1600s to 1800s), colors.

## Features still to build (SPEC.md)

- [ ] 4. Hunter card image
- [ ] 5. End-of-session ritual
- [ ] 6. Session timeline
- [ ] 7. Ink themes and ambient sound
- [ ] 8. Shared roll feed and live party. Backend (Supabase or Cloudflare) is still undecided.

## Later

- [ ] More than one hunter per save (a backup character, or a new one after a death or retirement).
- [ ] A general undo for mid-session mis-clicks on harm, XP and level-up.
- [ ] A "hide the hints" setting for experienced players.
- [ ] Custom and expansion playbooks.
- [ ] Something for the Keeper: at least a view of everyone's Harm and Luck. Depends on feature 8.
- [ ] An accessibility pass with a screen reader and keyboard only.

## Housekeeping

- [ ] `tests/t5.js` has a check that depends on luck ("Mark XP reachable": it needs a miss within 25 rolls) and fails about one run in ten. Make it roll a fixed result instead.

## Decided, not doing

- The official playbook sheets and reference sheets are the source for rules. On 2026-10-08 all twelve playbooks, the basic and weird moves, and the harm, healing, Luck and level-up rules were compared with them line by line. What differed was fixed: the builder now asks for a playbook's own choices before moves and gear, as the sheets do; a pronouns field was added; and a few wordings were corrected (Protect Someone on a 10+, the telekinesis explosion's fire tag, two history prompts, the Divine's Boss from Beyond).
- The Harm row has eight pips where the printed sheet has seven boxes. The eighth is "8 harm kills", which the reference sheet states.
- Rules stay as built from the rulebook. A how-to-play video was checked on 2026-10-08 and nothing was changed to match it, including the hand-set ratings range and adding a "the Keeper never rolls" line to the Guide.
- Sigils are one-color stamps in the pip color, not full-color pictures (Jacob, 2026-10-08).
- 3D dice are flown along a set path to the numbers already rolled. No physics library (Jacob, 2026-10-08).
