// Isolated professional poker timer domain logic. No official championship writes.
const MAX_PLAYERS=20;
const DEFAULT_LEVELS=[
 {sb:25,bb:50,ante:0,minutes:15},{sb:50,bb:100,ante:0,minutes:15},
 {sb:75,bb:150,ante:0,minutes:15},{sb:100,bb:200,ante:0,minutes:15},
 {sb:150,bb:300,ante:0,minutes:15},{sb:200,bb:400,ante:0,minutes:15},
 {sb:0,bb:0,ante:0,minutes:10,break:true},{sb:300,bb:600,ante:0,minutes:15},
 {sb:400,bb:800,ante:0,minutes:15},{sb:600,bb:1200,ante:0,minutes:15},
 {sb:800,bb:1600,ante:0,minutes:15},{sb:1000,bb:2000,ante:0,minutes:15},
 {sb:1500,bb:3000,ante:0,minutes:15},{sb:2000,bb:4000,ante:0,minutes:15},
 {sb:3000,bb:6000,ante:0,minutes:15},{sb:4000,bb:8000,ante:0,minutes:15}
];
const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
export function validNames(names){
 if(!Array.isArray(names)||names.length<2||names.length>MAX_PLAYERS
 ||names.some(n=>typeof n!=='string'||n!==n.trim()||n.length<1||n.length>40)
 ||new Set(names.map(n=>n.toLocaleLowerCase('de-CH'))).size!==names.length)throw Error('2 bis 20 verschiedene Spielernamen erforderlich.');
 return names;
}
export function validLevels(levels){
 if(!Array.isArray(levels)||levels.length<1||levels.length>40)throw Error('Blindstruktur ungültig.');
 return levels.map((l,i)=>{
  if(!l||typeof l!=='object'||!integer(l.minutes,1,120))throw Error('Leveldauer ungültig.');
  if(l.break===true)return {break:true,minutes:l.minutes,sb:0,bb:0,ante:0};
  if(!integer(l.sb,1,100000000)||!integer(l.bb,l.sb,100000000)||!integer(l.ante||0,0,100000000))throw Error('Blinds/Ante ungültig.');
  return {sb:l.sb,bb:l.bb,ante:l.ante||0,minutes:l.minutes,break:false};
 });
}
export function makeTournament({id,mode,title,names,year=null,round=null,stack=5000,rebuyStack=5000,addonStack=5000,levels=DEFAULT_LEVELS},now=Date.now()){
 if(!/^[a-f0-9]{32}$/.test(id)||!['official','free'].includes(mode))throw Error('Turnierart ungültig.');
 validNames(names);validLevels(levels);
 if(typeof title!=='string'||title.length<1||title.length>90)throw Error('Turniername ungültig.');
 if(!integer(stack,1,100000000)||!integer(rebuyStack,1,100000000)||!integer(addonStack,1,100000000))throw Error('Chipstack ungültig.');
 if(mode==='official'&&(!integer(year,2026,2100)||!integer(round,1,30)))throw Error('Offizielle Runde ungültig.');
 return {id,mode,title,names:[...names],year:mode==='official'?year:null,round:mode==='official'?round:null,
  stack,rebuyStack,addonStack,levels:validLevels(levels),events:[],status:'setup',viewerVersion:1,
  clock:{index:0,remainingMs:levels[0].minutes*60000,deadline:null,running:false},
  createdAt:now,updatedAt:now};
}
export function ranking(doc){
 const map=new Map(doc.names.map(name=>[name,{name,active:true,rebuys:0,addons:0}]));
 const eliminated=[];
 for(const e of doc.events){
  const p=map.get(e.name);if(!p)throw Error('Ungültiger Spielerverlauf.');
  if(e.type==='out'){p.active=false;eliminated.push(p.name)}
  if(e.type==='rebuy'){p.active=true;p.rebuys++;const ix=eliminated.lastIndexOf(p.name);if(ix!==-1)eliminated.splice(ix,1)}
  if(e.type==='addon')p.addons++;
 }
 const players=[...map.values()],active=players.filter(p=>p.active);
 const rebuys=players.reduce((n,p)=>n+p.rebuys,0),addons=players.reduce((n,p)=>n+p.addons,0);
 const totalChips=doc.names.length*doc.stack+rebuys*doc.rebuyStack+addons*doc.addonStack;
 const places=active.length===1&&eliminated.length===players.length-1?[active[0].name,...eliminated.reverse()]:null;
 return {players,activeCount:active.length,totalCount:players.length,rebuys,addons,totalChips,
  averageStack:active.length?Math.round(totalChips/active.length):0,places};
}
export function clockAt(doc,now=Date.now()){
 const c={...doc.clock};if(!c.running||!Number.isFinite(c.deadline))return c;
 let left=c.deadline-now;
 while(left<=0 && c.index<doc.levels.length-1){
  c.index++;left+=doc.levels[c.index].minutes*60000;
 }
 if(left<=0){c.remainingMs=0;c.running=false;c.deadline=null;return c}
 c.remainingMs=Math.ceil(left);c.deadline=now+left;return c;
}
export function change(doc,action,data={},now=Date.now()){
 const d={...doc,events:[...doc.events],clock:clockAt(doc,now)};
 if(action==='start'){
  if(d.status!=='setup')throw Error('Turnier bereits gestartet.');
  d.status='live';d.clock.running=true;d.clock.deadline=now+d.clock.remainingMs;
 }else if(['pause','resume','next','previous'].includes(action)){
  if(d.status!=='live')throw Error('Turnier nicht aktiv.');
  if(action==='pause'){d.clock.running=false;d.clock.deadline=null}
  if(action==='resume'){d.clock.running=true;d.clock.deadline=now+d.clock.remainingMs}
  if(action==='next'||action==='previous'){
   d.clock.index=Math.max(0,Math.min(d.levels.length-1,d.clock.index+(action==='next'?1:-1)));
   d.clock.remainingMs=d.levels[d.clock.index].minutes*60000;
   d.clock.deadline=d.clock.running?now+d.clock.remainingMs:null;
  }
 }else if(['out','rebuy','addon'].includes(action)){
  if(d.status!=='live')throw Error('Turnier nicht aktiv.');
  const person=ranking(d).players.find(p=>p.name===data.name);
  if(!person)throw Error('Spieler nicht gefunden.');
  if(action==='out'&&!person.active)throw Error('Spieler bereits ausgeschieden.');
  if(action==='rebuy'&&!d.rebuysAllowed&&d.rebuysAllowed!==undefined)throw Error('Rebuy nicht erlaubt.');
  if(action==='addon'&&!person.active)throw Error('Ausgeschiedener Spieler.');
  if(action==='out'&&ranking(d).activeCount===1)throw Error('Turnier bereits entschieden.');
  d.events.push({type:action,name:person.name,at:now});
 }else if(action==='undo'){
  if(d.status!=='live'||!d.events.length)throw Error('Keine Aktion rückgängig zu machen.');
  d.events.pop();
 }else if(action==='finish'){
  if(d.status!=='live'||!ranking(d).places)throw Error('Ergebnis noch nicht vollständig.');
  d.status='finished';d.clock.running=false;d.clock.deadline=null;
 }else if(action==='revoke'){
  if(!integer(d.viewerVersion,1,10000000))throw Error('Zuschauerzugang ungültig.');
  d.viewerVersion++;
 }else throw Error('Aktion unbekannt.');
 d.updatedAt=now;return d;
}
export function viewerSnapshot(d,now=Date.now()){
 const r=ranking(d),clock=clockAt(d,now);
 return {id:d.id,title:d.title,status:d.status,serverTime:now,
  levels:d.levels,index:clock.index,running:clock.running,
  remainingMs:clock.remainingMs,deadline:clock.deadline,
  players:r.players,activeCount:r.activeCount,totalCount:r.totalCount,
  totalChips:r.totalChips,averageStack:r.averageStack,rebuys:r.rebuys,addons:r.addons,
  places:d.status==='finished'?r.places:null,events:d.events.slice(-100).map(e=>({type:e.type,name:e.name,at:e.at}))};
}
