const {chromium}=require('playwright');
const assert=require('node:assert/strict');

(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  for(const width of [320,375,390,430]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   for(const path of ['live','editions'])await page.route('**/api/'+path,async route=>{
    try {
     const response=await route.fetch({headers:{...route.request().headers(),origin:'https://baergsunne.github.io'}});
     await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':'http://127.0.0.1:8765'}});
    } catch(err){if(!page.isClosed())try{await route.abort()}catch(_){}}
   });
   await page.goto('http://127.0.0.1:8765/#history',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(e=>e.year===2026),null,{timeout:30000});
   const audit=await page.evaluate(()=>{
    const report=[],before=JSON.stringify(db.editions.find(x=>x.year===2026).official_standings);
    for(const which of ['history','stats','players','profile','fame','live','admin']){
     state.page=which;
     if(which==='profile')state.profile='Schnarre';
     if(which==='stats')state.tab='overview';
     draw();
     const p=document.querySelector('.page--'+which),hero=p?.querySelector(':scope > .premium-masthead');
     if(!p||!hero)throw Error('Missing page and hero: '+which);
     const style=getComputedStyle(p),hs=getComputedStyle(hero);
     const rb=p.getBoundingClientRect(),hb=hero.getBoundingClientRect();
     report.push({
      page:which,background:style.backgroundColor,
      border:style.borderTopWidth,heroBorder:hs.borderTopWidth,
      heroRadius:hs.borderTopLeftRadius,
      heroImage:hs.backgroundImage.includes('alpine-hero.webp'),
      heroFits:hb.left>=rb.left-3&&hb.right<=rb.right+3,
      maxOverflow:document.documentElement.scrollWidth-innerWidth,
      filter: p.querySelector('.filterbar')?getComputedStyle(p.querySelector('.filterbar')).backgroundColor:null,
      errorText:(p.innerText||'').includes('Ansicht nicht verfügbar')
     });
    }
    state.page='history';draw();
    const root=document.querySelector('.history-chronicle');
    const related=[...document.querySelectorAll('.history-related-link')];
    const first=[...document.querySelectorAll('.history-entry-tile')];
    const border=getComputedStyle(root).borderTopWidth;
    const histFeature=document.querySelector('.history-feature');
    const featureBorder=getComputedStyle(histFeature).borderTopWidth;
    return {report,border,featureBorder,related:related.map(x=>({page:x.dataset.value,label:x.querySelector('strong')?.textContent})),
     linkInsideEntry:related.some(x=>x.closest('.history-entry')),firstCount:first.length,
     preserved:before===JSON.stringify(db.editions.find(x=>x.year===2026).official_standings)};
   });
   for(const r of audit.report){
    assert.equal(r.background,'rgb(7, 31, 25)',r.page+' must have Startseite dark-green background');
    assert.equal(r.border,'0px',r.page+' must have no outer frame');
    assert.equal(r.heroBorder,'0px',r.page+' hero must be frameless');
    assert.equal(r.heroImage,true,r.page+' must retain alpine hero image');
    assert.equal(r.heroFits,true,r.page+' hero must fit width');
    assert.ok(r.maxOverflow<=2,r.page+' horizontal overflow '+r.maxOverflow);
    assert.equal(r.errorText,false,r.page+' must still render normally');
   }
   assert.equal(audit.border,'0px','History chronicle must have no box around all tools');
   assert.equal(audit.featureBorder,'0px','Jahrbuch theatre must have no outer box');
   assert.equal(audit.firstCount,3,'Preserve exactly three function cards');
   assert.deepEqual(audit.related,[{page:'fame',label:'Hall of Fame'},{page:'players',label:'Spieler'}]);
   assert.equal(audit.linkInsideEntry,false,'Other destinations must be visually separate');
   assert.equal(audit.preserved,true,'Historic standings must be untouched');
   await page.locator('.history-related-link[data-value="fame"]').click();
   assert.equal(await page.evaluate(()=>state.page),'fame','Hall of Fame must open from History');
   await page.evaluate(()=>{state.page='history';draw()});
   await page.locator('.history-related-link[data-value="players"]').click();
   assert.equal(await page.evaluate(()=>state.page),'players','Spieler must open from History');
   await page.evaluate(()=>{state.page='history';draw()});
   await page.locator('.history-entry-tile[data-view="moments"]').click();
   assert.equal(await page.locator('#history-view-select').inputValue(),'moments','Existing moment chooser works');
   assert.equal(await page.locator('#history-round-slider').count(),1,'Carousel regulator remains');
   await page.locator('#history-view-select').selectOption('replay');
   assert.equal(await page.locator('#history-round-slider').count(),1,'Round regulator remains');
   assert.deepEqual(errors,[],'No runtime errors');
   console.log('OPEN_PAGES_PASS',JSON.stringify({width,pages:audit.report.map(x=>x.page),related:audit.related.length,preserved:audit.preserved}));
   await page.close();
  }
 } finally {await browser.close();}
})().catch(e=>{console.error('OPEN_PAGES_FAIL',e);process.exit(1)});
