const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,390,768]){
   const page=await browser.newPage({viewport:{width,height:900},isMobile:width<500,hasTouch:width<500});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8765/#players',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(e=>e.year===2026),null,{timeout:30000});
   await page.evaluate(()=>{state.page='profile';state.profile='Schnarre';draw()});
   const form=page.locator('.bp-form-chart svg[data-bp-chart="rounds"]');
   assert.equal(await form.count(),1,'form curve must be interactive');
   const labels=await form.locator('text').allTextContents();
   for(const v of ['0 %','25 %','50 %','75 %','100 %'])assert(labels.includes(v),'Y-axis tick '+v);
   assert(labels.some(x=>/^R\d+$/.test(x)),'rounds on X-axis');
   assert(labels.some(x=>/^20\d\d$/.test(x)),'years on X-axis');
   assert(await form.locator('[data-bp-point]').count()>=2,'inspectable form points');
   const first=await form.locator('[data-bp-point]').first().boundingBox();
   await page.mouse.move(first.x+first.width/2,first.y+first.height/2);
   await page.waitForTimeout(100);
   const tooltip=page.locator('.bp-chart-tooltip:not([hidden])');
   assert(await tooltip.count()===1,'mouse chart tooltip visible');
   assert((await tooltip.innerText()).includes('Platz'),'tooltip includes actual placing');
   const career=page.locator('.chart-svg[data-bp-chart="line"]');
   assert.equal(await career.count(),1,'career chart inspectable');
   const c=await career.locator('[data-bp-point]').first().boundingBox();
   await page.mouse.move(c.x+c.width/2,c.y+c.height/2);
   assert((await tooltip.innerText()).includes('Schnarre'),'career tooltip includes player');
   await page.evaluate(()=>{state.page='stats';state.tab='lab';labPrefs.chart='lines';labPrefs.metric='rank';draw()});
   const lab=page.locator('.lab-visual-svg[data-bp-chart="lab"]');
   assert.equal(await lab.count(),1,'lab chart inspectable');
   assert(await lab.locator('[data-bp-point]').count()>0,'lab points annotated');
   assert.deepEqual(errors,[],'browser errors');
   console.log('CHART_TOUCH_AXES_SUCCESS',width);
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('CHART_TOUCH_AXES_FAILURE',e);process.exit(1)});
