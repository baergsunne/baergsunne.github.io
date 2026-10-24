const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,390,430,768]){
   const page=await browser.newPage({viewport:{width,height:900},isMobile:width<500,hasTouch:width<500});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   for(const path of ['live','editions'])await page.route('**/api/'+path,async route=>{
    try{const r=await route.fetch({headers:{...route.request().headers(),origin:'https://baergsunne.github.io'}});
     await route.fulfill({response:r,headers:{...r.headers(),'access-control-allow-origin':'http://127.0.0.1:8765'}})}
    catch{await route.abort()}
   });
   await page.goto('http://127.0.0.1:8765/#players',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(e=>e.year===2026),null,{timeout:30000});
   await page.evaluate(()=>{state.page='profile';state.profile='Schnarre';draw()});
   const selector='.bp-form-dynamic';
   const inspect=()=>page.evaluate(()=>{
    const root=document.querySelector('.bp-form-dynamic');
    const tiles=[...root.querySelectorAll('.bp-form-tile')].map(x=>({label:x.querySelector('small').textContent,value:x.querySelector('strong').textContent}));
    const n=Number(root.querySelector('[data-form-custom]').value);
    const expected=window.BAERGSUNNE_PROFILE_FORM.calculate(legacyPerson('Schnarre'),n);
    return {n,tiles,expected,points:root.querySelectorAll('.bp-form-chart circle').length,
      chart:root.querySelector('svg')?.getAttribute('aria-label'),
      overflow:document.documentElement.scrollWidth>window.innerWidth+2};
   });
   let r=await inspect();
   assert.equal(r.n,10);assert.equal(r.tiles.length,8);assert.equal(r.points,10);
   assert.deepEqual(r.tiles.map(x=>x.label),['Runden','Rundensiege','Top 3','Nuller','Ø Platz','Ø Punkte','Ø Position im Feld','Trend']);
   assert.equal(Number(r.tiles[0].value),10);assert.equal(Number(r.tiles[1].value),r.expected.wins);
   assert.equal(Number(r.tiles[2].value),r.expected.top3);assert.equal(Number(r.tiles[3].value),r.expected.zeros);
   assert(!r.overflow,'mobile overflow at '+width);
   for(const n of [3,5,10]){
    await page.locator('[data-form-window="'+n+'"]').click();
    r=await inspect();assert.equal(r.n,n);assert.equal(r.points,n);
    assert.equal(Number(r.tiles[1].value),r.expected.wins);
    assert.equal(Number(r.tiles[3].value),r.expected.zeros);
    assert(!r.overflow,'overflow after preset '+n+' at '+width);
   }
   const input=page.locator('[data-form-custom]');
   await input.fill('7');await input.dispatchEvent('change');
   r=await inspect();assert.equal(r.n,7);assert.equal(r.points,7);assert.equal(Number(r.tiles[0].value),7);
   assert.equal(Number(r.tiles[1].value),r.expected.wins);
   assert.equal(Number(r.tiles[2].value),r.expected.top3);
   assert.equal(Number(r.tiles[3].value),r.expected.zeros);
   assert(!r.overflow,'overflow after custom at '+width);
   await page.locator('[data-form-custom]').fill('1');await page.locator('[data-form-custom]').dispatchEvent('change');
   r=await inspect();assert.equal(r.n,1);assert.equal(r.tiles[7].value,'–');
   await page.evaluate(()=>{state.page='profile';state.profile='Frauchi';draw()});
   assert.equal(await page.locator('.bp-form-tile').count(),8,'other profile has 8 tiles');
   assert.equal(await page.locator('[data-form-custom]').inputValue(),'10','profile defaults independently');
   await page.evaluate(()=>{state.page='profile';state.profile='Schnarre';draw()});
   assert.equal(await page.locator('[data-form-custom]').inputValue(),'1','prior selection preserved');
   assert.deepEqual(errors,[],'browser errors '+width);
   console.log('PROFILE_FORM_SUCCESS',width);
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('PROFILE_FORM_FAILURE',e);process.exit(1)});
