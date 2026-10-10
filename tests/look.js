// The page is dark unless the player picks Light or My device in Settings. A test that wants the light colors opens a context with
// colorScheme 'light' and calls this on it, after any journal it seeds: the saved Look becomes My device before the page's own script runs.
module.exports = function followDevice(ctx) {
  return ctx.addInitScript(() => { try { var k = 'hunters-journal-v1', s = JSON.parse(localStorage.getItem(k) || '{}') || {}; s.settings = s.settings || {}; if (!s.settings.theme) { s.settings.theme = 'device'; localStorage.setItem(k, JSON.stringify(s)); } } catch (e) {} });
};
