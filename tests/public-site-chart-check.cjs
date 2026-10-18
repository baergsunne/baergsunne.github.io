const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true});try{
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const attempts=16;let last='';
for(let attempt=1;attempt<=attempts;attempt++){
 try{
  const res=await page.goto('https://baergsunne.github.io/?statistics-audit='+attempt+'#home',{waitUntil:'domcontentloaded',timeout:30000});
  if(!res||!res.ok())throw Error('Public HTML returned '+res?.status());
  await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(e=>e.year===2026),null,{timeout:24000});
  const check=await page.evaluate(()=>{
   const loaded=document.querySelector('script[src*="app.js"]')?.getAttribute('src')||'';
   state.page='profile';state.profile='Schnarre';draw();
   const profileText=document.querySelector('#page')?.innerText||'';
   const profileTitle=[...document.querySelectorAll('.chart-svg circle title')].map(t=>t.textContent);
   const edition=db.editions.find(e=>e.year===2026),official=edition.official_standings.find(x=>x.player_id==='Schnarre');
   state.page='stats';state.tab='career';state.metric='rank';draw();
   const careerTitles=[...document.querySelectorAll('#selected-stat-tool .chart-svg circle title')].map(t=>t.textContent);
   return {loaded,official,profileHeading:profileText.includes('Karriere-Entwicklung · offizieller Jahresrang'),profile2026:profileTitle.includes('Schnarre · 2026: 4'),career2026:careerTitles.includes('Schnarre · 2026: 4'),editionCount:db.editions.length};
  });
  assert(check.loaded.includes('20261018-chart-integrity3'),'Not yet new GitHub Pages assets');
  assert.equal(check.official.place,4);assert.equal(check.official.points,28);
  assert(check.profileHeading&&check.profile2026&&check.career2026);
  assert.equal(check.editionCount,17);
  console.log('PUBLIC_SITE_CHARTS_SUCCESS',JSON.stringify(check));return;
 }catch(err){last=String(err.message);console.log('PUBLIC_SITE_RETRY',attempt,last.slice(0,240));if(attempt<attempts)await new Promise(r=>setTimeout(r,20000))}
}
throw Error('Public site not verified after '+attempts+' attempts: '+last);
}finally{await browser.close()}})().catch(e=>{console.error('PUBLIC_SITE_CHARTS_FAILURE',e);process.exit(1)});