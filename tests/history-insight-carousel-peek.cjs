const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,375,390,430,768]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:width<600,hasTouch:true});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   for(const path of ['live','editions'])await page.route('**/api/'+path,async route=>{
    try{
     const response=await route.fetch({headers:{...route.request().headers(),origin:'https://baergsunne.github.io'}});
     await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':'http://127.0.0.1:8765'}});
    }catch(e){if(!page.isClosed())try{await route.abort()}catch(_){}}
   });
   await page.goto('http://127.0.0.1:8765/#history',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(e=>e.year===2026),null,{timeout:30000});
   const measure=()=>page.evaluate(()=>{
    const viewport=document.querySelector('.history-carousel-viewport');
    const slides=[...viewport?.querySelectorAll('.history-carousel-slide')||[]];
    const selected=slides.findIndex(el=>el.querySelector('[data-year]')?.dataset.year==='2019');
    if(!viewport||selected<1||selected>=slides.length-1)return {error:'No viewport or middle year',selected};
    const [prev,active,next]=[slides[selected-1],slides[selected],slides[selected+1]];
    const v=viewport.getBoundingClientRect(),a=active.getBoundingClientRect(),
      left=prev.getBoundingClientRect(),right=next.getBoundingClientRect();
    const shared=slides[0].offsetWidth,card=active.querySelector('[data-year]'),
      clip=(item)=>Math.max(0,Math.min(item.right,v.right)-Math.max(item.left,v.left));
    return {selected,year:card?.dataset.year,slideWidth:shared,viewportWidth:v.width,
     center:Math.abs((a.left+a.right-v.left-v.right)/2),
     prevPeek:clip(left),nextPeek:clip(right),prevYear:prev.querySelector('[data-year]')?.dataset.year,
     nextYear:next.querySelector('[data-year]')?.dataset.year,
     gap:parseFloat(getComputedStyle(viewport.querySelector('.history-carousel-track')).columnGap),
     overflow:document.documentElement.scrollWidth>innerWidth+2,
     slider:document.querySelector('#history-year-slider')?.value};
   });
   const open=async view=>{
    await page.locator('.history-entry-tile[data-view="'+view+'"]').click();
    await page.locator('#history-year-select').selectOption('2019');
    await page.waitForTimeout(120);
    return measure();
   };
   const reference=await open('yearbook');
   assert.equal(reference.year,'2019','Jahrbuch baseline at a middle year');
   assert.ok(reference.center<4,'Jahrbuch must be centered');
   assert.ok(reference.prevPeek>1&&reference.nextPeek>1,width+' Jahrbuch should show adjacent years');
   assert.ok(reference.viewportWidth-reference.slideWidth>22,'Jahrbuch must remain narrower than carousel viewport');
   for(const view of ['records','field','compare']){
    const actual=await open(view);
    assert.equal(actual.year,'2019',view+' selected year');
    assert.equal(actual.slideWidth,reference.slideWidth,width+' '+view+' slide width equals Jahrbuch, including narrow breakpoints');
    assert.equal(actual.gap,reference.gap,width+' '+view+' carousel spacing equals Jahrbuch');
    assert.ok(actual.center<4,width+' '+view+' active card must be centered: '+JSON.stringify(actual));
    assert.ok(actual.prevPeek>1&&actual.nextPeek>1,width+' '+view+' must visibly show left and right neighboring years: '+JSON.stringify(actual));
    assert.ok(Math.abs(actual.prevPeek-reference.prevPeek)<4,width+' '+view+' left neighbor amount matches Jahrbuch');
    assert.ok(Math.abs(actual.nextPeek-reference.nextPeek)<4,width+' '+view+' right neighbor amount matches Jahrbuch');
    assert.equal(actual.prevYear,reference.prevYear,'Same left adjacent year');
    assert.equal(actual.nextYear,reference.nextYear,'Same right adjacent year');
    assert.equal(actual.overflow,false,'No horizontal page overflow');
    assert.equal(await page.locator('.history-carousel-slide').count(),17,'All historical years preserved');
    const slider=page.locator('#history-year-slider');
    const index=Number(await slider.inputValue());
    await slider.evaluate((node,value)=>{
     node.value=String(value+1);
     node.dispatchEvent(new Event('input',{bubbles:true}));
     node.dispatchEvent(new Event('change',{bubbles:true}));
    },index);
    await page.waitForTimeout(1050);
    assert.equal(await page.locator('#history-year-select').inputValue(),actual.nextYear,'Slider opens next year for '+view);
    assert.equal(await page.locator('.history-entry-tile[aria-pressed="true"]').getAttribute('data-view'),view,'Slider retains '+view+' perspective');
   }
   assert.deepEqual(errors,[],'No JS errors');
   console.log('HISTORY_INSIGHT_PEEK_PASS',JSON.stringify({width,year:reference.year,slideWidth:reference.slideWidth,peekLeft:reference.prevPeek,peekRight:reference.nextPeek,views:3}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('HISTORY_INSIGHT_PEEK_FAIL',e);process.exit(1)});
