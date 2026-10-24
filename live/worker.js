import {freshTournament,validateConfig,validatePlaces,normalizeResults,publicSnapshot,finalizedEdition} from './core.js';

const json=(value,status=200,extra={})=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer',...extra}});
// GitHub Pages may read only published results; authentication and writes stay same-origin.
const publicJson=(value,req)=>json(value,200,req.headers.get('origin')==='https://baergsunne.github.io'?{'access-control-allow-origin':'https://baergsunne.github.io','vary':'Origin'}:{});
const fail=(message,status)=>json({error:message},status);
const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
const digest=async s=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const derive=async(password,salt,iterations)=>{
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:Uint8Array.from(salt.match(/../g),x=>parseInt(x,16)),iterations},key,256));
};
const equal=(a,b)=>{if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0;};
async function body(req){if(Number(req.headers.get('content-length'))>12000)throw Error('Eingabe zu gross.');const text=await req.text();if(text.length>12000)throw Error('Eingabe zu gross.');return JSON.parse(text||'{}');}
const entry=async(env,year)=>env.DB.prepare('SELECT * FROM tournaments WHERE year=?').bind(year).first();
async function auth(req,env){const token=req.headers.get('authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];if(!token)return null;const hash=await digest(token),now=Date.now();const row=await env.DB.prepare('SELECT token_hash FROM sessions WHERE token_hash=? AND expires_at>?').bind(hash,now).first();return row?hash:null;}
function sameOrigin(req){const origin=req.headers.get('origin'),here=new URL(req.url).origin;return origin===here;}
async function update(env,row,document,action,ctx){const at=new Date().toISOString();const result=await env.DB.prepare('UPDATE tournaments SET document=?,revision=revision+1,updated_at=?,actor=?,action=? WHERE year=? AND revision=?').bind(JSON.stringify(document),at,'owner',action,row.year,row.revision).run();if(result.meta.changes!==1)return fail('Zwischenzeitlich geändert. Bitte neu laden.',409);
// This is intentionally non-blocking: login and committed writes NEVER wait for event delivery.
// Only authenticated publish/withdraw/finalize routes call this after D1 commit.
if (typeof ctx?.waitUntil === 'function' && env.LIVE_EVENTS && /^(publish|withdraw|finalize)(:|$)/.test(action)) {
 const kind=action.split(':')[0],revision=row.revision+1;
 ctx.waitUntil(Promise.resolve().then(() =>
   env.LIVE_EVENTS.getByName('tournament-'+row.year)
     .broadcast({year:row.year,revision,action:kind})
 ).catch(error => console.error('Optional live notification failed',error)));
}
return json({revision:row.revision+1,updated_at:at});}

export default {async fetch(req,env,ctx){
 try {
  const url=new URL(req.url),path=url.pathname,method=req.method;
  if(env.PREVIEW_REQUIRED==='true'&&!env.PREVIEW_GATE_SECRET)return fail('Private Vorschau noch nicht freigeschaltet.',503);
  if(env.PREVIEW_GATE_SECRET){
   const today=new Date().toISOString().slice(0,10),valid=await digest(env.PREVIEW_GATE_SECRET+':'+today);
   const cookie=req.headers.get('cookie')?.match(/(?:^|;\s*)bp_preview=([a-f0-9]{64})(?:;|$)/)?.[1];
   if(!equal(cookie,valid)){
    if(path==='/preview-unlock'&&method==='POST'){
     if(!sameOrigin(req))return fail('Herkunft nicht erlaubt.',403);
     const form=await req.formData(),candidate=String(form.get('passphrase')||'');
     if(candidate.length>200||!equal(await digest(candidate),await digest(env.PREVIEW_GATE_SECRET)))return fail('Vorschauzugang abgelehnt.',403);
     return new Response(null,{status:303,headers:{location:'/', 'set-cookie':`bp_preview=${valid}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`,'cache-control':'no-store'}});
    }
    return new Response('<!doctype html><html lang="de-CH"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Private Bärgsunne Vorschau</title><body style="font:18px system-ui;background:#081510;color:white;padding:2rem;max-width:32rem;margin:auto"><h1>Bärgsunne Poker · private Vorschau</h1><form action="/preview-unlock" method="post"><label>Vorschaucode<input name="passphrase" type="password" required style="display:block;width:100%;padding:1rem;margin:1rem 0"></label><button style="padding:1rem">Vorschau öffnen</button></form></body></html>',{status:401,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"}});
   }
  }
  if(path.startsWith('/api/')){
   if(!env.DB)return fail('Datenbank nicht verbunden.',503);
   if(method!=='GET'&&!sameOrigin(req))return fail('Herkunft nicht erlaubt.',403);
   if(method!=='GET'&&!/^application\/json(?:;|$)/i.test(req.headers.get('content-type')||''))return fail('JSON erforderlich.',415);
   if(path==='/api/live'&&method==='GET'){
    const requested=url.searchParams.get('year');
    const latest=requested?null:await env.DB.prepare("SELECT year FROM tournaments ORDER BY CASE WHEN json_extract(document,'$.status')='final' THEN 1 ELSE 0 END, year DESC LIMIT 1").first();
    const year=Number(requested||latest?.year||2026);
    if(!Number.isInteger(year)||year<2026||year>2100)return fail('Jahr ungültig.',400);
    const row=await entry(env,year);return publicJson(row?publicSnapshot(JSON.parse(row.document),row.updated_at):{status:'planned',year,standings:[],rounds:[]},req);
   }
   if(path==='/api/editions'&&method==='GET'){
    const rows=await env.DB.prepare("SELECT document FROM tournaments WHERE json_extract(document,'$.status')='final' ORDER BY year ASC").all();
    return publicJson({editions:rows.results.map(x=>finalizedEdition(JSON.parse(x.document)))},req);
   }
   if(path==='/api/edition'&&method==='GET'){
    const year=Number(url.searchParams.get('year')||2026),row=await entry(env,year);
    if(!row)return fail('Jahrgang nicht vorhanden.',404);
    const t=JSON.parse(row.document);return t.status==='final'?publicJson({edition:finalizedEdition(t)},req):fail('Jahrgang noch nicht abgeschlossen.',404);
   }
   if(path==='/api/setup'&&method==='POST'){
    const bootstrap=env.BOOTSTRAP_SECRET||env.PREVIEW_GATE_SECRET;
    if(!bootstrap)return fail('Einrichtung noch nicht freigegeben.',503);
    const b=await body(req),current=await env.DB.prepare('SELECT id FROM owner WHERE id=1').first();
    if(current)return fail('Bereits eingerichtet.',409);
    if(!equal(await digest(String(b.secret||'')),await digest(bootstrap)))return fail('Einrichtung abgelehnt.',403);
    if(!/^[a-zA-Z0-9_-]{3,30}$/.test(b.username)||typeof b.password!=='string'||b.password.length<14||b.password.length>200)return fail('Benutzername oder Passwort ungültig (mindestens 14 Zeichen).',400);
    // Cloudflare's production WebCrypto caps a single PBKDF2 derivation at 100,000 rounds.
    // The independently stored RATE_SALT also peppers the password hash.
    if(!env.RATE_SALT)return fail('Sicherheitskonfiguration fehlt.',503);
    const salt=random(),iterations=100000,hash=await derive(b.password+':'+env.RATE_SALT,salt,iterations);
    const result=await env.DB.prepare('INSERT OR IGNORE INTO owner(id,username,salt,password_hash,iterations) VALUES(1,?,?,?,?)').bind(b.username,salt,hash,iterations).run();
    return result.meta.changes===1?json({ok:true}):fail('Bereits eingerichtet.',409);
   }
   if(path==='/api/login'&&method==='POST'){
    const b=await body(req),ip=req.headers.get('cf-connecting-ip')||'unknown',client=await digest(ip+':'+(env.RATE_SALT||'local')),now=Date.now();
    const attempt=await env.DB.prepare('SELECT * FROM login_attempts WHERE client_hash=?').bind(client).first();
    if(attempt?.blocked_until>now)return fail('Zu viele Versuche. Bitte später erneut anmelden.',429);
    const owner=await env.DB.prepare('SELECT * FROM owner WHERE id=1').first();
    const good=owner&&b.username===owner.username&&typeof b.password==='string'&&env.RATE_SALT&&equal(await derive(b.password+':'+env.RATE_SALT,owner.salt,owner.iterations),owner.password_hash);
    if(!good){const recent=attempt&&now-attempt.window_start<600000,failures=recent?attempt.failures+1:1,block=failures>=5?now+900000:0;
      await env.DB.prepare('INSERT INTO login_attempts(client_hash,failures,window_start,blocked_until) VALUES(?,?,?,?) ON CONFLICT(client_hash) DO UPDATE SET failures=excluded.failures,window_start=excluded.window_start,blocked_until=excluded.blocked_until').bind(client,failures,recent?attempt.window_start:now,block).run();return fail('Anmeldung fehlgeschlagen.',401);}
    await env.DB.prepare('DELETE FROM login_attempts WHERE client_hash=?').bind(client).run();
    const token=random();await env.DB.prepare('INSERT INTO sessions(token_hash,expires_at) VALUES(?,?)').bind(await digest(token),now+8*3600000).run();
    return json({token,username:owner.username,expires_at:now+8*3600000});
   }
   const session=await auth(req,env);if(!session)return fail('Anmeldung erforderlich.',401);
   if(path==='/api/admin/logout'&&method==='POST'){await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(session).run();return json({ok:true});}
   if(path==='/api/admin/audit'&&method==='GET'){
    const year=Number(url.searchParams.get('year')||2026);
    const result=await env.DB.prepare('SELECT id,year,revision,recorded_at,actor,action FROM audit WHERE year=? ORDER BY id DESC LIMIT 100').bind(year).all();return json({events:result.results});
   }
   if(path==='/api/admin/state'&&method==='GET'){
    const year=Number(url.searchParams.get('year')||2026),row=await entry(env,year);
    return json(row?{revision:row.revision,document:JSON.parse(row.document),updated_at:row.updated_at}:{revision:null,document:freshTournament(year)});
   }
   if(path==='/api/admin/config'&&method==='PUT'){
    const b=await body(req),c=validateConfig(b.document),row=await entry(env,c.year);
    if(!row){if(b.revision!==null)return fail('Stand veraltet.',409);const t={...freshTournament(c.year),...c};
      const at=new Date().toISOString(),result=await env.DB.prepare('INSERT OR IGNORE INTO tournaments(year,revision,document,updated_at,actor,action) VALUES(?,0,?,?,?,?)').bind(c.year,JSON.stringify(t),at,'owner','create').run();return result.meta.changes===1?json({revision:0}):fail('Stand veraltet.',409);}
    const t=JSON.parse(row.document);if(t.status!=='planned'||Object.keys(t.published).length||Object.keys(t.rounds).length)return fail('Konfiguration nach Rundenerfassung gesperrt.',409);
    if(b.revision!==row.revision)return fail('Stand veraltet.',409);return update(env,row,{...t,...c},'config',ctx);
   }
   if(path==='/api/admin/round'&&method==='PUT'){
    const b=await body(req),year=Number(b.year),row=await entry(env,year);if(!row)return fail('Turnier zuerst einrichten.',404);
    if(b.revision!==row.revision)return fail('Stand veraltet.',409);const t=JSON.parse(row.document),number=Number(b.round);
    if(t.status==='final')return fail('Turnier abgeschlossen.',409);
    if(!Number.isInteger(number)||number<1||number>t.roundCount)return fail('Runde ungültig.',400);
    if(b.action==='draft'){t.rounds[number]=normalizeResults(b.places,t);return update(env,row,t,'draft:'+number,ctx);}
    if(b.action==='publish'){
      const results=normalizeResults(b.places,t);if(!Object.keys(t.published).length&&number!==1||number>1&&!t.published[number-1])return fail('Vorherige Runde zuerst veröffentlichen.',409);
      t.rounds[number]=results;t.published[number]=results;t.status='live';return update(env,row,t,'publish:'+number,ctx);
    }
    if(b.action==='withdraw'){
      if(!t.published[number])return fail('Runde nicht veröffentlicht.',409);
      if(Object.keys(t.published).some(n=>Number(n)>number))return fail('Spätere Runden zuerst zurückziehen.',409);
      delete t.published[number];t.status=Object.keys(t.published).length?'live':'planned';return update(env,row,t,'withdraw:'+number,ctx);
    }
    return fail('Aktion ungültig.',400);
   }
   if(path==='/api/admin/finalize'&&method==='POST'){
    const b=await body(req),row=await entry(env,Number(b.year));if(!row)return fail('Turnier nicht vorhanden.',404);
    if(b.revision!==row.revision)return fail('Stand veraltet.',409);const t=JSON.parse(row.document);
    if(t.status==='final')return fail('Bereits abgeschlossen.',409);
    const edition=finalizedEdition(t),signature=edition.official_standings.map(x=>`${x.place}. ${x.player_id} ${x.points}`).join(' | ');
    if(b.confirmation!==signature)return fail('Schlussrangliste neu prüfen und bestätigen.',409);
    t.status='final';t.final={confirmed_at:new Date().toISOString(),signature};return update(env,row,t,'finalize',ctx);
   }
   return fail('Route nicht vorhanden.',404);
  }
  if(!env.ASSETS)return fail('Website nicht verbunden.',503);
  if(path==='/admin.html'||path==='/setup.html'){
    const response=await env.ASSETS.fetch(req);const headers=new Headers(response.headers);
    headers.set('cache-control','no-store');headers.set('x-robots-tag','noindex');headers.set('content-security-policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");return new Response(response.body,{status:response.status,headers});
  }
  return env.ASSETS.fetch(req);
 }catch(error){if(error instanceof SyntaxError)return fail('Ungültiges JSON.',400);if(/^(Eingabe|Jahr|Rundenzahl|Spieler|Punkte|Jeder|Alle Runden)/.test(error.message))return fail(error.message,400);console.error('Request failed',error);return fail('Serverfehler. Bitte später erneut versuchen.',503);}
}};
