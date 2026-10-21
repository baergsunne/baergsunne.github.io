/* Bärgsunne Poker: mobile arrow rail, vertical gestures and native outside scrolling. */
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
   await page.route('**/api/live',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({year:2026,status:'planned',players:[],standings:[],rounds:[]})}));
   await page.goto('http://127.0.0.1:8765/#history',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(e=>e.year===2026),null,{timeout:15000});
   const active=async()=>{
    await page.evaluate(()=>{
     const m=document.getElementById('history-workspace');
     window.scrollTo({top:Math.max(0,window.scrollY+m.getBoundingClientRect().top-130),behavior:'instant'});
    });
    await page.locator('.history-mobile-rail.is-active').waitFor({timeout:6000});
   };
   const year=async(y)=>{
    await page.locator('#history-year-select').selectOption(y);
    await active();
    await page.waitForFunction(y=>document.getElementById('history-year-select')?.value===y,y);
   };
   await page.locator('.history-entry-tile[data-view="yearbook"]').click();
   await year('2025');
   const arrow=page.locator('.history-mobile-step--next');
   assert.equal(await arrow.textContent(),'›');
   await arrow.click();
   await page.waitForFunction(()=>document.getElementById('history-year-select')?.value==='2026');
   assert.equal(await page.locator('#history-sticky-heading').innerText(),'Jahrbuch 2026');
   assert.equal(await arrow.isDisabled(),true,'Forward bound at 2026');
   await page.locator('.history-mobile-step--prev').click();
   await page.waitForFunction(()=>document.getElementById('history-year-select')?.value==='2025');
   const rail=page.locator('.history-mobile-track');
   async function swipe(direction){
    const b=await rail.boundingBox();assert(b&&b.height>100);
    const startY=b.y+b.height*.48,startX=b.x+b.width/2;
    await page.mouse.move(startX,startY);
    await page.mouse.down();
    await page.mouse.move(startX,startY+(direction==='up'?-64:64),{steps:5});
    await page.mouse.up();
   }
   await active();
   await swipe('up');
   await page.waitForFunction(()=>document.getElementById('history-year-select')?.value==='2026');
   await year('2025');
   await swipe('down');
   await page.waitForFunction(()=>document.getElementById('history-year-select')?.value==='2024');
   await year('2025');
   await rail.focus();
   await page.keyboard.press('ArrowUp');
   await page.waitForFunction(()=>document.getElementById('history-year-select')?.value==='2026');
   const previous=await page.evaluate(()=>window.scrollY);
   await page.mouse.move(width*.48,480);
   await page.mouse.wheel(0,172);
   await page.waitForTimeout(120);
   const scrolled=await page.evaluate(()=>window.scrollY);
   if(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight+scrollY+60))assert(scrolled>previous,'Native document wheel scroll outside rail');
   await page.locator('.history-entry-tile[data-view="moments"]').click();
   await active();
   const counter=page.locator('#history-round-slider');
   await counter.evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
   await page.waitForFunction(()=>Number(document.querySelector('.history-replay-track')?.dataset.index)===0);
   await active();
   await swipe('up');
   await page.waitForFunction(()=>Number(document.querySelector('.history-replay-track')?.dataset.index)===1);
   assert.match(await page.locator('#history-sticky-heading').innerText(),/Runde 2$/);
   await swipe('down');
   await page.waitForFunction(()=>Number(document.querySelector('.history-replay-track')?.dataset.index)===0);
   const trackState=await rail.evaluate(el=>({max:el.getAttribute('aria-valuemax'),now:el.getAttribute('aria-valuenow'),orientation:el.getAttribute('aria-orientation')}));
   assert.equal(trackState.orientation,'vertical');
   assert.equal(Number(trackState.now),1);
   assert.equal(Number(trackState.max),7);
   assert.deepEqual(errors,[]);
   assert((await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=2,'No mobile horizontal overflow');
   console.log('HISTORY_MOBILE_GESTURE_PASS',JSON.stringify({width,gestureUpDown:true,keyboard:true,arrows:true}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(err=>{console.error('HISTORY_MOBILE_GESTURE_FAIL',err);process.exit(1)});
