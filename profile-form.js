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
 function forecast(rounds,requested){
   const a=Array.isArray(rounds)?rounds:[],count=Math.max(1,Math.min(a.length,Math.round(Number(requested)||10)));
   const tail=a.slice(-count),history=a.map(rel).filter(Number.isFinite);
   const field=Math.round(Number(a.at(-1)?.field));
   if(!history.length||!Number.isFinite(field)||field<2)return null;
   const recent=tail.map(rel).filter(Number.isFinite);
   const career=mean(history),weighted=recent.reduce((sum,value,i)=>sum+value*(i+1),0)/(recent.length*(recent.length+1)/2);
   const n=recent.length,avgX=(n-1)/2,avgY=mean(recent);
   const slope=n>1?recent.reduce((sum,value,i)=>sum+(i-avgX)*(value-avgY),0)/recent.reduce((sum,_,i)=>sum+(i-avgX)**2,0):0;
   // Lokal gelerntes lineares Formmodell mit Karrieremittel als Stabilisierung.
   // Eine einzelne Ausreisserrunde darf die Prognose nicht dominieren.
   const confidence=n/(n+5),trend=Math.max(-10,Math.min(10,slope));
   const expected=Math.max(0,Math.min(100,career*(1-confidence)+weighted*confidence+trend*Math.min(.8,confidence)));
   const place=Math.max(1,Math.min(field,Math.round(field-(field-1)*expected/100)));
   return {place,field,relative:expected,used:n,lowData:n<5,method:'gewichtete jüngste Platzierungen, linearer Trend und Karriereschnitt'};
 }
 function chart(tail){
   const valid=tail.map((r,i)=>({r,i,value:rel(r)})).filter(x=>Number.isFinite(x.value));
   if(!valid.length)return '<p class="hint">Keine auswertbaren Platzierungen vorhanden.</p>';
   const x=i=>38+(tail.length===1?194:i*389/(tail.length-1));
   const y=v=>200-v*1.7;
   const grid=[0,25,50,75,100].map(v=>'<line x1="38" y1="'+y(v)+'" x2="427" y2="'+y(v)+'" stroke="#5a715e" opacity=".55" stroke-dasharray="4 6"/><text x="30" y="'+(y(v)+4)+'" fill="#b8cbbd" text-anchor="end" font-size="13">'+v+' %</text>').join('');
   const axis='<path d="M38 30V200H427" stroke="#829989" fill="none" opacity=".65"/>';
   const ticks=tail.map((r,i)=>'<text x="'+x(i).toFixed(1)+'" y="219" fill="#cbd8c8" font-size="12" text-anchor="middle">R'+html(r.round)+'</text>').join('');
   const years=tail.map((r,i)=>i===0||r.year!==tail[i-1].year?'<text x="'+x(i).toFixed(1)+'" y="239" fill="#e8c37e" font-size="13" text-anchor="'+(i===0?'start':'middle')+'">'+html(r.year)+'</text>':'').join('');
   const points=valid.map(v=>x(v.i).toFixed(1)+','+y(v.value).toFixed(1)).join(' ');
   const circles=valid.map(v=>'<circle data-bp-point data-bp-x="'+x(v.i).toFixed(1)+'" data-bp-label="'+html(v.r.year+' · R'+v.r.round)+'" data-bp-series="Platzierung" data-bp-value="'+html('Platz '+v.r.place+' von '+v.r.field+' · '+Math.round(v.value)+' % · '+v.r.points+' Pkt.')+'" cx="'+x(v.i).toFixed(1)+'" cy="'+y(v.value).toFixed(1)+'" r="6" fill="#e8c37e" stroke="#0e3023" stroke-width="2"><title>'+html(v.r.year+' · Runde '+v.r.round+': Platz '+v.r.place+' von '+v.r.field+' · '+v.r.points+' Punkte')+'</title></circle>').join('');
   return '<div class="bp-form-chart"><svg data-bp-chart="rounds" tabindex="0" viewBox="0 0 440 250" role="img" aria-label="Formkurve mit Runden auf der X-Achse und relativer Platzierung in Prozent auf der Y-Achse. Höher bedeutet besser. Mit dem Finger oder den Pfeiltasten Werte anzeigen.">'+grid+axis+ticks+years+(valid.length>1?'<polyline points="'+points+'" fill="none" stroke="#e8c37e" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>':'')+circles+'</svg><div class="bp-form-chart-labels"><span>Runden / Turnierjahr</span><span>Platzierung · höher = besser</span></div></div>';
 }
 function render(player,rounds){
   const all=Array.isArray(rounds)?rounds:[],max=all.length;
   if(!max)return '<p class="hint">Noch keine gespielten Runden vorhanden.</p>';
   const requested=selected[player]||10,stats=calculate(all,requested);
   const trend=stats.trend===null?'–':Math.abs(stats.trend)<0.5?'→ Stabil':stats.trend>0?'↗ Positiv':'↘ Negativ';
   const next=forecast(all,stats.count);
   const trendDescription=stats.trend===null?'Für einen Trend braucht es mindestens zwei Runden.':Math.abs(stats.trend)<0.5?'Die relative Platzierung ist im gewählten Abschnitt insgesamt stabil.':(stats.trend>0?'Die Platzierungen verbessern sich im gewählten Abschnitt tendenziell.':'Die Platzierungen verschlechtern sich im gewählten Abschnitt tendenziell.');
   const tiles=[
     ['Runden',''+stats.played],
     ['Rundensiege',''+stats.wins],
     ['Top 3',''+stats.top3],
     ['Nuller',''+stats.zeros],
     ['Ø Platz',fmt(stats.avgPlace)],
     ['Ø Punkte',fmt(stats.avgPoints)],
     ['Ø Position im Feld',stats.avgField===null?'–':fmt(stats.avgField)+' %'],
     ['Trend',trend],
     ['Prognose nächste Runde',next?'Platz '+next.place:'–']
   ];
   const preset=n=>'<button type="button" class="bp-form-preset'+(stats.count===n?' is-active':'')+'" data-form-window="'+n+'" aria-pressed="'+(stats.count===n)+'">Letzte '+n+'</button>';
   return '<div class="bp-form-dynamic" data-form-profile="'+html(player)+'">'+
     '<div class="bp-form-controls"><span class="bp-form-controls-title">Letzte Runden anzeigen</span><div class="bp-form-preset-row">'+[3,5,10].map(preset).join('')+'</div>'+
     '<label class="bp-form-custom-label">Eigene Anzahl <input type="number" inputmode="numeric" min="1" max="'+max+'" step="1" value="'+stats.count+'" data-form-custom aria-label="Anzahl der letzten gespielten Runden"/></label><span class="bp-form-available">'+max+' gespielte Runden verfügbar</span></div>'+
     '<div class="bp-form-grid">'+tiles.map(([label,value],i)=>'<div class="bp-form-tile'+(i===7?' bp-form-tile--trend':i===8?' bp-form-tile--forecast':'')+'"><small>'+html(label)+'</small><strong>'+html(value)+'</strong></div>').join('')+'</div>'+
     '<p class="bp-form-summary">Auswertung der letzten <strong>'+stats.played+'</strong> gespielten '+(stats.played===1?'Runde':'Runden')+'. '+trendDescription+'</p>'+
     '<p class="bp-form-forecast-note">'+(next?'Modellprognose für die nächste Runde: <strong>Platz '+next.place+' von '+next.field+'</strong>, falls wieder '+next.field+' Personen mitspielen. '+(next.lowData?'Wenige Vergleichsrunden: besonders unsicher. ':'')+'Die Vorhersage wird lokal aus dem jüngsten Formverlauf, dem Trend und den bisherigen Karriereergebnissen berechnet. Sie ist keine sichere Aussage über das nächste Resultat.':'Für eine Prognose fehlen vergleichbare Runden und eine bekannte Spieleranzahl.')+'</p>'+
     chart(stats.tail)+
     '<p class="hint">Rundensiege = Platz 1; Top 3 = Plätze 1–3; Nuller = Runden mit 0 Punkten. Die Position im Feld berücksichtigt die jeweilige Spieleranzahl (100 % = Platz 1, 0 % = letzter Platz). Der Trend zeigt die Richtung der relativen Platzierungen über die gewählten Runden. Die Prognose ist eine datenbasierte Schätzung, keine Gewissheit und keine Abfrage eines externen KI-Dienstes. Alle neun Kennzahlen und das Diagramm reagieren auf dieselbe Auswahl.</p></div>';
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
 window.BAERGSUNNE_PROFILE_FORM={render,calculate,forecast};
})();