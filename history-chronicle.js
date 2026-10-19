/* Bärgsunne Poker 2.2.5: independent historical chronicle, read-only */
(function(){'use strict';
const memory={year:null,round:0,view:'yearbook',perspective:'all',person:''};
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&quot;'}[c]));
const fmt=n=>Number(n).toLocaleString('de-CH',{maximumFractionDigits:2});
function reconstruct(ed,round){const scores=new Map(ed.players.map(p=>[p,{player:p,points:0,wins:0,results:[]}]));for(const r of ed.rounds.filter(r=>r.number<=round))for(const x of r.results){const o=scores.get(x.player_id);if(!o)continue;o.points+=x.points;o.wins+=x.place===1?1:0;o.results.push(x)}return [...scores.values()].sort((a,b)=>b.points-a.points||b.wins-a.wins||a.player.localeCompare(b.player,'de'));}
function moments(ed){const out=[];let last=null;for(const r of ed.rounds){const ranks=reconstruct(ed,r.number);const leaders=ranks.filter(x=>x.points===ranks[0]?.points).map(x=>x.player);if(last&&leaders.join('|')!==last.join('|'))out.push({round:r.number,title:'Führungswechsel / Gleichstand an der Spitze',desc:`Nach Runde ${r.number}: ${leaders.join(', ')} ${leaders.length>1?'liegen punktgleich vorne':'liegt vorne'}.`});last=leaders;const winner=r.results.filter(x=>x.place===1).map(x=>x.player_id);if(winner.length)out.push({round:r.number,title:`Runde ${r.number}: Rundensieg`,desc:`${winner.join(', ')} ${winner.length>1?'belegen':'belegt'} den ersten Rundenplatz.`})}const official=ed.official_standings.filter(x=>x.place===1).map(x=>x.player_id);out.push({round:ed.round_count,title:'Offizielles Finale',desc:`Offizieller Schlussrang 1: ${official.join(', ')||'nicht dokumentiert'}. Die Schlussrangliste bleibt die verbindliche Quelle.`});return out;}
function table(ed,round){const final=round===ed.round_count;const ranks=reconstruct(ed,round);const official=new Map(ed.official_standings.map(x=>[x.player_id,x]));return `<div class="history-table-shell"><table class="history-table"><thead><tr><th scope="col" title="Zwischenrang (rekonstruiert)">Rang*</th><th scope="col">Spieler</th><th scope="col" title="Punkte bis Runde ${round}">Pkt.</th><th scope="col" title="Rundensiege">Siege</th>${final?'<th scope="col" title="Offizieller Schlussrang">Final</th>':''}</tr></thead><tbody>${ranks.map((x,i)=>`<tr><td>${i+1}</td><td>${e(x.player)}</td><td>${fmt(x.points)}</td><td>${x.wins}</td>${final?`<td>${official.get(x.player)?.place??'–'}</td>`:''}</tr>`).join('')}</tbody></table></div><p class="history-note">*Zwischenränge rekonstruiert: sortiert nach Punkten, bei Gleichstand nach Rundensiegen und dann alphabetisch – keine offiziell belegte historische Zwischenrangregel. Die offiziellen Schlussränge sind separat ausgewiesen.</p>`;}
function replay(ed){
 const rounds=[...ed.rounds].sort((a,b)=>a.number-b.number);
 const selected=Math.min(rounds.length-1,Math.max(0,rounds.findIndex(x=>x.number===(memory.round||1))));
 const card=(round,i)=>`<article class="history-replay-card" data-round="${round.number}"><div class="history-replay-card-head"><span>TURNIER ${ed.year} · RUNDENCHRONIK</span><h4>Runde ${round.number}</h4><p>Stand nach Runde ${round.number}</p></div>${table(ed,round.number)}<details class="history-proof history-replay-proof"><summary>Originalergebnis dieser Runde</summary><div class="history-table-shell"><table class="history-table"><thead><tr><th>Rang</th><th>Spieler</th><th>Punkte</th></tr></thead><tbody>${[...round.results].sort((a,b)=>a.place-b.place).map(x=>`<tr><td>${x.place}</td><td>${e(x.player_id)}</td><td>${fmt(x.points)}</td></tr>`).join('')}</tbody></table></div></details></article>`;
 return `<section class="history-feature history-feature--replay"><div class="history-replay-head"><span>HISTORY REPLAY · ${ed.year}</span><h3>Runde für Runde</h3><p>Wische durch die Runden oder ziehe den Regler.</p></div><div class="history-replay-viewport"><div class="history-replay-track" data-index="${selected}">${rounds.map((r,i)=>`<div class="history-replay-slide" data-index="${i}" aria-hidden="${i!==selected}">${card(r,i)}</div>`).join('')}</div></div><div class="history-replay-control"><div class="history-replay-control-head"><label for="history-round-slider">Runde auswählen</label><strong id="history-replay-count" aria-live="polite">Runde ${rounds[selected].number} von ${ed.round_count}</strong></div><input type="range" id="history-round-slider" min="0" max="${rounds.length-1}" step="0.01" value="${selected}" aria-label="Runde im Replay auswählen" aria-valuetext="Runde ${rounds[selected].number} von ${ed.round_count}"/></div></section>`;
}
function yearbook(ed,editions){
 const years=[...editions].sort((a,b)=>a.year-b.year),index=years.findIndex(x=>x.year===ed.year);
 const panel=x=>{const standing=x.official_standings;const name=n=>standing.filter(z=>z.place===n).map(z=>z.player_id).join(', ')||'Nicht dokumentiert';return `<div class="history-yearbook-card" data-year="${x.year}"><div class="history-yearbook-head"><span class="history-yearbook-eyebrow">BÄRGSUNNE · DIE CHRONIK</span><h3>Jahrbuch <span>${x.year}</span></h3><div class="history-yearbook-cup" aria-hidden="true">🏆</div><span class="history-yearbook-divider" aria-hidden="true"></span></div><div class="history-podium history-podium--champion"><small>Champion</small><strong>${e(name(1))}</strong></div><div class="history-podium-pairs"><div class="history-podium history-podium--second"><small>Platz 2</small><strong>${e(name(2))}</strong></div><div class="history-podium history-podium--third"><small>Platz 3</small><strong>${e(name(3))}</strong></div></div><div class="history-shortcuts history-shortcuts--yearbook"><button type="button" data-his="view" data-view="replay">Turnier anschauen</button><button type="button" data-his="view" data-view="moments"><span>Schlüsselmomente</span><span>entdecken</span></button></div></div>`;};
 return `<section class="history-feature history-feature--yearbook"><div class="history-carousel-viewport"><div class="history-carousel-track" data-index="${index}">${years.map((x,i)=>'<div class="history-carousel-slide" data-index="'+i+'" '+(i!==index?'inert aria-hidden="true"':'')+'>'+panel(x)+'</div>').join('')}</div></div></section><div class="history-carousel-control"><span>‹ Älter</span><input id="history-year-slider" type="range" min="0" max="${years.length-1}" value="${index}" step="0.01" aria-label="Jahrbuch wechseln"/><span>Neuer ›</span></div><p class="history-carousel-hint">Karte mit dem Finger verschieben oder den Regler ziehen. Beim Wischen wechselt jeweils ein Jahrbuch.</p>`;
}
function scenes(ed){return `<section class="history-feature"><div class="history-panel-header"><span>DIE CHRONIK</span><h3>Belegte Turniermomente</h3><p>Diese Ereignisse werden aus den tatsächlich gespeicherten Platzierungen und Punkten rekonstruiert, nicht frei erfunden.</p></div><div class="history-scene-list">${moments(ed).map((m,i)=>`<button type="button" data-his="scene" data-number="${m.round}"><span>R${m.round}</span><strong>${e(m.title)}</strong><small>${e(m.desc)}</small><b>Runde öffnen ↗</b></button>`).join('')}</div></section>`;}
function archive(ed){return `<section class="history-feature"><div class="history-panel-header"><span>QUELLEN & RESULTATE</span><h3>Originalarchiv ${ed.year}</h3><p>Die gespeicherten historischen Resultate bleiben unverändert. Fehlende Dokumente werden nicht ergänzt.</p></div><p><b>Erfasste Quelle:</b> ${e(ed.source||'Keine Quellenbezeichnung hinterlegt')}</p><p><b>Dokumentationsstatus:</b> ${e(ed.status||'nicht angegeben')}</p><h4>Offizielle Schlussrangliste</h4><div class="history-table-shell"><table class="history-table"><thead><tr><th>Offizieller Rang</th><th>Spieler</th><th>Offizielle Punkte</th></tr></thead><tbody>${[...ed.official_standings].sort((a,b)=>a.place-b.place).map(x=>`<tr><td>${x.place}</td><td>${e(x.player_id)}</td><td>${fmt(x.points)}</td></tr>`).join('')}</tbody></table></div><h4>Originale Rundenresultate</h4>${ed.rounds.map(r=>`<details class="history-proof"><summary>Runde ${r.number}</summary><div class="history-table-shell"><table class="history-table"><thead><tr><th>Rang</th><th>Spieler</th><th>Punkte</th></tr></thead><tbody>${[...r.results].sort((a,b)=>a.place-b.place).map(x=>`<tr><td>${x.place}</td><td>${e(x.player_id)}</td><td>${fmt(x.points)}</td></tr>`).join('')}</tbody></table></div></details>`).join('')}</section>`;}
function render(editions,year){requestAnimationFrame(()=>{initCarousel();initReplayCarousel();});const ed=editions.find(x=>x.year===Number(year))||editions.at(-1);if(!ed)return '';if(memory.year!==ed.year){memory.year=ed.year;memory.round=1;memory.view='yearbook'}const tabs=[['yearbook','Jahrbuch'],['replay','Replay'],['moments','Schlüsselmomente'],['archive','Originalarchiv']];return `<div class="history-chronicle" id="history-chronicle">${(memory.view==='yearbook'||memory.view==='replay')?'':'<div class="history-chronicle-top"><span>BÄRGSUNNE POKER · ZEITREISE</span><h2>Die Turnierchronik</h2><p>Geschichte erleben statt Statistik wiederholen.</p></div>'}<div class="history-dropdown-controls"><label for="history-year-select">Turnierjahr<select id="history-year-select" data-history-select="year" aria-label="Turnierjahr wählen">${[...editions].sort((a,b)=>b.year-a.year).map(x=>`<option value="${x.year}" ${x.year===ed.year?'selected':''}>${x.year}</option>`).join('')}</select></label><label for="history-view-select">Ansicht<select id="history-view-select" data-history-select="view" aria-label="Historische Ansicht wählen">${tabs.map(([id,name])=>`<option value="${id}" ${id===memory.view?'selected':''}>${name}</option>`).join('')}</select></label></div>${memory.view==='replay'?replay(ed):memory.view==='moments'?scenes(ed):memory.view==='archive'?archive(ed):yearbook(ed,editions)}${memory.view==='yearbook'?'':'<p class="history-note">Historische Quelle: '+e(ed.source||'Quellenbezeichnung nicht hinterlegt')+'. Die Darstellung unterscheidet offizielle Schlussresultate von rechnerisch rekonstruierten Zwischenständen.</p>'}</div>`;}
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
let replayBusy=false,replayDrag=null,replaySliderDrag=null,replaySliderParts=null,replayGeneration=0;
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
function initReplayCarousel(){replayGeneration++;replayBusy=false;replayDrag=null;replaySliderDrag=null;replaySliderParts=null;const c=replayParts();if(c){positionReplay(c.index);updateReplayReadout(c.index);}}
document.addEventListener('pointerdown',ev=>{
 const viewport=ev.target.closest('.history-replay-viewport');if(!viewport||ev.target.closest('button,select,input,summary,a')||replayBusy)return;
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
document.addEventListener('input',ev=>{if(ev.target.id!=='history-round-slider'||replayBusy)return;const value=Number(ev.target.value);replaySliderParts=replaySliderParts||replayParts();replaySliderDrag=value;positionReplay(value,false,replaySliderParts);updateReplayReadout(value,replaySliderParts);});
document.addEventListener('change',ev=>{if(ev.target.id!=='history-round-slider')return;const value=replaySliderDrag===null?Number(ev.target.value):replaySliderDrag;replaySliderDrag=null;replaySliderParts=null;commitReplay(value);});
document.addEventListener('change',ev=>{const select=ev.target.closest('[data-history-select]');if(!select)return;if(select.dataset.historySelect==='year'){const button=document.createElement('button');button.dataset.action='historyyear';button.dataset.value=select.value;button.style.display='none';select.after(button);button.click();requestAnimationFrame(()=>{initCarousel();initReplayCarousel();});return;}if(select.dataset.historySelect==='round'){memory.round=Number(select.value);}else{memory.view=select.value;}const node=document.getElementById('history-chronicle');if(node&&window.POKER_SEED)node.outerHTML=render(window.POKER_SEED.editions,memory.year);requestAnimationFrame(()=>{initCarousel();initReplayCarousel();});});
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-his]');if(!b)return;ev.preventDefault();const action=b.dataset.his;if(action==='view')memory.view=b.dataset.view;if(action==='round')memory.round=Number(b.dataset.number);if(action==='prev')memory.round=Math.max(1,memory.round-1);if(action==='next')memory.round+=1;if(action==='scene'){memory.round=Number(b.dataset.number);memory.view='replay'}const node=document.getElementById('history-chronicle');if(node&&window.POKER_SEED){const oldY=memory.year;node.outerHTML=render(window.POKER_SEED.editions,oldY);requestAnimationFrame(()=>{initCarousel();initReplayCarousel();})}},true);
})();
