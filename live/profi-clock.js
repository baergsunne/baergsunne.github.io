// Browser-side projection of the server-authoritative level clock.
// This calculates countdowns locally, including level/break transitions, without requests per second.
export function projectLiveClock(snapshot, now=Date.now()) {
  if (!snapshot || !Array.isArray(snapshot.levels) || !snapshot.levels.length) throw Error('Blindstruktur fehlt.');
  let index=snapshot.index, remainingMs=snapshot.remainingMs, running=!!snapshot.running;
  if (!Number.isInteger(index) || index<0 || index>=snapshot.levels.length) throw Error('Blindlevel ungültig.');
  if (running && Number.isFinite(snapshot.deadline)) {
    remainingMs=snapshot.deadline-now;
    while (remainingMs<=0 && index<snapshot.levels.length-1) {
      index+=1;
      remainingMs+=snapshot.levels[index].minutes*60000;
    }
    if (remainingMs<=0) {remainingMs=0;running=false;}
  }
  return {index,remainingMs:Math.max(0,Math.ceil(remainingMs)),running,
    current:snapshot.levels[index],next:snapshot.levels[index+1]||null};
}
export function formatLiveClock(milliseconds) {
  const secs=Math.max(0,Math.ceil(milliseconds/1000));
  return String(Math.floor(secs/60)).padStart(2,'0')+':'+String(secs%60).padStart(2,'0');
}
