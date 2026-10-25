/* Owner-only Admin behavior – no calls to real Cloudflare and no new live
   tournaments. Test two confirmations, historic archive, revision guards,
   draft/publish confirmation and the visible scroll-to-top success feedback. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const ORIGIN='http://127.0.0.1:8765';
const names=['Frauchi','König','Mike'];
const points=[10,8,6];
function tournament(year,status,roundCount=7){
 const published={};
 if(status==='final')for(let r=1;r<=roundCount;r++)published[r]=names.slice();
 return {year,status,players:names.slice(),roundCount,points:points.slice(),rounds:{},published,
  final:status==='final'?{confirmed_at:'2026-10-18T12:26:00Z'}:null};
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  for(const width of [320,390,768]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:width<500,hasTouch:width<500});
   const errors=[],dialogMessages=[],dialogAnswers=[],writes=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('dialog',async dialog=>{
    dialogMessages.push(dialog.message());
    await (dialogAnswers.shift()?'accept':'dismiss').call(dialog);
   });
   const seasons=new Map([[2026,{revision:60,document:tournament(2026,'final')}]]);let session=false;
   const responses=(data,status=200)=>({status,contentType:'application/json',headers:{'cache-control':'no-store'},body:JSON.stringify(data)});
   await page.route('**/backend-config.js',r=>r.fulfill({status:200,contentType:'text/javascript',body:'window.BAERGSUNNE_API_URL=location.origin;'}));
   await page.route('**/data.js',r=>r.fulfill({status:200,contentType:'text/javascript',body:`window.POKER_SEED={editions:[{year:2007,official_standings:[{place:1,player_id:'Mike',points:60}]},{year:2026,official_standings:[]}]};`}));
   await page.route('**/api/**',async route=>{
    const req=route.request(),u=new URL(req.url()),p=u.pathname,m=req.method();
    const b=m==='GET'?{}:JSON.parse(req.postData()||'{}');
    const result=(data,status=200)=>route.fulfill(responses(data,status));
    if(p==='/api/login'&&m==='POST'){session=true;return result({token:'a'.repeat(64)})}
    if(!session)return result({error:'Anmeldung erforderlich.'},401);
    if(p==='/api/admin/years'&&m==='GET'){
     const years=[...seasons].map(([year,{revision,document}])=>({year,status:document.status,revision})).sort((a,b)=>b.year-a.year);
     return result({years,current_year:years[0]?.year||null,next_year:years[0]?.status==='final'?years[0].year+1:null});
    }
    if(p==='/api/admin/state'&&m==='GET'){
     const y=Number(u.searchParams.get('year'));
     const season=seasons.get(y);
     return season?result(season):result({error:'Jahrgang nicht gefunden.'},404);
    }
    if(p==='/api/admin/new-tournament'&&m==='POST'){
     writes.push({path:p,body:b});
     const latest=[...seasons].map(([year])=>year).sort((a,b)=>b-a)[0],previous=seasons.get(latest);
     if(latest!==b.previousYear||b.previousRevision!==previous.revision||b.year!==latest+1||previous.document.status!=='final'||b.confirmation!=='NEXT_TOURNAMENT')return result({error:'Jahr oder Revision stimmt nicht.'},409);
     seasons.set(b.year,{revision:0,document:tournament(b.year,'planned')});
     return result({ok:true,year:b.year,status:'planned',revision:0},201);
    }
    if(p==='/api/admin/config'&&m==='PUT'){
     writes.push({path:p,body:b});
     const x=seasons.get(b.document.year);
     if(!x||x.revision!==b.revision||Object.keys(x.document.rounds).length)return result({error:'Stand veraltet.'},409);
     x.document={...x.document,...b.document};x.revision++;
     return result({revision:x.revision});
    }
    if(p==='/api/admin/round'&&m==='PUT'){
     writes.push({path:p,body:b});
     const x=seasons.get(b.year);
     if(x.revision!==b.revision)return result({error:'Stand veraltet.'},409);
     if(b.action==='draft')x.document.rounds[b.round]=b.places;
     else if(b.action==='publish'){x.document.rounds[b.round]=b.places;x.document.published[b.round]=b.places;x.document.status='live'}
     else return result({error:'Invalid action'},400);
     x.revision++;return result({revision:x.revision});
    }
    if(p==='/api/admin/logout')return result({ok:true});
    if(p==='/api/admin/audit')return result({events:[]});
    return result({error:'Unerwartete Route: '+p},404);
   });
   await page.goto(ORIGIN+'/admin.html',{waitUntil:'domcontentloaded'});
   await page.locator('#login input[name=username]').fill('test-owner');
   await page.locator('#login input[name=password]').fill('local-test-only');
   await page.locator('#login-form button').click();
   await page.locator('#heading').getByText(/2026/).waitFor().catch(async()=>{await page.locator('#heading').waitFor()});
   await page.waitForFunction(()=>document.querySelector('#year').options.length===2);
   const years=await page.locator('#year option').allTextContents();
   assert(years.some(x=>x.includes('2007')&&x.includes('Archiv')),'Historical year in dropdown');
   assert(years.some(x=>x.includes('2026')&&x.includes('abgeschlossen')),'Official year in dropdown');
   await page.locator('#year').selectOption('2007');
   await page.locator('#load').click();
   assert((await page.locator('#heading').textContent()).includes('schreibgeschützt'));
   assert(await page.locator('#configuration').isHidden(),'No editing historical originals');
   assert((await page.locator('#standings').textContent()).includes('Mike'),'Read-only historical standing');
   await page.locator('#year').selectOption('2026');await page.locator('#load').click();
   assert(await page.locator('#start-new').isVisible(),'A finalized latest year can start next tournament');
   assert((await page.locator('#next-year-note').textContent()).includes('2027'));
   // Both native dialogs must be accepted, cancellation on either creates nothing.
   dialogAnswers.push(false);
   await page.locator('#start-tournament').click();
   assert.equal(writes.filter(x=>x.path==='/api/admin/new-tournament').length,0);
   dialogAnswers.push(true,false);
   await page.locator('#start-tournament').click();
   assert.equal(writes.filter(x=>x.path==='/api/admin/new-tournament').length,0);
   dialogAnswers.push(true,true);
   await page.locator('#start-tournament').click();
   await page.waitForFunction(()=>document.querySelector('#heading').textContent.includes('2027'));
   assert.equal(writes.filter(x=>x.path==='/api/admin/new-tournament').length,1,'A single authorized server creation');
   assert.equal(seasons.get(2026).document.status,'final','Never mutate 2026');
   assert.equal(seasons.get(2027).document.status,'planned');
   assert.equal(Object.keys(seasons.get(2027).document.published).length,0);
   assert((await page.locator('#message').textContent()).includes('erfolgreich eröffnet'));
   assert.equal(await page.locator('#message').getAttribute('data-kind'),'success');
   assert(await page.locator('#start-new').isHidden(),'Cannot create second tournament before next final');
   assert((await page.locator('#year option').allTextContents())[0].includes('2027'));
   assert((await page.locator('#standings').textContent()).includes('Noch keine Runde veröffentlicht'));
   // Arrange complete selections and require a confirmation even for a draft.
   const selects=page.locator('#places select');
   for(let i=0;i<names.length;i++)await selects.nth(i).selectOption(names[i]);
   dialogAnswers.push(false);
   await page.locator('#draft').click();
   assert.equal(writes.filter(x=>x.body?.action==='draft').length,0,'Cancelled draft is not stored');
   // A successful draft jumps back to the status and cannot duplicate on 2nd click.
   await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
   dialogAnswers.push(true);
   await page.locator('#draft').click();
   await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('Entwurf für Runde 1 gespeichert'));
   assert.equal(writes.filter(x=>x.body?.action==='draft').length,1);
   assert.equal(seasons.get(2027).document.published[1],undefined,'Draft is not public');
   assert.equal(await page.locator('#message').getAttribute('data-kind'),'success');
   assert.equal(await page.evaluate(()=>scrollY),0,'Top-of-page confirmation is visible');
   assert(await page.locator('a[href="./#live"]').isVisible(),'Admin can return to Live page');
   dialogAnswers.push(false);
   await page.locator('#publish').click();
   assert.equal(writes.filter(x=>x.body?.action==='publish').length,0,'Cancelled publication is harmless');
   dialogAnswers.push(true);
   await page.locator('#publish').click();
   await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('erfolgreich veröffentlicht'));
   assert.equal(writes.filter(x=>x.body?.action==='publish').length,1);
   assert.equal(seasons.get(2027).document.published[1][0],'Frauchi');
   assert.equal(await page.evaluate(()=>scrollY),0);
   assert(await page.locator('#withdraw').isEnabled(),'Withdraw enabled after publication');
   assert.deepEqual(errors,[],width+' browser JavaScript errors');
   assert.equal(dialogMessages.filter(x=>x.includes('2027')&&x.includes('nächste')).length>=2,true,'Next-year confirmation exists');
   console.log('ADMIN_ANNUAL_FLOW_PASS',JSON.stringify({width,options:years.length,steps:dialogMessages.length,writes:writes.length}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('ADMIN_ANNUAL_FLOW_FAILURE',e);process.exitCode=1});
