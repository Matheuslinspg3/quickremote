# QuickRemote

Sistema de desktop remoto open source rápido, leve e otimizado - similar ao AnyDesk.

## Características

- **Rápido e Leve**: Compressão JPEG otimizada com qualidade ajustável
- **Baixa Latência**: 10 FPS padrão, ajustável conforme necessidade
- **Seguro**: Sistema de autenticação por senha
- **Simples**: Conexão via ID único de 8 caracteres
- **Open Source**: Código 100% aberto e modificável
- **Cross-platform**: Funciona em Windows, Linux e macOS

## Arquitetura

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│    HOST     │ ◄─────► │   SERVER    │ ◄─────► │   CLIENT    │
│  (Origem)   │         │  (Relay WS) │         │ (Controle)  │
└─────────────┘         └─────────────┘         └─────────────┘
```

- **Server**: Servidor WebSocket que faz relay das conexões
- **Host**: Máquina que será controlada remotamente
- **Client**: Máquina que irá visualizar e controlar o host

## Instalação

```bash
npm install
```

### Dependências Nativas

O RobotJS requer compilação nativa. No Windows, instale:
- Node.js (v16+)
- Visual Studio Build Tools ou Visual Studio Community
- Python 3

No Linux:
```bash
sudo apt-get install libxtst-dev libpng++-dev
```

No macOS:
```bash
brew install pkg-config cairo pango libpng jpeg giflib
```

## Uso

### 1. Iniciar o Servidor

```bash
npm run server
```

O servidor ficará rodando na porta 8080.

### 2. Iniciar o Host (máquina a ser controlada)

Em outra máquina ou terminal:

```bash
npm run host
```

Digite uma senha (ou deixe vazio) e anote o **ID gerado** (ex: A3F2B8C1).

### 3. Conectar como Cliente

Em outra máquina:

```bash
npm run client
```

Digite o ID do host e a senha (se houver).

## Recursos Implementados

✅ Captura de tela em tempo real  
✅ Compressão de imagem (JPEG)  
✅ Redimensionamento automático para 1920x1080  
✅ Controle remoto de mouse (mover, clicar, scroll)  
✅ Controle remoto de teclado  
✅ Autenticação por senha  
✅ Sistema de sessões  
✅ Conexão via ID único  

## Configurações Avançadas

Edite `src/host.js` para ajustar:

```javascript
const FPS = 10;        // Frames por segundo (aumentar = mais fluido, mais banda)
const QUALITY = 60;    // Qualidade JPEG 1-100 (aumentar = melhor imagem, mais banda)
```

## Performance

- **Consumo de banda**: ~500KB/s a 2MB/s (dependendo de FPS e qualidade)
- **Latência**: ~100-300ms (dependendo da rede)
- **CPU**: ~5-15% em host moderno
- **RAM**: ~100-200MB por sessão

## Melhorias Futuras

- [ ] Interface gráfica com Electron
- [ ] Codec de vídeo H.264 para melhor compressão
- [ ] Transferência de arquivos
- [ ] Clipboard compartilhado
- [ ] Multi-monitor support
- [ ] Reconexão automática
- [ ] NAT traversal (P2P direto)
- [ ] Criptografia end-to-end

## Segurança

**AVISO**: Esta é uma implementação básica. Para uso em produção:

- Use HTTPS/WSS (WebSocket Secure)
- Implemente criptografia end-to-end
- Adicione rate limiting
- Use tokens de autenticação robustos
- Implemente logs de auditoria

## Estrutura do Projeto

```
quickremote/
├── src/
│   ├── server.js    # Servidor WebSocket relay
│   ├── host.js      # Host (máquina compartilhada)
│   └── client.js    # Cliente (visualizador/controlador)
├── package.json
└── README.md
```

## Licença

MIT - Código aberto e gratuito para uso pessoal e comercial.

## Contribuindo

Contribuições são bem-vindas! Abra issues ou pull requests.

## Troubleshooting

**Erro ao instalar robotjs**:
- Windows: Instale Visual Studio Build Tools
- Linux: `sudo apt-get install build-essential`

**"Host não encontrado"**:
- Verifique se o servidor está rodando
- Confirme que o ID está correto (case insensitive)

**Performance ruim**:
- Reduza FPS ou QUALITY em `src/host.js`
- Verifique conexão de rede
- Use conexão local (mesmo WiFi/LAN)

---

Desenvolvido como alternativa open source ao AnyDesk/TeamViewer.
