const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,390,768,1024]){
   const page=await browser.newPage({viewport:{width,height:900},isMobile:width<500,hasTouch:width<500});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8765/#fame',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(e=>e.year===2026),null,{timeout:30000});
   await page.evaluate(()=>{state.page='fame';draw()});
   const cards=page.locator('.page .podium > .podium-card');
   assert.equal(await cards.count(),3,'exactly three podium cards');
   assert.deepEqual(await cards.evaluateAll(els=>els.map(e=>e.classList.contains('position-1')?1:e.classList.contains('position-2')?2:3)),[2,1,3],'podium order is second, first, third');
   const ranks=await cards.evaluateAll(els=>els.map(e=>e.querySelector('small')?.textContent));
   assert.deepEqual(ranks,['RANG 2','RANG 1','RANG 3']);
   const boxes=await cards.evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}}));
   assert(boxes[0].x+boxes[0].width<=boxes[1].x+1,'second place on left');
   assert(boxes[1].x+boxes[1].width<=boxes[2].x+1,'third place on right');
   assert(boxes[1].height>boxes[0].height&&boxes[0].height>boxes[2].height,'first place highest, then second, then third');
   assert(Math.max(...boxes.map(x=>x.bottom))-Math.min(...boxes.map(x=>x.bottom))<3,'three podium steps share bottom baseline');
   assert((await cards.nth(1).innerText()).includes('Mike'),'Mike in centre');
   assert((await cards.nth(1).innerText()).includes('6 TITEL'),'six titles for Mike');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2),'no horizontal overflow');
   assert.deepEqual(errors,[],'no browser errors');
   console.log('HALL_PODIUM_SUCCESS',width);
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('HALL_PODIUM_FAILURE',e);process.exit(1)});
