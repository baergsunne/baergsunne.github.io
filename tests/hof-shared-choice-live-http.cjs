const assert=require('node:assert/strict');
const urls={
 pages:'https://baergsunne.github.io',
 worker:'https://baergsunne-live-isolated-20261015.baergsunne-poker-2026.workers.dev',
 preview:'https://baergsunne-live-private-preview.baergsunne-poker-2026.workers.dev'
};
async function read(host,path) {
 const ac=new AbortController(),timeout=setTimeout(()=>ac.abort(),25000);
 try {
  const r=await fetch(host+path,{signal:ac.signal,redirect:'manual',headers:{'cache-control':'no-cache'}});
  const body=await r.text();
  console.log('VERIFY',host===urls.pages?'PAGES':host===urls.worker?'LIVE':'PREVIEW',path,r.status,body.length);
  return {code:r.status,body};
 } finally {clearTimeout(timeout);}
}
(async()=>{
 for(const host of [urls.pages,urls.worker]){
  const html=await read(host,'/');
  assert.equal(html.code,200);
  assert.match(html.body,/app\.js\?v=20261025-hof-stats-panel1/);
  assert.match(html.body,/hall-unified-design\.css\?v=20261025-hof-stats-panel1/);
  const app=await read(host,'/app.js?v=20261025-hof-stats-panel1');
  assert.equal(app.code,200);
  assert(app.body.includes('Jahr und Spieler auswählen'),'shared Statistics accordion is in Hall app');
  assert(app.body.includes("state.page==='fame'?toolChoicePanel():''"),'shared choice is rendered on Hall');
  assert(app.body.includes("state.page==='fame'?'fame':state.tab"),'Hall choice is isolated from Stats');
  assert(!app.body.includes('function fameFilter()'),'former Hall custom filter is not shown');
  const css=await read(host,'/hall-unified-design.css?v=20261025-hof-stats-panel1');
  assert.equal(css.code,200);
  assert(css.body.includes('.page--fame > .tool-choice-panel'),'shared accordion is styled within Hall');
  const records=await read(host,'/hall-records.js?v=20261025-filter1');
  assert.equal(records.code,200);
  assert(records.body.includes('function calculate(seed,filters={})'),'recordbook still recalculates for the scope');
 }
 const admin=await read(urls.worker,'/admin.html');
 assert.equal(admin.code,200);
 assert.match(admin.body,/Neues Turnier eröffnen/,'Admin must remain present');
 const snapshot=await read(urls.worker,'/api/live');
 assert.equal(snapshot.code,200);
 const data=JSON.parse(snapshot.body);
 assert.equal(data.year,2026);
 assert.equal(data.status,'final');
 assert.equal(data.rounds.length,8,'the 2026 archival rounds are all retained');
 const history=await read(urls.worker,'/api/editions');
 assert.equal(history.code,200);
 const list=JSON.parse(history.body).editions;
 assert(list.some(e=>e.year===2026));
 assert(!list.some(e=>e.year===2027),'no new tournament started');
 const unauthorized=await read(urls.worker,'/api/admin/years');
 assert.equal(unauthorized.code,401,'admin endpoints refuse anonymous calls');
 const gate=await read(urls.preview,'/admin.html');
 assert([200,401,403].includes(gate.code));
 assert.match(gate.body,/private Vorschau|Vorschauzugang/i);
 console.log('HALL_SHARED_CHOICE_LIVE_HTTP_VERIFIED');
})().catch(e=>{console.error('HALL_SHARED_CHOICE_HTTP_FAILURE',e);process.exitCode=1});
