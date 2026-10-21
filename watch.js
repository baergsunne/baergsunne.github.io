// Neutral, read-only spectator view. Token never enters a request URL or referrer.
const $=id=>document.getElementById(id);
const escNumber=n=>Number(n||0).toLocaleString('de-CH');
const fragment=new URLSearchParams(location.hash.slice(1));
const id=fragment.get('id')||'',token=fragment.get('token')||'';
let last=null,offset=0,loaded=false;
const valid=/^[a-f0-9]{32}$/.test(id)&&/^[a-f0-9]{64}$/.test(token);
function row(name,value,emph=false){const el=document.createElement('div');el.className='row'+(emph?' levelnow':'');const a=document.createElement('span'),b=document.createElement('span');a.textContent=name;b.textContent=value;el.append(a,b);return el;}
function setTab(name){document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===name);b.setAttribute('aria-pressed',String(b.dataset.tab===name));});document.querySelectorAll('[data-panel]').forEach(s=>s.hidden=s.dataset.panel!==name)}
for(const button of document.querySelectorAll('[data-tab]'))button.onclick=()=>setTab(button.dataset.tab);
function paint(){
 if(!last)return;const d=last,l=d.levels[d.index],next=d.levels[d.index+1];
 $('state').textContent=d.status==='setup'?'NOCH NICHT GESTARTET':d.status==='live'?'LIVE · '+d.activeCount+' SPIELER AKTIV':'TURNIER BEENDET';
 $('tournament').textContent=d.title;
 $('level').textContent='LEVEL '+(d.index+1)+' / '+d.levels.length;
 $('blinds').textContent=l.break?'PAUSE':escNumber(l.sb)+' / '+escNumber(l.bb);
 $('next').textContent=next?(next.break?'Nächste Stufe: Pause':'Nächstes Level: '+escNumber(next.sb)+' / '+escNumber(next.bb)):'Letzte Blindstufe';
 $('overview').replaceChildren(row('Teilnehmer',d.activeCount+' / '+d.totalCount),row('Rebuys',String(d.rebuys)),row('Add-ons',String(d.addons)),row('Status',d.status==='live'?(d.running?'Läuft':'Pausiert'):d.status==='setup'?'Noch nicht gestartet':'Abgeschlossen'));
 $('players').replaceChildren(...d.players.map(p=>row(p.name,(p.active?'Im Spiel':'Ausgeschieden')+(p.rebuys?' · '+p.rebuys+' Rebuy'+(p.rebuys===1?'':'s'):'')+(p.addons?' · '+p.addons+' Add-on':'') ,p.active)));
 $('structure').replaceChildren(...d.levels.map((x,i)=>row((i+1)+'. '+(x.break?'Pause':escNumber(x.sb)+' / '+escNumber(x.bb)+(x.ante?' · Ante '+escNumber(x.ante):'')),x.minutes+' Min.',i===d.index)));
 $('chips').replaceChildren(row('Gesamtchips',escNumber(d.totalChips)),row('Durchschnittlicher Stack',escNumber(d.averageStack)),row('Durchschnittliche Big Blinds',l.bb?String(Math.round(d.averageStack/l.bb)):'–'));
 $('timeline').replaceChildren(...d.events.slice().reverse().map(e=>row(new Date(e.at).toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit'})+' · '+e.name,{out:'Ausgeschieden',rebuy:'Rebuy',addon:'Add-on'}[e.type]||e.type)));
 tick();
}
function tick(){
 if(!last)return;
 const ms=last.running&&last.deadline?Math.max(0,last.deadline-(Date.now()-offset)):last.remainingMs;
 const secs=Math.ceil(ms/1000),min=Math.floor(secs/60);
 $('clock').textContent=String(min).padStart(2,'0')+':'+String(secs%60).padStart(2,'0');
}
async function sync(){
 if(!valid){$('notice').textContent='Der Zuschauerlink ist ungültig.';return;}
 try{
  const response=await fetch('/api/profi/watch?id='+encodeURIComponent(id),{cache:'no-store',headers:{'x-viewer-token':token}});
  if(!response.ok){
   if(response.status===403||response.status===410){$('notice').textContent='Dieser Zuschauerzugang ist nicht mehr gültig.';return;}
   throw new Error('Verbindung nicht verfügbar');
  }
  const r=await response.json();last=r;offset=Date.now()-r.serverTime;
  $('notice').textContent='Verbindung aktiv · Stand wird alle 30 Sekunden abgeglichen.';
  $('notice').hidden=true;loaded=true;paint();
 }catch(e){$('notice').hidden=false;$('notice').textContent=loaded?'Verbindung unterbrochen. Die letzte bekannte Uhrzeit wird weiter angezeigt, bis wieder eine Verbindung besteht.':'Verbindung noch nicht verfügbar. Bitte erneut versuchen.';}
}
window.addEventListener('online',sync);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
setInterval(tick,1000);
setInterval(()=>{if(!document.hidden)sync()},30000);
sync();
