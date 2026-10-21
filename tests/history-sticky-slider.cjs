/* Mobile Historie: title-only sticky, separate right-side rail; desktop unchanged. */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const fixture=require('./fixture-2026.json');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,375,390,430,650,768]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:width<=430,hasTouch:width<=430});
   await page.emulateMedia({reducedMotion:'reduce'});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/api/editions',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
   await page.route('**/api/live',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({year:2026,status:'planned',players:[],standings:[],rounds:[]})}));
   await page.goto('http://127.0.0.1:8765/#history',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(e=>e.year===2026),null,{timeout:15000});
   for(const view of ['yearbook','replay','moments','records','field','compare']){
    await page.locator('.history-entry-tile[data-view="'+view+'"]').click();
    if(width<=650)await page.locator('.history-mobile-rail.is-active').waitFor({timeout:10000});
    const report=await page.evaluate(()=>{
     const root=document.getElementById('history-chronicle'),group=root.querySelector('.history-sticky-group'),ctrl=group.querySelector('.history-carousel-control');
     const head=group.querySelector('.history-sticky-title'),rail=root.querySelector(':scope > .history-mobile-rail'),track=rail.querySelector('.history-mobile-track');
     const h=document.querySelector('.heritage-header'),r=rail.getBoundingClientRect(),body=root.getBoundingClientRect(),title=head.getBoundingClientRect();
     const native=ctrl.querySelector('input[type=range]'),chosen=root.querySelector('.history-entry-tile[aria-pressed=true]')?.dataset.view;
     return {chosen,yearSelects:root.querySelectorAll('.history-dropdown-controls select').length,
      title:head.textContent.trim(),titleCount:group.querySelectorAll('h3').length,
      groupPosition:getComputedStyle(group).position,groupTop:group.getBoundingClientRect().top,
      wantedTop:parseFloat(getComputedStyle(group).top),headerBottom:h.getBoundingClientRect().bottom,
      titleHeight:title.height,titleColor:getComputedStyle(head).backgroundColor,
      oldVisible:getComputedStyle(ctrl).display!=='none',
      railDisplay:getComputedStyle(rail).display,active:rail.classList.contains('is-active'),
      visible:getComputedStyle(rail).visibility,
      railRight:r.right,railLeft:r.left,railWidth:r.width,railTop:r.top,railBottom:r.bottom,viewport:innerWidth,
      touchAction:getComputedStyle(track).touchAction,rangeCount:group.querySelectorAll('input[type=range]').length,
      buttonCount:rail.querySelectorAll('button').length,arrowSymbols:[...rail.querySelectorAll('button span')].map(x=>x.textContent),
      nativeId:native.id,trackOrientation:track.getAttribute('aria-orientation'),
      overflow:document.documentElement.scrollWidth-innerWidth,
      railAfterSticky:group.nextElementSibling===rail,bodyRight:body.right};
    });
    assert.equal(report.chosen,view);
    assert.equal(report.yearSelects,1);
    assert.equal(report.titleCount,1);
    assert.equal(report.rangeCount,1,'Keep original slider for desktop and programmatic selection');
    assert.equal(report.groupPosition,'sticky');
    assert(report.title.startsWith(({yearbook:'Jahrbuch',replay:'Runden',moments:'Schlüsselmomente',records:'Rekordbuch',field:'Teilnehmerfeld',compare:'Jahresvergleich'})[view]));
    assert(Math.abs(report.wantedTop-report.headerBottom-8)<5,'Sticky title stays below header');
    assert.equal(report.overflow<=2,true,'No horizontal scrolling');
    if(width<=650){
     assert.equal(report.oldVisible,false,'Horizontal slider hidden on mobile');
     assert.equal(report.active,true,'Side rail visible in the workspace');
     assert.equal(report.visible,'visible');
     assert.equal(report.railWidth,44,'44px touch strip around slim visual track');
     assert(report.railRight<=width+1&&report.railLeft>=width-49,'Right-hand thumb position');
     assert.equal(report.railAfterSticky,true);
     assert.equal(report.touchAction,'none','Only the vertical track captures the swipe');
     assert.deepEqual(report.arrowSymbols,['›','‹'],'Right arrow advances, left arrow returns');
     assert.equal(report.trackOrientation,'vertical');
     assert(report.titleHeight>=43&&report.titleHeight<70);
     assert.equal(report.buttonCount,2);
     assert.equal(report.titleColor,'rgba(0, 0, 0, 0)');
     const sc=await page.evaluate(()=>window.scrollY);
     await page.evaluate(()=>window.scrollBy({top:140,behavior:'instant'}));
     await page.waitForTimeout(30);
     const after=await page.evaluate(()=>window.scrollY);
     if(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight+scrollY+80))assert(after>sc+35,'Scroll outside narrow rail remains native');
    }else{
     assert.equal(report.oldVisible,true,'Desktop keeps horizontal control');
     assert.equal(report.railDisplay,'none','Desktop rail hidden');
    }
   }
   assert.deepEqual(errors,[],width+' runtime errors');
   console.log('HISTORY_STICKY_THUMB_SUCCESS',width);
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('HISTORY_STICKY_THUMB_FAILURE',e);process.exit(1)});
