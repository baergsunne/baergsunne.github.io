const {chromium}=require('playwright');
const assert=require('node:assert/strict');

(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,375,390,430]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
   const errors=[];
   page.on('pageerror',err=>errors.push(err.message));
   for(const path of ['live','editions'])await page.route('**/api/'+path,async route=>{
    try{
     const response=await route.fetch({headers:{...route.request().headers(),origin:'https://baergsunne.github.io'}});
     await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':'http://127.0.0.1:8765'}});
    }catch(err){if(!page.isClosed())try{await route.abort()}catch(_){}}
   });
   await page.goto('http://127.0.0.1:8765/#history',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(x=>x.year===2026),null,{timeout:30000});
   const prev=()=>page.locator('.history-mobile-rail .history-mobile-step[data-history-mobile-step="-1"]');
   const next=()=>page.locator('.history-mobile-rail .history-mobile-step[data-history-mobile-step="1"]');
   const state=()=>page.evaluate(()=>{
    const group=document.querySelector('.history-sticky-group'),rail=document.querySelector('.history-mobile-rail'),year=!!group?.querySelector('#history-year-slider');
    const track=document.querySelector(year?'.history-carousel-track':'.history-replay-track');
    const slides=track?.children.length||0;
    const current=Number(track?.dataset.index),left=rail?.querySelector('[data-history-mobile-step="-1"]'),
      right=rail?.querySelector('[data-history-mobile-step="1"]'),range=group?.querySelector('input[type=range]');
    return {year,slides,current,range:Number(range?.value),title:group?.querySelector('#history-sticky-heading')?.textContent,
     texts:[left?.textContent?.trim(),right?.textContent?.trim()],
     labels:[left?.getAttribute('aria-label'),right?.getAttribute('aria-label')],
     disabled:[left?.disabled,right?.disabled],
     buttons:rail?.querySelectorAll('.history-mobile-step').length,
     height:Math.min(left?.getBoundingClientRect().height||0,right?.getBoundingClientRect().height||0),
     rangeWidth:rail?.querySelector('.history-mobile-track').getBoundingClientRect().width,
     overflow:document.documentElement.scrollWidth>innerWidth+2};
   });
   for(const view of ['yearbook','replay','moments','records','field','compare']){
    await page.locator('.history-entry-tile[data-view="'+view+'"]').click();
    await page.locator('#history-year-select').selectOption('2026');
    await page.waitForTimeout(180);
    await page.evaluate(()=>{const marker=document.getElementById('history-workspace');window.scrollTo({top:Math.max(0,scrollY+marker.getBoundingClientRect().top-110),behavior:'instant'});});
    await page.locator('.history-mobile-rail.is-active').waitFor({timeout:5000});
    const round=view==='replay'||view==='moments';
    // Runden und Schlüsselmomente intentionally share the last chosen round.
    // Reset through the existing slider before verifying first-round boundaries.
    if(round){
     await page.locator('#history-round-slider').evaluate(el=>{
      el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));
      el.dispatchEvent(new Event('change',{bubbles:true}));
     });
     await page.waitForTimeout(950);
    }
    const start=await state();
    assert.equal(start.buttons,2,width+' '+view+' exactly two buttons');
    assert.deepEqual(start.texts,['‹','›'],width+' '+view+' narrow arrow-only labels');
    assert.ok(start.labels.every(x=>x&&/zurück|weiter/i.test(x)),width+' '+view+' descriptive accessible names');
    assert.ok(start.height>=43,width+' '+view+' 44px touch targets');
    assert.ok(start.rangeWidth>=44,width+' '+view+' vertical touch rail remains draggable');
    assert.equal(start.overflow,false,width+' '+view+' no horizontal overflow');
    if(round){
     assert.equal(start.year,false);
     assert.equal(start.current,0,width+' '+view+' first round initially');
     assert.deepEqual(start.disabled,[true,false],width+' '+view+' first round boundary');
     await next().click();
     await page.waitForTimeout(1000);
     let result=await state();
     assert.equal(result.current,1,width+' '+view+' one click moves exactly one round');
     assert.match(result.title,/Runde 2$/,width+' '+view+' sticky title follows round');
     await prev().click();
     await page.waitForTimeout(1000);
     result=await state();
     assert.equal(result.current,0,width+' '+view+' single backward click returns one round');
     assert.deepEqual(result.disabled,[true,false],width+' '+view+' first round remains bounded');
     await page.locator('#history-round-slider').evaluate(el=>{
      el.value=el.max;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));
     });
     await page.waitForTimeout(1000);
     result=await state();
     assert.equal(result.current,result.slides-1,width+' '+view+' slider reaches last round');
     assert.deepEqual(result.disabled,[false,true],width+' '+view+' last round boundary');
     await prev().click();await page.waitForTimeout(1000);
     const penultimate=await state();
     assert.equal(penultimate.current,result.current-1,width+' '+view+' click returns exactly one round from end');
    }else{
     assert.equal(start.year,true);
     assert.equal(start.current,start.slides-1,width+' '+view+' latest historical year');
     assert.deepEqual(start.disabled,[false,true],width+' '+view+' latest year boundary');
     await prev().click();await page.waitForTimeout(1000);
     let result=await state();
     assert.equal(result.current,start.current-1,width+' '+view+' one click one earlier year');
     assert.equal(await page.locator('#history-year-select').inputValue(),'2025',width+' '+view+' dropdown follows year');
     assert.match(result.title,/2025$/,width+' '+view+' sticky title follows year');
     await next().click();await page.waitForTimeout(1000);
     result=await state();
     assert.equal(result.current,start.current,width+' '+view+' one click one later year');
     assert.deepEqual(result.disabled,[false,true],width+' '+view+' last year button disabled');
     await page.locator('#history-year-select').selectOption('2007');
     await page.waitForTimeout(180);
     result=await state();
     assert.equal(result.current,0,width+' '+view+' earliest historical year');
     assert.deepEqual(result.disabled,[true,false],width+' '+view+' earliest year boundary');
     await next().click();await page.waitForTimeout(1000);
     result=await state();
     assert.equal(result.current,1,width+' '+view+' next from earliest year is one card only');
    }
    console.log('HISTORY_STEP_VIEW_PASS',JSON.stringify({width,view,slides:start.slides}));
   }
   assert.deepEqual(errors,[],width+' no script exceptions');
   await page.close();
  }
 }finally{await browser.close()}
})().catch(err=>{console.error('HISTORY_STEP_BUTTONS_FAIL',err);process.exit(1)});
