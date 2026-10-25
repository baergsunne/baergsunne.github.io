import {publicSnapshot,finalizedEdition} from './live/core.js';

const adminOrigin=(window.BAERGSUNNE_API_URL||'').replace(/\/$/,'');
if(adminOrigin&&location.origin!==adminOrigin)location.replace(adminOrigin+'/admin.html');
const $=id=>document.getElementById(id);
const historicalEditions=Array.isArray(window.POKER_SEED?.editions)?window.POKER_SEED.editions:[];
let token='',state=null,year=2026,pending=false,managedYears=[],nextYear=null;

if(!window.BAERGSUNNE_API_URL){
 $('login-form').querySelector('button').disabled=true;
 $('login').querySelector('a').hidden=true;
 message('Administration noch nicht aktiviert.','error');
}
function message(text,kind='info',scroll=false){
 const el=$('message');
 el.textContent=text;
 el.dataset.kind=kind;
 if(scroll){
  requestAnimationFrame(()=>{
   window.scrollTo(0,0);
   try{el.focus({preventScroll:true})}catch(_){el.focus()}
  });
 }
}
function success(text){message(text,'success',true)}
function cancelled(){message('Vorgang abgebrochen. Es wurde nichts geändert.','info',true)}
async function api(path,method='GET',value){
 const response=await fetch(path,{method,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:value===undefined?undefined:JSON.stringify(value),cache:'no-store'});
 const result=await response.json();
 if(!response.ok)throw Error(result.error||`HTTP ${response.status}`);
 return result;
}
function setBusy(busy){
 // Never allow another mutation while a request is pending, but restore each
 // button's original disabled state afterwards (e.g. disabled Withdraw).
 document.querySelectorAll('button').forEach(button=>{
  if(busy){button.dataset.adminWasDisabled=button.disabled?'yes':'no';button.disabled=true}
  else if(button.dataset.adminWasDisabled){button.disabled=button.dataset.adminWasDisabled==='yes';delete button.dataset.adminWasDisabled}
 });
}
async function attempt(fn){
 if(pending)return;
 pending=true;setBusy(true);
 try{await fn()}catch(e){
  if(e.message==='Stand veraltet.'||e.message.startsWith('Zwischenzeitlich geändert.')){
   try{await refreshYears();await reload({silent:true});message('Der Stand wurde zwischenzeitlich geändert. Aktuelle Platzierungen neu prüfen und erneut bestätigen.','error',true)}
   catch(loadError){message(loadError.message,'error',true)}
  }else message(e.message,'error',true);
  if(e.message==='Anmeldung erforderlich.'){$('panel').hidden=true;$('login').hidden=false;token='';state=null}
 }finally{pending=false;setBusy(false)}
}
function selected(){return [...document.querySelectorAll('[data-place]')].map(x=>x.value)}
function confirmedPlaces(){
 if(!state)throw Error('Zuerst ein aktives Turnier laden.');
 const places=selected(),players=state.document.players;
 if(places.length!==players.length||places.some(x=>!x)||new Set(places).size!==places.length||places.some(x=>!players.includes(x)))
  throw Error('Bitte jeden Spieler genau einmal platzieren.');
 return places;
}
function managed(yearNumber){return managedYears.find(x=>x.year===yearNumber)}
function archived(yearNumber){return historicalEditions.find(x=>x.year===yearNumber)}
function renderYears(){
 const allYears=[...new Set([...historicalEditions.map(x=>x.year),...managedYears.map(x=>x.year)])].sort((a,b)=>b-a);
 $('year').replaceChildren(...allYears.map(n=>{
  const current=managed(n),label=current?current.status==='final'?'abgeschlossen':current.status==='live'?'live':'geplant':'Archiv · schreibgeschützt';
  return new Option(`${n} · ${label}`,String(n));
 }));
 if(allYears.includes(year))$('year').value=String(year);
 if(nextYear){
  $('start-new').hidden=false;
  $('next-year-note').textContent=`Nächstes Turnier: ${nextYear}. Es wird erst nach zwei Bestätigungen eröffnet. Alle bisherigen Ergebnisse bleiben unverändert; die neue Saison startet ohne veröffentlichte Runden.`;
 }else $('start-new').hidden=true;
}
async function refreshYears(useLatest=false){
 const result=await api('/api/admin/years');
 managedYears=result.years||[];
 nextYear=result.next_year;
 if(useLatest&&result.current_year)year=result.current_year;
 renderYears();
}
function renderHistorical(edition){
 state=null;
 $('heading').textContent=`${edition.year} · Historisches Archiv · schreibgeschützt`;
 $('configuration').hidden=true;
 $('round-panel').hidden=true;
 $('finalize').hidden=true;
 $('audit-panel').hidden=true;
 $('standings').replaceChildren(...(edition.official_standings||[]).slice().sort((a,b)=>a.place-b.place).map(item=>{
  const row=document.createElement('div');row.className='stand-row';
  for(const value of [`${item.place}.`,item.player_id,`${item.points} Pkt.`,'Archiv']){
   const cell=document.createElement('span');cell.textContent=value;row.append(cell)
  }
  return row;
 }));
 message(`Turnier ${edition.year} aus dem historischen Archiv geladen. Diese Originalresultate sind schreibgeschützt.`,'info',true);
}
function render(){
 const t=state.document,round=Number($('round').value)||1,$round=$('round');
 $('heading').textContent=`${t.year} · ${t.status==='final'?'abgeschlossen':t.status==='live'?'live':'geplant'} · Version ${state.revision??'neu'}`;
 $('year').value=String(year);
 $round.replaceChildren(...Array.from({length:t.roundCount},(_,i)=>new Option('Runde '+(i+1),i+1)));
 $round.value=String(Math.min(round,t.roundCount));
 $('players').value=t.players.join('\n');
 $('round-count').value=t.roundCount;
 $('points').value=t.points.join(', ');
 $('configuration').hidden=t.status!=='planned'||Object.keys(t.rounds).length>0;
 $('round-panel').hidden=state.revision===null||t.status==='final';
 $('finalize').hidden=t.status==='final'||state.revision===null;
 $('audit-panel').hidden=false;
 renderRound();
 const board=publicSnapshot(t,state.updated_at).standings;
 const publishedCount=Object.keys(t.published).length;
 if(!publishedCount){
  const info=document.createElement('p');
  info.className='muted';
  info.textContent='Noch keine Runde veröffentlicht. Die offizielle Rangliste erscheint nach der ersten Veröffentlichung.';
  $('standings').replaceChildren(info);
 }else{
  $('standings').replaceChildren(...board.map(item=>{
   const row=document.createElement('div');row.className='stand-row';
   for(const value of [`${item.rank}.`,item.player,`${item.points} Pkt.`,`${item.wins} Siege`]){
    const cell=document.createElement('span');cell.textContent=value;row.append(cell)
   }
   return row;
  }));
 }
}
function renderRound(){
 if(!state)return;
 const t=state.document,n=Number($('round').value),places=t.rounds[n]||t.published[n]||[];
 $('places').replaceChildren(...t.players.map((_,i)=>{
  const label=document.createElement('label');label.className='place';label.textContent=`${i+1}. Platz`;
  const select=document.createElement('select');select.dataset.place=String(i);
  select.append(new Option('Spieler wählen',''),...t.players.map(p=>new Option(p,p)));
  select.value=places[i]||'';
  label.append(select);return label;
 }));
 $('withdraw').disabled=!t.published[n];
 $('draft').disabled=t.status==='final';
}
async function reload({silent=false}={}){
 if(!managed(year)){
  const old=archived(year);
  if(!old)throw Error('Dieses Turnierjahr ist nicht vorhanden. Neues Turnier nur über «Neues Turnier eröffnen» starten.');
  renderHistorical(old);
  return;
 }
 state=await api('/api/admin/state?year='+year);
 render();
 if(!silent)message(`Turnier ${year} geladen. Änderungen anderer Geräte sind sichtbar.`,'info',true);
}
$('login-form').onsubmit=e=>{
 e.preventDefault();
 attempt(async()=>{
  const form=new FormData(e.target),result=await api('/api/login','POST',{username:form.get('username'),password:form.get('password')});
  token=result.token;
  e.target.reset();
  $('login').hidden=true;$('panel').hidden=false;
  await refreshYears(true);await reload({silent:true});
  success(`Angemeldet. Turnier ${year} geladen.`);
 });
};
$('logout').onclick=()=>attempt(async()=>{
 await api('/api/admin/logout','POST',{});
 token='';state=null;$('panel').hidden=true;$('login').hidden=false;message('Erfolgreich abgemeldet.','success',true);
});
$('load').onclick=()=>attempt(async()=>{
 year=Number($('year').value);
 if(!Number.isInteger(year)||!managed(year)&&!archived(year))throw Error('Bitte ein bestehendes Turnierjahr auswählen.');
 await reload();
});
$('start-tournament').onclick=()=>attempt(async()=>{
 await refreshYears();
 if(!nextYear){message('Ein neues Turnier ist erst nach Abschluss des aktuellen Turniers möglich.','error',true);return}
 const previous=managedYears[0];
 if(!confirm(`Neues Bärgsunne-Turnier starten?\n\nNach deiner Bestätigung wird ein neuer Jahrgang vorbereitet. Das wirkt sich auf die gesamte Live-Website aus, sobald das Turnier eröffnet ist. Bisherige Turnierresultate bleiben erhalten.\n\nWillst du fortfahren?`)){cancelled();return}
 if(!confirm(`Ist ${nextYear} das nächste offizielle Bärgsunne-Poker-Turnier?\n\nDu bestätigst ausdrücklich das neue Turnierjahr ${nextYear}. Spieler, Rundenanzahl und Punkte werden als Vorlage vom Turnier ${previous.year} übernommen und können vor der ersten Runde angepasst werden.\n\nTurnier ${nextYear} jetzt eröffnen?`)){cancelled();return}
 const opened=await api('/api/admin/new-tournament','POST',{year:nextYear,previousYear:previous.year,previousRevision:previous.revision,confirmation:'NEXT_TOURNAMENT'});
 year=opened.year;
 await refreshYears();
 await reload({silent:true});
 success(`Turnier ${year} erfolgreich eröffnet. Status: geplant. Noch keine Runde veröffentlicht. Die Live-Seite übernimmt den neuen Jahrgang; die bisherige Turnierhistorie bleibt erhalten.`);
});
$('round').onchange=renderRound;
$('save-config').onclick=()=>attempt(async()=>{
 if(!state)throw Error('Zuerst ein verwaltetes Turnier laden.');
 const document={year,players:$('players').value.split('\n').map(x=>x.trim()).filter(Boolean),
  roundCount:Number($('round-count').value),points:$('points').value.split(',').map(x=>Number(x.trim()))};
 if(!confirm(`Einstellungen für ${year} speichern?\n\nTeilnehmer: ${document.players.length}\nRunden: ${document.roundCount}\nPunktesystem: ${document.points.join(', ')}\n\nVor dem Speichern alle Angaben prüfen.`)){cancelled();return}
 await api('/api/admin/config','PUT',{revision:state.revision,document});
 await refreshYears();await reload({silent:true});
 success(`Turniereinstellungen ${year} gespeichert und vom System bestätigt.`);
});
$('draft').onclick=()=>attempt(async()=>{
 const places=confirmedPlaces(),number=Number($('round').value),summary=places.map((p,i)=>`${i+1}. ${p}`).join('\n');
 if(!confirm(`Entwurf für Runde ${number} (${year}) speichern?\n\n${summary}\n\nDer Entwurf wird gespeichert, aber noch NICHT öffentlich angezeigt.\n\nBestätigen oder abbrechen?`)){cancelled();return}
 await api('/api/admin/round','PUT',{year,round:number,places,revision:state.revision,action:'draft'});
 await refreshYears();await reload({silent:true});
 success(`Entwurf für Runde ${number} gespeichert. Die Änderung wurde bestätigt und ist noch nicht veröffentlicht. Du kannst über «← Live-Seite» zurückkehren.`);
});
$('publish').onclick=()=>attempt(async()=>{
 const places=confirmedPlaces(),number=Number($('round').value),t=state.document;
 const summary=places.map((p,i)=>`${i+1}. ${p} · ${t.points[i]} Punkte`).join('\n');
 if(!confirm(`Runde ${number} im Turnier ${year} OFFIZIELL veröffentlichen?\n\n${summary}\n\nDiese Resultate werden nach der Bestätigung auf der öffentlichen Live-Seite sichtbar.\n\nVeröffentlichen?`)){cancelled();return}
 await api('/api/admin/round','PUT',{year,round:number,places,revision:state.revision,action:'publish'});
 await refreshYears();await reload({silent:true});
 success(`Runde ${number} erfolgreich veröffentlicht und bestätigt. Die Resultate sind jetzt für die Live-Seite freigegeben. Du kannst über «← Live-Seite» zurückkehren.`);
});
$('withdraw').onclick=()=>attempt(async()=>{
 if(!state)throw Error('Zuerst ein aktives Turnier laden.');
 const number=Number($('round').value);
 if(!confirm(`Veröffentlichung der Runde ${number} (${year}) wirklich zurückziehen? Der Vorgang wird protokolliert.`)){cancelled();return}
 await api('/api/admin/round','PUT',{year,round:number,revision:state.revision,action:'withdraw'});
 await refreshYears();await reload({silent:true});
 success(`Veröffentlichung von Runde ${number} zurückgezogen und bestätigt. Der gespeicherte Entwurf bleibt erhalten.`);
});
$('finalize').onclick=()=>attempt(async()=>{
 if(!state)throw Error('Zuerst ein aktives Turnier laden.');
 const edition=finalizedEdition(state.document),confirmation=edition.official_standings.map(x=>`${x.place}. ${x.player_id} ${x.points}`).join(' | ');
 if(!confirm(`Schlussrangliste ${year} prüfen:\n\n${confirmation.replaceAll(' | ','\n')}\n\nTurnier verbindlich abschliessen und ins Archiv übernehmen?`)){cancelled();return}
 await api('/api/admin/finalize','POST',{year,revision:state.revision,confirmation});
 await refreshYears();await reload({silent:true});
 success(`Turnier ${year} offiziell abgeschlossen und archiviert. Der Stand ist jetzt schreibgeschützt.`);
});
$('audit-button').onclick=()=>attempt(async()=>{
 const x=await api('/api/admin/audit?year='+year);
 $('audit').replaceChildren(...x.events.map(e=>{const li=document.createElement('li');li.textContent=`${e.recorded_at} · ${e.action} · Revision ${e.revision}`;return li}));
 success(`Änderungsprotokoll für ${year} geladen: ${x.events.length} Einträge.`);
});
