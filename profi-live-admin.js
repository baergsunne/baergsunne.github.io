import {qrSvg} from './profi-qr.js';
import {projectLiveClock,formatLiveClock} from './live/profi-clock.js';
const $=id=>document.getElementById(id),say=s=>$('message').textContent=s;
let token='',mode='official',current=null,clockOffset=0,busy=false;
const fmt=n=>Number(n||0).toLocaleString('de-CH'),txt=s=>document.createTextNode(String(s));
async function api(path,method='GET',data){
 const r=await fetch(path,{method,cache:'no-store',
  headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},
  body:data===undefined?undefined:JSON.stringify(data)});
 const response=await r.json();if(!r.ok)throw Error(response.error||'Serverfehler '+r.status);return response;
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
$('login-form').addEventListener('submit',e=>{e.preventDefault();guard(async()=>{
 const f=new FormData(e.target),r=await api('/api/login','POST',{username:f.get('username'),password:f.get('password')});
 token=r.token;e.target.reset();$('login').hidden=true;$('admin').hidden=false;await list();
})});
$('logout').onclick=()=>guard(async()=>{
 await api('/api/admin/logout','POST',{});token='';current=null;$('admin').hidden=true;$('game').hidden=true;$('selection').hidden=false;$('login').hidden=false;
});
$('create').addEventListener('submit',e=>{e.preventDefault();guard(async()=>{
 const f=new FormData(e.target),p={mode,stack:Number(f.get('stack')),rebuyStack:Number(f.get('rebuyStack')),addonStack:Number(f.get('addonStack'))};
 if(mode==='official'){p.year=Number(f.get('year'));p.round=Number(f.get('round'));}
 else {p.title=String(f.get('title')||'Privates Pokerturnier');p.names=String(f.get('names')).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);}
 const created=await api('/api/profi/create','POST',p);await openSession(created.id);
})});
async function list(){
 const r=await api('/api/profi/list');
 $('sessions').replaceChildren(...r.sessions.map(s=>{
  const b=document.createElement('button');b.textContent=s.title+' · '+(s.status==='cancelled'?'Abgebrochen':s.status==='finished'?'Beendet':s.status==='live'?'Läuft':'Bereit');b.onclick=()=>guard(()=>openSession(s.id));return b;
 }));
}
async function openSession(id){
 const s=await api('/api/profi/state?id='+encodeURIComponent(id));
 current={...s,id};$('selection').hidden=true;$('game').hidden=false;display();window.scrollTo?.(0,0);
}
async function refresh(){if(current)await openSession(current.id);else if(token)await list();}
$('back').onclick=()=>guard(async()=>{current=null;$('game').hidden=true;$('selection').hidden=false;await list()});
$('reload').onclick=()=>guard(refresh);
function action(action,name){
 return guard(async()=>{
  if(!current)return;
  const a=action;
  if(['out','finish','cancel','revoke'].includes(a)&&!confirm(a==='out'?name+' wirklich ausscheiden lassen?':a==='finish'?'Runde abschliessen und Ergebnisentwurf berechnen?':a==='cancel'?'Turnier abbrechen? Der QR-Zugang endet sofort; es werden keine Ergebnisse veröffentlicht.':'Alten Zuschauerlink ungültig machen?'))return;
  const r=await api('/api/profi/action','PUT',{id:current.id,revision:current.revision,action:a,name});
  current={...current,...r,viewerUrl:current.viewerUrl}; // refresh viewer token after revoke
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
 const doc=current.document,r=current.summary;
 if(!confirm('Rundenergebnis als Entwurf speichern?\n\n'+(r.places||[]).map((n,i)=>(i+1)+'. '+n).join('\n')+'\n\nNoch KEINE offizielle Veröffentlichung.'))return;
 const state=await api('/api/admin/state?year='+doc.year);
 if(state.document.status==='final')throw Error('Jahrgang bereits abgeschlossen.');
 await api('/api/profi/draft','POST',{id:current.id,revision:current.revision,championshipRevision:state.revision});
 say('Ergebnisentwurf gespeichert. Die offizielle Veröffentlichung erfolgt separat in der Administration.');
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
setInterval(()=>{if(current&&current.document.status==='live'&&!busy)refresh().catch(()=>{})},30000);
choose('official');
