# Dice recordings

Short recordings of dice hits, used by the dice sounds when sound is switched on. They are optional: without them the page makes its own sounds.

## Where they came from

Two sources.

**Kenney's Impact Sounds** (`dicehit_glass`, `surface_soft`): [kenney.nl/assets/impact-sounds](https://kenney.nl/assets/impact-sounds), version 1.0 from 2019, released as CC0, so free for any use with no credit required. `python tools/make_sounds.py <the pack's Audio folder>` remakes them.

**dice-box-threejs** (everything else): copied on 2026-10-08 from `public/sounds` in [3d-dice/dice-box-threejs](https://github.com/3d-dice/dice-box-threejs) at commit `6945e00` (2022-10-26). That repository is under the MIT license (copyright 2022 3D Dice).

**Open question (dice-box-threejs files only):** the repository does not say who made the recordings or under what terms. The project describes itself as based on "Major's 3D Dice", and the same file names appear in the Dice So Nice module for Foundry VTT, which is AGPL. Until that is answered, treat these as fine for a private table and not cleared for anything public. If the journal is ever opened up, replace them with recordings whose license is stated (see docs/TODO.md for candidates) or ask the 3D Dice maintainers.

## What is here

| Files | What | Used for |
|---|---|---|
| `dicehit_plastic1` to `15` | plastic dice knocking together | bone (slowed a little) and resin |
| `dicehit_metal1` to `12` | metal dice knocking together | metal |
| `dicehit_wood1` to `12` | wooden dice knocking together | stone (slowed) |
| `surface_felt1` to `7` (no 6) | a die landing on felt | felt, and leather (slowed) |
| `surface_wood_tray1` to `7` | a die landing in a wooden tray | wood |
| `surface_wood_table1` to `7` | a die landing on a wooden table | slate (sped up) |
| `dicehit_glass1` to `5` | a light tap on glass (Kenney `impactGlass_light`) | gem and fuel dice, played three to four times faster with a made-up ring on top |
| `surface_soft1` to `5` | a soft, low thud (Kenney `impactSoft_medium`) | laid under the felt recording for leather, and more quietly for felt |

Left out of the dice-box-threejs copy: `dicehit_coin` and `surface_metal` (nothing uses them yet; a metal tray would), and `surface_felt6` (silent).

## What is still an approximation

Nothing found was recorded with bone, stone, glass or gem dice, or on leather or slate. Those use the nearest recording at a different speed: bone is slowed plastic, stone is slowed wood, glass is a sped-up tap on a pane, leather is slowed felt over a thud, slate is a sped-up wooden table.

## How they are used

`DIESND` and `TRAYSND` in `index.html` say which set each finish and tray uses, at what speed and loudness. Every bounce plays one take from the tray's set and one from the die's set. Harder bounces pick louder takes.
