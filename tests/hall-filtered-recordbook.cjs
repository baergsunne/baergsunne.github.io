const {chromium}=require('playwright');
const assert=require('node:assert/strict');

(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,390,768]){
   const page=await browser.newPage({viewport:{width,height:900},isMobile:width<500,hasTouch:width<500});
   const errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   await page.goto('http://127.0.0.1:8765/#fame',{waitUntil:'domcontentloaded'});
   await page.waitForSelector('.page--fame .hof-record');
   const initial=await page.evaluate(()=>{
    const root=document.querySelector('.page--fame');
    const title=root.querySelector('.premium-masthead');
    const filter=root.querySelector('.hof-filter');
    const podium=root.querySelector('.podium');
    return {
     filterInside:filter?.parentElement===root,
     heroBeforeFilter:!!(title.compareDocumentPosition(filter)&Node.DOCUMENT_POSITION_FOLLOWING),
     filterBeforePodium:!!(filter.compareDocumentPosition(podium)&Node.DOCUMENT_POSITION_FOLLOWING),
     records:root.querySelectorAll('.hof-record').length,
     horizontalOverflow:document.documentElement.scrollWidth>innerWidth+2,
     verticalFilterHeight:filter.getBoundingClientRect().height
    };
   });
   assert(initial.filterInside&&initial.heroBeforeFilter&&initial.filterBeforePodium,'filter is directly beneath hero before championship podium');
   assert.equal(initial.records,50,'full original recordbook remains unchanged before a filter');
   assert(!initial.horizontalOverflow,'no horizontal overflow '+width);
   assert(initial.verticalFilterHeight<200,'filter significantly more compact than the former large selection panel');

   await page.locator('.hof-filter-choice[data-action="openyears"]').click();
   for(const y of [2025,2026])await page.locator('.sheet [data-action="toggleyear"][data-value="'+y+'"]').click();
   await page.locator('.sheet .iconbtn[data-action="closemodal"]').click();
   const selectedYears=await page.evaluate(()=>{
    const result=window.BaergsunneHallRecords.calculate(window.POKER_SEED,{years:[2025,2026]});
    const editions=window.POKER_SEED.editions.filter(e=>[2025,2026].includes(e.year));
    const actual=Object.fromEntries(result.records.find(x=>x.title==='Meistertitel').table.map(x=>[x.name,x.value]));
    const expected={};
    for(const e of editions)for(const rank of e.official_standings)
     expected[rank.player_id]=(expected[rank.player_id]||0)+(rank.place===1?1:0);
    return {years:result.years,records:result.records.length,actual,expected,
     displayed:document.querySelectorAll('.page--fame .hof-record').length,
     scope:document.querySelector('.page--fame .hof-filter-choice[data-action="openyears"] strong')?.textContent};
   });
   assert.equal(selectedYears.years,2,'only 2025/2026 enter the calculations');
   assert.deepEqual(selectedYears.actual,selectedYears.expected,'titles are recalculated from official standings for exactly those years');
   assert.equal(selectedYears.displayed,selectedYears.records,'all categories show results of filtered calculation');
   assert(selectedYears.scope.includes('2025')&&selectedYears.scope.includes('2026'),'chosen years visible in compact control');

   await page.locator('.hof-tab[data-hof-tab="Hall of Shame"]').click();
   await page.locator('.hof-filter-choice[data-action="openplayers"]').click();
   await page.locator('.sheet [data-action="toggle"][data-value="Frauchi"]').click();
   await page.locator('.sheet .iconbtn[data-action="closemodal"]').click();

   const single=await page.evaluate(()=>{
    const data=window.BaergsunneHallRecords.calculate(window.POKER_SEED,{years:[2025,2026],players:['Frauchi']});
    const ownerRecords=data.records.filter(r=>r.category!=='Rivalitäten');
    const owners=ownerRecords.flatMap(r=>r.table.map(x=>x.name));
    return {
     years:data.years,players:data.players,scope:document.querySelector('.hof-filter-choice[data-action="openplayers"] strong').textContent,
     owners,tab:document.querySelector('.hof-tab.selected')?.dataset.hofTab,
     rivalCount:data.records.filter(r=>r.category==='Rivalitäten').length,
     noTournamentOnlyRecord:!data.records.some(r=>r.title==='Meiste Führungswechsel'),
     count:document.querySelectorAll('.page--fame .hof-record').length,
     computedCount:data.records.length,
     hasUnofficial:ownerRecords.some(r=>r.table.some(x=>x.name.replace(/\s+\(\d{4}\)$/,'')!=='Frauchi')),
     horizontalOverflow:document.documentElement.scrollWidth>innerWidth+2
    };
   });
   assert.equal(single.players,1,'selected player is the only eligible player');
   assert.equal(single.years,1,'only the one selected tournament with that player remains');
   assert(single.scope.includes('Frauchi'),'player visible in control');
   assert.equal(single.tab,'Hall of Shame','recordbook category selection survives redraw');
   assert(!single.hasUnofficial,'no other people in personal record lists');
   assert.equal(single.rivalCount,0,'no invented head-to-head records for a single player');
   assert(single.noTournamentOnlyRecord,'unattributable tournament-wide metrics are not presented as player records');
   assert.equal(single.count,single.computedCount,'page and engine use same filter');
   assert(!single.horizontalOverflow,'no overflow after filters');

   await page.locator('.hof-filter-reset').click();
   assert.equal(await page.locator('.page--fame .hof-record').count(),50,'reset restores full original recordbook');
   assert((await page.locator('.hof-filter-note').innerText()).includes('Alle historischen'),'reset message appears');
   assert.deepEqual(errors,[],'no JS errors on '+width);
   console.log('HALL_FILTERED_RECORDBOOK_SUCCESS',width);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error('HALL_FILTERED_RECORDBOOK_FAILURE',e);process.exit(1)});
