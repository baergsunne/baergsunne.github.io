/* Dark second-level stages must differ from unchanged inset cards/rows. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fixture=require('./fixture-2026.json');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,390,430,768,1024]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:width<600,hasTouch:width<600});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/api/editions',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
   await page.route('**/api/live',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'planned',players:[],standings:[],rounds:[]})}));
   await page.goto('http://127.0.0.1:8765/#home',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(e=>e.year===2026),null,{timeout:20000});
   const audit=await page.evaluate(()=>{
    const background=selector=>{const n=document.querySelector(selector);return n?{bg:getComputedStyle(n).backgroundImage,shadow:getComputedStyle(n).boxShadow,
       rect:n.getBoundingClientRect().toJSON()}:null};
    const report={};
    const scenes=[
     ['home','home',null,{
      large:['.page--home .discovery-live'],
      unchanged:['.page--home .discovery-feature','.page--home .discovery-counts>div','.page--home .discovery-champion']
     }],
     ['statistics','stats','overview',{
      large:['.page--stats .stat-content .card','.page--stats .tool-choice-panel'],
      unchanged:['.page--stats .stat-content>.metrics>.kpi','.page--stats .tool-tile','.page--stats .stat-content table.bp-stat-personalized-table tbody tr']
     }],
     ['history','history',null,{
      large:['.page--history .history-yearbook-card'],
      unchanged:['.page--history .history-insight-metric','.page--history .history-entry-tile']
     }],
     ['simulator','stats','simulator',{
      large:['.page--stats #baergsunne-simulator'],
      unchanged:['.page--stats .tool-tile']
     }],
     ['live','live',null,{
      large:['.page--live .cl-block,.page--live .cl-leader,.page--live .discovery-live'],
      unchanged:['.page--live .cl-kpis>div']
     }]
    ];
    for(const [key,view,tab,selectors] of scenes){
     state.page=view;if(tab)state.tab=tab;if(view==='history')state.historyYear=2026;draw();
     report[key]={large:selectors.large.map(background),unchanged:selectors.unchanged.map(background),
      overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
    }
    report.shell={page:getComputedStyle(document.querySelector('.page')).backgroundColor,
     header:getComputedStyle(document.querySelector('header.heritage-header')).backgroundColor,
     nav:getComputedStyle(document.querySelector('nav.bottomnav')).backgroundColor};
    return report;
   });
   const forestStart='rgb(32, 61, 48)',forestEnd='rgb(11, 36, 27)';
   let sampled=0,innerSampled=0;
   for(const [scene,snapshot] of Object.entries(audit)){
    if(scene==='shell')continue;
    assert(snapshot.overflow<=2,width+' '+scene+' horizontal overflow');
    for(const [i,x] of snapshot.large.entries()){
     if(!x)continue;
     sampled++;
     assert(x.bg.includes('225deg')&&x.bg.includes(forestStart)&&x.bg.includes(forestEnd),width+' '+scene+' '+i+' large panel must fade from muted forest to page background: '+x.bg);
     assert(!x.bg.includes('rgba(234, 193, 115'),width+' '+scene+' no yellow at panel start');
     assert(x.rect.width>160,width+' '+scene+' large panel geometry');
    }
    for(const [i,x] of snapshot.unchanged.entries()){
     if(!x)continue;
     innerSampled++;
     if(!x.bg.includes('gradient'))continue;
     assert(!x.bg.includes(forestStart),width+' '+scene+' '+i+' inset or link tile must NOT get new level-two color');
    }
   }
   assert(sampled>=4,width+' checked enough panels');
   assert(innerSampled>=4,width+' checked enough unchanged tiles');
   assert.equal(audit.shell.page,'rgb(11, 36, 27)');
   assert.equal(audit.shell.header,audit.shell.page);
   assert.equal(audit.shell.nav,audit.shell.page);
   assert.deepEqual(errors,[],width+' browser exceptions');
   console.log('DARK_SECOND_LEVEL_FOREST_PASS',JSON.stringify({width,large:sampled,untouched:innerSampled}));
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error('DARK_SECOND_LEVEL_FOREST_FAIL',e);process.exit(1)});
