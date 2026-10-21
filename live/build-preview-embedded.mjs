import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import crypto from 'node:crypto';

// The connector accepts a module upload but not a static-assets upload session.
// Package the already-built text assets into one preview-only Worker module.
// Existing WebP files are fetched from their unchanged GitHub Pages URLs.
const root=process.cwd(),dist=path.join(root,'dist-live'),assets={};
const mime={'.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.html':'text/html; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'};
function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,ent.name);if(ent.isDirectory())walk(full);else if(!full.endsWith('.webp')){const url='/'+path.relative(dist,full).replaceAll(path.sep,'/');assets[url]={data:zlib.gzipSync(fs.readFileSync(full)).toString('base64'),type:mime[path.extname(full)]||'application/octet-stream'};}}}
walk(dist);
const assetCode=`const embeddedAssets={async fetch(req){const u=new URL(req.url);let key=u.pathname==='/'?'/index.html':u.pathname;if(key==='')key='/index.html';const a=EMBEDDED_ASSETS[key];if(a){const bytes=Uint8Array.from(atob(a.data),c=>c.charCodeAt(0));const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));return new Response(stream,{headers:{'content-type':a.type,'cache-control':'no-store','x-content-type-options':'nosniff'}});}if(['/assets/alpine-hero.webp','/assets/logo-premium.webp','/assets/trophy-premium.webp'].includes(key)){const external=await fetch('https://baergsunne.github.io'+key);if(external.ok)return new Response(external.body,{headers:{'content-type':'image/webp','cache-control':'public, max-age=3600'}});}return new Response('Not found',{status:404});}};const EMBEDDED_ASSETS=${JSON.stringify(assets)};\n`;
const core=fs.readFileSync(path.join(root,'live/core.js'),'utf8').replace(/^export /gm,'');
const profiCore=fs.readFileSync(path.join(root,'live/profi-core.js'),'utf8').replace(/^export /gm,'');
const profiApi=fs.readFileSync(path.join(root,'live/profi-api.js'),'utf8').replace(/^import .*?;\n/gm,'').replace(/^export /gm,'');
const profiEmbedded='const {handleProfi} = (() => {\n'+profiCore+'\n'+profiApi+'\nreturn {handleProfi};\n})();\n';
let worker=fs.readFileSync(path.join(root,'live/worker.js'),'utf8').replace(/^import .*?;\n/gm,'').replace("if(!env.ASSETS)return fail('Website nicht verbunden.',503);",'const assetStore=env.ASSETS||embeddedAssets;').replaceAll('env.ASSETS.fetch(req)','assetStore.fetch(req)');
const profiEvents=fs.readFileSync(path.join(root,'live/profi-events.js'),'utf8').replace(/^export /gm,'');
const code=assetCode+core+'\n'+profiEmbedded+'\n'+profiEvents+'\n'+worker;
const out=path.join(root,'dist-live-preview-worker.mjs');fs.writeFileSync(out,code);
console.log(JSON.stringify({path:out,bytes:Buffer.byteLength(code),sha256:crypto.createHash('sha256').update(code).digest('hex'),assets:Object.keys(assets).length}));
