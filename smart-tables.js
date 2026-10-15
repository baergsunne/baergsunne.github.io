/* Bärgsunne Poker 2.2.0: one-line, sortable, keyboard-accessible table enhancement. */
(()=>{'use strict';
const clean=s=>String(s??'').replace(/[↑↓↕]/g,'').trim();
const val=s=>{let v=clean(s).replace(/[’'\s]/g,'').replace('%','').replace(',','.');return /^[-+]?\d+(?:\.\d+)?$/.test(v)?Number(v):null};
function enhance(t){if(t.dataset.bpSmart==='1'||!t.tHead||!t.tBodies.length)return;
  // Independent history ranking has a detached sort bar; preserve that UI.
  if(t.classList.contains('history-table--rank'))return;
  t.dataset.bpSmart='1';t.classList.add('bp-smart-table');
  const head=[...t.tHead.querySelectorAll('th')].map(h=>h.textContent.trim().toLowerCase());
  const isRanking=head.length>=2 && head.length<=12 && head.some(h=>/rang|platz|^#|spieler|champion|teilnehmer|name|duellant/.test(h)) && !t.closest('.lab-heat-scroll,.heat-scroll') && !t.classList.contains('heat-grid');
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
  if(isRanking && head.length<=5 && !t.dataset.bpSortDetached){
    const ths=[...t.tHead.querySelectorAll('th')];
    const opts=ths.map((th,i)=>({th,i,label:clean(th.textContent).replace(/\\s*[↑↓↕]\\s*/g,' ').trim()}))
      .filter(x=>/rang|platz|^#|spieler|punkte|pkt|siege|titel|final/i.test(x.label)).slice(0,4);
    if(opts.length){
      const bar=document.createElement('div');bar.className='bp-rank-sortbar';
      const title=document.createElement('span');title.textContent='Sortieren';bar.appendChild(title);
      const group=document.createElement('div');group.className='bp-rank-sortgroup';bar.appendChild(group);
      opts.forEach(({th,label})=>{
        const button=document.createElement('button');button.type='button';button.textContent=label.replace(/\\*/g,'');
        button.addEventListener('click',()=>{
          const sortButton=th.querySelector('.bp-smart-sort,.thbutton,[data-action="sort"]');
          sortButton?.click();
          group.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
        });
        button.setAttribute('aria-pressed','false');group.appendChild(button);
      });
      t.parentElement?.insertAdjacentElement('beforebegin',bar);
      t.dataset.bpSortDetached='1';
    }
  }
}
let queued=false;function scan(){queued=false;document.querySelectorAll('#app table, main table, body > table').forEach(enhance)}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(scan)}
function init(){scan();new MutationObserver(schedule).observe(document.getElementById('app')||document.body,{subtree:true,childList:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
