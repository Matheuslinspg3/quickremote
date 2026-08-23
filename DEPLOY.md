# QuickRemote - Cloudflare Edition

## Deploy Completo com Cloudflare Workers + Pages

### Pré-requisitos

1. Conta Cloudflare (gratuita)
2. Node.js instalado
3. Wrangler CLI instalado:
```bash
npm install -g wrangler
```

---

## 🚀 Passo 1: Deploy do Cloudflare Worker (Backend)

### 1.1 Login no Cloudflare

```bash
wrangler login
```

### 1.2 Configurar wrangler.toml

Edite `wrangler.toml` e altere:
- `name`: Nome único para seu worker
- `pattern` e `zone_name`: Seu domínio (ou remova se usar workers.dev)

```toml
name = "quickremote-worker"
main = "worker/index.js"
compatibility_date = "2024-01-01"

[durable_objects]
bindings = [
  { name = "SESSIONS", class_name = "SessionManager" }
]

[[migrations]]
tag = "v1"
new_classes = ["SessionManager"]
```

### 1.3 Deploy do Worker

```bash
wrangler deploy
```

Após o deploy, você receberá uma URL como:
```
https://quickremote-worker.seunome.workers.dev
```

**📝 ANOTE ESTA URL! Você vai precisar dela.**

---

## 🌐 Passo 2: Deploy do Frontend (Cloudflare Pages)

### 2.1 Atualizar URLs no Frontend

Edite `web/app.js` linha 2:
```javascript
const WORKER_URL = 'wss://quickremote-worker.seunome.workers.dev/ws';
```

### 2.2 Deploy via Git (Recomendado)

1. Crie um repositório no GitHub
2. Faça push dos arquivos da pasta `web/`
3. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com)
4. Vá em **Pages** > **Create a project**
5. Conecte seu repositório GitHub
6. Configure:
   - **Build directory**: `web`
   - **Build command**: (deixe vazio)
   - **Build output directory**: `/`
7. Clique em **Deploy**

### 2.3 Deploy via CLI (Alternativa)

```bash
cd web
wrangler pages deploy . --project-name=quickremote-web
```

Você receberá uma URL como:
```
https://quickremote-web.pages.dev
```

---

## 💻 Passo 3: Configurar o Host (Seu PC)

### 3.1 Atualizar URL do Worker

Edite `src/host-web.js` linha 7:
```javascript
const WORKER_URL = 'wss://quickremote-worker.seunome.workers.dev/ws';
```

### 3.2 Instalar Dependências

```bash
npm install
```

### 3.3 Iniciar o Host

```bash
npm run host-web
```

Ou adicione este script ao `package.json`:
```json
"scripts": {
  "host-web": "node src/host-web.js"
}
```

Você receberá um **ID único** como: `A3F2B8C1`

---

## 🎯 Passo 4: Acessar via Web

1. Abra seu navegador
2. Acesse: `https://quickremote-web.pages.dev`
3. Digite o ID do host (ex: A3F2B8C1)
4. Digite a senha (se configurada)
5. Clique em **Conectar**

**Pronto! Você está controlando seu PC remotamente via web!**

---

## 🔧 Configurações Opcionais

### Usar Domínio Customizado

#### No Worker:
1. Cloudflare Dashboard > Workers > seu worker
2. Settings > Triggers > Add Custom Domain
3. Digite: `api.seudominio.com`

#### No Pages:
1. Cloudflare Dashboard > Pages > seu projeto
2. Custom domains > Set up a custom domain
3. Digite: `remote.seudominio.com`

Depois atualize as URLs nos arquivos.

### Melhorar Performance

Em `src/host-web.js`:
```javascript
const FPS = 15;        // Aumentar para mais fluidez
const QUALITY = 70;    // Aumentar para melhor qualidade
```

### Habilitar HTTPS no Worker

O Cloudflare já fornece HTTPS automaticamente! Use sempre `wss://` (WebSocket Secure).

---

## 📊 Custos Cloudflare

### Plano Gratuito Inclui:
- ✅ 100.000 requisições/dia no Worker
- ✅ Unlimited bandwidth no Pages
- ✅ Durable Objects: 1 GB armazenamento + 1 milhão reads/writes
- ✅ SSL/HTTPS automático

**Para uso pessoal/pequeno, é completamente GRATUITO!**

---

## 🛠️ Troubleshooting

### Worker não conecta

```bash
# Verificar se está online
curl https://quickremote-worker.seunome.workers.dev/health

# Deve retornar: {"status":"ok","service":"QuickRemote"}
```

### Host não recebe ID

- Verifique se a URL no `host-web.js` está correta (deve ser `wss://` não `ws://`)
- Verifique firewall/antivírus bloqueando WebSocket

### Cliente não conecta

- Abra o DevTools (F12) > Console
- Veja erros de conexão
- Verifique se o ID está correto

### Performance ruim

- Reduza FPS ou QUALITY
- Use conexão de internet mais rápida
- Verifique latência: `ping seuworker.workers.dev`

---

## 🔒 Segurança em Produção

⚠️ **IMPORTANTE**: Esta é uma implementação básica. Para produção:

1. **Adicione autenticação forte**:
```javascript
// Usar JWT tokens em vez de senha simples
```

2. **Rate limiting**:
```javascript
// No worker, adicionar limitação de requisições
```

3. **Criptografia end-to-end**:
```javascript
// Criptografar frames antes de enviar
```

4. **Whitelist de IPs**:
```javascript
// Permitir apenas IPs conhecidos
```

---

## 📁 Estrutura Final

```
quickremote/
├── worker/
│   └── index.js              # Cloudflare Worker (backend)
├── web/
│   ├── index.html            # Interface web
│   └── app.js                # Cliente web JavaScript
├── src/
│   ├── host-web.js           # Host para Cloudflare
│   ├── host.js               # Host local (servidor próprio)
│   ├── client.js             # Cliente CLI
│   └── server.js             # Servidor local
├── wrangler.toml             # Config Cloudflare
├── package.json
└── README.md
```

---

## 🎉 URLs Finais

Após deploy completo:

- **🌐 Interface Web**: `https://quickremote-web.pages.dev`
- **⚙️ API Worker**: `https://quickremote-worker.seunome.workers.dev`
- **🔌 WebSocket**: `wss://quickremote-worker.seunome.workers.dev/ws`
- **❤️ Health Check**: `https://quickremote-worker.seunome.workers.dev/health`

---

## 📞 Comandos Rápidos

```bash
# Deploy worker
wrangler deploy

# Deploy pages
wrangler pages deploy web --project-name=quickremote-web

# Ver logs do worker
wrangler tail

# Testar localmente (dev mode)
wrangler dev

# Iniciar host no seu PC
npm run host-web
```

---

## 🆘 Suporte

Problemas? Verifique:
1. Console do navegador (F12)
2. Logs do worker: `wrangler tail`
3. Health check: `curl https://seu-worker.workers.dev/health`

---

**Desenvolvido como alternativa open source hospedada na Cloudflare**

Zero custo para uso pessoal! 🎉
