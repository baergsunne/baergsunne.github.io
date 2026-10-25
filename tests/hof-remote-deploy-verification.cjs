const assert=require('node:assert/strict');
const page='https://baergsunne.github.io';
const live='https://baergsunne-live-isolated-20261015.baergsunne-poker-2026.workers.dev';
const preview='https://baergsunne-live-private-preview.baergsunne-poker-2026.workers.dev';
async function get(url){const ac=new AbortController();const timeout=setTimeout(()=>ac.abort(),30000);try{const r=await fetch(url,{redirect:'manual',signal:ac.signal,headers:{'cache-control':'no-cache'}});const body=await r.text();console.log('HOF_REMOTE',r.status,url,body.length);return {status:r.status,body,headers:r.headers}}finally{clearTimeout(timeout)}}
(async()=>{
 const html=await get(page+'/');
 assert.equal(html.status,200,'GitHub Pages public main site');
 assert.match(html.body,/hall-unified-design\.css\?v=20261025-filter1/,'merged stylesheet cache key');
 assert.match(html.body,/app\.js\?v=20261025-hof-filter1/,'merged JS cache key');
 for(const [file,expected] of [
  ['app.js?v=20261025-hof-filter1','function fameFilter()'],
  ['hall-records.js?v=20261025-filter1','function calculate(seed,filters={})'],
  ['hall-unified-design.css?v=20261025-filter1','.hof-filter-controls']
 ]){
  const r=await get(page+'/'+file);
  assert.equal(r.status,200,'New Hall asset must load: '+file);
  assert(r.body.includes(expected),'New Hall code must be active: '+file);
 }
 const admin=await get(live+'/admin.html');
 assert.equal(admin.status,200,'Existing live Admin remains available');
 assert.match(admin.body,/Neues Turnier eröffnen/);
 const status=await get(live+'/api/live');
 assert.equal(status.status,200,'Live API still works');
 const snapshot=JSON.parse(status.body);
 assert.equal(snapshot.year,2026);
 assert.equal(snapshot.status,'final','2026 remains finished');
 const gate=await get(preview+'/admin.html');
 assert([200,401,403].includes(gate.status),'Preview must deny/redirect unauthorized user without runtime errors');
 assert.match(gate.body,/private Vorschau|Vorschauzugang/i,'Preview access gate');
 assert(!gate.body.includes('id="year"'),'Private preview cannot expose admin panel without passphrase');
 console.log('HOF_REMOTE_DEPLOY_VERIFIED');
})().catch(e=>{console.error('HOF_REMOTE_DEPLOY_FAILURE',e);process.exitCode=1});
