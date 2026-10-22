/* Jahrbuch metric text should fill each small 2-column tile, while keeping
   a controlled edge inset on narrow iPhones. No data or other view changes. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fixture=require('./fixture-2026.json');

(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,375,390,430,600,768]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:width<600,hasTouch:width<600});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/api/editions',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
   await page.route('**/api/live',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'final',year:2026,players:[],standings:[],rounds:[]})}));
   await page.goto('http://127.0.0.1:8765/#history',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(e=>e.year===2026),null,{timeout:20000});
   const sample=await page.evaluate(()=>{
    state.page='history';
    state.historyYear=2026;
    draw();
    const root=document.querySelector('.history-carousel-slide:not([inert]) .history-yearbook-card');
    const metrics=[...root?.querySelectorAll('.history-yearbook-extras .history-insight-metric')||[]];
    const grid=root?.querySelector('.history-yearbook-extras .history-insight-grid');
    if(!root||metrics.length!==8||!grid)return {error:'missing Jahrbuch record/DNA tiles',count:metrics.length};
    const f=n=>parseFloat(n)||0;
    const rect=n=>n.getBoundingClientRect();
    const check=()=>metrics.map(tile=>{
     const s=getComputedStyle(tile),r=rect(tile),pl=f(s.paddingLeft),pr=f(s.paddingRight);
     const children=[...tile.children].filter(n=>n.matches('.history-insight-metric-title,.history-insight-metric-value,.history-insight-metric-players,p'));
     return {width:r.width,paddingLeft:pl,paddingRight:pr,
      children:children.map(el=>({name:el.className||el.tagName.toLowerCase(),width:rect(el).width,
       expected:tile.clientWidth-pl-pr,overflow:el.scrollWidth-el.clientWidth,
       left:rect(el).left-r.left,right:r.right-rect(el).right})),
      overflow:tile.scrollWidth-tile.clientWidth};
    });
    const original=check();
    // The long 2007 tie list and 2022 prose from the actual site screenshots.
    // Inject into the test DOM only to verify the narrowest plausible text.
    metrics[1].querySelector('.history-insight-metric-players').textContent='Pascal K., Mike, Roger, Fösu, Chopfi';
    metrics[1].querySelector('p').textContent='Pascal K. stand in den Runden 1, 2 und 5 auf dem Podest. Mike stand in den Runden 2, 3 und 6 auf dem Podest. Roger stand in den Runden 1, 2 und 6 auf dem Podest. Fösu stand in den Runden 1, 4 und 5 auf dem Podest. Chopfi stand in den Runden 5, 6 und 7 auf dem Podest.';
    const long=check();
    const gr=getComputedStyle(grid), cr=rect(root), first=rect(metrics[0]), second=rect(metrics[1]);
    return {year:root.dataset.year,count:metrics.length,
     cardPadding:f(getComputedStyle(root).paddingLeft),
     gridGap:f(gr.columnGap),gridColumns:gr.gridTemplateColumns,
     rowAligned:Math.abs(first.top-second.top)<2,
     outerInset:first.left-cr.left,
     headings:[...root.querySelectorAll('.history-yearbook-extras .history-insight-section > h4')].map(x=>x.textContent),
     original,long,overflow:document.documentElement.scrollWidth-innerWidth,
     carousel:document.querySelector('.history-carousel-slide')?.offsetWidth};
   });
   assert(!sample.error,width+' '+sample.error);
   assert.equal(sample.year,'2026');
   assert.equal(sample.count,8);
   assert(sample.rowAligned,width+' Jahrbuch remains two columns');
   assert(sample.gridColumns.split(' ').length===2,width+' keeps two metric grid columns');
   assert(sample.carousel>170,width+' preserves carousel geometry');
   assert(sample.overflow<=2,width+' no horizontal page overflow');
   assert.deepEqual(sample.headings,['Vier Jahresrekorde','Turnier-DNA']);
   if(width<=600){
    assert(sample.cardPadding>=9-0.1&&sample.cardPadding<=12.1,width+' outer card padding: '+sample.cardPadding);
    assert(sample.outerInset>=8,width+' metrics must remain inset from outer card');
    assert(sample.gridGap>=5.9&&sample.gridGap<=8.1,width+' consistent narrow grid gap');
   }
   for(const variant of ['original','long']){
    for(const tile of sample[variant]){
     assert(tile.overflow<=2,width+' '+variant+' tile content overflow');
     if(width<=600) {
      assert(tile.paddingLeft>=4.9&&tile.paddingLeft<=7.1,width+' '+variant+' controlled left margin');
      assert(tile.paddingRight>=4.9&&tile.paddingRight<=7.1,width+' '+variant+' controlled right margin');
     }
     for(const child of tile.children){
      assert(child.overflow<=2,width+' '+variant+' overflows '+child.name);
      if(width<=600){
       assert(Math.abs(child.width-child.expected)<=2,width+' '+variant+' full usable text width '+child.name);
       assert(child.left>=4.5&&child.right>=4.5,width+' '+variant+' safe distance for '+child.name);
      }
     }
    }
   }
   assert.deepEqual(errors,[],width+' javascript errors');
   console.log('YEARBOOK_INNER_TEXT_WIDTH_PASS',JSON.stringify({width,cardPadding:sample.cardPadding,metricPadding:sample.original[0].paddingLeft,gridGap:sample.gridGap,tiles:sample.count}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('YEARBOOK_INNER_TEXT_WIDTH_FAIL',e);process.exit(1)});
