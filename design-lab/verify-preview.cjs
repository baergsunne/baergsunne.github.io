/* Phase 3 isolated branch browser smoke test.
   Uses only localhost, never publishes or writes to production endpoints. */
const { chromium } = require("playwright");
const fs=require("node:fs");
const path=require("node:path");
const base="http://127.0.0.1:8765";
const routes=["home","history","stats","players","fame","live"];
const sizes=[320,375,390,430,768,1440];
const report={branch:"design/data-first-recomposition-20261025",status:"running",runs:[],errors:[]};
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
(async()=>{
 const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 const out=path.join(__dirname,"qa-screenshots");
 fs.mkdirSync(out,{recursive:true});
 try{
  for(const width of sizes){
   const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:1,reducedMotion:"reduce"});
   const jsErrors=[];
   page.on("pageerror",err=>jsErrors.push(String(err)));
   await page.route("**/*",route=>{
    const u=new URL(route.request().url());
    if(!["127.0.0.1","localhost"].includes(u.hostname)){route.abort();return;}
    if(u.pathname==="/backend-config.js"){
     route.fulfill({status:200,contentType:"text/javascript",body:'window.BAERGSUNNE_API_URL="";'});
     return;
    }
    route.continue();
   });
   for(const name of routes){
    const item={width,route:name,ok:false};
    try{
     await page.goto(base+"/#"+name,{waitUntil:"domcontentloaded",timeout:20000});
     await page.locator(".page--"+name).first().waitFor({state:"attached",timeout:12000});
     await page.waitForTimeout(170);
     const state=await page.evaluate(()=>({
      pageWidth:document.documentElement.scrollWidth,
      viewport:window.innerWidth,
      rootClass:document.documentElement.classList.contains("bp-adh"),
      stylesheetLoaded:!![...document.styleSheets].find(s=>s.href?.includes("data-first-recomposition.css"))
     }));
     item.metrics=state;
     assert(state.rootClass,"Relaunch root marker missing");
     assert(state.stylesheetLoaded,"Design stylesheet missing");
     assert(state.pageWidth<=state.viewport+3,"Page horizontally overflows: "+state.pageWidth+" > "+state.viewport);
     if(name==="home"){
      assert(await page.locator(".x-result-layout").count()===1,"Data-first result sheet missing");
      assert(await page.locator(".x-table-row").count()===10,"Ten verified final standings not visible");
      assert(await page.locator(".discovery-features").count()===0,"Obsolete card navigation still mounted");
      const text=await page.locator(".x-result-layout").innerText();
      assert(text.includes("Frauchi")&&text.includes("König")&&text.includes("+11"),"Real-data endstand/lead not correct");
      assert(await page.locator(".x-cover .discovery-hero-logo").count()===1,"Premium logo hero missing");
     }
     if(name==="history"){assert(await page.locator(".x-history-mast").count()===1,"Data-first historical timeline missing");assert(await page.locator(".history-chronicle").count()===1,"All six original history views must remain");assert((await page.locator(".x-history-mast").innerText()).includes("147"),"Verified rounds must be present");}
     if(name==="stats"){assert(await page.locator(".x-stats-workspace .stat-content").count()===1,"Active statistics first missing");assert(await page.locator(".premium-masthead").count()===0,"Legacy statistics masthead still mounted");assert(await page.locator(".tool-directory .tool-tile").count()>=10,"Statistics tools missing");}
     if(name==="players"){assert(await page.locator(".x-players .x-player-row").count()===23,"All 23 career rows should remain navigable");assert((await page.locator(".x-players").innerText()).includes("Frauchi"),"Current roster missing");assert((await page.locator(".x-players").innerText()).includes("Mike"),"Record master missing");}
     if(name==="fame"){
      assert((await page.locator(".page--fame .podium").innerText()).includes("Mike"),"Record champion missing");
      assert(await page.locator(".x-fame-dominant").count()===1,"New recordmaster stage missing");
      assert(await page.locator(".premium-masthead").count()===0,"Legacy hall masthead still mounted");
      assert(await page.locator(".x-fame-filter details").count()===1,"Archive controls must be retained after records");
      assert(await page.locator(".x-fame-recordbook .hof-extended").count()===1,"Full historical recordbook is missing");
      const title=page.locator(".x-fame-recordbook .hof-extended>h2").first();
      assert((await title.innerText()).includes("Rekorde im Vergleich"),"Hall must use a factual recordbook heading");
      const color=await title.evaluate(el=>({fg:getComputedStyle(el).color,bg:getComputedStyle(el.parentElement).backgroundColor}));
      assert(color.fg!=="rgb(19, 47, 38)","Recordbook heading cannot be dark on dark");
     }
     if(name==="stats"&&width===390){
      await page.locator("#bp-tool-select").selectOption("career");
      await page.waitForTimeout(250);
      assert((await page.locator(".x-stats-workspace").innerText()).includes("Karrieren"),"Tool selection did not update active analysis");
      await page.locator("#bp-tool-select").selectOption("overview");
      await page.waitForTimeout(200);
     }
     if(name==="live"){assert(await page.locator(".x-live-mast").count()===1,"Live stage missing");assert(await page.locator(".discovery-livepage .discovery-live").count()===1,"Actual server-controlled live monitor missing");assert((await page.locator(".x-live-mast").innerText()).includes("Frauchi"),"Historical 2026 champion reference missing");}
     await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:"instant"}));
     await page.waitForTimeout(120);
     if((width===390||width===1440)&&["home","stats","fame","players","history","live"].includes(name))
      await page.screenshot({path:path.join(out,name+"-"+width+".png"),fullPage:true});
     item.ok=true;
    }catch(e){item.error=String(e);report.errors.push({width,route:name,error:String(e)})}
    report.runs.push(item);
   }
   if(width===390){
    try{
     await page.goto(base+"/#stats",{waitUntil:"domcontentloaded"});
     await page.locator("#bp-tool-select").selectOption("career",{timeout:6000});
     assert(await page.locator(".bp-stat-tool-heading h2").first().innerText()==="Karrieren","Statistics dropdown must switch to career");
     report.statsToolNavigation=true;
    }catch(e){report.statsToolNavigation=false;report.errors.push({route:"stats → Karrieren",error:String(e)})}
   }
   if(width===390){
    try{
     await page.goto(base+"/#home",{waitUntil:"domcontentloaded"});
     await page.locator('.x-table-row[data-value="Frauchi"]').first().click({timeout:5000});
     await page.locator(".page--profile").first().waitFor({timeout:6000});
     report.playerNavigation=true;
    }catch(e){report.playerNavigation=false;report.errors.push({route:"home→Frauchi profile",error:String(e)})}
   }
   if(jsErrors.length)report.errors.push({width,route:"pageerror",errors:jsErrors});
   await page.close();
  }
 }finally{
  await browser.close();
  report.status=report.errors.length?"failed":"passed";
  fs.writeFileSync(path.join(__dirname,"qa-phase3-results.json"),JSON.stringify(report,null,2));
  console.log("PHASE4 QA",report.status,report.runs.filter(x=>x.ok).length+"/"+report.runs.length,"routes","profile",report.playerNavigation,"tool",report.statsToolNavigation);
  if(report.errors.length)console.error("QA ERRORS",JSON.stringify(report.errors,null,2));
 }
 if(report.errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});