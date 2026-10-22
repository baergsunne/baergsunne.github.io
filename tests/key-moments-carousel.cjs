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

  // Same green palette and navigation-card vocabulary as Startseite.
  const landing=await page.evaluate(()=>{
   const root=document.getElementById('history-chronicle'),p=document.querySelector('.page--history');
   const cards=[...root.querySelectorAll('.history-entry-grid .history-entry-tile')];
   const allLabels=cards.map(x=>x.querySelector('.tool-tile-copy strong')?.textContent);
   const rootColor=getComputedStyle(root).borderColor,frame=getComputedStyle(p);
   const tile=cards[0]&&getComputedStyle(cards[0]);
   return {count:cards.length,labels:allLabels,order:cards.map(x=>x.dataset.view),
    toolClasses:cards.every(x=>x.classList.contains('tool-tile')),
    sectionBeforeFilters:root.querySelector('.history-entry').compareDocumentPosition(root.querySelector('.history-dropdown-controls'))&Node.DOCUMENT_POSITION_FOLLOWING,
    pageBg:frame.backgroundColor,pageBorder:frame.borderTopWidth,rootColor: getComputedStyle(root).borderTopWidth,
    tileBorder:tile?.borderColor,links:cards.every(x=>x.getAttribute('aria-pressed')!==null),
    horizontalOverflow:document.documentElement.scrollWidth>innerWidth+2
   };
  });
  assert.equal(landing.count,6,'Landing needs six distinct Historie entry tiles');
  assert.deepEqual(landing.order,['yearbook','replay','moments','records','field','compare'],'Correct tile order');
  assert.deepEqual(landing.labels,['Jahrbuch','Runden','Schlüsselmomente','Rekordbuch','Teilnehmerfeld','Jahresvergleich']);
  assert.equal(landing.toolClasses,true,'Reuse genuine statistics tool tile class');
  assert.ok(landing.sectionBeforeFilters,'Entry cards precede unchanged selectors');
  assert.equal(landing.pageBg,'rgb(28, 55, 48)','History uses dark homepage background');
  assert.equal(landing.pageBorder,'0px','History must have no outer page frame');
  assert.equal(landing.rootColor,'0px','Chronicle must be frameless and airy');
  assert.equal(landing.tileBorder,'rgb(232, 195, 126)','Selected entry uses unified Bärgsunne gold border');
  assert.equal(landing.links,true);
  assert.equal(landing.horizontalOverflow,false,'No mobile overflow');
  for(const view of ['moments','replay','yearbook']){
   await page.locator('.history-entry-tile[data-view="'+view+'"]').click();
   assert.equal(await page.locator('.history-entry-tile[aria-pressed="true"]').getAttribute('data-view'),view,'Entry tile opens matching explorer');
   assert.equal(await page.locator('.history-entry-tile[aria-pressed="true"]').count(),1,'One selected tile');
   await page.waitForTimeout(1050);
   const scrollProbe=await page.evaluate(()=>{
    const node=document.getElementById('history-workspace'),header=document.querySelector('.heritage-header');
    const offset=(header?.getBoundingClientRect().height||0)+12;
    const target=Math.max(0,window.scrollY+node.getBoundingClientRect().top-offset);
    const max=Math.max(0,document.documentElement.scrollHeight-innerHeight);
    return {actual:window.scrollY,expected:Math.min(target,max),max,target,anchorRect:node.getBoundingClientRect().top,headerHeight:offset,docHeight:document.documentElement.scrollHeight,innerHeight,bodyHeight:document.body.scrollHeight,scrollingHeight:document.scrollingElement.scrollHeight};
   });
   console.log('HISTORY_ENTRY_SCROLL_PROBE',JSON.stringify({width,view,...scrollProbe}));
   assert.ok(scrollProbe.actual>40&&Math.abs(scrollProbe.actual-scrollProbe.expected)<30,view+' must scroll to explorer after entry');
   assert.equal(await page.locator('.history-entry').count(),1,'Entry remains available after opening explorer');
   assert.equal(await page.locator('.history-dropdown-controls').count(),1,'Turnierjahr dropdown remains accessible');
   assert.equal(await page.locator('.history-dropdown-controls select').count(),1,'Only one dropdown remains');
   assert.equal(await page.locator('#history-view-select').count(),0,'Ansicht dropdown must be removed');
  }
  await page.locator('.history-entry-tile[data-view="replay"]').click();
  assert.equal(await page.locator('.history-feature--replay').count(),1,'Runden tile still switches after tile navigation');
  await page.locator('.history-entry-tile[data-view="moments"]').click();
  assert.equal(await page.locator('.history-feature--moments').count(),1,'Existing Schlüsselmomente remain available');

  // Three legacy inputs remain for desktop, while mobile gets a shared vertical control.
  let baselineRail=null;
  for(const view of ['yearbook','replay','moments']){
   await page.locator('.history-entry-tile[data-view="'+view+'"]').click();
   await page.evaluate(()=>{const d=document.querySelector('.history-dropdown-controls'),g=document.querySelector('.history-sticky-group');scrollTo({top:Math.max(0,scrollY+d.getBoundingClientRect().bottom+18-parseFloat(getComputedStyle(g).top)+72),behavior:'instant'});});
   await page.locator('.history-mobile-rail.is-active').waitFor({timeout:7000});
   const visual=await page.evaluate(()=>{
    const root=document.getElementById('history-chronicle'),group=root.querySelector('.history-sticky-group');
    const ctrl=group?.querySelector('.history-carousel-control'),rail=root.querySelector(':scope > .history-mobile-rail');
    const input=ctrl?.querySelector('input[type=range]');
    if(!ctrl||!rail||!input)return {missing:true};
    const bounds=rail.getBoundingClientRect();
    return {missing:false,display:getComputedStyle(ctrl).display,
      arrows:[...rail.querySelectorAll('button span')].map(x=>x.textContent),
      railWidth:bounds.width,orientation:rail.querySelector('.history-mobile-track').getAttribute('aria-orientation'),
      active:rail.classList.contains('is-active'),
      heading:group.querySelector('#history-sticky-heading')?.textContent,
      count:group.querySelectorAll('input[type=range]').length,
      after:group.nextElementSibling===rail,controlParent:ctrl.parentElement===group};
   });
   assert.equal(visual.missing,false);
   assert.equal(visual.display,'none','Mobile must hide top horizontal slider');
   assert.deepEqual(visual.arrows,['›','‹']);
   assert.equal(visual.railWidth,44);
   assert.equal(visual.orientation,'vertical');
   assert.equal(visual.active,true);
   assert.equal(visual.count,1);
   assert.equal(visual.after,true);
   assert.equal(visual.controlParent,true);
   assert(visual.heading.length>6);
   if(view==='yearbook')baselineRail=[visual.railWidth,visual.orientation,visual.arrows.join('')];
   else assert.deepEqual([visual.railWidth,visual.orientation,visual.arrows.join('')],baselineRail);
  }
  const audit=await page.evaluate(()=>{
   const problems=[],data=db.editions;
   for(const ed of data){
    state.page='history';state.historyYear=ed.year;draw();
    document.querySelector('.history-entry-tile[data-view="moments"]').click();
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
  await page.locator('.history-entry-tile[data-view="moments"]').click();await page.waitForTimeout(130);
  const track=page.locator('.history-replay-track'),slider=page.locator('#history-round-slider');
  assert.equal(await page.locator('.history-moment-card').count(),7);
  assert.equal((await page.locator('.history-entry-tile[aria-pressed="true"]').getAttribute('data-view')),'moments');
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
