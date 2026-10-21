const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fixture=require('./fixture-2026.json');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  for(const width of [320,375,390,430,768]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:width<650,hasTouch:width<650});
   await page.emulateMedia({reducedMotion:'reduce'});
   const errors=[]; page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/api/editions',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
   await page.route('**/api/live',r=>r.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify({status:'final',year:2026,players:fixture.editions[0].players,rounds:[],standings:fixture.editions[0].official_standings.map(x=>({player:x.player_id,rank:x.place,points:x.points}))})}));
   await page.goto('http://127.0.0.1:8765/#history',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(e=>e.year===2026),null,{timeout:25000});
   const audit=()=>page.evaluate(()=>{
     const nav=document.querySelector('#app nav.bottomnav');
     if(!nav)return {error:'Missing mobile bottom navigation'};
     const bounding=el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,width:r.width,height:r.height,centerY:(r.top+r.bottom)/2}};
     const buttons=[...nav.querySelectorAll('button.bottomitem')];
     return {height:nav.getBoundingClientRect().height,
       navTop:getComputedStyle(nav,'::before').content,
       activeCount:buttons.filter(x=>x.classList.contains('active')).length,
       buttons:buttons.map(btn=>({
         id:btn.dataset.value,role:btn.tagName,active:btn.classList.contains('active'),
         rect:bounding(btn),
         icon:bounding(btn.querySelector('.bp-icon')),
         label:bounding(btn.querySelector('small')),
         gold:getComputedStyle(btn.querySelector('.bp-icon')).filter,
         after:getComputedStyle(btn,'::after').content,
         underlineHeight:getComputedStyle(btn,'::after').height,
         borderBottom:getComputedStyle(btn).borderBottomWidth
       })),
       overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
   });
   for(const target of ['history','stats','players','live','home']){
     if(target!=='history'){
       await page.locator('nav.bottomnav button.bottomitem[data-value="'+target+'"]').click();
       await page.waitForFunction(id=>state.page===id,target);
     }
     const r=await audit();
     assert(!r.error,r.error);
     assert.equal(r.buttons.length,5,'Retain all five navigation buttons');
     assert.equal(r.activeCount,1,'Precisely one active navigation button');
     assert(r.height>=44&&r.height<=45.5,width+'px: compact row must be ~20% shorter than previous 55px, got '+r.height);
     assert(r.buttons.every(x=>x.rect.height>=44&&x.rect.height<=44.5),width+'px: all touch targets stay at least 44px high');
     assert(r.buttons.every(x=>x.icon.width===21&&x.icon.height===21),'Every icon is 21px');
     assert(r.buttons.every(x=>x.label.height>=11&&x.label.height<=13),'Labels keep compact shared baseline');
     const iy=r.buttons.map(x=>x.icon.centerY),ly=r.buttons.map(x=>x.label.centerY);
     assert(Math.max(...iy)-Math.min(...iy)<.51,width+'px '+target+': all five icon centres on exactly one horizontal line: '+iy);
     assert(Math.max(...ly)-Math.min(...ly)<.51,width+'px '+target+': all five labels aligned: '+ly);
     assert(r.buttons.every(x=>x.gold===r.buttons[0].gold),'All five icons use identical Bärgsunne gold filter');
     assert(r.buttons.every(x=>x.borderBottom==='0px'),'Active underline must never shift icon/label grid');
     const active=r.buttons.find(x=>x.active);
     assert.equal(active.id,target);
     assert.equal(active.underlineHeight,'2px','Active underline remains visible without taking layout space');
     assert.equal(r.navTop,'""','Top separator is overlaid rather than taking vertical space');
     assert(r.overflow<=2,width+'px: no horizontal scroll caused by the new nav');
     console.log('MOBILE_NAV_ALIGNED',JSON.stringify({width,target,navHeight:r.height,iconCenters:iy,active:active.id}));
   }
   assert.deepEqual(errors,[],width+'px: no script errors');
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('MOBILE_NAV_ALIGNMENT_FAIL',e);process.exit(1)});
