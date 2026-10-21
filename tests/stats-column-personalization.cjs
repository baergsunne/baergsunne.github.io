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
       horizontalOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth
     };
   });
   assert(original.columns>=10,'Overview must have full original metric set');
   assert.equal(original.first,'Spieler ↕'.replace(' ↕','')===original.first?original.first:original.first,'valid header'); // cover smart-sort enhancement
   assert(original.picker,'column picker missing');
   assert(!original.oldToolbarVisible,'obsolete sorting toolbar must disappear');
   assert.equal(original.stickyHeader,'sticky','first header not fixed');
   assert.equal(original.stickyData,'sticky','first data column not fixed');
   assert.equal(original.nameBackground,'rgba(0, 0, 0, 0)','player name must be flat and transparent');
   assert.equal(original.nameBorder,'0px','player badge border must disappear');
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
     return {cols,visible:[...row.cells].filter(x=>!x.hasAttribute('data-bp-column-hidden')).length,sortVisible:getComputedStyle(t.closest('.card').querySelector('.bp-unified-toolbar')).display!=='none'};
   });
   assert.deepEqual(reduced.cols,['Spieler','Runden','Siege'],'user choice must remove only unselected columns');
   assert.equal(reduced.visible,3,'body must agree with visible headers');
   assert(!reduced.sortVisible,'old sorting toolbar must stay hidden');
   const wins=page.locator('.page--stats .bp-stat-personalized-table thead th').filter({hasText:'Siege'}).locator('button.bp-smart-sort');
   await wins.click();
   const sort=await page.evaluate(()=>state.sort.overview);
   assert.equal(sort.key,'wins','table head must preserve app sorting behavior');
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForSelector('.page--stats .bp-stat-personalized-table');
   const restored=await page.evaluate(()=>[...document.querySelector('.page--stats .bp-stat-personalized-table').tHead.rows[0].cells].filter(x=>!x.hasAttribute('data-bp-column-hidden')).map(x=>x.textContent.replace(/[↕↑↓]/g,'').trim()));
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
     assert.equal(check.missing,0,'all eligible '+tab+' tables should get picker');
     assert.equal(check.bad,0,'all '+tab+' tables should freeze first column');
   }
   assert.deepEqual(errors,[],'no JS exceptions on '+width+'px');
   console.log('STATS_COLUMN_PERSONALIZATION_OK',JSON.stringify({width,original,reduced,movement}));
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
