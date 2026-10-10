// Runs a test file in WebKit (Safari's engine) without changing it: node -r ./tests/webkit.js tests/t5.js
// Needs the browser once: npx playwright install webkit. The tests ask for Chromium; this hands them WebKit instead.
// WebKit will not load pictures or scripts beside a page opened from a file, so serve the folder (npm start, or python -m http.server 5173)
// and set HJ_URL to it: the page is then opened from there instead. PowerShell: $env:HJ_URL = 'http://localhost:5173'
// Not every check means the same in WebKit (clipboard permissions, audio and timing differ), so read a failure before believing it.
const pw = require('playwright');
const base = (process.env.HJ_URL || '').replace(/\/$/, '');
const viaHttp = (url) => base && /^file:/.test(url) ? base + '/index.html' + (url.split('index.html')[1] || '') : url;
pw.chromium.launch = async () => {
  const b = await pw.webkit.launch(), newContext = b.newContext.bind(b);
  b.newContext = async (opts) => {
    const ctx = await newContext(opts), newPage = ctx.newPage.bind(ctx);
    ctx.newPage = async () => { const p = await newPage(), go = p.goto.bind(p); p.goto = (url, o) => go(viaHttp(url), o); return p; };
    return ctx;
  };
  b.newPage = async (opts) => (await b.newContext(opts)).newPage();
  return b;
};
