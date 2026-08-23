import WebSocket from 'ws';
import readline from 'readline';
import fs from 'fs';

const SERVER_URL = 'ws://localhost:8080';
let ws = null;
let sessionId = null;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function startClient() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║      QuickRemote Client v1.0          ║');
  console.log('╚═══════════════════════════════════════╝\n');

  const hostId = await question('Digite o ID do host para conectar: ');
  const password = await question('Digite a senha (ou Enter se não houver): ');

  console.log('\nConectando...\n');

  ws = new WebSocket(SERVER_URL);

  ws.on('open', () => {
    console.log('✓ Conectado ao servidor');
    ws.send(JSON.stringify({ 
      type: 'connect_client', 
      hostId: hostId.trim(),
      password: password.trim()
    }));
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'connected':
          sessionId = message.sessionId;
          console.log('✓ Conectado ao host. Aguardando autenticação...\n');
          break;

        case 'auth_result':
          if (message.authenticated) {
            console.log('╔═══════════════════════════════════════╗');
            console.log('║  CONEXÃO ESTABELECIDA COM SUCESSO!    ║');
            console.log('╚═══════════════════════════════════════╝\n');
            console.log('Recebendo tela do host...');
            console.log('Os frames estão sendo recebidos e podem ser exibidos em uma interface gráfica.\n');
            console.log('(Esta versão CLI exibe estatísticas apenas)\n');
            
            let frameCount = 0;
            const startTime = Date.now();
            
            setInterval(() => {
              const elapsed = (Date.now() - startTime) / 1000;
              const fps = (frameCount / elapsed).toFixed(2);
              process.stdout.write(`\rFrames: ${frameCount} | FPS: ${fps} | Tempo: ${elapsed.toFixed(0)}s`);
            }, 1000);
          } else {
            console.log('[X] Autenticação falhou. Senha incorreta.');
            process.exit(1);
          }
          break;

        case 'screen_frame':
          // Aqui você receberia os frames de tela
          // Em uma implementação completa, isso seria exibido em uma janela
          // console.log('Frame recebido:', message.data.length, 'bytes');
          
          // Para demonstração, vamos apenas contar frames
          if (!global.frameCount) global.frameCount = 0;
          global.frameCount++;
          
          // Salva o primeiro frame como exemplo
          if (global.frameCount === 1) {
            const buffer = Buffer.from(message.data, 'base64');
            fs.writeFileSync('screenshot_sample.jpg', buffer);
            console.log('\n[✓] Primeiro frame salvo como screenshot_sample.jpg\n');
          }
          break;

        case 'error':
          console.log(`[X] Erro: ${message.message}`);
          process.exit(1);
          break;
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
    }
  });

  ws.on('close', () => {
    console.log('\n\n[X] Desconectado do servidor.');
    process.exit(0);
  });

  ws.on('error', (error) => {
    console.error('Erro de conexão:', error.message);
    process.exit(1);
  });

  // Exemplo de envio de eventos de mouse/teclado
  // Em uma GUI real, esses eventos seriam capturados da interface
  /*
  ws.send(JSON.stringify({
    type: 'mouse_event',
    x: 100,
    y: 100,
    action: 'move'
  }));
  
  ws.send(JSON.stringify({
    type: 'keyboard_event',
    key: 'a',
    action: 'press',
    modifiers: []
  }));
  */
}

startClient();
