/* Historie: a natural horizontal regulator docks to the side only at sticky threshold. */
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
   await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(x=>x.year===2026),null,{timeout:15000});
   const measure=()=>page.evaluate(()=>{
    const root=document.querySelector('.history-chronicle'),group=root.querySelector('.history-sticky-group'),
    ctrl=group.querySelector('.history-carousel-control'),rail=root.querySelector('.history-mobile-rail'),
    header=document.querySelector('.heritage-header'),title=group.querySelector('.history-sticky-title');
    const r=rail.getBoundingClientRect(),g=group.getBoundingClientRect();
    return {title:title.textContent.trim(),groupHeight:g.height,position:getComputedStyle(group).position,
      stickyTop:parseFloat(getComputedStyle(group).top),headerBottom:header.getBoundingClientRect().bottom,
      horizontal:getComputedStyle(ctrl).display!=='none',docked:group.classList.contains('is-docked'),
      active:rail.classList.contains('is-active'),visible:getComputedStyle(rail).visibility,
      railWidth:r.width,railRight:r.right,railLeft:r.left,orientation:rail.querySelector('.history-mobile-track').getAttribute('aria-orientation'),
      titleCount:group.querySelectorAll('h3').length,yearInputs:root.querySelectorAll('.history-dropdown-controls select').length,
      sliders:group.querySelectorAll('input[type=range]').length,overflow:document.documentElement.scrollWidth-innerWidth};
   });
   for(const view of ['yearbook','replay','moments','records','field','compare']){
    await page.locator('.history-entry-tile[data-view="'+view+'"]').click();
    await page.evaluate(()=>{
     const d=document.querySelector('.history-dropdown-controls'),g=document.querySelector('.history-sticky-group');
     const target=scrollY+d.getBoundingClientRect().bottom+18-parseFloat(getComputedStyle(g).top)-62;
     scrollTo({top:Math.max(0,target),behavior:'instant'});
    });
    await page.waitForTimeout(80);
    const before=await measure();
    assert.equal(before.yearInputs,1);
    assert.equal(before.titleCount,1);
    assert.equal(before.sliders,1);
    assert.equal(before.position,'sticky');
    assert(before.title.startsWith(({yearbook:'Jahrbuch',replay:'Runden',moments:'Schlüsselmomente',records:'Rekordbuch',field:'Teilnehmerfeld',compare:'Jahresvergleich'})[view]));
    assert(Math.abs(before.stickyTop-before.headerBottom-8)<5);
    assert(before.overflow<=2);
    assert.equal(before.horizontal,true,view+' original horizontal regulator visible before sticky threshold');
    if(width<=650){
     assert.equal(before.active,false,view+' rail must not overlap filters or cards before docking');
     assert.equal(before.docked,false);
     await page.evaluate(()=>{
      const d=document.querySelector('.history-dropdown-controls'),g=document.querySelector('.history-sticky-group');
      scrollTo({top:Math.max(0,scrollY+d.getBoundingClientRect().bottom+18-parseFloat(getComputedStyle(g).top)+70),behavior:'instant'});
     });
     await page.waitForFunction(()=>document.querySelector('.history-mobile-rail')?.classList.contains('is-active'),null,{timeout:5000});
     const docked=await measure();
     assert.equal(docked.horizontal,false,'Horizontal rail replaced when docked');
     assert.equal(docked.docked,true);
     assert.equal(docked.visible,'visible');
     assert(docked.groupHeight>=44&&docked.groupHeight<73,'Only compact title sticks');
     assert.equal(docked.railWidth,44);
     assert(docked.railRight<=width-14,'Thumb rail inset from physical edge');
     assert.equal(docked.orientation,'vertical');
     await page.evaluate(()=>{
      const d=document.querySelector('.history-dropdown-controls'),g=document.querySelector('.history-sticky-group');
      scrollTo({top:Math.max(0,scrollY+d.getBoundingClientRect().bottom+18-parseFloat(getComputedStyle(g).top)-75),behavior:'instant'});
     });
     await page.waitForTimeout(90);
     const restored=await measure();
     assert.equal(restored.docked,false,'Horizontal regulator returns when scrolling back');
     assert.equal(restored.horizontal,true);
    }else{
     assert.equal(before.horizontal,true,'Tablet/desktop keep the horizontal slider');
     assert.equal(before.active,false,'Desktop rail inactive');
    }
   }
   assert.deepEqual(errors,[],width+' runtime errors');
   console.log('HISTORY_DOCKED_STICKY_PASS',width);
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('HISTORY_DOCKED_STICKY_FAIL',e);process.exit(1)});
