# To do

Written 2026-10-08. Next session is around 2026-10-19. Feature details are in [SPEC.md](SPEC.md); this is the running list of what is left and what is waiting on whom.

## Before the session on the 19th

- [ ] **Jacob:** add the other players' emails to the Cloudflare Access list. Nobody else can open the site until this is done.
- [x] Photo textures and the History step are live (pushed and deployed 2026-10-08).
- [ ] Have one friend open the site a few days early and run a short practice: build a hunter, roll five moves, take harm, spend Luck.
- [ ] **Jacob:** ask the Keeper whether Use Magic keeps its name in The Long Dry or gets renamed to fit the setting.

## Built, waiting on Jacob's review

Each of these is finished and tested on its own branch. They all edit `index.html`, so merge them one at a time and run `npm test` after each.

- [ ] **3D dice and the Fuel finish** (`fuel-dice`). Judge the swish and the overall look in motion. Try it on a phone.
- [ ] **Luck candles** (`luck-candles`). Jacob: "the look could use some improvements." Review together with the sounds.
- [ ] **Dice sounds** (`dice-sounds`, which now also contains everything on `fuel-dice`). Recorded hits from dice-box-threejs went in on 2026-10-08: plastic, metal and wood dice on felt, wood tray and wood table. Glass taps and soft thuds from Kenney's CC0 Impact Sounds were added the same day: gem and fuel dice now play a sped-up glass tap with the made-up ring Jacob liked on top, and leather and felt have a low thud under them. Bone, stone and slate still borrow the nearest recording at a different speed. Needs his ear: use "Hear these dice" in the dice maker to try each die on each tray, and note which pairs are wrong. Notes from the first, made-up pass: gem was the only die sound he liked, the others did not match up, and leather and felt should land as more of a thud.

### Recordings for the sounds

The first pass was made entirely in code. Real recordings, sorted by die and by surface, give a truer starting point. Found 2026-10-08; licenses are as listed on each page and need a second look before anything ships.

- [3d-dice/dice-box-threejs](https://github.com/3d-dice/dice-box-threejs) (`public/sounds`): **in use since 2026-10-08**, see `snd/README.md`. The closest fit. Short hits split by die (plastic, metal, wood, coin) and by surface (felt, wood table, wood tray, metal), 75 small files. The repo is MIT, but it does not say where the recordings came from, so ask before shipping them.
- [Kenney Casino Audio](https://opengameart.org/content/54-casino-sound-effects-cards-dice-chips): CC0, 12 dice handling sounds (throws, shakes, grabs). No materials or surfaces named.
- [Halfwits and Failed Crits, Rolling Dice](https://halfwitsfailedcrits.itch.io/sfx-pack-rolling-dice): CC0, pay what you want, studio recorded, one to ten dice at a time.
- [2 dice roll, 29 throws](https://lpc.opengameart.org/content/2-dice-roll-29-throws): CC0, two dice, 29 takes.
- [Freesound](https://freesound.org): single clips, license varies by clip, so filter for CC0. Useful ones seen: metal dice on wood (LoafDV), dice on a wood table with many variations (eduardvlog), plastic dice on hard wood (dermotte).
- [Rogue Waves, Cards and Dice](https://rogue-waves.itch.io/cardanddice): not free (24 euros), but the only pack found that records the same dice on felt, wood and cork. Worth it only if the free ones fall short.
- Nothing found that is labelled glass or gem dice, after several searches. Leads for glass, gem, leather and slate (2026-10-08, none downloaded or heard yet):
  - [Kenney Impact Sounds](https://kenney.nl/assets/impact-sounds): **in use since 2026-10-08** for glass and for the thud under leather and felt. CC0 confirmed in the pack's own license file. It also has ceramic plate, tin, plank and metal impacts if slate or a metal tray want trying.
  - Glass marbles are the nearest real thing to a glass die. On Freesound: [D43thsilence's Marble Sounds Pack](https://freesound.org/people/D43thsilence/packs/41780/) (two marbles colliding, a marble hitting wood, falling on a wooden floor) and [Anthousai's glass marbles in a ceramic bowl](https://freesound.org/people/Anthousai/packs/25344/). Neither pack page shows its license; check each clip.
  - [100 CC0 SFX](https://opengameart.org/content/100-cc0-sfx) and [100 CC0 SFX 2](https://opengameart.org/content/100-cc0-sfx-2) by rubberduck: CC0, a handful of glass, stone and metal hits each.
  - For a softer leather landing: [two dice clacked in the hand and rolled into a soft tray](https://freesound.org/people/WallyDM/sounds/815672/), CC0, 2.4 seconds.
  - Recording at home: a glass bead or marble dropped on a belt, a floor tile and a wooden board, a few takes each, would settle it.

## 3D dice follow-ups

- [x] Lighting moods (2026-10-08): Garage, Dusk and Lantern, each a real HDR surrounding from Poly Haven. Jacob's garage panorama is now only the stand-in while one loads. Glowing pips now give off light.
- [x] Trays with relief (2026-10-08): the four photo trays have relief worked out from their own photos, and three wasteland trays (rust, dust, concrete) come whole from Poly Haven with relief and shine maps. They have sounds too: rust rings like metal.
- [x] Die materials from real material sets (2026-10-08): metal is now worn steel and stone is granite (both ambientCG), and two new finishes, wood (oak) and rust (painted steel with rust coming through, in any body color), come from Poly Haven. Scrapyard is a starter set using rust. Bone, resin and gem still use Jacob's photos.
- [x] Six more finishes the same day, fourteen in all: Chrome, Marble, Carbon, Oil slick, Magma (its flows glow in the pip color) and Frost (a see-through die with ice cracks). Starter sets War Rig, Oil Slick and Core Sample use them. Each borrows the sound of the nearest older finish for now.
- [ ] Finishes still worth adding: copper or brass with patina, sandstone, obsidian, a second wood. Give the new finishes sounds of their own when the sounds are tuned.
- [ ] A wasteland color palette for bodies and pips (rust, sand, hazard yellow, oil black, coolant green).
- [x] Scuffed glass: in as `img/die-glass.jpg`, drawn as scratches on the Fuel shell (2026-10-08).
- [ ] The dice maker's preview is still the flat dice. Show the 3D dice there when 3D is on.
- [ ] Bring back the dimmed look before the first roll (lost when the tray moved into the 3D scene).
- [ ] Check speed on a mid-range phone. If clear dice are slow, fall back to the cheaper glass there.
- [ ] Make hold-to-shake (on `dice-sounds`) move the 3D dice and the liquid.
- [ ] Decide whether 3D should become the default once it has been through a real session.

## Sigils

- [x] Skull, antler, crescent, pentagram and pentacle traced from Jacob's artwork as one-color stamps (2026-10-08, on `fuel-dice`).
- [x] Lantern, eye and a new pupil sigil traced from a second batch (2026-10-08), after comparing every eye and lantern photo side by side. The cross stays hand-drawn.
- [ ] The gold seal and ice compass were too fine to read at die size. Redo as a flat white symbol on pure black with thick strokes if they are still wanted, then trace with `python tools/make_sigils.py <folder>`.

### Where more sigils could come from

Researched 2026-10-08. Nothing from these is in the app yet; `tests/out/sigil-research.png` shows a sample of each as stamps.

- [game-icons.net](https://game-icons.net) ([github.com/game-icons/icons](https://github.com/game-icons/icons)): 4,239 one-color SVG icons made for games. Already the right shape for a sigil, so no tracing needed. It has the wasteland ones (gas mask, jerrycan, oil drum, biohazard, radioactive, hazard sign, scorpion, vulture, cactus, tire tracks, cog, wrench) and the occult ones (pentacle, triquetra, ankh, all-seeing eye, raven, wolf head, rune stone, crossed bones). License is CC BY 3.0: free to use, but the credits must say "Icons made by" and the author's name. Two authors (Viscious Speed, Zeromancer) are CC0. Needs a credits line somewhere in the journal.
- Runes: the [Noto Sans Runic](https://fontsource.org/fonts/noto-sans-runic/about) font has all 93 Unicode runes (the Elder Futhark among them). Alchemical signs: [Noto Sans Symbols](https://fontsource.org/fonts/noto-sans-symbols/about). Both are under the SIL Open Font License, which allows this use; keep the license text with them. A letter is turned into an outline with fontTools, then it is a sigil like any other.
- Not suitable as found: the itch.io rune and alchemy packs seen were pixel art, no-derivatives, or non-commercial.
- [x] Sigil library (2026-10-08): 243 ready-made sigils in eleven groups (Wasteland, Hunter, Monsters, Beasts, Spirits, Symbols, all 22 Tarot cards, the 24 Elder Futhark runes, Elements, Zodiac, Glyphs), plus the nine classics. They live in `sigils.js` (about 255 KB), not in the page, and a Credits section names the icon authors. To add more, add an entry in `tools/make_sigil_pack.py` and rerun it.
- [ ] More sigils when wanted: game-icons has about 4,000 unused. Eight card-suit and star glyphs are not in the Noto font used and were skipped; game-icons has equivalents.
- [ ] With over 250 sigils, a search box in the picker would help.

## Gaps for new players

From the review on 2026-10-07. Small, and they help most on the first night.

- [ ] A first-run "start here" path: build a hunter, then go to Play.
- [ ] A nudge to download a backup after building a hunter and at the end of a session. Saves live in one browser on one device.
- [ ] An "I want to..." lookup on Play that points to the right move.
- [ ] Check: changing playbook halfway through the builder says clearly what will be lost.
- [ ] Check: a move marked advanced at level-up shows its 12+ result in the Roller.

## Look and setting: The Long Dry

The campaign is a post-apocalyptic wasteland, and the journal was styled as a gothic Appalachian field journal before that was known. Nothing has been rethemed yet.

- [ ] **Jacob:** decide how far to go. Candidates, most visible first: header art, name generator (Appalachian names from the 1600s to 1800s), starter dice sets, colors.
- [ ] Add new Qwen textures as they arrive with `python tools/make_textures.py <folder>`. The bone and resin grain are faint and could use stronger source photos.

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
- [ ] Delete branches that are already in `main`: `dice-maker`, `foundations`, `header-glow-and-fog`, `dice-textures`, `hunter-history`.
- [ ] `hunters-journal-repo.zip` in the folder above the repo is an old copy from 2026-10-04. Remove it once nothing needs it.
- [x] Every branch is on GitHub (pushed 2026-10-08). Only `main` triggered a Cloudflare build.

## Decided, not doing

- Rules stay as built from the rulebook. A how-to-play video was checked on 2026-10-08 and nothing was changed to match it, including the hand-set ratings range and adding a "the Keeper never rolls" line to the Guide.
