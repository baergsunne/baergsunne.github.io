const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dir=__dirname,div={innerHTML:''};
const doc={title:'',querySelector(q){return q==='#app'?div:null},getElementById(id){return null},addEventListener(){},createElement(){return {click(){},remove(){},set href(x){},set download(x){}}},body:{append(){}}};
const store=new Map(),localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
const ctx={window:{POKER_SEED:null,scrollTo(){},addEventListener(){}},document:doc,localStorage,location:{hash:''},history:{replaceState(){}},console,confirm(){return false},alert(){},setTimeout,URL,Blob};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(dir,'data.js'),'utf8'),ctx);vm.runInContext(fs.readFileSync(path.join(dir,'app.js'),'utf8'),ctx);
function action(name,value){vm.runInContext(`onAction(${JSON.stringify(name)},{dataset:{value:${JSON.stringify(value)}}})`,ctx)}
function assertView(key,text){assert.ok(div.innerHTML.includes(text),`${key}: Missing ${text}`);console.log('PASS',key,'html',div.innerHTML.length)}
assertView('home','VERSION 1.4.3');assertView('hall of champions','champ-tile');
action('go','stats');action('tab','rounds');assertView('legend styled','bp-series-legend');assertView('legend interactive','toggleseries');assert.ok(div.innerHTML.match(/display:grid;grid-template-columns:repeat\(auto-fit/));
action('toggleseries','Mike');assertView('toggle player','is-muted');
action('openyears');assertView('year picker','Jahrgänge auswählen');assertView('multiple 2019','data-value="2019"');action('toggleyear','2019');action('toggleyear','2022');assertView('year chips','2019 ×');assertView('year chips','2022 ×');action('closemodal');action('openplayers');action('toggle','Fösu');action('toggle','Mänu');assertView('player chips','Fösu ×');action('closemodal');action('go','live');assertView('live title','Bärgsunne Poker 2026');action('go','admin');assertView('admin accessible','Admin-Cockpit öffnen');
console.log('PASS all UI simulation checks');
