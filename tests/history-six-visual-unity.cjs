const {chromium}=require('playwright');
const assert=require('node:assert/strict');

(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,375,390,430,768]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:width<620,hasTouch:true});
   const errors=[];page.on('pageerror',err=>errors.push(err.message));
   for(const path of ['live','editions'])await page.route('**/api/'+path,async route=>{
    try{
     const response=await route.fetch({headers:{...route.request().headers(),origin:'https://baergsunne.github.io'}});
     await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':'http://127.0.0.1:8765'}});
    }catch(err){if(!page.isClosed())try{await route.abort()}catch(_){}}
   });
   await page.goto('http://127.0.0.1:8765/#history',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(x=>x.year===2026),null,{timeout:30000});
   const styleAudit=()=>page.evaluate(()=>{
    const root=document.querySelector('.history-chronicle'),sticky=root?.querySelector('.history-sticky-group');
    const stage=root?.querySelector('.history-feature'),viewport=root?.querySelector('.history-carousel-viewport,.history-replay-viewport');
    const track=viewport?.querySelector('.history-carousel-track,.history-replay-track');
    const slides=[...track?.children||[]],index=Number(track?.dataset.index);
    const center=slides[index],card=center?.querySelector('.history-yearbook-card,.history-replay-card');
    if(!stage||!viewport||!track||!card)return {missing:true};
    const b=getComputedStyle(card),outer=getComputedStyle(stage),grid=getComputedStyle(track),sl=getComputedStyle(center);
    const selectors=['.history-yearbook-extras .history-insight-metric','.history-insight-card .history-insight-metric','.history-insight-compare',
     '.history-moment-event','.history-replay-proof'];
    const inner=selectors.map(s=>card.querySelector(s)).find(Boolean);
    const innerStyle=inner?getComputedStyle(inner):null;
    const heading=card.querySelector('.history-insight-section>h4,.history-yearbook-extras h4,.history-replay-card-head h4,.history-moment-winner strong');
    const type=getComputedStyle(heading||card);
    const preview=dir=>{
     const el=slides[index+dir],r=el?.getBoundingClientRect(),v=viewport.getBoundingClientRect();
     return r?Math.max(0,Math.min(r.right,v.right)-Math.max(r.left,v.left)):0;
    };
    const r=center.getBoundingClientRect(),v=viewport.getBoundingClientRect();
    return {missing:false,view:document.querySelector('.history-entry-tile[aria-pressed="true"]')?.dataset.view,
     card:{background:b.backgroundImage,border:b.borderTopColor,borderWidth:b.borderTopWidth,
      radius:b.borderTopLeftRadius,padding:b.padding,shadow:b.boxShadow,fontFamily:b.fontFamily,
      textAlign:b.textAlign},
     stage:{background:outer.backgroundColor,border:outer.borderTopWidth,padding:outer.padding,shadow:outer.boxShadow},
     inner:innerStyle?{radius:innerStyle.borderTopLeftRadius,background:innerStyle.backgroundImage,
      borderWidth:innerStyle.borderTopWidth,fontFamily:innerStyle.fontFamily}:null,
     type:{family:type.fontFamily,color:type.color,lineHeight:type.lineHeight},
     slide:{width:center.offsetWidth,gap:grid.columnGap,duration:sl.transitionDuration,easing:sl.transitionTimingFunction},
     preview:{left:preview(-1),right:preview(1),centering:Math.abs((r.left+r.right-v.left-v.right)/2)},
     slider:!!sticky?.querySelector('input[type=range]'),title:sticky?.querySelector('h3')?.textContent,
     controls:[...sticky?.querySelectorAll('.history-step-button')||[]].map(x=>x.textContent.trim()),
     overflow:document.documentElement.scrollWidth>innerWidth+2};
   });
   const sample={};
   for(const view of ['yearbook','replay','moments','records','field','compare']){
    await page.locator('.history-entry-tile[data-view="'+view+'"]').click();
    if(view==='yearbook'||view==='records'||view==='field'||view==='compare')
     await page.locator('#history-year-select').selectOption('2019');
    else{
     await page.locator('#history-year-select').selectOption('2026');
     await page.locator('#history-round-slider').evaluate(el=>{
      el.value='2';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));
     });
     await page.waitForTimeout(950);
    }
    // The user's 850ms animated snap is asynchronous. Evaluate geometry only
    // once the destination actually reaches its final centred position.
    await page.waitForFunction(()=>{
     const viewport=document.querySelector('.history-carousel-viewport,.history-replay-viewport');
     const track=viewport?.querySelector('.history-carousel-track,.history-replay-track');
     const index=Number(track?.dataset.index);
     const slide=track?.children[index];
     const r=slide?.getBoundingClientRect(),v=viewport?.getBoundingClientRect();
     const prev=track?.children[index-1]?.getBoundingClientRect();
     const next=track?.children[index+1]?.getBoundingClientRect();
     const peek=rect=>rect&&v?Math.max(0,Math.min(rect.right,v.right)-Math.max(rect.left,v.left)):0;
     // Wait for both real adjacent cards to be painted, not merely for a
     // transient centred track position during the 850ms animation.
     return r&&v&&Math.abs((r.left+r.right-v.left-v.right)/2)<4&&peek(prev)>1&&peek(next)>1;
    },null,{timeout:4000});
    sample[view]=await styleAudit();
    const s=sample[view];
    assert.equal(s.missing,false,width+' '+view+' card renders');
    assert.equal(s.slider,true,width+' '+view+' slider retained');
    assert.equal(s.overflow,false,width+' '+view+' no horizontal page overflow');
    assert.deepEqual(s.controls,['‹ Zurück','Weiter ›'],width+' '+view+' navigation unchanged');
    assert.ok(s.preview.left>1&&s.preview.right>1,width+' '+view+' shows adjacent cards on both sides: '+JSON.stringify(s.preview));
    assert.ok(s.preview.centering<4,width+' '+view+' active card centered: '+s.preview.centering);
    assert.ok(s.card.background.includes('gradient'),width+' '+view+' premium green/gold card');
    assert.ok(s.slide.width>170,width+' '+view+' carousel card not collapsed');
   }
   const base=sample.yearbook;
   const sharedAppearance=card=>{
    // Jahrbuch alone now has slimmer *horizontal* padding on iPhone so its
    // two-column text can occupy the usable width. All six views must still
    // share every other premium-card material, shadow and typography rule.
    const {padding,...appearance}=card;
    return appearance;
   };
   for(const view of ['replay','moments','records','field','compare']){
    const other=sample[view];
    assert.deepEqual(sharedAppearance(other.card),sharedAppearance(base.card),
      width+' '+view+' keeps the exact shared material/typography');
    if(width>600) assert.equal(other.card.padding,base.card.padding,
      width+' '+view+' desktop card padding stays unified');
    else {
     // Records/Field/Compare already use tighter padding than Replay.
     // Only require that Jahrbuch never has *more* horizontal inset.
     const inset=padding=>parseFloat(padding.split(' ')[1]||padding.split(' ')[0]);
     assert(inset(base.card.padding)<=inset(other.card.padding),
       width+' '+view+' Jahrbuch keeps at least as much usable width');
    }
    assert.deepEqual(other.stage,base.stage,width+' '+view+' outer carousel stage must match Jahrbuch');
    assert.deepEqual(other.slide,base.slide,width+' '+view+' same carousel dimensions/easing as Jahrbuch');
   }
   assert.equal(sample.replay.inner.radius,sample.records.inner.radius,width+' replay proof/stats tile shape same');
   assert.equal(sample.moments.inner.radius,sample.records.inner.radius,width+' key moment/stat metric shape same');
   assert.equal(sample.moments.inner.fontFamily,sample.records.inner.fontFamily,width+' key moment/stat metric font');
   assert.ok(sample.moments.inner.background.includes('gradient'),width+' semantic highlight keeps premium card treatment');
   assert.equal(sample.yearbook.inner.background,sample.records.inner.background,width+' Jahrbuch records/recent recordbook metric style');
   assert.equal(sample.field.inner.background,sample.records.inner.background,width+' Teilnehmerfeld/recordbook inset');
   assert.equal(sample.compare.inner.background,sample.records.inner.background,width+' Jahresvergleich/recordbook inset');
   assert.deepEqual(errors,[],width+' no runtime errors');
   console.log('HISTORY_SIX_VISUAL_UNITY_PASS',JSON.stringify({width,views:6,sharedCard:true,sameMotion:true,visibleNeighbors:true}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(error=>{console.error('HISTORY_SIX_VISUAL_UNITY_FAIL',error);process.exit(1)});
