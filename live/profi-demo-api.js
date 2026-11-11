import {makeTournament,change,ranking,viewerSnapshot,validNames} from './profi-core.js';

// Public QA facade. No authentication prompts, but every change requires a private
// per-room operator capability; sessions expire and are segregated from official tables.
const MAX_ACTIVE=12,MAX_DAILY=90,MAX_IP_DAILY=5,LIFETIME=90*60*1000;
const idOk=/^[0-9a-f]{32}$/,capOk=/^[0-9a-f]{64}$/;
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
const err=(message,status)=>json({error:message},status);
const hex=a=>Array.from(a,n=>n.toString(16).padStart(2,'0')).join('');
const eq=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&a.split('').reduce((n,c,i)=>n|(c.charCodeAt(0)^b.charCodeAt(i)),0)===0;
async function capability(env,tag,id){
 if(typeof env.PROFI_VIEWER_SECRET!=='string'||env.PROFI_VIEWER_SECRET.length<32)throw Error('Demo nicht eingerichtet.');
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.PROFI_VIEWER_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return hex(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('demo:'+tag+':'+id))));
}
const draftUrl=(url,id,viewer)=>url.origin+'/watch.html#id='+id+'&token='+viewer;
async function body(req){
 const s=await req.text();if(s.length>6000)throw Object.assign(Error('Eingabe zu gross.'),{status:413});
 try{return JSON.parse(s||'{}');}catch{throw Object.assign(Error('Ungültige Eingabe.'),{status:400})}
}
function validate(ok,msg,status=400){if(!ok)throw Object.assign(Error(msg),{status})}
const get=(env,id)=>env.DB.prepare('SELECT * FROM profi_demo_sessions WHERE id=?').bind(id).first();
async function access(req,env,url){
 const id=url.searchParams.get('id')||'';
 validate(idOk.test(id),'Ungültige Demo-ID.');
 const cap=req.headers.get('x-demo-operator')||'';
 validate(capOk.test(cap),'Demo-Zugriff erforderlich.',403);
 validate(eq(cap,await capability(env,'operator',id)),'Demo-Zugriff verweigert.',403);
 const row=await get(env,id);
 validate(!!row,'Demo nicht vorhanden.',404);
 validate(Number(row.expires_at)>Date.now(),'Demo abgelaufen. Neues Turnier starten.',410);
 return {row,doc:JSON.parse(row.document)};
}
function fixtures(mode,requested){
 if(mode==='official')return Array.from({length:10},(_,i)=>'Testspieler '+(i+1));
 return validNames(requested);
}
export async function handleDemo({req,env,url}){
 const path=url.pathname,method=req.method;
 try{
  if(!env.DB||!env.PROFI_VIEWER_SECRET)return err('Demo derzeit nicht verfügbar.',503);
  if(path==='/api/profi/demo/create'&&method==='POST'){
   const data=await body(req);
   validate(['official','free'].includes(data.mode),'Modus ungültig.');
   const now=Date.now(),expires=now+LIFETIME;
   const count=await env.DB.prepare('SELECT COUNT(*) AS n FROM profi_demo_sessions WHERE expires_at>?').bind(now).first();
   validate((count?.n||0)<MAX_ACTIVE,'Alle Demo-Plätze sind belegt. Bitte später erneut versuchen.',429);
   const day=new Date(now).toISOString().slice(0,10),ip=req.headers.get('cf-connecting-ip')||'local';
   const ipHash=await capability(env,'ip',ip+':'+day);
   const buckets=[['all:'+day,MAX_DAILY],['ip:'+ipHash,MAX_IP_DAILY]];
   for(const [key,limit] of buckets){
    const result=await env.DB.prepare('INSERT INTO profi_demo_limits(bucket,count,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1 WHERE count<?').bind(key,now+86400000,limit).run();
    validate(result.meta.changes===1,'Demo-Tageskontingent erreicht. Bitte später erneut versuchen.',429);
   }
   const id=hex(crypto.getRandomValues(new Uint8Array(16)));
   const mode=data.mode,names=fixtures(mode,data.names);
   const stack=data.stack===undefined?5000:Number(data.stack);
   const rebuyStack=data.rebuyStack===undefined?stack:Number(data.rebuyStack);
   const addonStack=data.addonStack===undefined?stack:Number(data.addonStack);
   const title=mode==='official'?'Bärgsunne · Test-Runde 1':String(data.title||'Privater Pokerabend').trim();
   const doc=makeTournament({id,mode,title,names,year:mode==='official'?2027:null,round:mode==='official'?1:null,stack,rebuyStack,addonStack});
   doc.demo=true;doc.demoExpiresAt=expires;
   const write=await env.DB.prepare('INSERT INTO profi_demo_sessions(id,revision,document,expires_at,created_at,updated_at) VALUES(?,0,?,?,?,?)').bind(id,JSON.stringify(doc),expires,now,now).run();
   validate(write.meta.changes===1,'Demo konnte nicht eröffnet werden.',503);
   return json({id,revision:0,operator:await capability(env,'operator',id),document:doc,summary:viewerSnapshot(doc,now),viewerUrl:draftUrl(url,id,await capability(env,'watch',id)),expiresAt:expires},201);
  }
  if(path==='/api/profi/demo/state'&&method==='GET'){
   const {row,doc}=await access(req,env,url);
   return json({id:doc.id,revision:row.revision,document:doc,summary:viewerSnapshot(doc),viewerUrl:draftUrl(url,doc.id,await capability(env,'watch',doc.id)),expiresAt:row.expires_at});
  }
  if(path==='/api/profi/demo/action'&&method==='PUT'){
   const id=url.searchParams.get('id')||'';
   const {row,doc}=await access(req,env,url);
   const data=await body(req);
   validate(Number.isInteger(data.revision)&&data.revision===row.revision,'Demo wurde auf einem anderen Gerät verändert. Aktualisieren.',409);
   validate(['start','pause','resume','next','previous','out','rebuy','addon','undo','finish','cancel','revoke'].includes(data.action),'Aktion nicht erlaubt.');
   const modified=change(doc,data.action,{name:data.name},Date.now());
   const updated=await env.DB.prepare('UPDATE profi_demo_sessions SET document=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND expires_at>?')
    .bind(JSON.stringify(modified),Date.now(),id,row.revision,Date.now()).run();
   validate(updated.meta.changes===1,'Demo wurde inzwischen verändert. Bitte aktualisieren.',409);
   return json({revision:row.revision+1,document:modified,summary:viewerSnapshot(modified),viewerUrl:draftUrl(url,id,await capability(env,'watch',id)),expiresAt:row.expires_at});
  }
  if(path==='/api/profi/demo/draft'&&method==='GET'){
   const {row,doc}=await access(req,env,url);
   validate(doc.mode==='official'&&doc.status==='finished','Ergebnis erst nach Abschluss verfügbar.',409);
   const places=ranking(doc).places;validate(Array.isArray(places),'Ergebnis unvollständig.',409);
   return json({demo:true,officialPublication:false,revision:row.revision,year:2027,round:1,
    title:'Unveröffentlichter Ergebnisentwurf · reine Simulation',
    places:places.map((name,i)=>({place:i+1,name,points:Math.max(0,10-i*2)}))});
  }
  return err('Demofunktion nicht vorhanden.',404);
 }catch(e){
  if(e.status)return err(e.message,e.status);
  if(/^(2 bis|Chipstack|Blind|Turniername|Offizielle Runde|Modus|Ungültige|Aktion|Spieler|Ausgeschiedener|Turnier bereits|Keine Aktion|Ergebnis|Demo|Eingabe)/.test(e.message))return err(e.message,400);
  console.error('Demo request failed',e);return err('Demo derzeit nicht verfügbar.',503);
 }
}
