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
    const cards=await page.locator(selector).evaluateAll(nodes=>nodes.map(el=>{
     const style=getComputedStyle(el),icon=el.querySelector('.discovery-feature-icon,.tool-tile-symbol'),
       image=icon?.querySelector('.bp-icon'),title=el.querySelector('.discovery-feature-copy strong,.tool-tile-copy strong'),
       description=el.querySelector('.discovery-feature-copy small,.tool-tile-copy small'),
       copy=el.querySelector('.discovery-feature-copy,.tool-tile-copy'),
       arrow=el.querySelector('.discovery-feature-arrow,.tool-tile-arrow'),
       r=el.getBoundingClientRect(),cr=copy?.getBoundingClientRect(),ir=icon?.getBoundingClientRect(),
       before=getComputedStyle(el,'::before'),after=getComputedStyle(el,'::after');
     return {title:title?.textContent,active:el.classList.contains('is-active'),display:style.display,
       width:r.width,height:r.height,left:r.left,right:r.right,top:r.top,
       aspectRatio:style.aspectRatio,bg:style.backgroundImage,border:style.borderTopColor,
       imageLoaded:!!image?.complete&&image.naturalWidth>0,iconOpacity:icon?parseFloat(getComputedStyle(icon).opacity):null,
       iconWidth:icon?getComputedStyle(icon).width:null,iconRight:icon?getComputedStyle(icon).right:null,
       iconTransform:icon?getComputedStyle(icon).transform:null,iconX:ir?.left,
       objectPosition:image?getComputedStyle(image).objectPosition:null,
       titleAlign:title?getComputedStyle(title).textAlign:null,
       descAlign:description?getComputedStyle(description).textAlign:null,
       titleColor:title?getComputedStyle(title).color:null,
       descColor:description?getComputedStyle(description).color:null,
       copyLeft:cr?.left,copyTop:cr?.top,copyBottom:cr?.bottom,copyRight:cr?.right,
       copyHeight:copy?.scrollHeight,copyClientHeight:copy?.clientHeight,
       arrow:arrow?getComputedStyle(arrow).display:null,
       overlay:before.backgroundImage,readability:after.backgroundImage,
       decorationClicks:icon?getComputedStyle(icon).pointerEvents:null
     };
    }));
    assert.equal(cards.length,count,pageName+' count');
    for(const c of cards){
     assert.equal(c.display,'flex',pageName+' must use same card layout');
     assert.equal(c.aspectRatio,'2 / 1',pageName+' must have 2:1 aspect ratio '+c.title);
     assert(Math.abs(c.height-c.width/2)<=1.3,pageName+' exact 2:1 dimensions '+JSON.stringify(c));
     assert(c.width>=100&&c.right<=width+2,pageName+' tile out of viewport '+JSON.stringify(c));
     assert(c.imageLoaded,pageName+' icon image missing '+c.title);
     assert(c.iconOpacity>=.08&&c.iconOpacity<=.19,pageName+' muted icon '+c.title);
     assert(c.iconRight==='0px',pageName+' watermark must anchor to right '+c.title);
     assert(c.iconWidth.endsWith('px')&&parseFloat(c.iconWidth)>=c.width*.99,pageName+' oversize watermark '+c.title);
     assert(c.objectPosition==='100% 0%',pageName+' icon image anchored right-top '+c.title);
     assert(c.iconTransform!=='none',pageName+' diagonal symbol movement '+c.title);
     assert(c.decorationClicks==='none',pageName+' watermark cannot block clicks');
     assert.equal(c.titleAlign,'left',pageName+' left-aligned heading '+c.title);
     assert.equal(c.descAlign,'left',pageName+' left-aligned description '+c.title);
     assert.equal(c.titleColor,'rgb(255, 246, 233)',pageName+' white title');
     assert.equal(c.descColor,'rgb(232, 238, 227)',pageName+' muted-white detail');
     assert(c.copyLeft>=c.left+4&&c.copyRight<=c.right-4,pageName+' left copy within card');
     assert(c.copyBottom<=c.top+c.height+1,pageName+' text must fit 2:1 tile '+JSON.stringify(c));
     assert.equal(c.arrow,'none',pageName+' no redundant arrow');
     assert(c.bg.includes('linear-gradient(225deg'),'Diagonal gold highlight from top-right');
     assert(c.overlay.includes('radial-gradient'),'Subtle upper right illumination');
     assert(c.readability.includes('linear-gradient'),'Text contrast overlay');
    }
    const standards=cards.filter(c=>!c.active);
    if(standards.length>1)assert.equal(new Set(standards.map(c=>c.bg)).size,1,pageName+' standard cards must share one gradient');
    return cards;
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
   // The picker and heading share a gold-to-forest background image.
   assert.equal(headers.summary,headers.panel,'Picker and heading retain a matching base');
   assert(headers.header.every(x=>x===headers.panel),width+' heading cells match the picker base: '+JSON.stringify(headers));
   const headerGradients=await page.evaluate(()=>{
    const p=document.querySelector('.page--stats .bp-stat-columns');
    const sum=p.querySelector('.bp-stat-columns-summary');
    const th=[...document.querySelectorAll('.page--stats .bp-stat-personalized-table thead th')];
    return {picker:getComputedStyle(p).backgroundImage,summary:getComputedStyle(sum).backgroundImage,cells:th.map(x=>getComputedStyle(x).backgroundImage)};
   });
   assert(headerGradients.picker.includes('225deg'),'Picker has sunlight gradient');
   assert.equal(headerGradients.picker,headerGradients.summary,'Column picker has same sunlight gradient');
   assert(headerGradients.cells.every(x=>x===headerGradients.picker),'Table headers share sunlight direction');
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
