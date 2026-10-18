/* Bärgsunne Poker – read-only archive integrity audit.
   Run in browser console: await import('./tests/statistics-audit.js')
   No modifications are made to tournaments or cloud data. */
(function () {
  'use strict';
  const data=window.POKER_SEED;
  const failures=[];
  const assert=(condition,message)=>{if(!condition)failures.push(message)};
  assert(!!data&&Array.isArray(data.editions),'Archive unavailable');
  if(!data?.editions) return;
  assert(data.editions.some(e=>e.year===2021),'2021 tournament must exist');
  const seenYears=new Set();
  for(const e of data.editions){
    assert(!seenYears.has(e.year),'Duplicate year '+e.year);
    seenYears.add(e.year);
    const players=new Set(e.players);
    const standings=new Map(e.official_standings.map(s=>[s.player_id,s]));
    assert(players.size===e.players.length,'Duplicate player in '+e.year);
    assert(standings.size===players.size,'Incorrect standings count '+e.year);
    assert(e.rounds.length===e.round_count,'Incorrect round count '+e.year);
    const totals=new Map(e.players.map(p=>[p,0]));
    const rounds=new Set();
    for(const r of e.rounds){
      assert(!rounds.has(r.number),'Duplicate round '+e.year+'/'+r.number);
      rounds.add(r.number);
      const seen=new Set();
      for(const x of r.results){
        assert(players.has(x.player_id),'Unknown player '+e.year+'/'+r.number+'/'+x.player_id);
        assert(!seen.has(x.player_id),'Duplicate result '+e.year+'/'+r.number+'/'+x.player_id);
        seen.add(x.player_id);
        assert(Number.isFinite(x.points)&&Number.isInteger(x.place),'Invalid round result '+e.year+'/'+r.number);
        totals.set(x.player_id,(totals.get(x.player_id)||0)+x.points);
      }
      assert(seen.size===players.size,'Missing round players '+e.year+'/'+r.number);
    }
    for(const p of players){
      const st=standings.get(p);
      assert(!!st,'Missing final placement '+e.year+'/'+p);
      if(st)assert(totals.get(p)===st.points,'Point mismatch '+e.year+'/'+p);
    }
  }
  const e2026=data.editions.find(e=>e.year===2026);
  if(e2026){
    const expected=[['Frauchi',1,50],['König',2,39],['Mike',3,29],['Schnarre',4,28],['Bröne',5,27],['Keel',6,26],['Niko',7,23],['Mänu',8,20],['Chopfi',9,17],['Fösu',10,11]];
    for(const [p,place,points] of expected){
      const st=e2026.official_standings.find(s=>s.player_id===p);
      assert(st?.place===place&&st?.points===points,'2026 mismatch '+p);
    }
  }else failures.push('2026 not loaded – run after the archive API responds');
  window.BAERGSUNNE_STATISTICS_AUDIT={passed:failures.length===0,failures,years:data.editions.length,rounds:data.editions.reduce((n,e)=>n+e.round_count,0)};
  console.table(window.BAERGSUNNE_STATISTICS_AUDIT);
})();