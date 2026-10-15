'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const events={};const context={document:{readyState:'loading',addEventListener:(name,fn)=>events[name]=fn},MutationObserver:class{observe(){}},console};context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync('championship-live.js','utf8'),context);
const ui=context.BAERGSUNNE_CHAMPIONSHIP;
const d={year:2026,status:'live',players:['Zed','Ada','Ben'],round_count:3,scoring:[10,8,6],updated_at:'2026-10-15T12:00:00Z',rounds:[
 {number:1,winner:'Zed',results:[{player:'Zed',place:1,points:10},{player:'Ada',place:2,points:8},{player:'Ben',place:3,points:6}]},
 {number:2,winner:'Ada',results:[{player:'Ada',place:1,points:10},{player:'Ben',place:2,points:8},{player:'Zed',place:3,points:6}]}
],standings:[{player:'Ada',points:18,wins:1,rank:1},{player:'Zed',points:16,wins:1,rank:2},{player:'Ben',points:14,wins:0,rank:3}]};
const html=ui.render(d);assert.match(html,/Championship Live/);assert.match(html,/Ada.*18 Punkte/);assert.match(html,/Runde 2 · Sieger: Ada/);assert.match(html,/data-cl-series="Ben"/);assert.match(html,/Zum Live-Simulator/);
assert.equal(ui.trends(d).Ada,1);assert.equal(ui.trends(d).Zed,-1);
const draft={...d,rounds:d.rounds.slice(0,1),standings:[{player:'Zed',points:10,wins:1,rank:1},{player:'Ada',points:8,wins:0,rank:2},{player:'Ben',points:6,wins:0,rank:3}]};assert.doesNotMatch(ui.render(draft),/Runde 2 · Sieger:/);assert.match(ui.render({...d,status:'final'}),/ABGESCHLOSSEN/);
console.log('PASS Championship Live: leader, round chronology, chart, tie-break movements, published-only data, final status');
