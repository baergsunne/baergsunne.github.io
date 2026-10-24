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
assert.equal(data.records.length,56);
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
assert.equal(new Set(data.records.map(r=>r.title)).size,56,'Every record title must be unique');
for(const title of titles){
 const record=find(title);
 assert(record,'Recordbook missing new record: '+title);
 assert(record.table.length>2,'Every new record must offer full all-time ranking: '+title);
 assert(record.table.every(x=>Number.isFinite(x.value)),'Every new record must have numeric values: '+title);
}

const stories={
 'Längste Meistertitel-Serie':['Mike',3],
 'Meiste Siege in der letzten Turnierrunde':['Mike',3],
 'Schnellster erster Meistertitel':[null,1],
 'Längste Jahrespodiums-Serie':['Mike',4],
 'Längste Pause zwischen Meistertiteln':['Fösu',16],
 'Start-Ziel-Champion':['Pascal K.',1],
 'Vom letzten Zwischenrang zum Meister':['Fösu',1],
 'Grösster Finalspurt (letzte 2 Runden)':['Fösu (2025)',6],
 'Längste Serie ohne Rundensieg':['Chopfi',36],
 'Grösster verspielter Meisterschaftsvorsprung':['Echse (2019)',11],
 'Schlechtester Titelverteidiger':[null,10],
 'Längste Nullrunden-Serie':[null,4],
 'Längste Serie ohne Jahrespodium':['Chopfi',8],
 'Längste Serie ohne Rundenpodium':['Pät',14],
 'Grösster Absturz zur vorherigen Teilnahme':[null,9],
 'Längste Serie mit roter Laterne':['Lack',8],
 'Meiste letzte Plätze in der Schlussrunde':['Keel',5],
 'Meiste verspielte Meisterschaftsführungen':[null,4]
};
assert.equal(Object.keys(stories).length,18);
for(const [title,[holder,value]] of Object.entries(stories)){
 const record=find(title);
 assert(record,'New story record missing: '+title);
 assert.equal(record.value,value,title+' value');
 if(holder)assert.equal(record.holder,holder,title+' holder');
 assert(record.table.length>=1,title+' has a ranking');
 assert(record.table.every(x=>Number.isFinite(x.value)),title+' numeric ranking');
 assert.equal(new Set(record.table.map(x=>x.name)).size,record.table.length,title+' unique player/season rows');
}
assert.equal(find('Nullrunden').holder,'Keel','Do not duplicate the existing zero-round record');
assert.equal(data.records.filter(x=>x.title==='Längste Top-3-Rundenserie').length,1,'Keep the existing top-3 streak only once');
assert(!data.records.some(x=>x.title==='Perfekter Champion'||x.title==='Konstanz-König'),'Unachieved records are not shown');
assert.equal(find('Schnellster erster Meistertitel').table.filter(x=>x.value===1).length,3,'Three champions won at first participation');
assert.equal(find('Schlechtester Titelverteidiger').table.filter(x=>x.value===10).length,2,'Both last-place defending champions count');

assert(!titles.some(t=>t.includes('Nullrunde')),'Zero rounds remain a separately preserved original record');
for(const record of data.records){assert(record.holder);assert(record.description);assert(record.table.length);assert(record.table.every(v=>Number.isFinite(v.value)));}
assert(render().includes('data-hof-tab'));assert(!render().includes('undefined'));
console.log(JSON.stringify({records:data.records.length,years:data.years,players:data.players,seasonCount:data.seasonCount,checks:['title','podium','last-place','season-points','all-rows','render']},null,2));
