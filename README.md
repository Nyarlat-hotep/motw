# Hunter's Journal

A private companion app for a Monster of the Week campaign: a plain-English guide, a 3D dice roller that knows the moves, a guided hunter builder for all 12 playbooks, case files, a bestiary, and a party table.

It is one static page (`index.html`) plus images. No build step.

## Run it

    npm start            # serves on http://localhost:5173
    # or just open index.html in a browser

Saves go to the browser's localStorage. Use Settings and backup in the app to download a backup file or restore one.

## Layout

    index.html           the whole app (HTML, CSS, JS)
    manifest.webmanifest lets a phone or desktop install the page as an app
    sw.js                keeps an offline copy once the page has been opened over http(s)
    img/                 art; every image is optional and the page works without it
    data/                the 12 playbooks as JSON (see data/SCHEMA.md)
    tools/embed_data.py  re-embeds data/*.json into index.html after you edit them
    tests/               Playwright checks (npm install, then npm test)
    docs/ROADMAP.md      the plan for shared login and a live party table

## Playbook text

The playbook summaries are plain-English paraphrase written for this table. Ratings, harm, armor, tags and pick counts are exact. Keep the repo private, and treat a printed playbook sheet as the final word on any detail.
