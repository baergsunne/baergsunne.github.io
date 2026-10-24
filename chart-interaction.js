/* Shared chart inspector: mouse, finger and keyboard. Works on SVGs across all pages. */
(()=>{
'use strict';
const selector='svg[data-bp-chart]';
let active=null, tooltip=null, guide=null;
function ensureTooltip(){
 if(tooltip&&tooltip.isConnected)return tooltip;
 tooltip=document.createElement('div');tooltip.className='bp-chart-tooltip';tooltip.setAttribute('role','status');
 tooltip.setAttribute('aria-live','off');tooltip.hidden=true;document.body.append(tooltip);return tooltip;
}
function hide(){if(tooltip)tooltip.hidden=true;if(guide)guide.remove();guide=null;active=null;}
function points(svg){return [...svg.querySelectorAll('[data-bp-point]')].filter(el=>el.getAttribute('data-bp-value')!==null);}
function screenX(svg,x){const pt=svg.createSVGPoint();pt.x=x;pt.y=0;const matrix=svg.getScreenCTM();return matrix?pt.matrixTransform(matrix).x:svg.getBoundingClientRect().left+x;}
function chartX(svg,clientX){const matrix=svg.getScreenCTM();if(!matrix)return null;const pt=svg.createSVGPoint();pt.x=clientX;pt.y=0;return pt.matrixTransform(matrix.inverse()).x;}
function info(el){return {x:Number(el.getAttribute('data-bp-x')),label:el.getAttribute('data-bp-label')||'',value:el.getAttribute('data-bp-value')||'',series:el.getAttribute('data-bp-series')||'',color:el.getAttribute('fill')||el.getAttribute('stroke')||'#e8c37e'};}
function show(svg,clientX,clientY,target){
 const els=points(svg);if(!els.length)return;
 const direct=target&&target.closest&&target.closest('[data-bp-point]');
 const x=chartX(svg,clientX);
 let selected;
 if(direct&&svg.contains(direct)&&(!Number.isFinite(x)||svg.dataset.bpChart==='segments'))selected=direct;
 else if(Number.isFinite(x))selected=els.reduce((best,el)=>Math.abs(info(el).x-x)<Math.abs(info(best).x-x)?el:best,els[0]);
 else selected=els[0];
 const key=selected.getAttribute('data-bp-label')||'';
 const chosen=svg.dataset.bpChart==='segments'?[selected]:els.filter(el=>el.getAttribute('data-bp-label')===key);
 const list=(chosen.length?chosen:[selected]).slice(0,16);
 const box=ensureTooltip();box.replaceChildren();
 const title=document.createElement('strong');title.textContent=key;box.append(title);
 for(const el of list){const p=info(el),row=document.createElement('div');row.className='bp-chart-tooltip-row';
 const dot=document.createElement('i');dot.style.background=p.color;row.append(dot);
 const name=document.createElement('span');name.textContent=p.series||'Wert';row.append(name);
 const val=document.createElement('b');val.textContent=p.value;row.append(val);box.append(row);}
 box.hidden=false;
 const width=box.getBoundingClientRect().width, height=box.getBoundingClientRect().height;
 const rect=svg.getBoundingClientRect(),desiredX=screenX(svg,info(selected).x);
 const left=Math.max(8,Math.min(window.innerWidth-width-8,desiredX-width/2));
 const top=rect.top-height-12>8?rect.top-height-12:Math.min(window.innerHeight-height-8,rect.bottom+10);
 box.style.left=left+'px';box.style.top=Math.max(8,top)+'px';
 if(guide)guide.remove();guide=null;
 if(svg.dataset.bpChart!=='segments'){
 const ns='http://www.w3.org/2000/svg';guide=document.createElementNS(ns,'line');
 const vb=svg.viewBox.baseVal;guide.setAttribute('x1',String(info(selected).x));guide.setAttribute('x2',String(info(selected).x));
 guide.setAttribute('y1',String(vb.y+10));guide.setAttribute('y2',String(vb.y+vb.height-30));
 guide.setAttribute('stroke','#efcf93');guide.setAttribute('stroke-width','1.5');guide.setAttribute('stroke-dasharray','5 5');
 guide.setAttribute('pointer-events','none');guide.classList.add('bp-chart-guide');svg.append(guide);}
 active={svg,key};
}
document.addEventListener('pointerdown',e=>{const svg=e.target.closest?.(selector);if(svg)show(svg,e.clientX,e.clientY,e.target);else if(active)hide();});
document.addEventListener('pointermove',e=>{const svg=e.target.closest?.(selector);if(svg&&(e.pointerType!=='touch'||e.buttons>0||e.pressure>0))show(svg,e.clientX,e.clientY,e.target);});
document.addEventListener('pointerover',e=>{if(e.pointerType!=='mouse')return;const svg=e.target.closest?.(selector);if(svg)show(svg,e.clientX,e.clientY,e.target);});
document.addEventListener('pointerout',e=>{if(e.pointerType==='mouse'&&active&&!e.relatedTarget?.closest?.(selector))hide();});
document.addEventListener('keydown',e=>{
 const svg=e.target.closest?.(selector);if(!svg)return;
 if(e.key==='Escape'){hide();return;}
 if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight'&&e.key!=='Home'&&e.key!=='End')return;
 const els=points(svg),xs=[...new Set(els.map(el=>Number(el.getAttribute('data-bp-x'))))].sort((x,y)=>x-y);
 if(!xs.length)return;e.preventDefault();
 let at=active?.svg===svg?xs.findIndex(x=>els.some(el=>Number(el.getAttribute('data-bp-x'))===x&&el.getAttribute('data-bp-label')===active.key)):-1;
 at=e.key==='Home'?0:e.key==='End'?xs.length-1:Math.max(0,Math.min(xs.length-1,at+(e.key==='ArrowLeft'?-1:1)));
 const el=els.find(el=>Number(el.getAttribute('data-bp-x'))===xs[at]);
 if(el)show(svg,screenX(svg,xs[at]),svg.getBoundingClientRect().top,el);
});
document.addEventListener('focusout',e=>{if(active&&e.target===active.svg)hide();});
})();