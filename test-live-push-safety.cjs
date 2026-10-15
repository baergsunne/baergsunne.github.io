// Regression guard for live publishing: run with node --test test-live-push-safety.cjs
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const source=fs.readFileSync('live/worker.js','utf8');
test('never await optional live notification during authentication or publishing',()=>{
 assert.match(source,/ctx\.waitUntil\(/);
 assert.match(source,/\.catch\(error\s*=>\s*console\.error\('Optional live notification failed'/);
 assert.doesNotMatch(source,/await\s+env\.LIVE_EVENTS/);
});
test('notify only after committed D1 update',()=>{
 const body=source.slice(source.indexOf('async function update('),source.indexOf('\nexport default'));
 assert.ok(body.indexOf('result.meta.changes!==1')>=0);
 assert.ok(body.indexOf('ctx.waitUntil(')>body.indexOf('result.meta.changes!==1'));
 assert.match(body,/publish\|withdraw\|finalize/);
 assert.doesNotMatch(body,/draft\|/);
});
test('existing login handler remains present',()=>{
 assert.match(source,/\/api\/login/);
 assert.match(source,/\/api\/admin\/state/);
});
