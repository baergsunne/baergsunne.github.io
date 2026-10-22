const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fixture=require('./fixture-2026.json');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    for(const width of [320,375,390,430,768]){
      const page=await browser.newPage({viewport:{width,height:844},isMobile:width<650,hasTouch:width<650});
      await page.emulateMedia({reducedMotion:'reduce'}); // Compare settled colors/shadows, not transition frames.
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/api/live',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'final',year:2026,players:fixture.editions[0].players,rounds:[],standings:fixture.editions[0].official_standings.map(x=>({player:x.player_id,rank:x.place,points:x.points}))})}));
      await page.route('**/api/editions',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
      await page.goto('http://127.0.0.1:8765/#stats',{waitUntil:'domcontentloaded'});
      await page.waitForSelector('.page--stats .tool-directory .tool-tile.is-active');
      const style=await page.evaluate(()=>{
        const tiles=[...document.querySelectorAll('.page--stats .tool-directory .tool-grid > button.tool-tile')];
        const active=tiles.find(t=>t.classList.contains('is-active'));
        const neutral=tiles.find(t=>!t.classList.contains('is-active'));
        const css=document.querySelector('link[href*="stats-tool-card-depth.css"]');
        const nonTool=document.querySelector('.page--stats .card');
        const innerShadow=nonTool?getComputedStyle(nonTool).boxShadow:null;
        const initial=tiles.map(t=>{
          const r=t.getBoundingClientRect();
          return {width:r.width,height:r.height,x:r.left,y:r.top};
        });
        // Disabling the new sheet must not affect box geometry, content cards
        // or the active state. This avoids accidental spacing and layout drift.
        css.disabled=true;
        const disabled=tiles.map(t=>{
          const r=t.getBoundingClientRect();
          return {width:r.width,height:r.height,x:r.left,y:r.top};
        });
        const shadowWithout=nonTool?getComputedStyle(nonTool).boxShadow:null;
        const baseline={gradient:getComputedStyle(neutral).backgroundImage,shadow:getComputedStyle(neutral).boxShadow};
        css.disabled=false;
        const a=getComputedStyle(active),n=getComputedStyle(neutral);
        return {
          count:tiles.length,active:active?.dataset.value||'',cssLoaded:!!css,
          colors:{activeBorder:a.borderTopColor,neutralBorder:n.borderTopColor},
          shadows:{active:a.boxShadow,neutral:n.boxShadow,nonTool:innerShadow,nonToolWithout:shadowWithout},
          backgrounds:{active:a.backgroundImage,neutral:n.backgroundImage,baseline:baseline.gradient},
          baselineShadow:baseline.shadow,
          activeBorderWidth:a.borderTopWidth,
          geomEqual:initial.every((r,i)=>Object.keys(r).every(k=>Math.abs(r[k]-disabled[i][k])<1)),
          columns:getComputedStyle(document.querySelector('.page--stats .tool-grid')).gridTemplateColumns.split(' ').length,
          overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
          otherPagesSelector:document.querySelectorAll(':is(.page--history,.page--players,.page--live) .tool-directory .tool-tile').length
        };
      });
      assert(style.cssLoaded,'Tile-only CSS must be loaded');
      assert(style.count>=10,'All statistics tool tiles must remain visible');
      assert.equal(style.active,'overview','The overview remains selected on the statistics landing page');
      assert.equal(style.colors.activeBorder,'rgb(232, 195, 126)','Selected tool must keep Bärgsunne gold border');
      assert(style.activeBorderWidth==='2px','Active border thickness preserved');
      assert(style.shadows.active!=='none'&&style.shadows.neutral!=='none','Active and inactive tool tiles must have subtle depth');
      assert(style.shadows.active.includes('rgba(0, 0, 0, 0.24)'),'Active tile uses a muted gold-frame shadow');
      assert(style.shadows.neutral.includes('rgba(0, 0, 0, 0.19)'),'Inactive tile has the new unified watermark elevation');
      assert.equal(style.shadows.neutral,style.baselineShadow,'Global shared card shadow must remain when only the statistics tile stylesheet is switched off');
      assert.equal(style.backgrounds.neutral,style.backgrounds.baseline,'Unified tile gradient persists without legacy local stylesheet');
      assert(style.backgrounds.neutral.includes('225deg')&&style.backgrounds.neutral.includes('rgb(51, 84, 62)'),'Diagonal gold highlight now runs from right to left over green');
      assert(style.backgrounds.active.includes('linear-gradient')&&style.backgrounds.neutral.includes('linear-gradient'),'Depth is supported by a restrained forest gradient');
      assert(style.geomEqual,'Tool grid dimensions and hit targets must remain unchanged');
      assert.equal(style.shadows.nonTool,style.shadows.nonToolWithout,'Result cards must not acquire the new tool shadow');
      assert.equal(style.columns,2,'Same 2-column design on mobile and desktop');
      assert(style.overflow<=1,width+'px: tool depth must not create horizontal overflow');
      await page.locator('.page--stats .tool-directory button.tool-tile[data-value="patterns"]').click();
      const after=await page.evaluate(()=>{
        const tile=document.querySelector('.page--stats .tool-tile[data-value="patterns"]');
        const before=document.querySelector('.page--stats .tool-tile[data-value="overview"]');
        const active=getComputedStyle(tile),inactive=getComputedStyle(before);
        return {tab:state.tab,active:tile?.classList.contains('is-active'),previous:before?.classList.contains('is-active'),activeBorder:active.borderTopColor,previousBorder:inactive.borderTopColor,
          selectedLabel:document.querySelector('.page--stats .tool-active-heading h2')?.textContent.trim()};
      });
      assert.equal(after.tab,'patterns','Tile navigation still opens the desired tool');
      assert(after.active&&!after.previous,'Gold highlight must follow selected tool');
      assert.equal(after.activeBorder,'rgb(232, 195, 126)','New selected card remains Bärgsunne gold');
      assert.notEqual(after.previousBorder,'rgb(232, 195, 126)','Previous card loses the selected border');
      assert(after.selectedLabel.includes('Muster-Finder'),'Tool content stays correctly associated with tile');
      assert.deepEqual(errors,[],'No browser errors');
      console.log('STATS_TILE_DEPTH_PASS',JSON.stringify({width,style,after}));
      await page.close();
    }
  }finally{await browser.close()}
})().catch(e=>{console.error('STATS_TILE_DEPTH_FAIL',e);process.exit(1)});
