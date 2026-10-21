/* Bärgsunne Poker 2.2.5: independent historical chronicle, read-only */
(function(){'use strict';
const memory={year:null,round:0,view:'yearbook',perspective:'all',person:'',originalResultsOpen:false};
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&quot;'}[c]));
const fmt=n=>Number(n).toLocaleString('de-CH',{maximumFractionDigits:2});
function reconstruct(ed,round){const scores=new Map(ed.players.map(p=>[p,{player:p,points:0,wins:0,results:[]}]));for(const r of ed.rounds.filter(r=>r.number<=round))for(const x of r.results){const o=scores.get(x.player_id);if(!o)continue;o.points+=x.points;o.wins+=x.place===1?1:0;o.results.push(x)}return [...scores.values()].sort((a,b)=>b.points-a.points||b.wins-a.wins||a.player.localeCompare(b.player,'de'));}
// All moments are computed from documented rounds, never from invented stories.
// "Vorrunde" comparisons begin with round 2; the leader and the red lantern
// are groups of all players with the same top / bottom point totals.
function moments(ed){
 const rounds=[...ed.rounds].sort((a,b)=>a.number-b.number);
 const same=(a,b)=>a.length===b.length&&a.every(x=>b.includes(x));
 const people=xs=>xs.map(x=>x.player).join(', ');
 const top=ranking=>ranking.filter(x=>x.points===ranking[0]?.points);
 const bottom=ranking=>ranking.filter(x=>x.points===ranking.at(-1)?.points);
 return rounds.map((round,index)=>{
  const current=reconstruct(ed,round.number),previous=index?reconstruct(ed,rounds[index-1].number):null;
  const oldRound=index?rounds[index-1]:null;
  const cards=[];
  const add=(type,title,detail)=>cards.push({type,title,detail});
  const winners=round.results.filter(x=>x.place===1).map(x=>x.player_id);
  const oldTop=previous?top(previous):[],nowTop=top(current);
  const oldBottom=previous?bottom(previous):[],nowBottom=bottom(current);
  const leaderChanged=previous&&!same(nowTop.map(x=>x.player),oldTop.map(x=>x.player));
  const bottomChanged=previous&&!same(nowBottom.map(x=>x.player),oldBottom.map(x=>x.player));
  add('leader',leaderChanged?'Führungswechsel':previous?'Führung verteidigt':'An der Spitze',
    (leaderChanged?'Neu vorne: ':'Vorne: ')+people(nowTop)+'.');
  add('lantern',bottomChanged?'Rote Laterne wechselt':previous?'Rote Laterne bleibt':'Rote Laterne',
    (bottomChanged?'Neu am Tabellenende: ':'Am Tabellenende: ')+people(nowBottom)+'.');
  let ups=[],downs=[];
  if(previous){
   const oldRanks=new Map(previous.map((x,i)=>[x.player,i+1]));
   for(let i=0;i<current.length;i++){
    const x=current[i],difference=oldRanks.get(x.player)-(i+1);
    if(difference>=3)ups.push({name:x.player,steps:difference});
    if(difference<=-3)downs.push({name:x.player,steps:-difference});
   }
   ups.sort((a,b)=>b.steps-a.steps||a.name.localeCompare(b.name,'de'));
   downs.sort((a,b)=>b.steps-a.steps||a.name.localeCompare(b.name,'de'));
   if(ups.length)add('up','Grosse Sprünge nach oben',ups.map(x=>x.name+' +'+x.steps+' Plätze').join(' · '));
   if(downs.length)add('down','Grosse Abstürze',downs.map(x=>x.name+' −'+x.steps+' Plätze').join(' · '));
   if(!ups.length&&!downs.length)add('steady','Keine grossen Rangbewegungen','Niemand ist um mindestens 3 Plätze gestiegen oder gefallen.');
   const oldPoints=new Map(oldRound.results.map(x=>[x.player_id,x.points]));
   const change=round.results.filter(x=>oldPoints.has(x.player_id)).map(x=>({name:x.player_id,diff:x.points-oldPoints.get(x.player_id),points:x.points,previous:oldPoints.get(x.player_id)}));
   if(change.length){
    const high=Math.max(...change.map(x=>x.diff)),low=Math.min(...change.map(x=>x.diff));
    if(high>0)add('reaction','Stärkste Reaktion auf die Vorrunde',
      change.filter(x=>x.diff===high).map(x=>x.name).join(', ')+' · '+fmt(high)+' Punkte mehr als in Runde '+oldRound.number+'.');
    else add('reaction','Keine Steigerung zur Vorrunde','Niemand erzielte mehr Punkte als in der vorherigen Runde.');
    if(low<0)add('slump','Schwächste Reaktion auf die Vorrunde',
      change.filter(x=>x.diff===low).map(x=>x.name).join(', ')+' · '+fmt(-low)+' Punkte weniger als in Runde '+oldRound.number+'.');
    else add('slump','Kein Rückgang zur Vorrunde','Niemand erzielte weniger Punkte als in der vorherigen Runde.');
   }
   const oldPodium=new Set(previous.slice(0,3).map(x=>x.player));
   const arrivals=current.slice(0,3).filter(x=>!oldPodium.has(x.player));
   if(arrivals.length)add('podium','Neu in den Top 3',people(arrivals)+' hat den Sprung unter die ersten drei geschafft.');
   const lastWinners=oldRound.results.filter(x=>x.place===1).map(x=>x.player_id);
   const repeat=winners.filter(x=>lastWinners.includes(x));
   if(repeat.length)add('streak','Zweiter Rundensieg in Folge',repeat.join(', ')+ ' gewinnt auch diese Runde.');
  }
  if(current.length>1){
   const gap=current[0].points-current[1].points;
   if(gap===0)add('tight','Punktgleich an der Spitze',people(nowTop)+' liegen punktgleich vorne.');
   else if(gap<=2)add('tight','Enges Rennen an der Spitze','Zwischen Platz 1 und 2 liegen nur '+fmt(gap)+' Punkte.');
  }
  if(index===rounds.length-1){
   const champions=ed.official_standings.filter(x=>x.place===1).map(x=>x.player_id);
   if(champions.length)add('final','Offizieller Turniersieg',champions.join(', ')+' gewinnt das Turnier '+ed.year+'.');
  }
  return {round:round.number,winners,cards,leaderChanged,bottomChanged,ups,downs};
 });
}
function table(ed,round){const final=round===ed.round_count;const ranks=reconstruct(ed,round);const official=new Map(ed.official_standings.map(x=>[x.player_id,x]));return `<div class="history-table-shell"><table class="history-table"><thead><tr><th scope="col" title="Rang nach dieser Runde">Rang</th><th scope="col">Spieler</th><th scope="col" title="Punkte bis Runde ${round}">Pkt.</th><th scope="col" title="Rundensiege">Siege</th>${final?'<th scope="col" title="Offizieller Schlussrang">Final</th>':''}</tr></thead><tbody>${ranks.map((x,i)=>`<tr><td>${i+1}</td><td>${e(x.player)}</td><td>${fmt(x.points)}</td><td>${x.wins}</td>${final?`<td>${official.get(x.player)?.place??'–'}</td>`:''}</tr>`).join('')}</tbody></table></div>`;}
function replay(ed){
 const rounds=[...ed.rounds].sort((a,b)=>a.number-b.number);
 const selected=Math.min(rounds.length-1,Math.max(0,rounds.findIndex(x=>x.number===(memory.round||1))));
 const card=(round,i)=>`<article class="history-replay-card" data-round="${round.number}"><div class="history-replay-card-head"><span>TURNIER ${ed.year} · RUNDENCHRONIK</span><h4>Runde ${round.number}</h4><p>Stand nach Runde ${round.number}</p></div>${table(ed,round.number)}<details class="history-proof history-replay-proof" ${memory.originalResultsOpen?'open':''}><summary>Originalergebnis dieser Runde</summary><div class="history-table-shell"><table class="history-table"><thead><tr><th>Rang</th><th>Spieler</th><th>Punkte</th></tr></thead><tbody>${[...round.results].sort((a,b)=>a.place-b.place).map(x=>`<tr><td>${x.place}</td><td>${e(x.player_id)}</td><td>${fmt(x.points)}</td></tr>`).join('')}</tbody></table></div></details></article>`;
 return `<div class="history-carousel-control history-replay-control history-unified-slider"><button type="button" class="history-step-button" data-history-step="-1" aria-label="Eine Runde zurück">‹ Zurück</button><input type="range" id="history-round-slider" min="0" max="${rounds.length-1}" step="0.01" value="${selected}" aria-label="Runde im Replay auswählen" aria-valuetext="Runde ${rounds[selected].number} von ${ed.round_count}"/><button type="button" class="history-step-button" data-history-step="1" aria-label="Eine Runde weiter">Weiter ›</button><strong id="history-replay-count" class="history-slider-sr-only" aria-live="polite">Runde ${rounds[selected].number} von ${ed.round_count}</strong></div><section class="history-feature history-feature--replay"><div class="history-replay-viewport"><div class="history-replay-track" data-index="${selected}">${rounds.map((r,i)=>`<div class="history-replay-slide" data-index="${i}" aria-hidden="${i!==selected}">${card(r,i)}</div>`).join('')}</div></div></section>`;
}
function yearbook(ed,editions){
 const years=[...editions].sort((a,b)=>a.year-b.year),index=years.findIndex(x=>x.year===ed.year);
 const panel=x=>{const standing=x.official_standings;const name=n=>standing.filter(z=>z.place===n).map(z=>z.player_id).join(', ')||'Nicht dokumentiert';return `<div class="history-yearbook-card" data-year="${x.year}"><div class="history-yearbook-head"><div class="history-yearbook-cup" aria-hidden="true">🏆</div><span class="history-yearbook-divider" aria-hidden="true"></span></div><div class="history-podium history-podium--champion"><small>Champion</small><strong>${e(name(1))}</strong></div><div class="history-podium-pairs"><div class="history-podium history-podium--second"><small>Platz 2</small><strong>${e(name(2))}</strong></div><div class="history-podium history-podium--third"><small>Platz 3</small><strong>${e(name(3))}</strong></div></div>${window.BAERGSUNNE_HISTORY_EXT?.yearbookExtras?.(x)||""}<div class="history-shortcuts history-shortcuts--yearbook"><button type="button" data-his="view" data-view="replay">Turnier anschauen</button><button type="button" data-his="view" data-view="moments"><span>Schlüsselmomente</span><span>entdecken</span></button></div></div>`;};
 return `<div class="history-carousel-control"><button type="button" class="history-step-button" data-history-step="-1" aria-label="Ein Jahr zurück">‹ Zurück</button><input id="history-year-slider" type="range" min="0" max="${years.length-1}" value="${index}" step="0.01" aria-label="Jahrbuch wechseln"/><button type="button" class="history-step-button" data-history-step="1" aria-label="Ein Jahr weiter">Weiter ›</button></div><section class="history-feature history-feature--yearbook"><div class="history-carousel-viewport"><div class="history-carousel-track" data-index="${index}">${years.map((x,i)=>'<div class="history-carousel-slide" data-index="'+i+'" '+(i!==index?'inert aria-hidden="true"':'')+'>'+panel(x)+'</div>').join('')}</div></div></section><p class="history-carousel-hint">Karte mit dem Finger verschieben oder den Regler ziehen. Beim Wischen wechselt jeweils ein Jahrbuch.</p>`;
}

/* Purely visual presentation: all names and figures come from moments(ed). */
function momentCardMarkup(m){
 let headline=m.detail.replace(/\.$/,'');
 let note='',chips=[];
 if(m.type==='leader'||m.type==='lantern'){
  const colon=headline.indexOf(': ');
  if(colon!==-1){
   headline=headline.slice(colon+2);
   chips=[m.type==='leader'?'Gesamtspitze':'Tabellenende'];
   note='Stand der Gesamtwertung nach dieser Runde.';
  }
 }else if(m.type==='up'||m.type==='down'){
  const parts=headline.split(' · ');
  const movements=parts.map(x=>x.match(/^(.+) ([+−][0-9]+) Plätze$/));
  if(movements.every(Boolean)){
   headline=movements.length===1?movements[0][1]:movements.length+' grosse Rangbewegungen';
   chips=movements.map(x=>movements.length===1?x[2]+' Plätze':x[1]+' '+x[2]+' Plätze');
   note='Veränderung gegenüber der vorherigen Runde.';
  }
 }else if(m.type==='reaction'||m.type==='slump'){
  const parts=headline.split(' · ');
  const delta=parts[1]?.match(/^([0-9.,]+) Punkte (mehr|weniger) als in Runde ([0-9]+)$/);
  if(delta){
   headline=parts[0];
   chips=[(delta[2]==='mehr'?'+':'−')+delta[1]+' Punkte'];
   note='Verglichen mit den Punkten aus Runde '+delta[3]+'.';
  }
 }else if(m.type==='podium'){
  const name=headline.match(/^(.*) hat den Sprung unter die ersten drei geschafft$/);
  if(name){headline=name[1];chips=['Neu in den Top 3'];note='Veränderung gegenüber der vorherigen Runde.';}
 }else if(m.type==='streak'){
  const name=headline.match(/^(.*) gewinnt auch diese Runde$/);
  if(name){headline=name[1];chips=['2 Rundensiege in Folge'];note='Auch die vorherige Runde gewonnen.';}
 }else if(m.type==='final'){
  const name=headline.match(/^(.*) gewinnt das Turnier [0-9]{4}$/);
  if(name){headline=name[1];chips=['Turniersieg'];note='Offizielle Schlussrangliste.';}
 }else if(m.type==='tight'){
  const gap=headline.match(/nur ([0-9.,]+) Punkte/);
  if(gap){headline=gap[1]+' Punkte Abstand';chips=['Platz 1 ↔ 2'];note='Abstand in der Gesamtwertung nach dieser Runde.';}
  else if(headline.includes(' liegen punktgleich vorne')){
   headline=headline.split(' liegen punktgleich vorne')[0];chips=['Punktgleich'];note='Gemeinsame Führung nach dieser Runde.';
  }
 }
 const tags=chips.length?'<div class="history-moment-chips">'+chips.map(x=>'<span class="history-moment-chip">'+e(x)+'</span>').join('')+'</div>':'';
 const description=note?'<p class="history-moment-description">'+e(note)+'</p>':'';
 return '<div class="history-moment-event history-moment-event--'+e(m.type)+'"><strong class="history-moment-label">'+e(m.title)+'</strong><p class="history-moment-headline">'+e(headline)+'</p>'+tags+description+'</div>';
}
function scenes(ed){
 const rounds=moments(ed);
 const selected=Math.max(0,Math.min(rounds.length-1,rounds.findIndex(x=>x.round===(memory.round||1))));
 const card=item=>{
  const winner=item.winners.length?item.winners.join(', '):'Kein Rundensieg dokumentiert';
  const items=item.cards.map(momentCardMarkup).join('');
  return `<article class="history-replay-card history-moment-card" data-round="${item.round}"><div class="history-replay-card-head"><span>SCHLÜSSELMOMENTE · ${ed.year}</span><h4>Runde ${item.round}</h4></div><div class="history-moment-winner"><small>Rundensieg</small><strong>${e(winner)}</strong></div><div class="history-moment-events">${items}</div></article>`;
 };
 return `<div class="history-carousel-control history-replay-control history-unified-slider"><button type="button" class="history-step-button" data-history-step="-1" aria-label="Eine Runde zurück">‹ Zurück</button><input type="range" id="history-round-slider" min="0" max="${rounds.length-1}" step="0.01" value="${selected}" aria-label="Runde der Schlüsselmomente wählen" aria-valuetext="Runde ${rounds[selected].round} von ${rounds.length}"/><button type="button" class="history-step-button" data-history-step="1" aria-label="Eine Runde weiter">Weiter ›</button><strong id="history-replay-count" class="history-slider-sr-only" aria-live="polite">Runde ${rounds[selected].round} von ${rounds.length}</strong></div><section class="history-feature history-feature--replay history-feature--moments"><div class="history-replay-viewport"><div class="history-replay-track" data-index="${selected}">${rounds.map((item,i)=>`<div class="history-replay-slide" data-index="${i}" aria-hidden="${i!==selected}">${card(item)}</div>`).join('')}</div></div></section>`;
}
function archive(ed){return `<section class="history-feature"><div class="history-panel-header"><span>QUELLEN & RESULTATE</span><h3>Originalarchiv ${ed.year}</h3><p>Die gespeicherten historischen Resultate bleiben unverändert. Fehlende Dokumente werden nicht ergänzt.</p></div><p><b>Erfasste Quelle:</b> ${e(ed.source||'Keine Quellenbezeichnung hinterlegt')}</p><p><b>Dokumentationsstatus:</b> ${e(ed.status||'nicht angegeben')}</p><h4>Offizielle Schlussrangliste</h4><div class="history-table-shell"><table class="history-table"><thead><tr><th>Offizieller Rang</th><th>Spieler</th><th>Offizielle Punkte</th></tr></thead><tbody>${[...ed.official_standings].sort((a,b)=>a.place-b.place).map(x=>`<tr><td>${x.place}</td><td>${e(x.player_id)}</td><td>${fmt(x.points)}</td></tr>`).join('')}</tbody></table></div><h4>Originale Rundenresultate</h4>${ed.rounds.map(r=>`<details class="history-proof"><summary>Runde ${r.number}</summary><div class="history-table-shell"><table class="history-table"><thead><tr><th>Rang</th><th>Spieler</th><th>Punkte</th></tr></thead><tbody>${[...r.results].sort((a,b)=>a.place-b.place).map(x=>`<tr><td>${x.place}</td><td>${e(x.player_id)}</td><td>${fmt(x.points)}</td></tr>`).join('')}</tbody></table></div></details>`).join('')}</section>`;}
/* Three home-style navigation cards, without replacing the existing explorer. */
function historyEntry(){
 const entries=[
  ['yearbook','Jahrbuch','Champions und Podestplätze entdecken','♛'],
  ['replay','Runden','Runde für Runde nacherleben','◷'],
  ['moments','Schlüsselmomente','Führungswechsel und Wendepunkte entdecken','✦'],
  ['records','Rekordbuch','Bestwerte und Negativrekorde','♛'],
  ['field','Teilnehmerfeld','Neulinge und Stammgäste','♙'],
  ['compare','Jahresvergleich','Was hat sich verändert?','⇄']
 ];
 const icons={yearbook:'podium',replay:'rounds',moments:'pattern',records:'record',field:'players',compare:'compare'};
 return '<section class="history-entry" aria-label="Historie entdecken"><div class="history-entry-head"><span class="history-entry-kicker">DEIN EINSTIEG</span><h2>Was möchtest du entdecken?</h2></div><div class="tool-grid history-entry-grid">'+entries.map(([view,title,detail])=>
  '<button type="button" class="tool-tile history-entry-tile'+(memory.view===view?' is-active is-current':'')+'" data-his="entry" data-view="'+view+'" aria-pressed="'+(memory.view===view?'true':'false')+'"><span class="tool-tile-symbol" aria-hidden="true"><img class="bp-icon" src="assets/icons/'+icons[view]+'.svg" alt="" aria-hidden="true"></span><span class="tool-tile-copy"><strong>'+e(title)+'</strong><small>'+e(detail)+'</small></span><span class="tool-tile-arrow" aria-hidden="true">↓</span></button>'
 ).join('')+'</div></section>';
}
const stickyViewNames={yearbook:'Jahrbuch',replay:'Runden',moments:'Schlüsselmomente',records:'Rekordbuch',field:'Teilnehmerfeld',compare:'Jahresvergleich'};
function stickyTitleText(view,year,round){
 return (stickyViewNames[view]||'Jahrbuch')+' '+year+((view==='replay'||view==='moments')?' · Runde '+(round||1):'');
}
/* Regler and one independent title move together; slides contain only data. */
function stickyHistoryChrome(body,view,ed){
 const control=body.match(/^<div class="history-carousel-control[^"]*">[\s\S]*?<\/div>/);
 if(!control)return body;
 const title=stickyTitleText(view,ed.year,memory.round);
 return '<div class="history-sticky-group" aria-label="Karussellsteuerung und aktuelle Ansicht">'+control[0]+
  '<div class="history-sticky-title"><h3 id="history-sticky-heading">'+e(title)+'</h3></div></div>'+
  body.slice(control[0].length);
}
function updateStickyTitle(view,year,round){
 const h=document.getElementById('history-sticky-heading');
 if(!h)return;
 const next=stickyTitleText(view,year,round);
 if(h.textContent!==next)h.textContent=next;
}
function render(editions,year){requestAnimationFrame(()=>{syncHistorieStickyTop();initCarousel();initReplayCarousel();});const ed=editions.find(x=>x.year===Number(year))||editions.at(-1);if(!ed)return '';if(memory.year!==ed.year){memory.year=ed.year;memory.round=1;}if(!['yearbook','replay','moments','records','field','compare'].includes(memory.view))memory.view='yearbook';const content=memory.view==='replay'?replay(ed):memory.view==='moments'?scenes(ed):memory.view==='yearbook'?yearbook(ed,editions):window.BAERGSUNNE_HISTORY_EXT?.render(memory.view,ed,editions)||yearbook(ed,editions);return `<div class="history-chronicle" id="history-chronicle">${true?'':'<div class="history-chronicle-top"><span>BÄRGSUNNE POKER · ZEITREISE</span><h2>Die Turnierchronik</h2><p>Geschichte erleben statt Statistik wiederholen.</p></div>'}${historyEntry()}<div class="history-workspace-marker" id="history-workspace"></div><div class="history-dropdown-controls"><label for="history-year-select">Turnierjahr<select id="history-year-select" data-history-select="year" aria-label="Turnierjahr wählen">${[...editions].sort((a,b)=>b.year-a.year).map(x=>`<option value="${x.year}" ${x.year===ed.year?'selected':''}>${x.year}</option>`).join('')}</select></label></div>${stickyHistoryChrome(content,memory.view,ed)}${true?'':'<p class="history-note">Historische Quelle: '+e(ed.source||'Quellenbezeichnung nicht hinterlegt')+'. Die Darstellung unterscheidet offizielle Schlussresultate von rechnerisch rekonstruierten Zwischenständen.</p>'}</div>`;}
/* Sticky controls stay below the actual site header across iPhone layouts,
   including safe areas and rotations. Recalculation never adjusts scrollY. */
let historienHeaderObserved=null;
const historienHeaderObserver=typeof ResizeObserver==='function'?new ResizeObserver(()=>syncHistorieStickyTop()):null;
function syncHistorieStickyTop(){
 const header=document.querySelector('.heritage-header');
 if(!header)return;
 if(historienHeaderObserver&&historienHeaderObserved!==header){
  historienHeaderObserver.disconnect();
  historienHeaderObserver.observe(header);
  historienHeaderObserved=header;
 }
 document.documentElement.style.setProperty('--bp-history-sticky-top',
  Math.ceil(header.getBoundingClientRect().height+8)+'px');
}
window.addEventListener('resize',syncHistorieStickyTop,{passive:true});

window.POKER_HISTORY_CHRONICLE={render};
requestAnimationFrame(()=>{initCarousel();initReplayCarousel();});
let carouselBusy=false,drag=null,sliderDrag=null;
function carouselParts(){
 const viewport=document.querySelector('.history-carousel-viewport'),track=viewport?.querySelector('.history-carousel-track'),slides=track?[...track.children]:[];
 if(!viewport||!track||!slides.length)return null;
 const step=slides.length>1?slides[1].offsetLeft-slides[0].offsetLeft:slides[0].getBoundingClientRect().width;
 const center=(viewport.clientWidth-slides[0].offsetWidth)/2;
 return {viewport,track,slides,step,center,index:Number(track.dataset.index)};
}
function positionCarousel(fraction,animate=false){
 const c=carouselParts();if(!c)return;
 c.track.style.transition=animate?'transform 850ms cubic-bezier(.25,.46,.35,1)':'none';
 c.track.style.transform='translate3d('+(c.center-fraction*c.step)+'px,0,0)';
 c.slides.forEach((slide,i)=>{const active=Math.abs(i-fraction)<.55;slide.style.opacity=active?'1':String(Math.max(.42,1-Math.abs(i-fraction)*.2));slide.style.transform='scale('+Math.max(.97,1-Math.abs(i-fraction)*.025)+')';slide.setAttribute('aria-hidden',String(!active));});
 const shown=c.slides[Math.max(0,Math.min(c.slides.length-1,Math.round(fraction)))]?.querySelector('[data-year]')?.dataset.year;
 if(shown)updateStickyTitle(memory.view,shown,memory.round);
 syncHistoryStepButtons(c.index,c.slides.length);
}
/* Accessible single-card navigation uses the committed position only.
   No stepping beyond the first or last slide, and no wrapping. */
function syncHistoryStepButtons(index,total){
 const control=document.querySelector('#history-chronicle .history-sticky-group > .history-carousel-control');
 if(!control)return;
 for(const button of control.querySelectorAll('[data-history-step]')){
  const step=Number(button.dataset.historyStep);
  button.disabled=step<0?index<=0:index>=total-1;
 }
}
function commitCarouselYear(index,animate=true){
 const c=carouselParts();if(!c||carouselBusy)return;
 const target=Math.max(0,Math.min(c.slides.length-1,Math.round(index)));
 if(target===c.index){positionCarousel(c.index,true);return;}
 carouselBusy=true;
 positionCarousel(target,animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches);
 const change=()=>{const year=c.slides[target].querySelector('.history-yearbook-card')?.dataset.year,select=document.getElementById('history-year-select');if(year&&select){select.value=year;select.dispatchEvent(new Event('change',{bubbles:true}));}carouselBusy=false;};
 setTimeout(change,animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches?880:0);
}
function initCarousel(){positionCarousel(carouselParts()?.index||0);const slider=document.getElementById('history-year-slider');if(slider)sliderDrag=null;}
document.addEventListener('pointerdown',ev=>{
 const viewport=ev.target.closest('.history-carousel-viewport');if(!viewport||ev.target.closest('button,select,input')||carouselBusy)return;
 const c=carouselParts();if(!c)return;
 drag={id:ev.pointerId,x:ev.clientX,y:ev.clientY,index:c.index,step:c.step,axis:null};
 viewport.setPointerCapture(ev.pointerId);
});
document.addEventListener('pointermove',ev=>{
 if(!drag||drag.id!==ev.pointerId||carouselBusy)return;
 const dx=ev.clientX-drag.x,dy=ev.clientY-drag.y;
 if(!drag.axis&&Math.max(Math.abs(dx),Math.abs(dy))>8)drag.axis=Math.abs(dx)>Math.abs(dy)*1.2?'x':'y';
 if(drag.axis!=='x')return;
 ev.preventDefault();
 const c=carouselParts();if(!c)return;
 const fraction=Math.max(c.index-1,Math.min(c.index+1,drag.index-dx/c.step));
 positionCarousel(Math.max(0,Math.min(c.slides.length-1,fraction)));
});
function finishDrag(ev){
 if(!drag||drag.id!==ev.pointerId)return;
 const d=drag;drag=null;const c=carouselParts();if(!c)return;
 if(d.axis!=='x'){positionCarousel(c.index,true);return;}
 const dx=ev.clientX-d.x,ratio=dx/d.step;
 const delta=Math.abs(ratio)>=.5?(ratio<0?1:-1):0;
 commitCarouselYear(Math.max(0,Math.min(c.slides.length-1,d.index+delta)));
}
document.addEventListener('pointerup',finishDrag);document.addEventListener('pointercancel',ev=>{if(!drag||drag.id!==ev.pointerId)return;drag=null;const c=carouselParts();if(c)positionCarousel(c.index,true);});
document.addEventListener('input',ev=>{
 if(ev.target.id!=='history-year-slider')return;
 const value=Number(ev.target.value),c=carouselParts();if(!c)return;
 sliderDrag=value;positionCarousel(value);
});
document.addEventListener('change',ev=>{if(ev.target.id!=='history-year-slider')return;const value=sliderDrag===null?Number(ev.target.value):sliderDrag;sliderDrag=null;commitCarouselYear(value);});
// Replay carousel: live finger tracking, half-card snap and continuous round slider.
let replayBusy=false,replayDrag=null,replayTouch=null,replaySliderDrag=null,replaySliderParts=null,replayGeneration=0;
function replayParts(){
 const viewport=document.querySelector('.history-replay-viewport'),track=viewport?.querySelector('.history-replay-track'),slides=track?[...track.children]:[];
 if(!viewport||!track||!slides.length)return null;
 const step=slides.length>1?slides[1].offsetLeft-slides[0].offsetLeft:slides[0].offsetWidth;
 return {viewport,track,slides,step,center:(viewport.clientWidth-slides[0].offsetWidth)/2,index:Number(track.dataset.index)};
}
function positionReplay(fraction,animate=false,parts=null){
 const c=parts||replayParts();if(!c)return;
 const motion=animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
 // Exactly the same 850ms track animation and easing as the yearbook.
 c.track.style.transition=motion?'transform 850ms cubic-bezier(.25,.46,.35,1)':'none';
 c.track.style.transform='translate3d('+(c.center-fraction*c.step)+'px,0,0)';
 c.slides.forEach((slide,i)=>{
  const distance=Math.abs(i-fraction),active=distance<.55;
  const opacity=active?1:Math.max(.42,1-distance*.2),scale=Math.max(.97,1-distance*.025);
  slide.style.opacity=String(opacity);
  slide.style.transform='scale('+scale+')';
  const hidden=String(!active);
  if(slide.getAttribute('aria-hidden')!==hidden)slide.setAttribute('aria-hidden',hidden);
 });
 const shown=c.slides[Math.max(0,Math.min(c.slides.length-1,Math.round(fraction)))]?.querySelector('[data-round]')?.dataset.round;
 if(shown)updateStickyTitle(memory.view,memory.year,shown);
 syncHistoryStepButtons(c.index,c.slides.length);
}
function updateReplayReadout(value,parts=null){
 const c=parts||replayParts(),counter=document.getElementById('history-replay-count'),slider=document.getElementById('history-round-slider');if(!c)return;
 const i=Math.max(0,Math.min(c.slides.length-1,Math.round(value))),num=c.slides[i].querySelector('[data-round]')?.dataset.round||i+1;
 const label='Runde '+num+' von '+c.slides.length;
 if(counter&&counter.textContent!==label)counter.textContent=label;
 if(slider&&slider.getAttribute('aria-valuetext')!==label)slider.setAttribute('aria-valuetext',label);
}
function commitReplay(index){
 const c=replayParts();if(!c||replayBusy)return;
 const target=Math.max(0,Math.min(c.slides.length-1,Math.round(index)));
 // Same snap duration regardless of swipe strength; as on the yearbook.
 if(target===c.index){positionReplay(c.index,true);updateReplayReadout(c.index);return;}
 replayBusy=true;const generation=++replayGeneration;
 const motion=!matchMedia('(prefers-reduced-motion: reduce)').matches;
 // Commit the finger-held position as the transition's true starting point.
 // Otherwise fast pointer-up events can collapse the movement into an abrupt jump.
 if(motion)void c.track.getBoundingClientRect();
 positionReplay(target,motion);
 // Don't swap the displayed round label at finger-up: it follows after the card settles.
 const finish=()=>{
  if(generation!==replayGeneration)return;
  const now=replayParts();
  if(now?.track===c.track){
   now.track.dataset.index=String(target);
   memory.round=Number(now.slides[target].querySelector('[data-round]')?.dataset.round)||memory.round;
   const slider=document.getElementById('history-round-slider');
   if(slider)slider.value=String(target);
   positionReplay(target);
   updateReplayReadout(target);
  }
  replayBusy=false;
 };
 setTimeout(finish,motion?880:0);
}
function initReplayCarousel(){replayGeneration++;replayBusy=false;replayDrag=null;replayTouch=null;replaySliderDrag=null;replaySliderParts=null;const c=replayParts();if(c){positionReplay(c.index);updateReplayReadout(c.index);}}
document.addEventListener('pointerdown',ev=>{
 const viewport=ev.target.closest('.history-replay-viewport');if(ev.pointerType==='touch'||!viewport||ev.target.closest('button,select,input,summary,a')||replayBusy)return;
 const c=replayParts();if(!c)return;
 replayDrag={id:ev.pointerId,x:ev.clientX,y:ev.clientY,index:c.index,step:c.step,axis:null,parts:c};
 viewport.setPointerCapture(ev.pointerId);
});
document.addEventListener('pointermove',ev=>{
 if(!replayDrag||ev.pointerId!==replayDrag.id||replayBusy)return;
 const dx=ev.clientX-replayDrag.x,dy=ev.clientY-replayDrag.y;
 if(!replayDrag.axis&&Math.max(Math.abs(dx),Math.abs(dy))>8)replayDrag.axis=Math.abs(dx)>Math.abs(dy)*1.2?'x':'y';
 if(replayDrag.axis!=='x')return;
 ev.preventDefault();
 const c=replayDrag.parts;if(!c)return;
 const fraction=Math.max(0,Math.min(c.slides.length-1,Math.max(c.index-1,Math.min(c.index+1,replayDrag.index-dx/c.step))));
 positionReplay(fraction,false,c);
});
function endReplayDrag(ev){
 if(!replayDrag||replayDrag.id!==ev.pointerId)return;
 const d=replayDrag;replayDrag=null;const c=replayParts();if(!c)return;
 if(d.axis!=='x'){positionReplay(c.index,true);return;}
 const dx=ev.clientX-d.x,delta=Math.abs(dx/d.step)>=.5?(dx<0?1:-1):0;
 commitReplay(Math.max(0,Math.min(c.slides.length-1,d.index+delta)));
}
document.addEventListener('pointerup',endReplayDrag);
document.addEventListener('pointercancel',ev=>{if(!replayDrag||replayDrag.id!==ev.pointerId)return;replayDrag=null;const c=replayParts();if(c)positionReplay(c.index,true);});

// A lenient touch-only angle lock for iPhones. Touch events remain active if
// Safari cancels pointer events for a slightly diagonal gesture. Vertical swipes
// stay native; once horizontal intent is clear the page cannot steal the gesture.
document.addEventListener('touchstart',ev=>{
 const viewport=ev.target.closest('.history-replay-viewport');
 if(!viewport||ev.touches.length!==1||ev.target.closest('button,select,input,summary,a')||replayBusy){replayTouch=null;return;}
 const c=replayParts();if(!c)return;
 const p=ev.touches[0];
 replayTouch={id:p.identifier,x:p.clientX,y:p.clientY,index:c.index,step:c.step,parts:c,axis:null};
},{passive:true});
document.addEventListener('touchmove',ev=>{
 const d=replayTouch;if(!d||replayBusy)return;
 const p=[...ev.touches].find(x=>x.identifier===d.id);if(!p)return;
 const dx=p.clientX-d.x,dy=p.clientY-d.y;
 if(!d.axis&&Math.max(Math.abs(dx),Math.abs(dy))>=8){
  if(Math.abs(dx)>=Math.abs(dy)*.62)d.axis='x';
  else if(Math.abs(dy)>Math.abs(dx)*1.5)d.axis='y';
 }
 if(d.axis!=='x')return;
 if(ev.cancelable)ev.preventDefault();
 const c=d.parts;
 const fraction=Math.max(0,Math.min(c.slides.length-1,
  Math.max(c.index-1,Math.min(c.index+1,d.index-dx/d.step))));
 positionReplay(fraction,false,c);
},{passive:false});
document.addEventListener('touchend',ev=>{
 const d=replayTouch;if(!d)return;
 const p=[...ev.changedTouches].find(x=>x.identifier===d.id);if(!p)return;
 replayTouch=null;
 if(d.axis!=='x')return;
 const dx=p.clientX-d.x;
 const delta=Math.abs(dx/d.step)>=.5?(dx<0?1:-1):0;
 commitReplay(Math.max(0,Math.min(d.parts.slides.length-1,d.index+delta)));
},{passive:true});
document.addEventListener('touchcancel',ev=>{
 const d=replayTouch;if(!d)return;
 replayTouch=null;
 if(d.axis==='x')positionReplay(d.index,true);
},{passive:true});

document.addEventListener('input',ev=>{if(ev.target.id!=='history-round-slider'||replayBusy)return;const value=Number(ev.target.value);replaySliderParts=replaySliderParts||replayParts();replaySliderDrag=value;positionReplay(value,false,replaySliderParts);updateReplayReadout(value,replaySliderParts);});
document.addEventListener('change',ev=>{if(ev.target.id!=='history-round-slider')return;const value=replaySliderDrag===null?Number(ev.target.value):replaySliderDrag;replaySliderDrag=null;replaySliderParts=null;commitReplay(value);});
// Clicks reuse the same one-card snap and movement as a finger swipe.
document.addEventListener('click',ev=>{
 const button=ev.target.closest('#history-chronicle .history-step-button[data-history-step]');
 if(!button)return;
 ev.preventDefault();
 if(button.disabled)return;
 const step=Number(button.dataset.historyStep);
 if(step!==-1&&step!==1)return;
 const control=button.closest('.history-carousel-control');
 if(!control)return;
 if(control.querySelector('#history-round-slider')){
  if(replayBusy)return;
  const c=replayParts();
  if(c)commitReplay(c.index+step);
 }else if(control.querySelector('#history-year-slider')){
  if(carouselBusy)return;
  const c=carouselParts();
  if(c)commitCarouselYear(c.index+step);
 }
});
// The original round result is one shared display preference for every round.
// A native summary click is intercepted so all cards expand/collapse together,
// including those outside the visible viewport. Keep it through round switches
// and chronicle re-renders until the user explicitly closes it.
document.addEventListener('click',ev=>{
 const summary=ev.target.closest('.history-feature--replay .history-replay-proof > summary');
 if(!summary)return;
 ev.preventDefault();
 memory.originalResultsOpen=!memory.originalResultsOpen;
 document.querySelectorAll('.history-feature--replay .history-replay-proof').forEach(detail=>{
  detail.open=memory.originalResultsOpen;
 });
},true);
document.addEventListener('change',ev=>{const select=ev.target.closest('[data-history-select]');if(!select)return;if(select.dataset.historySelect==='year'){const button=document.createElement('button');button.dataset.action='historyyear';button.dataset.value=select.value;button.style.display='none';select.after(button);button.click();requestAnimationFrame(()=>{initCarousel();initReplayCarousel();});return;}if(select.dataset.historySelect!=='round')return;memory.round=Number(select.value);const node=document.getElementById('history-chronicle');if(node&&window.POKER_SEED)node.outerHTML=render(window.POKER_SEED.editions,memory.year);requestAnimationFrame(()=>{initCarousel();initReplayCarousel();});});
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-his]');if(!b)return;ev.preventDefault();const action=b.dataset.his,fromEntry=action==='entry';if(action==='view'||fromEntry)memory.view=b.dataset.view;if(action==='round')memory.round=Number(b.dataset.number);if(action==='prev')memory.round=Math.max(1,memory.round-1);if(action==='next')memory.round+=1;if(action==='scene'){memory.round=Number(b.dataset.number);memory.view='replay'}const node=document.getElementById('history-chronicle');if(node&&window.POKER_SEED){const oldY=memory.year;node.outerHTML=render(window.POKER_SEED.editions,oldY);requestAnimationFrame(()=>{initCarousel();initReplayCarousel();if(fromEntry){const target=document.getElementById('history-workspace');if(target){const header=document.querySelector('.heritage-header')||document.querySelector('header');const offset=(header?.getBoundingClientRect().height||0)+12;const top=Math.max(0,window.scrollY+target.getBoundingClientRect().top-offset);window.scrollTo({top,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}}})}},true);
})();
