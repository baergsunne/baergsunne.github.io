const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
 for(const width of [320,375,390,430]){
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',x=>errors.push(x.message));
  for(const path of ['live','editions'])await page.route('**/api/'+path,async route=>{try{const r=await route.fetch({headers:{...route.request().headers(),origin:'https://baergsunne.github.io'}});await route.fulfill({response:r,headers:{...r.headers(),'access-control-allow-origin':'http://127.0.0.1:8765'}})}catch(err){if(!page.isClosed()){try{await route.abort()}catch(_){}}}});
  await page.goto('http://127.0.0.1:8765/#history',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(e=>e.year===2026),null,{timeout:30000});
  await page.evaluate(()=>{state.page='history';state.historyYear=2018;draw()});
  // Compare the same card animation curve in the Jahrbuch and Replay views.
  const yearbookMotion=await page.locator('.history-carousel-slide').first().evaluate(el=>({duration:getComputedStyle(el).transitionDuration,easing:getComputedStyle(el).transitionTimingFunction}));
  await page.locator('#history-view-select').selectOption('replay');
  await page.waitForTimeout(150);
  const replayMotion=await page.locator('.history-replay-slide').first().evaluate(el=>({duration:getComputedStyle(el).transitionDuration,easing:getComputedStyle(el).transitionTimingFunction}));
  assert.deepEqual(replayMotion,yearbookMotion,'Replay must match yearbook opacity and scale timing');
  const data=await page.evaluate(()=>{
   const cards=[...document.querySelectorAll('.history-replay-card')],original=db.editions.find(x=>x.year===2018);
   const visible=document.querySelector('.history-replay-slide[aria-hidden="false"]');
   const card=visible?.querySelector('.history-replay-card'),r=card?.getBoundingClientRect(),bad=[];
   if(card)for(const el of card.querySelectorAll('h4,.history-table th,.history-table td,summary')){const a=el.getBoundingClientRect();if(a.left<r.left-2||a.right>r.right+2)bad.push(el.textContent.slice(0,32))}
   return {count:cards.length,expected:original.rounds.length,bad,active:card?.dataset.round,sourcePlayers:original.players.length,hasSlider:!!document.querySelector('#history-round-slider'),oldControls:!!document.querySelector('.history-replay-controls,.history-round-dropdown,.bp-round-browse'),hasOriginal:!!card?.querySelector('.history-replay-proof'),tableRows:card?.querySelectorAll(':scope > .history-table-shell .history-table tbody tr').length};
  });
  assert.equal(data.count,data.expected,'Every recorded round must have a card');
  assert.equal(data.active,'1');assert.equal(data.hasSlider,true);assert.equal(data.oldControls,false);
  assert.equal(data.hasOriginal,true);assert.equal(data.tableRows,data.sourcePlayers);assert.deepEqual(data.bad,[],'Card text overflow '+width);
  const slider=page.locator('#history-round-slider');
  const prior=await page.locator('.history-replay-track').evaluate(el=>el.style.transform);
  await slider.evaluate(el=>{el.value='4.35';el.dispatchEvent(new Event('input',{bubbles:true}))});
  const moving=await page.locator('.history-replay-track').evaluate(el=>el.style.transform);
  assert.notEqual(moving,prior,'Slider moves cards while dragging');
  assert.equal(await page.locator('.history-replay-track').getAttribute('data-index'),'0','No jump/re-render during slider drag');
  assert.match(await page.locator('#history-replay-count').innerText(),/Runde 5/);
  await slider.evaluate(el=>el.dispatchEvent(new Event('change',{bubbles:true})));
  await page.waitForTimeout(1400);
  const post=await page.evaluate(()=>({tracks:document.querySelectorAll('.history-replay-track').length,statePage:state.page,stateYear:state.historyYear,view:document.querySelector('#history-view-select')?.value,replayCards:document.querySelectorAll('.history-replay-card').length,appText:document.getElementById('app')?.textContent.slice(0,180)}));
  assert.equal(post.tracks,1,'Replay vanished after slider: '+JSON.stringify(post));
  assert.equal(await page.locator('.history-replay-track').getAttribute('data-index'),'4');
  assert.equal(await page.locator('.history-replay-slide[aria-hidden="false"] .history-replay-card').getAttribute('data-round'),'5');
  const viewport=page.locator('.history-replay-viewport');await viewport.scrollIntoViewIfNeeded();
  async function gesture(dx){
    const rect=await viewport.boundingBox(),x=rect.x+rect.width*.5,y=rect.y+110;
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y,{steps:12});
    const inMotion=await page.locator('.history-replay-track').evaluate(el=>el.style.transform);
    await page.mouse.up();
    const startPosition=await page.locator('.history-replay-track').evaluate(el=>getComputedStyle(el).transform);
    await page.waitForTimeout(220);
    const midway=await page.locator('.history-replay-track').evaluate(el=>getComputedStyle(el).transform);
    assert.notEqual(startPosition,midway,'Track must visibly glide after finger release');
    assert.match(await page.locator('.history-replay-track').evaluate(el=>el.style.transition),/850ms/);
    await page.waitForTimeout(1180);
    return inMotion;
  }
  await gesture(70);assert.equal(await page.locator('.history-replay-track').getAttribute('data-index'),'4','Below 50 percent returns');
  await gesture(190);assert.equal(await page.locator('.history-replay-track').getAttribute('data-index'),'3','50 percent passes exactly one round');
  assert.equal(await page.locator('.history-replay-slide[aria-hidden="false"] .history-replay-card').getAttribute('data-round'),'4');
  assert.deepEqual(errors,[]);
  console.log('REPLAY_CAROUSEL_PASS',JSON.stringify({width,rounds:data.count,liveSlider:true,snap:true}));
  await page.close();
 }
 }finally{await browser.close()}
})().catch(e=>{console.error('REPLAY_CAROUSEL_FAIL',e);process.exit(1)});
