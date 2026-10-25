const {chromium}=require('playwright');
const assert=require('node:assert/strict');

(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,390,768]){
   const page=await browser.newPage({viewport:{width,height:900},isMobile:width<500,hasTouch:width<500});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.goto('http://127.0.0.1:8765/#fame',{waitUntil:'domcontentloaded'});
   await page.waitForSelector('.page--fame .hof-record');
   const initial=await page.evaluate(()=>{
    const root=document.querySelector('.page--fame'),hero=root.querySelector('.premium-masthead');
    const filter=root.querySelector(':scope > .tool-choice-panel'),podium=root.querySelector('.podium');
    return {attached:filter?.parentElement===root,afterHero:!!(hero.compareDocumentPosition(filter)&Node.DOCUMENT_POSITION_FOLLOWING),
      beforePodium:!!(filter.compareDocumentPosition(podium)&Node.DOCUMENT_POSITION_FOLLOWING),
      closed:!filter.open,height:filter.getBoundingClientRect().height,
      summary:filter.querySelector('summary')?.textContent,
      count:root.querySelectorAll('.hof-record').length,oldControl:!!root.querySelector('.hof-filter'),
      overflow:document.documentElement.scrollWidth>innerWidth+2};
   });
   assert(initial.attached&&initial.afterHero&&initial.beforePodium,'Statistics accordion is directly beneath Hall hero');
   assert(initial.closed&&initial.height<200,'same compact collapsed accordion as Statistics');
   assert.match(initial.summary,/Jahr und Spieler auswählen/);
   assert.match(initial.summary,/Turniere/);
   assert.match(initial.summary,/Spieler/);
   assert(!initial.oldControl,'the old two-card Hall filter was removed');
   assert.equal(initial.count,50,'full archive displayed before selection');
   assert(!initial.overflow,'no horizontal overflow '+width);

   const panel=page.locator('.page--fame > .tool-choice-panel');
   await panel.locator('summary').click();
   assert(await panel.evaluate(el=>el.open),'accordion opens on tap');
   assert.equal(await panel.locator('[data-tool-choice="years"]').count(),17,'all 17 documented tournament years available');

   await panel.locator('[data-tool-pick="years"][data-tool-mode="none"]').click();
   for(const year of [2025,2026]){
    await panel.locator('[data-tool-choice="years"][value="'+year+'"]').check();
   }
   assert(await panel.evaluate(el=>el.open),'accordion remains open after year changes');
   const selection=await page.evaluate(()=>{
    const data=window.BaergsunneHallRecords.calculate(window.POKER_SEED,{years:[2025,2026]});
    const editions=window.POKER_SEED.editions.filter(e=>[2025,2026].includes(e.year));
    const actual=Object.fromEntries(data.records.find(r=>r.title==='Meistertitel').table.map(x=>[x.name,x.value]));
    const expected={};
    for(const e of editions)for(const rank of e.official_standings)
     expected[rank.player_id]=(expected[rank.player_id]||0)+(rank.place===1?1:0);
    return {years:data.years,records:data.records.length,actual,expected,
      displayed:document.querySelectorAll('.page--fame .hof-record').length,
      summary:document.querySelector('.page--fame .tool-choice-panel summary small')?.textContent,
      podium:document.querySelector('.page--fame .podium')?.textContent};
   });
   assert.equal(selection.years,2);
   assert.deepEqual(selection.actual,selection.expected,'championships recalculated from 2025 and 2026 only');
   assert.equal(selection.displayed,selection.records,'visible recordbook matches recomputed data');
   assert(selection.summary.includes('2 Turniere'),'scope count updates in shared control');
   assert(selection.podium.includes('Frauchi'),'Hall podium now reflects selected years');

   await page.locator('.hof-tab[data-hof-tab="Hall of Shame"]').click();
   await panel.locator('[data-tool-pick="players"][data-tool-mode="none"]').click();
   await panel.locator('[data-tool-choice="players"][value="Frauchi"]').check();
   const single=await page.evaluate(()=>{
    const data=window.BaergsunneHallRecords.calculate(window.POKER_SEED,{years:[2025,2026],players:['Frauchi']});
    const owners=data.records.filter(r=>r.category!=='Rivalitäten').flatMap(r=>r.table.map(x=>x.name));
    return {years:data.years,players:data.players,summary:document.querySelector('.page--fame .tool-choice-panel summary small')?.textContent,
      activeCategory:document.querySelector('.hof-tab.selected')?.dataset.hofTab,
      allOwnersEligible:owners.every(name=>name.replace(/\s+\(\d{4}\)$/,'')==='Frauchi'),
      rivals:data.records.filter(r=>r.category==='Rivalitäten').length,
      count:document.querySelectorAll('.page--fame .hof-record').length,computed:data.records.length,
      noTournamentOnlyRecord:!data.records.some(r=>r.title==='Meiste Führungswechsel'),
      noOverflow:document.documentElement.scrollWidth<=innerWidth+2};
   });
   assert.equal(single.years,1,'only 2026 featuring Frauchi can contribute');
   assert.equal(single.players,1,'only chosen player can win records');
   assert(single.summary.includes('1 Spieler'),'selected player count visible');
   assert.equal(single.activeCategory,'Hall of Shame','selected category persists while changing filter');
   assert(single.allOwnersEligible,'no foreign players in personal records');
   assert.equal(single.rivals,0,'no artificial player rivalries');
   assert(single.noTournamentOnlyRecord,'non-player-specific records do not become personal records');
   assert.equal(single.count,single.computed);
   assert(single.noOverflow);

   // Shared component resets this page alone; it must not alter Stats overview.
   await panel.locator('[data-tool-reset]').click();
   assert.equal(await page.locator('.page--fame .hof-record').count(),50,'reset restores all original records');
   assert((await panel.locator('summary small').innerText()).includes('17 Turniere'),'all year count returns');
   assert(await panel.evaluate(el=>el.open),'reset retains open accordion');

   // The same From/To range selection offered in the Statistics overview.
   await panel.locator('#tool-year-from').selectOption('2025');
   await panel.locator('#tool-year-to').selectOption('2026');
   await panel.locator('[data-tool-range="years"]').click();
   assert((await panel.locator('summary small').innerText()).includes('2 Turniere'),'year range selection works');

   await page.locator('[data-action="go"][data-value="stats"]').first().click();
   await page.waitForSelector('.page--stats .tool-choice-panel');
   const stats=await page.locator('.page--stats .tool-choice-panel summary small').innerText();
   assert(!stats.includes('2 Turniere'),'Hall filter does not leak to Statistics overview');
   await page.locator('[data-action="go"][data-value="fame"]').first().click();
   await page.waitForSelector('.page--fame .tool-choice-panel');
   assert((await page.locator('.page--fame .tool-choice-panel summary small').innerText()).includes('2 Turniere'),'Hall filter persists on navigation');
   assert.deepEqual(errors,[],'no JavaScript runtime failures '+width);
   console.log('HALL_SHARED_ACCORDION_SUCCESS',width);
   await page.close();
  }
 }finally{await browser.close()}
})().catch(error=>{console.error('HALL_SHARED_ACCORDION_FAILURE',error);process.exit(1)});
