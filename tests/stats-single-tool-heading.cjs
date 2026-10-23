const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fixture=require('./fixture-2026.json');

const names={
 overview:'Übersicht',patterns:'Wenn–Dann-Finder',insights:'Analysen',
 standard:'Schnellanalysen',career:'Karrieren',rivals:'Duelle',
 rounds:'Runden',heatmap:'Heatmap',race:'Race',simulator:'Simulator',
 records:'Rekorde',lab:'Diagramme',studio:'Analyse-Studio'
};
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
   const featured=await page.evaluate(()=>{
    const pageRoot=document.querySelector('.page--stats');
    const tile=pageRoot?.querySelector('.tool-directory .tool-tile--featured');
    const all=[...pageRoot?.querySelectorAll('.tool-directory button.tool-tile')||[]];
    return {flagship:!!pageRoot?.querySelector('.studio-flagship'),oldIntro:!!pageRoot?.querySelector('.tool-directory-intro'),
     count:all.length,first:all[0]?.dataset.value,studioTiles:all.filter(t=>t.dataset.value==='studio').length,
     activeTitle:pageRoot?.querySelector('#selected-stat-tool > .bp-stat-tool-heading h2')?.textContent,
     featured:!!tile,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
   });
   assert(!featured.flagship&&!featured.oldIntro,width+' old heartpiece and double introductory text removed');
   assert.equal(featured.count,13,width+' all 13 statistics tools accessible');
   assert.equal(featured.first,'studio',width+' Analyse-Studio appears first');
   assert.equal(featured.studioTiles,1,width+' exactly one studio tile');
   assert(featured.featured&&featured.overflow<=2,width+' prominent studio tile fits screen');
   const results=await page.evaluate(names=>{
    const out=[];
    for(const [tab,label] of Object.entries(names)){
     state.page='stats';state.tab=tab;draw();
     const scope=document.querySelector('.page--stats #selected-stat-tool');
     const heading=scope?.querySelector(':scope > .bp-stat-tool-heading');
     const title=heading?.querySelector('h2');
     const description=heading?.querySelector('p');
     const rect=heading?.getBoundingClientRect();
     out.push({tab,label,title:title?.textContent?.trim(),description:description?.textContent?.trim(),
      headingCount:scope?.querySelectorAll(':scope > .bp-stat-tool-heading').length,
      oldHeaderCount:document.querySelectorAll('.page--stats .tool-active-heading').length,
      oldInternalHeadingCount:scope?.querySelectorAll('.pattern-head,.ab-top').length,
      legacyTitleCount:scope?.querySelectorAll(':scope > .sectiontitle:not(.bp-stat-tool-heading)').length,
      toolExists:!!scope?.querySelector(tab==='patterns'?'#wenn-dann-finder':tab==='studio'?'#abStudio':tab==='simulator'?'#baergsunne-simulator':'.card,.metrics,.datawarn,.story-section,.heat-scroll,.record-grid,.insight-workspace'),
      pickerCount:scope?.querySelectorAll('.tool-choice-panel').length,
      headingWidth:rect?.width||0,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth});
    }
    return out;
   },names);
   assert.equal(results.length,Object.keys(names).length);
   for(const r of results){
    assert.equal(r.title,r.label,width+' '+r.tab+' uses the actual tool name');
    assert.equal(r.headingCount,1,width+' '+r.tab+' has exactly one tool introduction');
    assert.equal(r.oldHeaderCount,0,width+' '+r.tab+' has no upper selection banner');
    assert.equal(r.oldInternalHeadingCount,0,width+' '+r.tab+' has no embedded duplicate intro');
    assert.equal(r.legacyTitleCount,0,width+' '+r.tab+' has no old direct headline');
    assert(r.description&&r.description.length>35,width+' '+r.tab+' needs an explanation');
    assert.equal((r.description.match(/[.!?]/g)||[]).length,1,width+' '+r.tab+' explanation is one sentence');
    assert(r.headingWidth>150,width+' '+r.tab+' heading is visible');
    assert(r.toolExists,width+' '+r.tab+' original tool content stays mounted');
    assert(r.overflow<=2,width+' '+r.tab+' no horizontal overflow');
   }
   assert(results.find(x=>x.tab==='overview').pickerCount>0,'Original overview filter must remain');
   assert(results.find(x=>x.tab==='career').pickerCount>0,'Original career filter must remain');
   assert.equal(results.find(x=>x.tab==='simulator').pickerCount,0,'Simulator owns its selectors');
   assert.deepEqual(errors,[],width+' no browser exceptions');
   console.log('STATS_SINGLE_TOOL_HEADING_PASS',JSON.stringify({width,tools:results.length,names:results.map(x=>x.title)}));
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error('STATS_SINGLE_TOOL_HEADING_FAIL',e);process.exit(1)});
