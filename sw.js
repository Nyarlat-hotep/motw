/* Offline copy of the journal.
   The page itself is fetched fresh whenever there is a connection (so updates show up at once) and falls back to the saved copy offline.
   Art and fonts are served from the saved copy and refreshed in the background. Missing optional images are never saved. */
var CACHE = 'hunters-journal-shell-v2';
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(['./', 'manifest.webmanifest']); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
function save(req, res) {
  if (res && (res.ok || res.type === 'opaque')) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
  return res;
}
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url), own = url.origin === location.origin, font = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!own && !font) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(function (res) { return save('./', res); }).catch(function () { return caches.match('./'); }));
    return;
  }
  e.respondWith(caches.match(req).then(function (hit) {
    var net = fetch(req).then(function (res) { return save(req, res); });
    if (hit) { net.catch(function () {}); return hit; }
    return net;
  }));
});
