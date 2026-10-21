/* Bärgsunne Poker — four additional, read-only Historie perspectives.
   Input: documented edition results only. No fabricated achievements or changes to originals. */
(function(){
 'use strict';
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmt=n=>Number(n).toLocaleString('de-CH',{maximumFractionDigits:1});
 const pct=n=>fmt(n*100)+' %';
 const order=editions=>[...editions].sort((a,b)=>a.year-b.year);
 const champion=ed=>ed.official_standings.filter(x=>x.place===1).map(x=>x.player_id);
 const people=xs=>xs.length?xs.map(esc).join(', '):'Niemand';
 const results=ed=>[...ed.rounds].sort((a,b)=>a.number-b.number);
 const playerStats=ed=>ed.players.map(player=>{
  const rr=results(ed).map(round=>round.results.find(x=>x.player_id===player)).filter(Boolean);
  return {player,wins:rr.filter(x=>x.place===1).length,top3:rr.filter(x=>x.place<=3).length,
   top5:rr.filter(x=>x.place<=5).length,zeros:rr.filter(x=>x.points===0).length,
   last:rr.filter((x,i)=>x.place===Math.max(...results(ed)[i].results.map(z=>z.place))).length,
   points:rr.reduce((sum,x)=>sum+x.points,0),count:rr.length};
 });
 function timeline(ed){
  const scores=new Map(ed.players.map(player=>[player,{player,points:0,wins:0}]));
  return results(ed).map(round=>{
   for(const item of round.results){const v=scores.get(item.player_id);if(v){v.points+=item.points;if(item.place===1)v.wins++;}}
   const ordered=[...scores.values()].sort((a,b)=>b.points-a.points||b.wins-a.wins||a.player.localeCompare(b.player,'de'));
   return {round:round.number,rows:ordered.map((r,i)=>({...r,rank:i+1})),
    leaders:ordered.filter(x=>x.points===ordered[0]?.points).map(x=>x.player),
    last:ordered.filter(x=>x.points===ordered.at(-1)?.points).map(x=>x.player)};
  });
 }
 const same=(a,b)=>a.length===b.length&&a.every(x=>b.includes(x));
 const leadership=ed=>{const line=timeline(ed);return line.slice(1).filter((x,i)=>!same(x.leaders,line[i].leaders)).length;};
 const uniqueWinners=ed=>new Set(results(ed).flatMap(r=>r.results.filter(x=>x.place===1).map(x=>x.player_id))).size;
 const topGap=ed=>{
  const rows=[...ed.official_standings].sort((a,b)=>a.place-b.place);
  const one=rows.filter(x=>x.place===1),runner=rows.find(x=>x.place>1);
  if(!one.length||!runner)return null;
  return Math.max(0,Math.min(...one.map(x=>x.points))-runner.points);
 };
 const achievable=ed=>results(ed).reduce((sum,r)=>sum+Math.max(0,...r.results.map(x=>x.points)),0);
 function rankings(ed){
  const line=timeline(ed);let climb=[],fall=[],leads=[],red=[],changesUp=[],changesDown=[];
  for(const player of ed.players){
   const series=line.map(l=>l.rows.find(x=>x.player===player)?.rank).filter(Number.isFinite);
   let gain=0,loss=0,highestBad=series[0],best=series[0];
   for(const r of series.slice(1)){gain=Math.max(gain,highestBad-r);loss=Math.max(loss,r-best);highestBad=Math.max(highestBad,r);best=Math.min(best,r);}
   climb.push({player,value:gain});fall.push({player,value:loss});
   leads.push({player,value:line.filter(x=>x.leaders.includes(player)).length});
   red.push({player,value:line.filter(x=>x.last.includes(player)).length});
   const differences=series.slice(1).map((r,i)=>series[i]-r);
   changesUp.push({player,value:Math.max(0,...differences)});
   changesDown.push({player,value:Math.max(0,...differences.map(x=>-x))});
  }
  return {climb,fall,leads,red,changesUp,changesDown,line};
 }
 const maxima=(items,key)=>{const high=Math.max(...items.map(x=>Number(x[key])));return {value:high,names:items.filter(x=>x[key]===high).map(x=>x.player)};};
 const metric=(title,value,names,explanation,kind='positive')=>
  '<article class="history-insight-metric history-insight-metric--'+esc(kind)+'"><span class="history-insight-metric-title">'+esc(title)+'</span><strong class="history-insight-metric-value">'+esc(value)+'</strong>'+(names.length?'<span class="history-insight-metric-players">'+people(names)+'</span>':'')+'<p>'+esc(explanation)+'</p></article>';
 const section=(title,description,cards)=>'<section class="history-insight-section"><h4>'+esc(title)+'</h4><p>'+esc(description)+'</p><div class="history-insight-grid">'+cards.join('')+'</div></section>';
 const label=(title,body)=>'<div class="history-insight-fact"><strong>'+esc(title)+'</strong><p>'+body+'</p></div>';
 const namesSpan=xs=>'<strong class="history-insight-names">'+people(xs)+'</strong>';
 const empty=msg=>'<p class="history-insight-empty">'+esc(msg)+'</p>';
 /* Every explanation tells the reader what actually happened, not how a
    statistic was calculated. The same documented rounds drive both Jahrbuch
    and Rekordbuch. */
 const roundNumbers=(ed,player,match)=>results(ed).filter(r=>{
  const item=r.results.find(x=>x.player_id===player);
  return item&&match(item,r);
 }).map(r=>r.number);
 const roundNumbersText=ns=>ns.length===1?String(ns[0]):
  ns.length===2?ns[0]+' und '+ns[1]:ns.slice(0,-1).join(', ')+' und '+ns.at(-1);
 const inRounds=ns=>ns.length===1?'in Runde '+ns[0]:'in den Runden '+roundNumbersText(ns);
 const wonRounds=ns=>ns.length===1?'Runde '+ns[0]:'die Runden '+roundNumbersText(ns);
 const roundStory=(ed,names,filter,verb)=>{
  return names.map(name=>{
   const ns=roundNumbers(ed,name,filter);
   return verb(name,ns);
  }).join(' ');
 };
 /* Finds the two real intermediate standings behind a climb, fall or
    single-round jump. For equal records the first chronological occurrence
    is used. The difference always matches rankings(ed), including ties. */
 function rankJourney(ed,player,direction,adjacent=false){
  const series=timeline(ed).map(x=>({round:x.round,rank:x.rows.find(r=>r.player===player)?.rank}))
   .filter(x=>Number.isFinite(x.rank));
  let best=null,value=0;
  for(let i=0;i<series.length-1;i++)for(let j=i+1;j<series.length;j++){
   if(adjacent&&j!==i+1)continue;
   const diff=direction==='up'?series[i].rank-series[j].rank:series[j].rank-series[i].rank;
   if(diff>value){value=diff;best={from:series[i],to:series[j],value};}
  }
  return best;
 }
 const rankStory=(ed,names,direction,adjacent=false)=>{
  return names.map(name=>{
   const j=rankJourney(ed,name,direction,adjacent);
   if(!j)return name+' blieb in der Gesamtwertung auf seinem Rang.';
   const verb=direction==='up'?'stieg':'fiel';
   return name+' '+verb+' von Rang '+j.from.rank+' nach Runde '+j.from.round+
    ' auf Rang '+j.to.rank+' nach Runde '+j.to.round+'.';
  }).join(' ');
 };
 const chooseRecord=(items,key,title,unit,describe,kind='positive')=>{
  const m=maxima(items,key);
  return metric(title,fmt(m.value)+' '+unit,m.value>0?m.names:[],
   m.value>0?describe(m.names):'Dazu gab es in diesem Turnier keinen entsprechenden Rangwechsel oder Treffer.',kind);
 };
 const roundRecord=(ed,stats,key,title,unit,filter,describe,kind='positive')=>
  chooseRecord(stats,key,title,unit,names=>roundStory(ed,names,filter,describe),kind);
 function records(ed){
  const stats=playerStats(ed),rank=rankings(ed),rr=results(ed);
  const time=rank.line;
  const pos=[
   roundRecord(ed,stats,'wins','Meiste Rundensiege','Siege',x=>x.place===1,
    (name,ns)=>name+' gewann '+wonRounds(ns)+'.'),
   roundRecord(ed,stats,'top3','Meiste Top-3-Plätze','Runden',x=>x.place<=3,
    (name,ns)=>name+' stand '+inRounds(ns)+' auf dem Podest.'),
   roundRecord(ed,stats,'top5','Meiste Top-5-Plätze','Runden',x=>x.place<=5,
    (name,ns)=>name+' landete '+inRounds(ns)+' unter den ersten fünf.'),
   chooseRecord(rank.climb,'value','Grösste Aufholjagd','Plätze',
    names=>rankStory(ed,names,'up')),
   chooseRecord(rank.leads,'value','Meiste Runden an der Spitze','Runden',
    names=>names.map(name=>{
     const ns=time.filter(x=>x.leaders.includes(name)).map(x=>x.round);
     return name+' lag nach '+(ns.length===1?'Runde '+ns[0]:'den Runden '+roundNumbersText(ns))+' an der Spitze.';
    }).join(' ')),
   chooseRecord(rank.changesUp,'value','Grösster Sprung nach oben','Plätze',
    names=>rankStory(ed,names,'up',true))
  ];
  const neg=[
   roundRecord(ed,stats,'zeros','Meiste Nullerrunden','Runden',x=>x.points===0,
    (name,ns)=>name+' blieb '+inRounds(ns)+' ohne Punkte.','negative'),
   roundRecord(ed,stats,'last','Meiste letzte Rundenplätze','Runden',
    (x,r)=>x.place===Math.max(...r.results.map(z=>z.place)),
    (name,ns)=>name+' belegte '+inRounds(ns)+' den letzten Platz.','negative'),
   chooseRecord(rank.fall,'value','Grösster Absturz','Plätze',
    names=>rankStory(ed,names,'down'),'negative'),
   chooseRecord(rank.red,'value','Meiste Runden mit roter Laterne','Runden',
    names=>names.map(name=>{
     const ns=time.filter(x=>x.last.includes(name)).map(x=>x.round);
     return name+' lag nach '+(ns.length===1?'Runde '+ns[0]:'den Runden '+roundNumbersText(ns))+' ganz hinten.';
    }).join(' '),'negative'),
   chooseRecord(rank.changesDown,'value','Grösster Fall nach einer Runde','Plätze',
    names=>rankStory(ed,names,'down',true),'negative')
  ];
  return section('Bestleistungen','Die besten Leistungen aus diesem Turnier.',pos)+
   section('Negativrekorde','Diese Runden und Rangverluste verliefen weniger glücklich.',neg);
 }
 /* Turnier-DNA belongs to the Jahrbuch portrait, not to Rekordbuch. */
 function seasonDna(ed){
  const rr=results(ed),changes=leadership(ed),gap=topGap(ed),distinct=uniqueWinners(ed);
  const dna=[
   metric('Unterschiedliche Rundensieger',fmt(distinct)+' Spieler',[],
    distinct===1?'Ein Spieler konnte sämtliche Runden für sich entscheiden.':distinct+' Spieler gewannen mindestens eine Runde.','neutral'),
   metric('Wechsel an der Tabellenspitze',fmt(changes)+' Wechsel',[],
    changes===0?'Die Führung blieb zwischen den Runden unverändert.':
     'Nach '+changes+' Runden wechselten die Spieler an der Tabellenspitze.','neutral'),
   metric('Abstand zwischen Platz 1 und 2',gap===null?'Nicht verfügbar':fmt(gap)+' Punkte',[],
    gap===null?'Es gibt keinen dokumentierten zweiten Platz zum Vergleichen.':
     'Am Turnierende lagen zwischen Platz 1 und 2 genau '+fmt(gap)+' Punkte.','neutral'),
   metric('Anzahl Runden',fmt(rr.length)+' Runden',[],
    'In diesem Turnier wurden '+fmt(rr.length)+' Runden gespielt.','neutral')
  ];
  return section('Turnier-DNA','Vier Zahlen, die zeigen, wie dieses Turnier verlief.',dna);
 }
 function yearbookExtras(ed){
  const stats=playerStats(ed),rank=rankings(ed);
  const annual=[
   roundRecord(ed,stats,'wins','Meiste Rundensiege','Siege',x=>x.place===1,
    (name,ns)=>name+' gewann '+wonRounds(ns)+'.'),
   roundRecord(ed,stats,'top3','Meiste Top-3-Plätze','Runden',x=>x.place<=3,
    (name,ns)=>name+' stand '+inRounds(ns)+' auf dem Podest.'),
   roundRecord(ed,stats,'zeros','Meiste Nullerrunden','Runden',x=>x.points===0,
    (name,ns)=>name+' blieb '+inRounds(ns)+' ohne Punkte.','negative'),
   chooseRecord(rank.climb,'value','Grösste Aufholjagd','Plätze',
    names=>rankStory(ed,names,'up'))
  ];
  const names=[...new Set(ed.players)];
  const field='<section class="history-yearbook-participants"><h4>Teilnehmerfeld</h4>'+
    '<p>'+names.length+' Spieler waren bei diesem Turnier dabei.</p>'+
    '<div class="history-yearbook-playerlist">'+names.map(x=>'<span>'+esc(x)+'</span>').join('')+'</div></section>';
  return '<div class="history-yearbook-extras">'+field+
   section('Vier Jahresrekorde','Das haben die Spieler in diesem Turnier erreicht.',annual)+
   seasonDna(ed)+'</div>';
 }
 function field(ed,editions){
  const all=order(editions),index=all.findIndex(x=>x.year===ed.year),earlier=all.slice(0,index),previous=all[index-1]||null;
  const started=p=>earlier.some(x=>x.players.includes(p));
  const first=ed.players.filter(p=>!started(p));
  const returning=ed.players.filter(p=>started(p)&&previous&&!previous.players.includes(p));
  const missing=previous?previous.players.filter(p=>!ed.players.includes(p)):[];
  const lifetime=ed.players.map(player=>({player,value:earlier.filter(x=>x.players.includes(player)).length+1}));
  const max=maxima(lifetime,'value');
  const veteran=lifetime.filter(x=>x.value>=3).sort((a,b)=>b.value-a.value||a.player.localeCompare(b.player,'de'));
  let pairCount=0,pairs=[];
  for(let i=0;i<ed.players.length;i++)for(let j=i+1;j<ed.players.length;j++){
   const a=ed.players[i],b=ed.players[j],count=all.slice(0,index+1).filter(x=>x.players.includes(a)&&x.players.includes(b)).length;
   if(count>pairCount){pairCount=count;pairs=[[a,b]];}else if(count===pairCount)pairs.push([a,b]);
  }
  const membership=[
   metric('Spieler am Tisch',ed.players.length+' Teilnehmer',[],'Alle dokumentierten Teilnehmer dieses Turniers.','neutral'),
   metric('Erstmals im Archiv',first.length+' Spieler',first,'Vor diesem Jahr ist für diese Spieler keine Teilnahme im Archiv dokumentiert.','neutral'),
   metric('Rückkehrer',returning.length+' Spieler',returning,'Bereits früher dabei, aber beim unmittelbar vorherigen Turnier nicht.','neutral'),
   metric('Stammgast mit meisten Teilnahmen',max.value+' Turniere',max.names,'Bis einschliesslich dieses Turniers dokumentierte Teilnahmen.','neutral')
  ];
  const exact=[
   label('Alle Teilnehmer',namesSpan(ed.players)),
   label('Erstmals dokumentiert',first.length?namesSpan(first):empty('Keine erstmals dokumentierten Teilnehmer.')),
   label('Wieder dabei',returning.length?namesSpan(returning):empty('Keine Rückkehrer gegenüber dem vorherigen Turnier.')),
   label('Stammgäste',veteran.length?'<div class="history-insight-name-list">'+veteran.map(x=>'<span>'+esc(x.player)+' · '+x.value+' Turniere</span>').join('')+'</div>':empty('Noch keine Spieler mit mindestens drei Teilnahmen.')),
   label('Gegenüber dem vorherigen Turnier nicht dabei',previous?(missing.length?namesSpan(missing):empty('Niemand aus dem letzten Turnier fehlt.')):empty('Dies ist das erste dokumentierte Turnier.'))
  ];
  if(pairCount>1)exact.push(label('Am häufigsten gemeinsam dabei',namesSpan(pairs.map(p=>p.join(' & ')))+'<p>'+fmt(pairCount)+' gemeinsame Turniere bis zu diesem Jahr.</p>'));
  return section('Die Besetzung','Hier geht es um die Menschen am Pokertisch – unabhängig von Punkten und Platzierungen.',membership)+
   '<section class="history-insight-section"><h4>Wer gehörte dazu?</h4><p>Die Teilnahmen beziehen sich ausschliesslich auf die dokumentierte Bärgsunne-Geschichte.</p><div class="history-insight-facts">'+exact.join('')+'</div></section>';
 }
 function seasonCompare(ed,editions){
  const all=order(editions),index=all.findIndex(x=>x.year===ed.year),older=all[index-1];
  if(!older)return empty('Dies ist das erste dokumentierte Turnier. Ein vorheriges Turnier zum Vergleichen ist nicht vorhanden.');
  const oldChampion=champion(older),currentChampion=champion(ed);
  const oldField=new Set(older.players),currentField=new Set(ed.players);
  const debut=ed.players.filter(p=>!all.slice(0,index).some(x=>x.players.includes(p)));
  const common=ed.players.filter(p=>oldField.has(p)),newcomers=ed.players.filter(p=>!oldField.has(p)),gone=older.players.filter(p=>!currentField.has(p));
  const gapOld=topGap(older),gapNew=topGap(ed);
  const ratio=year=>{const g=topGap(year),max=achievable(year);return g===null||!max?null:g/max;};
  const before=ratio(older),after=ratio(ed);
  const value=(a,b)=>'<div class="history-insight-versus"><span><small>'+older.year+'</small><strong>'+esc(a)+'</strong></span><span><small>'+ed.year+'</small><strong>'+esc(b)+'</strong></span></div>';
  const unit=(label,left,right,description)=>
   '<article class="history-insight-compare"><h4>'+esc(label)+'</h4>'+value(left,right)+'<p>'+esc(description)+'</p></article>';
  const winnerOld=oldChampion.join(', '),winnerNew=currentChampion.join(', ');
  const lastChamp=oldChampion.map(p=>{
   const row=ed.official_standings.find(x=>x.player_id===p);
   return row?esc(p)+' · Schlussrang '+row.place+' ('+fmt(row.points)+' Punkte)':esc(p)+' · nicht am Turnier '+ed.year+' teilgenommen';
  }).join('; ');
  return '<div class="history-insight-compare-grid">'+[
   unit('Teilnehmer',older.players.length,ed.players.length,'Grösse des dokumentierten Teilnehmerfeldes.'),
   unit('Runden',older.round_count,ed.round_count,'Die Rundenzahlen können je nach Jahr unterschiedlich sein.'),
   unit('Verschiedene Rundensieger',uniqueWinners(older),uniqueWinners(ed),'Jeder Spieler mit mindestens einem Rundensieg zählt einmal.'),
   unit('Wechsel an der Spitze',leadership(older),leadership(ed),'Wechsel der punktführenden Gruppe nach einer Runde.'),
   unit('Abstand an der Spitze',before===null?'–':pct(before),after===null?'–':pct(after),'Abstand Platz 1 zu Platz 2 geteilt durch die im jeweiligen Turnier höchstmögliche Punktesumme. Kleinere Werte bedeuten eine engere Schlusswertung.'),
   unit('Champion',winnerOld||'Nicht dokumentiert',winnerNew||'Nicht dokumentiert','Offizielle Schlussresultate; keine rechnerische Umdeutung.')
  ].join('')+'</div>'+
  '<section class="history-insight-section"><h4>Das Teilnehmerfeld im Wandel</h4><p>Wir vergleichen mit dem vorherigen tatsächlich ausgetragenen Turnier '+older.year+'. Ausgefallene Kalenderjahre zählen nicht als Turniere.</p><div class="history-insight-facts">'+
   label(common.length+' Spieler in beiden Turnieren',namesSpan(common))+
   label(newcomers.length+' neu gegenüber '+older.year, newcomers.length?namesSpan(newcomers):empty('Keine Neuzugänge.'))+
   label(debut.length+' erstmals dokumentiert',debut.length?namesSpan(debut):empty('Keine erstmals dokumentierten Spieler.'))+
   label(gone.length+' Spieler fehlen gegenüber '+older.year,gone.length?namesSpan(gone):empty('Niemand aus dem vorherigen Teilnehmerfeld fehlt.'))+
   label('So schnitt der vorherige Champion ab','<p>'+lastChamp+'</p>')+'</div></section>';
 }
 const types={records:['Rekordbuch','Bestleistungen und Negativrekorde','♛'],field:['Teilnehmerfeld','Neulinge, Rückkehrer und Stammgäste','♙'],compare:['Jahresvergleich','Was hat sich zum letzten Turnier verändert?','⇄']};
 function viewPanel(type,ed,editions){
  const info=types[type],body=type==='records'?records(ed):type==='field'?field(ed,editions):seasonCompare(ed,editions);
  return '<article class="history-yearbook-card history-insight-card" data-year="'+ed.year+'" data-insight="'+type+'">'+body+'</article>';
 }
 function render(type,ed,editions){
  if(!types[type])return '';
  const years=order(editions),index=years.findIndex(x=>x.year===ed.year);
  return '<div class="history-carousel-control"><span>‹ Älter</span><input id="history-year-slider" type="range" min="0" max="'+(years.length-1)+'" value="'+index+'" step="0.01" aria-label="'+esc(types[type][0])+' – Jahr wechseln"/><span>Neuer ›</span></div>'+
   '<section class="history-feature history-feature--yearbook history-feature--insights history-feature--'+type+'"><div class="history-carousel-viewport"><div class="history-carousel-track" data-index="'+index+'">'+years.map((x,i)=>
    '<div class="history-carousel-slide" data-index="'+i+'" '+(i!==index?'inert aria-hidden="true"':'')+'>'+viewPanel(type,x,editions)+'</div>'
   ).join('')+'</div></div></section><p class="history-carousel-hint">Jahrgang durch Wischen oder mit dem Regler wechseln. Alle Angaben stammen aus den dokumentierten Resultaten.</p>';
 }
 window.BAERGSUNNE_HISTORY_EXT={render,types,yearbookExtras};
})();
