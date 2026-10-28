import {projectLiveClock,formatLiveClock} from './live/profi-clock.js';
// Neutral, read-only spectator view. Token never enters a request URL or referrer.
const $=id=>document.getElementById(id);
const escNumber=n=>Number(n||0).toLocaleString('de-CH');
const fragment=new URLSearchParams(location.hash.slice(1));
const id=fragment.get('id')||'',token=fragment.get('token')||'';
let last=null,offset=0,loaded=false,closed=false,activeSync=false,lastSyncAt=0,socket=null,nextSocketTry=0;
const valid=/^[a-f0-9]{32}$/.test(id)&&/^[a-f0-9]{64}$/.test(token);
function row(name,value,emph=false){const el=document.createElement('div');el.className='row'+(emph?' levelnow':'');const a=document.createElement('span'),b=document.createElement('span');a.textContent=name;b.textContent=value;el.append(a,b);return el;}
function setTab(name){document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===name);b.setAttribute('aria-pressed',String(b.dataset.tab===name));});document.querySelectorAll('[data-panel]').forEach(s=>s.hidden=s.dataset.panel!==name)}
for(const button of document.querySelectorAll('[data-tab]'))button.onclick=()=>setTab(button.dataset.tab);
function paint(){
 if(!last)return;const d=last;
 $('state').textContent=d.status==='setup'?'NOCH NICHT GESTARTET':d.status==='live'?'LIVE · '+d.activeCount+' SPIELER AKTIV':'TURNIER BEENDET';
 $('tournament').textContent=d.title;
  $('overview').replaceChildren(row('Teilnehmer',d.activeCount+' / '+d.totalCount),row('Rebuys',String(d.rebuys)),row('Add-ons',String(d.addons)),row('Status',d.status==='live'?(d.running?'Läuft':'Pausiert'):d.status==='setup'?'Noch nicht gestartet':'Abgeschlossen'));
 $('players').replaceChildren(...d.players.map(p=>row(p.name,(p.active?'Im Spiel':'Ausgeschieden')+(p.rebuys?' · '+p.rebuys+' Rebuy'+(p.rebuys===1?'':'s'):'')+(p.addons?' · '+p.addons+' Add-on':'') ,p.active)));
 $('structure').replaceChildren(...d.levels.map((x,i)=>{const item=row((i+1)+'. '+(x.break?'Pause':escNumber(x.sb)+' / '+escNumber(x.bb)+(x.ante?' · Ante '+escNumber(x.ante):'')),x.minutes+' Min.');item.dataset.level=String(i);return item;}));
 $('chips').replaceChildren(row('Gesamtchips',escNumber(d.totalChips)),row('Durchschnittlicher Stack',escNumber(d.averageStack)),row('Durchschnittliche Big Blinds','–'));

 $('timeline').replaceChildren(...d.events.slice().reverse().map(e=>row(new Date(e.at).toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit'})+' · '+e.name,{out:'Ausgeschieden',rebuy:'Rebuy',addon:'Add-on'}[e.type]||e.type)));
 tick();
}
function tick(){
 if(!last || closed)return;
 const projected=projectLiveClock(last,Date.now()-offset),lev=projected.current,next=projected.next;
 $('clock').textContent=formatLiveClock(projected.remainingMs);
 $('level').textContent='LEVEL '+(projected.index+1)+' / '+last.levels.length;
 $('blinds').textContent=lev.break?'PAUSE':escNumber(lev.sb)+' / '+escNumber(lev.bb);
 $('next').textContent=next?(next.break?'Nächste Stufe: Pause':'Nächstes Level: '+escNumber(next.sb)+' / '+escNumber(next.bb)):'Letzte Blindstufe';
 for(const x of document.querySelectorAll('[data-level]'))x.classList.toggle('levelnow',Number(x.dataset.level)===projected.index);
 const chips=$('chips');if(chips.lastChild)chips.lastChild.lastChild.textContent=lev.bb?String(Math.round(last.averageStack/lev.bb)):'–';
}
function connectSocket(){
 if(closed||!last?.pushEnabled||!('WebSocket' in window)||Date.now()<nextSocketTry)return;
 if(socket&&(socket.readyState===WebSocket.CONNECTING||socket.readyState===WebSocket.OPEN))return;
 nextSocketTry=Date.now()+15000;
 try{
  const address=location.origin.replace(/^http/,'ws')+'/api/profi/socket?id='+encodeURIComponent(id);
  socket=new WebSocket(address,['bp-viewer','token-'+token]);
  socket.onmessage=e=>{
   try{const message=JSON.parse(e.data);if(message.event==='update')sync();}catch{}
  };
  socket.onclose=()=>{socket=null;nextSocketTry=Date.now()+15000;};
  socket.onerror=()=>{try{socket?.close();}catch{}};
 }catch{socket=null;}
}
async function sync(){
 if(!valid){$('notice').textContent='Der Zuschauerlink ist ungültig.';return;}
 if(closed||activeSync)return;activeSync=true;
 try{
  const response=await fetch('/api/profi/watch?id='+encodeURIComponent(id),{cache:'no-store',headers:{'x-viewer-token':token}});
  if(!response.ok){
   if(response.status===403||response.status===410){closed=true;last=null;try{socket?.close();}catch{}document.querySelectorAll('[data-panel]').forEach(p=>p.replaceChildren());$('level').textContent='ZUGANG BEENDET';$('clock').textContent='--:--';$('blinds').textContent='– / –';$('notice').hidden=false;$('notice').textContent='Dieser Zuschauerzugang ist nicht mehr gültig.';return;}
   throw new Error('Verbindung nicht verfügbar');
  }
  const r=await response.json();last=r;offset=Date.now()-r.serverTime;lastSyncAt=Date.now();
  $('notice').textContent=last.pushEnabled?'Live-Verbindung aktiv · Änderungen werden sofort übertragen.':'Verbindung aktiv · regelmässiger Datenabgleich.';
  $('notice').hidden=true;loaded=true;paint();connectSocket();
 }catch(e){$('notice').hidden=false;$('notice').textContent=loaded?'Verbindung unterbrochen. Die letzte bekannte Uhrzeit wird weiter angezeigt, bis wieder eine Verbindung besteht.':'Verbindung noch nicht verfügbar. Bitte erneut versuchen.';}finally{activeSync=false;}
}
window.addEventListener('online',sync);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
setInterval(tick,1000);
setInterval(()=>{if(document.hidden||closed)return;if(socket?.readyState===WebSocket.OPEN&&Date.now()-lastSyncAt<300000)return;sync()},30000);
sync();
