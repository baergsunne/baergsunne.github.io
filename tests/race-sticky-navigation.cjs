const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fixture=require('./fixture-2026.json');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,375,390,430,768]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:width<620,hasTouch:true});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/api/live',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'final',year:2026,players:fixture.editions[0].players,rounds:[],standings:fixture.editions[0].official_standings.map(x=>({player:x.player_id,rank:x.place,points:x.points}))})}));
   await page.route('**/api/editions',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
   await page.goto('http://127.0.0.1:8765/#stats',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(e=>e.year===2026),null,{timeout:25000});
   await page.evaluate(()=>{state.page='stats';state.tab='race';state.year='all';state.historyYear=2026;state.raceRound=1;draw()});
   const initial=await page.evaluate(()=>{
     const container=document.querySelector('.page--stats .stat-content');
     const chooser=document.querySelector('.race-year-selection'),bar=document.querySelector('.race-sticky-control'),header=document.querySelector('.heritage-header'),slider=document.getElementById('raceslider');
     return {choice:!!chooser,bar:!!bar,header:!!header,slider:!!slider,year:document.getElementById('raceyear')?.value,round:slider?.value,
       isBarDirectChild:bar?.parentElement===container,
       isYearDirectChild:chooser?.parentElement===container,
       onlySlider:bar?.querySelectorAll('input[type=range]').length===1,
       buttons:[...bar?.querySelectorAll('button')||[]].map(b=>({text:b.textContent.trim(),disabled:b.disabled})),
       oldLargeButtons:document.querySelectorAll('.page--stats .buttonrow [data-action="racestep"]').length,
       stickyStyle:bar?getComputedStyle(bar).position:null,
       yearStickyStyle:chooser?getComputedStyle(chooser).position:null,
       navWidth:bar?.getBoundingClientRect().width,
       navClientWidth:bar?.clientWidth,
       navScrollWidth:bar?.scrollWidth,
       overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
   });
   assert(initial.choice&&initial.bar&&initial.header&&initial.slider,'Race needs year chooser + one slider navigation');
   assert(initial.isBarDirectChild&&initial.isYearDirectChild,'selector and slider are independent siblings of the ranking');
   assert(initial.onlySlider,'there is exactly one Race slider');
   assert.equal(initial.year,'2026');
   assert.equal(initial.round,'1');
   assert.deepEqual(initial.buttons,[{text:'‹ Zurück',disabled:true},{text:'Weiter ›',disabled:false}]);
   assert.equal(initial.oldLargeButtons,0,'the old two large buttons are gone');
   assert.equal(initial.stickyStyle,'sticky','only the race bar must be sticky');
   assert.notEqual(initial.yearStickyStyle,'sticky','year chooser must NOT be sticky');
   assert(initial.navScrollWidth<=initial.navClientWidth+1,'compact navigation must fit on mobile');
   assert(initial.overflow<=1,'Race must not overflow page horizontally');
   // Every button click moves exactly one round, including the last bound.
   const next=page.locator('.race-step-button[data-value="1"]');
   const prev=page.locator('.race-step-button[data-value="-1"]');
   await next.click();
   assert.equal(await page.locator('#raceslider').inputValue(),'2','Weiter = exactly one round');
   assert.equal(await page.locator('.race-current-round').textContent(),'Runde 2 von 7');
   await prev.click();
   assert.equal(await page.locator('#raceslider').inputValue(),'1','Zurück = exactly one round');
   assert.equal(await prev.isDisabled(),true,'first round may not go below 1');
   await page.locator('#raceslider').evaluate(el=>{el.value=String(el.max);el.dispatchEvent(new Event('change',{bubbles:true}))});
   assert.equal(await page.locator('#raceslider').inputValue(),'7','slider must navigate to last round');
   assert.equal(await next.isDisabled(),true,'last round may not advance further');
   await prev.click();
   assert.equal(await page.locator('#raceslider').inputValue(),'6','back button at end must change one round');
   await page.locator('#raceyear').selectOption('2025');
   const changed=await page.evaluate(()=>({
     year:document.getElementById('raceyear')?.value,
     round:document.getElementById('raceslider')?.value,
     max:document.getElementById('raceslider')?.max,
     rows:document.querySelectorAll('.race-list .race-entry').length,
     title:document.querySelector('.race-sticky-control + .card h3')?.textContent,
     leftYear:document.querySelectorAll('.race-year-selection').length,
     leftBar:document.querySelectorAll('.race-sticky-control').length
   }));
   assert.equal(changed.year,'2025','year chooser must change the race year');
   assert.equal(changed.round,'1','year change must reset to first round');
   assert.equal(changed.max,String(await page.evaluate(()=>db.editions.find(e=>e.year===2025).round_count)),'round count must follow new year');
   assert.equal(changed.title,'Meisterschaftsverlauf · 2025');
   assert(changed.rows>0,'ranking must follow new year');
   assert.equal(changed.leftYear,1);
   assert.equal(changed.leftBar,1);
   // Only the slider bar stays beneath the sticky site header during scrolling.
   const scrollState=await page.evaluate(()=>{
     const nav=document.querySelector('.race-sticky-control'),year=document.querySelector('.race-year-selection');
     const absolute=window.scrollY+nav.getBoundingClientRect().top;
     window.scrollTo({top:absolute+240,left:0,behavior:'instant'});
     const h=document.querySelector('.heritage-header').getBoundingClientRect();
     const b=nav.getBoundingClientRect(),y=year.getBoundingClientRect();
     return {scrollY:window.scrollY,navTop:b.top,headerBottom:h.bottom,yearBottom:y.bottom,navBottom:b.bottom,navRectHeight:b.height,navPosition:getComputedStyle(nav).position,layoutWidth:document.documentElement.scrollWidth-document.documentElement.clientWidth};
   });
   assert(scrollState.scrollY>80,'Race must have scrollable results');
   assert(Math.abs(scrollState.navTop-(scrollState.headerBottom+8))<=4,width+'px: Race slider must stick directly under site header '+JSON.stringify(scrollState));
   assert(scrollState.yearBottom<scrollState.navTop-5,'year chooser scrolls away; it is not sticky');
   assert(scrollState.layoutWidth<=1,'sticky bar must not cause page overflow');
   await page.locator('.race-step-button[data-value="1"]').click();
   const afterStickyClick=await page.evaluate(()=>{
     const nav=document.querySelector('.race-sticky-control').getBoundingClientRect();
     const header=document.querySelector('.heritage-header').getBoundingClientRect();
     return {top:nav.top,headerBottom:header.bottom,round:document.getElementById('raceslider').value};
   });
   assert.equal(afterStickyClick.round,'2','sticky next button must step by one');
   assert(Math.abs(afterStickyClick.top-afterStickyClick.headerBottom-8)<=4,'stays sticky after rerendering');
   assert.deepEqual(errors,[],'no javascript exceptions');
   console.log('RACE_STICKY_CONTROL_PASS',JSON.stringify({width,initial,changed,scrollState,afterStickyClick}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('RACE_STICKY_CONTROL_FAIL',e);process.exit(1)});
