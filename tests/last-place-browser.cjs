const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,390,768]){
   const page=await browser.newPage({viewport:{width,height:900},isMobile:width<500,hasTouch:width<500});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8765/#fame',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.BaergsunneRoundPlacement&&window.BaergsunneHallRecords&&document.querySelector('.page--fame .hof-extended'),null,{timeout:30000});
   const check=await page.evaluate(()=>{
    const rule=window.BaergsunneRoundPlacement;
    const editions=db.editions;
    const r2007=editions.find(x=>x.year===2007).rounds[1];
    const r2025=editions.find(x=>x.year===2025).rounds[0];
    const r2026=editions.find(x=>x.year===2026).rounds[0];
    const records=window.BaergsunneHallRecords.calculate(db).records;
    const recent=stats().find(x=>x.name==='Keel');
    const hall=records.find(x=>x.title==='Letzte Rundenplätze');
    const zero=records.find(x=>x.title==='Nullrunden');
    return {
     records:records.length,
     last2025:rule.lastPlayers(r2025),
     positive2025:r2025.results.find(x=>rule.isLast(x,r2025))?.points,
     joint2026:rule.lastPlayers(r2026).sort(),
     group2007:rule.lastPlayers(r2007).length,
     leader:hall.holder,
     leaderValue:hall.value,
     zeroValue:zero.value,
     statsLast:recent.last,
     statsZero:recent.zeros,
     legacyRecordCount:rows().filter(x=>x.isLast).length,
     sourceUnchanged:r2026.results.find(x=>x.player_id==='Chopfi').place===9
    };
   });
   assert.equal(check.records,27);
   assert.equal(check["positive2025"],2);
   assert.equal(check["last2025"].length,1);
   assert.deepEqual(check["joint2026"],['Chopfi','Keel']);
   assert.equal(check["group2007"],3);
   assert.equal(check.leader,'Keel');
   assert.equal(check.leaderValue,36);
   assert.equal(check.zeroValue,35);
   assert.equal(check.statsLast,36);
   assert.equal(check.statsZero,35);
   assert.equal(check.legacyRecordCount,267);
   assert(check.sourceUnchanged);
   await page.locator('.page--fame .hof-tab').filter({hasText:'Hall of Shame'}).click();
   const card=page.locator('.page--fame .hof-category:not([hidden]) .hof-record').filter({has:page.locator('.hof-record-top span',{hasText:'Letzte Rundenplätze'})});
   assert.equal(await card.locator('.hof-mini-step--1 .hof-mini-name').innerText(),'Keel');
   await card.locator('details').first().locator('summary').first().click();
   assert(await card.locator('details').first().evaluate(d=>d.open));
   assert.equal(errors.length,0,errors.join(' | '));
   console.log('LAST_PLACE_BROWSER_OK',width,check);
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('LAST_PLACE_BROWSER_FAILURE',e);process.exit(1)});
