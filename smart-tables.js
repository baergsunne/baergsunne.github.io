/* Bärgsunne Poker 2.2.0: one-line, sortable, keyboard-accessible table enhancement. */
(()=>{'use strict';
const clean=s=>String(s??'').replace(/[↑↓↕]/g,'').trim();
const val=s=>{let v=clean(s).replace(/[’'\s]/g,'').replace('%','').replace(',','.');return /^[-+]?\d+(?:\.\d+)?$/.test(v)?Number(v):null};
function enhance(t){if(t.dataset.bpSmart==='1'||!t.tHead||!t.tBodies.length)return;
  // Independent history ranking has a detached sort bar; preserve that UI.
  if(t.classList.contains('history-table--rank'))return;
  t.dataset.bpSmart='1';t.classList.add('bp-smart-table');
  const head=[...t.tHead.querySelectorAll('th')].map(h=>h.textContent.trim().toLowerCase());
  const isRanking=head.length>=3&&head.length<=5&&head.some(h=>/rang|platz|^#/.test(h))&&head.some(h=>/spieler|name/.test(h));
  if(isRanking)t.classList.add('bp-compact-rank');

  const parent=t.parentElement;
  if(parent&&!parent.classList.contains('bp-smart-scroll')&&!parent.classList.contains('table-scroll')&&!parent.classList.contains('lab-heat-scroll')){const wrap=document.createElement('div');wrap.className='bp-smart-scroll';parent.insertBefore(wrap,t);wrap.appendChild(t)}
  [...t.tHead.querySelectorAll('th')].forEach((th,index)=>{
    if(th.querySelector('button,[data-action="sort"]'))return;
    if(th.colSpan>1||th.rowSpan>1)return;
    const title=clean(th.textContent);if(!title)return;
    const b=document.createElement('button');b.type='button';b.className='bp-smart-sort';b.textContent=title;
    b.setAttribute('aria-label',title+' sortieren');const arr=document.createElement('span');arr.textContent=' ↕';arr.setAttribute('aria-hidden','true');b.appendChild(arr);
    th.replaceChildren(b);th.setAttribute('aria-sort','none');
    b.addEventListener('click',()=>{
      const body=t.tBodies[0];if(!body)return;
      const rr=[...body.rows];if(rr.some(r=>r.cells.length!==t.tHead.rows[0].cells.length))return;
      const asc=th.getAttribute('aria-sort')!=='ascending';
      const keyed=rr.map((r,pos)=>({r,pos,s:clean(r.cells[index]?.textContent),v:val(r.cells[index]?.textContent)}));
      const numeric=keyed.filter(x=>x.s&&x.s!=='–').every(x=>x.v!==null);
      keyed.sort((a,b)=>{const comparison=numeric?(a.v===null?1:b.v===null?-1:a.v-b.v):a.s.localeCompare(b.s,'de-CH',{numeric:true,sensitivity:'base'});return comparison*(asc?1:-1)||a.pos-b.pos});
      const fragment=document.createDocumentFragment();keyed.forEach(x=>fragment.appendChild(x.r));body.appendChild(fragment);
      [...t.tHead.querySelectorAll('th')].forEach(other=>{other.setAttribute('aria-sort',other===th?(asc?'ascending':'descending'):'none');const icon=other.querySelector('.bp-smart-sort span');if(icon)icon.textContent=other===th?(asc?' ↑':' ↓'):' ↕'});
    });
  });
}
let queued=false;function scan(){queued=false;document.querySelectorAll('#app table, main table, body > table').forEach(enhance)}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(scan)}
function init(){scan();new MutationObserver(schedule).observe(document.getElementById('app')||document.body,{subtree:true,childList:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
