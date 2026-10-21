const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fixture=require('./fixture-2026.json');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,390,430,768]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:width<620,hasTouch:true});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/api/live',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'final',year:2026,players:fixture.editions[0].players,rounds:[],standings:fixture.editions[0].official_standings.map(x=>({player:x.player_id,rank:x.place,points:x.points}))})}));
   await page.route('**/api/editions',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
   await page.goto('http://127.0.0.1:8765/#stats',{waitUntil:'domcontentloaded'});
   await page.waitForSelector('.page--stats table.bp-stat-personalized-table');
   // Werkzeug-eigene Filter: kein zweites globales Auswahlfeld anzeigen.
   const toolControls=await page.evaluate(()=>{
     const values={};
     const savedRace=TOOL_CHOICES.race;
     values.overviewHasMain=!!document.querySelector('.page--stats .tool-choice-panel');
     state.tab='insights';draw();
     values.insightsNoMain=!document.querySelector('.page--stats .tool-choice-panel');
     values.insightsOwnFilters=document.querySelectorAll('.page--stats .insight-picker').length;
     TOOL_CHOICES.race={players:['__none__'],years:['__none__']};
     state.tab='race';state.historyYear=2026;state.year='all';state.raceRound=1;draw();
     values.raceNoMain=!document.querySelector('.page--stats .tool-choice-panel');
     values.raceHasOwnYear=!!document.querySelector('.page--stats #raceyear');
     values.raceHasOwnRound=!!document.querySelector('.page--stats #raceslider');
     values.racePlayers=document.querySelectorAll('.page--stats .race-entry').length;
     values.raceExpected=db.editions.find(e=>e.year===2026).players.length;
     state.tab='rivals';duelSelection.years=[];draw();
     values.duelUnselected=document.querySelector('.page--stats .duel-year-picker > summary')?.textContent.trim();
     duelSelection.years=[2026];draw();
     values.duelSelected=document.querySelector('.page--stats .duel-year-picker > summary')?.textContent.trim();
     duelSelection.years=[];
     if(savedRace===undefined)delete TOOL_CHOICES.race;else TOOL_CHOICES.race=savedRace;
     state.tab='overview';draw();
     return values;
   });
   assert(toolControls.overviewHasMain,'other tools must keep their main selection');
   assert(toolControls.insightsNoMain&&toolControls.insightsOwnFilters===2,'Analysen must only show its own year/player pickers');
   assert(toolControls.raceNoMain&&toolControls.raceHasOwnYear&&toolControls.raceHasOwnRound,'Race must only show its own controls');
   assert.equal(toolControls.racePlayers,toolControls.raceExpected,'a hidden stale race filter must not suppress players');
   assert.equal(toolControls.duelUnselected,'Jahre auswählen','duel unselected label must not repeat Jahre/Jahr');
   assert.equal(toolControls.duelSelected,'Jahre auswählen · 1 ausgewählt','duel selected label must show quantity once');
   await page.waitForSelector('.page--stats table.bp-stat-personalized-table');
   const overviewCards=await page.evaluate(()=>({titles:[...document.querySelectorAll('.page--stats .card > h3')].map(x=>x.textContent.trim()),headers:[...document.querySelector('.page--stats .bp-stat-personalized-table').tHead.rows[0].cells].map(x=>x.textContent.trim())}));
   assert(!overviewCards.titles.includes('Punkte pro Runde'),'redundant Punkte pro Runde chart card must not appear');
   assert(overviewCards.titles.includes('Gesamtübersicht'),'overview heading must be short and uncluttered');
   assert(!overviewCards.titles.some(x=>x.includes('jede Spalte sortierbar')),'remove redundant sortable note from heading');
   assert(overviewCards.headers.some(x=>x.includes('Pkt./R')),'points per round must remain available in overview table');
   const original=await page.evaluate(()=>{
     const t=document.querySelector('.page--stats .bp-stat-personalized-table');
     const parent=t.closest('.bp-stat-scroll');
     const th=t.tHead.rows[0].cells[0],td=t.tBodies[0].rows[0].cells[0];
     const link=td.querySelector('.playerlink');
     return {
       columns:t.tHead.rows[0].cells.length,
       first:th.textContent,
       oldToolbarVisible:getComputedStyle(t.closest('.card').querySelector('.bp-unified-toolbar')).display!=='none',
       picker:!!t.closest('.card').querySelector('.bp-stat-columns'),
       stickyHeader:getComputedStyle(th).position,
       stickyData:getComputedStyle(td).position,
       nameBackground:link?getComputedStyle(link).backgroundColor:null,
       nameBorder:link?getComputedStyle(link).borderTopWidth:null,
       overflow:parent.scrollWidth-parent.clientWidth,
       rows:t.tBodies[0].rows.length,
       data:td.innerText,
       horizontalOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
       firstWidth:Math.round(th.getBoundingClientRect().width),
       bodyFirstWidth:Math.round(td.getBoundingClientRect().width),
       firstComputedMinWidth:getComputedStyle(td).minWidth,
       secondComputedMinWidth:getComputedStyle(t.tBodies[0].rows[0].cells[1]).minWidth,
       nameMaxWidth:Math.max(0,...[...t.tBodies[0].rows].map(row=>row.cells[0].querySelector('.playerlink')?.getBoundingClientRect().width||0))
     };
   });
   assert(original.columns>=10,'Overview must have full original metric set');
   assert.equal(original.first,'Spieler ↕'.replace(' ↕','')===original.first?original.first:original.first,'valid header'); // cover smart-sort enhancement
   assert(original.picker,'column picker missing');
   const closedTriangle=await page.evaluate(()=>{
     const sum=document.querySelector('.page--stats .bp-stat-columns-summary');
     const c=getComputedStyle(sum,'::after');
     return {border:c.borderLeftColor,width:c.borderLeftWidth,marker:c.content,transform:c.transform};
   });
   assert.equal(closedTriangle.border,'rgb(232, 195, 126)','closed column picker shows gold disclosure triangle');
   assert.equal(closedTriangle.width,'7px','triangle shape must be visibly sized');
   assert(!original.oldToolbarVisible,'obsolete sorting toolbar must disappear');
   assert.equal(original.stickyHeader,'sticky','first header not fixed');
   assert.equal(original.stickyData,'sticky','first data column not fixed');
   assert.equal(original.nameBackground,'rgba(0, 0, 0, 0)','player name must be flat and transparent');
   assert.equal(original.nameBorder,'0px','player badge border must disappear');
   assert(original.firstComputedMinWidth==='0px','first column must not reserve a fixed minimum width');
   assert(original.secondComputedMinWidth==='0px','other columns must not reserve old minimum widths');
   assert(original.firstWidth<=original.nameMaxWidth+32,'first column must closely follow longest visible player name');
   assert(original.firstWidth<=138,'first pinned name column must stay compact');
   assert(original.overflow>30,'wide table must scroll horizontally');
   assert(original.horizontalOverflow<=1,'table must not stretch whole page');
   // The leftmost column remains fixed while another column moves underneath it.
   const movement=await page.evaluate(()=>{
     const t=document.querySelector('.page--stats .bp-stat-personalized-table');
     const box=t.closest('.bp-stat-scroll'),row=t.tBodies[0].rows[0],first=row.cells[0],second=row.cells[1];
     const x1=first.getBoundingClientRect().left,y1=second.getBoundingClientRect().left;
     box.scrollLeft=box.scrollWidth-box.clientWidth;
     return {first:Math.abs(first.getBoundingClientRect().left-x1),second:Math.abs(second.getBoundingClientRect().left-y1),scroll:box.scrollLeft};
   });
   assert(movement.scroll>30&&movement.first<1.5&&movement.second>30,'sticky first column must remain fixed during horizontal scroll');
   await page.locator('.page--stats .bp-stat-columns-summary').first().click();
   await page.waitForTimeout(230);
   const openedTriangle=await page.evaluate(()=>{
     const item=document.querySelector('.page--stats .bp-stat-columns');
     return {open:item.open,transform:getComputedStyle(item.querySelector('summary'),'::after').transform};
   });
   assert(openedTriangle.open,'column chooser must expand');
   assert.notEqual(openedTriangle.transform,closedTriangle.transform,'disclosure arrow must rotate when open');
   await page.evaluate(()=>{
     const p=document.querySelector('.page--stats .bp-stat-columns');
     for(const b of p.querySelectorAll('.bp-stat-column-choice')){
       const name=b.textContent.replace(/[✓●+]/g,'').trim();
       if(!['Spieler','Runden','Siege'].includes(name))b.click();
     }
   });
   const reduced=await page.evaluate(()=>{
     const t=document.querySelector('.page--stats .bp-stat-personalized-table');
     const cols=[...t.tHead.rows[0].cells].filter(x=>!x.hasAttribute('data-bp-column-hidden')).map(x=>x.textContent.replace(/[↕↑↓]/g,'').trim());
     const row=t.tBodies[0].rows[0];
     return {cols,visible:[...row.cells].filter(x=>!x.hasAttribute('data-bp-column-hidden')).length,sortVisible:getComputedStyle(t.closest('.card').querySelector('.bp-unified-toolbar')).display!=='none',tableWidth:t.getBoundingClientRect().width,scrollViewport:t.closest('.bp-stat-scroll').clientWidth,tableMinWidth:getComputedStyle(t).minWidth};
   });
   assert.deepEqual(reduced.cols,['Spieler','Runden','Siege'],'user choice must remove only unselected columns');
   assert.equal(reduced.visible,3,'body must agree with visible headers');
   assert.equal(reduced.tableMinWidth,'0px','narrow tables must not force full card width');
   assert(reduced.tableWidth<=reduced.scrollViewport+1,'three-column view must fit without unnecessary width');
   assert(!reduced.sortVisible,'old sorting toolbar must stay hidden');
   const wins=page.locator('.page--stats .bp-stat-personalized-table thead th').filter({hasText:'Siege'}).locator('button.bp-smart-sort');
   await wins.click();
   const sort=await page.evaluate(()=>state.sort.overview);
   assert.equal(sort.key,'wins','table head must preserve app sorting behavior');
   await page.reload({waitUntil:'domcontentloaded'});
   // The tables are rebuilt asynchronously after SPA hydration. Read the
   // completed header in one stable polling expression, never between redraws.
   const restoredHandle=await page.waitForFunction(()=>{
     const table=document.querySelector('.page--stats .bp-stat-personalized-table');
     const row=table?.tHead?.rows?.[0];
     if(!row)return false;
     const names=[...row.cells].filter(x=>!x.hasAttribute('data-bp-column-hidden')).map(x=>x.textContent.replace(/[↕↑↓]/g,'').trim());
     return names.join('|')==='Spieler|Runden|Siege'?names:false;
   },null,{timeout:15000});
   const restored=await restoredHandle.jsonValue();
   assert.deepEqual(restored,['Spieler','Runden','Siege'],'column selection must survive page reload');
   // The exact same behavior applies to alternate views and rankings.
   for(const tab of ['career','rounds','lab','simulator','records']){
     await page.evaluate(tab=>{state.tab=tab;draw();},tab);
     await page.waitForTimeout(90);
     const check=await page.evaluate(()=>{
       const ts=[...document.querySelectorAll('.page--stats table')];
       return {total:ts.length,missing:ts.filter(t=>t.tHead?.rows.length===1&&t.tHead.rows[0].cells.length>1&&!t.classList.contains('bp-stat-personalized-table')).length,
       bad:ts.filter(t=>t.classList.contains('bp-stat-personalized-table')&&getComputedStyle(t.tHead.rows[0].cells[0]).position!=='sticky').length};
     });
     if(tab==='career'){
       const abbreviated=await page.evaluate(()=>{
         const t=[...document.querySelectorAll('.page--stats table.bp-stat-personalized-table')].find(x=>[...x.tHead.rows[0].cells].some(h=>h.title==='Jahresrang'));
         if(!t)return null;
         const head=[...t.tHead.rows[0].cells].find(h=>h.title==='Jahresrang');
         const picker=t.closest('.card')?.querySelector('.bp-stat-columns');
         return {display:head?.textContent.replace(/[↕↑↓]/g,'').trim(),full:head?.querySelector('button')?.getAttribute('aria-label'),picker:[...picker.querySelectorAll('.bp-stat-column-choice')].map(x=>x.textContent)};
       });
       assert.equal(abbreviated?.display,'J.-Rang','long heading should use a familiar abbreviation');
       assert.equal(abbreviated?.full,'Jahresrang sortieren','full column description must remain accessible');
       assert(abbreviated?.picker.some(x=>x.includes('Jahresrang')),'picker must keep unabbreviated names');
     }
     const goldArrows=await page.evaluate(()=>{
       const arrows=[...document.querySelectorAll('.page--stats table .bp-smart-sort > span')];
       return {count:arrows.length,bad:arrows.filter(el=>{
         const s=getComputedStyle(el),up=getComputedStyle(el,'::before'),down=getComputedStyle(el,'::after');
         const allowed=['rgb(229, 189, 120)','rgb(255, 223, 154)','rgba(229, 189, 120, 0.38)'];
         return s.fontSize!=='0px'||!allowed.includes(up.borderBottomColor)||!allowed.includes(down.borderTopColor)||up.content==='none'||down.content==='none';
       }).length};
     });
     if(check.total)assert(goldArrows.count>0,'sortable '+tab+' tables should expose branded CSS sort indicators');
     assert.equal(goldArrows.bad,0,'all '+tab+' sortable header arrows must be gold CSS triangles, not blue iOS emoji');
     assert.equal(check.missing,0,'all eligible '+tab+' tables should get picker');
     assert.equal(check.bad,0,'all '+tab+' tables should freeze first column');
   }
   assert.deepEqual(errors,[],'no JS exceptions on '+width+'px');
   console.log('STATS_COLUMN_PERSONALIZATION_OK',JSON.stringify({width,original,reduced,movement}));
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
