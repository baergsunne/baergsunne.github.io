const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','profi-timer.html'),'utf8');
const js=html.split('<script>')[1]?.split('</script>')[0];
assert.ok(js,'Inline script exists');
assert.ok(html.includes('ENTWICKLUNGSVORSCHAU'),'Preview labeled');
assert.ok(!html.includes('/api/admin/round'),'No production write endpoint');
assert.ok(html.includes('bp-profi-timer-demo-v1'),'Separate storage key');
const elements={app:{innerHTML:''}};
const handlers={},storage=new Map();
const doc={
  querySelectorAll:()=>[],
  getElementById:id=>elements[id]||(elements[id]={textContent:''}),
  querySelector:()=>({value:12}),
  addEventListener:(name,fn)=>{handlers[name]=fn;},
  createElement:()=>({click(){}})
};
const win={};
const context={
  document:doc,window:win,
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
  setInterval:()=>{},alert:()=>{},confirm:()=>true,
  Blob:class{},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL:()=>{}},
  console,Date,Intl,Math,Number,String,Array,Object,Map,Set,Error,JSON
};
const injectable=js.replace('setInterval(()=>{sync();',
  'window.__test={get:()=>d,result:proResult,stats:proStats,action:proAction,toggle:action,render};setInterval(()=>{sync();');
assert.notEqual(injectable,js,'Injection hook found');
vm.runInNewContext(injectable,context,{timeout:1000});
const t=win.__test;
const click=data=>handlers.click({target:{closest:()=>({dataset:data})}});
assert.equal(t.get().proMode,null);
click({pro:'choose-free'});
assert.equal(t.get().proMode,'free');
t.get().participants=['A','B','C'];
t.toggle('toggle');
assert.equal(t.get().proStarted,true);
t.action('pro-switch');
assert.equal(t.get().proMode,'free');
t.action('pro-out-B');t.action('pro-out-C');
assert.equal(JSON.stringify(t.result()),JSON.stringify(['A','C','B']));
assert.equal(t.stats().alive.length,1);
t.action('pro-rebuy-B');
assert.equal(t.stats().alive.length,2);
assert.equal(t.result(),null);
t.action('pro-undo');
assert.equal(t.stats().alive.length,1);
assert.equal(JSON.stringify(t.result()),JSON.stringify(['A','C','B']));
t.action('pro-new');
assert.equal(t.get().proMode,null);
assert.equal(t.get().proEvents.length,0);
click({pro:'choose-official'});
assert.equal(t.get().proMode,'official');
t.action('pro-example');
assert.equal(t.get().participants.length,10);
assert.ok(t.get().participants.every(x=>x.startsWith('Testspieler ')));
assert.equal(t.get().proEvents.length,0);
console.log('Profi-Timer: 18 Sicherheits- und Funktionspruefungen bestanden.');