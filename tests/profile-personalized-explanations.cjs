const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch();try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true});
 await page.goto('http://127.0.0.1:8765/#players',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(e=>e.year===2026),null,{timeout:30000});
 const result=await page.evaluate(()=>{
  const failures=[];for(const p of db.players.map(x=>x.name)){
   state.page='profile';state.profile=p;draw();
   const root=document.querySelector('.page--profile');
   if(root.querySelector('.explain-detail'))failures.push(p+': legacy explanation accordion still present');
   if(root.textContent.includes('Einfach erklärt'))failures.push(p+': explanation label still present');
   if(!root.querySelector('.chart-svg'))failures.push(p+': career chart missing');
  }
  return {failures,players:db.players.length};
 });
 assert.deepEqual(result.failures,[]);console.log('PROFILE_NO_EXPLAINERS_SUCCESS',JSON.stringify(result));
}finally{await browser.close()}})().catch(e=>{console.error('PROFILE_NO_EXPLAINERS_FAILURE',e);process.exit(1)});
