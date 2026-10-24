const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={window:{}};vm.runInNewContext(fs.readFileSync('data.js','utf8'),ctx);
const data=ctx.window.POKER_SEED;assert.equal(data?.editions?.length,17,'Exactly 17 completed tournament years must ship with the site');
const canonical2026=require('./fixture-2026.json').editions[0];
assert.deepEqual(JSON.parse(JSON.stringify(data.editions.find(e=>e.year===2026))),canonical2026,'Published static 2026 edition must exactly match the validated 7-round fixture');
assert.equal(data.players.length,23,'Both 2026 rookies must be present from the first paint');
let totalRounds=0,totalResults=0;const years=new Set();
for(const e of data.editions){assert(!years.has(e.year),'duplicate year '+e.year);years.add(e.year);assert.equal(e.rounds.length,e.round_count);assert.equal(new Set(e.players).size,e.players.length);assert.equal(e.official_standings.length,e.players.length);const points=new Map(e.players.map(p=>[p,0]));const numbers=new Set();for(const r of e.rounds){assert(!numbers.has(r.number));numbers.add(r.number);assert.equal(r.results.length,e.players.length);const seen=new Set();for(const x of r.results){assert(points.has(x.player_id));assert(!seen.has(x.player_id));seen.add(x.player_id);assert(Number.isFinite(x.points));assert(Number.isInteger(x.place));points.set(x.player_id,points.get(x.player_id)+x.points);totalResults++;}totalRounds++;}for(const s of e.official_standings){assert.equal(points.get(s.player_id),s.points,'points '+e.year+' '+s.player_id);}}
assert(years.has(2021),'2021 must be present');
const studio=fs.readFileSync('analyse-studio.js','utf8');assert(studio.includes('function abYears()'),'dynamic year selector absent');assert(!studio.includes('const AB_YEARS=['),'hardcoded year selector remains');
const app=fs.readFileSync('app.js','utf8');assert(app.includes('validateArchiveEdition(edition)'),'archive validation absent');assert(app.includes('appBootstrapped&&(archiveChanged||(changed&&'),'archive redraw must require meaningful change');
assert(app.includes('appBootstrapped=true;\n syncRoute();'),'first paint must use bundled canonical 17-year data without Cloudflare');assert(app.includes("if(needsLivePolling(state.page))refreshLive()"),'only active Home/Live may poll the remote backend');
assert(!app.includes('const initialArchiveRequest=apiBase?refreshLive():Promise.resolve()'),'remote fetch must not gate first paint');
console.log(JSON.stringify({success:true,years:years.size,rounds:totalRounds,player_rounds:totalResults,year2021:true,archiveValidation:true,dynamicYearSelection:true}));
// Every lowest-scoring player is last regardless of the archived position
// or the historic minimum point award. Original results stay untouched.
vm.runInNewContext(fs.readFileSync('round-placement.js','utf8'),ctx);
const placement=ctx.window.BaergsunneRoundPlacement;
let countedLast=0,zeros=0,positiveLast=0,sharedLast=0;
for(const e of data.editions)for(const r of e.rounds){
 const min=placement.lowestPoints(r);
 const last=placement.lastPlayers(r);
 assert(last.length>0,'all rounds have a last-place group '+e.year+'/'+r.number);
 if(last.length>1)sharedLast++;
 for(const x of r.results){
  const flagged=placement.isLast(x,r);
  assert.equal(flagged,x.points===min);
  if(flagged){countedLast++;if(x.points>0)positiveLast++;}
  if(placement.isZero(x))zeros++;
  if(flagged)assert.equal(placement.effectivePlace(x,r),r.results.length);
  else assert.equal(placement.effectivePlace(x,r),x.place);
 }
}
assert.equal(countedLast,267,'lowest-point last places including ties across 147 rounds');
assert.equal(zeros,260,'zero rounds are separate from last-place awards');
assert.equal(positiveLast,7,'seven positive 2025 last places count');
assert.equal(sharedLast,116,'every multi-zero round has shared last places');
const zeroTie=data.editions.find(e=>e.year===2026).rounds[0];
assert.deepEqual(JSON.parse(JSON.stringify(placement.lastPlayers(zeroTie))).sort(),['Chopfi','Keel']);
assert(placement.isBottomN(zeroTie.results.find(x=>x.player_id==='Chopfi'),zeroTie,2));
const positive=data.editions.find(e=>e.year===2025).rounds[0];
assert(placement.isLast(positive.results.find(x=>x.points===2),positive));
assert(app.includes('last:a.filter(x=>x.isLast).length'));
assert(app.includes('last:count(r=>r.isLast)'));
assert(app.includes('firstLast:i===0&&window.BaergsunneRoundPlacement.isLast'));
assert(fs.readFileSync('hall-records.js','utf8').includes("add('Hall of Shame','Nullrunden'"));
assert(fs.readFileSync('index.html','utf8').includes('round-placement.js?v='));
console.log('LAST_PLACE_RULE_SUCCESS',JSON.stringify({rounds:totalRounds,last:countedLast,zero:zeros,positiveLast,sharedLast}));
