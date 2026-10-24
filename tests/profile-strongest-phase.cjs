const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,390,430,768]){
   const page=await browser.newPage({viewport:{width,height:900},isMobile:width<500,hasTouch:width<500});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8765/#players',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(e=>e.year===2026),null,{timeout:30000});
   await page.evaluate(()=>{state.page='profile';state.profile='Schnarre';draw()});
   const inspect=()=>page.evaluate(()=>{
    const root=document.querySelector('.bp-phase-dynamic');
    const tiles=[...root.querySelectorAll('.bp-phase-tile')].map(x=>({label:x.querySelector('small').textContent,value:x.querySelector('strong').textContent}));
    const n=Number(root.querySelector('[data-phase-custom]').value);
    const rounds=rows().filter(x=>x.player_id==='Schnarre');
    const expected=window.BAERGSUNNE_PROFILE_PHASE.calculate(rounds,n);
    const ordered=[...rounds].sort((a,b)=>a.year-b.year||a.round-b.round);
    const scores=[];
    for(let i=0;i+n<=ordered.length;i++){const segment=ordered.slice(i,i+n);scores.push(segment.reduce((s,x)=>s+ratio(x),0)/n)}
    const columns=getComputedStyle(root.querySelector('.bp-phase-grid')).gridTemplateColumns.split(' ').length;
    return {n,tiles,expected,columns,scoreMax:Math.max(...scores),overflow:document.documentElement.scrollWidth>window.innerWidth+2,
     duplicateExplain:root.querySelectorAll('.bp-metrics-explain').length};
   });
   let x=await inspect();
   const layout=await page.evaluate(()=>{const cards=[...document.querySelectorAll('.bp-phase-tile')];const a=cards[0],label=a.querySelector('small'),value=a.querySelector('strong');return {count:cards.length,align:getComputedStyle(a).textAlign,justify:getComputedStyle(a).justifyContent,items:getComputedStyle(a).alignItems,labelSize:parseFloat(getComputedStyle(label).fontSize),valueSize:parseFloat(getComputedStyle(value).fontSize),maxHeight:Math.max(...cards.map(c=>c.getBoundingClientRect().height)),widths:cards.map(c=>c.getBoundingClientRect().width)}});
   assert.equal(layout.count,9);assert.equal(layout.align,'center');assert.equal(layout.justify,'center');assert.equal(layout.items,'center');
   assert(layout.labelSize>=11.7,'labels enlarged at '+width+': '+layout.labelSize);
   assert(layout.valueSize>=19.2,'values enlarged at '+width+': '+layout.valueSize);
   assert(layout.maxHeight<=116,'compact card height at '+width+': '+layout.maxHeight);
   assert(layout.widths.every(w=>w>60),'three usable card columns at '+width);
   assert.equal(x.n,10);assert.equal(x.tiles.length,9);assert.equal(x.columns,3);
   assert.deepEqual(x.tiles.map(t=>t.label),['Bestes Fenster','Von','Bis','Rundensiege','Punkte insgesamt','Ø Punkte pro Runde','Top-3-Platzierungen','Ø Position im Feld','Nuller']);
   assert(Math.abs(x.expected.relative-x.scoreMax)<1e-8);
   assert.equal(x.duplicateExplain,0);
   assert(!x.overflow,'initial overflow '+width);
   for(const n of [3,5,10]){
    await page.locator('[data-phase-window="'+n+'"]').click();
    x=await inspect();assert.equal(x.n,n);
    assert.equal(x.expected.rounds.length,n);
    assert(Math.abs(x.expected.relative-x.scoreMax)<1e-8);
    assert.equal(Number(x.tiles[3].value),x.expected.wins);
    assert.equal(Number(x.tiles[6].value),x.expected.top3);
    assert.equal(Number(x.tiles[8].value),x.expected.zeros);
    assert.equal(x.columns,3);
    assert(!x.overflow,'preset overflow '+width);
   }
   await page.locator('[data-phase-custom]').fill('7');
   await page.locator('[data-phase-custom]').dispatchEvent('change');
   x=await inspect();assert.equal(x.n,7);assert(Math.abs(x.expected.relative-x.scoreMax)<1e-8);
   assert.equal(Number(x.tiles[3].value),x.expected.wins);
   assert.equal(Number(x.tiles[6].value),x.expected.top3);
   assert(!x.overflow,'custom overflow '+width);
   await page.evaluate(()=>{state.page='profile';state.profile='Frauchi';draw()});
   assert.equal(await page.locator('.bp-phase-tile').count(),9);
   assert.equal(Number(await page.locator('[data-phase-custom]').inputValue()),await page.evaluate(()=>Math.min(10,rows().filter(x=>x.player_id==='Frauchi').length)));
   await page.evaluate(()=>{state.page='profile';state.profile='Schnarre';draw()});
   assert.equal(await page.locator('[data-phase-custom]').inputValue(),'7');
   assert.deepEqual(errors,[],'browser errors '+width);
   console.log('PHASE_SUCCESS',width);
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('PHASE_FAILURE',e);process.exit(1)});
