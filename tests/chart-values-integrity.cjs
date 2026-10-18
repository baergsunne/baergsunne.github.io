const{chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true});try{
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true});const errors=[];page.on('pageerror',x=>errors.push(x.message));
for(const path of ['live','editions'])await page.route('**/api/'+path,async route=>{const r=await route.fetch({headers:{...route.request().headers(),origin:'https://baergsunne.github.io'}});await route.fulfill({response:r,headers:{...r.headers(),'access-control-allow-origin':'http://127.0.0.1:8765'}})});
await page.goto('http://127.0.0.1:8765/#stats',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(e=>e.year===2026),null,{timeout:35000});
const check=await page.evaluate(()=>{
 const failures=[],knownYears=db.editions.map(e=>e.year);
 for(const p of db.players.map(x=>x.name)){const official=knownYears.flatMap(y=>{const e=db.editions.find(x=>x.year===y);const s=e.official_standings.find(x=>x.player_id===p);return s?[[y,s.place]]:[];});
 state.page='profile';state.profile=p;draw();const chart=document.querySelector('.chart-svg');
 if(!chart){failures.push(p+': no profile chart');continue;}
 const markers=[...chart.querySelectorAll('circle title')].map(x=>x.textContent);
 for(const [year,rank]of official){if(!markers.includes(p+' · '+year+': '+String(rank)))failures.push(p+': chart missing year '+year+' rank '+rank)}
 if(markers.length!==official.length)failures.push(p+': wrong marker count '+markers.length+' != '+official.length);
 const gaps=knownYears.some(y=>!official.some(x=>x[0]===y));
 if(gaps){const full=knownYears.map(y=>official.find(x=>x[0]===y)?.[1]??null);const expectedSegments=full.reduce((n,v,i)=>n+((v!==null&&i>0&&full[i-1]!==null)?1:0),0);
 const actualSegments=[...chart.querySelectorAll('polyline')].reduce((n,line)=>n+Math.max(0,line.getAttribute('points').trim().split(/\s+/).length-1),0);
 if(actualSegments!==expectedSegments)failures.push(p+': connected across missing years '+actualSegments+' != '+expectedSegments);}
 }
 state.page='stats';state.tab='career';state.metric='rank';draw();
 const career=document.querySelector('.chart-svg');
 for(const p of db.players.map(x=>x.name)){const actual=[...career.querySelectorAll('circle title')].map(x=>x.textContent).filter(x=>x.startsWith(p+' · '));const expected=db.editions.filter(e=>e.players.includes(p)).length;if(actual.length!==expected)failures.push(p+': career chart marker count '+actual.length+' != '+expected)}
 state.tab='lab';draw();const lab=document.querySelector('#page');
 const selected=lab.querySelector('#metric')?.value;if(selected!=='rounds')failures.push('lab metric unexpectedly '+selected+' '+JSON.stringify({tab:state.tab,labMetric:state.labMetric,explanation:lab.querySelector('#selected-stat-tool')?.innerText.slice(0,1200),hasError:lab.innerText.includes('Dieses Werkzeug konnte nicht geladen werden')}));
 state.tab='career';draw();if(document.querySelector('#metric')?.value!=='rank')failures.push('career metric changed after diagram tab');
 return{failures,playerCount:db.players.length,editions:db.editions.length,profileSeries:db.players.length,metricSeparated:true};
});assert.deepEqual(check.failures,[],'Chart/table discrepancies');assert.deepEqual(errors,[],'Browser exceptions');console.log('CHART_VALUES_INTEGRITY_SUCCESS',JSON.stringify(check));}finally{await browser.close()}})().catch(e=>{console.error('CHART_VALUES_INTEGRITY_FAILURE',e);process.exit(1)});