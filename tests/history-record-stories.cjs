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
    }catch(error){if(!page.isClosed())try{await route.abort()}catch(_){}}
   });
   await page.goto('http://127.0.0.1:8765/#history',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof db!=='undefined'&&db.editions.some(x=>x.year===2026),null,{timeout:30000});
   const audit=await page.evaluate(()=>{
    const errors=[],say=e=>e?.textContent?.trim()||'';
    const technical=/Anzahl Runden mit|Grösster Positionsgewinn|Positionsverlust|Positionsgewinn in|früheren Gesamtwertung|punktführenden Gruppe|Punktgleiche Führende|Berechnung der|Grösster direkter Rückgang/i;
    const mainTitle=(x)=>say(x.querySelector('.history-insight-metric-title'));
    const detail=(x)=>say(x.querySelector('p'));
    const stands=(ed)=>{
     const scores=new Map(ed.players.map(p=>[p,{player:p,points:0,wins:0}]));
     return ed.rounds.slice().sort((a,b)=>a.number-b.number).map(round=>{
      for(const item of round.results){const x=scores.get(item.player_id);if(x){x.points+=item.points;if(item.place===1)x.wins++}}
      return {round:round.number,players:[...scores.values()].sort((a,b)=>b.points-a.points||b.wins-a.wins||a.player.localeCompare(b.player,'de')).map((x,i)=>({...x,rank:i+1}))};
     });
    };
    const gainFrom=(ed,p)=>{
     let best=null,record=0;
     const series=stands(ed).map(t=>({round:t.round,rank:t.players.find(x=>x.player===p)?.rank})).filter(x=>Number.isFinite(x.rank));
     for(let i=0;i<series.length-1;i++)for(let j=i+1;j<series.length;j++){
      const v=series[i].rank-series[j].rank;
      if(v>record){record=v;best={from:series[i],to:series[j]};}
     }
     return {record,best};
    };
    for(const ed of db.editions){
     state.page='history';state.historyYear=ed.year;draw();
     const yearbook=document.querySelector('.history-carousel-slide:not([inert]) .history-yearbook-card');
     const parts=[...yearbook.querySelectorAll('.history-yearbook-extras .history-insight-metric')];
     if(parts.length!==8){errors.push(ed.year+': expected four records and four DNA metrics');continue;}
     for(const item of parts){
      const name=mainTitle(item),value=say(item.querySelector('.history-insight-metric-value')),info=detail(item);
      if(info.length<17)errors.push(ed.year+': too short '+name);
      if(technical.test(info))errors.push(ed.year+': technical explanation '+name+': '+info);
      if(/Meiste (?:Runden|Top-3|Nuller)/.test(name)&&!/Runde/.test(info)&&!/keinen|keine|Niemand|Alle Spieler|nicht/.test(info))errors.push(ed.year+': no actual rounds in '+name+': '+info);
      if(value==='0 Plätze'&&!/keinen|keine|Niemand|Alle Spieler|nicht/.test(info))errors.push(ed.year+': nonexistent rise was invented');
     }
     const climb=parts.find(x=>mainTitle(x)==='Grösste Aufholjagd');
     const highest=+say(climb.querySelector('.history-insight-metric-value')).match(/\d+/)[0];
     const holders=ed.players.map(p=>({player:p,...gainFrom(ed,p)})).filter(x=>x.record===highest&&highest>0);
     const explanation=detail(climb);
     for(const x of holders){
      for(const fragment of [x.player,'Rang '+x.best.from.rank,'Rang '+x.best.to.rank,'Runde '+x.best.from.round,'Runde '+x.best.to.round])
       if(!explanation.includes(fragment))errors.push(ed.year+': missing climb fact '+fragment);
     }
     if(ed.year===2026){
      const keel=holders.find(x=>x.player==='Keel');
      if(!keel||keel.record!==6||keel.best.from.rank!==10||keel.best.from.round!==1||keel.best.to.rank!==4||keel.best.to.round!==5)
       errors.push('2026: Keel ascent must be 10th after round 1 to 4th after round 5');
      if(!explanation.includes('Keel stieg von Rang 10 nach Runde 1 auf Rang 4 nach Runde 5.'))errors.push('2026: no clear Keel journey');
     }
     document.querySelector('.history-entry-tile[data-view="records"]').click();
     const recordbook=document.querySelector('.history-carousel-slide:not([inert]) .history-insight-card');
     const records=[...recordbook.querySelectorAll('.history-insight-metric')];
     if(records.length!==11)errors.push(ed.year+': Rekordbuch should still have 11 record cards');
     if(recordbook.querySelector('.history-insight-section h4')?.textContent!=='Bestleistungen')errors.push(ed.year+': missing positive records');
     for(const item of records){
      const name=mainTitle(item),info=detail(item);
      if(info.length<17)errors.push(ed.year+': too short Rekordbuch '+name);
      if(technical.test(info))errors.push(ed.year+': technical Rekordbuch '+name+': '+info);
      if(/Grösste Aufholjagd|Grösster Absturz|Grösster Sprung nach oben|Grösster Fall nach einer Runde/.test(name)&&!/von Rang/.test(info)&&!/keinen|keine|Niemand|Alle Spieler|nicht/.test(info))
       errors.push(ed.year+': missing concrete start/end of '+name);
     }
    }
    return {issues:errors,years:db.editions.length};
   });
   assert.deepEqual(audit.issues,[],'All record descriptions grounded and accessible at '+width+'px');
   assert.equal(audit.years,17,'All historical tournaments are preserved');
   assert.deepEqual(errors,[],'No runtime errors');
   console.log('HISTORY_RECORD_STORIES_PASS',JSON.stringify({width,years:audit.years,keel2026:true}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(error=>{console.error('HISTORY_RECORD_STORIES_FAIL',error);process.exit(1)});
