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
   assert.equal(await page.locator('.page--fame .hof-record').count(),56,'56 historic record podiums');

   // Screenshot regression: all record surfaces share the dark 225-degree
   // forest material, including the mini podium and the expanded rankings.
   const materials=await page.evaluate(()=>{
    const css=x=>getComputedStyle(x).backgroundImage;
    const cards=[...document.querySelectorAll('.page--fame .hof-record')];
    const first=cards[0];
    const tabs=[...document.querySelectorAll('.page--fame .hof-tab')];
    return {
     allCardsDark:cards.every(x=>css(x).includes('rgb(23, 75, 54)')&&css(x).includes('225deg')),
     allPodiumsDark:cards.every(x=>[...x.querySelectorAll('.hof-mini-step')].every(p=>
       css(p).includes(p.classList.contains('hof-mini-step--1')?'rgb(35, 92, 64)':'rgb(26, 81, 58)'))),
     categoryTilesDark:tabs.every(x=>css(x).includes(x.classList.contains('selected')?'rgb(35, 92, 64)':'rgb(26, 81, 58)')),
     noUnwantedMainPodiumChanges:!!document.querySelector('.page--fame > .podium, .page--fame .podium')
    };
   });
   assert(materials.allCardsDark,'all 56 record cards use the darker approved gradient');
   assert(materials.allPodiumsDark,'all 56 three-step record podiums use darker gradients');
   assert(materials.categoryTilesDark,'all four recordbook category tiles use dark gradients');
   assert(materials.noUnwantedMainPodiumChanges,'championship podium remains separate');

   assert.equal(await page.locator('.page--fame .record-grid').count(),0,'duplicate record tiles removed');
   assert.equal(await page.getByText('Die Rekorde',{exact:true}).count(),0,'legacy heading removed');
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
   // Every one of the 56 records has three ordered podium slots, and the
   // complete (still personalized/sortable) table remains accessible below it.
   for(const category of ['Erfolge','Saisonrekorde','Hall of Shame','Rivalitäten']){
    await page.locator('.page--fame .hof-tab').filter({hasText:category,exact:true}).click();
    const list=page.locator('.page--fame .hof-category:not([hidden]) .hof-record');
    const count=await list.count();
    assert(count>0,'each record category contains records');
    for(let i=0;i<count;i++){
     const record=list.nth(i);
     const nodes=record.locator('.hof-mini-podium>.hof-mini-step');
     assert.equal(await nodes.count(),3,'each record has 3 podium slots');
     assert.deepEqual(await nodes.evaluateAll(e=>e.map(x=>x.className.match(/hof-mini-step--[123]/)[0])),['hof-mini-step--2','hof-mini-step--1','hof-mini-step--3']);
     const y=await nodes.evaluateAll(e=>e.map(x=>x.getBoundingClientRect().height));
     assert(y[1]>y[0]&&y[0]>y[2],'winner podium is tallest');
     const details=record.locator('details').first();
     await details.locator('summary').first().click();
     assert(await details.evaluate(x=>x.open),'complete ranking opens below podium');
     assert(await details.locator('table tbody tr').count()>0,'ranking contains entries');
     if(i===0){
      const nested=await details.evaluate(el=>{
       const root=el.closest('.hof-record');
       const row=el.querySelector('tbody tr');
       const picker=root.querySelector('.bp-stat-columns');
       return {
        row:getComputedStyle(row).backgroundImage,
        picker:picker?getComputedStyle(picker).backgroundImage:''
       };
      });
      assert(nested.row.includes('rgb(18, 69, 49)'),'expanded ranking rows use dark forest gradient');
      assert(nested.picker.includes('rgb(18, 69, 49)'),'column selection uses dark forest gradient');
     }

     await details.locator('summary').first().click();
     assert(!(await details.evaluate(x=>x.open)),'ranking closes again');
    }
   }
   await page.locator('.page--fame .hof-tab').filter({hasText:'Saisonrekorde',exact:true}).click();
   const seasonPoints=page.locator('.page--fame .hof-category:not([hidden]) .hof-record').filter({has:page.locator('.hof-record-top span', {hasText:'Höchste Saisonpunkte'})});
   assert.equal(await seasonPoints.locator('.hof-mini-step--1 .hof-mini-name').textContent(),'Frauchi','normalized points leader 2026');
   assert.equal((await seasonPoints.locator('.hof-mini-step--1 .hof-mini-value').textContent()).trim(),'50','2026 score normalized to 7');
   await seasonPoints.getByText('Vollständige Rangliste ansehen').click();
   assert((await seasonPoints.locator('details tbody').innerText()).includes('Original: 76 Punkte in 15 Runden.'),'historic original in ranking');
   const firstThree=await seasonPoints.locator('details tbody tr').evaluateAll(rows=>rows.slice(0,3).map(x=>x.querySelectorAll('td')[1].textContent.trim()));
   const podiumThree=await seasonPoints.locator('.hof-mini-step:not(.hof-mini-step--empty) .hof-mini-name').allTextContents();
   assert.equal(podiumThree.length,3);
   assert(firstThree[0].startsWith(podiumThree[1]),'center winner equals first record row');
   await page.locator('.page--fame .hof-tab').filter({hasText:'Hall of Shame',exact:true}).click();
   const drought=page.locator('.page--fame .hof-category:not([hidden]) .hof-record').filter({has:page.locator('.hof-record-top span',{hasText:'Längste Serie ohne Rundensieg'})});
   assert.equal((await drought.locator('.hof-mini-step--1 .hof-mini-name').textContent()).trim(),'Chopfi','historic win drought leader');
   await drought.locator('details').first().locator('summary').first().click();
   assert((await drought.locator('details tbody').innerText()).includes('Bröne'),'full ranking retains competitors');
   await page.locator('.page--fame .hof-tab').filter({hasText:'Erfolge',exact:true}).click();
   const titles=page.locator('.page--fame .hof-category:not([hidden]) .hof-record').filter({has:page.locator('.hof-record-top span',{hasText:'Meistertitel'})}).first();
   assert.equal((await titles.locator('.hof-mini-step--1 .hof-mini-name').textContent()).trim(),'Mike');
   assert.deepEqual(await titles.locator('.hof-mini-podium>.hof-mini-step .hof-mini-label').allTextContents(),['Rang 2','Rang 1','Rang 2'],'ties share the actual rank instead of an invented third place');
   assert.deepEqual(await titles.locator('.hof-mini-podium>.hof-mini-step .hof-mini-medal').allTextContents(),['🥈','🥇','🥈'],'medals represent true ranks even if display slots differ');
   await page.locator('.page--fame .hof-tab').filter({hasText:'Erfolge'}).click();
   assert.equal(await page.locator('.page--fame .hof-category:not([hidden])').getAttribute('data-hof-category'),'Erfolge');
   console.log('HALL_RECORD_TILES_SUCCESS',width);
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('HALL_RECORD_TILES_FAILURE',e);process.exit(1)});
