const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true});try{
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const exceptions=[];page.on('pageerror',err=>exceptions.push(err.message));
await page.goto('http://127.0.0.1:8765/#stats',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(e=>e.year===2026),{timeout:45000});
const result=await page.evaluate(()=>{
const e=db.editions.find(x=>x.year===2026);
const s=yearly('Schnarre').find(x=>x.year===2026);
const expected=[['Frauchi',1,50],['König',2,39],['Mike',3,29],['Schnarre',4,28],['Bröne',5,27],['Keel',6,26],['Niko',7,23],['Mänu',8,20],['Chopfi',9,17],['Fösu',10,11]];
const ranks=expected.every(([p,place,points])=>{const a=e.official_standings.find(x=>x.player_id===p);return a?.place===place&&a.points===points});
state.profile='Schnarre';state.page='profile';draw();const profile=document.getElementById('page')?.innerText||'';
state.page='stats';state.tab='career';draw();const careers=document.getElementById('page')?.innerText||'';
return {s,eCount:db.editions.length,ranks,profileIncludesYear:profile.includes('2026'),profileIncludesPlace:profile.includes('4'),careerIncludes2026:careers.includes('2026'),careerIncludesSchnarre:careers.includes('Schnarre')};
});
assert.equal(result.s?.place,4,'Schnarre: official 2026 placement');
assert.equal(result.s?.points,28,'Schnarre: official 2026 points');
assert(result.ranks,'Every 2026 official final result');
assert(result.profileIncludesYear&&result.profileIncludesPlace,'2026 shown on player profile');
assert(result.careerIncludes2026&&result.careerIncludesSchnarre,'2026 shown on career page');
assert.deepEqual(exceptions,[],'No uncaught browser errors');
console.log('BROWSER_AUDIT_SUCCESS',JSON.stringify(result));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});