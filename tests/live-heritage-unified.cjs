/* Visual-only Live page regression: consistent Heritage surfaces and real
   final 2026 results, across iPhone / tablet / desktop breakpoints. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fixture=require('./fixture-2026.json');
const edition=fixture.editions.find(e=>e.year===2026);
assert(edition,'Official completed 2026 tournament fixture is required');
const leader=edition.official_standings.find(x=>x.place===1);
const maxPoints=Math.max(...edition.official_standings.map(x=>x.points));
const rounds=edition.rounds.map(r=>({
 number:r.number,winner:r.results.find(x=>x.place===1)?.player_id||'–',
 results:r.results.map(x=>({player:x.player_id,place:x.place,points:x.points}))
}));
const standings=edition.official_standings.map(x=>({
 player:x.player_id,rank:x.place,points:x.points,
 gap:maxPoints-x.points,movement:0,wins:rounds.filter(r=>r.results.some(y=>y.player===x.player_id&&y.place===1)).length,
 podiums:rounds.filter(r=>r.results.some(y=>y.player===x.player_id&&y.place<=3)).length,
 played:rounds.length,places:rounds.map(r=>r.results.find(y=>y.player===x.player_id)?.place)
}));
const live={
 status:'final',year:2026,players:edition.players,round_count:edition.round_count,
 scoring:edition.scoring.points_by_place,rounds,standings,
 leaders:[leader.player_id],updated_at:'Offizieller Endstand 2026'
};
const sample=e=>{
 if(!e)return null;
 const s=getComputedStyle(e),r=e.getBoundingClientRect();
 return {bg:s.backgroundImage,shadow:s.boxShadow,font:s.fontFamily,color:s.color,
  left:r.left,right:r.right,width:r.width,height:r.height};
};
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,375,390,430,768,1024]){
   const page=await browser.newPage({viewport:{width,height:880},isMobile:width<=430,hasTouch:width<=430});
   await page.emulateMedia({reducedMotion:'reduce'});
   const errors=[];page.on('pageerror',err=>errors.push(err.message));
   await page.route('**/api/live',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(live)}));
   await page.route('**/api/editions',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
   await page.goto('http://127.0.0.1:8765/#live',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof db!=='undefined'&&document.querySelector('.page--live'),null,{timeout:20000});
   await page.waitForFunction(()=>window.BAERGSUNNE_CHAMPIONSHIP?.mount,null,{timeout:16000});
   await page.evaluate(data=>{
    window.BAERGSUNNE_PUBLIC_LIVE=data;
    state.page='live';
    draw();
    window.BAERGSUNNE_CHAMPIONSHIP.mount();
   },live);
   await page.waitForFunction(()=>document.querySelector('.page--live .cl-table tbody tr'),null,{timeout:8000});
   const metrics=await page.evaluate(()=>{
    const $=s=>document.querySelector('.page--live '+s);
    const css=e=>{if(!e)return null;const st=getComputedStyle(e),r=e.getBoundingClientRect();return {
     gradient:st.backgroundImage,shadow:st.boxShadow,color:st.color,
     font:st.fontFamily,left:r.left,right:r.right,width:r.width,height:r.height
    }};
    const rowCount=$$('.cl-table tbody tr');
    function $$(s){return document.querySelectorAll('.page--live '+s);}
    const boards=[...$$('.discovery-live-row:not(.heading)')];
    return {
      sheet:[...document.querySelectorAll('link[rel=stylesheet]')].some(x=>x.href.includes('live-unified-design.css?v=20261024-live-heritage1')),
      title:$('>.premium-masthead')?.querySelector('h1')?.textContent||$('.premium-masthead h1')?.textContent,
      leader:$('.cl-leader-score strong')?.textContent,
      stage:css($('.cl-leader')),kpi:css($('.cl-kpis>div')),block:css($('.cl-block')),
      master:css($('.discovery-live')),admin:css($('.live-admin-entry')),
      heading:css($('.cl-head h2')),bigHeader:css($('.cl-table thead th')),
      rankRow:css($('.cl-table tbody tr')),rankFirst:css($('.cl-table tbody td:first-child')),
      link:css($('.cl-table .cl-player-link')),
      legacyRow:css($('.discovery-live-row:not(.heading)')),
      form:css($('.cl-form li')),
      chart:css($('.cl-chart')),
      headerFont:getComputedStyle($('.premium-masthead h1')).fontFamily,
      rowCount:rowCount.length,boards:boards.length,
      winner:$('.cl-table tbody tr:first-child .cl-player-link')?.textContent,
      points:$('.cl-table tbody tr:first-child td:nth-child(3)')?.textContent,
      year:$('.cl-kicker')?.textContent,
      status:$('.cl-status')?.textContent,
      trophy:$('.cl-leader-trophy')?.getAttribute('src'),
      chartCheckbox:$$('.cl-legend input[type=checkbox]').length,
      details:$$('.cl-block[open] > summary').length,
      left:$('.discovery-livepage')?.getBoundingClientRect().left,
      right:$('.discovery-livepage')?.getBoundingClientRect().right,
      pageOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth
    };
   });
   assert(metrics.sheet,'Live Heritage stylesheet is loaded');
   assert.equal(metrics.title,'Live');
   assert.equal(metrics.leader,leader.player_id);
   assert.equal(metrics.winner,leader.player_id);
   assert(metrics.points.includes(String(leader.points)),'Official champion points unchanged');
   assert.equal(metrics.rowCount,edition.players.length,'Detailed standings preserve all competitors');
   assert.equal(metrics.boards,edition.players.length,'Classic live ranking preserves all competitors');
   assert.equal(metrics.status,'ABGESCHLOSSEN','Finished 2026 status stays final');
   assert(metrics.year.includes('2026'));
   assert.equal(metrics.trophy,'assets/trophy-premium.webp');
   assert(metrics.chartCheckbox>0,'Interactive chart legend retained');
   assert(metrics.details>0,'Original open chart retained');
   assert(metrics.pageOverflow<=2,width+' live page must not overflow viewport: '+metrics.pageOverflow);
   assert(metrics.left>=0&&metrics.right<=width+2,width+' live page bounds');
   for(const name of ['stage','kpi','block','master','admin','rankRow','legacyRow']){
    const item=metrics[name];assert(item,width+' missing '+name);
    assert(item.gradient.includes('225deg'),width+' '+name+' uses one Heritage light direction: '+item.gradient);
    assert(item.shadow!=='none',width+' '+name+' has downward-left shadow');
    assert(item.left>=-1&&item.right<=width+2,width+' '+name+' stays inside viewport');
   }
   assert(metrics.rankFirst.color===metrics.bigHeader.color,'Live ranking gold accents match');
   assert.equal(metrics.heading.font,metrics.headerFont,'Live section heading inherits the site typography');
   assert(metrics.link.height>=32,'Player links retain comfortable touch height');
   await page.locator('.page--live .cl-block').filter({has:page.locator('> summary',{hasText:'Rundenchronik'})}).locator('> summary').click();
   assert(await page.locator('.page--live .cl-round').count()===edition.round_count,'Chronology preserves published rounds');
   await page.locator('.page--live .cl-round > summary').first().click();
   assert(await page.locator('.page--live .cl-round[open] ol li').count()===edition.players.length,'Round results stay expandable');
   const checkbox=page.locator('.page--live .cl-legend input[type=checkbox]').first();
   await checkbox.uncheck();
   const invisible=await page.locator('.page--live .cl-chart polyline').first().evaluate(el=>getComputedStyle(el).display);
   assert.equal(invisible,'none','Chart filtering remains functional');
   await checkbox.check();
   const visible=await page.locator('.page--live .cl-chart polyline').first().evaluate(el=>getComputedStyle(el).display);
   assert.notEqual(visible,'none','Chart series returns when checked');
   assert.deepEqual(errors,[],width+' Live visual regression browser errors');
   console.log('LIVE_HERITAGE_UNIFIED_PASS',JSON.stringify({width,rows:metrics.rowCount,legacyRows:metrics.boards,
     officialChampion:metrics.winner,status:metrics.status,overflow:metrics.pageOverflow}));
   await page.close();
  }
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await page.goto('http://127.0.0.1:8765/#live',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('.page--live'));
  await page.evaluate(()=>{window.BAERGSUNNE_PUBLIC_LIVE={status:'planned',year:2027,players:[],rounds:[],standings:[]};state.page='live';draw();});
  const planned=await page.evaluate(()=>({message:document.querySelector('.discovery-live-empty')?.innerText,
   intro:document.querySelector('.cl-table'),bg:getComputedStyle(document.querySelector('.discovery-live-empty')).backgroundImage}));
  assert(planned.message?.includes('Kein aktives Live-Turnier'),'No-live view intact');
  assert.equal(planned.intro,null,'No fake championship while inactive');
  assert(planned.bg.includes('225deg'),'No-live tile shares same gradient');
  await page.close();
 }finally{await browser.close()}
})().catch(e=>{console.error('LIVE_HERITAGE_UNIFIED_FAIL',e);process.exit(1)});
