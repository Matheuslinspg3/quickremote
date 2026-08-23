// Configuração
const WORKER_URL = 'wss://quickremote-worker.matheuslinspg.workers.dev/ws';

let ws = null;
let canvas = null;
let ctx = null;
let hostId = null;
let connected = false;
let frameCount = 0;
let lastFrameTime = Date.now();
let fpsCounter = 0;

// Elementos DOM
const loginContainer = document.getElementById('loginContainer');
const viewer = document.getElementById('viewer');
const loginForm = document.getElementById('loginForm');
const statusDiv = document.getElementById('status');
const connectBtn = document.getElementById('connectBtn');
const hostIdInput = document.getElementById('hostId');
const passwordInput = document.getElementById('password');
const connectedHostSpan = document.getElementById('connectedHost');
const fpsSpan = document.getElementById('fps');
const latencySpan = document.getElementById('latency');
const frameCountSpan = document.getElementById('frameCount');

// Auto uppercase no input
hostIdInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});

// Submit do formulário
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await connect();
});

async function connect() {
    const hostIdValue = hostIdInput.value.trim().toUpperCase();
    const passwordValue = passwordInput.value.trim();

    if (!hostIdValue) {
        showStatus('Digite o ID do computador', 'error');
        return;
    }

    showStatus('Conectando...', 'info');
    connectBtn.disabled = true;
    connectBtn.innerHTML = '<span class="loader"></span> Conectando...';

    try {
        // Conecta ao WebSocket
        ws = new WebSocket(WORKER_URL);

        ws.onopen = () => {
            console.log('WebSocket conectado');
            ws.send(JSON.stringify({
                type: 'connect_client',
                hostId: hostIdValue,
                password: passwordValue
            }));
        };

        ws.onmessage = (event) => {
            handleMessage(JSON.parse(event.data));
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            showStatus('Erro ao conectar', 'error');
            connectBtn.disabled = false;
            connectBtn.innerHTML = 'Conectar';
        };

        ws.onclose = () => {
            console.log('WebSocket desconectado');
            if (connected) {
                disconnect();
                alert('Conexão perdida com o servidor');
            }
        };

    } catch (error) {
        console.error('Erro:', error);
        showStatus('Erro ao conectar: ' + error.message, 'error');
        connectBtn.disabled = false;
        connectBtn.innerHTML = 'Conectar';
    }
}

function handleMessage(message) {
    console.log('Mensagem recebida:', message.type);

    switch (message.type) {
        case 'connected':
            showStatus('Aguardando autenticação...', 'info');
            break;

        case 'auth_result':
            if (message.authenticated) {
                showStatus('Conectado!', 'success');
                hostId = hostIdInput.value.trim().toUpperCase();
                startViewer();
            } else {
                showStatus('Senha incorreta', 'error');
                connectBtn.disabled = false;
                connectBtn.innerHTML = 'Conectar';
                ws.close();
            }
            break;

        case 'screen_frame':
            displayFrame(message.data);
            break;

        case 'error':
            showStatus(message.message, 'error');
            connectBtn.disabled = false;
            connectBtn.innerHTML = 'Conectar';
            ws.close();
            break;
    }
}

function startViewer() {
    connected = true;
    loginContainer.style.display = 'none';
    viewer.classList.add('active');
    connectedHostSpan.textContent = hostId;

    // Inicializa canvas
    canvas = document.getElementById('screen');
    ctx = canvas.getContext('2d');

    // Event listeners para controle
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', handleMouseWheel, { passive: false });

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Atualiza stats a cada segundo
    setInterval(updateStats, 1000);
}

function displayFrame(base64Data) {
    const img = new Image();
    
    const startTime = Date.now();
    
    img.onload = () => {
        // Ajusta canvas ao tamanho da imagem
        if (canvas.width !== img.width || canvas.height !== img.height) {
            canvas.width = img.width;
            canvas.height = img.height;
        }

        ctx.drawImage(img, 0, 0);
        
        frameCount++;
        fpsCounter++;
        
        // Calcula latência (aproximada)
        const latency = Date.now() - startTime;
        latencySpan.textContent = latency;
    };

    img.src = 'data:image/jpeg;base64,' + base64Data;
}

function updateStats() {
    const now = Date.now();
    const elapsed = (now - lastFrameTime) / 1000;
    const fps = (fpsCounter / elapsed).toFixed(1);
    
    fpsSpan.textContent = fps;
    frameCountSpan.textContent = frameCount;
    
    fpsCounter = 0;
    lastFrameTime = now;
}

// Controle de Mouse
function handleMouseMove(e) {
    if (!connected) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);

    sendEvent({
        type: 'mouse_event',
        action: 'move',
        x: x,
        y: y
    });
}

function handleMouseDown(e) {
    if (!connected) return;
    e.preventDefault();
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    
    const button = e.button === 0 ? 'left' : e.button === 2 ? 'right' : 'middle';

    sendEvent({
        type: 'mouse_event',
        action: 'click',
        x: x,
        y: y,
        button: button
    });
}

function handleMouseUp(e) {
    if (!connected) return;
    e.preventDefault();
}

function handleMouseWheel(e) {
    if (!connected) return;
    e.preventDefault();

    sendEvent({
        type: 'mouse_event',
        action: 'scroll',
        deltaX: Math.round(e.deltaX / 10),
        deltaY: Math.round(e.deltaY / 10)
    });
}

// Controle de Teclado
function handleKeyDown(e) {
    if (!connected) return;
    e.preventDefault();

    const key = mapKey(e.key);
    const modifiers = [];
    
    if (e.ctrlKey) modifiers.push('control');
    if (e.altKey) modifiers.push('alt');
    if (e.shiftKey) modifiers.push('shift');
    if (e.metaKey) modifiers.push('command');

    sendEvent({
        type: 'keyboard_event',
        action: 'press',
        key: key,
        modifiers: modifiers
    });
}

function handleKeyUp(e) {
    if (!connected) return;
    e.preventDefault();
}

function mapKey(key) {
    // Mapeia teclas especiais para robotjs
    const keyMap = {
        'Enter': 'enter',
        'Backspace': 'backspace',
        'Tab': 'tab',
        'Escape': 'escape',
        'ArrowUp': 'up',
        'ArrowDown': 'down',
        'ArrowLeft': 'left',
        'ArrowRight': 'right',
        'Delete': 'delete',
        'Home': 'home',
        'End': 'end',
        'PageUp': 'pageup',
        'PageDown': 'pagedown',
        ' ': 'space'
    };

    return keyMap[key] || key.toLowerCase();
}

function sendEvent(event) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(event));
    }
}

function disconnect() {
    connected = false;
    
    if (ws) {
        ws.close();
        ws = null;
    }

    viewer.classList.remove('active');
    loginContainer.style.display = 'block';
    connectBtn.disabled = false;
    connectBtn.innerHTML = 'Conectar';
    
    frameCount = 0;
    fpsCounter = 0;
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        viewer.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + type;
    
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }
}
