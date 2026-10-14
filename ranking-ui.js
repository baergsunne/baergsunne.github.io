/* Bärgsunne Poker: shared, progressively enhanced results presentation. */
(()=>{'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const clean=s=>String(s||'').replace(/[↑↓↕⬆⬇]/g,'').trim();
 const eligible=t=>!t.closest('.bp-rank-detail') && t.querySelector('thead') && t.querySelector('tbody') && t.querySelectorAll('tbody tr').length>0;
 function enhance(t){if(t.dataset.bpEnhanced||!eligible(t))return;const wrap=t.closest('.table-scroll')||t; if(wrap.dataset.bpRanking)return;
 const headings=[...t.querySelectorAll('thead th')].map(th=>clean(th.textContent));const trs=[...t.querySelectorAll('tbody tr')];if(!headings.length||trs.length>250)return;
 const rows=trs.map(tr=>[...tr.children].map(td=>td.textContent.trim()));if(rows.some(r=>r.length!==headings.length))return;
 const cols=headings.map(x=>x.toLowerCase());const person=cols.findIndex(x=>/spieler|champion|name|duellant/.test(x));const label=person>=0?person:0;
 const primary=cols.findIndex((x,i)=>i!==label&&/punkte|pkt|titel|schnitt|ø|%|rang|siege/.test(x));const main=primary>=0?primary:Math.min(headings.length-1,label===0?1:0);
 const hasRanking=cols.some(x=>/platz|rang|spieler|punkte|titel|schnitt|siege|abschnitt|runde|jahr/.test(x));if(!hasRanking)return;
 const wrapParent=wrap.parentElement;if(!wrapParent)return;
 const list=document.createElement('div');list.className='bp-smart-ranking';list.setAttribute('aria-label','Moderne Ergebnisansicht');
 const top=document.createElement('div');top.className='bp-rank-toolbar';top.innerHTML='<span>Ergebnisse</span><span class="bp-rank-count">'+rows.length+' Einträge</span>';list.append(top);
 rows.forEach((row,i)=>{const b=document.createElement('details');b.className='bp-rank-entry';if(i===0)b.classList.add('bp-rank-first');
 const details=row.map((v,k)=>k===label||k===main?'':`<div><span>${esc(headings[k])}</span><strong>${esc(v||'–')}</strong></div>`).join('');
 const lead=person>=0 || /platz|rang/.test(cols[0])?`<span class="bp-rank-position">${esc((cols[0]||'').match(/platz|rang/)?row[0]:String(i+1))}</span>`:'';
 b.innerHTML=`<summary>${lead}<span class="bp-rank-name">${esc(row[label]||'–')}</span><span class="bp-rank-number"><strong>${esc(row[main]||'–')}</strong><small>${esc(headings[main]||'Wert')}</small></span><span class="bp-rank-chevron">⌄</span></summary><div class="bp-rank-more">${details||'<p>Weitere Werte sind in der Tabellenansicht verfügbar.</p>'}</div>`;
 list.append(b);});
 const detail=document.createElement('details');detail.className='bp-rank-detail';detail.innerHTML='<summary>Vollständige Tabelle und Sortierung anzeigen</summary>';
 wrapParent.insertBefore(list,wrap);wrapParent.insertBefore(detail,wrap);detail.appendChild(wrap);t.dataset.bpEnhanced='1';wrap.dataset.bpRanking='1';
 }
 let pending=false;function scan(){pending=false;document.querySelectorAll('table').forEach(enhance)}function schedule(){if(pending)return;pending=true;requestAnimationFrame(scan)};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{scan();new MutationObserver(schedule).observe(document.getElementById('app')||document.body,{childList:true,subtree:true})});else{scan();new MutationObserver(schedule).observe(document.getElementById('app')||document.body,{childList:true,subtree:true})}
})();
