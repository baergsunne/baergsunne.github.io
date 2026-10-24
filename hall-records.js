/* Bärgsunne Poker · nachprüfbares Rekordbuch aus historischen Originaldaten */
(function(){
'use strict';
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const round=x=>Number.isFinite(x)?Math.round(x*100)/100:0;
const sevenRoundValue=(value,roundCount)=>Number.isFinite(value)&&Number.isInteger(roundCount)&&roundCount>0?value*7/roundCount:NaN;
const seasonValue=(name,year,rawValue,rawUnit,roundCount)=>({name:`${name} (${year})`,year,value:sevenRoundValue(rawValue,roundCount),rawValue,rawUnit,roundCount});
function calculate(seed){
 const editions=seed.editions||[];
 const players=new Map();const seasons=[];const yearRows=[];const pair=new Map();
 const get=n=>{if(!players.has(n))players.set(n,{name:n,appearances:0,titles:0,podium:0,runner:0,last:0,total:0,roundWins:0,roundPodium:0,roundLast:0,rounds:0,places:[],relative:[],seasons:[],winsByYear:[],longestWin:0,longestTop3:0,winRun:0,top3Run:0,yearStreak:0,lastYear:null});return players.get(n)};
 for(const e of editions){
  const field=e.players.length;const standings=e.official_standings||[];const positions=new Map(standings.map(s=>[s.player_id,s]));
  const currentWins=new Map(e.players.map(p=>[p,0]));const currentPodium=new Map(e.players.map(p=>[p,0]));
  for(const p of e.players){const s=positions.get(p);if(!s)continue;const r=get(p);r.appearances++;r.titles+=s.place===1?1:0;r.podium+=s.place<=3?1:0;r.runner+=s.place===2?1:0;r.last+=s.place===field?1:0;r.total+=s.points;r.places.push(s.place);r.relative.push(field>1?(field-s.place)/(field-1):1);r.seasons.push({year:e.year,place:s.place,field,points:s.points});}
  for(const r of e.rounds){for(const x of r.results){const p=get(x.player_id);p.rounds++;p.roundWins+=x.place===1?1:0;p.roundPodium+=x.place<=3?1:0;p.roundLast+=x.place===field?1:0;p.winRun=x.place===1?p.winRun+1:0;p.top3Run=x.place<=3?p.top3Run+1:0;p.longestWin=Math.max(p.longestWin,p.winRun);p.longestTop3=Math.max(p.longestTop3,p.top3Run);if(x.place===1)currentWins.set(x.player_id,1+(currentWins.get(x.player_id)||0));if(x.place<=3)currentPodium.set(x.player_id,1+(currentPodium.get(x.player_id)||0));}}
  for(const p of e.players){const s=positions.get(p);if(!s)continue;seasons.push({name:p,year:e.year,place:s.place,points:s.points,field,roundCount:e.rounds.length,wins:currentWins.get(p)||0,podium:currentPodium.get(p)||0,relative:field>1?(field-s.place)/(field-1):1});}
  const lead=standings.find(x=>x.place===1),second=standings.find(x=>x.place===2);if(lead&&second)yearRows.push({year:e.year,champion:lead.player_id,gap:lead.points-second.points,points:lead.points,roundCount:e.rounds.length});
  for(let a=0;a<standings.length;a++)for(let b=a+1;b<standings.length;b++){const x=standings[a],y=standings[b],key=[x.player_id,y.player_id].sort((u,v)=>u.localeCompare(v,'de')).join('|||');let v=pair.get(key);if(!v){v={a:key.split('|||')[0],b:key.split('|||')[1],years:0,advantageA:0,advantageB:0};pair.set(key,v)}v.years++;if(x.place<y.place){if(x.player_id===v.a)v.advantageA++;else v.advantageB++;}else if(x.place>y.place){if(x.player_id===v.a)v.advantageB++;else v.advantageA++;}}
 }
 const ps=[...players.values()],pairs=[...pair.values()];const records=[];
 function originalText(x){
  if(!Number.isFinite(x.rawValue)||!Number.isInteger(x.roundCount)||x.roundCount<1)return '';
  return `Original: ${round(x.rawValue)} ${x.rawUnit} in ${x.roundCount} ${x.roundCount===1?'Runde':'Runden'}.`;
 }
 function add(category,title,values,unit,description,opt={}){
  const eligible=values.filter(x=>Number.isFinite(x.value));
  if(!eligible.length)return;
  const sorted=eligible.sort((a,b)=>(opt.low?a.value-b.value:b.value-a.value)||String(a.name).localeCompare(String(b.name),'de'));
  const peak=sorted[0].value;
  const holders=sorted.filter(x=>Math.abs(x.value-peak)<1e-9).map(x=>x.name);
  records.push({
   category,title,holder:holders.join(', '),value:round(peak),unit,description,
   original:originalText(sorted[0]),scope:opt.scope||'historisch',count:eligible.length,
   table:sorted.map((r,i)=>{
    // Competition ranks: equal values keep the same rank. Do not invent a
    // separate third place when there are two competitors in second place.
    const rank=sorted.findIndex(entry=>Math.abs(entry.value-r.value)<1e-9)+1;
    const tieCount=sorted.filter(entry=>Math.abs(entry.value-r.value)<1e-9).length;
    return {name:r.name,value:round(r.value),year:r.year||'',rank,tieCount,original:originalText(r)};
   })
  });
 }
 const pvals=(key,filter=()=>true)=>ps.filter(filter).map(p=>({name:p.name,value:p[key]}));
 add('Erfolge','Meistertitel',pvals('titles'),'Titel','Anzahl offizieller Schlussränge 1.');
 add('Erfolge','Jahrespodien',pvals('podium'),'Podien','Offizieller Schlussrang 1 bis 3.');
 add('Erfolge','Vizemeisterschaften',pvals('runner'),'zweite Plätze','Offizieller Schlussrang 2.');
 add('Erfolge','Turnierteilnahmen',pvals('appearances'),'Jahre','Teilnahme an einem dokumentierten Turnier.');
 add('Erfolge','Karrierepunkte',pvals('total'),'Punkte','Absolute historische Punkte; unterschiedliche Jahrgangsregeln sind nicht normalisiert.');
 add('Erfolge','Rundensiege',pvals('roundWins'),'Siege','Offizieller Rundenplatz 1.');
 add('Erfolge','Rundenpodien',pvals('roundPodium'),'Podien','Offizieller Rundenplatz 1 bis 3.');
 add('Erfolge','Längste Rundensieg-Serie',pvals('longestWin'),'Runden','Aufeinanderfolgende Rundensiege in chronologischer Reihenfolge.');
 add('Erfolge','Längste Top-3-Rundenserie',pvals('longestTop3'),'Runden','Aufeinanderfolgende Rundenplatzierungen 1 bis 3.');
 add('Erfolge','Rundensiegquote (mindestens 20 Runden)',ps.filter(p=>p.rounds>=20).map(p=>({name:p.name,value:round(100*p.roundWins/p.rounds)})),'%','Rundensiege dividiert durch gespielte Runden; mindestens 20 Runden.');
 add('Erfolge','Jahrespodiumsquote (mindestens 5 Turniere)',ps.filter(p=>p.appearances>=5).map(p=>({name:p.name,value:round(100*p.podium/p.appearances)})),'%','Podiumsplatzierungen pro Turnierteilnahme; mindestens 5 Turniere.');
 add('Erfolge','Beste relative Schlussplatzierung (mindestens 5 Turniere)',ps.filter(p=>p.appearances>=5).map(p=>({name:p.name,value:round(100*p.relative.reduce((a,b)=>a+b,0)/p.relative.length)})),'%','100 % steht für Rang 1; 0 % für den letzten Rang. Mindestens 5 Turniere.');
 add('Saisonrekorde','Höchste Saisonpunkte',seasons.map(s=>seasonValue(s.name,s.year,s.points,'Punkte',s.roundCount)),'Punkte','Saisonpunkte auf 7 Runden umgerechnet; historische Punktesysteme bleiben unverändert.');
 add('Saisonrekorde','Meiste Rundensiege in einem Jahr',seasons.map(s=>seasonValue(s.name,s.year,s.wins,'Rundensiege',s.roundCount)),'Siege','Rundensiege einer Saison auf 7 Runden umgerechnet.');
 add('Saisonrekorde','Meiste Rundenpodien in einem Jahr',seasons.map(s=>seasonValue(s.name,s.year,s.podium,'Rundenpodien',s.roundCount)),'Podien','Rundenpodien einer Saison auf 7 Runden umgerechnet.');
 add('Saisonrekorde','Grösster Meistervorsprung',yearRows.map(s=>seasonValue(s.champion,s.year,s.gap,'Punkte Vorsprung',s.roundCount)),'Punkte','Grösster Punkteabstand zwischen Meister und Vizemeister, auf 7 Runden umgerechnet.');
 add('Saisonrekorde','Knappster Meistertitel',yearRows.map(s=>seasonValue(s.champion,s.year,s.gap,'Punkte Vorsprung',s.roundCount)),'Punkte','Kleinster Punkteabstand zwischen Meister und Vizemeister, auf 7 Runden umgerechnet.',{low:true});
 add('Saisonrekorde','Beste relative Einzelsaison',seasons.map(s=>({name:`${s.name} (${s.year})`,value:round(s.relative*100),year:s.year})),'%','Relative Schlussposition bei unterschiedlicher Feldgrösse.');
 add('Hall of Shame','Letzte Schlussplätze',pvals('last'),'letzte Plätze','Letzter offizieller Rang des jeweiligen Jahrgangs.');
 add('Hall of Shame','Letzte Rundenplätze',pvals('roundLast'),'letzte Rundenplätze','Letzter offizieller Platz einer Einzelrunde.');
 add('Hall of Shame','Teilnahmen ohne Meistertitel',ps.filter(p=>!p.titles).map(p=>({name:p.name,value:p.appearances})),'Turniere','Nur Spieler ohne Meistertitel; Teilnahmen, nicht Anzahl Jahre seit Debüt.');
 add('Hall of Shame','Teilnahmen ohne Jahrespodium',ps.filter(p=>!p.podium).map(p=>({name:p.name,value:p.appearances})),'Turniere','Nur Spieler ohne offizielles Jahrespodium.');
 add('Hall of Shame','Vizemeisterschaften ohne Titel',ps.filter(p=>!p.titles).map(p=>({name:p.name,value:p.runner})),'zweite Plätze','Nur Spieler ohne Meistertitel.');
 add('Hall of Shame','Schlechteste relative Saison',seasons.map(s=>({name:`${s.name} (${s.year})`,value:round(s.relative*100),year:s.year})),'%','Niedrigster relativer offizieller Schlussrang.',{low:true});
 add('Rivalitäten','Meiste gemeinsame Turniere',pairs.map(p=>({name:`${p.a} / ${p.b}`,value:p.years})),'Turniere','Beide Spieler nahmen am selben Jahrgang teil.');
 add('Rivalitäten','Grösster direkter Bilanzvorsprung',pairs.filter(p=>p.years>=3).map(p=>({name:`${p.advantageA>=p.advantageB?p.a:p.b} vor ${p.advantageA>=p.advantageB?p.b:p.a}`,value:Math.abs(p.advantageA-p.advantageB)})),'Jahre','Differenz der Jahre mit besserem offiziellen Schlussrang; mindestens 3 gemeinsame Teilnahmen.');
 return {records,years:editions.length,players:ps.length,seasonCount:seasons.length};
}
function render(){
 if(!window.POKER_SEED)return '<p class="hint">Historische Daten nicht geladen.</p>';
 const data=calculate(window.POKER_SEED);
 const groups=['Erfolge','Saisonrekorde','Hall of Shame','Rivalitäten'];
 // Three individual leaders are visible, while ties keep their actual rank.
 // A missing podium slot stays empty rather than inventing a player or rank.
 const step=(x,slot)=>{
  if(!x)return `<div class="hof-mini-step hof-mini-step--${slot} hof-mini-step--empty" aria-label="Podiumplatz nicht besetzt"><span class="hof-mini-medal" aria-hidden="true">–</span><span class="hof-mini-label">Nicht besetzt</span></div>`;
  const medal=x.rank===1?'🥇':x.rank===2?'🥈':x.rank===3?'🥉':'🏅';
  const parts=/^(.*?)\s*\((\d{4})\)$/.exec(x.name);
  const displayName=parts?parts[1]:x.name;
  const year=parts?parts[2]:'';
  return `<div class="hof-mini-step hof-mini-step--${slot}" aria-label="Rang ${x.rank}: ${escape(x.name)}, ${escape(x.value)}">
    <span class="hof-mini-medal" aria-hidden="true">${medal}</span>
    <span class="hof-mini-label">Rang ${x.rank}</span>
    <strong class="hof-mini-name">${escape(displayName)}</strong>
    ${year?`<span class="hof-mini-year">${escape(year)}</span>`:''}
    <b class="hof-mini-value">${escape(x.value)}</b>
    ${x.tieCount>1?'<span class="hof-mini-tie">Gleichstand</span>':''}
   </div>`;
 };
 const card=r=>{
  const podium=`<div class="hof-mini-podium" aria-label="Podium: ${escape(r.title)}">
   ${step(r.table[1],2)}
   ${step(r.table[0],1)}
   ${step(r.table[2],3)}
  </div>`;
  const hiddenTies=r.table.slice(3).filter(x=>x.rank<=3);
  return `<article class="hof-record">
   <div class="hof-record-top"><span>${escape(r.title)}</span><b>${escape(r.value)} ${escape(r.unit)}</b></div>
   <p>${escape(r.description)}</p>
   ${podium}
   ${hiddenTies.length?`<p class="hof-mini-more">${hiddenTies.length} weitere gleichplatzierte ${hiddenTies.length===1?'Person':'Personen'} in der Rangliste</p>`:''}
   <details><summary>Vollständige Rangliste ansehen</summary><div class="hof-scroll">
    <table><thead><tr><th>Rang</th><th>Spieler / Saison</th><th>${escape(r.unit)}</th></tr></thead>
    <tbody>${r.table.map(x=>`<tr><td>${x.rank}</td><td>${escape(x.name)}${x.original?`<small class="hof-original-note">${escape(x.original)}</small>`:''}</td><td>${escape(x.value)}</td></tr>`).join('')}</tbody></table>
   </div></details>
  </article>`;
 };
 return `<section class="hof-extended" aria-label="Historisches Rekordbuch">
  <div class="eyebrow">DAS REKORDBUCH</div>
  <h2>Legenden, Dramen und Negativrekorde</h2>
  <p>${data.records.length} automatisch berechnete Rekordlisten aus ${data.years} historischen Turnieren. Wähle eine Kategorie und entdecke zu jedem Rekord das Podium mit den drei Bestplatzierten. Die vollständige Rangliste lässt sich darunter aufklappen. Gleichstände teilen sich denselben Rang. Saisonrekorde werden auf 7 Runden umgerechnet.</p>
  <nav class="hof-tabs" aria-label="Rekordkategorien">${groups.map((g,i)=>`<button type="button" class="hof-tab ${i===0?'selected':''}" data-hof-tab="${escape(g)}">${escape(g)}</button>`).join('')}</nav>
  ${groups.map((g,i)=>`<div class="hof-category" data-hof-category="${escape(g)}" ${i?'hidden':''}>${data.records.filter(r=>r.category===g).map(card).join('')}</div>`).join('')}
  <p class="hof-source">Quelle: originale Schlussranglisten und chronologische Rundenresultate. Die Saisonwerte werden auf 7 Runden umgerechnet; Originalergebnisse, historische Punktesysteme und Feldgrössen bleiben unverändert. Relative Platzierungen werden nicht erneut umgerechnet.</p>
 </section>`;
}
window.BaergsunneHallRecords={calculate,render};
document.addEventListener('click',e=>{const b=e.target.closest('[data-hof-tab]');if(!b)return;const root=b.closest('.hof-extended');if(!root)return;root.querySelectorAll('[data-hof-tab]').forEach(x=>x.classList.toggle('selected',x===b));root.querySelectorAll('[data-hof-category]').forEach(x=>x.hidden=x.dataset.hofCategory!==b.dataset.hofTab);});
})();
