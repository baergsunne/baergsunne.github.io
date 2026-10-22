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
   const result=await page.evaluate(()=>{
    const sample=(node)=>node?(()=>{
     const s=getComputedStyle(node),r=node.getBoundingClientRect();
     return {bg:s.backgroundImage,color:s.backgroundColor,shadow:s.boxShadow,w:r.width,h:r.height,
      x:r.x,y:r.y,position:s.position,display:s.display};
    })():null;
    const bg=getComputedStyle(document.querySelector('.page')).backgroundColor;
    const home={
     background:bg,body:getComputedStyle(document.body).backgroundColor,
     cards:[sample(document.querySelector('.discovery-champion')),sample(document.querySelector('.discovery-counts>div'))],
     link:sample(document.querySelector('.page--home .discovery-feature'))
    };
    state.page='stats';state.tab='overview';draw();
    const stat={
     kpi:sample(document.querySelector('.page--stats .stat-content>.metrics>.kpi')),
     card:sample(document.querySelector('.page--stats .stat-content .card')),
     picker:sample(document.querySelector('.page--stats .bp-stat-columns')),
     header:sample(document.querySelector('.page--stats .bp-stat-personalized-table thead th')),
     row:sample(document.querySelector('.page--stats .bp-stat-personalized-table tbody tr')),
     name:sample(document.querySelector('.page--stats .bp-stat-personalized-table tbody tr>:first-child')),
     select:sample(document.querySelector('#bp-tool-select')),
     active:sample(document.querySelector('.page--stats .tool-tile.is-active')),
     golden:getComputedStyle(document.querySelector('.page--stats .stat-content>.metrics>.kpi>strong')).color,
     sort:!!document.querySelector('.page--stats .bp-stat-personalized-table thead button')
    };
    state.page='players';draw();
    const player={card:sample(document.querySelector('.playercard--summary')),
      name:document.querySelector('.playercard--summary strong')?.textContent};
    state.page='history';state.historyYear=2026;draw();
    const history={card:sample(document.querySelector('.history-yearbook-card')),
      stage:sample(document.querySelector('.history-chronicle')),
      selector:sample(document.querySelector('#history-year-select')),
      inner:sample(document.querySelector('.history-yearbook-participants'))};
    state.page='live';draw();
    const live={card:sample(document.querySelector('.page--live .cl-block,.page--live .card,.page--live .discovery-live')),
       row:sample(document.querySelector('.page--live .discovery-live-row:not(.heading)'))};
    const chrome={head:sample(document.querySelector('.heritage-header')),bottom:sample(document.querySelector('.bottomnav'))};
    return {home,stat,player,history,live,chrome,overflow:document.documentElement.scrollWidth-innerWidth};
   });
   const toTest=[
    ['home champion',result.home.cards[0]],['home count',result.home.cards[1]],
    ['home navigation',result.home.link],['stats KPI',result.stat.kpi],
    ['stats table card',result.stat.card],['stats picker',result.stat.picker],
    ['stats row',result.stat.row],['stats sticky name',result.stat.name],
    ['stats control',result.stat.select],['players profile',result.player.card],
    ['history card',result.history.card],['history year choice',result.history.selector]
   ];
   assert.equal(result.home.background,'rgb(48, 74, 67)','Lighter, greyer heritage site background');
   assert.equal(result.home.body,result.home.background,'Page/body background matches');
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
