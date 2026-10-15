'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const scripts=[...html.matchAll(/<script src="([^"?]+)/g)].map(m=>m[1]);
function boot(hash='',stored=null,blocked=false){
 const div={innerHTML:''},events={},winEvents={},errors=[],store=new Map(stored?[['baergsunne-tool-choices-v216',stored]]:[]);
 const document={readyState:'loading',title:'',activeElement:null,querySelector:s=>s==='#app'?div:null,querySelectorAll:()=>[],getElementById:()=>null,addEventListener:(n,f)=>(events[n]??=[]).push(f),createElement:()=>({click(){},remove(){}}),body:{append(){}}};
 const location={hash};const context={document,location,history:{pushState(s,t,url){location.hash=url},replaceState(s,t,url){location.hash=url}},localStorage:{getItem(k){if(blocked)throw Error('blocked');return store.get(k)||null},setItem(k,v){if(blocked)throw Error('blocked');store.set(k,v)},removeItem:k=>store.delete(k)},console:{log(){},error:(...a)=>errors.push(a.join(' ')),warn(){}},setTimeout,clearTimeout,setInterval(){},requestAnimationFrame:f=>f(),MutationObserver:class{observe(){}},URL,Blob,alert(){},confirm:()=>false,prompt:()=>null,scrollY:0,scrollTo(){}};
 context.window=context;context.scrollTo=()=>{};context.addEventListener=(n,f)=>(winEvents[n]??=[]).push(f);
 vm.createContext(context);for(const file of scripts)vm.runInContext(fs.readFileSync(file==='app.js'&&process.env.BP_BASELINE?process.env.BP_BASELINE:__dirname+'/'+file,'utf8'),context,{filename:file});
 for(const f of events.DOMContentLoaded||[])f();
 const run=s=>vm.runInContext(s,context),action=(a,v)=>run(`onAction(${JSON.stringify(a)},{dataset:{value:${JSON.stringify(v)}}})`);
 return {div,errors,run,action,events,winEvents,location,store};
}
const checks=[];function pass(s){checks.push(s);console.log('PASS '+s)}
if(process.env.BP_BASELINE){try{const old=boot();old.action('go','stats');throw Error('baseline unexpectedly passed')}catch(error){assert.match(error.message,/TOOL_CHOICES is not defined/);console.log('REPRODUCED baseline: '+error.message);process.exit(0)}}
let c=boot();assert(c.div.innerHTML.includes('discovery-hero'));assert(!c.div.innerHTML.includes('hero-home.webp'));pass('entrypoint loads all modules without supplied heroes');
for(const p of ['home','history','stats','players','fame','live','admin']){c.action('go',p);assert(c.div.innerHTML.includes('page--'+p));assert.equal(c.errors.length,0);pass('navigation '+p)}
c.action('go','stats');
const tabs=['overview','career','rounds','rivals','heatmap','race','simulator','records','lab','insights','studio','patterns','standard'];
for(const tab of tabs){c.action('tab',tab);assert.equal(c.errors.length,0,tab+': '+c.errors.join('\n'));assert(c.div.innerHTML.includes('selected-stat-tool'));pass('tool '+tab)}
for(const tab of tabs){for(const choice of [{players:[],years:[]},{players:['Fösu'],years:[2008]},{players:['__none__'],years:['__none__']}]){c.run(`state.tab=${JSON.stringify(tab)};TOOL_CHOICES[state.tab]=${JSON.stringify(choice)};draw()`);assert.equal(c.errors.length,0,tab+': '+c.errors.join('\n'));} }pass('39 tool/filter render combinations');
c.run("state.tab='missing';draw()");assert.equal(c.run('state.tab'),'overview');pass('invalid tool resets before preference access');
c.run("state.selected=['Fösu'];state.selectedYears=[2025];overviewTab=()=>{throw Error('injected')};draw()");assert(c.div.innerHTML.includes('role="alert"'));assert.equal(c.run('state.selected[0]'),'Fösu');assert.equal(c.run('state.selectedYears[0]'),2025);pass('renderer failure keeps navigation and restores filters');
for(const value of ['{bad','null','[]','{"overview":{"players":null,"years":3}}','{"overview":{"players":["fake","Fösu"],"years":[2008,9999]}}']){const x=boot('#stats',value);assert(x.div.innerHTML.includes('page--stats'));assert.equal(x.errors.length,0);}pass('corrupt and stale saved preferences');
assert.equal(boot('#stats',null,true).errors.length,0);pass('storage blocked/private mode');
for(const p of ['history','stats','players','fame']){const x=boot('#'+p);assert(x.div.innerHTML.includes('page--'+p));assert(!x.div.innerHTML.includes('hero-'+p+'.webp'));assert.equal(x.errors.length,0);}pass('four direct routes without supplied heroes');
const x=boot();x.location.hash='#stats';x.winEvents.hashchange.forEach(f=>f());assert(x.div.innerHTML.includes('page--stats'));x.location.hash='#history';x.winEvents.popstate.forEach(f=>f());assert(x.div.innerHTML.includes('page--history'));pass('hash and browser back/forward routing');
c=boot();for(const e of c.run('db.editions')){c.action('openyear',String(e.year));assert(c.div.innerHTML.includes('page--history'));assert.equal(c.errors.length,0);}pass('all 16 historical editions');
c.action('profile','Fösu');assert(c.div.innerHTML.includes('Fösu'));pass('player profile');
const debuts=boot('#players');
debuts.run(`window.BAERGSUNNE_PUBLIC_LIVE={status:'planned',year:2026,players:['Frauchi','König','Fösu'],rounds:[],standings:[]};draw()`);
assert.match(debuts.div.innerHTML,/Vorläufiges Spielerprofil Frauchi öffnen/);
assert.match(debuts.div.innerHTML,/Vorläufiges Spielerprofil König öffnen/);
assert.doesNotMatch(debuts.div.innerHTML,/Vorläufiges Spielerprofil Fösu öffnen/);
debuts.action('profile','Frauchi');assert.match(debuts.div.innerHTML,/Noch keine Runde veröffentlicht/);assert.doesNotMatch(debuts.div.innerHTML,/Live-Rang/);
debuts.run(`window.BAERGSUNNE_PUBLIC_LIVE={status:'live',year:2026,players:['Frauchi','König'],rounds:[{number:1,results:[{player:'Frauchi',place:2,points:8},{player:'König',place:1,points:10}]}],standings:[{player:'König',rank:1,points:10},{player:'Frauchi',rank:2,points:8}]};draw()`);
assert.match(debuts.div.innerHTML,/Platz 2 · 8 Punkte/);assert.match(debuts.div.innerHTML,/Live-Rang/);assert.doesNotMatch(debuts.div.innerHTML,/Karriere-Entwicklung/);
debuts.run(`window.BAERGSUNNE_PUBLIC_LIVE.status='final';draw()`);assert.equal(debuts.run('provisionalPlayers().length'),0);pass('new player profiles use published live rounds only and leave archive statistics separate');
const data=c.run('JSON.stringify(db)');assert.equal(data,c.run('JSON.stringify(seed)'));pass('original data unchanged after actions');
c=boot();c.action('go','stats');c.action('tab','lab');
for(const chart of c.run('labTypes.map(x=>x[0])')){c.run(`labPrefs.chart=${JSON.stringify(chart)};draw()`);assert.equal(c.errors.length,0);}pass('six diagram types');
for(const edition of c.run('db.editions')){c.action('openyear',String(edition.year));for(let round=1;round<=edition.round_count;round++){c.action('round',String(round));assert.equal(c.errors.length,0);}}pass('all historical round transitions');
c.action('go','stats');c.action('tab','studio');
// Exercise the actual click handler rather than merely rendering the studio.
const oldGet=c.run('document.getElementById');c.run("document.getElementById=id=>id==='abStudio'?{}:null;abRerender=()=>{}");
for(const kind of ['years','rounds','places']){const id=c.run('ab.conditions[0].id'),button={dataset:{abQuick:'all:'+kind,abId:String(id)},hasAttribute:n=>n==='data-ab-quick'};for(const handler of c.events.click||[])handler({target:{closest:q=>q.includes('[data-ab-open]')?button:null},preventDefault(){},stopImmediatePropagation(){}});assert(c.run(`ab.conditions[0].${kind}.items.length`)>0);}pass('studio all-selection controls for years rounds places');
fs.writeFileSync(__dirname+'/WORK06_TEST_RESULT.json' ,JSON.stringify({environment:'Node VM; no browser or layout verification',checks:checks.length,results:checks},null,2));
