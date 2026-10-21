import test from 'node:test';
import assert from 'node:assert/strict';
import {ProfiEvents} from './profi-events.js';

test('hibernation room broadcasts committed revision changes to spectators without any incoming write handler',async()=>{
 const outgoing=[],closed=[];
 const sockets=Array.from({length:4},(_,i)=>({
  send:message=>outgoing.push([i,JSON.parse(message)]),
  close:(code,reason)=>closed.push({i,code,reason})
 }));
 const room=new ProfiEvents({getWebSockets:()=>sockets},{});
 const r=await room.fetch(new Request('https://profi.internal/notify',{method:'POST',body:JSON.stringify({revision:7,action:'out'})}));
 assert.equal(r.status,204);
 assert.equal(outgoing.length,4);
 assert.deepEqual(outgoing[0][1],{event:'update',revision:7});
 assert.equal(closed.length,0);
 const done=await room.fetch(new Request('https://profi.internal/notify',{method:'POST',body:JSON.stringify({revision:8,action:'cancel'})}));
 assert.equal(done.status,204);
 assert.equal(closed.length,4);
});
test('read-only viewer sends cannot mutate room',()=>{
 const closed=[];
 const room=new ProfiEvents({getWebSockets:()=>[]},{});
 room.webSocketMessage({close:(...args)=>closed.push(args)},JSON.stringify({action:'publish'}));
 assert.equal(closed[0][0],1008);
});
test('viewer sessions are bounded per room',async()=>{
 const room=new ProfiEvents({getWebSockets:()=>Array.from({length:64},()=>({}))},{});
 const response=await room.fetch(new Request('https://profi.internal/join',{headers:{upgrade:'websocket'}}));
 assert.equal(response.status,429);
});
