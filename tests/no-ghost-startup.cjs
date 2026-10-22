/* Reproduce the iPhone ghost page: a static 16-edition seed is hydrated
   into the official 17-edition archive, then periodically refreshed. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fixture=require('./fixture-2026.json');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,390,430,768]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:width<=430,hasTouch:true});
   const errors=[],responses=[];
   page.on('pageerror',e=>errors.push(e.message));
   let generation=0;
   page.on('response',r=>{if(r.url().includes('/api/editions'))responses.push(r.status());});
   await page.route('**/api/live',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
    status:'final',year:2026,round_count:7,rounds:[],players:fixture.editions[0].players,
    standings:fixture.editions[0].official_standings.map(x=>({player:x.player_id,rank:x.place,points:x.points})),
    leaders:['Frauchi'],updated_at:'test-'+generation})}));
   await page.route('**/api/editions',async r=>{
    if(!generation)await new Promise(resolve=>setTimeout(resolve,1700));
    await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)});
   });
   await page.goto('http://127.0.0.1:8765/#home',{waitUntil:'domcontentloaded'});
   const before=await page.evaluate(()=>({
    number:document.querySelector('.discovery-counts strong')?.textContent||null,
    splash:!!document.querySelector('.bp-initial-stage'),
    visibleText:document.body.innerText,
    dataCount:db.editions.length,
    bootstrapped:appBootstrapped
   }));
   assert.equal(before.dataCount,16,'Bundled historical snapshot is 16 before the API');
   assert.equal(before.bootstrapped,false,'Do not render the historic snapshot as the complete site');
   assert.equal(before.number,null,'No false 16-tourneys card is painted');
   assert(before.splash&&before.visibleText.includes('Turnierarchiv wird geladen'),width+' calm loading stage');
   await page.waitForFunction(()=>document.querySelector('.discovery-counts strong')?.textContent==='17',null,{timeout:15000});
   const first=await page.evaluate(()=>{
    const img=document.querySelector('.discovery-champion-trophy img');
    window.__stableTrophy=img;
    const app=document.querySelector('#app');
    window.__domReplacementCount=0;
    window.__appWatch=new MutationObserver(items=>{if(items.some(m=>m.type==='childList'&&m.target===app&&m.addedNodes.length))window.__domReplacementCount++;});
    window.__appWatch.observe(app,{childList:true});
    return {heading:document.querySelector('.discovery-counts strong').textContent,
     noSplash:!document.querySelector('.bp-initial-stage'),logoCount:document.querySelectorAll('.discovery-hero-logo').length,
     championName:document.querySelector('.discovery-champion h2')?.textContent,loading:img?.loading,
     priority:img?.getAttribute('fetchpriority'),appRootChildren:app.children.length};
   });
   assert.equal(first.heading,'17');assert.equal(first.noSplash,true);assert.equal(first.logoCount,1);
   assert.equal(first.championName,'Frauchi');assert.equal(first.loading,'eager');assert.equal(first.priority,'high');
   generation=1;
   await page.evaluate(async()=>{await refreshLive();await refreshLive();await refreshLive();});
   const stable=await page.evaluate(()=>({
    sameTrophy:document.querySelector('.discovery-champion-trophy img')===window.__stableTrophy,
    replacements:window.__domReplacementCount,
    count:document.querySelector('.discovery-counts strong')?.textContent,
    champion:document.querySelector('.discovery-champion h2')?.textContent,
    headerCount:document.querySelectorAll('header.heritage-header').length,
    navigationCount:document.querySelectorAll('nav.bottomnav').length
   }));
   assert(stable.sameTrophy,width+' no trophy image remount after three unchanged refreshes');
   assert.equal(stable.replacements,0,width+' no DOM remount when only API timestamp changes');
   assert.equal(stable.count,'17');assert.equal(stable.champion,'Frauchi');
   assert.equal(stable.headerCount,1);assert.equal(stable.navigationCount,1);
   assert.deepEqual(errors,[],width+' browser exceptions');
   console.log('NO_GHOST_STARTUP_AND_PERIODIC_REPAINT_PASS',JSON.stringify({width,splash:true,count:stable.count,replacements:stable.replacements,requests:responses.length}));
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error('NO_GHOST_STARTUP_AND_PERIODIC_REPAINT_FAIL',e);process.exit(1)});
