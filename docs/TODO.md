# To do

Written 2026-10-08. Next session is around 2026-10-19. Feature details are in [SPEC.md](SPEC.md); this is the running list of what is left and what is waiting on whom.

## Before the session on the 19th

- [ ] **Jacob:** add the other players' emails to the Cloudflare Access list. Nobody else can open the site until this is done.
- [ ] **Jacob:** say when to push `main`. It holds the photo textures and the History step, and pushing it deploys them.
- [ ] Have one friend open the site a few days early and run a short practice: build a hunter, roll five moves, take harm, spend Luck.
- [ ] **Jacob:** ask the Keeper whether Use Magic keeps its name in The Long Dry or gets renamed to fit the setting.

## Built, waiting on Jacob's review

Each of these is finished and tested on its own branch. They all edit `index.html`, so merge them one at a time and run `npm test` after each.

- [ ] **3D dice and the Fuel finish** (`fuel-dice`). Judge the swish and the overall look in motion. Try it on a phone.
- [ ] **Luck candles** (`luck-candles`). Jacob: "the look could use some improvements." Review together with the sounds.
- [ ] **Dice sounds** (`dice-sounds`). Needs a session of tuning by ear. Notes from the first pass: gem was the only die sound he liked, the other materials and trays did not match up, and leather and felt should land as more of a thud. When this merges with `fuel-dice`, the Fuel finish needs its own entry in the `SFX` table.

## 3D dice follow-ups

- [ ] Reflection panorama: Jacob is generating it. Save as `img/env.jpg` (2:1). No code change needed.
- [ ] Scuffed glass texture: Jacob is generating it. Wire it in as surface wear on the clear shell.
- [ ] The dice maker's preview is still the flat dice. Show the 3D dice there when 3D is on.
- [ ] Bring back the dimmed look before the first roll (lost when the tray moved into the 3D scene).
- [ ] Check speed on a mid-range phone. If clear dice are slow, fall back to the cheaper glass there.
- [ ] Make hold-to-shake (on `dice-sounds`) move the 3D dice and the liquid.
- [ ] Decide whether 3D should become the default once it has been through a real session.

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

- [ ] Delete branches that are already in `main`: `dice-maker`, `foundations`, `header-glow-and-fog`, `dice-textures`, `hunter-history`.
- [ ] `hunters-journal-repo.zip` in the folder above the repo is an old copy from 2026-10-04. Remove it once nothing needs it.
- [ ] The feature branches are only on Jacob's laptop. Push them to GitHub for safekeeping (pushing a branch other than `main` does not change the live site, but confirm that in Cloudflare first).

## Decided, not doing

- Rules stay as built from the rulebook. A how-to-play video was checked on 2026-10-08 and nothing was changed to match it, including the hand-set ratings range and adding a "the Keeper never rolls" line to the Guide.
