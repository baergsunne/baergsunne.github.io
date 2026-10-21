const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,375,390,430]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
   const errors=[];page.on('pageerror',error=>errors.push(error.message));
   for(const path of ['live','editions'])await page.route('**/api/'+path,async route=>{
    try{
     const response=await route.fetch({headers:{...route.request().headers(),origin:'https://baergsunne.github.io'}});
     await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':'http://127.0.0.1:8765'}});
    }catch(e){if(!page.isClosed())try{await route.abort()}catch(_){}}
   });
   await page.goto('http://127.0.0.1:8765/#history',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(x=>x.year===2026),null,{timeout:30000});
   const actual=await page.evaluate(()=>{
    const problems=[];
    const number=node=>Number(node?.textContent?.replace(/[^0-9.]/g,'').trim()||0);
    const text=node=>node?.textContent?.trim()||'';
    const records=['Meiste Rundensiege','Meiste Top-3-Plätze','Meiste Nullerrunden','Grösste Aufholjagd'];
    const dna=['Unterschiedliche Rundensieger','Wechsel an der Tabellenspitze','Abstand zwischen Platz 1 und 2','Anzahl Runden'];
    for(const ed of db.editions){
     state.page='history';state.historyYear=ed.year;draw();
     const card=document.querySelector('.history-carousel-slide:not([inert]) .history-yearbook-card');
     const extra=card?.querySelector('.history-yearbook-extras');
     if(!extra){problems.push(ed.year+': no yearbook extras');continue;}
     const fields=extra.querySelectorAll('.history-yearbook-playerlist>span');
     const names=[...fields].map(text);
     if(names.length!==new Set(ed.players).size)problems.push(ed.year+': participant count incorrect');
     for(const p of ed.players)if(!names.includes(p))problems.push(ed.year+': missing participant '+p);
     if(!text(extra.querySelector('.history-yearbook-participants p')).startsWith(ed.players.length+' Spieler waren'))problems.push(ed.year+': roster summary wrong');
     const sections=[...extra.querySelectorAll('.history-insight-section')];
     if(sections.length!==2){problems.push(ed.year+': expected exactly records and DNA');continue;}
     if(text(sections[0].querySelector('h4'))!=='Vier Jahresrekorde')problems.push(ed.year+': wrong records section');
     if(text(sections[1].querySelector('h4'))!=='Turnier-DNA')problems.push(ed.year+': missing DNA in yearbook');
     const highlights=[...sections[0].querySelectorAll('.history-insight-metric')],metrics=[...sections[1].querySelectorAll('.history-insight-metric')];
     if(highlights.length!==4)problems.push(ed.year+': wrong annual record count '+highlights.length);
     if(metrics.length!==4)problems.push(ed.year+': wrong DNA count '+metrics.length);
     if(JSON.stringify(highlights.map(x=>text(x.querySelector('.history-insight-metric-title'))))!==JSON.stringify(records))problems.push(ed.year+': records order or title');
     if(JSON.stringify(metrics.map(x=>text(x.querySelector('.history-insight-metric-title'))))!==JSON.stringify(dna))problems.push(ed.year+': DNA order');
     const maxFor=fn=>Math.max(0,...ed.players.map(p=>ed.rounds.filter(r=>{
      const item=r.results.find(x=>x.player_id===p);
      return item&&fn(item);
     }).length));
     const wins=maxFor(x=>x.place===1),podiums=maxFor(x=>x.place<=3),zeros=maxFor(x=>x.points===0);
     if(number(highlights[0].querySelector('.history-insight-metric-value'))!==wins)problems.push(ed.year+': round wins mismatch');
     if(number(highlights[1].querySelector('.history-insight-metric-value'))!==podiums)problems.push(ed.year+': top 3 mismatch');
     if(number(highlights[2].querySelector('.history-insight-metric-value'))!==zeros)problems.push(ed.year+': zeros mismatch');
     for(const [index,count,fn] of [[0,wins,x=>x.place===1],[1,podiums,x=>x.place<=3],[2,zeros,x=>x.points===0]]){
      if(count===0)continue;
      const expected=ed.players.filter(p=>ed.rounds.filter(r=>{const x=r.results.find(x=>x.player_id===p);return x&&fn(x)}).length===count);
      const players=text(highlights[index].querySelector('.history-insight-metric-players'));
      for(const p of expected)if(!players.includes(p))problems.push(ed.year+': tie holder missing '+p);
     }
     if(number(metrics[0].querySelector('.history-insight-metric-value'))!==new Set(ed.rounds.flatMap(r=>r.results.filter(x=>x.place===1).map(x=>x.player_id))).size)problems.push(ed.year+': unique winners mismatch');
     if(number(metrics[3].querySelector('.history-insight-metric-value'))!==ed.rounds.length)problems.push(ed.year+': round count mismatch');
     if(card.querySelector('.history-insight-head'))problems.push(ed.year+': duplicate card-wide title');
     if(card.querySelectorAll('.history-shortcuts--yearbook button').length!==2)problems.push(ed.year+': Jahrbuch action links changed');
     if(document.querySelector('#history-sticky-heading')?.textContent!=='Jahrbuch '+ed.year)problems.push(ed.year+': sticky title incorrect');
     const inner=card.getBoundingClientRect(),elms=extra.querySelectorAll('h4,.history-insight-metric,.history-yearbook-playerlist>span');
     for(const el of elms){
      const rect=el.getBoundingClientRect();
      if(rect.left<inner.left-3||rect.right>inner.right+3)problems.push(ed.year+': card overflow '+el.tagName);
      if(el.scrollWidth>el.clientWidth+3)problems.push(ed.year+': text overflow '+el.className);
     }
    }
    state.page='history';state.historyYear=2026;draw();
    document.querySelector('.history-entry-tile[data-view="records"]').click();
    const recordCard=document.querySelector('.history-carousel-slide:not([inert]) .history-insight-card');
    const heads=[...recordCard.querySelectorAll('.history-insight-section>h4')].map(text);
    if(heads.join('|')!=='Bestleistungen|Negativrekorde')problems.push('Rekordbuch must contain positive/negative sections only');
    if(text(recordCard).includes('Turnier-DNA'))problems.push('DNA still shown in Rekordbuch');
    return {problems,years:db.editions.length,recordSections:heads};
   });
   assert.deepEqual(actual.problems,[],'Jahrbuch historical audit at '+width+'px');
   assert.equal(actual.years,17,'Preserve all 17 documented tournament years');
   assert.deepEqual(actual.recordSections,['Bestleistungen','Negativrekorde']);
   assert.deepEqual(errors,[],'No browser exceptions');
   console.log('YEARBOOK_HIGHLIGHTS_DNA_PASS',JSON.stringify({width,years:actual.years,recordsPerYear:4,dnaMetrics:4}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(err=>{console.error('YEARBOOK_HIGHLIGHTS_DNA_FAIL',err);process.exit(1)});
