/* Bärgsunne Poker – shared column selection for Stats, individual Profiles and Hall of Fame.
   Presentation-only: original data, sorting logic and calculations are retained.
   Preferences use independent scopes for each player's profile tables. */
(()=>{
 'use strict';
 const STORE='baergsunne-stats-columns-v1';
 const info=new WeakMap();
 const openPanels=new Set();
 let preferences={};
 try{const value=JSON.parse(localStorage.getItem(STORE)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))preferences=value;}catch(_){}
 const clean=s=>String(s||'').replace(/[↑↓↕]/g,'').replace(/\s+/g,' ').trim();
 const colKey=(text,index)=>index+':'+clean(text);
 // Only the visible heading is abbreviated. Filter labels, sorting keys and
 // locally saved column preferences retain the original, complete name.
 const shortHeadings=new Map(Object.entries({
   'Ø Platzierung im Verhältnis zur Anzahl Spieler':'Ø Platz. %',
   'Grösster Rückstand des späteren Champions':'Max. Rückst.',
   'Ø Rundenrang':'Ø Rd.-Rang',
   'Führungswechsel':'Führungsw.',
   'Originalpunkte':'Orig.-Pkt.',
   'Neue Punkte':'Neue Pkt.',
   'Jahrespodien':'J.-Podien',
   'Jahresrang':'J.-Rang',
   'Rundensiege':'Rd.-Siege',
   'Spieler-Runden':'Sp.-Rd.',
   'Spielerfeld':'Feld',
   'Platzierung (%)':'Platz. %',
   'Anzahl Spieler':'Spieler',
   'Finalabstand':'Final-Abst.',
   'Jahrgänge':'Jahre'
 }));
 function tightenHeadings(headers,labels){
   headers.forEach((cell,i)=>{
     const full=labels[i],short=shortHeadings.get(full);
     if(!short||short===full)return;
     const button=cell.querySelector('.bp-smart-sort');
     const target=button||cell;
     const literal=[...target.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());
     if(!literal)return; // Do not destroy nested controls or sorting logic.
     literal.textContent=short;
     cell.title=full;
     if(button){
       button.title=full;
       button.setAttribute('aria-label',full+' sortieren');
     }else{
       cell.setAttribute('aria-label',full);
     }
   });
 }
 function persist(){try{localStorage.setItem(STORE,JSON.stringify(preferences));}catch(_){}}
 function scopeId(table,labels){
   const panel=table.closest('.card,.hof-record,.bp-sim-panel,.lab-panel,.pattern-evidence');
   const title=clean(panel?.querySelector('h3,h4,.hof-record-top span')?.textContent||table.getAttribute('aria-label')||table.className||'Tabelle');
   const siblings=panel?[...panel.querySelectorAll('table')]:[table];
   const index=Math.max(0,siblings.indexOf(table));
   const profilePage=table.closest('.page--profile');
   if(profilePage){
     const player=clean(profilePage.querySelector('.profile-stagebar strong')?.textContent||'');
     // Separate settings by player AND table; never share these with Stats.
     return 'profile:'+player+':'+title+':'+index+(title==='Tabelle'?':'+clean(labels[0]||''):'');
   }
   if(table.closest('.page--fame'))return 'fame:'+title+':'+index+(title==='Tabelle'?':'+clean(labels[0]||''):'');
   const currentTool=document.querySelector('#app .page--stats .tool-tile.is-active');
   const tool=currentTool?.dataset.value||'overview';
   // Column labels are intentionally not part of the ID: selection survives changes in year.
   return 'stats:'+tool+':'+title+':'+index+(title==='Tabelle'?':'+clean(labels[0]||''):'');
 }
 function toggleVisibility(meta){
   const {table,labels,selected}=meta;
   for(const row of table.tHead?.rows||[]){
     if(row.cells.length!==labels.length)continue;
     [...row.cells].forEach((cell,i)=>{
       if(i!==0&&!selected.has(colKey(labels[i],i)))cell.setAttribute('data-bp-column-hidden','');
       else cell.removeAttribute('data-bp-column-hidden');
     });
   }
   for(const section of [...table.tBodies,...(table.tFoot?[table.tFoot]:[])]){
     for(const row of section.rows){
       if(row.cells.length!==labels.length)continue; // Colspan messages must remain readable.
       [...row.cells].forEach((cell,i)=>{
         if(i!==0&&!selected.has(colKey(labels[i],i)))cell.setAttribute('data-bp-column-hidden','');
         else cell.removeAttribute('data-bp-column-hidden');
       });
     }
   }
   const cg=table.querySelector('colgroup');
   if(cg&&cg.children.length===labels.length)[...cg.children].forEach((cell,i)=>{
     if(i!==0&&!selected.has(colKey(labels[i],i)))cell.setAttribute('data-bp-column-hidden','');
     else cell.removeAttribute('data-bp-column-hidden');
   });
 }
 function makePicker(meta){
   const {labels,id,selected}=meta;
   const details=document.createElement('details');
   details.className='bp-stat-columns';
   details.open=openPanels.has(id);
   const summary=document.createElement('summary');
   summary.className='bp-stat-columns-summary';
   const label=document.createElement('span');
   label.textContent='Spalten auswählen';
   const count=document.createElement('small');
   summary.append(label,count);
   details.append(summary);
   const choices=document.createElement('div');
   choices.className='bp-stat-column-choices';
   details.append(choices);
   const update=()=>{
     const enabled=labels.filter((l,i)=>i===0||selected.has(colKey(l,i))).length;
     count.textContent=enabled+' von '+labels.length+' sichtbar';
   };
   labels.forEach((text,i)=>{
     const key=colKey(text,i);
     const choice=document.createElement('button');
     choice.type='button';
     choice.className='bp-stat-column-choice';
     choice.setAttribute('aria-label',clean(text)+(i===0?' bleibt immer sichtbar':' anzeigen oder ausblenden'));
     const mark=document.createElement('span');
     mark.className='bp-stat-choice-mark';
     const name=document.createElement('span');
     name.textContent=clean(text);
     choice.append(mark,name);
     if(i===0){choice.disabled=true;choice.title='Erste Spalte bleibt beim Scrollen sichtbar';}
     const paint=()=>{
       const on=i===0||selected.has(key);
       choice.classList.toggle('is-selected',on);
       choice.setAttribute('aria-pressed',String(on));
       mark.textContent=i===0?'●':on?'✓':'+';
     };
     paint();
     choice.addEventListener('click',()=>{
       if(i===0)return;
       if(selected.has(key))selected.delete(key);else selected.add(key);
       preferences[id]=[...selected];
       persist();
       toggleVisibility(meta);
       paint();update();
     });
     choices.append(choice);
   });
   const hint=document.createElement('p');
   hint.className='bp-stat-columns-hint';
   hint.textContent='Die erste Spalte bleibt fixiert. Zum Sortieren auf einen Spaltenkopf tippen. Deine Auswahl bleibt auf diesem Gerät gespeichert.';
   details.append(hint);
   update();
   details.addEventListener('toggle',()=>{if(details.open)openPanels.add(id);else openPanels.delete(id);});
   return details;
 }
 function enhance(table){
   if(table.dataset.bpStatPersonalized==='1'||!table.tHead||!table.tBodies.length)return;
   const head=table.tHead;
   if(head.rows.length!==1)return;
   const headers=[...head.rows[0].cells];
   if(headers.length<2||headers.some(h=>h.colSpan!==1||h.rowSpan!==1))return;
   const labels=headers.map(h=>clean(h.textContent));
   if(labels.some(x=>!x))return;
   const id=scopeId(table,labels);
   const selected=new Set(Array.isArray(preferences[id])?preferences[id]:labels.map(colKey));
   selected.add(colKey(labels[0],0));
   const meta={table,id,labels,selected,toolbar:null};
   let wrapper=table.parentElement;
   if(!wrapper||!wrapper.matches('.table-scroll,.bp-smart-scroll,.lab-heat-scroll,.pattern-scroll,.bp-unified-shell,.bp-stat-scroll,.hof-scroll')){
     const wrap=document.createElement('div');
     wrap.className='bp-stat-scroll';
     table.parentNode.insertBefore(wrap,table);
     wrap.append(table);
     wrapper=wrap;
   }
   wrapper.classList.add('bp-stat-scroll');
   // App-generated tables contain the old sort toolbar immediately before the scroll shell.
   const before=wrapper.previousElementSibling;
   if(before?.classList.contains('bp-unified-toolbar'))meta.toolbar=before;
   const picker=makePicker(meta);
   wrapper.parentNode.insertBefore(picker,meta.toolbar||wrapper);
   table.classList.add('bp-stat-personalized-table');
   if(/Spieler|Name|Champion/i.test(labels[0]))table.classList.add('bp-stat-first-is-name');
   table.dataset.bpStatPersonalized='1';
   info.set(table,meta);
   toggleVisibility(meta);
   // Hide the old duplicated sort button rail only after the new control exists.
   if(meta.toolbar)meta.toolbar.classList.add('bp-stat-hidden-sort');
   // Show the app's actual sort state in the visible headers.
   if(meta.toolbar){
     const active=meta.toolbar.querySelector('.bp-unified-sort .is-active');
     const activeLabel=clean(active?.textContent||'');
     const ascending=active?.textContent?.includes('↓')?'descending':'ascending';
     headers.forEach(h=>{
       const selectedHead=activeLabel&&clean(h.textContent)===activeLabel;
       h.setAttribute('aria-sort',selectedHead?ascending:'none');
       const symbol=h.querySelector('.bp-smart-sort span');
       if(symbol)symbol.textContent=selectedHead?(ascending==='ascending'?' ↑':' ↓'):' ↕';
     });
   }
   // Preserve stable preference keys while using shorter visual column titles.
   tightenHeadings(headers,labels);
 }
 let pending=false;
 function scan(){
   pending=false;
   document.querySelectorAll('#app :is(.page--stats,.page--profile,.page--fame) table').forEach(enhance);
 }
 function schedule(){
   if(pending)return;pending=true;
   requestAnimationFrame(scan);
 }
 // Keep native app sorting state and pagination when a column header is clicked.
 // Other (plugin) tables continue using smart-tables.js's built-in header sorting.
 document.addEventListener('click',event=>{
   const button=event.target.closest('#app :is(.page--stats,.page--profile,.page--fame) table.bp-stat-personalized-table thead .bp-smart-sort');
   if(!button)return;
   const table=button.closest('table');
   const meta=info.get(table);
   if(!meta?.toolbar)return;
   const headCell=button.closest('th');
   const index=[...table.tHead.rows[0].cells].indexOf(headCell);
   const label=meta.labels[index];
   const sortButton=[...meta.toolbar.querySelectorAll('[data-action="sort"]')].find(b=>clean(b.textContent)===label);
   if(!sortButton)return;
   event.preventDefault();event.stopImmediatePropagation();
   sortButton.click();
 },true);
 function init(){
   scan();
   new MutationObserver(schedule).observe(document.getElementById('app')||document.body,{subtree:true,childList:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
