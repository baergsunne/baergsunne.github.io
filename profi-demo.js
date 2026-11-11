import {qrSvg} from './profi-qr.js';
import {projectLiveClock,formatLiveClock} from './live/profi-clock.js';
const $=id=>document.getElementById(id),say=s=>$('message').textContent=s;
let operator='',mode='official',current=null,clockOffset=0,busy=false;
const KEY='bp_profi_public_demo_v1';
const stored=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}};
const remember=(data)=>{operator=data.operator;localStorage.setItem(KEY,JSON.stringify({id:data.id,operator:data.operator,expiresAt:data.expiresAt}))};
const fmt=n=>Number(n||0).toLocaleString('de-CH'),txt=s=>document.createTextNode(String(s));
async function api(path,method='GET',data){
 const r=await fetch(path,{method,cache:'no-store',headers:{'content-type':'application/json',...(operator?{'x-demo-operator':operator}:{})},
  body:data===undefined?undefined:JSON.stringify(data)});
 const value=await r.json();if(!r.ok)throw Error(value.error||'Demo derzeit nicht verfügbar ('+r.status+')');return value;
}

async function guard(task){
 if(busy)return;busy=true;say('');
 try{await task();}catch(e){say(e.message);if(e.message.includes('verändert')||e.message.includes('neu laden'))await refresh().catch(()=>{});}
 finally{busy=false;}
}
function choose(value){
 mode=value;for(const b of document.querySelectorAll('[data-mode]'))b.classList.toggle('chosen',b.dataset.mode===mode);
 $('year-wrap').hidden=mode!=='official';$('round-wrap').hidden=mode!=='official';$('free-fields').hidden=mode!=='free';
}
for(const b of document.querySelectorAll('[data-mode]'))b.addEventListener('click',()=>choose(b.dataset.mode));
$('logout').onclick=()=>guard(async()=>{
 if(current&&['setup','live'].includes(current.document.status)){
  if(!confirm('Bisherigen Demotest abbrechen und einen neuen beginnen?'))return;
  try{await api('/api/profi/demo/action?id='+encodeURIComponent(current.id),'PUT',{revision:current.revision,action:'cancel'});}catch{}
 }
 localStorage.removeItem(KEY);operator='';current=null;
 $('game').hidden=true;$('selection').hidden=false;await list();
});
$('quickstart').onclick=()=>{
 if(mode==='free'){
  $('create').elements.namedItem('title').value='Firmenpoker · Schnelltest';
  $('create').elements.namedItem('names').value=Array.from({length:10},(_,i)=>'Testspieler '+(i+1)).join('\n');
 }
 $('create').requestSubmit();
};
$('create').addEventListener('submit',e=>{e.preventDefault();guard(async()=>{
 const f=new FormData(e.target),p={mode,stack:Number(f.get('stack')),rebuyStack:Number(f.get('rebuyStack')),addonStack:Number(f.get('addonStack'))};
 if(mode==='official'){p.year=Number(f.get('year'));p.round=Number(f.get('round'));}
 else {p.title=String(f.get('title')||'Privates Pokerturnier');p.names=String(f.get('names')).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);}
 operator='';const created=await api('/api/profi/demo/create','POST',p);remember(created);await openSession(created.id);
})});
async function list(){
 const record=stored();
 $('sessions').replaceChildren();
 if(!record||record.expiresAt<=Date.now()){
  if(record)localStorage.removeItem(KEY);
  const note=document.createElement('p');note.className='minor';note.textContent='Noch keine aktive Demo. Wähle oben eine Betriebsart.';$('sessions').append(note);return;
 }
 const b=document.createElement('button');b.textContent='Letzte Demo fortsetzen';
 b.onclick=()=>guard(async()=>{operator=record.operator;await openSession(record.id);});
 $('sessions').append(b);
}
async function openSession(id){
 const s=await api('/api/profi/demo/state?id='+encodeURIComponent(id));
 current={...s,id};$('selection').hidden=true;$('game').hidden=false;display();window.scrollTo?.(0,0);
}
async function refresh(){if(current)await openSession(current.id);else await list();}
$('back').onclick=()=>guard(async()=>{current=null;$('game').hidden=true;$('selection').hidden=false;await list()});
$('reload').onclick=()=>guard(refresh);
function action(action,name){
 return guard(async()=>{
  if(!current)return;
  const a=action;
  if(['out','finish','cancel','revoke'].includes(a)&&!confirm(a==='out'?name+' wirklich ausscheiden lassen?':a==='finish'?'Runde abschliessen und Ergebnisentwurf berechnen?':a==='cancel'?'Turnier abbrechen? Der QR-Zugang endet sofort; es werden keine Ergebnisse veröffentlicht.':'Alten Zuschauerlink ungültig machen?'))return;
  const r=await api('/api/profi/demo/action?id='+encodeURIComponent(current.id),'PUT',{revision:current.revision,action:a,name});
  current={...current,...r}; // viewer URLs rotate safely with token revocation
  if(a==='revoke'||a==='cancel')await refresh();else display();
 });
}
for(const b of document.querySelectorAll('[data-action]'))b.onclick=()=>action(b.dataset.action);
$('start').onclick=()=>action('start');
$('finish').onclick=()=>action('finish');
$('cancel').onclick=()=>action('cancel');
$('revoke').onclick=()=>action('revoke');
$('copy-link').onclick=()=>guard(async()=>{
 if(!current)return;
 try{await navigator.clipboard.writeText(current.viewerUrl);say('Zuschauerlink kopiert.');}
 catch{say('Link im Feld darüber auswählen und kopieren.');}
});
$('draft').onclick=()=>guard(async()=>{
 if(!current||current.document.mode!=='official'||current.document.status!=='finished')return;
 const result=await api('/api/profi/demo/draft?id='+encodeURIComponent(current.id));
 alert('REINE TESTSIMULATION – kein Speichern, keine Veröffentlichung.\n\n'+result.places.map(p=>p.place+'. '+p.name+' ('+p.points+' Punkte)').join('\n'));
 say('Ergebnis simuliert. Keine Daten wurden in Bärgsunne übernommen.');
});
function makeButton(label,fn){
 const b=document.createElement('button');b.textContent=label;b.onclick=fn;return b;
}
function line(label,value){
 const row=document.createElement('div');row.className='score';
 const a=document.createElement('span'),b=document.createElement('strong');a.textContent=label;b.textContent=value;row.append(a,b);return row;
}
function display(){
 if(!current)return;
 const d=current.document,r=current.summary,lev=r.levels[r.index],next=r.levels[r.index+1],places=r.places;
 $('type').textContent=d.mode==='official'?'OFFIZIELLE RUNDE '+d.year+' / '+d.round:'FREIES TURNIER';
 $('title').textContent=d.title;
 $('status').textContent=d.status==='setup'?'Bereit':d.status==='live'?'Live':d.status==='cancelled'?'Abgebrochen':'Beendet';
 $('current').textContent='Level '+(r.index+1)+' von '+r.levels.length+(lev.break?' · Pause':'');
 $('blinds').textContent=lev.break?'PAUSE':fmt(lev.sb)+' / '+fmt(lev.bb);
 $('next').textContent=next?(next.break?'Nächste Stufe: Pause':'Nächste Stufe: '+fmt(next.sb)+' / '+fmt(next.bb)):'Letztes Blindlevel';
 $('counts').textContent=r.activeCount+' von '+r.totalCount+' Spielern aktiv';
 $('start').hidden=d.status!=='setup';$('finish').hidden=d.status!=='live'||!places;
 $('cancel').hidden=d.status==='finished'||d.status==='cancelled';$('revoke').disabled=d.status==='finished'||d.status==='cancelled';
 for(const b of document.querySelectorAll('[data-action]'))b.disabled=d.status!=='live' || (b.dataset.action==='pause'&&!r.running)||(b.dataset.action==='resume'&&r.running);
 $('players').replaceChildren(...r.players.map(p=>{
  const row=document.createElement('div');row.className='player'+(p.active?'':' inactive');
  const desc=document.createElement('span');desc.textContent=p.name+' · '+(p.active?'Im Spiel':'Ausgeschieden')+' · '+p.rebuys+' Rebuys · '+p.addons+' Add-ons';
  row.append(desc);
  if(d.status==='live'){
   if(p.active){
    row.append(makeButton('Ausscheiden',()=>action('out',p.name)),makeButton('Rebuy',()=>action('rebuy',p.name)),makeButton('Add-on',()=>action('addon',p.name)));
   }else row.append(makeButton('Rebuy / Rückkehr',()=>action('rebuy',p.name)));
  }
  return row;
 }));
 $('chips').replaceChildren(line('Gesamtchips',fmt(r.totalChips)),line('Ø Startstack',fmt(r.averageStack)),line('Rebuys',String(r.rebuys)),line('Add-ons',String(r.addons)));
 $('events').replaceChildren(...[...r.events].reverse().map(e=>{const li=document.createElement('li');li.textContent=new Date(e.at).toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit'})+' · '+e.name+' · '+({out:'ausgeschieden',rebuy:'Rebuy',addon:'Add-on'}[e.type]||e.type);return li;}));
 $('share-url').textContent=current.viewerUrl;$('share-url').href=current.viewerUrl;
 try{$('qr').innerHTML=qrSvg(current.viewerUrl);}catch(e){$('qr').textContent='QR-Code derzeit nicht verfügbar: '+e.message;}
 $('results').replaceChildren(...(places?places.map((p,i)=>line((i+1)+'. Platz',p)):[txt('Noch kein vollständiges Rundenergebnis.')]));
 $('draft').hidden=!(d.mode==='official'&&d.status==='finished');
 clockOffset=Date.now()-r.serverTime;tick();
}
function tick(){
 if(!current)return;
 const r=current.summary,projection=projectLiveClock(r,Date.now()-clockOffset),level=projection.current,next=projection.next;
 $('clock').textContent=formatLiveClock(projection.remainingMs);
 $('current').textContent='Level '+(projection.index+1)+' von '+r.levels.length+(level.break?' · Pause':'');
 $('blinds').textContent=level.break?'PAUSE':fmt(level.sb)+' / '+fmt(level.bb);
 $('next').textContent=next?(next.break?'Nächste Stufe: Pause':'Nächste Stufe: '+fmt(next.sb)+' / '+fmt(next.bb)):'Letztes Blindlevel';
}

setInterval(tick,1000);
setInterval(()=>{if(current&&current.document.status==='live'&&!busy)refresh().catch(()=>{})},10000);
choose('official');
list();
const resume=stored();
if(resume&&resume.expiresAt>Date.now()){
 operator=resume.operator;
 guard(async()=>{await openSession(resume.id);});
}
