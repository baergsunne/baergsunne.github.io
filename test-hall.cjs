const fs=require('fs'),vm=require('vm'),assert=require('assert');
const content=fs.readFileSync(__dirname+'/data.js','utf8');let seed=JSON.parse(content.substring(content.indexOf('=')+1).trim().replace(/;$/,''));
const ctx={window:{POKER_SEED:seed},document:{addEventListener:()=>{}},console};vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/round-placement.js','utf8'),ctx);vm.runInContext(fs.readFileSync(__dirname+'/hall-records.js','utf8'),ctx);
const {calculate,render}=ctx.window.BaergsunneHallRecords;const data=calculate(seed);const find=n=>data.records.find(r=>r.title===n);
assert.equal(data.years,17);assert.equal(data.players,23);assert.equal(data.seasonCount,164);
assert.equal(find('Meistertitel').holder,'Mike');assert.equal(find('Meistertitel').value,6);
assert.equal(find('Jahrespodien').value,13);assert.equal(find('Letzte Schlussplätze').value,4);
assert.equal(find('Höchste Saisonpunkte').value,50);
assert.equal(find('Höchste Saisonpunkte').holder,'Frauchi (2026)');
assert.equal(find('Letzte Rundenplätze').value,36);
assert.equal(find('Letzte Rundenplätze').holder,'Keel');
assert.equal(find('Nullrunden').value,35);
assert.equal(data.records.length,38);
const titles=[
 'Bester Ø Rundenrang (mindestens 10 Runden)',
 'Beste durchschnittliche relative Rundenplatzierung',
 'Meiste Führungswechsel',
 'Grösster zwischenzeitlicher Rückstand des Champions',
 'Meiste Top-5-Runden in einem Jahr',
 'Grösste Aufholjagd innerhalb einer Saison',
 'Meiste Runden an der Spitze in einem Jahr',
 'Grösster Sprung nach oben in einer Runde',
 'Grösster Absturz innerhalb einer Saison',
 'Meiste Runden mit roter Laterne in einem Jahr',
 'Grösster Fall nach einer Runde'
];
assert.equal(new Set(data.records.map(r=>r.title)).size,38,'Every record title must be unique');
for(const title of titles){
 const record=find(title);
 assert(record,'Recordbook missing new record: '+title);
 assert(record.table.length>2,'Every new record must offer full all-time ranking: '+title);
 assert(record.table.every(x=>Number.isFinite(x.value)),'Every new record must have numeric values: '+title);
}
assert(!titles.some(t=>t.includes('Nullrunde')),'Zero rounds remain a separately preserved original record');
for(const record of data.records){assert(record.holder);assert(record.description);assert(record.table.length);assert(record.table.every(v=>Number.isFinite(v.value)));}
assert(render().includes('data-hof-tab'));assert(!render().includes('undefined'));
console.log(JSON.stringify({records:data.records.length,years:data.years,players:data.players,seasonCount:data.seasonCount,checks:['title','podium','last-place','season-points','all-rows','render']},null,2));
