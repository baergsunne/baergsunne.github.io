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
    const removedSection=document.querySelector('.history-related');
    const first=[...document.querySelectorAll('.history-entry-tile')];
    const border=getComputedStyle(root).borderTopWidth;
    const histFeature=document.querySelector('.history-feature');
    const featureBorder=getComputedStyle(histFeature).borderTopWidth;
    return {report,border,featureBorder,removedSection:!!removedSection,
     crossLinkCount:document.querySelectorAll('.history-related-link').length,firstCount:first.length,
     preserved:before===JSON.stringify(db.editions.find(x=>x.year===2026).official_standings)};
   });
   for(const r of audit.report){
    assert.equal(r.background,'rgb(11, 36, 27)',r.page+' must use shared Heritage-green background');
    assert.equal(r.border,'0px',r.page+' must have no outer frame');
    assert.equal(r.heroBorder,'0px',r.page+' hero must be frameless');
    assert.equal(r.heroImage,true,r.page+' must retain alpine hero image');
    assert.equal(r.heroFits,true,r.page+' hero must fit width');
    assert.ok(r.maxOverflow<=2,r.page+' horizontal overflow '+r.maxOverflow);
    assert.equal(r.errorText,false,r.page+' must still render normally');
   }
   assert.equal(audit.border,'0px','History chronicle must have no box around all tools');
   assert.equal(audit.featureBorder,'0px','Jahrbuch theatre must have no outer box');
   assert.equal(audit.firstCount,6,'Preserve exactly six Historie function cards');
   assert.equal(await page.locator('.history-dropdown-controls select').count(),1,'Only Turnierjahr dropdown remains');
   assert.equal(await page.locator('#history-view-select').count(),0,'No second Ansicht dropdown');
   assert.equal(audit.removedSection,false,'Weitere Bereiche section must be removed from Historie');
   assert.equal(audit.crossLinkCount,0,'Hall of Fame and Spieler crosslinks removed from Historie');
   assert.equal(audit.preserved,true,'Historic standings must be untouched');
   await page.locator('.history-entry-tile[data-view="moments"]').click();
   assert.equal(await page.locator('.history-entry-tile[aria-pressed="true"]').getAttribute('data-view'),'moments','Existing moment chooser works');
   assert.equal(await page.locator('#history-round-slider').count(),1,'Carousel regulator remains');
   await page.locator('.history-entry-tile[data-view="replay"]').click();
   assert.equal(await page.locator('#history-round-slider').count(),1,'Round regulator remains');
   assert.deepEqual(errors,[],'No runtime errors');
   console.log('OPEN_PAGES_PASS',JSON.stringify({width,pages:audit.report.map(x=>x.page),crossLinks:audit.crossLinkCount,preserved:audit.preserved}));
   await page.close();
  }
 } finally {await browser.close();}
})().catch(e=>{console.error('OPEN_PAGES_FAIL',e);process.exit(1)});
