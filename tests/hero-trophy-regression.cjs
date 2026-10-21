/* Bärgsunne Poker — hero, official trophy and champion regression (2026-10-21). */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fixture=require('./fixture-2026.json');
const year=fixture.editions.find(x=>x.year===2026);
const live={status:'final',year:2026,players:year.players,round_count:7,rounds:[],
 standings:year.official_standings.map(x=>({player:x.player_id,rank:x.place,points:x.points})),
 updated_at:'Teststand'};
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,375,390,430,768,1024]){
   const page=await browser.newPage({viewport:{width,height:880},isMobile:width<=430,hasTouch:width<=430});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/api/editions',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
   await page.route('**/api/live',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(live)}));
   await page.goto('http://127.0.0.1:8765/#home',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(x=>x.year===2026)&&document.querySelector('.discovery-hero-logo'),null,{timeout:25000});
   const home=await page.evaluate(()=>{
    const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
    const hero=document.querySelector('.discovery-hero'),logo=hero.querySelector('.discovery-hero-logo');
    const champ=document.querySelector('.discovery-champion'),copy=champ.querySelector('.discovery-champion-copy'),cup=champ.querySelector('.discovery-champion-trophy img');
    const winner=db.editions.find(e=>e.year===2026)?.official_standings.find(x=>x.place===1);
    return {
     logoCount:hero.querySelectorAll('img').length,logoSrc:logo.getAttribute('src'),logoLoaded:logo.complete&&logo.naturalWidth>0,
     heroTextElements:hero.querySelectorAll('h1,h2,p,.overline,button,a').length,
     heroHasPhoto:getComputedStyle(hero).backgroundImage.includes('alpine-hero'),
     heroRect:rect(hero),logoRect:rect(logo),
     championCount:document.querySelectorAll('.discovery-champion').length,
     championName:champ.querySelector('h2')?.textContent,winnerName:winner?.player_id,
     championPoints:champ.querySelector('p')?.innerText,points:winner?.points,
     championButton:champ.querySelector('button[data-action="openyear"]')?.dataset.value,
     trophyLoaded:cup.complete&&cup.naturalWidth>0,trophySrc:cup.getAttribute('src'),
     copyRect:rect(copy),cupRect:rect(cup),
     headerLogoLoaded:!!document.querySelector('.heritage-header .heritage-logo'),
     navigationItems:document.querySelectorAll('nav.bottomnav button.bottomitem').length,
     horizontalOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth
    };
   });
   assert.equal(home.logoCount,1,width+' hero must contain one logo image');
   assert.equal(home.logoSrc,'assets/logo-premium.webp');
   assert(home.logoLoaded,width+' official logo image must load');
   assert.equal(home.heroTextElements,0,width+' hero must have no headline, overline or CTA');
   assert.equal(home.heroHasPhoto,false,width+' hero must no longer show alpine photo');
   assert(home.logoRect.left>=home.heroRect.left-2&&home.logoRect.right<=home.heroRect.right+2,width+' logo must fit horizontally');
   assert(home.logoRect.top>=home.heroRect.top-2&&home.logoRect.bottom<=home.heroRect.bottom+2,width+' logo must fit vertically');
   assert.equal(home.championCount,1);
   assert.equal(home.championName,home.winnerName,width+' champion name must stay data-driven');
   assert(home.championPoints.includes(String(home.points)),width+' official points must stay data-driven');
   assert.equal(home.championButton,'2026',width+' official yearbook link');
   assert(home.trophyLoaded&&home.trophySrc==='assets/trophy-premium.webp',width+' real champion trophy must load');
   assert(home.copyRect.right<=home.cupRect.left+2||home.copyRect.left>=home.cupRect.right-2,width+' champion text and trophy columns may not overlap');
   assert.equal(home.headerLogoLoaded,true);
   assert.equal(home.navigationItems,5);
   assert(home.horizontalOverflow<=2,width+' no home horizontal scrolling: '+home.horizontalOverflow);
   await page.evaluate(()=>{state.page='history';state.historyYear=2026;draw();document.querySelectorAll('.history-yearbook-trophy').forEach(img=>{img.loading='eager';});});
   await page.waitForFunction(()=>[...document.querySelectorAll('.history-yearbook-trophy')].length===db.editions.length&&[...document.querySelectorAll('.history-yearbook-trophy')].every(img=>img.complete&&img.naturalWidth>0),null,{timeout:15000});
   const history=await page.evaluate(()=>{
    const mast=document.querySelector('.page--history .premium-masthead');
    const cups=[...document.querySelectorAll('.history-yearbook-cup')];
    return {title:mast?.querySelector('h1')?.textContent,photo:getComputedStyle(mast).backgroundImage.includes('alpine-hero'),
      foreground:mast.querySelectorAll('img').length,
      cupCount:cups.length,images:cups.map(c=>({count:c.querySelectorAll('img.history-yearbook-trophy').length,
       loaded:c.querySelector('img')?.complete&&c.querySelector('img')?.naturalWidth>0,
       src:c.querySelector('img')?.getAttribute('src'),emoji:c.textContent.includes('🏆')})),
      sticky:!!document.querySelector('.history-sticky-group'),
      steps:document.querySelectorAll('.history-sticky-group [data-history-step]').length,
      horizontalOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
   });
   assert.equal(history.title,'Historie');
   assert.equal(history.photo,true,width+' keep alpine masthead on other pages');
   assert.equal(history.foreground,0,width+' remove only foreground trophy from masthead');
   assert.equal(history.cupCount,17,width+' real trophy in all 17 yearbook cards');
   assert(history.images.every(x=>x.count===1&&x.loaded&&x.src==='assets/trophy-premium.webp'&&!x.emoji),width+' all yearbook medals use the real trophy');
   assert(history.sticky&&history.steps===2,width+' history sticky and back/forward retained');
   assert(history.horizontalOverflow<=2,width+' no history horizontal scrolling');
   await page.waitForFunction(()=>typeof window.BAERGSUNNE_CHAMPIONSHIP?.mount==='function',null,{timeout:10000});
   await page.evaluate(liveFixture=>{window.BAERGSUNNE_PUBLIC_LIVE=liveFixture;state.page='live';draw();window.BAERGSUNNE_CHAMPIONSHIP.mount()},live);
   const liveDiagnostics=await page.evaluate(()=>({page:state.page,liveStatus:window.BAERGSUNNE_PUBLIC_LIVE?.status,livePlayers:window.BAERGSUNNE_PUBLIC_LIVE?.players?.length,liveStandings:window.BAERGSUNNE_PUBLIC_LIVE?.standings?.length,module:!!window.BAERGSUNNE_CHAMPIONSHIP,root:!!document.querySelector('.discovery-livepage'),hosts:document.querySelectorAll('.championship-live-host').length,leader:document.querySelectorAll('.cl-leader').length,trophies:document.querySelectorAll('.cl-leader-trophy').length,body:document.querySelector('.discovery-livepage')?.innerHTML.slice(0,450)}));
   console.log('HERO_LIVE_DIAGNOSTICS',JSON.stringify(liveDiagnostics));
   await page.waitForSelector('.cl-leader-trophy',{timeout:3500});
   const leader=await page.evaluate(()=>{
    const mast=document.querySelector('.page--live .premium-masthead');
    const box=document.querySelector('.cl-leader'),body=box.querySelector('.cl-leader-body'),cup=box.querySelector('.cl-leader-trophy');
    const a=body.getBoundingClientRect(),b=cup.getBoundingClientRect();
    return {mastPhoto:getComputedStyle(mast).backgroundImage.includes('alpine-hero'),mastForeground:mast.querySelectorAll('img').length,
     label:body.querySelector('span')?.textContent,leader:body.querySelector('strong')?.textContent,
     points:body.querySelector('b')?.textContent,second:body.querySelector('p')?.textContent,
     trophyLoaded:cup.complete&&cup.naturalWidth>0,trophySrc:cup.getAttribute('src'),
     contentOverlap:a.right>b.left+2&&a.left<b.right-2,
     horizontalOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
   });
   assert(leader.mastPhoto&&!leader.mastForeground,width+' live masthead keeps background, no foreground trophy');
   assert(leader.label.includes('DER GEJAGTE'));
   assert.equal(leader.leader,live.standings.find(x=>x.rank===1).player,width+' live winner data preserved');
   assert(leader.points.includes('50')&&leader.second.includes('König'),width+' live points/follower retained');
   assert(leader.trophyLoaded&&leader.trophySrc==='assets/trophy-premium.webp',width+' live trophy present');
   assert.equal(leader.contentOverlap,false,width+' live trophy must not overlap text');
   assert(leader.horizontalOverflow<=2,width+' no live horizontal scrolling');
   for(const target of ['stats','players','fame']){
    await page.evaluate(next=>{state.page=next;draw()},target);
    const report=await page.evaluate(()=>{
      const mast=document.querySelector('.premium-masthead');
      return {title:!!mast?.querySelector('h1'),photo:getComputedStyle(mast).backgroundImage.includes('alpine-hero'),foreground:mast.querySelectorAll('img').length};
    });
    assert(report.title&&report.photo&&report.foreground===0,width+' '+target+' must preserve title/photo without trophy foreground');
   }
   assert.deepEqual(errors,[],width+' browser errors: '+errors.join(' | '));
   console.log('HERO_TROPHY_CHAMPION_OK',JSON.stringify({width,yearbookCards:history.cupCount,heroLogo:true,liveLeader:leader.leader}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(error=>{console.error('HERO_TROPHY_CHAMPION_FAILED',error);process.exit(1)});
