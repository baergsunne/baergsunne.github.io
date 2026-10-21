const{chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,375,390,430,768,1024]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:width<700,hasTouch:true});
   const errors=[];page.on('pageerror',err=>errors.push(err.message));
   for(const path of ['live','editions'])await page.route('**/api/'+path,async route=>{
    try{
     const response=await route.fetch({headers:{...route.request().headers(),origin:'https://baergsunne.github.io'}});
     await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':'http://127.0.0.1:8765'}});
    }catch(e){if(!page.isClosed())try{await route.abort()}catch(_){}}
   });
   await page.goto('http://127.0.0.1:8765/#stats',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(x=>x.year===2026),null,{timeout:30000});
   const actual=await page.evaluate(()=>{
    const getStyles=(grid,tile)=>{
     const t=getComputedStyle(tile),g=getComputedStyle(grid);
     const i=getComputedStyle(tile.querySelector('.tool-tile-symbol')),p=getComputedStyle(tile.querySelector('.tool-tile-copy'));
     const title=getComputedStyle(tile.querySelector('.tool-tile-copy strong')),detail=getComputedStyle(tile.querySelector('.tool-tile-copy small'));
     const arrow=getComputedStyle(tile.querySelector('.tool-tile-arrow'));
     const symbol=tile.querySelector('.tool-tile-symbol .bp-icon'),si=symbol?getComputedStyle(symbol):null;
     return {
      grid:{cols:g.gridTemplateColumns.split(' ').length,gap:g.gap,align:g.alignItems},
      tile:{display:t.display,background:t.backgroundColor,border:t.borderTopColor,borderWidth:t.borderTopWidth,
       borderRadius:t.borderTopLeftRadius,padding:t.padding,flexDirection:t.flexDirection,align:t.alignItems,
       gap:t.gap,minHeight:t.minHeight,color:t.color,textAlign:t.textAlign,boxSizing:t.boxSizing},
      icon:{width:i.width,flex:i.flex,height:i.height,fontSize:i.fontSize,filter:si?.filter,imgWidth:si?.width,imgHeight:si?.height},
      copy:{display:p.display,flex:p.flex,gap:p.gap},
      title:{fontSize:title.fontSize,lineHeight:title.lineHeight,fontWeight:title.fontWeight},
      detail:{fontSize:detail.fontSize,lineHeight:detail.lineHeight,color:detail.color},
      arrow:{display:arrow.display,color:arrow.color}
     }
    };
    state.page='stats';state.tab='overview';draw();
    const sGrid=document.querySelector('.tool-group .tool-grid'),sTiles=[...sGrid.querySelectorAll('.tool-tile')];
    const stats={active:getStyles(sGrid,sTiles.find(x=>x.classList.contains('is-active'))),
     regular:getStyles(sGrid,sTiles.find(x=>!x.classList.contains('is-active')))};
    state.page='history';state.historyYear=2026;draw();
    const hGrid=document.querySelector('.history-entry-grid'),hTiles=[...hGrid.querySelectorAll('.history-entry-tile')];
    const entries=hTiles.map(x=>({name:x.querySelector('.tool-tile-copy strong')?.textContent,src:x.querySelector('img.bp-icon')?.getAttribute('src')}));
    const hist={active:getStyles(hGrid,hTiles.find(x=>x.classList.contains('is-active'))),
     regular:getStyles(hGrid,hTiles.find(x=>!x.classList.contains('is-active')))};
    return {stats,hist,count:hTiles.length,entries,scrollOverflow:document.documentElement.scrollWidth>innerWidth+2,
     beyondHist:hTiles.some(x=>x.getBoundingClientRect().width<70),
     separateLinks:document.querySelectorAll('.history-related-link').length};
   });
   assert.equal(actual.count,6,width+' exactly six Historie choices');
   assert.equal(await page.locator('#history-view-select').count(),0,width+' no redundant Ansicht dropdown');
   assert.equal(await page.locator('.history-dropdown-controls select').count(),1,width+' Turnierjahr remains sole dropdown');
   assert.equal(actual.separateLinks,0,width+' removed Hall of Fame/Spieler crosslinks');
   assert.equal(actual.scrollOverflow,false,width+' unexpected horizontal overflow');
   assert.equal(actual.beyondHist,false,width+' Historie entries too narrow');
   // Historie and Statistiken still share exactly the same grid, card
   // dimensions, typography, icons and controls. Only the statistics card
   // surface may be slightly raised/tinted, by explicit design approval.
   for(const kind of ['active','regular']){
    const neutralize=x=>({...x,tile:{...x.tile,background:undefined}});
    assert.deepEqual(neutralize(actual.hist[kind]),neutralize(actual.stats[kind]),
      width+' must preserve the same grid/typography and geometry ('+kind+')');
   }
   for(const entry of actual.entries){assert.ok(entry.src?.startsWith('assets/icons/')&&entry.src.endsWith('.svg'),entry.name+' must use original SVG icon');}
   await page.locator('.history-entry-tile[data-view="records"]').click();
   assert.equal(await page.locator('.history-entry-tile[aria-pressed="true"]').getAttribute('data-view'),'records','Linked Rekordbuch opens');
   await page.locator('.history-entry-tile[data-view="moments"]').click();
   assert.equal(await page.locator('.history-entry-tile[aria-pressed="true"]').getAttribute('data-view'),'moments','Linked Schlüsselmomente opens');
   assert.deepEqual(errors,[],width+' no browser errors');
   console.log('HISTORY_STATS_TILE_PARITY_PASS',JSON.stringify({width,tiles:actual.count,columns:actual.hist.regular.grid.cols}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(err=>{console.error('HISTORY_STATS_TILE_PARITY_FAIL',err);process.exit(1)});
