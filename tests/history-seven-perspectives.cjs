const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,375,390,430]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
   const errors=[];
   page.on('pageerror',err=>errors.push(err.message));
   for(const path of ['live','editions'])await page.route('**/api/'+path,async route=>{
    try{const r=await route.fetch({headers:{...route.request().headers(),origin:'https://baergsunne.github.io'}});await route.fulfill({response:r,headers:{...r.headers(),'access-control-allow-origin':'http://127.0.0.1:8765'}})}
    catch(err){if(!page.isClosed())try{await route.abort()}catch(_){}}
   });
   await page.goto('http://127.0.0.1:8765/#history',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(x=>x.year===2026),null,{timeout:30000});
   const years=await page.evaluate(()=>db.editions.map(x=>x.year).sort((a,b)=>a-b));
   assert.equal(years.length,17,'All documented seasons must remain');
   assert.equal(years.includes(2014),false,'2014 missing event not to be invented');
   assert.equal(years.includes(2020),false,'2020 missing event not to be invented');
   const list=await page.locator('.history-entry-tile').evaluateAll(cards=>cards.map(c=>c.dataset.view));
   assert.deepEqual(list,['yearbook','replay','moments','records','field','compare']);
   assert.equal(await page.locator('#history-view-select').count(),0,'No redundant Ansicht dropdown');
   assert.equal(await page.locator('.history-dropdown-controls select').count(),1,'Only Turnierjahr dropdown remains');
   assert.equal(await page.locator('#history-year-select option').count(),17,'All documented years remain selectable');
   // The premium cards must match the Jahrbuch reference, not a former
   // hard-coded green outline used by the older standalone insight views.
   const yearbookBorder=await page.locator('.history-carousel-slide:not([inert]) .history-yearbook-card').evaluate(el=>getComputedStyle(el).borderTopColor);
   for(const view of ['records','field','compare']){
    await page.locator('.history-entry-tile[data-view="'+view+'"]').click();
    assert.equal(await page.locator('.history-entry-tile[aria-pressed="true"]').getAttribute('data-view'),view,'Tile selected '+view);
    assert.equal(await page.locator('.history-feature--insights').count(),1,'No duplicate theater '+view);
    assert.equal(await page.locator('.history-carousel-slide').count(),17,'Year-carousel for '+view);
    assert.equal(await page.locator('#history-year-slider').count(),1,'Year slider for '+view);
    assert.equal(await page.locator('#history-round-slider').count(),0,'No round slider in year view '+view);
    const viewAudit=await page.evaluate(view=>{
     const selected=document.querySelector('.history-carousel-slide:not([inert])');
     const content=selected?.querySelector('.history-insight-card');
     const viewport=document.querySelector('.history-carousel-viewport');
     const r=content?.getBoundingClientRect(),v=viewport?.getBoundingClientRect();
     return {
      year:Number(content?.dataset.year),
      type:content?.dataset.insight,
      readout:content?.innerText?.length||0,
      overflow:document.documentElement.scrollWidth>innerWidth+2,
      center:r&&v?Math.abs((r.left+r.right)/2-(v.left+v.right)/2):999,
      styles:content?getComputedStyle(content).borderTopColor:null
     };
    },view);
    assert.equal(viewAudit.year,2026,view+' remains on selected year');
    assert.equal(viewAudit.type,view,'Rendered correct variant');
    assert.ok(viewAudit.readout>130,view+' is populated from actual data');
    assert.equal(viewAudit.overflow,false,'No horizontal overflow '+width+' '+view);
    assert.ok(viewAudit.center<5,view+' active card must be centered');
    assert.equal(viewAudit.styles,yearbookBorder,'Match Jahrbuch premium card border '+view);
    const headline=await page.locator('.history-sticky-title h3').innerText();
    const names={records:'Rekordbuch',field:'Teilnehmerfeld',compare:'Jahresvergleich'};
    assert.equal(headline,names[view]+' 2026',view+' shared title should contain only function and year');
    assert.equal(await page.locator('.history-insight-head').count(),0,view+' old kicker and subtitle removed');
    assert.equal(await page.locator('.history-carousel-slide:not([inert]) .history-insight-card h3').count(),0,view+' duplicate card title removed');
    assert.match(await page.locator('.history-carousel-slide:not([inert]) .history-insight-card').evaluate(el=>getComputedStyle(el).backgroundImage),/gradient/,view+' retains green background');
   }
   assert.equal(await page.locator('.history-entry-tile[data-view="aftermath"]').count(),0,'Nachspiel entry must be removed');
   assert.equal(await page.locator('.history-entry-tile[data-view="archive"]').count(),0,'Originalarchiv tile must be removed');
   assert.equal(await page.locator('.history-feature--aftermath').count(),0,'Nachspiel view must be removed');
   // 2015 must compare with the last actually held tournament (2013), not absent 2014.
   await page.locator('.history-entry-tile[data-view="compare"]').click();
   await page.locator('#history-year-select').selectOption('2015');
   assert.equal(await page.locator('.history-entry-tile[aria-pressed="true"]').getAttribute('data-view'),'compare','Year switch preserves selected perspective');
   const comparison=await page.locator('.history-carousel-slide:not([inert])').innerText();
   assert.match(comparison,/2013/, 'Compare against last actual tournament');
   assert.match(comparison,/2015/);
   assert.match(comparison,/vorherigen tatsächlich ausgetragenen Turnier/, 'Explanation of skipped years');
   // The original results are still accessible in Runden without separate archive page.
   await page.locator('.history-entry-tile[data-view="replay"]').click();
   assert.equal(await page.locator('.history-replay-proof').count()>0,true,'Original result details remain in Runden');
   await page.locator('.history-entry-tile[data-view="records"]').click();
   await page.locator('#history-year-select').selectOption('2026');
   const highlights=await page.locator('.history-carousel-slide:not([inert])').innerText();
   for(const title of ['Meiste Rundensiege','Meiste Top-3-Plätze','Meiste Top-5-Plätze','Grösste Aufholjagd','Meiste Nullerrunden','Grösster Absturz'])assert.ok(highlights.includes(title),title+' needs actual calculation');
   assert.equal(await page.locator('.history-carousel-slide:not([inert]) .history-insight-section:has(> h4:text("Turnier-DNA"))').count(),0,'Turnier-DNA belongs only to Jahrbuch, not Rekordbuch');
   const consistency=await page.evaluate(()=>{
    const ed=db.editions.find(x=>x.year===2026),one=ed.rounds.reduce((m,r)=>{for(const x of r.results){if(x.place===1)m[x.player_id]=(m[x.player_id]||0)+1;}return m;},{});
    const top=Math.max(...Object.values(one)),holders=Object.keys(one).filter(x=>one[x]===top).sort();
    const metrics=[...document.querySelectorAll('.history-carousel-slide:not([inert]) .history-insight-metric')];
    const wins=metrics.find(x=>x.querySelector('.history-insight-metric-title')?.textContent==='Meiste Rundensiege');
    return{winnerCount:top,holderNames:holders,display:wins?.querySelector('.history-insight-metric-players')?.textContent||'',
     value:wins?.querySelector('.history-insight-metric-value')?.textContent||'',
     roundCount:ed.round_count};
   });
   assert.ok(consistency.value.includes(String(consistency.winnerCount)),'Winner record must match raw rounds');
   for(const name of consistency.holderNames)assert.ok(consistency.display.includes(name),'All record ties must be shown');
   // Slider changes real year but must remain on the same selected view.
   const slider=page.locator('#history-year-slider');
   const index=Number(await slider.inputValue());
   await slider.evaluate((element,index)=>{
    element.value=String(index-1);
    element.dispatchEvent(new Event('input',{bubbles:true}));
    element.dispatchEvent(new Event('change',{bubbles:true}));
   },index);
   await page.waitForTimeout(1050);
   assert.equal(await page.locator('#history-year-select').inputValue(),'2025','Records slider navigates to older year');
   assert.equal(await page.locator('.history-entry-tile[aria-pressed="true"]').getAttribute('data-view'),'records','Slider keeps perspective');
   if(width===390){
    const audit=await page.evaluate(()=>{
     const failures=[];
     for(const season of db.editions){
      state.page='history';state.historyYear=season.year;draw();
      for(const view of ['records','field','compare']){
       document.querySelector('.history-entry-tile[data-view="'+view+'"]').click();
       const card=document.querySelector('.history-carousel-slide:not([inert]) .history-insight-card');
       if(!card||Number(card.dataset.year)!==season.year)failures.push(season.year+': '+view+' missing card');
       if(!card?.innerText?.trim())failures.push(season.year+': '+view+' blank card');
       if(document.querySelectorAll('#history-year-slider').length!==1)failures.push(season.year+': '+view+' slider');
      }
     }
     return failures;
    });
    assert.deepEqual(audit,[],'All documented editions must render for each new perspective');
   }
   assert.deepEqual(errors,[],'No browser errors');
   console.log('SIX_HISTORIE_PASS',JSON.stringify({width,yearbooks:years.length,modes:list.length,records:true,preserved:true}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('SEVEN_HISTORIE_FAIL',e);process.exit(1)});
