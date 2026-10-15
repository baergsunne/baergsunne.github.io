// Durable Object: zero polling. Idle sockets hibernate on Cloudflare.
// Messages carry only revision hints, never credentials or player data.
export class LiveEventHub {
  constructor(state) { this.state = state; }
  async fetch(request) {
    if (request.method === 'POST') {
      const payload = await request.json();
      if (!['publish','withdraw','finalize'].includes(payload.action)) return new Response('invalid action', {status:400});
      const message = JSON.stringify({type:'live-changed',year:payload.year,revision:payload.revision,action:payload.action});
      for (const socket of this.state.getWebSockets()) {
        try { socket.send(message); if (payload.action === 'finalize') socket.close(1000,'Turnier abgeschlossen'); } catch {}
      }
      return new Response(null,{status:204});
    }
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Upgrade required',{status:426});
    const pair = new WebSocketPair();
    this.state.acceptWebSocket(pair[1]);
    return new Response(null,{status:101,webSocket:pair[0]});
  }
  webSocketMessage(socket, message) { /* No client commands; read-only subscription. */ }
  webSocketClose() {}
  webSocketError() {}
}
