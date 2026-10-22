/* Bärgsunne Poker: linked tiles & stats visual tokens, all iPhone sizes.
 * Visual-only test; only user navigation, CSS and read-only render are exercised. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fixture=require('./fixture-2026.json');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,375,390,430,768,1024]){
   const page=await browser.newPage({viewport:{width,height:880},isMobile:width<=430,hasTouch:width<=430});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/api/editions',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
   await page.route('**/api/live',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'planned',players:[],standings:[],rounds:[]})}));
   await page.goto('http://127.0.0.1:8765/#home',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(e=>e.year===2026),null,{timeout:25000});
   const auditTiles=async(selector,count,pageName)=>{
    const d=await page.locator(selector).evaluateAll(cards=>cards.map(el=>{
     const st=getComputedStyle(el),icon=el.querySelector('.discovery-feature-icon,.tool-tile-symbol'),
       image=icon?.querySelector('.bp-icon'),title=el.querySelector('.discovery-feature-copy strong,.tool-tile-copy strong'),
       desc=el.querySelector('.discovery-feature-copy small,.tool-tile-copy small'),
       arrow=el.querySelector('.discovery-feature-arrow,.tool-tile-arrow'),
       copy=el.querySelector('.discovery-feature-copy,.tool-tile-copy');
     const r=el.getBoundingClientRect(),i=icon?.getBoundingClientRect(),im=image?.getBoundingClientRect(),cr=copy?.getBoundingClientRect();
     return {classes:el.className,title:title?.textContent,
       bg:st.backgroundImage,display:st.display,radius:st.borderTopLeftRadius,
       width:r.width,height:r.height,left:r.left,top:r.top,right:r.right,
       watermarkWidth:im?.width,watermarkHeight:im?.height,iconX:i?.left-r.left,iconY:i?.top-r.top,
       imageLoaded:!!image?.complete&&image.naturalWidth>0,
       symbolOpacity:icon?Number.parseFloat(getComputedStyle(icon).opacity):null,
       titleAlign:title?getComputedStyle(title).textAlign:null,titleColor:title?getComputedStyle(title).color:null,
       descAlign:desc?getComputedStyle(desc).textAlign:null,descColor:desc?getComputedStyle(desc).color:null,
       copyCenterX:cr?cr.left+cr.width/2:null,copyCenterY:cr?cr.top+cr.height/2:null,
       copyHeight:copy?.scrollHeight,copyClientHeight:copy?.clientHeight,
       arrowDisplay:arrow?getComputedStyle(arrow).display:null,
       before:getComputedStyle(el,'::before').content,
       active:el.classList.contains('is-active'),
     };
    }));
    assert.equal(d.length,count,pageName+' link count');
    const wantedHeight=width<=650?170:176;
    for(const a of d){
     assert.equal(a.display,'flex',pageName+' shared layering');
     assert(Math.abs(a.height-wantedHeight)<1,pageName+' identical fixed card height: '+JSON.stringify(a));
     assert(a.width>=100&&a.right<=width+2,pageName+' out of viewport: '+JSON.stringify(a));
     assert(a.imageLoaded,pageName+' missing existing background icon: '+a.title);
     assert(a.watermarkWidth>=a.width*.85&&a.watermarkHeight>=a.height*.85,pageName+' watermark must span most of tile: '+JSON.stringify(a));
     assert(a.iconX<=5&&a.iconY<=5,pageName+' watermark begins at top left: '+JSON.stringify(a));
     assert(a.symbolOpacity>=.08&&a.symbolOpacity<=.28,pageName+' decorative icon opacity');
     assert.equal(a.before,'""',pageName+' diagonal highlight overlay exists');
     assert.equal(a.titleAlign,'center',pageName+' centered title '+a.title);
     assert.equal(a.descAlign,'center',pageName+' centered description '+a.title);
     assert.equal(a.titleColor,'rgb(255, 246, 233)',pageName+' title white '+a.title);
     assert.equal(a.descColor,'rgb(232, 238, 227)',pageName+' desc off-white '+a.title);
     assert(Math.abs(a.copyCenterX-a.left-a.width/2)<3,pageName+' text overlay centered: '+a.title);
     assert(Math.abs(a.copyCenterY-a.top-a.height/2)<3,pageName+' vertical text centering: '+a.title);
     assert(a.copyHeight<=a.copyClientHeight+2,pageName+' text must fit fixed card: '+JSON.stringify(a));
     assert.equal(a.arrowDisplay,'none',pageName+' no duplicate decorative arrows');
     assert(a.radius.includes('17px'),pageName+' uniform card radius');
    }
    const allStd=d.filter(x=>!x.active);
    if(allStd.length>1)assert.equal(new Set(allStd.map(x=>x.bg)).size,1,pageName+' shared gold-to-forest background');
    return d;
   };
   const home=await auditTiles('.page--home button.discovery-feature',16,'Home');
   // Verify the four top-level entry cards form two rows and two columns
   // with exactly the same width and height (not four horizontal bars).
   const four=await page.locator('.page--home .discovery-features > .discovery-feature').evaluateAll(els=>els.map(el=>{
    const r=el.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height};
   }));
   assert.equal(four.length,4,'Four main navigation cards');
   assert(Math.abs(four[0].top-four[1].top)<1&&Math.abs(four[2].top-four[3].top)<1,'Two same-row cards');
   assert(four[2].top>four[0].top+four[0].height-1,'Two rows of cards');
   assert(Math.abs(four[0].left-four[2].left)<1&&Math.abs(four[1].left-four[3].left)<1,'Two aligned columns');
   assert.equal(new Set(four.map(t=>Math.round(t.height))).size,1,'All home cards have identical height');
   assert.equal(new Set(four.map(t=>Math.round(t.width))).size,1,'All home cards have identical width');
   assert(four[1].left>four[0].left+four[0].width-1,'Two distinct columns');
   const appOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   assert(appOverflow<=2,'No home overflow '+width);
   await page.locator('.discovery-feature[data-value="stats"]').first().click();
   await page.waitForSelector('.page--stats .tool-directory .tool-tile');
   const stats=await auditTiles('.page--stats .tool-directory button.tool-tile',12,'Statistics');
   assert(stats.some(x=>x.active),width+' selected stats tool must have active variant');
   const standard=stats.find(x=>!x.active),active=stats.find(x=>x.active);
   assert.notEqual(standard.bg,active.bg,'Active tools must use other forest variation');
   await page.waitForSelector('.page--stats .stat-content .bp-stat-columns-summary',{timeout:15000});
   const metrics=await page.locator('.page--stats .stat-content > .metrics > .kpi').evaluateAll(els=>els.map(el=>({
    label:el.querySelector(':scope > div')?.textContent,
    labelColor:getComputedStyle(el.querySelector(':scope > div')).color,
    valueColor:getComputedStyle(el.querySelector(':scope > strong')).color,
    noteColor:getComputedStyle(el.querySelector(':scope > small')).color,
    value:el.querySelector(':scope > strong')?.textContent
   })));
   assert.equal(metrics.length,4,'4 statistic overview KPIs');
   for(const m of metrics){
    assert.equal(m.labelColor,'rgb(255, 244, 230)',width+' label is white: '+m.label);
    assert.equal(m.noteColor,'rgb(255, 244, 230)',width+' name is white: '+m.label);
    assert.equal(m.valueColor,'rgb(242, 206, 139)',width+' central number must be gold: '+m.label);
    assert(m.value?.trim(),width+' no KPI value');
   }
   const headers=await page.evaluate(()=>{
    const panel=document.querySelector('.page--stats .stat-content .bp-stat-columns');
    const summary=panel?.querySelector('.bp-stat-columns-summary');
    const table=document.querySelector('.page--stats .stat-content table.bp-stat-personalized-table');
    const heads=[...(table?.tHead?.rows[0]?.cells||[])];
    return {panel:panel?getComputedStyle(panel).backgroundColor:null,
      summary:summary?getComputedStyle(summary).backgroundColor:null,
      header:heads.map(x=>getComputedStyle(x).backgroundColor),firstPosition:heads[0]?getComputedStyle(heads[0]).position:null,
      tableOverflow:document.documentElement.scrollWidth-innerWidth,
      columnPicker:!!summary,sortControls:heads.some(x=>x.querySelector('button'))};
   });
   assert(headers.columnPicker,'Column picker kept');
   assert(headers.header.length>=6,'Overall table headings available');
   assert.equal(headers.panel,'rgb(23, 56, 44)','Color is Bärgsunne forest');
   assert.equal(headers.summary,headers.panel,'Picker and heading match exactly');
   assert(headers.header.every(x=>x===headers.panel),width+' all header cells share selector green: '+JSON.stringify(headers));
   assert.equal(headers.firstPosition,'sticky','Sticky first column remains sticky');
   assert(headers.tableOverflow<=2,'No stats horizontal scroll on document');
   // The new standard applies to Historie as well.
   await page.evaluate(()=>{state.page='history';state.historyYear=2026;draw();});
   // Desktop mouse hover has a distinct intentional visual state: move off
   // the navigation cards before checking the shared *standard* design.
   await page.mouse.move(1,1);
   const hist=await auditTiles('.page--history .history-entry button.history-entry-tile',6,'Historie');
   assert(hist.some(x=>x.active),'Selected history view keeps gold active frame');
   assert.equal(hist.find(x=>x.active).bg,active.bg,'Shared active tile color');
   assert.equal(hist.find(x=>!x.active).bg,standard.bg,'Shared default tile color');
   // Real click changes the linked Historie view; styling did not remove function.
   await page.locator('.history-entry-tile[data-view="records"]').click();
   assert.equal(await page.locator('.history-entry-tile[aria-pressed="true"]').getAttribute('data-view'),'records');
   assert.deepEqual(errors,[],width+' JS console exceptions');
   console.log('UNIFIED_TILES_STATS_PASS',JSON.stringify({width,home:home.length,tools:stats.length,history:hist.length,kpis:metrics.length,headings:headers.header.length}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('UNIFIED_TILES_STATS_FAIL',e);process.exit(1)});
