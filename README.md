# Hunter's Journal

A private companion app for a Monster of the Week campaign: a plain-English guide, a dice roller that knows the moves, a guided hunter builder for all 12 playbooks, a mid-session Play screen, case files, a bestiary, and a shared table for the group.

The dice are the showpiece. Players can make their own: 14 finishes, 7 trays, about 350 sigils, glowing pips, saved sets and codes to trade with friends. An optional 3D mode rolls them in a lit scene with three lighting moods, and optional sound plays recordings matched to the die and the tray.

At the table, everyone sees each other's hunters and rolls live, the Keeper posts scenes and pictures, and when the Keeper ends a session the journal hands out badges for how the night went. Each hunter has a page the player lays out: a frame, colors, a mark, showcases, and their own uploaded artwork.

## How it is built

**The page.** One file, `index.html`: HTML, CSS and plain JavaScript written in ES5 style (`var`, `function`, no modules). No framework and no build step; you edit the file and reload. The only library is three.js, kept in `vendor/` and loaded on demand for the optional 3D dice. Sound is the Web Audio API, and the hunter card picture is drawn on a canvas. Art, sounds and the sigil library are all optional: the page checks for each file and works without it, including opened straight from disk.

**The server.** A small Cloudflare Worker in `worker/` (modern JavaScript, ES modules) that only answers under `/api/`. Behind it is one Durable Object, "the table", with its own SQLite storage. Pages talk to it over a WebSocket, and it sleeps between messages. Everything else is served as static files, so a fault in the Worker cannot take the journal itself down.

**Where things are kept.**

| Kept in your own browser (localStorage) | Kept at the table (Cloudflare) |
|---|---|
| Your whole journal: hunters and spare hunters, sheets, badges, dice, settings, case files, bestiary, notes, the session timeline | Who is at the table: each sign-in email (never sent to anyone else's page) and a display name |
| Your hunter's full-size portrait | The card of each hunter a player has chosen to show: name, playbook, ratings, Luck, Harm, XP, gear and move names, a small copy of the portrait, the page's look, and that player's dice |
| Backups, which are a JSON file you download | The last 50 rolls, every roll of the session being played, and the last 20 finished session tallies |
| | The Keeper's handouts and their pictures, and up to six uploaded pictures a player |

Nothing reaches the table until a player turns on "Show my hunter and my rolls to the table". Notes, bonds, backstory, case files and the bestiary never leave the browser. There are no accounts or passwords of our own: a journal lives in one browser, and the backup file is how you move it.

**Sign-in.** Cloudflare Access sits in front of the whole site with an email allow-list. The Worker checks the signed Access token on every `/api/` request (it does not trust headers a page could set), and the Keeper is whoever is listed in a Worker secret.

**Other people's data.** Whatever a page sends is cleaned by the Worker (`worker/clean.mjs`: known keys, clamped numbers, cut strings, pictures checked by their first bytes) and checked again by every page that receives it, then escaped where it is drawn. A hunter's page look is choices from fixed lists plus picture ids, never CSS or markup.

**Hosting.** Cloudflare Workers on the free plan. Pushing `main` runs `npm run build` (which copies the site into `dist/`) and deploys the page and the Worker together.

**Around it.** Python scripts in `tools/` make the generated files (textures, sigils, sound sets, the embedded playbooks). Tests are Node scripts that drive real browsers with Playwright; the table tests start the Worker locally with `wrangler dev` and play several people at once.

## Run it

    npm start            # serves on http://localhost:5173
    # or just open index.html in a browser (3D dice and recorded sounds need the server)

Saves go to the browser's localStorage. Use Settings and backup in the app to download a backup file or restore one.

## Layout

    index.html           the whole app (HTML, CSS, JS)
    sigils.js            the sigil library (generated)
    manifest.webmanifest lets a phone or desktop install the page as an app
    sw.js                keeps an offline copy once the page has been opened over http(s)
    img/                 art, die and tray textures, 3D lighting
    snd/                 dice recordings (see snd/README.md for where they came from)
    vendor/              three.js for the 3D dice, and licenses
    data/                the 12 playbooks as JSON (see data/SCHEMA.md)
    tools/               scripts that make the generated files (textures, sigils, sounds, lighting, embedded playbooks)
    worker/              the shared table and the Keeper's handouts: a Cloudflare Worker the Party tab talks to under /api/
    tests/               Playwright checks (npm install, then npm test)
    docs/TODO.md         the running list: what is left and who it is waiting on
    docs/SPEC.md         feature specs
    docs/SPEC-CARDS.md   session awards and the hunter's page
    docs/WORKPLAN.md     the remaining work cut into chunks, with a proposed order
    docs/ROADMAP.md      the older plan for shared login and a live party table (Supabase)
    CLAUDE.md            how the code is laid out

`npm run build` copies what the site needs into `dist/` for hosting. Pushing `main` deploys it.

## Working on it

**Pushing `main` puts the site live for the whole table**, about half a minute after the push. So:

1. Make a branch for your change. Pushing a branch changes nothing on the live site. (Cloudflare shows a failed "preview" check on branches; that is expected and can be ignored. A failed check on `main` is not.)
2. Run the tests before it goes to `main`:

       npm install          # once
       npm test             # about twenty minutes; every file prints TOTAL and FAIL counts
       node tests/t18.js    # or just the file for what you touched; CLAUDE.md lists what each one covers

3. Open a pull request, or tell Jacob, and merge when the tests pass.

Things that will save you time:

- Almost everything is in `index.html`, in plain ES5 (`var`, `function`, no modules). Edit it directly; there is no build step for the page.
- `CLAUDE.md` is the map: how the state is laid out, what each part is called, and the rules that keep it working. `docs/TODO.md` is what is left to do.
- Playbook content is in `data/*.json`. After changing it, run `python3 tools/embed_data.py`.
- The page is dark unless a player picks Light or My device in Settings, so look at new work in dark first, and at phone width (390px).
- To try the shared table on your own machine: `npm run build`, then `npx wrangler dev --config worker/wrangler.jsonc --var DEV:1`, and open the address it prints with `?as=yourname` on the end.
- To check something in Safari's engine: `npx playwright install webkit` once, serve the folder, then `HJ_URL=http://localhost:5173 node -r ./tests/webkit.js tests/t18.js` (see `tests/webkit.js`).
- Keep the repo private: see the notes on playbook text and on the dice recordings below.

## Playbook text

The playbook summaries are plain-English paraphrase written for this table. Ratings, harm, armor, tags and pick counts are exact. Keep the repo private, and treat a printed playbook sheet as the final word on any detail.

## Credits

- Some dice sigils are icons by Lorc, Delapouite, Skoll, Caro Asercion, Carl Olsen, Cathelineau and DarkZaitzev from [game-icons.net](https://game-icons.net), CC BY 3.0.
- Runes and alchemical signs are outlines from the Noto fonts, SIL Open Font License 1.1 (`vendor/OFL-Noto.txt`).
- 3D lighting, trays and die materials: [Poly Haven](https://polyhaven.com) and [ambientCG](https://ambientcg.com), CC0.
- Dice sounds: [Kenney](https://kenney.nl) (CC0) and the dice-box-threejs project (see `snd/README.md`).
- 3D dice are drawn with [three.js](https://threejs.org), MIT (`vendor/three.LICENSE`).
- Interface icons are [Phosphor](https://phosphoricons.com), MIT (`vendor/phosphor.LICENSE`), inlined in `index.html`.
