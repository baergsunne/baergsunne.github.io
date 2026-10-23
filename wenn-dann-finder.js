/* Bärgsunne Poker – Wenn–Dann-Finder. Pure read-only archive calculations. */
(function () {
'use strict';
const KEY='baergsunne-wenn-dann-v1';
const SAVED='baergsunne-wenn-dann-collection-v1';
const E=[['win','Rundensieg'],['top2','Top 2'],['top3','Top 3'],['upper','Obere Hälfte'],['bottom','Untere Hälfte'],['last','Letzter Platz'],['last2','Letzte 2'],['last3','Letzte 3'],['pointsGe','Mindestens X Punkte'],['pointsLe','Höchstens X Punkte'],['placeLe','Platz X oder besser'],['placeGe','Platz X oder schlechter']];
const OUT=E.concat([['improve','Mindestens X Plätze besser'],['decline','Mindestens X Plätze schlechter'],['gainPoints','Mindestens X Punkte mehr'],['losePoints','Mindestens X Punkte weniger']]);
const PRESETS=[
 {label:'Nach einem Sieg · Top 3',a:'win',b:'top3',distance:1},
 {label:'Nach einem letzten Platz · Top 3',a:'last',b:'top3',distance:1},
 {label:'Zwei Siege hintereinander',a:'win',b:'win',distance:1},
 {label:'Comeback nach unterer Hälfte',a:'bottom',b:'improve',distance:1}
];
const validEvents=new Set(OUT.map(x=>x[0]));
const defaults=()=>({a:'win',b:'top3',distance:1,amountA:5,amountB:5,delta:3,years:[],players:[],rounds:[]});
const copy=v=>JSON.parse(JSON.stringify(v));
const cleanList=v=>Array.isArray(v)?v.filter(x=>typeof x==='string'||Number.isInteger(x)): [];
function normalize(v) {
 const base=defaults();if(!v||typeof v!=='object')return base;
 for(const k of ['a','b'])if(validEvents.has(v[k])&&(k==='b'||E.some(x=>x[0]===v[k])))base[k]=v[k];
 for(const k of ['distance','amountA','amountB','delta'])if(Number.isFinite(Number(v[k])))base[k]=Math.min(1000,Math.max(k==='distance'||k==='delta'?1:0,Math.round(Number(v[k]))));
 base.distance=Math.min(3,base.distance);
 for(const k of ['years','players','rounds'])base[k]=cleanList(v[k]).slice(0,100);
 return base;
}
let state=defaults();
try{state=normalize(JSON.parse(localStorage.getItem(KEY)||'null'))}catch(_){}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('de-CH',{maximumFractionDigits:1});
const uniq=list=>[...new Set(list)];
const allowed=(sel,val)=>!sel.length||(!sel.includes('__none__')&&sel.includes(val));
const label=(id,list)=>list.find(x=>x[0]===id)?.[1]||id;
const selectOptions=(entries,chosen)=>entries.map(x=>'<option value="'+esc(x[0])+'"'+(x[0]===chosen?' selected':'')+'>'+esc(x[1])+'</option>').join('');
function passes(row,event,amount,round) {
 if(!row||!round)return false;
 const place=Number(row.place),points=Number(row.points),n=round.results.length;
 const last=Math.max(...round.results.map(x=>Number(x.place)));
 switch(event){
 case 'win':return place===1;
 case 'top2':return place<=Math.min(2,n);
 case 'top3':return place<=Math.min(3,n);
 case 'upper':return place<=Math.ceil(n/2);
 case 'bottom':return place>Math.ceil(n/2);
 case 'last':return place===last;
 case 'last2':return place>=Math.max(1,n-1);
 case 'last3':return place>=Math.max(1,n-2);
 case 'pointsGe':return points>=amount;
 case 'pointsLe':return points<=amount;
 case 'placeLe':return place<=amount;
 case 'placeGe':return place>=amount;
 default:return false;
 }
}
function followPass(before,after,beforeRound,afterRound,cfg){
 if(['improve','decline','gainPoints','losePoints'].includes(cfg.b)){
  if(cfg.b==='improve')return before.place-after.place>=cfg.delta;
  if(cfg.b==='decline')return after.place-before.place>=cfg.delta;
  if(cfg.b==='gainPoints')return after.points-before.points>=cfg.delta;
  return before.points-after.points>=cfg.delta;
 }
 return passes(after,cfg.b,cfg.amountB,afterRound);
}
function calculate(db,choice){
 const c=normalize(choice),cases=[],ignored=[];
 if(!db?.editions)return {cases,ignored,success:0,total:0,percent:null};
 for(const edition of db.editions){
  if(!allowed(c.years,edition.year))continue;
  const rounds=[...edition.rounds].sort((x,y)=>x.number-y.number);
  for(const player of edition.players){
   if(!allowed(c.players,player))continue;
   for(let i=0;i<rounds.length;i++){
    const first=rounds[i];
    if(!allowed(c.rounds,first.number))continue;
    const a=first.results.find(x=>x.player_id===player);
    if(!passes(a,c.a,c.amountA,first))continue;
    const later=rounds[i+c.distance];
    if(!later){ignored.push({year:edition.year,player,from:first.number,reason:'Keine Folgerunde'});continue}
    const b=later.results.find(x=>x.player_id===player);
    if(!b){ignored.push({year:edition.year,player,from:first.number,reason:'Spieler fehlt in der Folgerunde'});continue}
    cases.push({year:edition.year,player,from:first.number,to:later.number,placeA:a.place,placeB:b.place,pointsA:a.points,pointsB:b.points,success:followPass(a,b,first,later,c)});
   }
  }
 }
 cases.sort((a,b)=>b.year-a.year||a.from-b.from||a.player.localeCompare(b.player,'de'));
 const success=cases.filter(x=>x.success).length;
 return {cases,ignored,success,total:cases.length,percent:cases.length?Math.round(success/cases.length*1000)/10:null};
}
function store(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(_){}}
function loadSaved(){try{const p=JSON.parse(localStorage.getItem(SAVED)||'[]');return Array.isArray(p)?p.slice(0,10).map(normalize):[]}catch(_){return []}}
function saveChoice(){const entries=loadSaved();entries.unshift(copy(state));try{localStorage.setItem(SAVED,JSON.stringify(entries.slice(0,10)))}catch(_){}}
function phrase(id,amount,delta) {
 switch(id){
 case 'pointsGe':return 'mindestens '+fmt(amount)+' Punkte erreicht werden';
 case 'pointsLe':return 'höchstens '+fmt(amount)+' Punkte erreicht werden';
 case 'placeLe':return 'Platz '+fmt(amount)+' oder besser erreicht wird';
 case 'placeGe':return 'Platz '+fmt(amount)+' oder schlechter erreicht wird';
 case 'improve':return 'eine Verbesserung um mindestens '+fmt(delta)+' Plätze gelingt';
 case 'decline':return 'eine Verschlechterung um mindestens '+fmt(delta)+' Plätze eintritt';
 case 'gainPoints':return 'mindestens '+fmt(delta)+' Punkte mehr erzielt werden';
 case 'losePoints':return 'mindestens '+fmt(delta)+' Punkte weniger erzielt werden';
 case 'win':return 'ein Rundensieg gelingt';
 case 'top2':return 'eine Top-2-Platzierung erreicht wird';
 case 'top3':return 'eine Top-3-Platzierung erreicht wird';
 case 'upper':return 'eine Platzierung in der oberen Hälfte gelingt';
 case 'bottom':return 'eine Platzierung in der unteren Hälfte eintritt';
 case 'last':return 'der letzte Platz belegt wird';
 case 'last2':return 'einer der letzten zwei Plätze belegt wird';
 case 'last3':return 'einer der letzten drei Plätze belegt wird';
 default:return label(id,OUT)+' eintritt';
 }
}
function explain(result,c){
 const when=phrase(c.a,c.amountA,c.delta),then=phrase(c.b,c.amountB,c.delta);
 const scope=c.players.includes('__none__')?'keinen Spieler':!c.players.length?'alle Spieler':c.players.length+' ausgewählte Spieler';
 const interval=c.distance===1?'direkt nächsten Runde':c.distance+'. darauffolgenden Runde';
 const intro='Wir schauen für '+scope+' nach, wie oft '+when+', und prüfen danach, ob in der '+interval+' '+then+'.';
 if(!result.total)return '<p><strong>Was schauen wir uns an?</strong> '+esc(intro)+'</p><p><strong>Was zeigen die Ergebnisse?</strong> Für diese Auswahl gibt es keine auswertbaren Rundenpaare. Passe Spieler, Jahre, Runden oder Ereignisse an.</p><p class="wd-caution">'+(result.ignored.length?'Es gab '+result.ignored.length+' passende Ausgangsereignisse ohne dokumentierte Folgerunde.':'Ohne Treffer kann kein Prozentwert berechnet werden.')+'</p>';
 const sample=result.cases.find(x=>x.success)||result.cases[0];
 const evidence=sample?sample.year+': '+sample.player+' lag in Runde '+sample.from+' auf Platz '+sample.placeA+' ('+fmt(sample.pointsA)+' Punkte) und in Runde '+sample.to+' auf Platz '+sample.placeB+' ('+fmt(sample.pointsB)+' Punkte).':'';
 const claim='Von '+result.total+' vergleichbaren Fällen erfüllten '+result.success+' die Dann-Bedingung ('+fmt(result.percent)+' %).';
 return '<p><strong>Was schauen wir uns an?</strong> '+esc(intro)+'</p><p><strong>Was zeigen die Ergebnisse?</strong> '+esc(claim)+'</p><p><strong>Ein Beispiel aus dem Archiv:</strong> '+esc(evidence)+'</p><p class="wd-caution">'+esc(result.ignored.length+' Ausgangsereignisse ohne Folgerunde werden nicht als Misserfolg gezählt. Historische Häufigkeiten sind keine sicheren Vorhersagen.')+'</p>';
}
function details(cases,title,success){
 const selected=cases.filter(x=>x.success===success);
 return '<details class="wd-evidence"><summary>'+esc(title)+' · '+selected.length+'</summary><div class="wd-scroll"><table><thead><tr><th>Jahr</th><th>Spieler</th><th>Von</th><th>Nach</th><th>Platz vorher</th><th>Platz danach</th><th>Punkte vorher</th><th>Punkte danach</th></tr></thead><tbody>'+selected.map(x=>'<tr><td>'+x.year+'</td><td>'+esc(x.player)+'</td><td>R'+x.from+'</td><td>R'+x.to+'</td><td>'+x.placeA+'</td><td>'+x.placeB+'</td><td>'+fmt(x.pointsA)+'</td><td>'+fmt(x.pointsB)+'</td></tr>').join('')+'</tbody></table></div></details>';
}
function currentYears(db){return db.editions.map(e=>e.year).sort((a,b)=>b-a)}
function listPicker(key,title,items){
 const current=state[key],none=current.includes('__none__');
 const status=none?'Keine':!current.length?'Alle':current.length+' ausgewählt';
 return '<details class="wd-filter" data-wd-filter="'+key+'"><summary>'+esc(title)+' <span>'+status+'</span></summary><div class="wd-filter-quick"><button type="button" data-wd-all="'+key+'">Alle</button><button type="button" data-wd-none="'+key+'">Keine</button></div><div class="wd-filter-options">'+items.map(x=>'<label><input type="checkbox" data-wd-set="'+key+'" value="'+esc(x)+'" '+(!none&&(!current.length||current.includes(x))?'checked':'')+'><span>'+esc(x)+'</span></label>').join('')+'</div></details>';
}
function valueOptions(kind){
 const id=kind==='a'?state.a:state.b;
 if(['pointsGe','pointsLe','placeLe','placeGe'].includes(id)){
 const key=kind==='a'?'amountA':'amountB';
 return '<label class="wd-amount">Schwellenwert <input type="number" inputmode="numeric" min="0" max="1000" data-wd-number="'+key+'" value="'+state[key]+'"></label>';
 }
 if(['improve','decline','gainPoints','losePoints'].includes(id))return '<label class="wd-amount">Mindestunterschied <input type="number" inputmode="numeric" min="1" max="1000" data-wd-number="delta" value="'+state.delta+'"></label>';
 return '';
}
function render(db) {
 const c=normalize(state),r=calculate(db,c);
 const yrs=currentYears(db);
 const allPlayers=uniq(db.editions.filter(e=>allowed(c.years,e.year)).flatMap(e=>e.players)).sort((x,y)=>x.localeCompare(y,'de'));
 const maxRounds=Math.max(1,...db.editions.filter(e=>allowed(c.years,e.year)).map(e=>e.rounds.length));
 const rounds=Array.from({length:maxRounds},(_,i)=>i+1);
 const allSaved=loadSaved();
 const question='Wenn '+phrase(c.a,c.amountA,c.delta)+', wie oft '+(c.distance===1?'in der direkt nächsten Runde':'nach '+c.distance+' Runden')+' '+phrase(c.b,c.amountB,c.delta)+'?';
 const top3=r.total?fmt(r.percent)+' %':'–';
 const noun='Treffer';
 return '<section class="wd-finder" id="wenn-dann-finder" aria-label="Wenn-Dann-Finder">'+
 '<div class="wd-question"><span>DEINE FRAGE</span><p>'+esc(question)+'</p></div>'+
 '<div class="wd-presets"><span>Beispiele:</span>'+PRESETS.map((p,i)=>'<button type="button" data-wd-preset="'+i+'">'+esc(p.label)+'</button>').join('')+'</div>'+
 '<div class="wd-builder"><div class="wd-condition"><div class="wd-step">WENN …</div><label>Ausgangsereignis<select data-wd-event="a">'+selectOptions(E,c.a)+'</select></label>'+valueOptions('a')+'</div>'+
 '<div class="wd-arrow" aria-hidden="true">↓</div>'+
 '<div class="wd-condition"><div class="wd-step">DANN …</div><label>Gesuchtes Ergebnis<select data-wd-event="b">'+selectOptions(OUT,c.b)+'</select></label>'+valueOptions('b')+'</div>'+
 '<label class="wd-distance">Wann soll es passieren?<select data-wd-distance="1">'+[1,2,3].map(n=>'<option value="'+n+'"'+(c.distance===n?' selected':'')+'>'+(n===1?'Direkt nächste Runde':n+' Runden später')+'</option>').join('')+'</select></label>'+
 '<details class="wd-filters"><summary>Spieler, Jahre und Ausgangsrunden eingrenzen</summary><div class="wd-filter-grid">'+listPicker('years','Turnierjahre',yrs)+listPicker('players','Spieler',allPlayers)+listPicker('rounds','Ausgangsrunden',rounds)+'</div><p>Die Rundenauswahl bezieht sich nur auf den Ausgangspunkt. Die Folge wird immer im selben Turnier gesucht.</p></details>'+
 '<div class="wd-toolbar"><button type="button" data-wd-save="1">Frage speichern</button><button type="button" data-wd-reset="1">Zurücksetzen</button></div>'+
 (allSaved.length?'<details class="wd-saved"><summary>Gespeicherte Fragen ('+allSaved.length+')</summary>'+allSaved.map((p,i)=>'<button type="button" data-wd-load="'+i+'">'+esc(label(p.a,E)+' → '+label(p.b,OUT)+' · '+p.distance+' Runde(n)')+'</button>').join('')+'</details>':'')+
 '</div><section class="wd-result" aria-live="polite"><div class="wd-result-top"><div><span>ERGEBNIS · ORIGINALARCHIV</span><strong>'+top3+'</strong></div><div><strong>'+r.success+' / '+r.total+'</strong><span>'+noun+' / vergleichbare Fälle</span></div></div><div class="wd-meter"><i style="width:'+(r.percent??0)+'%"></i></div>'+
 '<div class="wd-explainer">'+explain(r,c)+'</div>'+
 '<div class="wd-proof">'+details(r.cases,'Erfolgreiche Fälle',true)+details(r.cases,'Gegenbeispiele',false)+
 (r.ignored.length?'<details class="wd-evidence"><summary>Ohne Folgerunde · '+r.ignored.length+'</summary><p>Diese Ausgangsereignisse zählen nicht zur Trefferquote: '+r.ignored.map(x=>esc(x.year+' · '+x.player+' · R'+x.from)).join(', ')+'</p></details>':'')+'</div></section></section>';
}
function refresh(){
 const old=document.getElementById('wenn-dann-finder');if(!old||!window.POKER_SEED)return;
 const before=old.getBoundingClientRect().top,scroll=window.scrollY;
 const opened=[...old.querySelectorAll('details[open]')].map(x=>x.className+'|'+(x.dataset.wdFilter||''));
 old.outerHTML=render(window.POKER_SEED);
 const next=document.getElementById('wenn-dann-finder');
 next.querySelectorAll('details').forEach(x=>{if(opened.includes(x.className+'|'+(x.dataset.wdFilter||'')))x.open=true});
 window.scrollTo(0,Math.max(0,scroll+next.getBoundingClientRect().top-before));
 store();
}
function updateFilter(k,val,checked){
 const db=window.POKER_SEED;const yrs=currentYears(db);
 const items=k==='years'?yrs:k==='players'?uniq(db.editions.filter(e=>allowed(state.years,e.year)).flatMap(e=>e.players)):Array.from({length:Math.max(1,...db.editions.filter(e=>allowed(state.years,e.year)).map(e=>e.rounds.length))},(_,i)=>i+1);
 const current=state[k].includes('__none__')?[]:state[k].length?state[k]:items;
 const next=checked?uniq([...current,val]):current.filter(x=>x!==val);
 state[k]=next.length?next:['__none__'];
 if(next.length===items.length)state[k]=[];
}
document.addEventListener('change',event=>{
 const root=event.target.closest('#wenn-dann-finder');if(!root)return;
 const el=event.target;
 if(el.dataset.wdEvent){state[el.dataset.wdEvent]=el.value}
 else if(el.dataset.wdDistance){state.distance=Number(el.value)}
 else if(el.dataset.wdNumber){state[el.dataset.wdNumber]=Math.min(1000,Math.max(el.dataset.wdNumber==='delta'?1:0,Number(el.value)||0))}
 else if(el.dataset.wdSet){const k=el.dataset.wdSet;updateFilter(k,k==='players'?el.value:Number(el.value),el.checked)}
 else return;
 refresh();
},true);
document.addEventListener('click',event=>{
 const el=event.target.closest('[data-wd-all],[data-wd-none],[data-wd-preset],[data-wd-save],[data-wd-load],[data-wd-reset]');
 if(!el||!document.getElementById('wenn-dann-finder')?.contains(el))return;
 event.preventDefault();
 if(el.dataset.wdAll){state[el.dataset.wdAll]=[];}
 else if(el.dataset.wdNone){state[el.dataset.wdNone]=['__none__'];}
 else if(el.dataset.wdPreset!==undefined){const p=PRESETS[Number(el.dataset.wdPreset)];state={...state,a:p.a,b:p.b,distance:p.distance};}
 else if(el.dataset.wdSave){saveChoice();}
 else if(el.dataset.wdLoad!==undefined){state=normalize(loadSaved()[Number(el.dataset.wdLoad)]);}
 else if(el.dataset.wdReset){state=defaults();}
 refresh();
},true);
window.BAERGSUNNE_WENNDANN_FINDER=render;
window.BAERGSUNNE_WENNDANN_CALCULATE=calculate;
window.BAERGSUNNE_WENNDANN_DEFAULTS=defaults;
})();
