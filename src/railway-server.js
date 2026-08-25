// QuickRemote - servidor unificado para Railway
// Serve o frontend estatico (web/) e o relay WebSocket no MESMO host/porta.
// Isso elimina CORS e mantem uma unica URL publica.

import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_DIR = path.join(__dirname, '..', 'web');

// Railway injeta PORT. 8080 e o fallback local.
const PORT = Number(process.env.PORT) || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// hostId -> WebSocket do host
const hosts = new Map();
// sessionId -> { host, client, hostId }
const sessions = new Map();

function generateId() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Resolve o caminho do arquivo dentro de WEB_DIR, bloqueando path traversal.
function resolveStatic(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const rel = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const full = path.resolve(WEB_DIR, rel);
  const root = path.resolve(WEB_DIR);
  if (full !== root && !full.startsWith(root + path.sep)) return null;
  return full;
}

const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'QuickRemote',
      hosts: hosts.size,
      sessions: sessions.size,
      timestamp: Date.now(),
    }));
    return;
  }

  if (req.url && req.url.startsWith('/api/check-host')) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const id = (url.searchParams.get('id') || '').toUpperCase();
    const ws = hosts.get(id);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ online: Boolean(ws && ws.readyState === 1) }));
    return;
  }

  const filePath = resolveStatic(req.url || '/');
  if (!filePath) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
});

// O WebSocketServer compartilha o servidor HTTP, apenas na rota /ws.
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  let connectionType = null;
  let connectionId = null;

  ws.on('message', (data, isBinary) => {
    // Frames binarios sao repassados sem parse, direto do host para o cliente.
    if (isBinary) {
      for (const session of sessions.values()) {
        if (session.host === ws && session.client.readyState === 1) {
          session.client.send(data, { binary: true });
        }
      }
      return;
    }

    let message;
    try {
      message = JSON.parse(data);
    } catch {
      console.error('Mensagem invalida (nao e JSON)');
      return;
    }

    try {
      switch (message.type) {
        case 'register_host': {
          connectionType = 'host';
          connectionId = generateId();
          hosts.set(connectionId, ws);
          ws.send(JSON.stringify({ type: 'host_id', id: connectionId }));
          console.log(`[HOST] Registrado: ${connectionId}`);
          break;
        }

        case 'connect_client': {
          const hostId = String(message.hostId || '').toUpperCase();
          const hostWs = hosts.get(hostId);

          if (!hostWs || hostWs.readyState !== 1) {
            ws.send(JSON.stringify({ type: 'error', message: 'Host nao encontrado ou offline' }));
            return;
          }

          connectionType = 'client';
          connectionId = crypto.randomBytes(8).toString('hex');
          sessions.set(connectionId, { host: hostWs, client: ws, hostId });

          hostWs.send(JSON.stringify({
            type: 'client_connected',
            sessionId: connectionId,
            password: message.password || '',
          }));

          ws.send(JSON.stringify({ type: 'connected', sessionId: connectionId }));
          console.log(`[CLIENT] Conectado ao host ${hostId}`);
          break;
        }

        case 'auth_response': {
          const session = sessions.get(message.sessionId);
          if (session && session.client.readyState === 1) {
            session.client.send(JSON.stringify({
              type: 'auth_result',
              authenticated: message.authenticated,
            }));
          }
          break;
        }

        case 'screen_frame': {
          for (const session of sessions.values()) {
            if (session.host === ws && session.client.readyState === 1) {
              session.client.send(data);
            }
          }
          break;
        }

        case 'mouse_event':
        case 'keyboard_event': {
          for (const session of sessions.values()) {
            if (session.client === ws && session.host.readyState === 1) {
              session.host.send(data);
            }
          }
          break;
        }

        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        }

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
      for (const [sessionId, session] of sessions.entries()) {
        if (session.hostId === connectionId) {
          try { session.client.close(); } catch { /* ja fechado */ }
          sessions.delete(sessionId);
        }
      }
    } else if (connectionType === 'client') {
      for (const [sessionId, session] of sessions.entries()) {
        if (session.client === ws) {
          sessions.delete(sessionId);
          if (session.host.readyState === 1) {
            session.host.send(JSON.stringify({ type: 'client_disconnected', sessionId }));
          }
          console.log(`[CLIENT] Desconectado da sessao ${sessionId}`);
          break;
        }
      }
    }
  });

  ws.on('error', (error) => {
    console.error('Erro no WebSocket:', error);
  });
});

// Railway derruba containers sem keepalive; ping periodico mantem as conexoes vivas.
const heartbeat = setInterval(() => {
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      try { client.ping(); } catch { /* ignora */ }
    }
  }
}, 30000);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`QuickRemote rodando na porta ${PORT}`);
  console.log(`  frontend  -> /`);
  console.log(`  websocket -> /ws`);
  console.log(`  health    -> /health`);
});

function shutdown() {
  clearInterval(heartbeat);
  server.close(() => process.exit(0));
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
