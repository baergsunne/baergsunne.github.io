const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('app.js','utf8');
const start=source.indexOf('function milestoneList(p){');
const end=source.indexOf('\nfunction consistency(p)',start);
assert(start>=0&&end>start,'career milestone function present');
const makeEdition=(year,n,offset,champion)=>({
 year,round_count:n,
 rounds:Array.from({length:n},(_,i)=>{
  const global=offset+i+1;
  return {number:i+1,results:[{player_id:'Schnarre',place:global<=50?1:global<=100?2:4,points:5}]};
 }),
 official_standings:[{player_id:champion,place:1}]
});
const data={editions:[makeEdition(2011,150,100,'Schnarre'),makeEdition(2007,100,0,'Schnarre')]};
const ctx={db:data,state:{selectedYears:[2011],selected:['Other']}};
vm.createContext(ctx);
vm.runInContext(source.slice(start,end)+';this.run=milestoneList;',ctx);
const events=JSON.parse(JSON.stringify(ctx.run('Schnarre')));
const groups=type=>events.filter(x=>x.type===type);
const vals=type=>groups(type).map(x=>x.value);
assert.deepEqual(vals('rounds'),[1,10,25,50,100,150,200,250]);
assert.deepEqual(vals('wins'),[1,5,10,15,20,25,30,35,40,45,50]);
assert.deepEqual(vals('podium'),[1,10,25,50,75,100]);
assert.deepEqual(vals('points'),[50,100,250,500,750,1000]);
assert.deepEqual(vals('titles'),[1,2]);
assert.equal(events.length,8+11+6+6+2);
assert.deepEqual(groups('rounds').find(x=>x.value===100),{year:2007,round:100,text:'100. gespielte Runde',type:'rounds',value:100});
assert.deepEqual(groups('rounds').find(x=>x.value===150),{year:2011,round:50,text:'150. gespielte Runde',type:'rounds',value:150});
assert.equal(groups('titles')[0].year,2007);
assert.equal(groups('titles')[0].round,100);
assert.equal(groups('titles')[1].year,2011);
assert.equal(groups('titles')[1].round,150);
assert.equal(groups('points').find(x=>x.value===1000).year,2011);
assert(events.every((x,i)=>!i||events[i-1].year<x.year||(events[i-1].year===x.year&&events[i-1].round<=x.round)),'chronological');
assert.deepEqual(JSON.parse(JSON.stringify(ctx.run('Other'))),[]);
assert.deepEqual(ctx.state.selectedYears,[2011],'filters not changed');
assert(source.includes('Auch bei ausgewählten Jahren bleibt die Karriere-Zählung vollständig.'),'career-wide scope explained');
const ctxJump={db:{editions:[{year:2026,round_count:1,rounds:[{number:1,results:[{player_id:'Schnarre',place:1,points:300}]}],official_standings:[]}]},state:{}};
vm.createContext(ctxJump);vm.runInContext(source.slice(start,end)+';this.run=milestoneList;',ctxJump);
const jump=JSON.parse(JSON.stringify(ctxJump.run('Schnarre')));
assert.deepEqual(jump.filter(x=>x.type==='points').map(x=>x.value),[50,100,250],'crossed thresholds in one round');
console.log('CAREER_MILESTONES_SUCCESS: 33 thresholds, every title, all seasons, skipped point thresholds, chronological order');
