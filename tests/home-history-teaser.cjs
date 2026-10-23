const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,375,390,430,768]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:width<=430,hasTouch:true});
   const errors=[];
   page.on('pageerror',err=>errors.push(err.message));
   for(const path of ['live','editions'])await page.route('**/api/'+path,async route=>{
    try{
     const response=await route.fetch({headers:{...route.request().headers(),origin:'https://baergsunne.github.io'}});
     await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':'http://127.0.0.1:8765'}});
    }catch(err){if(!page.isClosed())try{await route.abort()}catch(_){}}
   });
   await page.goto('http://127.0.0.1:8765/#home',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(x=>x.year===2026),null,{timeout:30000});
   const teaser=await page.evaluate(()=>{
    const area=document.querySelector('.discovery-history-teaser'),buttons=[...area?.querySelectorAll('[data-action="historyteaser"]')||[]];
    const grids=[...document.querySelectorAll('.discovery-mini-grid')];
    const statsGrid=grids.find(x=>!x.closest('.discovery-history-teaser')),historyGrid=area?.querySelector('.discovery-mini-grid');
    const styles=grid=>{
     const box=grid.querySelector('.discovery-feature'),g=getComputedStyle(grid),b=getComputedStyle(box);
     const title=getComputedStyle(box.querySelector('strong')),sub=getComputedStyle(box.querySelector('small'));
     return {columns:g.gridTemplateColumns.split(' ').length,gap:g.gap,background:b.backgroundImage,
      border:b.borderTopColor,borderWidth:b.borderTopWidth,borderRadius:b.borderTopLeftRadius,padding:b.padding,
      display:b.display,alignment:b.alignItems,gridColumns:g.gridTemplateColumns,
      titleFont:title.fontSize,titleWeight:title.fontWeight,smallFont:sub.fontSize,smallColor:sub.color};
    };
    return {
     sectionHeadings:[...document.querySelectorAll('.discovery-home .discovery-section > .discovery-head')].map(head=>{
       const title=head.querySelector('h2'),cs=title?getComputedStyle(title):null;
       return {text:title?.textContent.trim(),color:cs?.color,fontSize:cs?parseFloat(cs.fontSize):0,
        eyebrowCount:head.querySelectorAll('.overline').length,paragraphCount:head.querySelectorAll('p').length,
        titleCount:head.querySelectorAll('h1,h2,h3').length};
     }),
     count:buttons.length,views:buttons.map(x=>x.dataset.value),titles:buttons.map(x=>x.querySelector('strong')?.textContent),
     images:buttons.map(x=>x.querySelector('.discovery-feature-icon img.bp-icon')?.getAttribute('src')),
     sameStyle:JSON.stringify(styles(historyGrid))===JSON.stringify(styles(statsGrid)),
     oldYearSelector:!!document.getElementById('bp-home-year'),
     oldYearSection:!!document.querySelector('.discovery-years'),
     statisticTeaserCount:statsGrid.querySelectorAll('.discovery-feature').length,
     gapToFooter:document.querySelector('.discovery-history-teaser').getBoundingClientRect().bottom,
     overflows:document.documentElement.scrollWidth>innerWidth+2,
     cols:styles(historyGrid).columns,
     buttonWidths:buttons.map(x=>Math.round(x.getBoundingClientRect().width))
    };
   });
   const views=['yearbook','replay','moments','records','field','compare'];
   assert.deepEqual(teaser.sectionHeadings.map(h=>h.text),
    ['Der Einstieg','Werkzeuge entdecken','Historie entdecken'],
    width+' all three section entrances have exactly one requested heading');
   for(const h of teaser.sectionHeadings){
    assert.equal(h.titleCount,1,width+' '+h.text+' exactly one title');
    assert.equal(h.eyebrowCount,0,width+' '+h.text+' no obsolete overline');
    assert.equal(h.paragraphCount,0,width+' '+h.text+' no explanatory paragraph');
    assert.equal(h.color,'rgb(232, 195, 126)',width+' '+h.text+' must use heritage gold');
    assert(h.fontSize>=25,width+' '+h.text+' must be large enough to read');
   }
   assert.equal(teaser.count,6,width+' needs six Historie teasers');
   assert.deepEqual(teaser.views,views,'Historie teaser order');
   assert.deepEqual(teaser.titles,['Jahrbuch','Runden','Schlüsselmomente','Rekordbuch','Teilnehmerfeld','Jahresvergleich']);
   assert.equal(teaser.statisticTeaserCount,6,'Existing statistic teaser untouched');
   assert.equal(teaser.sameStyle,true,'Historie and Statistik teaser must reuse the identical CSS');
   assert.equal(teaser.oldYearSelector,false,'Old home-year dropdown removed');
   assert.equal(teaser.oldYearSection,false,'Old year section removed');
   assert.equal(teaser.overflows,false,'No mobile horizontal overflow');
   assert.equal(teaser.cols,2,'All linked teaser cards use the same two-column layout');
   assert.ok(teaser.buttonWidths.every(x=>x>90),'Teaser tiles must be readable');
   for(const src of teaser.images)assert.ok(src?.startsWith('assets/icons/')&&src.endsWith('.svg'),'Gold SVG icons needed');
   for(const view of views){
    // Return by normal in-app navigation each time, then choose exactly one direct teaser.
    if(await page.evaluate(()=>state.page)!=='home')await page.evaluate(()=>{state.page='home';draw();window.scrollTo(0,0)});
    await page.locator('.discovery-history-teaser [data-value="'+view+'"]').click();
    assert.equal(await page.evaluate(()=>state.page),'history',view+' should navigate to Historie');
    assert.equal(await page.locator('.history-entry-tile[aria-pressed="true"]').getAttribute('data-view'),view,view+' should activate matching view');
    assert.equal(await page.locator('.history-entry-tile[aria-pressed="true"]').getAttribute('data-view'),view,view+' tile should become active');
    assert.equal(await page.locator('.history-dropdown-controls select').count(),1,'Only Turnierjahr dropdown intact');
    assert.equal(await page.locator('#history-view-select').count(),0,'Redundant Ansicht dropdown removed');
    assert.equal(await page.locator('.history-carousel-control,.history-replay-control').count()>0,true,'Existing slider intact');
    assert.equal(await page.locator('.history-related').count(),0,'No separate Hall of Fame/Spieler section on Historie');
   }
   // Verify that a teaser leads down to the existing work area, not merely to page top.
   await page.evaluate(()=>{state.page='home';draw();window.scrollTo(0,0)});
   await page.locator('.discovery-history-teaser [data-value="records"]').click();
   await page.waitForTimeout(1100);
   const scroll=await page.evaluate(()=>{
     const target=document.getElementById('history-workspace'),header=document.querySelector('.heritage-header');
     const offset=(header?.getBoundingClientRect().height||0)+12;
     const desired=Math.max(0,scrollY+target.getBoundingClientRect().top-offset);
     const limit=Math.max(0,document.documentElement.scrollHeight-innerHeight);
     return {actual:scrollY,expected:Math.min(desired,limit)};
   });
   assert.ok(scroll.actual>40,'Historie teaser should scroll down to tools');
   assert.ok(Math.abs(scroll.actual-scroll.expected)<35,'Historie teaser scroll should land at dropdowns');
   assert.deepEqual(errors,[],'No page errors');
   console.log('HOME_HISTORY_TEASER_PASS',JSON.stringify({width,views:teaser.count,cols:teaser.cols,scroll}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(err=>{console.error('HOME_HISTORY_TEASER_FAIL',err);process.exit(1)});
