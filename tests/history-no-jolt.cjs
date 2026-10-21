/* Historie no-jolt regression: changing a year must never replace #app, group or rail. */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const fixture=require('./fixture-2026.json');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,390,430,768]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:width<=430,hasTouch:width<=430});
   await page.emulateMedia({reducedMotion:'reduce'});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/api/editions',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
   await page.route('**/api/live',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({year:2026,status:'planned',standings:[],players:[],rounds:[]})}));
   await page.goto('http://127.0.0.1:8765/#history',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(x=>x.year===2026),null,{timeout:15000});
   for(const view of ['yearbook','records','field','compare']){
    await page.locator('.history-entry-tile[data-view="'+view+'"]').click();
    await page.locator('#history-year-select').selectOption('2025');
    if(width<=430){
     await page.evaluate(()=>{
      const d=document.querySelector('.history-dropdown-controls'),g=document.querySelector('.history-sticky-group');
      window.scrollTo({top:Math.max(0,scrollY+d.getBoundingClientRect().bottom+18-parseFloat(getComputedStyle(g).top)+88),behavior:'instant'});
     });
     await page.locator('.history-mobile-rail.is-active').waitFor({timeout:6000});
    }else{
     await page.evaluate(()=>{
      const d=document.querySelector('.history-dropdown-controls'),g=document.querySelector('.history-sticky-group');
      window.scrollTo({top:Math.max(0,scrollY+d.getBoundingClientRect().bottom+18-parseFloat(getComputedStyle(g).top)+88),behavior:'instant'});
     });
    }
    await page.evaluate(()=>{
     window.__histStable={app:document.getElementById('app'),main:document.querySelector('main'),
      root:document.getElementById('history-chronicle'),group:document.querySelector('.history-sticky-group'),
      rail:document.querySelector('.history-mobile-rail'),track:document.querySelector('.history-carousel-track')};
    });
    const snapshot=()=>page.evaluate(()=>{
     const s=window.__histStable,g=document.querySelector('.history-sticky-group'),rail=document.querySelector('.history-mobile-rail');
     return {sameApp:s.app===document.getElementById('app'),sameMain:s.main===document.querySelector('main'),
      sameRoot:s.root===document.getElementById('history-chronicle'),sameGroup:s.group===g,
      sameRail:s.rail===rail,sameTrack:s.track===document.querySelector('.history-carousel-track'),
      scrollY:scrollY,scrollMax:document.documentElement.scrollHeight-innerHeight,
      groupTop:g.getBoundingClientRect().top,groupHeight:g.getBoundingClientRect().height,
      railActive:rail.classList.contains('is-active'),docked:g.classList.contains('is-docked'),
      selected:document.getElementById('history-year-select')?.value,
      stateYear:state.historyYear,title:document.querySelector('#history-sticky-heading')?.textContent,
      trackIndex:Number(document.querySelector('.history-carousel-track')?.dataset.index),
      currentSlide:[...document.querySelectorAll('.history-carousel-slide')].findIndex(el=>!el.inert)};
    });
    const before=await snapshot();
    async function stableYear(year){
     await page.waitForFunction(year=>document.querySelector('#history-year-select')?.value===String(year),year,{timeout:5000});
     const now=await snapshot();
     for(const key of ['sameApp','sameMain','sameRoot','sameGroup','sameRail','sameTrack'])assert.equal(now[key],true,width+' '+view+' '+year+' DOM reference '+key);
     assert(Math.abs(now.scrollY-before.scrollY)<=2,width+' '+view+' '+year+' scroll jumped '+JSON.stringify({before:before.scrollY,after:now.scrollY}));
     assert(Math.abs(now.groupTop-before.groupTop)<=2,width+' '+view+' '+year+' sticky title jumped');
     assert.equal(now.groupHeight,before.groupHeight,'Title/control stage must retain height');
     assert.equal(now.railActive,before.railActive,'Do not hide/reopen side rail');
     assert.equal(now.docked,before.docked,'Dock state stable');
     assert.equal(now.selected,String(year));
     assert.equal(now.stateYear,year,'State updates without full draw');
     assert(now.title.endsWith(String(year)),'Sticky title shows year');
     assert.equal(now.trackIndex,now.currentSlide,'Active slide and index in sync');
    }
    if(width<=430)await page.locator('.history-mobile-step--prev').click();
    else await page.locator('.history-step-button[data-history-step="-1"]').click();
    await stableYear(2024);
    await page.locator('#history-year-select').selectOption('2017');
    await stableYear(2017);
    const range=page.locator('#history-year-slider');
    await range.evaluate(el=>{el.value=String(Number(el.value)+1);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
    await stableYear(2018);
    console.log('HISTORY_NO_JOLT_VIEW_OK',JSON.stringify({width,view,year:2018,docked:before.docked,scroll:before.scrollY}));
   }
   assert.deepEqual(errors,[],width+' runtime errors');
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('HISTORY_NO_JOLT_FAILURE',e);process.exit(1)});
