/* Post-publish audit of actual Github Pages assets and core archive data.
   Expected build versions are read from this commit's index.html, rather than
   a hard-coded obsolete JS cache key. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const local=fs.readFileSync('index.html','utf8');
const base='https://baergsunne.github.io/';
const files=['app.js','history-chronicle.js','lab-premium.js','unified-link-tiles-and-stats.css'];
function assetVersion(html,file){
 const escaped=file.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const m=html.match(new RegExp('(?:src|href)="([^"]*'+escaped+'\\?v=[^"]+)"'));
 return m?.[1]||null;
}
const expected=Object.fromEntries(files.map(f=>[f,assetVersion(local,f)]));
for(const [name,v] of Object.entries(expected))assert(v,'Missing local site asset reference: '+name);
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const attempts=40;let last='';
  for(let attempt=1;attempt<=attempts;attempt++){
   try{
    // Cache-bust the HTML. Assets still load via real published versioned paths.
    const res=await page.goto(base+'?pages-audit='+Date.now()+'-'+attempt+'#home',{waitUntil:'domcontentloaded',timeout:25000});
    if(!res?.ok())throw Error('Public HTML returned '+res?.status());
    const observed={};
    for(const name of files){
     const selector=name.endsWith('.css')?'link[rel="stylesheet"]':'script[src]';
     const urls=await page.locator(selector).evaluateAll(nodes=>nodes.map(n=>n.getAttribute('src')||n.getAttribute('href')||''));
     observed[name]=urls.find(u=>u.includes(name+'?v='))||null;
    }
    const missing=files.filter(name=>observed[name]!==expected[name]);
    if(missing.length)throw Error('Published index differs from main: '+JSON.stringify(missing.map(n=>({name:n,expected:expected[n],got:observed[n]}))));
    // Verify the physical new stylesheet is served by GitHub Pages, not just
    // referenced by an outdated or cached index.
    const css=await page.request.get(new URL(expected['unified-link-tiles-and-stats.css'],base).toString(),{timeout:15000});
    if(!css.ok())throw Error('Published watermark stylesheet '+css.status());
    const style=await css.text();
    if(!style.includes('--bp-link-gradient:')||
       !style.includes('linear-gradient(225deg')||
       !style.includes('width:110%!important')||
       !style.includes('aspect-ratio:2 / 1!important')||
       !style.includes('grid-template-columns:repeat(2,minmax(0,1fr))!important'))
     throw Error('Published stylesheet does not contain new gold-watermark grid');
    await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(e=>e.year===2026),null,{timeout:15000});
    const data=await page.evaluate(()=>{
     const links=[...document.querySelectorAll('.page--home .discovery-features > .discovery-feature')];
     const rects=links.map(c=>c.getBoundingClientRect());
     const style=links[0]?getComputedStyle(links[0]):null;
     const icons=links.map(c=>c.querySelector('.discovery-feature-icon .bp-icon')?.getBoundingClientRect().width||0);
     const version=document.querySelector('link[href*="unified-link-tiles-and-stats.css"]')?.getAttribute('href');
     state.page='profile';state.profile='Schnarre';draw();
     const profileText=document.querySelector('#page')?.innerText||'';
     const profileTitles=[...document.querySelectorAll('.chart-svg circle title')].map(t=>t.textContent);
     const edition=db.editions.find(e=>e.year===2026);
     const official=edition.official_standings.find(x=>x.player_id==='Schnarre');
     state.page='stats';state.tab='career';state.metric='rank';draw();
     const careerTitles=[...document.querySelectorAll('#selected-stat-tool .chart-svg circle title')].map(t=>t.textContent);
     return {version,homeCards:links.length,columns:rects.length===4&&Math.abs(rects[0].top-rects[1].top)<2&&rects[2].top>rects[0].bottom+3,
      dimensions:rects.map(r=>({width:Math.round(r.width),height:Math.round(r.height)})),
      firstIconWidth:icons[0],firstBg:style?.backgroundImage||'',
      official,profileHeading:profileText.includes('Karriere-Entwicklung · offizieller Jahresrang'),
      profile2026:profileTitles.includes('Schnarre · 2026: 4'),
      career2026:careerTitles.includes('Schnarre · 2026: 4'),
      editionCount:db.editions.length};
    });
    assert.equal(data.homeCards,4,'Four entry links in live home');
    assert(data.columns,'Published homepage still lacks 2x2 grid: '+JSON.stringify(data.dimensions));
    assert(data.dimensions.every(t=>Math.abs(t.height-t.width/2)<=1),'Published cards are not exact 2:1 rectangles');
    assert(data.firstIconWidth>100,'Live giant icon watermark missing');
    assert(data.firstBg.includes('linear-gradient'),'Live gold-to-green gradient missing');
    assert.equal(data.official.place,4);
    assert.equal(data.official.points,28);
    assert(data.profileHeading&&data.profile2026&&data.career2026);
    assert.equal(data.editionCount,17);
    console.log('PUBLIC_SITE_LIVE_DESIGN_AND_CHARTS_SUCCESS',JSON.stringify({expected,data}));
    return;
   }catch(err){
    last=String(err.message);
    console.log('PUBLIC_SITE_RETRY',attempt,last.slice(0,500));
    if(attempt<attempts)await new Promise(r=>setTimeout(r,16000));
   }
  }
  throw Error('Public GitHub Pages site not verified after '+attempts+' attempts: '+last);
 }finally{await browser.close()}
})().catch(e=>{console.error('PUBLIC_SITE_LIVE_DESIGN_AND_CHARTS_FAILURE',e);process.exit(1)});
