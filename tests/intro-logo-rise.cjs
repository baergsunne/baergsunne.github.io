/* Opening logo must move to the real hero, not fade or duplicate it. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,375,390,430,768,1024]){
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
   // Verify that the source and target PAINT THE SAME ARTWORK RECTANGLE
   // at landing. DOM element rectangles alone miss max-height+object-fit letterboxing.
   try{
    await page.waitForFunction(()=>!!document.documentElement.dataset.bpIntroLanding,null,{timeout:4100});
   }catch(error){
    const debug=await page.evaluate(()=>{
     const logo=document.querySelector('#bp-intro-logo'),hero=document.querySelector('.discovery-hero-logo'),root=document.documentElement;
     const rect=e=>e?Object.fromEntries(['width','height','top','left','bottom'].map(k=>[k,e.getBoundingClientRect()[k]])):null;
     return {active:root.classList.contains('bp-intro-active'),outcome:root.dataset.bpIntroFinish,
       reduced:matchMedia('(prefers-reduced-motion:reduce)').matches,logo:rect(logo),
       hero:rect(hero),logoNatural:logo?.naturalWidth,heroNatural:hero?.naturalWidth,
       hash:location.hash,loading:document.readyState};
    });
    throw Error(width+' logo flight never landed: '+JSON.stringify(debug)+' '+errors.join(' | ')+' '+error.message);
   }
   const landing=await page.evaluate(()=>JSON.parse(document.documentElement.dataset.bpIntroLanding));
   for(const k of ['left','top','width','height']){
    assert(Math.abs(landing.source[k]-landing.target[k])<1.4,width+' image alignment '+k+': '+JSON.stringify(landing));
   }
   assert(Math.abs(landing.scaleX-landing.scaleY)<0.0001,width+' logo is never widened separately from its height');
   await page.waitForFunction(()=>!document.documentElement.classList.contains('bp-intro-active'),null,{timeout:6500});
   const completed=await page.evaluate(()=>({
    removed:!document.querySelector('#bp-intro'),
    heroVisible:getComputedStyle(document.querySelector('.discovery-hero-logo')).visibility,
    counts:document.querySelector('.discovery-counts strong')?.textContent,
    scrollY:window.scrollY
   }));
   assert.equal(completed.removed,true);assert.equal(completed.heroVisible,'visible');
   assert.equal(completed.counts,'17');assert.equal(completed.scrollY,0);
   const afterPainting=await page.evaluate(()=>{
    const img=document.querySelector('.discovery-hero-logo'),b=img.getBoundingClientRect();
    const ratio=img.naturalWidth/img.naturalHeight,w=Math.min(b.width,b.height*ratio),h=w/ratio;
    return {left:b.left+(b.width-w)/2,top:b.top+(b.height-h)/2,width:w,height:h};
   });
   for(const k of ['left','top','width','height'])
    assert(Math.abs(afterPainting[k]-landing.target[k])<2.2,width+' hero remains at its painted position after overlay closes: '+k);
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
