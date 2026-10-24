const fs=require('fs'),vm=require('vm'),assert=require('assert');
const content=fs.readFileSync(__dirname+'/data.js','utf8');let seed=JSON.parse(content.substring(content.indexOf('=')+1).trim().replace(/;$/,''));
const ctx={window:{POKER_SEED:seed},document:{addEventListener:()=>{}},console};vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/round-placement.js','utf8'),ctx);vm.runInContext(fs.readFileSync(__dirname+'/hall-records.js','utf8'),ctx);
const {calculate,render}=ctx.window.BaergsunneHallRecords;const data=calculate(seed);const find=n=>data.records.find(r=>r.title===n);
assert.equal(data.years,17);assert.equal(data.players,23);assert.equal(data.seasonCount,164);
assert.equal(find('Meistertitel').holder,'Mike');assert.equal(find('Meistertitel').value,6);
assert.equal(find('Jahrespodien').value,12);assert.equal(find('Letzte Schlussplätze').value,3);
assert.equal(find('Höchste Saisonpunkte').value,50);
assert.equal(find('Höchste Saisonpunkte').holder,'Frauchi (2026)');
assert.equal(find('Letzte Rundenplätze').value,36);
assert.equal(find('Letzte Rundenplätze').holder,'Keel');
assert.equal(find('Nullrunden').value,35);
assert.equal(data.records.length,27);
for(const record of data.records){assert(record.holder);assert(record.description);assert(record.table.length);assert(record.table.every(v=>Number.isFinite(v.value)));}
assert(render().includes('data-hof-tab'));assert(!render().includes('undefined'));
console.log(JSON.stringify({records:data.records.length,years:data.years,players:data.players,seasonCount:data.seasonCount,checks:['title','podium','last-place','season-points','all-rows','render']},null,2));
