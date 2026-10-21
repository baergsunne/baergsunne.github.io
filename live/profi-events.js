// Optional SQLite-backed Durable Object for hibernatable spectator WebSockets.
// Access is exclusively through the authenticated Worker entry point.
// No setInterval/setTimeout: idle rooms can hibernate without duration billing.
export class ProfiEvents {
 constructor(ctx,env){this.ctx=ctx;this.env=env;}
 async fetch(request){
  const path=new URL(request.url).pathname;
  if(path==='/join'){
   if(request.headers.get('upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket required',{status:426});
   if(this.ctx.getWebSockets().length>=64)return new Response('Viewer limit reached',{status:429});
   const pair=new WebSocketPair(),[client,server]=Object.values(pair);
   this.ctx.acceptWebSocket(server);
   return new Response(null,{status:101,webSocket:client,headers:{'sec-websocket-protocol':'bp-viewer'}});
  }
  if(path==='/notify'&&request.method==='POST'){
   const info=await request.json();
   const payload=JSON.stringify({event:'update',revision:info.revision});
   for(const socket of this.ctx.getWebSockets()){
    try{socket.send(payload);}catch{try{socket.close(1011,'Connection unavailable');}catch{}}
   }
   if(info.action==='revoke'||info.action==='cancel'||info.action==='finish'){
    for(const socket of this.ctx.getWebSockets())try{socket.close(1000,'Viewer session ended');}catch{}
   }
   return new Response(null,{status:204});
  }
  return new Response('Not found',{status:404});
 }
 // Viewer connections are strictly read-only; messages cannot change state.
 webSocketMessage(socket,message){try{socket.close(1008,'Read-only spectators');}catch{}}
 webSocketClose(socket,code,reason){try{socket.close(code,reason);}catch{}}
 webSocketError(socket){try{socket.close(1011,'Connection failure');}catch{}}
}
