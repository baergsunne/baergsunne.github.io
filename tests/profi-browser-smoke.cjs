// Real Chromium smoke test for mobile administrator and anonymous viewer.
// The API server is an isolated in-memory fixture; no Cloudflare or production credentials.
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const root=path.resolve(__dirname,'..');
const mime={'.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.html':'text/html; charset=utf-8','.json':'application/json'};
async function run(){
 const {makeTournament,change,viewerSnapshot}=await import('../live/profi-core.js');
 let doc=null,revision=0,base='';
 const id='7'.repeat(32),ticket='b'.repeat(64);
 const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost'),p=url.pathname;
  const json=(body,status=200)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(body))};
  if(p.startsWith('/api/')){
   if(p==='/api/login'&&req.method==='POST')return json({token:'a'.repeat(64)});
   if(p==='/api/profi/list')return json({sessions:doc?[{id,title:doc.title,mode:doc.mode,status:doc.status,revision}]:[]});
   if(p==='/api/profi/create'&&req.method==='POST'){
    const chunks=[];for await(const c of req)chunks.push(c);
    const body=JSON.parse(Buffer.concat(chunks).toString());
    doc=makeTournament({id,mode:body.mode,title:body.title||'Bärgsunne Test-Runde',names:body.names||['Test A','Test B','Test C'],year:body.mode==='official'?2027:null,round:body.mode==='official'?1:null});
    revision=0;return json({id,revision,document:doc,viewerUrl:base+'/watch.html#id='+id+'&token='+ticket},201);
   }
   if(p==='/api/profi/state')return doc?json({revision,document:doc,summary:viewerSnapshot(doc),viewerUrl:base+'/watch.html#id='+id+'&token='+ticket}):json({error:'missing'},404);
   if(p==='/api/profi/action'&&req.method==='PUT'){
    const chunks=[];for await(const c of req)chunks.push(c);
    const action=JSON.parse(Buffer.concat(chunks).toString());
    if(action.revision!==revision)return json({error:'veralteter Stand'},409);
    try{doc=change(doc,action.action,{name:action.name});revision++;return json({revision,document:doc,summary:viewerSnapshot(doc)})}
    catch(e){return json({error:e.message},409)}
   }
   if(p==='/api/profi/watch'){
    if(!doc||doc.status==='cancelled'||doc.status==='finished')return json({error:'Ended'},410);
    if(req.headers['x-viewer-token']!==ticket)return json({error:'Forbidden'},403);
    return json({...viewerSnapshot(doc),revision,pushEnabled:false});
   }
   if(p==='/api/admin/state')return json({revision:0,document:{status:'planned'}});
   if(p==='/api/admin/logout')return json({ok:true});
   return json({error:'Not found'},404);
  }
  const name=decodeURIComponent(p==='/'?'/profi-live-admin.html':p);
  const resolved=path.resolve(root,'.'+name);
  if(!resolved.startsWith(root+path.sep)||!fs.existsSync(resolved)||!fs.statSync(resolved).isFile()){
   res.writeHead(404);res.end('not found');return;
  }
  res.writeHead(200,{'content-type':mime[path.extname(name)]||'text/plain'});fs.createReadStream(resolved).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 base='http://127.0.0.1:'+server.address().port;
 const screenshotDir=path.join(root,'browser-evidence');fs.mkdirSync(screenshotDir,{recursive:true});
 let browser=null;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const page=await context.newPage();const jsErrors=[];page.on('pageerror',e=>jsErrors.push('admin: '+e.message));
  page.on('dialog',dialog=>dialog.accept());
  await page.goto(base+'/profi-live-admin.html',{waitUntil:'networkidle'});
  assert.equal(await page.locator('#login').isVisible(),true,'Admin login shown');
  assert.equal(await page.locator('#selection').isVisible(),false,'Admin selection hidden before login');
  await page.locator('[name=username]').fill('test');
  await page.locator('[name=password]').fill('testpassword');
  await page.locator('#login-form button').click();
  await page.locator('#selection').waitFor({state:'visible'});
  await page.locator('[data-mode=free]').click();
  await page.locator('[name=title]').fill('Firmenpoker QA');
  await page.locator('[name=names]').fill('Ada\nBerta\nCaro');
  await page.locator('#create button.primary').click();
  await page.locator('#game').waitFor({state:'visible'});
  assert.equal(await page.locator('#type').textContent(),'FREIES TURNIER');
  assert.equal((await page.locator('#qr svg').count()),1,'Local QR rendered');
  await page.screenshot({path:path.join(screenshotDir,'admin-mobile.png'),fullPage:true});
  const viewer=await context.newPage();viewer.on('pageerror',e=>jsErrors.push('viewer: '+e.message));
  await viewer.goto(base+'/watch.html#id='+id+'&token='+ticket,{waitUntil:'networkidle'});
  await viewer.locator('#tournament').waitFor({state:'visible'});
  await viewer.waitForFunction(()=>document.querySelector('#tournament')?.textContent==='Firmenpoker QA');
  assert.equal(await viewer.locator('[data-tab]').count(),5,'Five spectator tabs');
  assert.equal(await viewer.locator('#notice').isVisible(),false,'Viewer connected');
  assert.equal((await viewer.content()).includes('Bärgsunne'),false,'No Bärgsunne branding in spectator UI');
  await viewer.screenshot({path:path.join(screenshotDir,'viewer-mobile.png'),fullPage:true});
  await viewer.locator('[data-tab=players]').click();
  assert.equal(await viewer.locator('[data-panel=players]').isVisible(),true);
  assert.equal(await viewer.locator('#players .row').count(),3);
  await page.locator('#start').click();
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent==='Live');
  await page.locator('#players .player button').first().click();
  await page.waitForFunction(()=>document.querySelector('#counts')?.textContent.includes('2 von 3'));
  await viewer.reload({waitUntil:'domcontentloaded',timeout:12000});
  await viewer.locator('[data-tab=players]').click();
  await viewer.waitForFunction(()=>document.querySelector('#players')?.textContent.includes('Ausgeschieden'));
  await page.locator('#cancel').click();
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent==='Abgebrochen');
  await viewer.reload({waitUntil:'domcontentloaded',timeout:12000});
  await viewer.waitForFunction(()=>document.querySelector('#notice')?.textContent.includes('nicht mehr gültig'));
  assert.equal(await viewer.locator('#clock').textContent(),'--:--','Expired QR displays no live clock');
  const desktop=await browser.newContext({viewport:{width:1280,height:800}});
  const desktopPage=await desktop.newPage();
  await desktopPage.goto(base+'/profi-live-admin.html',{waitUntil:'domcontentloaded'});
  assert.equal(await desktopPage.locator('#login').isVisible(),true);
  if(jsErrors.length)throw Error('Browser JavaScript errors: '+jsErrors.join('; '));
  console.log('PASS: mobile admin login, isolated free mode, QR creation, spectator five tabs, event propagation, cancellation and revoked spectator link.');
  console.log('PASS: desktop admin is protected; screenshots saved locally as QA artifacts.');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
}
run().catch(e=>{console.error(e);process.exitCode=1});
