const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fixture=require('./fixture-2026.json');

(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,375,390,430,768,1024]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:width<650,hasTouch:width<650});
   await page.emulateMedia({reducedMotion:'reduce'});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/api/live',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'final',year:2026,players:fixture.editions[0].players,rounds:[],standings:fixture.editions[0].official_standings.map(x=>({player:x.player_id,rank:x.place,points:x.points}))})}));
   await page.route('**/api/editions',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
   await page.goto('http://127.0.0.1:8765/#home',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(e=>e.year===2026),null,{timeout:25000});
   const rows=await page.evaluate(()=>{
    const styleTag=document.querySelector('link[href*="heritage-global-layers.css"]');
    if(!styleTag)return {error:'missing global stylesheet'};
    const names=['home','history','stats','players','profile','live','fame'];
    const results=[];
    const box=el=>el?{left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width}:null;
    for(const name of names){
     state.page=name;
     if(name==='profile')state.profile='Schnarre';
     if(name==='stats')state.tab='overview';
     if(name==='history')state.historyYear=2026;
     draw();
     const root=document.querySelector('.page--'+name);
     if(!root){results.push({name,missing:true});continue}
     const hero=name==='home'?root.querySelector('.discovery-hero'):root.querySelector(':scope > .premium-masthead');
     const first=name==='home'?root.querySelector('.discovery-counts>div'):name==='history'?root.querySelector('.history-entry-tile'):name==='stats'?root.querySelector('.tool-tile'):name==='players'?root.querySelector('.playercard'):name==='live'?root.querySelector('.discovery-live,.card,.cl-block,.cl-leader'):root.querySelector('.card');
     const input=root.querySelector('select');
     const main=document.querySelector('main');
     const ground=getComputedStyle(root).backgroundColor,bodyGround=getComputedStyle(document.body).backgroundColor;
     const frame=getComputedStyle(root).borderTopWidth;
     const shadow=first?getComputedStyle(first).boxShadow:null;
     const inputShadow=input?getComputedStyle(input).boxShadow:null;
     const newHero=box(hero),newMainPadding=parseFloat(getComputedStyle(main).paddingLeft);
     const maxOverflow=document.documentElement.scrollWidth-document.documentElement.clientWidth;
     styleTag.disabled=true;
     const oldHero=box(hero),oldMainPadding=parseFloat(getComputedStyle(main).paddingLeft);
     const oldShadow=first?getComputedStyle(first).boxShadow:null;
     styleTag.disabled=false;
     results.push({name,ground,bodyGround,frame,newHero,oldHero,
       newMainPadding,oldMainPadding,shadow,oldShadow,inputShadow,
       maxOverflow,change:newHero&&oldHero?newHero.width-oldHero.width:0});
    }
    state.page='stats';state.tab='race';draw();
    const race=document.querySelector('.race-sticky-control');
    const racePosition=race?getComputedStyle(race).position:'not-found';
    state.page='history';draw();
    const history=document.querySelector('.history-sticky-group');
    return {results,racePosition,
      historyPosition:history?getComputedStyle(history).position:'not-found',
      styleLoaded:!!styleTag,htmlBackground:getComputedStyle(document.documentElement).backgroundColor};
   });
   assert(rows.styleLoaded,'New global CSS must load');
   assert.equal(rows.htmlBackground,'rgb(48, 74, 67)','Heritage ground should be muted, grey-green');
   for(const a of rows.results){
    assert(!a.missing,a.name+' page still renders');
    assert.equal(a.ground,'rgb(48, 74, 67)',a.name+' should use common heritage background');
    assert.equal(a.bodyGround,'rgb(48, 74, 67)','Body should have heritage ground');
    assert(a.maxOverflow<=2,width+'px '+a.name+' must not overflow viewport: '+a.maxOverflow);
    assert(a.shadow&&a.shadow!=='none',a.name+' main tile/card must have elevation');
    assert(a.newHero&&a.oldHero,width+'px '+a.name+' must retain its main visual hero');
    assert(a.newHero.right<=width+1&&a.newHero.left>=-1,width+'px '+a.name+' hero must stay within viewport');
    assert(a.newMainPadding<=a.oldMainPadding,width+'px '+a.name+' outside gutter must not grow');
    if(width<=430){
     assert(a.newMainPadding===8,width+'px mobile outer gutter is exactly 8px');
     assert(a.change>=8,width+'px '+a.name+' should gain useful horizontal width: '+a.change);
    }
    if(a.inputShadow)assert(a.inputShadow!=='none',a.name+' native selector should be slightly raised');
    if(a.name!=='home')assert.equal(a.frame,'0px',a.name+' no extra enclosing page frame');
   }
   assert.equal(rows.racePosition,'sticky','Race slider remains sticky');
   assert.equal(rows.historyPosition,'sticky','History slider remains sticky');
   assert.deepEqual(errors,[],'No script errors after page switches');
   console.log('GLOBAL_HERITAGE_LAYERS_PASS',JSON.stringify({width,results:rows.results.map(x=>({name:x.name,gain:Math.round(x.change),mainPad:x.newMainPadding,overflow:x.maxOverflow}))}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('GLOBAL_HERITAGE_LAYERS_FAIL',e);process.exit(1)});
