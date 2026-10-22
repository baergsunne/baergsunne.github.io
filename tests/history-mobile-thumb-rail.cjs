/* Dock threshold, multi-year drag, multi-round drag and iPhone edge safety. */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const fixture=require('./fixture-2026.json');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,375,390,430]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
   await page.emulateMedia({reducedMotion:'reduce'});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/api/editions',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
   await page.route('**/api/live',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({year:2026,status:'planned',standings:[],players:[],rounds:[]})}));
   await page.goto('http://127.0.0.1:8765/#history',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(e=>e.year===2026),null,{timeout:15000});
   const rail=page.locator('.history-mobile-rail'),track=rail.locator('.history-mobile-track');
   async function scrollBoundary(offset){
    await page.evaluate(delta=>{
     const dropdown=document.querySelector('.history-dropdown-controls'),group=document.querySelector('.history-sticky-group');
     const sticky=parseFloat(getComputedStyle(group).top);
     const to=scrollY+dropdown.getBoundingClientRect().bottom+18-sticky+delta;
     window.scrollTo({top:Math.max(0,to),behavior:'instant'});
    },offset);
    await page.waitForTimeout(80);
   }
   async function dock(){
    await scrollBoundary(65);
    await page.waitForFunction(()=>document.querySelector('.history-mobile-rail')?.classList.contains('is-active'),null,{timeout:5000});
   }
   async function year(y){
    await page.locator('#history-year-select').selectOption(y);
    await page.waitForFunction(y=>document.querySelector('#history-year-select')?.value===y,y);
    await dock();
   }
   async function drag(dy){
    await dock();
    const b=await track.boundingBox();assert(b&&b.height>90);
    const x=b.x+b.width/2,y=b.y+b.height/2;
    await page.mouse.move(x,y);await page.mouse.down();
    await page.mouse.move(x,y+dy,{steps:12});
    await page.mouse.up();
    return b.height;
   }
   await page.locator('.history-entry-tile[data-view="yearbook"]').click();
   await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
   await page.waitForTimeout(70);
   assert.equal(await rail.evaluate(el=>el.classList.contains('is-active')),false,'Rail must not cover entry cards');
   assert.equal(await page.locator('.history-carousel-control').isVisible(),true,'Original horizontal control is visible before docking');
   await scrollBoundary(-55);
   assert.equal(await rail.evaluate(el=>el.classList.contains('is-active')),false,'Side rail cannot appear before the horizontal slider leaves its normal area');
   assert.equal(await page.locator('.history-carousel-control').isVisible(),true);
   await dock();
   assert.equal(await page.locator('.history-carousel-control').isVisible(),false,'Horizontal slider transitions away only at sticky threshold');
   const bounds=await rail.boundingBox();
   assert(bounds.x>=15&&bounds.x+bounds.width<=width-14,'Inset rail avoids screen-edge swipe gestures');
   assert.equal(await track.getAttribute('aria-orientation'),'vertical');
   assert.deepEqual(await rail.locator('button span').allTextContents(),['›','‹']);
   await scrollBoundary(-70);
   await page.waitForTimeout(90);
   assert.equal(await rail.evaluate(el=>el.classList.contains('is-active')),false,'Scrolling upward restores horizontal slider');
   assert.equal(await page.locator('.history-carousel-control').isVisible(),true);
   await year('2025');
   await rail.locator('.history-mobile-step--next').click();
   await page.waitForFunction(()=>document.querySelector('#history-year-select')?.value==='2026');
   await rail.locator('.history-mobile-step--prev').click();
   await page.waitForFunction(()=>document.querySelector('#history-year-select')?.value==='2025');
   await year('2026');
   const height=await drag(132); // A long downwards finger pull must skip multiple past years.
   await page.waitForFunction(()=>Number(document.querySelector('#history-year-select')?.value)<=2020,null,{timeout:5000});
   const chosen=Number(await page.locator('#history-year-select').inputValue());
   assert(chosen>=2007&&chosen<=2020,'Proportional drag crosses multiple editions: '+chosen);
   assert.match(await page.locator('#history-sticky-heading').innerText(),new RegExp(String(chosen)+'$'));
   await year('2025');
   await track.focus();
   await page.keyboard.press('ArrowUp');
   await page.waitForFunction(()=>document.querySelector('#history-year-select')?.value==='2026');
   // Normal scrolling with the pointer over the card must not change the year.
   const oldYear=await page.locator('#history-year-select').inputValue();
   await page.mouse.move(width*.4,520); // no right rail hit
   await page.mouse.wheel(0,140);
   await page.waitForTimeout(100);
   assert.equal(await page.locator('#history-year-select').inputValue(),oldYear);
   await page.locator('.history-entry-tile[data-view="moments"]').click();
   // The new compact 2×2 entry tiles shorten the document. This specific
   // regression needs a *scrollable* Moments workspace to exercise the
   // multi-round drag controller; normally a short page retains the
   // horizontal control and never attempts to dock the side rail.
   await page.evaluate(()=>{document.getElementById('history-chronicle').style.paddingBottom='650px';});
   await dock();
   const native=page.locator('#history-round-slider');
   await native.evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
   await page.waitForFunction(()=>Number(document.querySelector('.history-replay-track')?.dataset.index)===0);
   await dock();
   await drag(-135);
   await page.waitForFunction(()=>Number(document.querySelector('.history-replay-track')?.dataset.index)>=2,null,{timeout:5000});
   const round=Number(await page.locator('.history-replay-track').getAttribute('data-index'));
   assert(round>=2&&round<=6,'Proportional upward swipe spans several rounds');
   assert.match(await page.locator('#history-sticky-heading').innerText(),new RegExp('Runde '+(round+1)+'$'));
   await track.focus();
   await page.keyboard.press('ArrowDown');
   await page.waitForFunction(expected=>Number(document.querySelector('.history-replay-track')?.dataset.index)===expected,round-1);
   assert.deepEqual(errors,[]);
   assert((await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=2);
   console.log('HISTORY_MOBILE_DOCK_SCRUB_PASS',JSON.stringify({width,year:chosen,round,trackHeight:height,edgeInset:true}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('HISTORY_MOBILE_DOCK_SCRUB_FAIL',e);process.exit(1)});
