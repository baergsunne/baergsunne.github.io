const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fixture=require('./fixture-2026.json');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,390,430,768]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:width<600,hasTouch:width<600});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/api/live',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'final',year:2026,players:fixture.editions[0].players,rounds:[],standings:fixture.editions[0].official_standings.map(x=>({player:x.player_id,rank:x.place,points:x.points}))})}));
   await page.route('**/api/editions',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
   await page.goto('http://127.0.0.1:8765/#stats',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(e=>e.year===2026),null,{timeout:20000});
   await page.evaluate(()=>{state.tab='patterns';draw()});
   const scope=page.locator('.page--stats #wenn-dann-finder');
   await scope.waitFor({state:'visible'});
   assert.equal(await page.locator('.page--stats .bp-stat-tool-heading h2').innerText(),'Wenn–Dann-Finder');
   assert.equal(await page.locator('.page--stats .tool-choice-panel').count(),0,'No duplicated statistics filter');
   assert.equal(await scope.locator('[data-wd-event="a"]').inputValue(),'win');
   assert.equal(await scope.locator('[data-wd-event="b"]').inputValue(),'top3');
   const baseline=await page.evaluate(()=>{
    const opts=window.BAERGSUNNE_WENNDANN_DEFAULTS(),x=window.BAERGSUNNE_WENNDANN_CALCULATE(db,opts);
    let total=0,success=0,ignored=0;
    for(const e of db.editions)for(const p of e.players){
      const rr=[...e.rounds].sort((a,b)=>a.number-b.number);
      for(let i=0;i<rr.length;i++){
       const a=rr[i].results.find(x=>x.player_id===p);
       if(a?.place!==1)continue;
       const next=rr[i+1];if(!next){ignored++;continue}
       const b=next.results.find(x=>x.player_id===p);
       if(!b)continue;
       total++;if(b.place<=3)success++;
      }
    }
    const heading=document.querySelector('.page--stats .bp-stat-tool-heading h2')?.textContent;
    const desc=document.querySelector('.wd-explainer')?.innerText||'';
    return {x,expected:{total,success,ignored},heading,desc,overflow:document.documentElement.scrollWidth-innerWidth};
   });
   assert.equal(baseline.x.total,baseline.expected.total,'Source archive independently recomputed: denominator');
   assert.equal(baseline.x.success,baseline.expected.success,'Source archive independently recomputed: numerator');
   assert.equal(baseline.x.ignored.length,baseline.expected.ignored,'No follow-up excluded');
   assert(baseline.x.total>0,'Has valid archive result pairs');
   assert(baseline.desc.includes('Was schauen wir uns an?')&&baseline.desc.includes('Was zeigen die Ergebnisse?')&&baseline.desc.includes('Ein Beispiel aus dem Archiv:'),'Immediate natural-language interpretation and evidence');
   assert(baseline.overflow<=2,width+' no sideways overflow');
   await scope.locator('[data-wd-event="a"]').selectOption('last');
   const modified=await page.locator('.wd-explainer').innerText();
   assert(modified.includes('letzte Platz')&&modified.includes('vergleichbaren Fällen'),'Every selection recomputes interpretation');
   await page.locator('[data-wd-event="b"]').selectOption('improve');
   assert((await page.locator('.wd-explainer').innerText()).includes('mindestens 3 Plätze'),'Improvement thresholds included in explanation');
   await page.locator('[data-wd-number="delta"]').fill('2');
   await page.locator('[data-wd-number="delta"]').press('Tab');
   assert((await page.locator('.wd-explainer').innerText()).includes('mindestens 2 Plätze'),'Numeric threshold updates explanation');
   await page.locator('[data-wd-preset="0"]').click();
   assert.equal(await scope.locator('[data-wd-event="a"]').inputValue(),'win');
   assert.equal(await scope.locator('[data-wd-event="b"]').inputValue(),'top3');
   await page.locator('details.wd-filters summary').first().click();
   await page.locator('[data-wd-none="years"]').click();
   assert((await page.locator('.wd-explainer').innerText()).includes('keine auswertbaren Rundenpaare'),'No data is explained, no misleading 0%');
   await page.locator('[data-wd-all="years"]').click();
   await page.locator('[data-wd-save]').click();
   assert.equal(await page.locator('details.wd-saved').count(),1,'Can save a question locally');
   await page.locator('[data-wd-event="b"]').selectOption('win');
   await page.locator('[data-wd-load="0"]').click();
   assert.equal(await scope.locator('[data-wd-event="b"]').inputValue(),'top3','Saved question can be restored');
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(e=>e.year===2026),null,{timeout:20000});
   await page.evaluate(()=>{state.tab='patterns';draw()});
   assert.equal(await page.locator('[data-wd-event="b"]').inputValue(),'top3','Local choice survives reload');
   const details=await page.evaluate(()=>{
    const e=db.editions.find(e=>e.year===2026);
    const r=e.rounds.find(r=>r.number===6);
    const ties=r.results.filter(x=>x.place===3);
    const x=window.BAERGSUNNE_WENNDANN_CALCULATE(db,{...window.BAERGSUNNE_WENNDANN_DEFAULTS(),players:['Frauchi'],years:[2026]});
    return {ties:ties.map(x=>x.player_id),x};
   });
   assert(details.ties.length>=2,'2026 shared third place fixture exists');
   assert(details.x.total>0&&details.x.cases.every(x=>x.player==='Frauchi'),'Year / player filters work');
   assert.deepEqual(errors,[],width+' no runtime errors');
   console.log('WENN_DANN_FINDER_PASS',JSON.stringify({width,success:baseline.x.success,total:baseline.x.total,ignored:baseline.x.ignored.length}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('WENN_DANN_FINDER_FAIL',e);process.exit(1)});
