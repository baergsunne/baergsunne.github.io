const {chromium}=require('playwright');
const assert=require('node:assert/strict');

(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  for(const width of [320,375,390,430]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
   const errors=[];
   page.on('pageerror',err=>errors.push(err.message));
   for(const path of ['live','editions'])await page.route('**/api/'+path,async route=>{
    try{
     const response=await route.fetch({headers:{...route.request().headers(),origin:'https://baergsunne.github.io'}});
     await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':'http://127.0.0.1:8765'}});
    }catch(err){if(!page.isClosed())try{await route.abort()}catch(_){}}
   });
   await page.goto('http://127.0.0.1:8765/#history',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(x=>x.year===2026),null,{timeout:30000});
   const views=['yearbook','replay','moments','records','field','compare'];
   const probe=()=>page.evaluate(()=>{
    const root=document.querySelector('.history-chronicle');
    const chosen=document.querySelector('.history-entry-tile[aria-pressed="true"]')?.dataset.view;
    const dropdown=root?.querySelector('.history-dropdown-controls');
    const control=root?.querySelector(':scope > .history-carousel-control, :scope > .history-replay-control');
    const header=document.querySelector('.heritage-header');
    if(!root||!dropdown||!control||!header)return {missing:true,chosen};
    const c=control.getBoundingClientRect(),b=dropdown.getBoundingClientRect(),r=root.getBoundingClientRect(),
     style=getComputedStyle(control);
    return {
     missing:false,view:chosen,year:root.querySelector('#history-year-select')?.value,
     yearInputs:dropdown.querySelectorAll('select').length,otherView:!!root.querySelector('#history-view-select'),
     ratio:b.width/r.width,centerDelta:Math.abs((b.left+b.right)/2-(r.left+r.right)/2),
     scroll:scrollY,maxScroll:document.documentElement.scrollHeight-innerHeight,
     top:c.top,docTop:c.top+scrollY,height:c.height,headerBottom:header.getBoundingClientRect().bottom,
     expectedTop:parseFloat(style.top),position:style.position,
     parentBottom:r.bottom,visible:c.height>30&&c.width>180,
     atFront:!!document.elementFromPoint(c.left+Math.min(28,c.width/4),Math.max(0,c.top)+c.height/2)?.closest('.history-carousel-control,.history-replay-control')
    };
   });
   for(const view of views){
    await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
    await page.locator('.history-entry-tile[data-view="'+view+'"]').click();
    await page.waitForTimeout(1200);
    const base=await probe();
    assert.equal(base.missing,false,width+' '+view+' must render carousel control');
    assert.equal(base.view,view,'Correct selected entry');
    assert.equal(base.year,'2026','Changing view must not change year');
    assert.equal(base.yearInputs,1,'Only the tournament year dropdown remains');
    assert.equal(base.otherView,false,'Ansicht dropdown must remain removed');
    assert.ok(Math.abs(base.ratio-.5)<.025,width+' '+view+' year dropdown must be half available width ('+base.ratio+')');
    assert.ok(base.centerDelta<3,width+' '+view+' centered year dropdown ('+base.centerDelta+')');
    assert.equal(base.position,'sticky',width+' '+view+' regulator uses native CSS sticky');
    assert.ok(Math.abs(base.expectedTop-base.headerBottom-8)<4,width+' '+view+' sticky offset matches site header');
    assert.equal(base.visible,true,'Regulator stays visible and readable');
    const natural=base.docTop, top=base.expectedTop;
    const beforeY=Math.max(0,natural-top-94);
    await page.evaluate(y=>window.scrollTo({top:y,behavior:'instant'}),beforeY);
    await page.waitForTimeout(120);
    const before=await probe();
    assert.ok(before.top>top+60,width+' '+view+' regulator must still scroll normally before reaching header: '+JSON.stringify(before));
    assert.ok(Math.abs(before.docTop-natural)<4,width+' '+view+' regulator has not yet been detached from original position');

    const fixedY=natural-top+165;
    await page.evaluate(y=>window.scrollTo({top:y,behavior:'instant'}),fixedY);
    await page.waitForTimeout(120);
    const pinned=await probe();
    assert.ok(pinned.scroll>before.scroll+110,width+' '+view+' need to pass sticky threshold');
    assert.ok(Math.abs(pinned.top-top)<4,width+' '+view+' regulator must pin immediately below sticky site header: '+JSON.stringify(pinned));
    assert.ok(pinned.top>=pinned.headerBottom+3,width+' '+view+' regulator must not slide under header');
    assert.equal(pinned.atFront,true,width+' '+view+' pinned regulator must remain tappable');

    // Short Jahrbuch pages can reach the document bottom shortly after the
    // regulator pins. Only demand further motion when actual scroll room exists.
    if(pinned.maxScroll-pinned.scroll>60 && pinned.parentBottom>pinned.top+pinned.height+100){
     await page.evaluate(y=>window.scrollTo({top:y,behavior:'instant'}),Math.min(fixedY+105,pinned.maxScroll));
     await page.waitForTimeout(120);
     const pinnedFurther=await probe();
     assert.ok(pinnedFurther.scroll>pinned.scroll+45,width+' '+view+' scroll advances when space exists');
     assert.ok(Math.abs(pinnedFurther.top-pinned.top)<3,width+' '+view+' regulator stays fixed while scrolling deeper');
    }

    await page.evaluate(y=>window.scrollTo({top:y,behavior:'instant'}),beforeY);
    await page.waitForTimeout(150);
    const released=await probe();
    assert.ok(released.top>top+60,width+' '+view+' regulator releases when original location comes back');
    assert.ok(Math.abs(released.docTop-natural)<4,width+' '+view+' regulator returns to its natural position');

    // Slider remains fully present throughout; no cloned duplicate and same selected mode.
    assert.equal(await page.locator('#history-chronicle > .history-carousel-control, #history-chronicle > .history-replay-control').count(),1);
    assert.equal(await page.locator('#history-year-slider,#history-round-slider').count(),1);
    assert.equal(await page.locator('.history-entry-tile[aria-pressed="true"]').getAttribute('data-view'),view);
   }
   assert.deepEqual(errors,[],width+' browser runtime errors');
   console.log('HISTORIE_STICKY_SLIDER_PASS',JSON.stringify({width,views:views.length,sticky:true,halfCenteredYear:true}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(err=>{console.error('HISTORIE_STICKY_SLIDER_FAIL',err);process.exit(1)});
