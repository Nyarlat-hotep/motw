# Hunter's Journal

A private companion app for a Monster of the Week campaign: a plain-English guide, a dice roller that knows the moves, a guided hunter builder for all 12 playbooks, a mid-session Play screen, case files, a bestiary, and a party table.

The dice are the showpiece. Players can make their own: 14 finishes, 7 trays, over 250 sigils, glowing pips, saved sets and codes to trade with friends. An optional 3D mode rolls them in a lit scene with three lighting moods, and optional sound plays recordings matched to the die and the tray.

It is one static page (`index.html`) plus optional art, sounds and a sigil library. No build step, and the page works without any of the extras.

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
    docs/WORKPLAN.md     the remaining work cut into chunks, with a proposed order
    docs/ROADMAP.md      the older plan for shared login and a live party table (Supabase)
    CLAUDE.md            how the code is laid out

`npm run build` copies what the site needs into `dist/` for hosting. Pushing `main` deploys it.

## Working on it

**Pushing `main` puts the site live for the whole table**, about half a minute after the push. So:

1. Make a branch for your change. Pushing a branch changes nothing on the live site. (Cloudflare shows a failed "preview" check on branches; that is expected and can be ignored. A failed check on `main` is not.)
2. Run the tests before it goes to `main`:

       npm install          # once
       npm test             # about fifteen minutes; every file prints TOTAL and FAIL counts
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
