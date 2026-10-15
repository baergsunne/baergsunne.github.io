'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync(process.env.BP_NAV_SCRIPT||'mobile-bottomnav.js','utf8');
const events={},docEvents={},mediaEvents={},classes=new Set(),frames=[];
const media={matches:true,addEventListener:(n,f)=>mediaEvents[n]=f};
const document={body:{classList:{add:n=>classes.add(n),remove:n=>classes.delete(n)}},documentElement:{scrollHeight:3000},activeElement:null,addEventListener:(n,f)=>docEvents[n]=f};
const window={scrollY:0,innerHeight:812,matchMedia:()=>media,addEventListener:(n,f,o)=>{events[n]=f;if(n==='scroll')assert.equal(o.passive,true);}};
vm.runInNewContext(code,{window,document,requestAnimationFrame:f=>frames.push(f),Math});
const hidden=()=>classes.has('bp-bottomnav-hidden');
function scroll(y){window.scrollY=y;events.scroll();while(frames.length)frames.shift()();}
function target(kind,keyboard=false){return {closest:s=>s.includes(kind)?{}:null,matches:s=>s===':focus-visible'&&keyboard};}
scroll(100);assert(hidden());scroll(90);assert(!hidden());
scroll(100);assert(hidden());events.hashchange();assert(!hidden());
scroll(102);scroll(104);scroll(106);scroll(108);assert(hidden(),'slow touch-sized increments must accumulate');
scroll(106);scroll(104);scroll(102);scroll(100);assert(!hidden());
scroll(120);assert(hidden());scroll(120);assert(hidden(),'horizontal-only table scroll must not reveal nav');
events.popstate();assert(!hidden());scroll(160);assert(hidden());events.pageshow();assert(!hidden());
scroll(180);assert(hidden());docEvents.click({target:target('.bottomnav')});assert(!hidden());
document.activeElement=target('.bottomnav',false);scroll(210);assert(hidden(),'touch click focus must not pin nav');
docEvents.keydown({key:'Tab'});assert(!hidden(),'Tab must make the navigation reachable');
document.activeElement=target('input');docEvents.focusin({target:document.activeElement});assert(!hidden());scroll(400);assert(!hidden(),'editing must keep navigation available');
document.activeElement=target('.bottomnav',true);scroll(500);assert(!hidden(),'keyboard navigation focus must remain visible');
document.activeElement=null;scroll(530);assert(hidden());scroll(0);assert(!hidden());scroll(-35);assert(!hidden(),'top rubber band must stay visible');
scroll(2188);assert(hidden());scroll(2250);scroll(2195);assert(hidden(),'bottom rubber band must not reverse direction');
media.matches=false;events.resize();scroll(500);assert(!hidden(),'desktop must stay unchanged');media.matches=true;mediaEvents.change();assert(!hidden());
const css=fs.readFileSync('mobile-bottomnav.css','utf8');assert.match(css,/env\(safe-area-inset-bottom\)/);assert.match(css,/prefers-reduced-motion:reduce/);assert.match(css,/transition:\s*none\s*!important/);assert.doesNotMatch(css,/font-size|\.bottomitem|\.bp-icon/);
console.log('PASS mobile navigation: slow/fast scroll, direction, top/bottom overscroll, horizontal tables, routes, resize, touch focus, keyboard/editing, safe-area and reduced-motion CSS guards.');
