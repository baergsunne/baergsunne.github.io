/* Regression: changing Historie year never rebuilds #app or snaps the page. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fixture=require('./fixture-2026.json');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,390,430]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
   await page.emulateMedia({reducedMotion:'reduce'});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/api/editions',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
   await page.route('**/api/live',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'planned',players:[],rounds:[],standings:[]})}));
   await page.goto('http://127.0.0.1:8765/#history',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(x=>x.year===2026),null,{timeout:15000});
   async function dock(){
    await page.evaluate(()=>{
     const dropdown=document.querySelector('.history-dropdown-controls'),group=document.querySelector('.history-sticky-group');
     const sticky=Number.parseFloat(getComputedStyle(group).top)||0;
     scrollTo({top:Math.max(0,scrollY+dropdown.getBoundingClientRect().bottom+18-sticky+75),behavior:'instant'});
    });
    // Shorter entry cards can leave too little scroll room to dock the
    // side rail. The horizontal arrows remain accessible in that case.
    await page.waitForTimeout(70);
   }
   async function step(direction){
    const active=await page.locator('.history-mobile-rail.is-active').isVisible().catch(()=>false);
    const selector=active?'.history-mobile-step--'+(direction>0?'next':'prev'):
      '.history-sticky-group .history-step-button[data-history-step="'+direction+'"]';
    await page.locator(selector).click();
   }
   async function remember(){
    await page.evaluate(()=>{
     const root=document.getElementById('history-chronicle');
     window.__stableHistorie={
      root,group:root.querySelector(':scope > .history-sticky-group'),
      rail:root.querySelector(':scope > .history-mobile-rail'),
      dropdown:root.querySelector('#history-year-select'),app:document.getElementById('app'),
      y:scrollY,titleTop:root.querySelector('.history-sticky-group').getBoundingClientRect().top,
      docked:root.querySelector('.history-mobile-rail').classList.contains('is-active')
     };
    });
   }
   async function verify(view,expectedYear,step){
    const state=await page.evaluate(()=>{
     const old=window.__stableHistorie,root=document.getElementById('history-chronicle'),group=root.querySelector('.history-sticky-group');
     const active=root.querySelector('.history-carousel-slide:not([inert]) [data-year]')?.dataset.year;
     const range=root.querySelector('.history-carousel-track,.history-replay-track');
     return {
      rootSame:old.root===root,appSame:old.app===document.getElementById('app'),
      headingSame:old.group===group,railSame:old.rail===root.querySelector('.history-mobile-rail'),
      dropdownSame:old.dropdown===root.querySelector('#history-year-select'),
      moved:scrollY-old.y,headerDelta:group.getBoundingClientRect().top-old.titleTop,
      docked:root.querySelector('.history-mobile-rail').classList.contains('is-active'),
      previousDocked:old.docked,
      selected:Number(root.querySelector('#history-year-select').value),globalYear:state.historyYear,
      activeYear:active?Number(active):null,
      yearCount:root.querySelectorAll('.history-carousel-slide').length,
      roundCount:root.querySelectorAll('.history-replay-slide').length,
      activeRound:range?.dataset.index
     };
    });
    assert(state.rootSame&&state.appSame&&state.headingSame&&state.railSame&&state.dropdownSame,
      width+' '+view+' '+step+' unexpected DOM rebuild: '+JSON.stringify(state));
    assert(Math.abs(state.moved)<=2,width+' '+view+' '+step+' page jumped vertically '+JSON.stringify(state));
    assert(Math.abs(state.headerDelta)<=2,width+' '+view+' '+step+' sticky heading moved '+JSON.stringify(state));
    assert(state.docked===state.previousDocked,width+' '+view+' '+step+' dock should not toggle');
    assert.equal(state.selected,expectedYear,width+' '+view+' '+step+' year dropdown');
    assert.equal(state.globalYear,expectedYear,width+' '+view+' '+step+' global year');
    if(!['replay','moments'].includes(view))assert.equal(state.activeYear,expectedYear);
    else assert(state.roundCount>0);
   }
   for(const view of ['yearbook','records','field','compare','replay','moments']){
    await page.locator('.history-entry-tile[data-view="'+view+'"]').click();
    await dock();
    await remember();
    await page.locator('#history-year-select').selectOption('2025');
    await page.waitForTimeout(50);
    await verify(view,2025,'year-dropdown');
    if(!['replay','moments'].includes(view)){
     await remember();
     await step(1);
     await page.waitForFunction(()=>document.querySelector('#history-year-select')?.value==='2026',null,{timeout:3000});
     await verify(view,2026,'next-arrow');
     await remember();
     await step(-1);
     await page.waitForFunction(()=>document.querySelector('#history-year-select')?.value==='2025');
     await verify(view,2025,'previous-arrow');
     await remember();
     await page.locator('#history-year-slider').evaluate(el=>{
      const v=Math.max(0,Number(el.value)-1);el.value=String(v);
      el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));
     });
     await page.waitForTimeout(80);
     await verify(view,2024,'range-control');
    }else{
     // New round data may replace the cards; the sticky shell must not be replaced.
     await remember();
     await step(1);
     await page.waitForFunction(()=>Number(document.querySelector('.history-replay-track')?.dataset.index)===1);
     await verify(view,2025,'round-arrow');
    }
    console.log('HISTORY_YEAR_NO_JUMP_VIEW',JSON.stringify({width,view}));
   }
   assert.deepEqual(errors,[],width+' page errors');
   await page.close();
  }
  // Normal 850-ms carousel transition should still preserve the same page nodes.
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await page.route('**/api/editions',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
  await page.route('**/api/live',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'planned',players:[],rounds:[],standings:[]})}));
  await page.goto('http://127.0.0.1:8765/#history',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(x=>x.year===2026));
  await page.evaluate(()=>{
   const d=document.querySelector('.history-dropdown-controls'),g=document.querySelector('.history-sticky-group');
   scrollTo({top:Math.max(0,scrollY+d.getBoundingClientRect().bottom+18-parseFloat(getComputedStyle(g).top)+75),behavior:'instant'});
  });
  await page.locator('.history-mobile-rail.is-active').waitFor();
  const before=await page.evaluate(()=>{window.__root=document.querySelector('#history-chronicle');return scrollY;});
  await page.locator('.history-mobile-step--prev').click();
  await page.waitForFunction(()=>document.querySelector('#history-year-select')?.value==='2025',null,{timeout:4000});
  const result=await page.evaluate(()=>({same:window.__root===document.querySelector('#history-chronicle'),scrollDiff:scrollY}));
  assert(result.same&&Math.abs(result.scrollDiff-before)<=2,'Animated year change should not rebuild or snap the page: '+JSON.stringify(result));
  console.log('HISTORY_YEAR_NO_JUMP_ANIMATED_PASS');
  await page.close();
 }finally{await browser.close()}
})().catch(e=>{console.error('HISTORY_YEAR_NO_JUMP_FAIL',e);process.exit(1)});
