'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const script=fs.readFileSync('admin-return.js','utf8'),target='https://baergsunne-nav-work10-20261015.baergsunne-poker-2026.workers.dev/#live';
function boot(search){const events={},link={dataset:{},href:'./#live',setAttribute(k,v){this[k]=v}};const ctx={document:{querySelector:()=>link},location:{search},URLSearchParams,window:{addEventListener:(n,f)=>events[n]=f}};vm.runInNewContext(script,ctx);return {link,ctx,events};}
assert.equal(boot('?return=nav-work10').link.href,target);
for(const query of ['', '?return=', '?return=https://evil.example/', '?return=//evil.example/', '?return=javascript:alert(1)', '?return=nav-work10.evil.example', '?return=__proto__', '?return=nav-work10&return=https://evil.example/', '?return=%00nav-work10'])assert.equal(boot(query).link.href,'./#live',query);
for(const state of ['logged-out','logged-in','logged-out-again']){const x=boot('?return=nav-work10');x.ctx.loginState=state;x.events.pageshow({persisted:true});assert.equal(x.link.href,target);assert.equal(x.link.referrerPolicy,'no-referrer');}
const fallback=boot('?return=nav-work10');fallback.ctx.location.search='';fallback.events.pageshow({persisted:true});assert.equal(fallback.link.href,'./#live');
const admin=fs.readFileSync('admin.html','utf8');assert.match(admin,/admin-return.js/);assert.match(admin,/href="\.\/#live"/);assert.doesNotMatch(script,/sessionStorage|localStorage|fetch\(|authorization|password|token\s*=/i);
assert.match(fs.readFileSync('live/build.mjs','utf8'),/'mobile-bottomnav.js'/);assert.match(fs.readFileSync('live/build.mjs','utf8'),/'mobile-bottomnav.css'/);assert.match(fs.readFileSync('live/build.mjs','utf8'),/'admin-return.js'/);
console.log('PASS fixed admin return: exact allowlist, default and invalid targets, repeated parameters, BFCache/pageshow, login-state independence, no credentials/storage/network, required build assets.');
