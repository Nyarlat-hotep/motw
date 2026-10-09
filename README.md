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
    worker/              the shared table's Cloudflare Worker (a trial; not connected to the page yet)
    tests/               Playwright checks (npm install, then npm test)
    docs/TODO.md         the running list: what is left and who it is waiting on
    docs/SPEC.md         feature specs
    docs/WORKPLAN.md     the remaining work cut into chunks, with a proposed order
    docs/ROADMAP.md      the older plan for shared login and a live party table (Supabase)
    CLAUDE.md            how the code is laid out

`npm run build` copies what the site needs into `dist/` for hosting. Pushing `main` deploys it.

## Playbook text

The playbook summaries are plain-English paraphrase written for this table. Ratings, harm, armor, tags and pick counts are exact. Keep the repo private, and treat a printed playbook sheet as the final word on any detail.

## Credits

- Some dice sigils are icons by Lorc, Delapouite, Skoll, Caro Asercion, Carl Olsen, Cathelineau and DarkZaitzev from [game-icons.net](https://game-icons.net), CC BY 3.0.
- Runes and alchemical signs are outlines from the Noto fonts, SIL Open Font License 1.1 (`vendor/OFL-Noto.txt`).
- 3D lighting, trays and die materials: [Poly Haven](https://polyhaven.com) and [ambientCG](https://ambientcg.com), CC0.
- Dice sounds: [Kenney](https://kenney.nl) (CC0) and the dice-box-threejs project (see `snd/README.md`).
- 3D dice are drawn with [three.js](https://threejs.org), MIT (`vendor/three.LICENSE`).
