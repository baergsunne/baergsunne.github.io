import {publicSnapshot,finalizedEdition} from './live/core.js';
const adminOrigin=(window.BAERGSUNNE_API_URL||'').replace(/\/$/,'');
if(adminOrigin&&location.origin!==adminOrigin)location.replace(adminOrigin+'/admin.html');
const $=id=>document.getElementById(id);let token='',state=null,year=2026,pending=false;
if(!window.BAERGSUNNE_API_URL){document.querySelector('#login-form button').disabled=true;document.querySelector('#login a').hidden=true;document.getElementById('message').textContent='Administration noch nicht aktiviert.';}
function note(s){$('message').textContent=s}
async function api(path,method='GET',value){const response=await fetch(path,{method,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:value===undefined?undefined:JSON.stringify(value),cache:'no-store'});const result=await response.json();if(!response.ok)throw Error(result.error||`HTTP ${response.status}`);return result}
async function attempt(fn){if(pending)return;pending=true;try{await fn()}catch(e){
 if(e.message==='Stand veraltet.'||e.message.startsWith('Zwischenzeitlich geändert.')){
  try{await reload();note('Stand aktualisiert. Platzierungen prüfen und erneut veröffentlichen.')}catch(loadError){note(loadError.message)}
 }else note(e.message);
 if(e.message==='Anmeldung erforderlich.'){$('panel').hidden=true;$('login').hidden=false;token=''}
}finally{pending=false}}
function selected(){return [...document.querySelectorAll('[data-place]')].map(x=>x.value)}
function render(){const t=state.document,round=Number($('round').value)||1,$round=$('round');
 $('heading').textContent=`${t.year} · ${t.status} · Version ${state.revision??'neu'}`;$('year').value=year;
 $round.replaceChildren(...Array.from({length:t.roundCount},(_,i)=>new Option('Runde '+(i+1),i+1)));$round.value=String(Math.min(round,t.roundCount));
 $('players').value=t.players.join('\n');$('round-count').value=t.roundCount;$('points').value=t.points.join(', ');
 $('configuration').hidden=t.status!=='planned'||Object.keys(t.rounds).length>0;
 $('round-panel').hidden=state.revision===null||t.status==='final';$('finalize').hidden=t.status==='final'||state.revision===null;
 renderRound();const board=publicSnapshot(t,state.updated_at).standings;
 $('standings').replaceChildren(...board.map(x=>{const row=document.createElement('div');row.className='stand-row';for(const value of [`${x.rank}.`,x.player,`${x.points} Pkt.`,`${x.wins} Siege`]){const cell=document.createElement('span');cell.textContent=value;row.append(cell)}return row}));
}
function renderRound(){const t=state.document,n=Number($('round').value),places=t.rounds[n]||t.published[n]||[];
 $('places').replaceChildren(...t.players.map((_,i)=>{const label=document.createElement('label');label.className='place';label.textContent=`${i+1}. Platz`;const select=document.createElement('select');select.dataset.place=String(i);select.append(new Option('Spieler wählen',''),...t.players.map(p=>new Option(p,p)));select.value=places[i]||'';label.append(select);return label}));
 $('withdraw').disabled=!t.published[n];$('draft').disabled=t.status==='final';}
async function reload(){state=await api('/api/admin/state?year='+year);render();note('Stand geladen. Änderungen anderer Geräte sind sichtbar.')}
$('login-form').onsubmit=e=>{e.preventDefault();attempt(async()=>{const form=new FormData(e.target),result=await api('/api/login','POST',{username:form.get('username'),password:form.get('password')});token=result.token;e.target.reset();$('login').hidden=true;$('panel').hidden=false;await reload()})};
$('logout').onclick=()=>attempt(async()=>{await api('/api/admin/logout','POST',{});token='';state=null;$('panel').hidden=true;$('login').hidden=false;note('Abgemeldet.')});
$('load').onclick=()=>attempt(async()=>{year=Number($('year').value);if(!Number.isInteger(year)||year<2026||year>2100)throw Error('Jahr ungültig.');await reload()});
$('round').onchange=renderRound;
$('save-config').onclick=()=>attempt(async()=>{const document={year,players:$('players').value.split('\n').map(x=>x.trim()).filter(Boolean),roundCount:Number($('round-count').value),points:$('points').value.split(',').map(x=>Number(x.trim()))};await api('/api/admin/config','PUT',{revision:state.revision,document});await reload();note('Konfiguration gespeichert.')});
$('draft').onclick=()=>attempt(async()=>{const places=selected();await api('/api/admin/round','PUT',{year,round:Number($('round').value),places,revision:state.revision,action:'draft'});await reload();note('Entwurf gespeichert. Öffentlich noch nicht sichtbar.')});
$('publish').onclick=()=>attempt(async()=>{const places=selected(),number=Number($('round').value),t=state.document,summary=places.map((p,i)=>`${i+1}. ${p} · ${t.points[i]} Punkte`).join('\n');if(!confirm(`Runde ${number} offiziell veröffentlichen?\n\n${summary}`))return;await api('/api/admin/round','PUT',{year,round:number,places,revision:state.revision,action:'publish'});await reload();note('Runde veröffentlicht.')});
$('withdraw').onclick=()=>attempt(async()=>{const number=Number($('round').value);if(!confirm(`Veröffentlichung von Runde ${number} zurückziehen? Das wird protokolliert.`))return;await api('/api/admin/round','PUT',{year,round:number,revision:state.revision,action:'withdraw'});await reload();note('Veröffentlichung zurückgezogen; Entwurf bleibt erhalten.')});
$('finalize').onclick=()=>attempt(async()=>{const edition=finalizedEdition(state.document),confirmation=edition.official_standings.map(x=>`${x.place}. ${x.player_id} ${x.points}`).join(' | ');if(!confirm(`Schlussrangliste ${year} prüfen:\n\n${confirmation.replaceAll(' | ','\n')}\n\nTurnier verbindlich abschliessen und ins Archiv übernehmen?`))return;await api('/api/admin/finalize','POST',{year,revision:state.revision,confirmation});await reload();note('Saison bestätigt und automatisch archiviert.')});
$('audit-button').onclick=()=>attempt(async()=>{const x=await api('/api/admin/audit?year='+year);$('audit').replaceChildren(...x.events.map(e=>{const li=document.createElement('li');li.textContent=`${e.recorded_at} · ${e.action} · Revision ${e.revision}`;return li}))});
