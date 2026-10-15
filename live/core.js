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
export function standings(t,through=t.roundCount) {
  const previous=through>1?standings(t,through-1):[];
  const rows=t.players.map(player=>({player,points:0,wins:0,podiums:0,played:0,places:[]}));
  for(let i=1;i<=Math.min(through,t.roundCount);i++) {
    const places=t.published[i]; if(!places)continue;
    places.forEach((player,index)=>{const r=rows.find(x=>x.player===player);r.points+=t.points[index];r.wins+=Number(index===0);r.podiums+=Number(index<3);r.played++;r.places.push(index+1);});
  }
  rows.sort((a,b)=>b.points-a.points||b.wins-a.wins||a.player.localeCompare(b.player,'de-CH'));
  return rows.map((r,i)=>({...r,rank:i+1,gap:rows[0].points-r.points, movement:previous.length?previous.find(x=>x.player===r.player).rank-(i+1):0}));
}
export function publicSnapshot(t,updatedAt) {
  const rounds=Array.from({length:t.roundCount},(_,i)=>t.published[i+1]?{number:i+1,winner:t.published[i+1][0],results:t.published[i+1].map((player,j)=>({player,place:j+1,points:t.points[j]}))}:null).filter(Boolean);
  const board=standings(t);
  return {status:t.status==='final'?'final':rounds.length?'live':'planned',year:t.year,players:t.players,round_count:t.roundCount,scoring:t.points,rounds,latest_round:rounds.at(-1)?.number||0,standings:board,leaders:board.filter(x=>x.points===board[0]?.points).map(x=>x.player),updated_at:updatedAt,final:t.final};
}
export function finalizedEdition(t) {
  if(Object.keys(t.published).length!==t.roundCount)throw Error('Alle Runden müssen veröffentlicht sein.');
  const board=standings(t);
  return {year:t.year,status:'HISTORICAL_REAL',source:'Bärgsunne Poker Live – vom Owner bestätigte Schlussrangliste',location:'Bärgsunne',players:t.players,round_count:t.roundCount,scoring:{name:'Originalpunktzahl',points_by_place:t.points},rounds:Array.from({length:t.roundCount},(_,i)=>({number:i+1,results:t.published[i+1].map((player,j)=>({player_id:player,points:t.points[j],place:j+1}))})),official_standings:board.map(x=>({player_id:x.player,points:x.points,place:x.rank}))};
}
