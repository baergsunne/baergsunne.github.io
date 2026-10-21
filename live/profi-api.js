import {makeTournament,change,ranking,viewerSnapshot,validNames,validLevels} from './profi-core.js';
const reply=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{
 'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer',
 'cross-origin-resource-policy':'same-origin'}});
const fail=(message,status)=>reply({error:message},status);
const bhex=bytes=>Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
const tokenPattern=/^[a-f0-9]{64}$/;
const idPattern=/^[a-f0-9]{32}$/;
const secureEq=(a,b)=>{if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let bad=0;for(let i=0;i<a.length;i++)bad|=a.charCodeAt(i)^b.charCodeAt(i);return bad===0;};
async function spectatorToken(env,doc){
 if(typeof env.PROFI_VIEWER_SECRET!=='string'||env.PROFI_VIEWER_SECRET.length<32)throw Error('Zuschauerschlüssel fehlt.');
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.PROFI_VIEWER_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return bhex(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('profi:watch:'+doc.id+':'+doc.viewerVersion))));
}
const getRow=(env,id)=>env.DB.prepare('SELECT * FROM profi_sessions WHERE id=?').bind(id).first();
function enforce(condition,message,status=409){if(!condition){const e=new Error(message);e.status=status;throw e;}}
async function read(req){if(Number(req.headers.get('content-length'))>12000)throw new Error('Eingabe zu gross.');const s=await req.text();if(s.length>12000)throw new Error('Eingabe zu gross.');return JSON.parse(s||'{}');}
function docOf(row){return JSON.parse(row.document)}
async function officialAvailable(env,doc,excludeId=null){
 const row=await env.DB.prepare('SELECT * FROM tournaments WHERE year=?').bind(doc.year).first();
 enforce(!!row,'Offizieller Jahrgang fehlt.',404);
 const t=JSON.parse(row.document);
 enforce(t.status!=='final','Der Jahrgang ist bereits abgeschlossen.');
 enforce(doc.round>=1&&doc.round<=t.roundCount,'Runde existiert nicht.',400);
 enforce(!t.published[doc.round],'Diese Runde ist bereits veröffentlicht.');
 enforce(t.players.length===doc.names.length&&t.players.every((p,i)=>p===doc.names[i]),'Spielerliste weicht vom offiziellen Jahrgang ab.');
 const active=await env.DB.prepare("SELECT id FROM profi_sessions WHERE mode='official' AND year=? AND round=? AND status!='cancelled' LIMIT 1").bind(doc.year,doc.round).first();
 enforce(!active||active.id===excludeId,'Für diese Runde existiert bereits ein Profi-Timer.');
 return {t,row};
}
async function emit(env,ctx,id,revision,action){
 // Notification happens only after a committed D1 revision. Never hold up official writes.
 if(typeof ctx?.waitUntil==='function'&&env.PROFI_EVENTS){
  const run=async()=>{
   const obj=env.PROFI_EVENTS.get(env.PROFI_EVENTS.idFromName('profi-'+id));
   await obj.fetch(new Request('https://profi.internal/notify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({revision,action})}));
  };
  ctx.waitUntil(run().catch(()=>{}));
 }
}
export async function handleProfi({req,env,ctx,url,auth,entry,update}){
 const path=url.pathname,method=req.method;
 try{
  if(!env.DB)return fail('Datenbank nicht verbunden.',503);
  if(path==='/api/profi/watch'&&method==='GET'){
   const id=url.searchParams.get('id')||'',ticket=req.headers.get('x-viewer-token')||'';
   if(!idPattern.test(id)||!tokenPattern.test(ticket))return fail('Zugriff verweigert.',403);
   const row=await getRow(env,id);
   if(!row)return fail('Zugriff verweigert.',403);
   const d=docOf(row);
   if(!secureEq(ticket,await spectatorToken(env,d)))return fail('Zugriff verweigert.',403);
   if(d.status==='finished'||d.status==='cancelled')return fail('Turnier beendet.',410);
   return reply({revision:row.revision,pushEnabled:!!env.PROFI_EVENTS,...viewerSnapshot(d)});
  }
  if(path==='/api/profi/socket'&&method==='GET'){
   if(!env.PROFI_EVENTS)return fail('Ereignisgesteuerte Live-Verbindung nicht aktiviert.',503);
   if(req.headers.get('origin')!==url.origin)return fail('Herkunft nicht erlaubt.',403);
   if(req.headers.get('upgrade')?.toLowerCase()!=='websocket')return fail('WebSocket erforderlich.',426);
   const id=url.searchParams.get('id')||'';
   const offered=req.headers.get('sec-websocket-protocol')||'';
   const ticket=offered.match(/(?:^|,\s*)token-([a-f0-9]{64})(?=,|$)/)?.[1]||'';
   if(!idPattern.test(id)||!tokenPattern.test(ticket))return fail('Zugriff verweigert.',403);
   const row=await getRow(env,id);if(!row)return fail('Zugriff verweigert.',403);
   const d=docOf(row);
   if(!secureEq(ticket,await spectatorToken(env,d)))return fail('Zugriff verweigert.',403);
   if(d.status==='finished'||d.status==='cancelled')return fail('Turnier beendet.',410);
   const stub=env.PROFI_EVENTS.get(env.PROFI_EVENTS.idFromName('profi-'+id));
   return stub.fetch(new Request('https://profi.internal/join',{headers:{upgrade:'websocket','sec-websocket-protocol':'bp-viewer'}}));
  }
  if(!await auth(req,env))return fail('Anmeldung erforderlich.',401);
  if(path==='/api/profi/list'&&method==='GET'){
   const rows=await env.DB.prepare('SELECT id,mode,year,round,status,updated_at,revision,document FROM profi_sessions ORDER BY updated_at DESC LIMIT 20').all();
   return reply({sessions:await Promise.all(rows.results.map(async row=>{
    const d=docOf(row);
    return {id:row.id,mode:d.mode,year:d.year,round:d.round,title:d.title,status:d.status,revision:row.revision,updatedAt:row.updated_at};
   }))});
  }
  if(path==='/api/profi/state'&&method==='GET'){
   const id=url.searchParams.get('id')||'';
   if(!idPattern.test(id))return fail('Turnier-ID ungültig.',400);
   const row=await getRow(env,id);if(!row)return fail('Turnier nicht gefunden.',404);
   const doc=docOf(row),ticket=await spectatorToken(env,doc);
   return reply({revision:row.revision,document:doc,summary:viewerSnapshot(doc),
    viewerUrl:url.origin+'/watch.html#id='+doc.id+'&token='+ticket});
  }
  if(path==='/api/profi/create'&&method==='POST'){
   const data=await read(req),mode=data.mode;
   enforce(mode==='official'||mode==='free','Turnierart ungültig.',400);
   const count=await env.DB.prepare("SELECT COUNT(*) AS n FROM profi_sessions WHERE status NOT IN ('finished','cancelled')").first();
   enforce(Number(count?.n||0)<3,'Maximal drei vorbereitete oder aktive Profi-Turniere gleichzeitig.');
   let names,year=null,round=null,title;
   if(mode==='official'){
    year=Number(data.year);round=Number(data.round);
    enforce(Number.isInteger(year)&&year>=2026&&year<=2100&&Number.isInteger(round)&&round>=1&&round<=30,'Runde ungültig.',400);
    const raw=await entry(env,year);enforce(!!raw,'Offizieller Jahrgang fehlt.',404);
    const t=JSON.parse(raw.document);
    enforce(t.status!=='final','Der Jahrgang ist bereits abgeschlossen.');
    enforce(round<=t.roundCount&&!t.published[round],'Runde bereits abgeschlossen oder nicht vorhanden.');
    names=t.players;title='Pokerrunde '+round; // no public Bärgsunne branding
   }else{
    names=validNames(data.names);title=String(data.title||'Privates Pokerturnier').trim();
   }
   const id=bhex(crypto.getRandomValues(new Uint8Array(16)));
   const doc=makeTournament({id,mode,title,names,year,round,
    stack:data.stack===undefined?5000:Number(data.stack),
    rebuyStack:data.rebuyStack===undefined?5000:Number(data.rebuyStack),
    addonStack:data.addonStack===undefined?5000:Number(data.addonStack),
    levels:data.levels===undefined?undefined:validLevels(data.levels)});
   await spectatorToken(env,doc); // fail closed if not configured
   if(mode==='official')await officialAvailable(env,doc);
   const result=await env.DB.prepare('INSERT INTO profi_sessions(id,mode,year,round,status,revision,document,updated_at) VALUES(?,?,?,?,?,0,?,?)')
    .bind(id,mode,year,round,'setup',JSON.stringify(doc),new Date().toISOString()).run();
   enforce(result.meta.changes===1,'Turnier konnte nicht erstellt werden.');
   return reply({id,revision:0,document:doc,viewerUrl:url.origin+'/watch.html#id='+id+'&token='+await spectatorToken(env,doc)},201);
  }
  if(path==='/api/profi/action'&&method==='PUT'){
   const data=await read(req),id=data.id||'';
   if(!idPattern.test(id))return fail('Turnier-ID ungültig.',400);
   const row=await getRow(env,id);if(!row)return fail('Turnier nicht gefunden.',404);
   if(!Number.isInteger(data.revision)||data.revision!==row.revision)return fail('Turnier wurde inzwischen verändert. Bitte neu laden.',409);
   const original=docOf(row);
   if(original.mode==='official'&&data.action!=='revoke'){
    const check=await officialAvailable(env,original,id);
    enforce(check.t.status!=='final','Jahrgang abgeschlossen.');
   }
   const modified=change(original,data.action,{name:data.name},Date.now());
   const result=await env.DB.prepare('UPDATE profi_sessions SET document=?,status=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?')
     .bind(JSON.stringify(modified),modified.status,new Date().toISOString(),id,row.revision).run();
   if(result.meta.changes!==1)return fail('Turnier wurde inzwischen verändert. Bitte neu laden.',409);
   await emit(env,ctx,id,row.revision+1,data.action);
   return reply({revision:row.revision+1,document:modified,summary:viewerSnapshot(modified)});
  }
  if(path==='/api/profi/draft'&&method==='POST'){
   const data=await read(req),id=data.id||'';
   if(!idPattern.test(id))return fail('Turnier-ID ungültig.',400);
   const row=await getRow(env,id);if(!row)return fail('Turnier nicht gefunden.',404);
   const d=docOf(row);
   enforce(d.mode==='official'&&d.status==='finished','Nur abgeschlossene offizielle Runden dürfen übertragen werden.');
   enforce(row.revision===data.revision,'Turnier wurde verändert. Bitte neu laden.');
   const positions=ranking(d).places;
   enforce(!!positions,'Rundenergebnis unvollständig.');
   const checked=await officialAvailable(env,d,id);
   // Reuse official championship's revision-controlled audited write pipeline.
   enforce(checked.row.revision===data.championshipRevision,'Offizielle Runde wurde verändert. Bitte neu laden.');
   if(checked.t.rounds[d.round]&&JSON.stringify(checked.t.rounds[d.round])!==JSON.stringify(positions))return fail('Ein anderer Ergebnisentwurf existiert bereits. Bitte zuerst in der Administration prüfen.',409);
   checked.t.rounds[d.round]=positions;
   return update(env,checked.row,checked.t,'draft:'+d.round,ctx);
  }
  return fail('Route nicht vorhanden.',404);
 }catch(error){
  if(error instanceof SyntaxError)return fail('Ungültiges JSON.',400);
  if(error.status)return fail(error.message,error.status);
  if(/^(2 bis|Blindstruktur|Leveldauer|Blinds|Spieler|Turniername|Chipstack|Turnierart|Offizielle Runde|Eingabe|Turnier bereits|Turnier nicht|Ergebnis|Spielerliste|Rebuy|Ausgeschiedener|Aktion|Zuschauerzugang|Keine Aktion)/.test(error.message))return fail(error.message,400);
  console.error('Profi timer request failed',error);
  return fail('Profi-Timer derzeit nicht verfügbar.',503);
 }
}
