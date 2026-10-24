/* Bärgsunne Poker: einheitliche historische Runden-Schlusslichtwertung.
   Die Rohdaten (Rang/Punkte) werden niemals verändert. Punkte können früher
   auch am letzten Platz positiv gewesen sein. Identische niedrigste Punkte
   begründen gemeinsame letzte Plätze; Ausscheidungsreihenfolge unbekannt. */
(function(root){
 'use strict';
 const scores=round=>Array.isArray(round?.results)?round.results.map(x=>Number(x?.points)).filter(Number.isFinite):[];
 function lowestPoints(round){const a=scores(round);return a.length?Math.min(...a):null;}
 function isLast(result,round){
  const floor=lowestPoints(round),value=Number(result?.points);
  return floor!==null&&result!=null&&Number.isFinite(value)&&value===floor;
 }
 function isZero(result){return result!=null&&Number(result.points)===0;}
 function isBottomN(result,round,count){
  if(!result||!Array.isArray(round?.results)||!Number.isInteger(count)||count<1)return false;
  const v=Number(result.points);
  if(!Number.isFinite(v))return false;
  // Ausgeschiedene mit gleichen Punkten teilen die unterste Gruppe.
  // Ranggruppe zählt von hinten: 3 Nuller gehören alle zum letzten Platz;
  // kein fiktiver 9./10. Platz wird daraus abgeleitet.
  const below=round.results.filter(x=>Number.isFinite(Number(x.points))&&Number(x.points)<v).length;
  return below<count;
 }
 function effectivePlace(result,round){
  if(!result)return null;
  return isLast(result,round)?round.results.length:Number(result.place);
 }
 function lastPlayers(round){return (round?.results||[]).filter(x=>isLast(x,round)).map(x=>x.player_id);}
 root.BaergsunneRoundPlacement=Object.freeze({lowestPoints,isLast,isZero,isBottomN,effectivePlace,lastPlayers});
})(window);
