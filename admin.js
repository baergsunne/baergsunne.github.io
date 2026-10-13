'use strict';
// Token deliberately kept in memory; not in localStorage, URL or cookies.
const api=(window.BAERGSUNNE_API_URL||'').replace(/\/$/,'');
let token='',admin='',rounds=Array(8).fill(null),historyArchive=null;
const pts=[10,8,6,5,4,3,2,1,0,0];
const players=['Mike','Keel','Tobi','Echse','Chopfi','Schnarre','Mänu','Bröne','Fösu','Reti'];
const $=id=>document.getElementById(id);
function tell(message,error=false){$('admin-msg').textContent=message;$('admin-msg').className=error?'notice':''}
function hide(id,isHidden){$(id).hidden=isHidden}
async function request(path,method='GET',body){const headers={'Content-Type':'application/json'};if(token)headers.Authorization='Bearer '+token;const r=await fetch(api+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});const data=await r.json().catch(()=>({error:'Keine gültige Serverantwort'}));if(!r.ok)throw Error(data.error||'HTTP '+r.status);return data}
function showLogin(){hide('login',false);hide('dashboard',true)}
function showDashboard(){hide('login',true);hide('dashboard',false);$('welcome').textContent='Angemeldet als '+admin;renderRounds()}
function renderRounds(){const row=+$('round').value||1,results=rounds[row-1];$('round-inputs').innerHTML=pts.map((p,i)=>`<label class="adm-row"><span>${i+1}. · ${p} Pkt.</span><select data-position="${i}" aria-label="Platz ${i+1}"><option value="">Spieler wählen</option>${players.map(name=>`<option value="${name}" ${results?.[i]?.player===name?'selected':''}>${name}</option>`).join('')}</select></label>`).join('')}
async function reload(){let x=await request('/api/admin/live');rounds=x.rounds;renderRounds();tell('Runden geladen.')}
async function guarded(fn){try{await fn()}catch(e){tell(e.message,true);if(/Anmeldung erforderlich/.test(e.message)){token='';showLogin()}}}
if(!api||!api.startsWith('https://')){hide('offline',false)}else{showLogin()}
for(let i=1;i<=8;i++)$('round').append(new Option('Runde '+i,i));
$('round').addEventListener('change',renderRounds);
$('login-form').addEventListener('submit',e=>{e.preventDefault();guarded(async()=>{const d=await request('/api/login','POST',{username:$('username').value.trim(),password:$('password').value});token=d.token;admin=d.username;$('password').value='';showDashboard();await reload()})});
$('refresh').onclick=()=>guarded(reload);
$('logout').onclick=()=>guarded(async()=>{await request('/api/admin/logout','POST');token='';admin='';showLogin();tell('Abgemeldet.')});
$('save-round').onclick=()=>guarded(async()=>{const chosen=[...document.querySelectorAll('[data-position]')].map(e=>e.value);if(chosen.some(x=>!x)||new Set(chosen).size!==10){tell('Bitte jeden Spieler genau einmal auswählen.',true);return}await request('/api/admin/rounds','PUT',{round:+$('round').value,players:chosen});await reload();tell('Runde gespeichert und protokolliert.')});
$('delete-round').onclick=()=>guarded(async()=>{if(!confirm(`Runde ${$('round').value} wirklich löschen?`))return;await request('/api/admin/rounds','DELETE',{round:+$('round').value});await reload();tell('Runde gelöscht und protokolliert.')});
$('load-archive').onclick=()=>guarded(async()=>{const x=await request('/api/admin/archive');$('archive-json').value=x?JSON.stringify(x,null,2):'';tell(x?'Archiv geladen.':'Noch kein Serverarchiv vorhanden.')});
$('archive-file').onchange=async e=>{const f=e.target.files?.[0];if(f){$('archive-json').value=await f.text();tell('Archivdatei lokal eingelesen, noch nicht gespeichert.')}};
$('save-archive').onclick=()=>guarded(async()=>{let x=JSON.parse($('archive-json').value);if(!confirm('Das gesamte Serverarchiv ersetzen? Diese Änderung wird protokolliert.'))return;await request('/api/admin/archive','PUT',x);tell('Archiv ersetzt. Eine Sicherung der bisherigen Version wird derzeit nicht automatisch gespeichert.')});
$('new-admin').onsubmit=e=>{e.preventDefault();guarded(async()=>{const d=new FormData(e.target);await request('/api/admin/users','POST',{username:d.get('username'),password:d.get('password')});e.target.reset();tell('Neuer Administrator angelegt.')})};
$('audit').onclick=()=>guarded(async()=>{const d=await request('/api/admin/audit');$('audit-events').replaceChildren(...d.events.map(e=>{const p=document.createElement('p');p.className='muted';p.textContent=`${e.recorded_at} · ${e.username} · ${e.action}`;return p}));tell('Änderungsprotokoll geladen.')});

// History editor runs entirely inside the authenticated admin session.
function histEdition(){return historyArchive?.editions.find(e=>e.year===Number($('hist-year').value))}
function renderHistoryYears(){if(!historyArchive)return;$('hist-year').replaceChildren(...historyArchive.editions.map(e=>new Option(String(e.year),String(e.year))));renderHistoryRounds()}
function renderHistoryRounds(){const ed=histEdition();$('hist-round').replaceChildren(...(ed?.rounds||[]).map(r=>new Option('Runde '+r.number,r.number)));renderHistoryPositions()}
function renderHistoryPositions(){const ed=histEdition(),round=ed?.rounds.find(r=>r.number===Number($('hist-round').value));if(!round){$('hist-positions').replaceChildren();return}
 const byPlace=[...round.results].sort((a,b)=>a.place-b.place);
 $('hist-positions').innerHTML=byPlace.map((r,i)=>`<label class="adm-row"><span>${i+1}. · ${ed.scoring.points_by_place[i]} Pkt.</span><select data-history-place="${i}">${ed.players.map(name=>`<option value="${name}" ${r.player_id===name?'selected':''}>${name}</option>`).join('')}</select></label>`).join('')}
$('hist-year').onchange=renderHistoryRounds;
$('hist-round').onchange=renderHistoryPositions;
$('get-history').onclick=()=>guarded(async()=>{historyArchive=await request('/api/admin/archive');if(!historyArchive){tell('Noch kein Archiv auf dem Server. Zuerst unter Archivverwaltung importieren.',true);return}renderHistoryYears();tell('Historisches Archiv geladen.')});
$('save-history').onclick=()=>guarded(async()=>{const ed=histEdition(),round=ed?.rounds.find(r=>r.number===Number($('hist-round').value));if(!round)throw Error('Archiv und Runde auswählen');const selected=[...document.querySelectorAll('[data-history-place]')].map(x=>x.value);if(selected.length!==ed.players.length||new Set(selected).size!==selected.length)throw Error('Jeden Spieler genau einmal auswählen');
 if(!confirm(`Runde ${round.number} von ${ed.year} korrigieren und Saisonwertung neu berechnen?`))return;
 round.results=selected.map((player_id,i)=>({player_id,place:i+1,points:ed.scoring.points_by_place[i]}));
 const totals=ed.players.map(player_id=>({player_id,points:ed.rounds.reduce((acc,r)=>acc+r.results.find(x=>x.player_id===player_id)?.points,0)}));
 totals.sort((a,b)=>b.points-a.points||a.player_id.localeCompare(b.player_id,'de-CH'));
 ed.official_standings=totals.map((x,i)=>({...x,place:i+1}));
 await request('/api/admin/archive','PUT',historyArchive);tell(`Runde ${round.number} von ${ed.year} aktualisiert und protokolliert.`)});
