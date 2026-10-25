export const DEFAULT_PLAYERS = ['Mike','Keel','Tobi','Echse','Chopfi','Schnarre','Mänu','Bröne','Fösu','Reti'];
export const DEFAULT_POINTS = [10,8,6,5,4,3,2,1,0,0];
export function freshTournament(year=2026) {
  return {year, status:'planned', players:DEFAULT_PLAYERS.slice(), roundCount:8,
    points:DEFAULT_POINTS.slice(), rounds:{}, published:{}, final:null};
}
export function validateConfig(input) {
  const year=Number(input.year), roundCount=Number(input.roundCount), players=input.players, points=input.points;
  if(!Number.isInteger(year)||year<2026||year>2100)throw Error('Jahr ungültig.');
  if(!Number.isInteger(roundCount)||roundCount<1||roundCount>30)throw Error('Rundenzahl muss zwischen 1 und 30 liegen.');
  if(!Array.isArray(players)||players.length<2||players.length>20||players.some(x=>typeof x!=='string'||x.trim()!==x||x.length<1||x.length>40)||new Set(players.map(x=>x.toLocaleLowerCase('de-CH'))).size!==players.length)throw Error('Spieler müssen eindeutig sein (2–20).');
  if(!Array.isArray(points)||points.length!==players.length||points.some(x=>!Number.isInteger(x)||x<0||x>1000))throw Error('Punkte pro Platz ungültig.');
  return {year,roundCount,players,points};
}
export function validatePlaces(places,config) {
  if(!Array.isArray(places)||places.length!==config.players.length||places.some(x=>typeof x!=='string')||new Set(places).size!==places.length||places.some(x=>!config.players.includes(x)))throw Error('Jeder Teilnehmer muss genau einmal platziert werden.');
  return places;
}
// Preserve the exact official rank and points of historical corrected rounds.
// Earlier tournaments store a string array; corrected 2026 rounds 6 and 7
// store {player, place, points} so joint ranks are not overwritten by index.
export function roundResults(t,raw) {
 if(!Array.isArray(raw))throw Error('Ungültige veröffentlichte Runde.');
 return raw.map((item,index)=>{
  const legacy=typeof item==='string';
  const player=legacy?item:item?.player;
  const place=legacy?index+1:Number(item?.place);
  const points=legacy?Number(t.points[index]):Number(item?.points);
  if(!t.players.includes(player)||!Number.isInteger(place)||place<1||place>t.players.length||!Number.isFinite(points))throw Error('Historische Rundendaten stimmen nicht mit der Konfiguration überein.');
  return {player,place,points};
 });
}
export function standings(t,through=t.roundCount) {
 const previous=through>1?standings(t,through-1):[];
 const rows=t.players.map(player=>({player,points:0,wins:0,podiums:0,played:0,places:[]}));
 for(let i=1;i<=Math.min(through,t.roundCount);i++){
  const published=t.published[i];if(!published)continue;
  for(const result of roundResults(t,published)){
   const r=rows.find(x=>x.player===result.player);
   r.points+=result.points;
   r.wins+=Number(result.place===1);
   r.podiums+=Number(result.place<=3);
   r.played++;
   r.places.push(result.place);
  }
 }
 rows.sort((a,b)=>b.points-a.points||b.wins-a.wins||a.player.localeCompare(b.player,'de-CH'));
 return rows.map((r,i)=>({...r,rank:i+1,gap:rows[0].points-r.points,movement:previous.length?previous.find(x=>x.player===r.player).rank-(i+1):0}));
}
export function publicSnapshot(t,updatedAt) {
 const rounds=Array.from({length:t.roundCount},(_,i)=>{
  const published=t.published[i+1];if(!published)return null;
  const results=roundResults(t,published);
  return {number:i+1,winner:results.find(x=>x.place===1)?.player||results[0]?.player||null,results};
 }).filter(Boolean);
 const board=standings(t);
 return {status:t.status==='final'?'final':rounds.length?'live':'planned',year:t.year,players:t.players,round_count:t.roundCount,scoring:t.points,rounds,latest_round:rounds.at(-1)?.number||0,standings:board,leaders:board.filter(x=>x.points===board[0]?.points).map(x=>x.player),updated_at:updatedAt,final:t.final};
}
export function finalizedEdition(t) {
 if(Object.keys(t.published).length!==t.roundCount)throw Error('Alle Runden müssen veröffentlicht sein.');
 const board=standings(t);
 return {year:t.year,status:'HISTORICAL_REAL',source:'Bärgsunne Poker Live – vom Owner bestätigte Schlussrangliste',location:'Bärgsunne',players:t.players,round_count:t.roundCount,scoring:{name:'Originalpunktzahl',points_by_place:t.points},rounds:Array.from({length:t.roundCount},(_,i)=>({number:i+1,results:roundResults(t,t.published[i+1]).map(x=>({player_id:x.player,points:x.points,place:x.place}))})),official_standings:board.map(x=>({player_id:x.player,points:x.points,place:x.rank}))};
}
