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
      svg=icon?.querySelector('.bp-icon'),title=el.querySelector('.discovery-feature-copy strong,.tool-tile-copy strong'),
      desc=el.querySelector('.discovery-feature-copy small,.tool-tile-copy small'),
      arrow=el.querySelector('.discovery-feature-arrow,.tool-tile-arrow'),
      r=el.getBoundingClientRect(),i=icon?.getBoundingClientRect(),s=svg?.getBoundingClientRect(),copy=el.querySelector('.discovery-feature-copy,.tool-tile-copy')?.getBoundingClientRect();
     return {classes:el.className,title:title?.textContent,
      bg:st.backgroundImage,color:st.color,textAlign:st.textAlign,
      border:st.borderTopColor,grid:st.display,radius:st.borderTopLeftRadius,
      width:r.width,height:r.height,overflow:r.right>innerWidth+2,
      iconLeft:i?.left-r.left,iconTop:i?.top-r.top,
      svgWidth:s?.width,svgHeight:s?.height,svgLoaded:svg?.complete&&svg.naturalWidth>0,
      contentGap:copy&&i?copy.top-i.bottom:null,bottomEmpty:copy?r.bottom-copy.bottom:null,
      iconColor:icon?getComputedStyle(icon).color:null,
      titleAlign:title?getComputedStyle(title).textAlign:null,titleColor:title?getComputedStyle(title).color:null,
      descAlign:desc?getComputedStyle(desc).textAlign:null,descColor:desc?getComputedStyle(desc).color:null,
      arrowDisplay:arrow?getComputedStyle(arrow).display:null,
      active:el.classList.contains('is-active'),
     };
    }));
    assert.equal(d.length,count,pageName+' link count');
    for(const a of d){
     assert.equal(a.grid,'grid',pageName+' tile needs shared grid');
     assert(a.width>=100&&a.height>=70,pageName+' tile cramped: '+JSON.stringify(a));
     assert(a.height<=(pageName==='Home'?160:width<=430?185:175),pageName+' tile should be compact: '+JSON.stringify(a));
     assert(!a.overflow,pageName+' horizontal overflow: '+JSON.stringify(a));
     assert(a.svgLoaded,pageName+' actual svg missing: '+a.title);
     assert.equal(a.svgWidth,28,pageName+' icon width '+a.title);
     assert.equal(a.svgHeight,28,pageName+' icon height '+a.title);
     assert(a.iconLeft>=10&&a.iconLeft<=24,pageName+' icon left inset '+JSON.stringify(a));
     assert(a.iconTop>=10&&a.iconTop<=24,pageName+' icon top inset '+JSON.stringify(a));
     assert.equal(a.titleAlign,'center',pageName+' centered title '+a.title);
     assert.equal(a.descAlign,'center',pageName+' centered description '+a.title);
     assert.equal(a.titleColor,'rgb(255, 244, 227)',pageName+' cream-white title '+a.title);
     assert.equal(a.descColor,'rgb(225, 233, 223)',pageName+' cream-white desc '+a.title);
     assert.equal(a.arrowDisplay,'none',pageName+' decorative arrow hidden');
     if(pageName!=='Home'){
      assert(a.contentGap>=4&&a.contentGap<=16,pageName+' content stays close to icon: '+JSON.stringify(a));
      assert(a.bottomEmpty<=58,pageName+' leaves too much bottom whitespace: '+JSON.stringify(a));
     }
     assert(a.radius.includes('17px'),pageName+' tile radius');
    }
    const allStd=d.filter(x=>!x.active);
    if(allStd.length>1){
     assert.equal(new Set(allStd.map(x=>x.bg)).size,1,pageName+' must share standard forest gradient');
     assert.equal(new Set(allStd.map(x=>x.border)).size,1,pageName+' must share border color');
    }
    return d;
   };
   const home=await auditTiles('.page--home button.discovery-feature',16,'Home');
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
