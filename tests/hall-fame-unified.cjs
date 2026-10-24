const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,390,768]){
   const page=await browser.newPage({viewport:{width,height:900},isMobile:width<500,hasTouch:width<500});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8765/#fame',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('.page--fame .podium')&&document.querySelector('.page--fame table.bp-stat-personalized-table'),null,{timeout:30000});
   const podium=page.locator('.page--fame .podium > .podium-card');
   assert.equal(await podium.count(),3,'all three podium ranks');
   assert.deepEqual(await podium.evaluateAll(els=>els.map(e=>e.querySelector('small')?.textContent?.trim())),['RANG 2','RANG 1','RANG 3'],'podium order: 2 left, 1 center, 3 right');
   const boxes=await podium.evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,height:r.height}}));
   assert(boxes[0].x<boxes[1].x&&boxes[1].x<boxes[2].x,'podium remains horizontal');
   assert(boxes[1].height>boxes[0].height&&boxes[0].height>boxes[2].height,'winner is tallest');
   const hall=page.locator('.page--fame');
   const main=hall.locator('.card').filter({has:page.locator('table.bp-unified-table')}).first();
   assert(await main.locator('.bp-stat-columns').count()===1,'Hall main ranking has column picker');
   const picker=main.locator('.bp-stat-columns');
   assert((await picker.locator('summary').innerText()).includes('sichtbar'),'column count shown');
   await picker.locator('summary').click();
   const options=picker.locator('.bp-stat-column-choice');
   assert((await options.count())>=3,'column choices available');
   assert(await options.first().isDisabled(),'first column is fixed');
   const table=main.locator('table.bp-stat-personalized-table');
   const cells=table.locator('thead tr th');
   const second=await cells.nth(1).textContent();
   await options.nth(1).click();
   assert(await cells.nth(1).getAttribute('data-bp-column-hidden')!==null,'second column hidden');
   await options.nth(1).click();
   assert(await cells.nth(1).getAttribute('data-bp-column-hidden')===null,'second column restored');
   const record=hall.locator('.hof-record').first();
   await record.locator('details').first().locator('summary').first().click();
   await page.waitForFunction(()=>document.querySelector('.page--fame .hof-record table.bp-stat-personalized-table'));
   assert.equal(await record.locator('.bp-stat-columns').count(),1,'record rankings also get picker');
   const rootBg=await hall.locator('.hof-extended').evaluate(el=>getComputedStyle(el).backgroundImage);
   assert(rootBg.includes('gradient'),'record book uses green heritage gradient, not cream');
   assert(errors.length===0,'no browser errors: '+errors.join('; '));
   console.log('HALL_FAME_UNIFIED_OK width='+width+' podium=2-1-3 columns='+await options.count()+' head='+second.trim());
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error('HALL_FAME_UNIFIED_FAILURE',e);process.exit(1)});
