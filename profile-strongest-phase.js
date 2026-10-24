/* Strongest contiguous career phase, calculated from recorded rounds only. */
(function(){
 'use strict';
 const selected=Object.create(null);
 const format=(v,d=1)=>Number(v).toLocaleString('de-CH',{minimumFractionDigits:d,maximumFractionDigits:d});
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const relative=r=>r.field>1?(r.field-r.place)/(r.field-1)*100:0;
 function calculate(rounds,requested){
  const a=[...rounds].sort((x,y)=>x.year-y.year||x.round-y.round);
  if(!a.length)return null;
  const n=Math.max(1,Math.min(a.length,Math.round(Number(requested)||10)));
  let best=null;
  for(let i=0;i<=a.length-n;i++){
   const slice=a.slice(i,i+n);
   const avg=slice.reduce((sum,r)=>sum+relative(r),0)/n;
   if(!best||avg>best.relative+1e-9){
    const totalPoints=slice.reduce((sum,r)=>sum+Number(r.points),0);
    best={n,relative:avg,start:slice[0],end:slice[n-1],
      wins:slice.filter(r=>Number(r.place)===1).length,
      top3:slice.filter(r=>Number(r.place)<=3).length,
      totalPoints,averagePoints:totalPoints/n,rounds:slice};
   }
  }
  return best;
 }
 function render(player,rounds){
  const a=Array.isArray(rounds)?rounds:[],max=a.length;
  if(!max)return '<p class="hint">Noch keine gespielten Runden vorhanden.</p>';
  const result=calculate(a,selected[player]||10),n=result.n;
  const preset=k=>'<button type="button" class="bp-form-preset'+(n===k?' is-active':'')+'" data-phase-window="'+k+'" aria-pressed="'+(n===k)+'">Beste '+k+'</button>';
  const metrics=[
   ['Bestes Fenster',n+' Runden'],
   ['Von',result.start.year+' · R'+result.start.round],
   ['Bis',result.end.year+' · R'+result.end.round],
   ['Rundensiege',result.wins],
   ['Punkte insgesamt',format(result.totalPoints,Number.isInteger(result.totalPoints)?0:1)],
   ['Ø Punkte pro Runde',format(result.averagePoints)],
   ['Top-3-Platzierungen',result.top3],
   ['Ø Position im Feld',format(result.relative)+' %']
  ];
  return '<div class="bp-phase-dynamic" data-phase-profile="'+esc(player)+'">'+
   '<div class="bp-form-controls"><span class="bp-form-controls-title">Beste Karrierephase auswählen</span>'+
   '<div class="bp-form-preset-row">'+[3,5,10].map(preset).join('')+'</div>'+
   '<label class="bp-form-custom-label">Eigene Rundenzahl <input type="number" inputmode="numeric" min="1" max="'+max+'" step="1" value="'+n+'" data-phase-custom aria-label="Anzahl Runden für die beste Karrierephase"></label>'+
   '<span class="bp-form-available">'+max+' gespielte Runden verfügbar</span></div>'+
   '<div class="bp-phase-grid">'+metrics.map(([label,value])=>'<div class="bp-phase-tile"><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong></div>').join('')+'</div>'+
   '<p class="bp-phase-summary">Die stärkste zusammenhängende Phase aus <strong>'+n+'</strong> eigenen gespielten '+(n===1?'Runde':'Runden')+' lag zwischen <strong>'+esc(result.start.year+' · Runde '+result.start.round)+'</strong> und <strong>'+esc(result.end.year+' · Runde '+result.end.round)+'</strong>. In dieser Phase erreichte '+esc(player)+' '+result.wins+' '+(result.wins===1?'Rundensieg':'Rundensiege')+', '+result.top3+' Top-3-Platzierungen und insgesamt '+format(result.totalPoints,Number.isInteger(result.totalPoints)?0:1)+' Punkte.</p>'+
   '<p class="hint">Für jede mögliche Folge von '+n+' eigenen gespielten Runden wird die durchschnittliche relative Platzierung berechnet. Das Fenster mit dem höchsten Wert gewinnt. 100 % = immer Platz 1; 0 % = immer letzter Platz. Die Runden können über mehrere Turnierjahre reichen. Bei exakt gleichem Ergebnis zählt die frühere Phase. Die Punkte und Siege stammen ausschliesslich aus den tatsächlich gespeicherten Runden; die Kennzahlen ändern sich gemeinsam mit der Auswahl.</p></div>';
 }
 function update(el,value){
  const root=el.closest('[data-phase-profile]');if(!root)return;
  const player=root.dataset.phaseProfile,max=Number(root.querySelector('[data-phase-custom]')?.max)||1;
  const number=Number(value);if(!Number.isFinite(number))return;
  selected[player]=Math.max(1,Math.min(max,Math.round(number)));
  const y=window.scrollY; if(typeof draw==='function')draw();window.scrollTo(0,y);
 }
 document.addEventListener('click',ev=>{
  const el=ev.target.closest('[data-phase-window]');if(!el)return;
  ev.preventDefault();ev.stopPropagation();update(el,el.dataset.phaseWindow);
 },true);
 document.addEventListener('change',ev=>{
  const el=ev.target.closest('[data-phase-custom]');if(!el)return;
  ev.stopPropagation();update(el,el.value);
 },true);
 window.BAERGSUNNE_PROFILE_PHASE={render,calculate};
})();