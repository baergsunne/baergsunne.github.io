// Read-only HTTP smoke audit of the live Bärgsunne Worker (no credentials,
// no state-changing requests, no writes to D1).
const assert = require('node:assert/strict');
const live = 'https://baergsunne-live-isolated-20261015.baergsunne-poker-2026.workers.dev';
const privatePreview = 'https://baergsunne-live-private-preview.baergsunne-poker-2026.workers.dev';
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 18000);
async function get(host, path) {
  const response = await fetch(host + path, {signal:controller.signal, redirect:'manual',headers:{'cache-control':'no-cache'}});
  const body = await response.text();
  console.log('SMOKE', host.includes('private-preview')?'PREVIEW':'LIVE',path,response.status,body.length);
  return {response,body};
}
(async () => {
  try {
    const html = await get(live, '/admin.html');
    assert.equal(html.response.status, 200, 'live administrator HTML must load');
    assert.match(html.body, /Turnier laden/i);
    assert.match(html.body, /Neues Turnier eröffnen/i);
    assert.match(html.body, /admin-live\.js/);
    assert(/no-store/i.test(html.response.headers.get('cache-control')||''),'admin HTML should not cache');
    assert(html.response.headers.get('content-security-policy'),'admin CSP required');

    const js = await get(live, '/admin-live.js');
    assert.equal(js.response.status, 200, 'live admin script should load');
    assert.match(js.body, /\/api\/admin\/new-tournament/);
    assert.match(js.body, /NEXT_TOURNAMENT/);
    assert.match(js.body, /\/api\/admin\/years/);

    const years = await get(live, '/api/admin/years');
    assert.equal(years.response.status,401,'private admin years route must reject anonymous access');
    assert(!years.body.includes('"document"'),'anonymous response must not leak archived documents');

    const publicLive = await get(live, '/api/live');
    assert.equal(publicLive.response.status,200,'live snapshot endpoint should remain operational');
    const snapshot=JSON.parse(publicLive.body);
    assert.equal(snapshot.year,2026,'2026 must remain current');
    assert.equal(snapshot.status,'final','the 2026 tournament stays closed');

    const archive = await get(live, '/api/editions');
    assert.equal(archive.response.status,200,'public historical additions API should work');
    const editions=JSON.parse(archive.body).editions||[];
    assert(editions.some(e=>e.year===2026),'completed 2026 edition must remain public');
    assert(!editions.some(e=>e.year===2027),'2027 must not have been opened');

    const gated = await get(privatePreview, '/admin.html');
    assert.equal(gated.response.status,200,'preview gate should respond');
    assert.match(gated.body,/private Vorschau|Vorschauzugang/i,'preview must require passphrase for unauthenticated visitors');
    assert(!gated.body.includes('id="year"'),'preview admin HTML must not be accessible without gate');

    console.log('ADMIN_LIVE_HTTP_SMOKE_SUCCESS 7 tests verified; no writes performed.');
  } finally { clearTimeout(timeout); }
})().catch(e => {console.error('ADMIN_LIVE_HTTP_SMOKE_FAILURE',e);process.exitCode=1;});
