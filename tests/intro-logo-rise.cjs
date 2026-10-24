/* Opening logo must move to the real hero, not fade or duplicate it. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [390,768]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:width<500,hasTouch:width<500});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
   const opening=await page.evaluate(()=>({
    active:document.documentElement.classList.contains('bp-intro-active'),
    visible:getComputedStyle(document.querySelector('#bp-intro')).display!=='none',
    hero:!!document.querySelector('.discovery-hero-logo'),
    count:document.querySelectorAll('#app .discovery-hero-logo').length
   }));
   assert.equal(opening.active,true,width+' logo intro should be active on the Home entry');
   assert.equal(opening.visible,true,width+' logo curtain should cover the site');
   assert.equal(opening.hero,true);assert.equal(opening.count,1);
   await page.waitForFunction(()=>!document.documentElement.classList.contains('bp-intro-active'),null,{timeout:6500});
   const completed=await page.evaluate(()=>({
    removed:!document.querySelector('#bp-intro'),
    heroVisible:getComputedStyle(document.querySelector('.discovery-hero-logo')).visibility,
    counts:document.querySelector('.discovery-counts strong')?.textContent,
    scrollY:window.scrollY
   }));
   assert.equal(completed.removed,true);assert.equal(completed.heroVisible,'visible');
   assert.equal(completed.counts,'17');assert.equal(completed.scrollY,0);
   assert.deepEqual(errors,[],width+' intro should not throw');
   await page.close();
  }
  const deep=await browser.newPage();
  await deep.goto('http://127.0.0.1:8765/#stats',{waitUntil:'domcontentloaded'});
  assert.equal(await deep.evaluate(()=>document.documentElement.classList.contains('bp-intro-active')),false,'Deep links must bypass the intro');
  await deep.close();
  const reduced=await browser.newPage({reducedMotion:'reduce'});
  await reduced.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
  await reduced.waitForFunction(()=>!document.documentElement.classList.contains('bp-intro-active'),null,{timeout:3000});
  await reduced.close();
  console.log('INTRO_LOGO_RISE_PASS');
 }finally{await browser.close();}
})().catch(e=>{console.error('INTRO_LOGO_RISE_FAIL',e);process.exit(1)});
