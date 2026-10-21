const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fixture=require('./fixture-2026.json');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,375,390,430,768]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:width<620,hasTouch:true});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/api/live',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'final',year:2026,players:fixture.editions[0].players,rounds:[],standings:fixture.editions[0].official_standings.map(x=>({player:x.player_id,rank:x.place,points:x.points}))})}));
   await page.route('**/api/editions',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
   await page.goto('http://127.0.0.1:8765/#history',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(e=>e.year===2026),null,{timeout:25000});
   const historyStyle=await page.evaluate(()=>{
    const h=document.querySelector('#history-year-select');assert; // make test fail explicitly below if missing
    if(!h)return null;
    const s=getComputedStyle(h);
    return {background:s.backgroundColor,color:s.color,radius:s.borderRadius,fontSize:s.fontSize,border:s.borderTopColor,minHeight:s.minHeight};
   });
   assert(historyStyle,'History year chooser must be present to compare against');
   await page.evaluate(()=>{state.page='stats';state.tab='rivals';duelSelection.left='';duelSelection.right='';duelSelection.years=[];draw()});
   const initial=await page.evaluate(()=>{
    const selects=[...document.querySelectorAll('.duel-native-select')];
    const year=document.querySelector('.duel-year-picker');
    const a=selects[0],s=a&&getComputedStyle(a),yearSummary=year?.querySelector('summary');
    const yr=year?.getBoundingClientRect(),r=yearSummary?.getBoundingClientRect();
    return {selectors:selects.length,styles:s&&{background:s.backgroundColor,color:s.color,radius:s.borderRadius,fontSize:s.fontSize,border:s.borderTopColor,minHeight:s.minHeight},yearHeight:yr?.height,yearSummaryHeight:r?.height,yearOpen:year?.open,yearLabel:yearSummary?.textContent.trim(),pageOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
   });
   assert.equal(initial.selectors,2,'Two native player selectors required');
   for(const key of ['background','color','radius','fontSize','border','minHeight']){
    assert.equal(initial.styles[key],historyStyle[key],width+'px: Duel selects should use Historie dropdown style for '+key);
   }
   assert.equal(initial.yearOpen,false,'Year chooser initially collapsed');
   assert(initial.yearHeight>=42&&initial.yearHeight<=63,width+'px: compact closed year chooser should contain no empty vertical area');
   assert(initial.yearSummaryHeight>=43,'Year chooser remains touch accessible');
   assert.equal(initial.yearLabel,'Jahre auswählen','Do not duplicate year label');
   assert(initial.pageOverflow<=1,width+'px: controls must not overflow the page horizontally');
   await page.locator('.duel-year-picker > summary').click();
   assert.equal(await page.locator('.duel-year-picker').evaluate(el=>el.open),true,'Year chooser must expand');
   assert(await page.locator('[data-duel-year="2026"]').isVisible(),'Year options remain functional');
   await page.locator('[data-duel-year="2026"]').check();
   await page.locator('[data-duel-select="left"]').selectOption('Frauchi');
   await page.locator('[data-duel-select="right"]').selectOption('König');
   const chosen=await page.evaluate(()=>({left:duelSelection.left,right:duelSelection.right,years:duelSelection.years,yearSummary:document.querySelector('.duel-year-picker > summary')?.textContent.trim(),metrics:document.querySelectorAll('.duel-metric').length}));
   assert.equal(chosen.left,'Frauchi');
   assert.equal(chosen.right,'König');
   assert(chosen.years.includes(2026),'Selecting year remains functional');
   assert(chosen.yearSummary.includes('1 ausgewählt'),'Selected year count is shown once');
   assert(chosen.metrics>0,'Duel metrics continue to render');
   const levelChecks=[];
   for(const [level,selector,expectText] of [
     ['total','.duel-metric','Jahre und Runden ansehen'],
     ['year','.duel-metric[open] .duel-year','Runden ansehen'],
     ['round','.duel-metric[open] .duel-year[open] .duel-round','Originalresultate ansehen']
   ]){
    const detail=page.locator(selector).first(),summary=detail.locator(':scope > summary');
    assert(await detail.count()>0,level+' details must exist');
    assert((await summary.textContent()).includes(expectText),level+' must label its click target');
    const before=await summary.locator('.duel-open-hint').evaluate(el=>({
      text:el.textContent.trim(),content:getComputedStyle(el,'::after').content,transform:getComputedStyle(el,'::after').transform
    }));
    assert(before.content&&before.content!=='none',level+' needs its own visible chevron');
    await summary.click();
    assert.equal(await detail.evaluate(el=>el.open),true,level+' must expand on tap');
    const after=await summary.locator('.duel-open-hint').evaluate(el=>getComputedStyle(el,'::after').transform);
    // CSS transitions can still be running, but the states must be visually distinguishable.
    await page.waitForTimeout(250);
    const opened=await summary.locator('.duel-open-hint').evaluate(el=>getComputedStyle(el,'::after').transform);
    assert.notEqual(opened,before.transform,level+' Chevron should change direction after expansion');
    levelChecks.push({level,chevron:true,hint:before.text,opened:true});
   }
   assert(await page.locator('.duel-metric[open] .duel-year[open] .duel-round[open] p').first().isVisible(),'Original results must remain visible');
   assert.deepEqual(errors,[],'No browser errors in duel view');
   console.log('DUEL_MOBILE_USABILITY_PASS',JSON.stringify({width,initial,levelChecks}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(err=>{console.error('DUEL_MOBILE_USABILITY_FAIL',err);process.exit(1)});
