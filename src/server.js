import { WebSocketServer } from 'ws';
import crypto from 'crypto';

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });

// Armazena conexões ativas: hostId -> host WebSocket
const hosts = new Map();
// Armazena conexões de clientes: sessionId -> {host, client}
const sessions = new Map();

function generateId() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

wss.on('connection', (ws) => {
  let connectionType = null;
  let connectionId = null;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'register_host':
          connectionType = 'host';
          connectionId = generateId();
          hosts.set(connectionId, ws);
          ws.send(JSON.stringify({ type: 'host_id', id: connectionId }));
          console.log(`[HOST] Registrado: ${connectionId}`);
          break;

        case 'connect_client':
          const hostId = message.hostId.toUpperCase();
          const hostWs = hosts.get(hostId);
          
          if (!hostWs || hostWs.readyState !== 1) {
            ws.send(JSON.stringify({ type: 'error', message: 'Host não encontrado ou offline' }));
            return;
          }

          connectionType = 'client';
          connectionId = crypto.randomBytes(8).toString('hex');
          const password = message.password || '';
          
          sessions.set(connectionId, { host: hostWs, client: ws, hostId });
          
          // Notifica o host sobre nova conexão
          hostWs.send(JSON.stringify({ 
            type: 'client_connected', 
            sessionId: connectionId,
            password 
          }));
          
          ws.send(JSON.stringify({ type: 'connected', sessionId: connectionId }));
          console.log(`[CLIENT] Conectado ao host ${hostId}`);
          break;

        case 'auth_response':
          // Host responde se aceita a conexão
          const session = sessions.get(message.sessionId);
          if (session) {
            session.client.send(JSON.stringify({
              type: 'auth_result',
              authenticated: message.authenticated
            }));
          }
          break;

        case 'screen_frame':
          // Encaminha frame do host para o cliente
          for (const [sessionId, session] of sessions.entries()) {
            if (session.host === ws && session.client.readyState === 1) {
              session.client.send(data);
            }
          }
          break;

        case 'mouse_event':
        case 'keyboard_event':
          // Encaminha eventos do cliente para o host
          for (const [sessionId, session] of sessions.entries()) {
            if (session.client === ws && session.host.readyState === 1) {
              session.host.send(data);
            }
          }
          break;

        default:
          console.log(`Tipo de mensagem desconhecido: ${message.type}`);
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
    }
  });

  ws.on('close', () => {
    if (connectionType === 'host' && connectionId) {
      hosts.delete(connectionId);
      console.log(`[HOST] Desconectado: ${connectionId}`);
      
      // Remove todas as sessões associadas
      for (const [sessionId, session] of sessions.entries()) {
        if (session.hostId === connectionId) {
          session.client.close();
          sessions.delete(sessionId);
        }
      }
    } else if (connectionType === 'client') {
      // Remove sessão do cliente
      for (const [sessionId, session] of sessions.entries()) {
        if (session.client === ws) {
          sessions.delete(sessionId);
          session.host.send(JSON.stringify({ type: 'client_disconnected', sessionId }));
          console.log(`[CLIENT] Desconectado da sessão ${sessionId}`);
          break;
        }
      }
    }
  });

  ws.on('error', (error) => {
    console.error('Erro no WebSocket:', error);
  });
});

console.log(`
╔═══════════════════════════════════════╗
║      QuickRemote Server v1.0          ║
║   Servidor rodando na porta ${PORT}     ║
╚═══════════════════════════════════════╝
`);
