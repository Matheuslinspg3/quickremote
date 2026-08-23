import WebSocket from 'ws';
import screenshot from 'screenshot-desktop';
import sharp from 'sharp';
import robot from 'robotjs';
import readline from 'readline';

// ALTERE para a URL do seu Cloudflare Worker
const WORKER_URL = 'wss://quickremote.yourdomain.workers.dev/ws';

let ws = null;
let hostId = null;
let isStreaming = false;
let password = null;
const FPS = 10;
const QUALITY = 60;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function captureAndSendScreen() {
  try {
    const img = await screenshot({ format: 'png' });
    
    // Comprime a imagem para reduzir tamanho
    const compressed = await sharp(img)
      .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: QUALITY })
      .toBuffer();

    if (ws && ws.readyState === WebSocket.OPEN && isStreaming) {
      ws.send(JSON.stringify({
        type: 'screen_frame',
        data: compressed.toString('base64'),
        timestamp: Date.now()
      }));
    }
  } catch (error) {
    console.error('Erro ao capturar tela:', error.message);
  }
}

function handleMouseEvent(event) {
  try {
    const { x, y, button, action } = event;
    
    if (action === 'move') {
      robot.moveMouse(x, y);
    } else if (action === 'click') {
      robot.moveMouse(x, y);
      robot.mouseClick(button || 'left');
    } else if (action === 'down') {
      robot.mouseToggle('down', button || 'left');
    } else if (action === 'up') {
      robot.mouseToggle('up', button || 'left');
    } else if (action === 'scroll') {
      robot.scrollMouse(event.deltaX || 0, event.deltaY || 0);
    }
  } catch (error) {
    console.error('Erro ao processar evento de mouse:', error.message);
  }
}

function handleKeyboardEvent(event) {
  try {
    const { key, action, modifiers } = event;
    
    if (action === 'press') {
      if (modifiers && modifiers.length > 0) {
        robot.keyTap(key, modifiers);
      } else {
        robot.keyTap(key);
      }
    } else if (action === 'down') {
      robot.keyToggle(key, 'down');
    } else if (action === 'up') {
      robot.keyToggle(key, 'up');
    }
  } catch (error) {
    console.error('Erro ao processar evento de teclado:', error.message);
  }
}

async function startHost() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║      QuickRemote Host v2.0            ║');
  console.log('║      Cloudflare Edition               ║');
  console.log('╚═══════════════════════════════════════╝\n');

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
          console.log(`URL: https://quickremote.yourdomain.com/?host=${hostId}`);
          console.log('\nAguardando conexões...\n');
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
            ws.send(JSON.stringify({ 
              type: 'auth_response', 
              sessionId: message.sessionId, 
              authenticated: true 
            }));
            
            isStreaming = true;
            // Inicia captura de tela
            setInterval(captureAndSendScreen, 1000 / FPS);
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
