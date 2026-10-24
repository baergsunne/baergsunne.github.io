const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,390,768]){
   const page=await browser.newPage({viewport:{width,height:900},isMobile:width<500,hasTouch:width<500});
   await page.goto('http://127.0.0.1:8765/#fame',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('.page--fame .podium')&&document.querySelector('.page--fame .hof-extended'),null,{timeout:30000});
   const layout=await page.evaluate(()=>{
    const podium=document.querySelector('.page--fame .podium');
    const book=document.querySelector('.page--fame .hof-extended');
    const titles=document.querySelector('.page--fame .card');
    const tabs=book.querySelector('.hof-tabs');
    const cards=[...tabs.querySelectorAll('.hof-tab')];
    return {
     podiumBeforeBook:!!(podium.compareDocumentPosition(book)&Node.DOCUMENT_POSITION_FOLLOWING),
     bookBeforeTitles:!!(book.compareDocumentPosition(titles)&Node.DOCUMENT_POSITION_FOLLOWING),
     display:getComputedStyle(tabs).display,
     columns:getComputedStyle(tabs).gridTemplateColumns.split(' ').length,
     tabsScroll:tabs.scrollWidth-tabs.clientWidth,
     labels:cards.map(x=>x.textContent.trim()),
     podiumPositions:[...podium.children].map(x=>x.className.match(/position-[123]/)?.[0])
    };
   });
   assert(layout.podiumBeforeBook,'podium precedes record book');
   assert(layout.bookBeforeTitles,'record book precedes titleholders');
   assert.equal(layout.display,'grid','record categories are fixed grid');
   assert.equal(layout.columns,width<=700?2:4,'fixed category tile count');
   assert(layout.tabsScroll<=2,'no horizontal category slider');
   assert.deepEqual(layout.labels,['Erfolge','Saisonrekorde','Hall of Shame','Rivalitäten']);
   assert.deepEqual(layout.podiumPositions,['position-2','position-1','position-3']);
   await page.locator('.page--fame .hof-tab').filter({hasText:'Rivalitäten'}).click();
   assert.equal(await page.locator('.page--fame .hof-category:not([hidden])').count(),1,'exactly one visible record category');
   assert.equal(await page.locator('.page--fame .hof-category:not([hidden])').getAttribute('data-hof-category'),'Rivalitäten','record category selection works');
   await page.locator('.page--fame .hof-tab').filter({hasText:'Erfolge'}).click();
   assert.equal(await page.locator('.page--fame .hof-category:not([hidden])').getAttribute('data-hof-category'),'Erfolge');
   console.log('HALL_RECORD_TILES_SUCCESS',width);
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('HALL_RECORD_TILES_FAILURE',e);process.exit(1)});
