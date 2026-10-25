import test from 'node:test';
import assert from 'node:assert/strict';
import {roundResults,standings,publicSnapshot,finalizedEdition} from './core.js';

const mixed={
 year:2026,status:'final',players:['A','B','C'],points:[10,8,6],
 roundCount:2,
 published:{
  1:['A','B','C'],
  2:[{player:'C',place:1,points:10},{player:'A',place:3,points:6},{player:'B',place:3,points:6}]
 },
 final:{signature:'test only'}
};
test('mixed historical string/object rounds retain exact tied places and points',()=>{
 const d=publicSnapshot(mixed,'2026-10-25');
 assert.equal(d.status,'final');
 assert.equal(d.rounds.length,2);
 assert.deepEqual(d.rounds[1].results.map(x=>[x.player,x.place,x.points]),[
  ['C',1,10],['A',3,6],['B',3,6]
 ]);
 assert.deepEqual(d.standings.map(x=>[x.player,x.points,x.wins]),[
  ['A',16,1],['C',16,1],['B',14,0]
 ]);
 const e=finalizedEdition(mixed);
 assert.deepEqual(e.rounds[1].results.map(x=>[x.player_id,x.place,x.points]),[
  ['C',1,10],['A',3,6],['B',3,6]
 ]);
 assert.equal(e.official_standings[0].player_id,'A');
});
test('legacy 2026 rounds with string arrays still follow original point table',()=>{
 const t={...mixed,published:{1:['A','B','C'],2:['B','C','A']}};
 const s=standings(t);
 assert.deepEqual(s.map(x=>[x.player,x.points]),[['B',18],['A',16],['C',14]]);
 assert.deepEqual(roundResults(t,t.published[1]).map(x=>x.place),[1,2,3]);
});
test('mixed round unknown player is rejected rather than silently changing archival results',()=>{
 const t={...mixed,published:{1:['A','B','C'],2:[{player:'Unknown',place:1,points:10}]}};
 assert.throws(()=>publicSnapshot(t),/Historische Rundendaten/);
});
