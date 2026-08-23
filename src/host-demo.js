import WebSocket from 'ws';
import readline from 'readline';

// URL do Cloudflare Worker (backend WebSocket)
const WORKER_URL = 'wss://quickremote-worker.matheuslinspg.workers.dev/ws';

let ws = null;
let hostId = null;
let isStreaming = false;
let password = null;
const FPS = 10;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Simula captura de tela (gera uma imagem fake em base64)
function generateFakeScreenshot() {
  // Gera um pequeno PNG fake (1x1 pixel vermelho)
  const fakeImage = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
    'base64'
  );
  return fakeImage.toString('base64');
}

async function sendFakeScreen() {
  try {
    if (ws && ws.readyState === WebSocket.OPEN && isStreaming) {
      ws.send(JSON.stringify({
        type: 'screen_frame',
        data: generateFakeScreenshot(),
        timestamp: Date.now()
      }));
    }
  } catch (error) {
    console.error('Erro ao enviar frame:', error.message);
  }
}

function handleMouseEvent(event) {
  console.log(`[DEMO] Mouse event:`, event);
  // Em produção, aqui usaria robotjs para mover o mouse
}

function handleKeyboardEvent(event) {
  console.log(`[DEMO] Keyboard event:`, event);
  // Em produção, aqui usaria robotjs para simular teclas
}

async function startHost() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║   QuickRemote Host v2.0 (DEMO)        ║');
  console.log('║   Cloudflare Edition                  ║');
  console.log('╚═══════════════════════════════════════╝\n');
  console.log('⚠️  MODO DEMO - Sem controle real do PC');
  console.log('   (Instale Visual Studio Build Tools para versão completa)\n');

  password = await question('Digite uma senha para conexões (ou Enter para sem senha): ');
  console.log('\nConectando ao servidor Cloudflare...\n');

  ws = new WebSocket(WORKER_URL);

  ws.on('open', () => {
    console.log('✓ Conectado ao servidor');
    ws.send(JSON.stringify({ type: 'register_host' }));
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'host_id':
          hostId = message.id;
          console.log(`\n╔═════════════════════════════════════════╗`);
          console.log(`║  SEU ID DE CONEXÃO: ${hostId.padEnd(19)}║`);
          console.log(`╚═════════════════════════════════════════╝\n`);
          console.log('Compartilhe este ID para acesso via web.');
          console.log(`URL: https://quickremote.pages.dev`);
          console.log(`Digite o ID: ${hostId}\n`);
          console.log('Aguardando conexões...\n');
          break;

        case 'client_connected':
          console.log(`\n[!] Cliente tentando conectar via web...`);
          
          if (password && message.password !== password) {
            console.log('[X] Senha incorreta. Conexão recusada.');
            ws.send(JSON.stringify({ 
              type: 'auth_response', 
              sessionId: message.sessionId, 
              authenticated: false 
            }));
          } else {
            console.log('[✓] Cliente autenticado. Compartilhamento iniciado!\n');
            console.log('⚠️  DEMO MODE: Enviando frames simulados...\n');
            ws.send(JSON.stringify({ 
              type: 'auth_response', 
              sessionId: message.sessionId, 
              authenticated: true 
            }));
            
            isStreaming = true;
            // Inicia envio de frames simulados
            setInterval(sendFakeScreen, 1000 / FPS);
          }
          break;

        case 'client_disconnected':
          console.log('\n[!] Cliente desconectado.\n');
          isStreaming = false;
          break;

        case 'mouse_event':
          handleMouseEvent(message);
          break;

        case 'keyboard_event':
          handleKeyboardEvent(message);
          break;
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
    }
  });

  ws.on('close', () => {
    console.log('\n[X] Desconectado do servidor.');
    process.exit(0);
  });

  ws.on('error', (error) => {
    console.error('Erro de conexão:', error.message);
    console.log('\nVerifique se você configurou corretamente o WORKER_URL no arquivo.');
    process.exit(1);
  });
}

startHost();
