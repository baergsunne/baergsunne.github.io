/* Cross-page visual regression for Heritage sunlight: all content surfaces,
   ranks, choices and profiles share a soft upper-right golden light and a
   bottom-left shadow without changing layout, data or chart colors. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fixture=require('./fixture-2026.json');
const sample=(node)=>node?(()=>{
 const s=getComputedStyle(node),r=node.getBoundingClientRect();
 return {bg:s.backgroundImage,color:s.backgroundColor,shadow:s.boxShadow,w:r.width,h:r.height,
  x:r.x,y:r.y,position:s.position,display:s.display};
})():null;
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,390,430,768,1024]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:width<=430,hasTouch:width<=430});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/api/editions',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
   await page.route('**/api/live',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'planned',players:[],standings:[],rounds:[]})}));
   await page.goto('http://127.0.0.1:8765/#home',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(x=>x.year===2026),null,{timeout:20000});
   const onPage=async(name,callback)=>{
    await page.evaluate(next=>{state.page=next;if(next==='stats')state.tab='overview';if(next==='history')state.historyYear=2026;draw();},name);
    await page.waitForTimeout(170);
    return page.evaluate(callback);
   };
   const home=await page.evaluate(()=>{
    const card=el=>el?({bg:getComputedStyle(el).backgroundImage,shadow:getComputedStyle(el).boxShadow,
      w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height}):null;
    return {background:getComputedStyle(document.querySelector('.page')).backgroundColor,
     body:getComputedStyle(document.body).backgroundColor,
     header:getComputedStyle(document.querySelector('header.heritage-header')).backgroundColor,
     desktopNav:getComputedStyle(document.querySelector('header.heritage-header .desktopnav')).backgroundColor,
     bottomNav:getComputedStyle(document.querySelector('nav.bottomnav')).backgroundColor,
     safariTheme:document.querySelector('meta[name="theme-color"]')?.content,
     cards:[card(document.querySelector('.discovery-champion')),card(document.querySelector('.discovery-counts>div'))],
     link:card(document.querySelector('.page--home .discovery-feature'))};
   });
   await onPage('stats',()=>true);
   await page.locator('.page--stats .bp-stat-columns').first().waitFor({timeout:8000});
   const stat=await page.evaluate(()=>{
    const card=el=>el?({bg:getComputedStyle(el).backgroundImage,color:getComputedStyle(el).backgroundColor,
     shadow:getComputedStyle(el).boxShadow,w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height,
     position:getComputedStyle(el).position}):null;
    return {
     kpi:card(document.querySelector('.page--stats .stat-content>.metrics>.kpi')),
     card:card(document.querySelector('.page--stats .stat-content .card')),
     picker:card(document.querySelector('.page--stats .bp-stat-columns')),
     header:card(document.querySelector('.page--stats .bp-stat-personalized-table thead th')),
     row:card(document.querySelector('.page--stats .bp-stat-personalized-table tbody tr')),
     name:card(document.querySelector('.page--stats .bp-stat-personalized-table tbody tr>:first-child')),
     select:card(document.querySelector('.page--stats .bp-stat-columns-summary')),
     active:card(document.querySelector('.page--stats .tool-tile.is-active')),
     golden:getComputedStyle(document.querySelector('.page--stats .stat-content>.metrics>.kpi>strong')).color,
     sort:!!document.querySelector('.page--stats .bp-stat-personalized-table thead button')
    };
   });
   await onPage('players',()=>true);
   const player=await page.evaluate(()=>{
    const el=document.querySelector('.playercard--summary');
    return {card:el?{bg:getComputedStyle(el).backgroundImage,shadow:getComputedStyle(el).boxShadow,
      w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height}:null,
      name:el?.querySelector('strong')?.textContent};
   });
   await onPage('history',()=>true);
   const history=await page.evaluate(()=>{
    const card=el=>el?({bg:getComputedStyle(el).backgroundImage,color:getComputedStyle(el).backgroundColor,
      shadow:getComputedStyle(el).boxShadow,w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height}):null;
    return {card:card(document.querySelector('.history-yearbook-card')),
     stage:card(document.querySelector('.history-chronicle')),
     selector:card(document.querySelector('#history-year-select')),
     inner:card(document.querySelector('.history-yearbook-participants'))};
   });
   await onPage('live',()=>true);
   const live=await page.evaluate(()=>{
    const el=document.querySelector('.page--live .cl-block,.page--live .card,.page--live .discovery-live');
    return {card:el?{bg:getComputedStyle(el).backgroundImage,shadow:getComputedStyle(el).boxShadow}:null};
   });
   const result={home,stat,player,history,live,
    overflow:await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)};
   const toTest=[
    ['home champion',result.home.cards[0]],['home count',result.home.cards[1]],
    ['home navigation',result.home.link],['stats KPI',result.stat.kpi],
    ['stats table card',result.stat.card],['stats picker',result.stat.picker],
    ['stats row',result.stat.row],['stats sticky name',result.stat.name],
    ['stats control',result.stat.select],['players profile',result.player.card],
    ['history card',result.history.card],['history year choice',result.history.selector]
   ];
   assert.equal(result.home.background,'rgb(11, 36, 27)','Deep Heritage Forest site background');
   assert.equal(result.home.body,result.home.background,'Page/body background matches');
   assert.equal(result.home.header,result.home.background,'Header matches dark Forest shell at '+width);
   assert.equal(result.home.desktopNav,result.home.background,'Desktop navigation uses identical dark Forest shell');
   assert.equal(result.home.bottomNav,result.home.background,'Bottom navigation uses identical dark Forest shell');
   assert.equal(result.home.safariTheme,'#0b241b','Safari tint agrees with head stage');
   for(const [label,item] of toTest){
    assert(item,label+' missing at '+width);
    assert(item.bg.includes('225deg'),width+' '+label+' must use same upper-right gold/forest sunlight: '+JSON.stringify(item));
    assert(item.w>0&&item.h>0,width+' '+label+' must retain dimensions');
    if(label!=='stats row'){
     assert(item.shadow!=='none',width+' '+label+' shadow must exist');
     assert(/-\d+px\s+\d+px/.test(item.shadow),width+' '+label+' shadow must cast left and down: '+item.shadow);
    }
   }
   assert(result.stat.header?.bg.includes('225deg'),'Table headers stay in sunlight family');
   assert.equal(result.stat.name.position,'sticky','Pinned table name column stays sticky');
   assert.equal(result.stat.golden,'rgb(242, 206, 139)','Big KPI numbers remain Bärgsunne gold');
   assert(result.stat.sort,'Sorting controls retained');
   assert(result.history.stage?.bg==='none'||result.history.stage?.color==='rgba(0, 0, 0, 0)',
     'Carousel stage stays transparent');
   assert(result.stat.active?.shadow.includes('-'),'Active tool still raised with bottom-left shadow');
   assert(result.live.card,'Live surface still renders');
   assert(result.overflow<=2,'No unwanted page horizontal overflow');
   assert.deepEqual(errors,[],width+' unexpected JS errors');
   console.log('HERITAGE_SITEWIDE_SUNLIGHT_PASS',JSON.stringify({width,profile:result.player.name,background:result.home.background,kpi:result.stat.golden}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('HERITAGE_SITEWIDE_SUNLIGHT_FAIL',e);process.exit(1)});
