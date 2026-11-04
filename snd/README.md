# Dice recordings

Short recordings of dice hits, used by the dice sounds when sound is switched on. They are optional: without them the page makes its own sounds.

## Where they came from

**Kenney's Impact Sounds** (`dicehit_glass`, `surface_soft`): [kenney.nl/assets/impact-sounds](https://kenney.nl/assets/impact-sounds), version 1.0 from 2019, released as CC0, so free for any use with no credit required. `python tools/make_sounds.py <the pack's Audio folder>` remakes them.

This is a public copy, so it keeps only recordings whose license is stated. The plastic, metal and wood dice and every tray use the page's made-up sounds (`SFX`, `TRAYSFX` in `index.html`).

## What is here

| Files | What | Used for |
|---|---|---|
| `dicehit_glass1` to `5` | a light tap on glass (Kenney `impactGlass_light`) | gem and fuel dice, played three to four times faster with a made-up ring on top |
| `surface_soft1` to `5` | a soft, low thud (Kenney `impactSoft_medium`) | nothing at the moment; kept for when tray recordings come back |

## How they are used

`SNDSETS`, `DIESND` and `TRAYSND` in `index.html` say which sets exist and which finish or tray uses each, at what speed and loudness. A finish or tray with no entry uses its made-up sound.
