const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={window:{}};vm.runInNewContext(fs.readFileSync('data.js','utf8'),ctx);
const data=ctx.window.POKER_SEED;assert(data?.editions?.length>=16);
let totalRounds=0,totalResults=0;const years=new Set();
for(const e of data.editions){assert(!years.has(e.year),'duplicate year '+e.year);years.add(e.year);assert.equal(e.rounds.length,e.round_count);assert.equal(new Set(e.players).size,e.players.length);assert.equal(e.official_standings.length,e.players.length);const points=new Map(e.players.map(p=>[p,0]));const numbers=new Set();for(const r of e.rounds){assert(!numbers.has(r.number));numbers.add(r.number);assert.equal(r.results.length,e.players.length);const seen=new Set();for(const x of r.results){assert(points.has(x.player_id));assert(!seen.has(x.player_id));seen.add(x.player_id);assert(Number.isFinite(x.points));assert(Number.isInteger(x.place));points.set(x.player_id,points.get(x.player_id)+x.points);totalResults++;}totalRounds++;}for(const s of e.official_standings){assert.equal(points.get(s.player_id),s.points,'points '+e.year+' '+s.player_id);}}
assert(years.has(2021),'2021 must be present');
const studio=fs.readFileSync('analyse-studio.js','utf8');assert(studio.includes('function abYears()'),'dynamic year selector absent');assert(!studio.includes('const AB_YEARS=['),'hardcoded year selector remains');
const app=fs.readFileSync('app.js','utf8');assert(app.includes('validateArchiveEdition(edition)'),'archive validation absent');assert(app.includes('appBootstrapped&&(archiveChanged||(changed&&'),'archive redraw must wait until the first official load and require changed content');assert(app.includes('const initialArchiveRequest=apiBase?refreshLive():Promise.resolve()'),'initial remote archive hydration missing');
console.log(JSON.stringify({success:true,years:years.size,rounds:totalRounds,player_rounds:totalResults,year2021:true,archiveValidation:true,dynamicYearSelection:true}));
// Confirmed owner rule: every zero-point round is a last-place result;
// if a round has no zero-point players, the final rank is last.
let countedLast=0,zeroPointLast=0,positiveLast=0;
for(const e of data.editions)for(const r of e.rounds){const lastRank=Math.max(...r.results.map(x=>x.place));for(const x of r.results){if(x.points===0||x.place===e.players.length){countedLast++;if(x.points===0)zeroPointLast++;else positiveLast++;}}}
assert.equal(countedLast,253,'Historical last placements');assert.equal(zeroPointLast,246);assert.equal(positiveLast,7);
assert(app.includes('last:a.filter(x=>x.points===0||x.place===x.field).length'));
assert(app.includes('last:count(r=>r.points===0||r.place===r.field)'));
assert(app.includes('firstLast:i===0&&(x?.points===0||x?.place===e.players.length)'));
console.log('LAST_PLACE_RULE_SUCCESS',JSON.stringify({last:countedLast,zero:zeroPointLast,positive:positiveLast}));
