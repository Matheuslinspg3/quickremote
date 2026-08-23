// Durable Object para gerenciar sessões WebSocket
export class SessionManager {
  constructor(state, env) {
    this.state = state;
    this.sessions = new Map(); // hostId -> host WebSocket
    this.clients = new Map(); // sessionId -> {host, client}
  }

  async fetch(request) {
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    this.handleSession(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  handleSession(ws) {
    ws.accept();

    let connectionType = null;
    let connectionId = null;

    ws.addEventListener('message', async (event) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'register_host':
            connectionType = 'host';
            connectionId = this.generateId();
            this.sessions.set(connectionId, ws);
            ws.send(JSON.stringify({ type: 'host_id', id: connectionId }));
            console.log(`Host registered: ${connectionId}`);
            break;

          case 'connect_client':
            const hostId = message.hostId.toUpperCase();
            const hostWs = this.sessions.get(hostId);

            if (!hostWs) {
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: 'Host não encontrado ou offline' 
              }));
              return;
            }

            connectionType = 'client';
            connectionId = this.generateSessionId();
            const password = message.password || '';

            this.clients.set(connectionId, { 
              host: hostWs, 
              client: ws, 
              hostId 
            });

            hostWs.send(JSON.stringify({
              type: 'client_connected',
              sessionId: connectionId,
              password
            }));

            ws.send(JSON.stringify({ 
              type: 'connected', 
              sessionId: connectionId 
            }));
            console.log(`Client connected to host ${hostId}`);
            break;

          case 'auth_response':
            const session = this.clients.get(message.sessionId);
            if (session) {
              session.client.send(JSON.stringify({
                type: 'auth_result',
                authenticated: message.authenticated
              }));
            }
            break;

          case 'screen_frame':
            // Encaminha frame para todos os clientes conectados
            for (const [sessionId, session] of this.clients.entries()) {
              if (session.host === ws) {
                session.client.send(event.data);
              }
            }
            break;

          case 'mouse_event':
          case 'keyboard_event':
            // Encaminha eventos do cliente para o host
            for (const [sessionId, session] of this.clients.entries()) {
              if (session.client === ws) {
                session.host.send(event.data);
              }
            }
            break;
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });

    ws.addEventListener('close', () => {
      if (connectionType === 'host' && connectionId) {
        this.sessions.delete(connectionId);
        console.log(`Host disconnected: ${connectionId}`);

        // Remove sessões associadas
        for (const [sessionId, session] of this.clients.entries()) {
          if (session.hostId === connectionId) {
            session.client.close();
            this.clients.delete(sessionId);
          }
        }
      } else if (connectionType === 'client') {
        for (const [sessionId, session] of this.clients.entries()) {
          if (session.client === ws) {
            this.clients.delete(sessionId);
            session.host.send(JSON.stringify({ 
              type: 'client_disconnected', 
              sessionId 
            }));
            console.log(`Client disconnected from session ${sessionId}`);
            break;
          }
        }
      }
    });

    ws.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  generateId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  generateSessionId() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}

// Worker principal
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Rota WebSocket
    if (url.pathname === '/ws') {
      const id = env.SESSIONS.idFromName('global');
      const stub = env.SESSIONS.get(id);
      return stub.fetch(request);
    }

    // Rota de health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        service: 'QuickRemote',
        timestamp: Date.now() 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // API: Verificar se host está online
    if (url.pathname === '/api/check-host' && request.method === 'POST') {
      const { hostId } = await request.json();
      
      const id = env.SESSIONS.idFromName('global');
      const stub = env.SESSIONS.get(id);
      
      // Esta verificação seria feita consultando o Durable Object
      // Por simplicidade, retornamos sempre true aqui
      return new Response(JSON.stringify({ online: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('QuickRemote Worker API', { 
      headers: corsHeaders 
    });
  }
};
