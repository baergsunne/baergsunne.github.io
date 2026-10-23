const{chromium}=require('playwright');const assert=require('node:assert/strict');(async()=>{const browser=await chromium.launch();try{const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true});for(const path of ['live','editions'])await page.route('**/api/'+path,async route=>{const r=await route.fetch({headers:{...route.request().headers(),origin:'https://baergsunne.github.io'}});await route.fulfill({response:r,headers:{...r.headers(),'access-control-allow-origin':'http://127.0.0.1:8765'}})});await page.goto('http://127.0.0.1:8765/#players');await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(x=>x.year===2026),null,{timeout:30000});
// The current roster is ordered by the most recent official final placing;
// the former roster is A–Z, and every player card retains its profile action.
const roster=await page.evaluate(()=>{
 const latest=[...db.editions].sort((a,b)=>b.year-a.year)[0];
 const expectedCurrent=[...latest.official_standings].sort((a,b)=>a.place-b.place||a.player_id.localeCompare(b.player_id,'de')).map(x=>x.player_id);
 const expectedFormer=[...new Set(db.editions.flatMap(e=>e.players))].filter(p=>!expectedCurrent.includes(p)).sort((a,b)=>a.localeCompare(b,'de'));
 const sections=[...document.querySelectorAll('.page--players .player-roster-group')];
 const cards=cls=>[...document.querySelectorAll('.page--players .player-roster-group--'+cls+' .playercard--summary')];
 const current=cards('current'),former=cards('former');
 const values=el=>[...el.querySelectorAll('.playercard-summary-stats > span')].map(x=>({label:x.querySelector('small')?.textContent.trim(),value:Number(x.querySelector('b')?.textContent)}));
 const sample=current[0],player=sample?.dataset.value;
 const seasons=db.editions.filter(e=>e.players.includes(player));
 const rounds=seasons.flatMap(e=>e.rounds.flatMap(r=>r.results.filter(x=>x.player_id===player)));
 const expectedValues=[seasons.length,rounds.length,seasons.filter(e=>e.official_standings.some(s=>s.player_id===player&&s.place===1)).length,rounds.filter(x=>x.place===1).length,rounds.filter(x=>x.place<=3).length];
 return {
  headings:sections.map(s=>s.querySelector('h2')?.textContent.trim()),
  yearSubtitle:!!sections[0]?.querySelector('.player-roster-heading > span'),
  year:latest.year,
  current:current.map(c=>c.dataset.value),former:former.map(c=>c.dataset.value),
  expectedCurrent,expectedFormer,allCards:current.length+former.length,
  sampleName:player,sampleValues:values(sample),expectedValues,
  clickable:[...current,...former].every(x=>x.dataset.action==='profile'&&x.getAttribute('aria-label')?.includes(x.dataset.value))
 };
});
assert.deepEqual(roster.headings,['Aktuelles Teilnehmerfeld','Ehemalige Teilnehmer']);
assert.equal(await page.locator('.page--players h2, .page--players h3').filter({hasText:'Spielerstatistiken'}).count(),0,'Duplicate Spielerstatistiken heading is removed from players page');
assert.equal(await page.locator('.page--players .player-roster-group .playercard--summary').count(),roster.allCards,'All player tiles remain present');
assert.equal(roster.yearSubtitle,false,'No ranking heading or subtitle in the player roster');
assert.equal(roster.year,2026,'Last officially documented tournament');
assert.deepEqual(roster.current,roster.expectedCurrent,'Latest participants are in official ranking order');
assert.equal(roster.current.length,10,'All ten 2026 participants');
assert.deepEqual(roster.current,['Frauchi','König','Mike','Schnarre','Bröne','Keel','Niko','Mänu','Chopfi','Fösu'],'Expected display order without rank numbers');
assert.deepEqual(roster.former,roster.expectedFormer,'Former participants A–Z');
assert.equal(roster.allCards,roster.current.length+roster.former.length,'Every archived player occurs once');
assert.deepEqual(roster.sampleValues.map(x=>x.label),['Turniere','Runden','Titel','Siege','Top 3']);
assert.deepEqual(roster.sampleValues.map(x=>x.value),roster.expectedValues,'Career values unchanged');
assert(roster.clickable,'All player cards still open their profile');
for(const width of [320,390,430,768]){
 await page.setViewportSize({width,height:844});
 const layout=await page.evaluate(()=>{
  const cards=[...document.querySelectorAll('.page--players .player-roster-group .playercard--summary')];
  return {overflow:document.documentElement.scrollWidth-innerWidth,
   allCards:cards.length,columns:getComputedStyle(document.querySelector('.page--players .player-roster-group--former .playergrid')).gridTemplateColumns.split(' ').length,
   textFits:cards.every(c=>c.getBoundingClientRect().width>220&&c.querySelector('.playercard-summary-stats').scrollWidth<=c.querySelector('.playercard-summary-stats').clientWidth+1)};
 });
 assert(layout.overflow<=2,width+' player page must not overflow');
 assert.equal(layout.columns,1,width+' former participants must be listed vertically');
 assert(layout.textFits,width+' all five career metrics fit');
 assert.equal(layout.allCards,roster.allCards,width+' all cards remain visible');
}

// Profile tables now use the same statistics-table picker and forest styling,
// without losing the existing native per-column sorting.
await page.evaluate(()=>{state.page='profile';state.profile='Borer';draw()});
await page.waitForFunction(()=>{
 const eligible=[...document.querySelectorAll('.page--profile table')].filter(t=>t.tHead?.rows?.length===1&&t.tHead.rows[0].cells.length>=2&&[...t.tHead.rows[0].cells].every(h=>h.colSpan===1&&h.rowSpan===1));
 return eligible.length>0&&eligible.every(t=>t.dataset.bpStatPersonalized==='1');
},null,{timeout:12000});
const initial=await page.evaluate(()=>{
 const tables=[...document.querySelectorAll('.page--profile table')];
 const eligible=tables.filter(t=>t.tHead?.rows?.length===1&&t.tHead.rows[0].cells.length>=2&&[...t.tHead.rows[0].cells].every(h=>h.colSpan===1&&h.rowSpan===1));
 const enhanced=tables.filter(t=>t.classList.contains('bp-stat-personalized-table'));
 const table=enhanced.find(t=>t.tHead.rows[0].cells.length>=3);
 const th=[...table.tHead.rows[0].cells];
 const css=th.map(h=>({background:getComputedStyle(h).backgroundColor,image:getComputedStyle(h).backgroundImage,shadow:getComputedStyle(h).boxShadow}));
 const scroll=table.parentElement;
 return {eligible:eligible.length,enhanced:enhanced.length,pickers:document.querySelectorAll('.page--profile .bp-stat-columns').length,
  css,firstPosition:getComputedStyle(th[0]).position,
  scrollScrollable:scroll.classList.contains('bp-stat-scroll'),sorted:!!th[0].querySelector('.bp-smart-sort'),
  duplicateToolbar:!!document.querySelector('.page--profile .bp-unified-toolbar')};
});
assert(initial.eligible>0&&initial.enhanced===initial.eligible,'Every eligible profile table enhanced');
assert.equal(initial.pickers,initial.enhanced,'One independent picker per profile table');
assert(initial.css.every(h=>h.background==='rgb(16, 43, 34)'&&h.image==='none'&&h.shadow==='none'),'Identical flat Forest-green header cells in profile');
assert.equal(initial.firstPosition,'sticky','First profile column stays sticky');
assert(initial.scrollScrollable&&initial.sorted,'Scrolling and sorting work in profile');
assert(!initial.duplicateToolbar,'No duplicated sorting toolbar');
const profileTable=page.locator('.page--profile table.bp-stat-personalized-table').filter({has:page.locator('thead th:nth-child(3)')}).first();
const wrapper=profileTable.locator('xpath=..');
const picker=wrapper.locator('xpath=preceding-sibling::details[contains(@class,"bp-stat-columns")][1]');
assert.equal(await picker.count(),1,'Picker immediately precedes its profile table');
const summary=picker.locator('summary');
await summary.click();
const choices=picker.locator('.bp-stat-column-choice');
const total=await choices.count();
assert(total>=3,'Profile column choices available');
assert.equal(await choices.first().isDisabled(),true,'First column always visible');
await choices.nth(1).click();
assert.equal(await profileTable.locator('thead th:nth-child(2)').getAttribute('data-bp-column-hidden'),'','Second column hidden');
assert.equal(await choices.nth(1).getAttribute('aria-pressed'),'false');
assert((await summary.innerText()).includes((total-1)+' von '+total+' sichtbar'),'Visible column count updates');
await profileTable.locator('thead th:first-child .bp-smart-sort').click();
assert.equal(await profileTable.locator('thead th:first-child').getAttribute('aria-sort'),'ascending','Native table sorting retained');
await page.evaluate(()=>{state.page='profile';state.profile='Bröne';draw()});
await page.waitForFunction(()=>[...document.querySelectorAll('.page--profile table')].some(t=>t.dataset.bpStatPersonalized==='1'),null,{timeout:10000});
assert.equal(await page.locator('.page--profile table.bp-stat-personalized-table').first().locator('thead th:nth-child(2)').getAttribute('data-bp-column-hidden'),null,'Another player uses independent column choice');
await page.evaluate(()=>{state.page='profile';state.profile='Borer';draw()});
await page.waitForFunction(()=>[...document.querySelectorAll('.page--profile table')].some(t=>t.dataset.bpStatPersonalized==='1'),null,{timeout:10000});
assert.equal(await page.locator('.page--profile table.bp-stat-personalized-table').first().locator('thead th:nth-child(2)').getAttribute('data-bp-column-hidden'),'','Saved profile choice survives redraw');
for(const width of [320,390,430,768]){
 await page.setViewportSize({width,height:844});
 const d=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,controls:document.querySelectorAll('.page--profile .bp-stat-columns-summary').length}));
 assert(d.overflow<=2,width+' profile tables must scroll internally without horizontal page overflow');
 assert(d.controls>=initial.enhanced,width+' dropdowns must remain available');
}
const results=await page.evaluate(()=>{const failures=[];for(const player of db.players.map(p=>p.name)){state.page='profile';state.profile=player;draw();const tables=[...document.querySelectorAll('#page table')];if(!tables.length)failures.push(player+': no tables');if(document.querySelector('#page .bp-unified-toolbar'))failures.push(player+': redundant toolbar');for(const t of tables){if(!t.tHead?.querySelector('th'))failures.push(player+': missing table header')}}state.page='stats';state.tab='career';draw();return{failures,players:db.players.length,otherToolbar:!!document.querySelector('#page .bp-unified-toolbar')}});assert.deepEqual(results.failures,[]);assert(results.otherToolbar,'other pages unexpectedly changed');console.log('PROFILE_SORT_TOOLBAR_SUCCESS',JSON.stringify(results));}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});