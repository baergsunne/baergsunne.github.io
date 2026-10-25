/* Bärgsunne Poker · nachprüfbares Rekordbuch aus historischen Originaldaten */
(function(){
'use strict';
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const round=x=>Number.isFinite(x)?Math.round(x*100)/100:0;
const sevenRoundValue=(value,roundCount)=>Number.isFinite(value)&&Number.isInteger(roundCount)&&roundCount>0?value*7/roundCount:NaN;
const seasonValue=(name,year,rawValue,rawUnit,roundCount)=>({name:`${name} (${year})`,year,value:sevenRoundValue(rawValue,roundCount),rawValue,rawUnit,roundCount});

/* Historical round-by-round records; source chronology remains immutable. */
function annualMetrics(e){
 const rs=[...e.rounds].sort((a,b)=>a.number-b.number);
 const points=new Map(e.players.map(p=>[p,0])),wins=new Map(e.players.map(p=>[p,0]));
 const snapshots=[];
 for(const r of rs){
  for(const x of r.results){
   points.set(x.player_id,(points.get(x.player_id)||0)+x.points);
   if(x.place===1)wins.set(x.player_id,(wins.get(x.player_id)||0)+1);
  }
  const order=[...e.players].sort((a,b)=>points.get(b)-points.get(a)||wins.get(b)-wins.get(a)||a.localeCompare(b,'de'));
  const maximum=points.get(order[0]),minimum=points.get(order.at(-1));
  snapshots.push({
   ranks:new Map(order.map((p,i)=>[p,i+1])),
   leaders:order.filter(p=>points.get(p)===maximum),
   lantern:order.filter(p=>points.get(p)===minimum),
   points:new Map(points)
  });
 }
 const changes=snapshots.slice(1).filter((x,i)=>x.leaders.length===1&&snapshots[i].leaders.length===1&&x.leaders[0]!==snapshots[i].leaders[0]).length;
 const champion=e.official_standings.find(x=>x.place===1)?.player_id;
 let comeback=0;
 if(champion)for(const snap of snapshots){
  const own=snap.points.get(champion)||0;
  const biggestRival=Math.max(0,...e.players.filter(p=>p!==champion).map(p=>snap.points.get(p)||0));
  comeback=Math.max(comeback,biggestRival-own);
 }
 const people=e.players.map(name=>{
  const rank=snapshots.map(s=>s.ranks.get(name));
  let good=rank[0],bad=rank[0],climb=0,fall=0,singleRise=0,singleFall=0;
  for(let i=1;i<rank.length;i++){
   const now=rank[i],before=rank[i-1];
   climb=Math.max(climb,bad-now);
   fall=Math.max(fall,now-good);
   singleRise=Math.max(singleRise,before-now);
   singleFall=Math.max(singleFall,now-before);
   good=Math.min(good,now);bad=Math.max(bad,now);
  }
  return {name,year:e.year,roundCount:rs.length,
    top5:rs.filter(r=>r.results.some(x=>x.player_id===name&&x.place<=5)).length,
    leads:snapshots.filter(x=>x.leaders.includes(name)).length,
    lantern:snapshots.filter(x=>x.lantern.includes(name)).length,
    climb,fall,singleRise,singleFall};
 });
 return {year:e.year,roundCount:rs.length,champion,changes,comeback,people};
}

/* Story records: every value comes from documented round results and official
   final standings. A shared points minimum is a shared red lantern; an
   alphabetically ordered tiebreak never pretends to be an elimination order. */
function storyMetrics(editions,isChosen=()=>true){
 const years=[...editions].sort((a,b)=>a.year-b.year);
 const people=[...new Set(years.flatMap(e=>e.players))];
 const all=new Map(people.map(p=>[p,[]]));
 const seasons=new Map(people.map(p=>[p,[]]));
 const yearly=new Map();
 const data={};
 const maxLantern=new Map(people.map(p=>[p,0]));
 const startFinish=new Map(people.map(p=>[p,0]));
 const lastChampion=new Map(people.map(p=>[p,0]));
 const put=(key,name,value,extra={})=>{
  if(!Number.isFinite(value))return;
  (data[key]||(data[key]=[])).push({name,value,...extra});
 };
 const streak=(items,qualifies)=>{
  let best=0,run=0;
  for(const x of items){run=qualifies(x)?run+1:0;best=Math.max(best,run);}
  return best;
 };
 for(const e of years){
  const rounds=[...e.rounds].sort((a,b)=>a.number-b.number);
  const standing=new Map(e.official_standings.map(x=>[x.player_id,x]));
  const points=new Map(e.players.map(p=>[p,0]));
  const wins=new Map(e.players.map(p=>[p,0]));
  const snapshots=[];
  for(const r of rounds){
   const minPoints=Math.min(...r.results.map(x=>x.points));
   for(const x of r.results){
    points.set(x.player_id,(points.get(x.player_id)||0)+x.points);
    if(x.place===1)wins.set(x.player_id,(wins.get(x.player_id)||0)+1);
    all.get(x.player_id).push({year:e.year,round:r.number,place:x.place,points:x.points,
      last:x.points===minPoints,final:r===rounds.at(-1)});
   }
   const order=[...e.players].sort((a,b)=>points.get(b)-points.get(a)||wins.get(b)-wins.get(a)||a.localeCompare(b,'de'));
   const high=points.get(order[0]),low=points.get(order.at(-1));
   const leaders=order.filter(p=>points.get(p)===high);
   snapshots.push({
    ranks:new Map(order.map((p,i)=>[p,i+1])),points:new Map(points),
    sole:leaders.length===1?leaders[0]:null,
    lantern:new Set(order.filter(p=>points.get(p)===low))
   });
  }
  yearly.set(e.year,{e,rounds,standing,snapshots});
  const champion=e.official_standings.find(x=>x.place===1)?.player_id;
  for(const p of e.players){
   if(!isChosen(p))continue;
   const finish=standing.get(p);
   seasons.get(p).push({year:e.year,place:finish.place,podium:finish.place<=3,champion:finish.place===1});
   if(rounds.length>=3){
    const before=snapshots.at(-3).ranks.get(p);
    put('finalSprint',p+' ('+e.year+')',before-finish.place,{year:e.year});
   }
   const redLantern=streak(snapshots,s=>s.lantern.has(p));
   maxLantern.set(p,Math.max(maxLantern.get(p),redLantern));
   if(finish.place!==1){
    let lostLead=0;
    for(const snap of snapshots.slice(0,-1)){
     if(snap.sole!==p)continue;
     const rival=Math.max(...e.players.filter(x=>x!==p).map(x=>snap.points.get(x)));
     lostLead=Math.max(lostLead,snap.points.get(p)-rival);
    }
    if(lostLead>0)put('lostLead',p+' ('+e.year+')',sevenRoundValue(lostLead,rounds.length),
      {year:e.year,rawValue:lostLead,rawUnit:'Punkte Vorsprung',roundCount:rounds.length});
   }
   if(champion===p&&snapshots[0]?.sole===p)startFinish.set(p,startFinish.get(p)+1);
   if(champion===p&&snapshots.slice(0,-1).some(s=>s.lantern.has(p)))lastChampion.set(p,lastChampion.get(p)+1);
  }
 }
 const winnerYears=years.map(e=>e.official_standings.find(x=>x.place===1)?.player_id);
 for(const p of people){
  if(!isChosen(p))continue;
  const rs=all.get(p),ss=seasons.get(p);
  put('titleRun',p,streak(winnerYears,x=>x===p));
  put('lanternRun',p,maxLantern.get(p));
  if(startFinish.get(p)>0)put('startFinish',p,startFinish.get(p));
  if(lastChampion.get(p)>0)put('lastChampion',p,lastChampion.get(p));
  put('finalRoundWins',p,rs.filter(x=>x.final&&x.place===1).length);
  const firstTitle=ss.findIndex(x=>x.champion);
  if(firstTitle>=0)put('fastestChampion',p,firstTitle+1,{year:ss[firstTitle].year});
  put('podiumYearRun',p,streak(years,e=>e.official_standings.some(x=>x.player_id===p&&x.place<=3)));
  const titleYears=ss.filter(x=>x.champion).map(x=>x.year);
  if(titleYears.length>1)put('titleGap',p,Math.max(...titleYears.slice(1).map((year,i)=>year-titleYears[i])));
  put('winlessRun',p,streak(rs,x=>x.place!==1));
  put('zeroRun',p,streak(rs,x=>x.points===0));
  put('podiumYearDrought',p,streak(ss,x=>!x.podium));
  put('roundPodiumDrought',p,streak(rs,x=>x.place>3));
  put('lastFinal',p,rs.filter(x=>x.final&&x.last).length);
  const missed=ss.filter(x=>{
   if(x.champion)return false;
   return yearly.get(x.year).snapshots.slice(0,-1).some(s=>s.sole===p);
  }).length;
  put('missedTitles',p,missed);
  for(let i=1;i<ss.length;i++)put('seasonCrash',p+' ('+ss[i].year+')',ss[i].place-ss[i-1].place,
    {year:ss[i].year,sourceNote:'Vorherige Teilnahme: '+ss[i-1].year+', Rang '+ss[i-1].place+'; danach Rang '+ss[i].place+'.'});
 }
 for(let i=1;i<years.length;i++){
  const prior=winnerYears[i-1],now=yearly.get(years[i].year);
  const position=now.standing.get(prior);
  if(position&&isChosen(prior))put('defenderCrash',prior+' ('+years[i].year+')',position.place,{year:years[i].year,
    sourceNote:'Titel im vorherigen ausgetragenen Turnier '+years[i-1].year+'; Schlussrang '+position.place+' in '+years[i].year+'.'});
 }
 return data;
}

function calculate(seed,filters={}){
 const yearSet=Array.isArray(filters.years)&&filters.years.length?new Set(filters.years.map(Number)):null;
 const playerSet=Array.isArray(filters.players)&&filters.players.length?new Set(filters.players):null;
 const isChosen=name=>!playerSet||playerSet.has(name);
 // Keep each original tournament intact: the selection limits candidates,
 // never rewrites official places, championship leaders or point margins.
 const editions=(seed.editions||[]).filter(e=>(!yearSet||yearSet.has(e.year))&&(!playerSet||e.players.some(isChosen)));
 const players=new Map();const seasons=[];const yearRows=[];const pair=new Map();const annual=[];
 const get=n=>{if(!players.has(n))players.set(n,{name:n,appearances:0,titles:0,podium:0,runner:0,last:0,total:0,roundWins:0,roundPodium:0,roundLast:0,zeroRounds:0,rounds:0,rankSum:0,places:[],relative:[],seasons:[],winsByYear:[],longestWin:0,longestTop3:0,winRun:0,top3Run:0,yearStreak:0,lastYear:null});return players.get(n)};
 for(const e of editions){
  const field=e.players.length;const standings=e.official_standings||[];const positions=new Map(standings.map(s=>[s.player_id,s]));
  const currentWins=new Map(e.players.map(p=>[p,0]));const currentPodium=new Map(e.players.map(p=>[p,0]));const currentRelative=new Map(e.players.map(p=>[p,0]));
  for(const p of e.players){if(!isChosen(p))continue;const s=positions.get(p);if(!s)continue;const r=get(p);r.appearances++;r.titles+=s.place===1?1:0;r.podium+=s.place<=3?1:0;r.runner+=s.place===2?1:0;r.last+=s.place===field?1:0;r.total+=s.points;r.places.push(s.place);r.relative.push(field>1?(field-s.place)/(field-1):1);r.seasons.push({year:e.year,place:s.place,field,points:s.points});}
  for(const r of e.rounds){for(const x of r.results){if(!isChosen(x.player_id))continue;const p=get(x.player_id);p.rounds++;p.rankSum+=window.BaergsunneRoundPlacement.effectivePlace(x,r);currentRelative.set(x.player_id,(currentRelative.get(x.player_id)||0)+(field>1?(field-window.BaergsunneRoundPlacement.effectivePlace(x,r))/(field-1):1));p.roundWins+=x.place===1?1:0;p.roundPodium+=x.place<=3?1:0;p.roundLast+=window.BaergsunneRoundPlacement.isLast(x,r)?1:0;p.zeroRounds+=window.BaergsunneRoundPlacement.isZero(x)?1:0;p.winRun=x.place===1?p.winRun+1:0;p.top3Run=x.place<=3?p.top3Run+1:0;p.longestWin=Math.max(p.longestWin,p.winRun);p.longestTop3=Math.max(p.longestTop3,p.top3Run);if(x.place===1)currentWins.set(x.player_id,1+(currentWins.get(x.player_id)||0));if(x.place<=3)currentPodium.set(x.player_id,1+(currentPodium.get(x.player_id)||0));}}
  for(const p of e.players){if(!isChosen(p))continue;const s=positions.get(p);if(!s)continue;seasons.push({name:p,year:e.year,place:s.place,points:s.points,field,roundCount:e.rounds.length,wins:currentWins.get(p)||0,podium:currentPodium.get(p)||0,roundRelative:e.rounds.length?100*(currentRelative.get(p)||0)/e.rounds.length:NaN,relative:field>1?(field-s.place)/(field-1):1});}
  const lead=standings.find(x=>x.place===1),second=standings.find(x=>x.place===2);if(lead&&second&&isChosen(lead.player_id))yearRows.push({year:e.year,champion:lead.player_id,gap:lead.points-second.points,points:lead.points,roundCount:e.rounds.length});
  const metrics=annualMetrics(e);
  metrics.people=metrics.people.filter(p=>isChosen(p.name));
  annual.push(metrics);
  for(let a=0;a<standings.length;a++)for(let b=a+1;b<standings.length;b++){const x=standings[a],y=standings[b];if(!isChosen(x.player_id)||!isChosen(y.player_id))continue;const key=[x.player_id,y.player_id].sort((u,v)=>u.localeCompare(v,'de')).join('|||');let v=pair.get(key);if(!v){v={a:key.split('|||')[0],b:key.split('|||')[1],years:0,advantageA:0,advantageB:0};pair.set(key,v)}v.years++;if(x.place<y.place){if(x.player_id===v.a)v.advantageA++;else v.advantageB++;}else if(x.place>y.place){if(x.player_id===v.a)v.advantageB++;else v.advantageA++;}}
 }
 const ps=[...players.values()],pairs=[...pair.values()];const records=[];
 function originalText(x){
  if(x.sourceNote)return x.sourceNote;
  if(!Number.isFinite(x.rawValue)||!Number.isInteger(x.roundCount)||x.roundCount<1)return '';
  return `Original: ${round(x.rawValue)} ${x.rawUnit} in ${x.roundCount} ${x.roundCount===1?'Runde':'Runden'}.`;
 }
 function add(category,title,values,unit,description,opt={}){
  // An isolated year/player selection may have no candidates for a record.
  const eligible=(values||[]).filter(x=>Number.isFinite(x.value));
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
 const stories=storyMetrics(editions,isChosen);
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

 add('Erfolge','Bester Ø Rundenrang (mindestens 10 Runden)',ps.filter(p=>p.rounds>=10).map(p=>({name:p.name,value:p.rankSum/p.rounds})),'Ø Rang','Durchschnitt der gewerteten Rundenplätze bei mindestens 10 gespielten Runden. Kleinere Werte sind besser; die unterschiedliche Teilnehmerzahl wirkt auf den Durchschnitt.',{low:true});
 add('Saisonrekorde','Beste durchschnittliche relative Rundenplatzierung',seasons.filter(s=>s.roundCount>0).map(s=>({name:s.name+' ('+s.year+')',year:s.year,value:s.roundRelative,sourceNote:'Grundlage: '+s.roundCount+' Runden · offizieller Jahresrang '+s.place+'.'})),'%','Durchschnitt der relativen Rundenplatzierungen einer Saison. 100 % steht für Rang 1, 0 % für einen letzten Platz; unterschiedliche Teilnehmerzahlen sind berücksichtigt.');
 add('Saisonrekorde','Meiste Führungswechsel',annual.map(a=>seasonValue('Meisterschaft',a.year,a.changes,'Führungswechsel',a.roundCount)),'Wechsel','Wechsel zwischen zwei eindeutig allein Führenden nach einer Runde, auf 7 Runden umgerechnet.');
 add('Saisonrekorde','Grösster zwischenzeitlicher Rückstand des Champions',annual.filter(a=>a.champion).map(a=>seasonValue(a.champion,a.year,a.comeback,'Punkte Rückstand',a.roundCount)),'Punkte','Maximaler Punkterückstand des späteren Champions nach einer gespielten Runde, auf 7 Runden umgerechnet.');
 add('Saisonrekorde','Meiste Top-5-Runden in einem Jahr',annual.flatMap(a=>a.people.map(p=>seasonValue(p.name,a.year,p.top5,'Top-5-Runden',a.roundCount))),'Runden','Rundenplatzierungen unter den ersten fünf innerhalb eines Turniers, auf 7 Runden umgerechnet.');
 add('Saisonrekorde','Grösste Aufholjagd innerhalb einer Saison',annual.flatMap(a=>a.people.map(p=>({name:p.name+' ('+a.year+')',year:a.year,value:p.climb}))),'Plätze','Grösste Verbesserung vom vorherigen schlechtesten kumulativen Zwischenrang zu einem späteren besten Zwischenrang im gleichen Jahr.');
 add('Saisonrekorde','Meiste Runden an der Spitze in einem Jahr',annual.flatMap(a=>a.people.map(p=>seasonValue(p.name,a.year,p.leads,'Führungsrunden',a.roundCount))),'Runden','Runden mit den meisten kumulierten Punkten; auch geteilte Führungen zählen, auf 7 Runden umgerechnet.');
 add('Saisonrekorde','Grösster Sprung nach oben in einer Runde',annual.flatMap(a=>a.people.map(p=>({name:p.name+' ('+a.year+')',year:a.year,value:p.singleRise}))),'Plätze','Grösste Verbesserung in der kumulierten Rangliste zwischen zwei unmittelbar aufeinanderfolgenden Runden.');
 add('Hall of Shame','Grösster Absturz innerhalb einer Saison',annual.flatMap(a=>a.people.map(p=>({name:p.name+' ('+a.year+')',year:a.year,value:p.fall}))),'Plätze','Grösster Rückfall von einem vorherigen besten zu einem späteren schlechteren kumulierten Zwischenrang im gleichen Turnier.');
 add('Hall of Shame','Meiste Runden mit roter Laterne in einem Jahr',annual.flatMap(a=>a.people.map(p=>seasonValue(p.name,a.year,p.lantern,'Runden mit roter Laterne',a.roundCount))),'Runden','Runden mit den niedrigsten kumulierten Gesamtpunkten; auch Gleichstände zählen, auf 7 Runden umgerechnet.');
 add('Hall of Shame','Grösster Fall nach einer Runde',annual.flatMap(a=>a.people.map(p=>({name:p.name+' ('+a.year+')',year:a.year,value:p.singleFall}))),'Plätze','Grösster Rangverlust in der kumulierten Rangliste zwischen zwei unmittelbar aufeinanderfolgenden Runden.');

 add('Erfolge','Längste Meistertitel-Serie',stories.titleRun,'Titel','Meiste Meistertitel in unmittelbar aufeinanderfolgenden ausgetragenen Turnieren. Turnierfreie Jahre unterbrechen die Serie nicht.');
 add('Erfolge','Meiste Siege in der letzten Turnierrunde',stories.finalRoundWins,'Siege','Rundensiege in der jeweils letzten Runde einer ausgetragenen Meisterschaft.');
 add('Erfolge','Längste Jahrespodiums-Serie',stories.podiumYearRun,'Turniere','Aufeinanderfolgende ausgetragene Meisterschaften mit offiziellem Schlussrang 1 bis 3. Nichtteilnahmen unterbrechen die Serie.');
 add('Erfolge','Längste Pause zwischen Meistertiteln',stories.titleGap,'Jahre','Grösster Abstand in Kalenderjahren zwischen zwei eigenen Meistertiteln; nur Spieler mit mindestens zwei Titeln.');

 add('Saisonrekorde','Höchste Saisonpunkte',seasons.map(s=>seasonValue(s.name,s.year,s.points,'Punkte',s.roundCount)),'Punkte','Saisonpunkte auf 7 Runden umgerechnet; historische Punktesysteme bleiben unverändert.');
 add('Saisonrekorde','Meiste Rundensiege in einem Jahr',seasons.map(s=>seasonValue(s.name,s.year,s.wins,'Rundensiege',s.roundCount)),'Siege','Rundensiege einer Saison auf 7 Runden umgerechnet.');
 add('Saisonrekorde','Meiste Rundenpodien in einem Jahr',seasons.map(s=>seasonValue(s.name,s.year,s.podium,'Rundenpodien',s.roundCount)),'Podien','Rundenpodien einer Saison auf 7 Runden umgerechnet.');
 add('Saisonrekorde','Grösster Meistervorsprung',yearRows.map(s=>seasonValue(s.champion,s.year,s.gap,'Punkte Vorsprung',s.roundCount)),'Punkte','Grösster Punkteabstand zwischen Meister und Vizemeister, auf 7 Runden umgerechnet.');
 add('Saisonrekorde','Knappster Meistertitel',yearRows.map(s=>seasonValue(s.champion,s.year,s.gap,'Punkte Vorsprung',s.roundCount)),'Punkte','Kleinster Punkteabstand zwischen Meister und Vizemeister, auf 7 Runden umgerechnet.',{low:true});
 add('Hall of Shame','Letzte Schlussplätze',pvals('last'),'letzte Plätze','Letzter offizieller Rang des jeweiligen Jahrgangs.');
 add('Hall of Shame','Letzte Rundenplätze',pvals('roundLast'),'letzte Rundenplätze','Alle Spieler mit den niedrigsten Punkten ihrer Runde zählen gemeinsam als Letztplatzierte – auch wenn der letzte Platz damals 1 oder 2 Punkte erhielt.');
 add('Hall of Shame','Nullrunden',pvals('zeroRounds'),'Nullrunden','Nur Runden mit genau 0 Punkten. Das ist eine andere Kennzahl als letzte Plätze; manche Letztplatzierte erhielten früher 1 oder 2 Punkte.');
 add('Hall of Shame','Teilnahmen ohne Meistertitel',ps.filter(p=>!p.titles).map(p=>({name:p.name,value:p.appearances})),'Turniere','Nur Spieler ohne Meistertitel; Teilnahmen, nicht Anzahl Jahre seit Debüt.');
 add('Hall of Shame','Teilnahmen ohne Jahrespodium',ps.filter(p=>!p.podium).map(p=>({name:p.name,value:p.appearances})),'Turniere','Nur Spieler ohne offizielles Jahrespodium.');
 add('Hall of Shame','Vizemeisterschaften ohne Titel',ps.filter(p=>!p.titles).map(p=>({name:p.name,value:p.runner})),'zweite Plätze','Nur Spieler ohne Meistertitel.');

 add('Hall of Shame','Längste Serie ohne Rundensieg',stories.winlessRun,'Runden','Meiste aufeinanderfolgende selbst gespielte Runden ohne offiziellen Rang 1; Turnierpausen ohne Teilnahme zählen nicht als Runden.');
 add('Hall of Shame','Grösster verspielter Meisterschaftsvorsprung',stories.lostLead,'Punkte','Grösster alleiniger Punktevorsprung nach einer Runde vor der Schlussrunde, ohne am Ende Meister zu werden. Auf 7 Runden umgerechnet; Originalvorsprung in der Rangliste.');
 add('Hall of Shame','Schlechtester Titelverteidiger',stories.defenderCrash,'Schlussrang','Schlechtester offizieller Schlussrang des Champions beim nächsten ausgetragenen Turnier, sofern er teilnahm.');
 add('Hall of Shame','Längste Nullrunden-Serie',stories.zeroRun,'Runden','Meiste aufeinanderfolgende selbst gespielte Runden mit exakt null Punkten. Auch über Turniergrenzen hinweg.');
 add('Hall of Shame','Längste Serie ohne Jahrespodium',stories.podiumYearDrought,'Turniere','Meiste aufeinanderfolgende eigene Turnierteilnahmen ohne offiziellen Jahresschlussrang 1 bis 3.');
 add('Hall of Shame','Längste Serie ohne Rundenpodium',stories.roundPodiumDrought,'Runden','Meiste aufeinanderfolgende selbst gespielte Runden ohne offiziellen Rundenrang 1 bis 3.');
 add('Hall of Shame','Grösster Absturz zur vorherigen Teilnahme',stories.seasonCrash,'Plätze','Grösster Rückfall im offiziellen Schlussrang gegenüber der eigenen vorherigen Turnierteilnahme; keine Hochrechnung von Rangplätzen.');
 add('Hall of Shame','Längste Serie mit roter Laterne',stories.lanternRun,'Runden','Meiste aufeinanderfolgende Runden innerhalb einer Meisterschaft mit den niedrigsten kumulierten Punkten; geteilte rote Laterne zählt.');
 add('Hall of Shame','Meiste letzte Plätze in der Schlussrunde',stories.lastFinal,'letzte Plätze','Letzter Platz in der jeweils letzten Turnierrunde anhand der niedrigsten Rundenzahl; alle Punktgleichen zählen.');
 add('Hall of Shame','Meiste verspielte Meisterschaftsführungen',stories.missedTitles,'Turniere','Anzahl Meisterschaften mit mindestens einer alleinigen Führung nach einer Runde vor dem Finale, aber ohne späteren Titel.');

 add('Rivalitäten','Meiste gemeinsame Turniere',pairs.map(p=>({name:`${p.a} / ${p.b}`,value:p.years})),'Turniere','Beide Spieler nahmen am selben Jahrgang teil.');
 add('Rivalitäten','Grösster direkter Bilanzvorsprung',pairs.filter(p=>p.years>=3).map(p=>({name:`${p.advantageA>=p.advantageB?p.a:p.b} vor ${p.advantageA>=p.advantageB?p.b:p.a}`,value:Math.abs(p.advantageA-p.advantageB)})),'Jahre','Differenz der Jahre mit besserem offiziellen Schlussrang; mindestens 3 gemeinsame Teilnahmen.');
 return {records,years:editions.length,players:ps.length,seasonCount:seasons.length,filtered:!!yearSet||!!playerSet};
}
let activeCategory='Erfolge';
function render(seed=window.POKER_SEED,filters={}){
 if(!seed)return '<p class="hint">Historische Daten nicht geladen.</p>';
 const data=calculate(seed,filters);
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
  <p>${data.records.length} automatisch berechnete Rekordlisten aus ${data.years} ausgewählten Turnieren und ${data.players} berücksichtigten Spielern. Wähle eine Kategorie und entdecke zu jedem Rekord das Podium mit den drei Bestplatzierten. Die vollständige Rangliste lässt sich darunter aufklappen. Gleichstände teilen sich denselben Rang. Zählbare Saisonleistungen und Punkteabstände werden auf 7 Runden umgerechnet; Rangbewegungen und relative Werte bleiben auf ihrer eigenen Skala. Letzte Rundenplätze folgen der niedrigsten Punktzahl jeder Runde, Nullrunden werden separat gezählt.</p>
  ${data.filtered?'<p class="hof-filter-scope">Gefilterte Ansicht · Offizielle Rangplätze und Turnierverläufe bleiben unverändert. Saisonweite Rekorde beziehen sich auf die ausgewählten Turniere, persönliche Rekorde nur auf die gewählten Spieler.</p>':''}
  ${data.records.length?'':'<p class="hof-filter-empty">Für diese Auswahl sind keine auswertbaren Rekorde vorhanden. Erweitere die Jahre oder Spieler.</p>'}
  <nav class="hof-tabs" aria-label="Rekordkategorien">${groups.map((g,i)=>`<button type="button" class="hof-tab ${g===activeCategory?'selected':''}" data-hof-tab="${escape(g)}">${escape(g)}</button>`).join('')}</nav>
  ${groups.map((g,i)=>`<div class="hof-category" data-hof-category="${escape(g)}" ${g===activeCategory?'':'hidden'}>${data.records.filter(r=>r.category===g).map(card).join('')||'<p class="hof-filter-empty">Für diese Kategorie gibt es in der Auswahl keine qualifizierten Rekorde.</p>'}</div>`).join('')}
  <p class="hof-source">Quelle: originale Schlussranglisten und chronologische Rundenresultate. Saisonwerte für Punkte, Führungen und Rundenanzahlen werden auf 7 Runden umgerechnet. Rangbewegungen bleiben absolute Rangverschiebungen und relative Platzierungen unverändert. Originalergebnisse, Punktesysteme und Feldgrössen werden nie geändert.</p>
 </section>`;
}
window.BaergsunneHallRecords={calculate,render};
document.addEventListener('click',e=>{const b=e.target.closest('[data-hof-tab]');if(!b)return;const root=b.closest('.hof-extended');if(!root)return;activeCategory=b.dataset.hofTab;root.querySelectorAll('[data-hof-tab]').forEach(x=>x.classList.toggle('selected',x===b));root.querySelectorAll('[data-hof-category]').forEach(x=>x.hidden=x.dataset.hofCategory!==b.dataset.hofTab);});
})();
