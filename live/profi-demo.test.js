import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker from './worker.js';

const base='https://preview.example';
function fixture(){
 const db=new DatabaseSync(':memory:');
 db.exec(fs.readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
 const DB={prepare(sql){let args=[];return {bind(...v){args=v;return this;},
 first:async()=>db.prepare(sql).get(...args)||null,
 all:async()=>({results:db.prepare(sql).all(...args)}),
 run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}})};}};
 return {db,env:{DB,DEMO_ONLY:'true',PROFI_VIEWER_SECRET:'dedicated-preview-secret-of-more-than-32-chars'}};
}
async function send(env,path,method='GET',body,operator='',viewer=''){
 const headers={'origin':base,'content-type':'application/json'};
 if(operator)headers['x-demo-operator']=operator;
 if(viewer)headers['x-viewer-token']=viewer;
 const resp=await worker.fetch(new Request(base+path,{method,headers,body:body?JSON.stringify(body):undefined}),env);
 return {code:resp.status,value:await resp.json()};
}
test('public preview disables all privileged routes but opens isolated demo with fictional names',async()=>{
 const {db,env}=fixture();
 assert.equal((await send(env,'/api/admin/years')).code,403);
 assert.equal((await send(env,'/api/setup','POST',{username:'hacker'})).code,403);
 assert.equal((await send(env,'/api/profi/create','POST',{mode:'free'})).code,403);
 const create=await send(env,'/api/profi/demo/create','POST',{mode:'official'});
 assert.equal(create.code,201,JSON.stringify(create.value));
 const {id,operator,viewerUrl}=create.value;
 assert.match(id,/^[a-f0-9]{32}$/);assert.match(operator,/^[a-f0-9]{64}$/);
 assert.deepEqual(create.value.document.names,Array.from({length:10},(_,i)=>'Testspieler '+(i+1)));
 assert.equal(create.value.document.demo,true);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM tournaments').get().n,0);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM profi_sessions').get().n,0);
 assert.equal((await send(env,'/api/profi/demo/state?id='+id)).code,403);
 assert.equal((await send(env,'/api/profi/demo/state?id='+id,'GET',null,operator)).code,200);
 assert.equal((await send(env,'/api/profi/demo/action?id='+id,'PUT',{revision:0,action:'start'},'c'.repeat(64))).code,403);
 assert.equal((await send(env,'/api/profi/demo/action?id='+id,'PUT',{revision:5,action:'start'},operator)).code,409);
 const token=new URLSearchParams(viewerUrl.split('#')[1]).get('token');
 assert.equal((await send(env,'/api/profi/watch?id='+id,'GET',null,'','a'.repeat(64))).code,403);
 assert.equal((await send(env,'/api/profi/watch?id='+id,'GET',null,'',token)).code,200);
 assert.equal((await send(env,'/api/profi/demo/draft?id='+id,'GET',null,operator)).code,409);
 const start=await send(env,'/api/profi/demo/action?id='+id,'PUT',{revision:0,action:'start'},operator);
 assert.equal(start.code,200);
 assert.equal(start.value.document.status,'live');
 let rev=1;
 for(let i=1;i<10;i++){
  const a=await send(env,'/api/profi/demo/action?id='+id,'PUT',{revision:rev,action:'out',name:'Testspieler '+(i+1)},operator);
  assert.equal(a.code,200,JSON.stringify(a.value));rev++;
 }
 const finish=await send(env,'/api/profi/demo/action?id='+id,'PUT',{revision:rev,action:'finish'},operator);
 assert.equal(finish.code,200);rev++;
 const draft=await send(env,'/api/profi/demo/draft?id='+id,'GET',null,operator);
 assert.equal(draft.code,200);
 assert.equal(draft.value.officialPublication,false);
 assert.deepEqual(draft.value.places.map(p=>p.points),[10,8,6,5,4,3,2,1,0,0]);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM tournaments').get().n,0);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM audit').get().n,0);
 assert.equal((await send(env,'/api/profi/watch?id='+id,'GET',null,'',token)).code,410);
});
test('passwordless free demo actions, revocable QR ticket and expiry never affect real admin data',async()=>{
 const {db,env}=fixture();
 const created=await send(env,'/api/profi/demo/create','POST',{mode:'free',title:'Firma',names:['Anna','Berta','Carlo']});
 assert.equal(created.code,201);
 const {id,operator,viewerUrl}=created.value;
 const oldToken=new URLSearchParams(viewerUrl.split('#')[1]).get('token');
 let r=await send(env,'/api/profi/demo/action?id='+id,'PUT',{revision:0,action:'start'},operator);
 r=await send(env,'/api/profi/demo/action?id='+id,'PUT',{revision:1,action:'out',name:'Berta'},operator);
 assert.equal(r.value.summary.activeCount,2);
 r=await send(env,'/api/profi/demo/action?id='+id,'PUT',{revision:2,action:'rebuy',name:'Berta'},operator);
 assert.equal(r.value.summary.activeCount,3);
 r=await send(env,'/api/profi/demo/action?id='+id,'PUT',{revision:3,action:'undo'},operator);
 assert.equal(r.value.summary.activeCount,2);
 r=await send(env,'/api/profi/demo/action?id='+id,'PUT',{revision:4,action:'revoke'},operator);
 assert.equal(r.code,200);
 const newToken=new URLSearchParams(r.value.viewerUrl.split('#')[1]).get('token');
 assert.notEqual(newToken,oldToken);
 assert.equal((await send(env,'/api/profi/watch?id='+id,'GET',null,'',oldToken)).code,403);
 assert.equal((await send(env,'/api/profi/watch?id='+id,'GET',null,'',newToken)).code,200);
 const q=db.prepare('UPDATE profi_demo_sessions SET expires_at=? WHERE id=?').run(Date.now()-1000,id);
 assert.equal(q.changes,1);
 assert.equal((await send(env,'/api/profi/demo/state?id='+id,'GET',null,operator)).code,410);
 assert.equal((await send(env,'/api/profi/watch?id='+id,'GET',null,'',newToken)).code,410);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM tournaments').get().n,0);
});
test('public demos are quota-controlled per IP and not a paid unlimited API',async()=>{
 const {env}=fixture();
 for(let i=0;i<5;i++){
  const r=await send(env,'/api/profi/demo/create','POST',{mode:'free',title:'Test '+i,names:['A','B']});
  assert.equal(r.code,201,'free-tier create '+i);
 }
 const sixth=await send(env,'/api/profi/demo/create','POST',{mode:'free',title:'Zu viel',names:['A','B']});
 assert.equal(sixth.code,429);
});
