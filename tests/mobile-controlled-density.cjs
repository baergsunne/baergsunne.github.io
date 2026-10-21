const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fixture=require('./fixture-2026.json');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,375,390,430,768]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:width<=430,hasTouch:width<=430});
   await page.emulateMedia({reducedMotion:'reduce'});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   for(const path of ['live','editions'])await page.route('**/api/'+path,route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify(path==='editions'?fixture:{status:'final',year:2026,players:fixture.editions[0].players,rounds:[],standings:fixture.editions[0].official_standings.map(x=>({player:x.player_id,rank:x.place,points:x.points}))})
   }));
   await page.goto('http://127.0.0.1:8765/#history',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(e=>e.year===2026),null,{timeout:25000});
   const initial=await page.evaluate(()=>{
    const sheet=document.querySelector('link[href*="mobile-controlled-density.css"]');
    const head=document.querySelector('.heritage-header'),nav=document.querySelector('.bottomnav');
    if(!sheet||!head||!nav)return {error:'missing new sheet, header or nav'};
    const height=x=>Math.round(x.getBoundingClientRect().height);
    const state=()=>({head:height(head),nav:height(nav),
     logo:height(document.querySelector('.heritage-logo')),
     menu:height(document.querySelector('.heritage-menu')),
     buttons:[...document.querySelectorAll('.bottomitem')].map(el=>({h:height(el),icon:height(el.querySelector('.bp-icon')),color:getComputedStyle(el.querySelector('.bp-icon')).filter})),
     mainPadding:getComputedStyle(document.querySelector('main')).paddingBottom,
     footerPadding:getComputedStyle(document.querySelector('footer')).paddingBottom
    });
    const newer=state();
    sheet.disabled=true;
    const previous=state();
    sheet.disabled=false;
    return {newer,previous};
   });
   assert(!initial.error,JSON.stringify(initial));
   assert(initial.newer.head<initial.previous.head,width+'px: compact header must be shorter '+JSON.stringify(initial));
   assert(initial.newer.logo<initial.previous.logo,'Logo becomes smaller');
   assert(initial.newer.menu>=44,'Menu remains a minimum 44px tap target');
   assert(initial.newer.nav<initial.previous.nav,width+'px: bottom nav becomes shorter');
   assert.equal(initial.newer.buttons.length,5,'all nav pages remain');
   assert(initial.newer.buttons.every(x=>x.h>=44&&x.icon>=19&&x.icon<=22),'touch targets and icons remain usable');
   assert(initial.newer.buttons.every(x=>x.color===initial.newer.buttons[0].color),'all icons have the same gold filter');
   assert(parseFloat(initial.newer.mainPadding)<parseFloat(initial.previous.mainPadding),'reduce redundant main bottom whitespace');
   // Switch to Historie carousel; compare full sticky group, not child alone.
   await page.evaluate(()=>{state.page='history';draw();window.scrollTo({top:0,behavior:'instant'});});
   await page.waitForTimeout(120);
   const histor=await page.evaluate(()=>{
    const g=document.querySelector('.history-sticky-group');
    const sheet=document.querySelector('link[href*="mobile-controlled-density.css"]');
    if(!g)return {error:'missing history sticky group'};
    const measure=()=>({h:g.getBoundingClientRect().height,position:getComputedStyle(g).position,
     title:g.querySelector('.history-sticky-title h3')?.textContent.trim(),
     stepHeights:[...g.querySelectorAll('.history-step-button')].map(e=>e.getBoundingClientRect().height),
     headerBottom:document.querySelector('.heritage-header').getBoundingClientRect().bottom,
     top:parseFloat(getComputedStyle(g).top)});
    const newer=measure();sheet.disabled=true;const previous=measure();sheet.disabled=false;
    return {newer,previous};
   });
   assert(!histor.error,JSON.stringify(histor));
   if(width<=650){
    assert(histor.newer.h>=70,width+'px: original horizontal controller and heading initially share natural flow '+JSON.stringify(histor));
    assert(histor.newer.stepHeights.every(v=>v>=44),'initial horizontal buttons remain touch friendly');
    assert.equal(await page.locator('.history-mobile-rail.is-active').count(),0,'side rail is not allowed to appear above selector');
    await page.evaluate(()=>{
     const d=document.querySelector('.history-dropdown-controls'),g=document.querySelector('.history-sticky-group');
     scrollTo({top:Math.max(0,scrollY+d.getBoundingClientRect().bottom+18-parseFloat(getComputedStyle(g).top)+62),behavior:'instant'});
    });
    await page.locator('.history-mobile-rail.is-active').waitFor({timeout:5000});
    const side=await page.evaluate(()=>({width:document.querySelector('.history-mobile-rail')?.getBoundingClientRect().width,
     height:document.querySelector('.history-sticky-group')?.getBoundingClientRect().height,
     buttons:[...document.querySelectorAll('.history-mobile-step')].map(x=>x.getBoundingClientRect().height)}));
    assert.equal(side.width,44,'narrow side rail keeps thumb-accessible touch strip');
    assert(side.height>=44&&side.height<=70,'after docking only the title stays sticky');
    assert(side.buttons.every(x=>x===44),'separate side arrows remain 44px high');
   }else{
    assert(histor.newer.h<histor.previous.h,width+'px: legacy landscape slider remains compact');
    assert(histor.newer.stepHeights.every(v=>v>=44),'landscape desktop step buttons retained');
   }
   assert.equal(histor.newer.position,'sticky');
   assert(histor.newer.title&&histor.newer.title.length>4,'title remains legible');
   await page.locator('.history-step-button[data-history-step="-1"]').first().count(); // no interaction mutation needed
   await page.evaluate(()=>{state.page='stats';state.tab='overview';draw()});
   const stats=await page.evaluate(()=>{
    const cards=[...document.querySelectorAll('.page--stats .stat-content > .metrics > .kpi')];
    const values=cards.map(el=>({name:getComputedStyle(el.querySelector('div')).color,
      number:getComputedStyle(el.querySelector('strong')).color,note:getComputedStyle(el.querySelector('small')).color}));
    const metrics=document.querySelector('.page--stats .stat-content > .metrics');
    const css=getComputedStyle(metrics);
    const footer=document.querySelector('.premium-footer');
    return {count:cards.length,colors:values,borderBottom:css.borderBottomWidth,
      before:getComputedStyle(metrics,'::before').content,after:getComputedStyle(metrics,'::after').content,
      footerMargin:getComputedStyle(footer).marginTop,
      overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
      mainPadding:getComputedStyle(document.querySelector('main')).paddingBottom};
   });
   assert.equal(stats.count,4,'four original overview KPIs remain');
   assert(stats.colors.every(x=>x.name==='rgb(232, 195, 126)'&&x.note==='rgb(232, 195, 126)'&&x.number==='rgb(242, 206, 139)'),width+'px: consistent Bärgsunne yellow KPI type');
   assert.equal(stats.borderBottom,'0px','no decorative line under KPI grid');
   assert(stats.overflow<=2,'no new horizontal overflow');
   assert.deepEqual(errors,[],'no runtime errors');
   console.log('MOBILE_CONTROLLED_DENSITY_PASS',JSON.stringify({width,header:{before:initial.previous.head,after:initial.newer.head},nav:{before:initial.previous.nav,after:initial.newer.nav},sticky:{before:histor.previous.h,after:histor.newer.h},stats}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('MOBILE_CONTROLLED_DENSITY_FAIL',e);process.exit(1)});
