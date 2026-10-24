/* Bärgsunne Poker – dynamic, locally calculated player form. */
(function(){
 'use strict';
 const selected=Object.create(null);
 const fmt=(n,d=1)=>Number(n).toLocaleString('de-CH',{minimumFractionDigits:d,maximumFractionDigits:d});
 const html=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const rel=x=>x.field>1?(x.field-x.place)/(x.field-1)*100:null;
 const mean=a=>a.length?a.reduce((s,n)=>s+n,0)/a.length:null;
 function calculate(rounds,requested){
   const count=Math.max(1,Math.min(rounds.length,Math.round(Number(requested)||10)));
   const tail=rounds.slice(-count),relative=tail.map(rel).filter(Number.isFinite);
   const trend=relative.length<2?null:(()=>{
     const avgX=(relative.length-1)/2,avgY=mean(relative);
     const top=relative.reduce((sum,y,i)=>sum+(i-avgX)*(y-avgY),0);
     const bottom=relative.reduce((sum,_,i)=>sum+(i-avgX)**2,0);
     return bottom?top/bottom:null;
   })();
   return {count,tail,relative,played:tail.length,wins:tail.filter(x=>x.place===1).length,
     top3:tail.filter(x=>x.place<=3).length,zeros:tail.filter(x=>Number(x.points)===0).length,
     avgPlace:mean(tail.map(x=>x.place)),avgPoints:mean(tail.map(x=>Number(x.points))),
     avgField:mean(relative),trend};
 }
 function chart(tail){
   const valid=tail.map((r,i)=>({r,i,value:rel(r)})).filter(x=>Number.isFinite(x.value));
   if(!valid.length)return '<p class="hint">Keine auswertbaren Platzierungen vorhanden.</p>';
   const x=i=>18+(tail.length===1?0:i*604/(tail.length-1));
   const y=v=>180-v*1.55;
   const points=valid.map(v=>x(v.i).toFixed(1)+','+y(v.value).toFixed(1)).join(' ');
   const circles=valid.map(v=>'<circle cx="'+x(v.i).toFixed(1)+'" cy="'+y(v.value).toFixed(1)+'" r="5" fill="#e8c37e" stroke="#0e3023" stroke-width="2"><title>'+html(v.r.year+' · Runde '+v.r.round+': Platz '+v.r.place+' von '+v.r.field+' · '+v.r.points+' Punkte')+'</title></circle>').join('');
   const first=tail[0],last=tail[tail.length-1];
   return '<div class="bp-form-chart"><svg viewBox="0 0 640 205" preserveAspectRatio="none" role="img" aria-label="Relative Platzierung in den letzten '+tail.length+' gespielten Runden. Höher bedeutet besser."><line x1="18" x2="622" y1="102.5" y2="102.5" stroke="currentColor" opacity=".28" stroke-dasharray="5 7"/><line x1="18" x2="622" y1="180" y2="180" stroke="currentColor" opacity=".12"/><line x1="18" x2="622" y1="25" y2="25" stroke="currentColor" opacity=".12"/>'+(valid.length>1?'<polyline points="'+points+'" fill="none" stroke="#e8c37e" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>':'')+circles+'</svg><div class="bp-form-chart-labels"><span>'+html(first.year+' · R'+first.round)+'</span><span>Höher = besser</span><span>'+html(last.year+' · R'+last.round)+'</span></div></div>';
 }
 function render(player,rounds){
   const all=Array.isArray(rounds)?rounds:[],max=all.length;
   if(!max)return '<p class="hint">Noch keine gespielten Runden vorhanden.</p>';
   const requested=selected[player]||10,stats=calculate(all,requested);
   const trend=stats.trend===null?'–':Math.abs(stats.trend)<0.5?'→ Stabil':stats.trend>0?'↗ Positiv':'↘ Negativ';
   const trendDescription=stats.trend===null?'Für einen Trend braucht es mindestens zwei Runden.':Math.abs(stats.trend)<0.5?'Die relative Platzierung ist im gewählten Abschnitt insgesamt stabil.':(stats.trend>0?'Die Platzierungen verbessern sich im gewählten Abschnitt tendenziell.':'Die Platzierungen verschlechtern sich im gewählten Abschnitt tendenziell.');
   const tiles=[
     ['Runden',''+stats.played],
     ['Rundensiege',''+stats.wins],
     ['Top 3',''+stats.top3],
     ['Nuller',''+stats.zeros],
     ['Ø Platz',fmt(stats.avgPlace)],
     ['Ø Punkte',fmt(stats.avgPoints)],
     ['Ø Position im Feld',stats.avgField===null?'–':fmt(stats.avgField)+' %'],
     ['Trend',trend]
   ];
   const preset=n=>'<button type="button" class="bp-form-preset'+(stats.count===n?' is-active':'')+'" data-form-window="'+n+'" aria-pressed="'+(stats.count===n)+'">Letzte '+n+'</button>';
   return '<div class="bp-form-dynamic" data-form-profile="'+html(player)+'">'+
     '<div class="bp-form-controls"><span class="bp-form-controls-title">Letzte Runden anzeigen</span><div class="bp-form-preset-row">'+[3,5,10].map(preset).join('')+'</div>'+
     '<label class="bp-form-custom-label">Eigene Anzahl <input type="number" inputmode="numeric" min="1" max="'+max+'" step="1" value="'+stats.count+'" data-form-custom aria-label="Anzahl der letzten gespielten Runden"/></label><span class="bp-form-available">'+max+' gespielte Runden verfügbar</span></div>'+
     '<div class="bp-form-grid">'+tiles.map(([label,value],i)=>'<div class="bp-form-tile'+(i===7?' bp-form-tile--trend':'')+'"><small>'+html(label)+'</small><strong>'+html(value)+'</strong></div>').join('')+'</div>'+
     '<p class="bp-form-summary">Auswertung der letzten <strong>'+stats.played+'</strong> gespielten '+(stats.played===1?'Runde':'Runden')+'. '+trendDescription+'</p>'+
     chart(stats.tail)+
     '<p class="hint">Rundensiege = Platz 1; Top 3 = Plätze 1–3; Nuller = Runden mit 0 Punkten. Die Position im Feld berücksichtigt die jeweilige Spieleranzahl (100 % = Platz 1, 0 % = letzter Platz). Der Trend zeigt die Richtung der relativen Platzierungen über die gewählten Runden, nicht eine Prognose. Alle acht Kennzahlen und das Diagramm verwenden dieselbe Auswahl.</p></div>';
 }
 function update(el,n){
   const root=el.closest('[data-form-profile]');if(!root)return;
   const player=root.getAttribute('data-form-profile'),max=Number(root.querySelector('[data-form-custom]')?.max)||1;
   if(!Number.isFinite(Number(n)))return;
   selected[player]=Math.max(1,Math.min(max,Math.round(Number(n))));
   const y=window.scrollY;
   if(typeof draw==='function')draw();
   window.scrollTo(0,y);
 }
 document.addEventListener('click',event=>{
   const b=event.target.closest('[data-form-window]');if(!b)return;
   event.preventDefault();event.stopPropagation();update(b,Number(b.dataset.formWindow));
 },true);
 document.addEventListener('change',event=>{
   const input=event.target.closest('[data-form-custom]');if(!input)return;
   event.stopPropagation();update(input,input.value);
 },true);
 window.BAERGSUNNE_PROFILE_FORM={render,calculate};
})();