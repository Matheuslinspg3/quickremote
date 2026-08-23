# 🚀 QuickRemote

## Deploy no GitHub + Cloudflare

### Passo 1: Criar repositório no GitHub

1. Acesse [GitHub](https://github.com/new)
2. Crie um novo repositório:
   - **Nome**: `quickremote` (ou nome de sua escolha)
   - **Descrição**: "Sistema de desktop remoto open source - similar ao AnyDesk"
   - **Visibilidade**: Public (para usar Cloudflare Pages gratuitamente)
   - ❌ **NÃO** marque "Initialize this repository with a README"

3. Após criar, você verá comandos. **ANOTE A URL** do repositório:
   ```
   https://github.com/SEU_USUARIO/quickremote.git
   ```

### Passo 2: Conectar e fazer push

No terminal do projeto, execute:

```bash
# Adicionar remote do GitHub (substitua pela SUA URL)
git remote add origin https://github.com/SEU_USUARIO/quickremote.git

# Fazer push
git branch -M main
git push -u origin main
```

Se pedir autenticação:
- **Username**: seu usuário do GitHub
- **Password**: use um [Personal Access Token](https://github.com/settings/tokens) em vez da senha

### Passo 3: Deploy no Cloudflare

Agora que o código está no GitHub, siga os passos do **DEPLOY.md**:

#### 3.1 Deploy do Worker (Backend)

```bash
# Instalar Wrangler
npm install -g wrangler

# Login no Cloudflare
wrangler login

# Deploy
wrangler deploy
```

Você receberá uma URL como: `https://quickremote-worker.seunome.workers.dev`

#### 3.2 Deploy do Pages (Frontend)

**Opção A: Via Dashboard (Recomendado)**

1. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Vá em **Pages** > **Create a project**
3. Clique em **Connect to Git**
4. Selecione seu repositório `quickremote`
5. Configure:
   - **Framework preset**: None
   - **Build command**: (deixe vazio)
   - **Build output directory**: `web`
   - **Root directory**: `/`
6. Clique em **Save and Deploy**

**Opção B: Via CLI**

```bash
wrangler pages deploy web --project-name=quickremote-web
```

#### 3.3 Atualizar URLs

Após receber as URLs do Cloudflare:

**Edite `web/app.js` linha 2:**
```javascript
const WORKER_URL = 'wss://quickremote-worker.seunome.workers.dev/ws';
```

**Edite `src/host-web.js` linha 7:**
```javascript
const WORKER_URL = 'wss://quickremote-worker.seunome.workers.dev/ws';
```

Faça commit e push das alterações:
```bash
git add web/app.js src/host-web.js
git commit -m "Atualizar URLs do Cloudflare Worker"
git push
```

Se usou a Opção A (Dashboard), o Cloudflare Pages fará deploy automático a cada push!

### Passo 4: Usar o sistema

**No seu PC (Host):**
```bash
npm install
npm run host-web
```

Anote o ID gerado (ex: `A3F2B8C1`)

**Em qualquer navegador:**
1. Acesse: `https://quickremote-web.pages.dev`
2. Digite o ID
3. Digite a senha (se configurou)
4. Conecte!

---

## 📁 Estrutura do Repositório

```
quickremote/
├── worker/           # Cloudflare Worker (backend WebSocket)
├── web/              # Interface web (Cloudflare Pages)
├── src/              # Scripts Node.js
│   ├── host-web.js   # Host para Cloudflare
│   ├── host.js       # Host local
│   ├── client.js     # Cliente CLI
│   └── server.js     # Servidor local
├── DEPLOY.md         # Documentação de deploy
├── README.md         # Documentação principal
├── package.json
└── wrangler.toml     # Config Cloudflare
```

## 🔄 Atualizações Futuras

Sempre que fizer mudanças:

```bash
git add .
git commit -m "Descrição das mudanças"
git push
```

- **Worker**: Execute `wrangler deploy` manualmente
- **Pages**: Deploy automático a cada push (se configurou via Dashboard)

## 🆘 Troubleshooting

**Erro ao fazer push:**
- Verifique se a URL do remote está correta: `git remote -v`
- Use Personal Access Token em vez de senha

**Worker não atualiza:**
- Execute `wrangler deploy` novamente
- Limpe cache: `wrangler dev --local`

**Pages não atualiza:**
- Vá em Cloudflare Dashboard > Pages > seu projeto > Deployments
- Clique em "Retry deployment"

---

## 📞 Comandos Git Úteis

```bash
# Ver status
git status

# Ver histórico
git log --oneline

# Ver remotes
git remote -v

# Ver branches
git branch -a

# Desfazer último commit (mantém alterações)
git reset --soft HEAD~1

# Ver diferenças
git diff
```

---

**Repositório pronto para deploy! 🎉**

Custo total: **R$ 0,00** (plano gratuito Cloudflare)
