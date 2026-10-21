import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker from './worker.js';
import {makeTournament,change,ranking,clockAt,viewerSnapshot,validNames,validLevels} from './profi-core.js';

const URL_BASE='https://preview.example';
function fixture(){
 const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
 const DB={prepare(sql){let values=[];return {bind(...v){values=v;return this;},
  first:async()=>db.prepare(sql).get(...values)||null,
  all:async()=>({results:db.prepare(sql).all(...values)}),
  run:async()=>({meta:{changes:Number(db.prepare(sql).run(...values).changes)}})};}};
 return {db,env:{DB,BOOTSTRAP_SECRET:'setup-long-preview-secret',RATE_SALT:'isolated-pepper-for-tests',PROFI_VIEWER_SECRET:'distinct-unguessable-32-plus-characters-viewer-secret'}}; 
}
function client(env){
 let token='';
 return {setToken:t=>token=t,async send(path,method='GET',data,opts={}){
  const headers={'origin':opts.origin||URL_BASE,'content-type':'application/json',...(token?{'authorization':'Bearer '+token}:{}),...(opts.viewer?{'x-viewer-token':opts.viewer}:{})};
  const response=await worker.fetch(new Request(URL_BASE+path,{method,headers,body:data===undefined?undefined:JSON.stringify(data)}),env);
  const value=await response.json();return {code:response.status,value};
 }};
}
async function login(c){
 assert.equal((await c.send('/api/setup','POST',{secret:'setup-long-preview-secret',username:'owner',password:'A-good-strong-test-password-2026'})).code,200);
 const r=await c.send('/api/login','POST',{username:'owner',password:'A-good-strong-test-password-2026'});
 assert.equal(r.code,200);c.setToken(r.value.token);
}
test('pure event engine preserves elimination ordering after rebuys and undo',()=>{
 const doc=makeTournament({id:'1'.repeat(32),mode:'free',title:'Test',names:['A','B','C']},1000);
 let d=change(doc,'start',{},1100);
 d=change(d,'out',{name:'B'},1200);d=change(d,'out',{name:'C'},1300);
 assert.deepEqual(ranking(d).places,['A','C','B']);
 d=change(d,'rebuy',{name:'B'},1400);
 assert.equal(ranking(d).places,null);
 d=change(d,'undo',{},1500);
 assert.deepEqual(ranking(d).places,['A','C','B']);
 d=change(d,'finish',{},1600);
 assert.equal(d.status,'finished');
 assert.throws(()=>change(d,'out',{name:'A'}),/nicht aktiv/);
 assert.equal(viewerSnapshot(d,1700).places.length,3);
});
test('clock advances through multiple levels with no browser polling',()=>{
 let d=makeTournament({id:'2'.repeat(32),mode:'free',title:'Test',names:['A','B'],levels:[{sb:10,bb:20,minutes:1},{sb:20,bb:40,minutes:1},{sb:40,bb:80,minutes:1}]},0);
 d=change(d,'start',{},100);
 assert.equal(clockAt(d,61100).index,1);
 assert.equal(clockAt(d,125100).index,2);
 assert.equal(clockAt(d,220100).running,false);
});
test('strict player and level validation',()=>{
 assert.throws(()=>validNames(['A','a']),/verschiedene/);
 assert.throws(()=>validNames(['A']),/2 bis 20/);
 assert.throws(()=>validLevels([{sb:200,bb:100,minutes:15}]),/Blinds/);
});
test('profi API limits creation to administrator, and viewer is read-only with a revocable HMAC capability',async()=>{
 const {env}=fixture(),c=client(env);
 assert.equal((await c.send('/api/profi/list')).code,401);
 assert.equal((await c.send('/api/profi/create','POST',{mode:'free',title:'Nope',names:['A','B']})).code,401);
 await login(c);
 let create=await c.send('/api/profi/create','POST',{mode:'free',title:'Company Poker',names:['Ann','Ben','Chad']});
 assert.equal(create.code,201);
 const {id,viewerUrl}=create.value;
 assert.match(viewerUrl,/watch\.html#id=[a-f0-9]{32}&token=[a-f0-9]{64}/);
 const viewer=new URLSearchParams(viewerUrl.split('#')[1]).get('token');
 assert.equal((await c.send('/api/profi/watch?id='+id)).code,403);
 assert.equal((await c.send('/api/profi/watch?id='+id,'GET',undefined,{viewer:'a'.repeat(64)})).code,403);
 let watch=await c.send('/api/profi/watch?id='+id,'GET',undefined,{viewer});
 assert.equal(watch.code,200);
 assert.equal(watch.value.title,'Company Poker');
 assert.equal(watch.value.players.length,3);
 assert.equal(watch.value.names,undefined);
 assert.equal(watch.value.viewerVersion,undefined);
 assert.equal((await c.send('/api/profi/action','PUT',{id,revision:99,action:'start'})).code,409);
 assert.equal((await c.send('/api/profi/action','PUT',{id,revision:0,action:'start'}, {origin:'https://other.example'})).code,403);
 let result=await c.send('/api/profi/action','PUT',{id,revision:0,action:'start'});
 assert.equal(result.code,200);
 assert.equal(result.value.document.status,'live');
 let stale=await c.send('/api/profi/action','PUT',{id,revision:0,action:'out',name:'Ben'});
 assert.equal(stale.code,409);
 result=await c.send('/api/profi/action','PUT',{id,revision:1,action:'out',name:'Ben'});
 assert.equal(result.code,200);
 result=await c.send('/api/profi/action','PUT',{id,revision:2,action:'out',name:'Chad'});
 assert.equal(result.code,200);
 assert.deepEqual(result.value.summary.players.filter(x=>x.active).map(x=>x.name),['Ann']);
 assert.equal((await c.send('/api/profi/draft','POST',{id,revision:3,championshipRevision:0})).code,409);
 const previous=viewer;
 result=await c.send('/api/profi/action','PUT',{id,revision:3,action:'revoke'});
 assert.equal(result.code,200);
 assert.equal((await c.send('/api/profi/watch?id='+id,'GET',undefined,{viewer:previous})).code,403);
 const updated=await c.send('/api/profi/state?id='+id);
 const renewed=new URLSearchParams(updated.value.viewerUrl.split('#')[1]).get('token');
 assert.notEqual(renewed,previous);
 assert.equal((await c.send('/api/profi/watch?id='+id,'GET',undefined,{viewer:renewed})).code,200);
 result=await c.send('/api/profi/action','PUT',{id,revision:4,action:'finish'});
 assert.equal(result.code,200);
 assert.equal((await c.send('/api/profi/watch?id='+id,'GET',undefined,{viewer:renewed})).code,410);
});
test('official mode uses registered roster and may only write a non-public draft for a nonfinal round',async()=>{
 const {env,db}=fixture(),c=client(env);await login(c);
 const config={year:2027,roundCount:2,players:['Anna','Berta','Carlo'],points:[10,8,6]};
 assert.equal((await c.send('/api/admin/config','PUT',{revision:null,document:config})).code,200);
 let p=await c.send('/api/profi/create','POST',{mode:'official',year:2027,round:1});
 assert.equal(p.code,201);
 const id=p.value.id;
 assert.deepEqual(p.value.document.names,config.players);
 let r=await c.send('/api/profi/action','PUT',{id,revision:0,action:'start'});
 r=await c.send('/api/profi/action','PUT',{id,revision:1,action:'out',name:'Berta'});
 r=await c.send('/api/profi/action','PUT',{id,revision:2,action:'out',name:'Carlo'});
 r=await c.send('/api/profi/action','PUT',{id,revision:3,action:'finish'});
 assert.equal(r.code,200);
 const d=await c.send('/api/profi/draft','POST',{id,revision:4,championshipRevision:0});
 assert.equal(d.code,200,JSON.stringify(d.value));
 const state=await c.send('/api/admin/state?year=2027');
 assert.deepEqual(state.value.document.rounds[1],['Anna','Carlo','Berta']);
 assert.equal(state.value.document.published[1],undefined);
 const snapshot=await c.send('/api/live?year=2027');
 assert.equal(snapshot.value.rounds.length,0);
 assert.equal(db.prepare('SELECT count(*) AS n FROM audit WHERE year=2027').get().n,2);
 assert.equal((await c.send('/api/profi/create','POST',{mode:'official',year:2027,round:4})).code,409);
});
