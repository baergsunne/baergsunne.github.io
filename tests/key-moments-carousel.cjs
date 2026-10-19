const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch();
 try{
 for(const width of [320,375,390,430]){
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const path of ['live','editions'])await page.route('**/api/'+path,async route=>{try{const r=await route.fetch({headers:{...route.request().headers(),origin:'https://baergsunne.github.io'}});await route.fulfill({response:r,headers:{...r.headers(),'access-control-allow-origin':'http://127.0.0.1:8765'}})}catch(e){if(!page.isClosed())try{await route.abort()}catch(_){}}});
  await page.goto('http://127.0.0.1:8765/#history',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(x=>x.year===2026),null,{timeout:30000});

  // Validate that replay and moment sliders match the exact Jahrbuch slider layout.
  let baselineSliderStyle=null;
  for(const view of ['yearbook','replay','moments']){
   await page.locator('#history-view-select').selectOption(view);
   const visual=await page.evaluate(view=>{
    const root=document.getElementById('history-chronicle');
    const control=root.querySelector(view==='yearbook'?'.history-carousel-control':'.history-replay-control');
    const slider=control?.querySelector('input[type=range]');
    if(!control||!slider)return {missing:true};
    const box=control.getBoundingClientRect(),sb=slider.getBoundingClientRect(),s=getComputedStyle(control),t=getComputedStyle(slider);
    return {
     missing:false,
     design:{display:s.display,gap:s.gap,padding:s.padding,color:s.color,fontSize:s.fontSize,fontWeight:s.fontWeight,borderRadius:s.borderRadius,backgroundImage:s.backgroundImage,
       sliderMargin:t.margin,sliderAccent:t.accentColor,sliderMinHeight:t.minHeight},
     labels:[...control.querySelectorAll(':scope > span')].map(x=>x.textContent.trim()),
     rows:control.querySelectorAll(':scope > input[type=range]').length,
     sameLine:Math.abs(sb.y+sb.height/2-(box.y+box.height/2))<3,
     visibleSlider:sb.width>35&&sb.height>=35,
     offscreenReadout:view==='yearbook'||!!control.querySelector('#history-replay-count.history-slider-sr-only'),
     missingNumbers:!slider.getAttribute('aria-valuetext')&&view!=='yearbook'
    };
   },view);
   assert.equal(visual.missing,false,view+' missing visual slider');
   assert.equal(visual.rows,1,view+' must have one range in one row');
   assert.equal(visual.labels.length,2,view+' needs two captions as in Jahrbuch');
   assert.equal(visual.sameLine,true,view+' range must align vertically with captions');
   assert.equal(visual.visibleSlider,true,view+' range too small');
   assert.equal(visual.offscreenReadout,true,view+' accessible round count missing');
   assert.equal(visual.missingNumbers,false,view+' aria-valuetext missing');
   if(view==='yearbook')baselineSliderStyle=visual.design;
   else assert.deepEqual(visual.design,baselineSliderStyle,view+' slider must match Jahrbuch styling');
  }
  // Top navigation order and actual measured layout across all three modes.
  for(const [view,control,slider,feature] of [
   ['yearbook','.history-carousel-control','#history-year-slider','.history-feature--yearbook'],
   ['replay','.history-replay-control','#history-round-slider','.history-feature--replay'],
   ['moments','.history-replay-control','#history-round-slider','.history-feature--moments']
  ]){
   await page.locator('#history-view-select').selectOption(view);
   const position=await page.evaluate(({control,slider,feature})=>{
    const root=document.getElementById('history-chronicle');
    const filters=root.querySelector('.history-dropdown-controls');
    const c=root.querySelector(control),s=root.querySelector(slider),stage=root.querySelector(feature);
    if(!filters||!c||!s||!stage)return {missing:true};
    const f=filters.getBoundingClientRect(),r=c.getBoundingClientRect(),g=stage.getBoundingClientRect();
    return {
     order:filters.nextElementSibling===c&&c.nextElementSibling===stage,
     parent:c.parentElement===root,
     duplicate:root.querySelectorAll(slider).length,
     insideCarousel:stage.contains(s),
     visible:r.width>100&&r.height>30&&getComputedStyle(c).display!=='none',
     dropdownGap:r.top-f.bottom,
     carouselGap:g.top-r.bottom,
     overflow:r.left<root.getBoundingClientRect().left-2||r.right>root.getBoundingClientRect().right+2
    };
   },{control,slider,feature});
   assert.equal(position.missing,undefined,view+' missing slider elements');
   assert.equal(position.order,true,view+' slider must be directly after dropdowns and before carousel');
   assert.equal(position.parent,true,view+' slider must be outside carousel');
   assert.equal(position.duplicate,1,view+' must have exactly one slider');
   assert.equal(position.insideCarousel,false,view+' must not have slider at bottom');
   assert.equal(position.visible,true,view+' top slider must be visible');
   assert.ok(position.dropdownGap>=-2&&position.dropdownGap<30,view+' top slider gap '+position.dropdownGap);
   assert.ok(position.carouselGap>=-2&&position.carouselGap<30,view+' gap before carousel '+position.carouselGap);
   assert.equal(position.overflow,false,view+' slider must not overflow');
  }
  const audit=await page.evaluate(()=>{
   const problems=[],data=db.editions;
   for(const ed of data){
    state.page='history';state.historyYear=ed.year;draw();
    document.querySelector('#history-view-select').value='moments';
    document.querySelector('#history-view-select').dispatchEvent(new Event('change',{bubbles:true}));
    const cards=[...document.querySelectorAll('.history-moment-card')],rounds=[...ed.rounds].sort((a,b)=>a.number-b.number);
    if(cards.length!==rounds.length)problems.push(ed.year+': wrong number of round cards');
    if(!document.querySelector('#history-round-slider'))problems.push(ed.year+': missing slider');
    if(document.querySelectorAll('.history-scene-list button').length)problems.push(ed.year+': old static scenes still shown');
    if(document.querySelectorAll('#history-chronicle > .history-note').length)problems.push(ed.year+': technical note');
    for(let i=0;i<rounds.length;i++){
     const round=rounds[i],card=cards[i];if(!card)continue;
     const expected=round.results.filter(x=>x.place===1).map(x=>x.player_id).join(', ')||'Kein Rundensieg dokumentiert';
     const actual=card.querySelector('.history-moment-winner strong')?.textContent;
     if(actual!==expected)problems.push(ed.year+' R'+round.number+': incorrect round winner '+actual+' expected '+expected);
     const events=[...card.querySelectorAll('.history-moment-event')];
      if(!events.length)problems.push(ed.year+' R'+round.number+': no moment cards');
      for(const event of events){
       const title=event.querySelector('strong.history-moment-label');
       const headline=event.querySelector('p.history-moment-headline');
       if(!title?.textContent.trim()||!headline?.textContent.trim())problems.push(ed.year+' R'+round.number+': missing structured moment typography');
       if(getComputedStyle(event).textAlign!=='center')problems.push(ed.year+' R'+round.number+': event not centered');
       for(const child of event.querySelectorAll('.history-moment-label,.history-moment-headline,.history-moment-chip,.history-moment-description')){
        const b=child.getBoundingClientRect(),outer=event.getBoundingClientRect();
        if(b.left<outer.left-2||b.right>outer.right+2)problems.push(ed.year+' R'+round.number+': chip/label overflow');
       }
      }
      const titles=[...card.querySelectorAll('.history-moment-event strong')].map(x=>x.textContent);
     if(!titles.some(x=>x.includes('Führung')||x.includes('Spitze')))problems.push(ed.year+' R'+round.number+': missing leader');
     if(!titles.some(x=>x.includes('Rote Laterne')))problems.push(ed.year+' R'+round.number+': missing red lantern');
     if(i>0&&!titles.some(x=>x.includes('Reaktion')||x.includes('Steigerung')))problems.push(ed.year+' R'+round.number+': missing positive reaction');
     if(i>0&&!titles.some(x=>x.includes('Reaktion')||x.includes('Rückgang')))problems.push(ed.year+' R'+round.number+': missing weakest reaction');
     if(i===0&&titles.some(x=>x.includes('Vorrunde')))problems.push(ed.year+' R1: fake previous-round comparison');
     const panel=card.getBoundingClientRect();
     for(const node of card.querySelectorAll('h4,.history-moment-winner strong,.history-moment-event strong,.history-moment-event p,.history-moment-chip')){
      const box=node.getBoundingClientRect();
      if(box.right>panel.right+2||box.left<panel.left-2)problems.push(ed.year+' R'+round.number+': text overflow '+node.textContent.slice(0,15));
     }
    }
   }
   return {problems,years:data.length};
  });
  assert.deepEqual(audit.problems,[],width+'px moments dataset and geometry audit');
  await page.evaluate(()=>{state.page='history';state.historyYear=2018;draw()});
  await page.locator('#history-view-select').selectOption('moments');await page.waitForTimeout(130);
  const track=page.locator('.history-replay-track'),slider=page.locator('#history-round-slider');
  assert.equal(await page.locator('.history-moment-card').count(),7);
  assert.equal((await page.locator('#history-view-select').inputValue()),'moments');
  const before=await track.evaluate(el=>el.style.transform);
  await slider.evaluate(el=>{el.value='3.4';el.dispatchEvent(new Event('input',{bubbles:true}))});
  const moving=await track.evaluate(el=>el.style.transform);
  assert.notEqual(moving,before,'The cards follow slider while dragging');
  assert.equal(await track.getAttribute('data-index'),'0','Sliding must not commit before release');
  await slider.evaluate(el=>el.dispatchEvent(new Event('change',{bubbles:true})));
  await page.waitForTimeout(1060);
  assert.equal(await track.getAttribute('data-index'),'3');
  assert.equal(await page.locator('.history-replay-slide[aria-hidden="false"] .history-moment-card').getAttribute('data-round'),'4');
  const header=page.locator('.history-replay-slide[aria-hidden="false"] .history-replay-card-head');
  await header.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));
  await page.waitForTimeout(70);
  const pos=await header.boundingBox(),x=pos.x+pos.width*.5,y=pos.y+pos.height*.5;
  const session=await page.context().newCDPSession(page);
  const old=await track.evaluate(el=>el.style.transform);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:5,x,y}]});
  for(const [dx,dy] of [[-40,14],[-95,34],[-196,61]])await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:5,x:x+dx,y:y+dy}]});
  const during=await track.evaluate(el=>el.style.transform);assert.notEqual(during,old,'Diagonal moments swipe must follow touch');
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForTimeout(1030);
  assert.equal(await track.getAttribute('data-index'),'4','Gesture moves exactly one round');
  assert.deepEqual(errors,[]);console.log('KEY_MOMENTS_CAROUSEL_PASS',JSON.stringify({width,years:audit.years,rounds:7,slider:true,diagonalSwipe:true}));
  await page.unrouteAll({behavior:'ignoreErrors'});await page.close();
 }
 }finally{await browser.close()}
})().catch(err=>{console.error('KEY_MOMENTS_CAROUSEL_FAIL',err);process.exitCode=1});
