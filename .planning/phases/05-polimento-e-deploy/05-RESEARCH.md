# Phase 5: Polimento e Deploy — Research

**Researched:** 2026-05-23
**Domain:** Node.js/Express file upload, env validation, global error handling, frontend UX feedback, Railway/Render deploy com MySQL
**Confidence:** HIGH

---

## Sumário

Esta fase tem cinco entregas independentes: (1) migrar foto de perfil de LONGTEXT base64 para
arquivos via `multer@2.1.1`, (2) validar variáveis de ambiente na inicialização do servidor,
(3) criar utilitário `ui.js` de feedback de carregamento/erro no frontend, (4) configurar deploy
no Railway com MySQL gerenciado, e (5) smoke test manual dos 5 fluxos.

A boa notícia: multer v2.x é CommonJS puro e tem **API idêntica à v1.x** — nenhuma mudança de
breaking change na interface do desenvolvedor. O servidor já tem `errorHandler` e `errorHandler`
já está montado — apenas precisa ser expandido com 404 explícito. O maior risco operacional é o
**filesystem efêmero do Railway/Render**: arquivos em `uploads/` são perdidos em cada redeploy.
Para um TCC de demonstração, isso é aceitável se documentado.

**Recomendação principal:** Usar Railway com buildpack Node.js (sem Dockerfile). Criar
`railway.json` mínimo + `uploads/` como diretório local com `.gitkeep` e aceitar que fotos
são efêmeras em produção — comunicar isso no smoke test.

---

<phase_requirements>
## Phase Requirements

| ID | Descrição | Suporte da pesquisa |
|----|-----------|---------------------|
| INFRA-03 | `foto_perfil` migrada de LONGTEXT base64 para armazenamento em arquivo | multer@2.1.1 API verificada; padrão DiskStorage documentado abaixo; migration script para NULL de registros base64 |
| INFRA-04 | Variáveis de ambiente validadas na inicialização do servidor | Padrão `config/env.js` com `process.exit(1)`; lista completa de vars obrigatórias identificada no `.env` atual |
| INFRA-05 | Sistema implantado em ambiente de produção acessível (Railway ou Render) | Railway recomendado; buildpack Node.js; MySQL plugin nativo; `railway.json` documentado; filesystem efêmero documentado |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Upload de foto de perfil | API / Backend | Browser/Client | multer processa multipart no Express; client só envia FormData |
| Servir arquivos de upload | API / Backend (static) | — | `express.static('uploads/')` no mesmo processo Node.js |
| Validação de env vars | API / Backend | — | Verificação na inicialização do processo Node; não exposta ao client |
| Tratamento global de erros (404/500) | API / Backend | — | Express `errorHandler` de 4 argumentos + handler de 404 antes dele |
| process.on('unhandledRejection') | API / Backend | — | Node.js process-level; complementar ao Express error handler |
| Feedback de loading/erro no frontend | Browser/Client | — | `ui.js` vanilla JS; nenhum dado chega do servidor para isso |
| Deploy / infraestrutura | CDN / Static + API | Database/Storage | Railway hospeda Node.js + MySQL plugin |

---

## Standard Stack

### Core

| Library | Versão | Propósito | Por que padrão |
|---------|--------|-----------|----------------|
| `multer` | `2.1.1` | Processar multipart/form-data para upload de arquivos | Middleware oficial do grupo expressjs; mesma API da v1.x; CommonJS puro |

> **Somente `multer` precisa ser instalado** — todas as outras tecnologias desta fase (env
> validation, error handling, ui.js, Railway deploy) usam apenas o que já existe no projeto
> ou são configuração sem dependências novas.

### Supporting

| Library | Versão | Propósito | Quando usar |
|---------|--------|-----------|-------------|
| `path` (built-in) | Node.js | Montar caminhos seguros para `uploads/` | Sempre — nunca concatenar strings para caminhos |
| `fs` (built-in) | Node.js | Criar diretório `uploads/` na inicialização | `fs.mkdirSync(path, { recursive: true })` no server startup |

### Alternativas Consideradas

| Em vez de | Poderia usar | Tradeoff |
|-----------|--------------|----------|
| Filesystem local (`uploads/`) | Cloudinary / AWS S3 | Cloud storage resolve efêmeridade mas adiciona dependência e configuração; filesystem é suficiente para o TCC |
| Railway buildpack | Dockerfile | Dockerfile dá mais controle mas adiciona complexidade; buildpack detecta Node.js automaticamente via `package.json` |

**Instalação:**
```bash
cd backend
npm install multer@2.1.1
```

**Verificação de versão:**
```
npm view multer version  → 2.1.1  [VERIFIED: npm registry, 2026-03-04]
```

---

## Package Legitimacy Audit

| Package | Registry | Idade | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-------|-----------|-------------|-----------|-------------|
| `multer` | npm | ~12 anos (2014) | Vários milhões/semana | github.com/expressjs/multer | N/A¹ | Aprovado |

¹ slopcheck indisponível (Python não instalado no ambiente). Porém `multer` foi confirmado via
repositório oficial `expressjs/multer` no GitHub (organização oficial do Express.js) —
classificado como `[VERIFIED: github.com/expressjs/multer]`.

**Packages removidos por [SLOP]:** nenhum
**Packages marcados [SUS]:** nenhum

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (configuracoes.html)
  │
  │  FormData (multipart/form-data, sem Content-Type manual)
  │  POST /api/perfil/foto
  ▼
Express + multer@2.1.1
  │  DiskStorage → uploads/{timestamp}-{random}.{ext}
  │  fileFilter  → aceita só image/jpeg, image/png, image/webp
  │  limits      → fileSize: 5MB
  ▼
banco MySQL
  │  UPDATE preferencias_usuario SET foto_perfil = '/uploads/...' WHERE usuario_id = ?
  ▼
Express static middleware
  │  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))
  ▼
Browser (aluno.html / professor.html)
  │  <img src="/uploads/filename.jpg" alt="Foto de perfil de {nome}">
  │  (backgroundImage via CSS substituído por <img> tag real)
```

```
server.js startup
  │
  ├─→ config/env.js (validação)
  │     JWT_SECRET, GEMINI_API_KEY, DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
  │     → process.exit(1) se ausente
  │
  ├─→ process.on('unhandledRejection')  → log + process.exit(1)
  ├─→ process.on('uncaughtException')   → log + process.exit(1)
  │
  ├─→ app.use(rotas...)
  │
  ├─→ app.use('*', handler404)          ← NOVO — antes do errorHandler
  └─→ app.use(errorHandler)             ← já existe, expandir lógica
```

```
Browser (todas as páginas, exceto login/cadastro/ia-estudo)
  │
  ├─ import ui.js (antes dos scripts de página)
  │   showLoading()   → injeta .carregando-global.ativo no body
  │   hideLoading()   → remove .ativo
  │   showError(msg)  → .aviso-config.erro, auto-dismiss 3000ms
  │   showSuccess(msg)→ .aviso-config.sucesso, auto-dismiss 3000ms
  │
  └─ todos os fetch wrappers: try { showLoading(); ... } finally { hideLoading(); }
```

### Estrutura de Projeto Recomendada

```
/                               ← raiz do repositório
├── backend/
│   ├── config/
│   │   └── env.js              ← NOVO: validação de vars na startup
│   ├── middleware/
│   │   └── errorHandler.js     ← EXISTENTE: expandir com 404 handler
│   ├── routes/
│   │   └── usuarios.js         ← EXISTENTE: adicionar POST /api/perfil/foto
│   ├── scripts/
│   │   └── migration-05.js     ← NOVO: converter/limpar foto_perfil base64
│   └── server.js               ← EXISTENTE: adicionar config/env.js + 404 handler + uploads static
├── uploads/                    ← NOVO: criado por mkdirSync na startup; .gitkeep comitado
│   └── .gitkeep
├── assets/
│   └── js/
│       └── ui.js               ← NOVO: showLoading, hideLoading, showError, showSuccess
├── railway.json                ← NOVO: config de deploy Railway
└── .env.example                ← EXISTENTE: atualizar com UPLOADS_DIR se necessário
```

---

## Padrões Detalhados

### Padrão 1: multer v2 — Upload de Foto de Perfil

**O que é:** Processamento de multipart/form-data com DiskStorage
**Quando usar:** Qualquer endpoint que receba arquivo via HTML form ou FormData

```javascript
// backend/routes/usuarios.js (CommonJS)
// Source: github.com/expressjs/multer v2.1.1 README

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true }); // garantir que existe

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const nome = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, nome);
  }
});

const uploadFoto = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: function (req, file, cb) {
    const permitidos = ['image/jpeg', 'image/png', 'image/webp'];
    if (permitidos.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Use JPG, PNG ou WebP.'));
    }
  }
});

// POST /api/perfil/foto
router.post('/perfil/foto', autenticar, uploadFoto.single('foto'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'erro', message: 'Nenhum arquivo enviado.' });
    }
    const caminho = '/uploads/' + req.file.filename;
    await banco.query(
      'UPDATE preferencias_usuario SET foto_perfil = ? WHERE usuario_id = ?',
      [caminho, req.user.id]
    );
    res.json({ status: 'ok', foto: caminho });
  } catch (erro) {
    next(erro);
  }
});
```

**Frontend (configuracoes.html / aluno.js):**
```javascript
// ATENÇÃO: NÃO definir Content-Type — o browser define automaticamente com boundary
document.querySelector('[data-salvar-foto]').addEventListener('click', async () => {
  if (!arquivoSelecionado) return;
  const form = new FormData();
  form.append('foto', arquivoSelecionado); // arquivo File, não base64

  showLoading();
  const textoOriginal = botao.textContent;
  botao.disabled = true;
  botao.textContent = 'Salvando foto…';
  try {
    const resp = await fetch('/api/perfil/foto', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + tokenAtual() },
      // SEM Content-Type — deixar o browser setar com boundary
      body: form
    });
    const dados = await resp.json();
    if (!resp.ok) throw new Error(dados.message);
    salvarConfig('foto', dados.foto); // salva o path '/uploads/...'
    aplicarFotoPerfil();
    fecharModalFoto();
    showSuccess('Foto atualizada!');
  } catch (erro) {
    showError('Não foi possível salvar a foto. Tente novamente.');
  } finally {
    hideLoading();
    botao.disabled = false;
    botao.textContent = textoOriginal;
  }
});
```

---

### Padrão 2: config/env.js — Validação de Variáveis de Ambiente

**O que é:** Módulo que valida presença de vars obrigatórias antes do servidor subir
**Quando usar:** Primeira linha efetiva de `server.js` (após `require('dotenv')`)

```javascript
// backend/config/env.js

'use strict';

const OBRIGATORIAS = [
  'JWT_SECRET',
  'GEMINI_API_KEY',
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME'
];

function validarEnv() {
  const ausentes = OBRIGATORIAS.filter(chave => !process.env[chave]);
  if (ausentes.length > 0) {
    console.error('❌ Variáveis de ambiente obrigatórias ausentes:');
    ausentes.forEach(chave => console.error(`   - ${chave}`));
    console.error('Configure essas variáveis e reinicie o servidor.');
    process.exit(1);
  }
}

module.exports = { validarEnv };
```

```javascript
// backend/server.js — primeiras linhas
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { validarEnv } = require('./config/env');
validarEnv(); // ← processo encerra aqui se vars ausentes
```

---

### Padrão 3: Handlers globais de processo + 404

**O que é:** Tratamento de erros que escapam do Express (unhandledRejection) + 404 explícito
**Quando usar:** server.js, logo após require de dotenv e antes de criar o app Express

```javascript
// backend/server.js — após validarEnv(), antes de const app = express()
process.on('unhandledRejection', (razao) => {
  console.error('[UnhandledRejection]', razao);
  process.exit(1);
});

process.on('uncaughtException', (erro) => {
  console.error('[UncaughtException]', erro);
  process.exit(1);
});
```

```javascript
// backend/server.js — ANTES de app.use(errorHandler), após todas as rotas
// Handler 404 — rota não encontrada
app.use(function handler404(req, res) {
  if (req.accepts('json')) {
    return res.status(404).json({ status: 'erro', message: 'Rota não encontrada.' });
  }
  res.status(404).sendFile(require('path').join(__dirname, '..', '404.html'), (err) => {
    if (err) res.status(404).send('Não encontrado');
  });
});

// errorHandler já existente (middleware/errorHandler.js) — vem depois
app.use(errorHandler);
```

> **Nota sobre Express 4 vs 5:** No Express 4, erros em async route handlers precisam ser
> passados via `next(erro)` em bloco `try/catch`. Os controllers existentes já fazem isso. O
> `unhandledRejection` é a camada de segurança para qualquer caminho que escape. No Express 5
> (futuro), isso seria automático. [ASSUMED - baseado em documentação Express conhecida]

---

### Padrão 4: ui.js — Utilitário de UX Global

**O que é:** Módulo vanilla JS com funções globais de feedback (carregamento, erro, sucesso)
**Quando usar:** Importar em todas as páginas (exceto login/cadastro e ia-estudo.html) ANTES dos scripts de página

```javascript
// assets/js/ui.js
// Depende de: nada — deve ser carregado antes de aluno.js nas páginas
// Uso: showLoading(), hideLoading(), showError(msg), showSuccess(msg)

(function () {
  // ─── Spinner global ───────────────────────────────────────────────
  function obterSpinner() {
    let el = document.querySelector('.carregando-global');
    if (!el) {
      el = document.createElement('div');
      el.className = 'carregando-global';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-label', 'Carregando');
      el.setAttribute('aria-live', 'polite');
      el.innerHTML = '<div class="spinner-anel"></div><span>Carregando\u2026</span>';
      document.body.appendChild(el);
    }
    return el;
  }

  window.showLoading = function () {
    obterSpinner().classList.add('ativo');
  };

  window.hideLoading = function () {
    const el = document.querySelector('.carregando-global');
    if (el) el.classList.remove('ativo');
  };

  // ─── Toast ────────────────────────────────────────────────────────
  let toastTimer = null;

  function mostrarToast(msg, classe) {
    const antigo = document.querySelector('.aviso-config');
    if (antigo) antigo.remove();
    if (toastTimer) clearTimeout(toastTimer);

    const aviso = document.createElement('div');
    aviso.className = 'aviso-config' + (classe ? ' ' + classe : '');
    aviso.textContent = msg;
    document.body.appendChild(aviso);
    toastTimer = setTimeout(() => aviso.remove(), 3000);
  }

  window.showError   = function (msg) { mostrarToast(msg, 'erro'); };
  window.showSuccess = function (msg) { mostrarToast(msg, 'sucesso'); };
  // showSuccess/showError substituem mostrarAviso() nas páginas de produto
  // ATENÇÃO: NÃO redeclarar mostrarAviso — aluno.js já a define globalmente
})();
```

> **Atenção crítica:** `mostrarAviso()` já está declarada em `aluno.js` como global. `ui.js`
> NÃO deve redeclará-la. `showError`/`showSuccess` são nomes novos. Nas páginas existentes,
> trocar `mostrarAviso(erro.message)` em blocos `catch` por `showError(erro.message)`.

---

### Padrão 5: Railway Deploy — buildpack Node.js

**O que é:** Configuração mínima para Railway detectar e implantar o app Node.js
**Quando usar:** Projeto sem Dockerfile existente

```json
// railway.json (raiz do repositório)
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd backend && npm install"
  },
  "deploy": {
    "startCommand": "node backend/server.js",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

**Variáveis a configurar no painel Railway:**
```
NODE_ENV=production
PORT=3000  (Railway injeta automaticamente $PORT; confirmar)
JWT_SECRET=<valor seguro>
GEMINI_API_KEY=<chave>
DB_HOST=<host do MySQL plugin do Railway>
DB_USER=<usuário>
DB_PASSWORD=<senha>
DB_NAME=duopratic
CORS_ORIGIN=https://<seu-app>.railway.app
```

**MySQL no Railway:** Railway oferece MySQL como plugin nativo (serviço MySQL 8.x). Após
adicionar o plugin, as variáveis `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`
são injetadas automaticamente. Mapear para os nomes `DB_*` usados pelo projeto nas variáveis
de ambiente da aplicação. [ASSUMED — baseado em documentação Railway conhecida; verificar no painel]

---

### Padrão 6: Migration script — foto_perfil base64 → NULL

```javascript
// backend/scripts/migration-05.js
// Zera registros base64 existentes em foto_perfil
// Uso: node backend/scripts/migration-05.js

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const banco = require('../db');

async function executar() {
  console.log('Iniciando migration-05 (limpeza de foto_perfil base64)...');

  // Identificar registros com base64 (começam com 'data:image')
  const [linhas] = await banco.query(
    "SELECT usuario_id FROM preferencias_usuario WHERE foto_perfil LIKE 'data:image%'"
  );
  console.log(`Registros com base64 encontrados: ${linhas.length}`);

  if (linhas.length > 0) {
    await banco.query(
      "UPDATE preferencias_usuario SET foto_perfil = NULL WHERE foto_perfil LIKE 'data:image%'"
    );
    console.log('foto_perfil base64 convertidos para NULL.');
  }

  // Alterar coluna de LONGTEXT para VARCHAR(255)
  await banco.query(
    'ALTER TABLE preferencias_usuario MODIFY COLUMN foto_perfil VARCHAR(255) NULL'
  );
  console.log('Coluna foto_perfil alterada para VARCHAR(255).');

  console.log('Migration-05 concluída com sucesso.');
  process.exit(0);
}

executar().catch(erro => {
  console.error('Erro na migration-05:', erro.message);
  process.exit(1);
});
```

> **Decisão de design:** Limpar base64 → NULL em vez de tentar converter para arquivos.
> Razão: base64 armazenado pode estar corrompido ou ser de preview não salvo; usuários
> fazem re-upload após a migração. Aceitável para TCC.

---

### Padrão 7: Servir uploads/ como estático

```javascript
// backend/server.js — adicionar ANTES dos app.use de rotas
const pastaUploads = path.join(__dirname, '..', 'uploads');
require('fs').mkdirSync(pastaUploads, { recursive: true }); // cria se não existir
app.use('/uploads', express.static(pastaUploads));
```

> **Cuidado com CSP do helmet:** `helmet()` define Content-Security-Policy que pode bloquear
> imagens servidas de `/uploads`. Adicionar `img-src 'self' data:` ou configurar
> `helmet({ contentSecurityPolicy: { directives: { imgSrc: ["'self'", "data:"] } } })`.
> [VERIFIED: github.com/helmetjs/helmet]

---

### Anti-Patterns a Evitar

- **NÃO definir `Content-Type: multipart/form-data` manualmente** no fetch — o browser define com boundary correto. Definir manualmente causa erro 400.
- **NÃO usar `multer.any()`** em rota autenticada — permite upload em campos não antecipados.
- **NÃO expor `erro.stack` em produção** — o `errorHandler.js` existente já condiciona por `NODE_ENV !== 'production'`. Manter.
- **NÃO chamar `hideLoading()` apenas no `catch`** — sempre usar `finally {}`.
- **NÃO redeclarar `mostrarAviso()`** em `ui.js` — conflito com `aluno.js`.
- **NÃO confiar em `uploads/` em produção como storage permanente** — filesystem Railway/Render é efêmero.

---

## Don't Hand-Roll

| Problema | Não construir | Usar | Por quê |
|----------|---------------|------|---------|
| Parse de multipart/form-data | Parser manual de boundary | `multer@2.1.1` | Boundary parsing tem edge cases críticos de segurança (CVEs 2025/2026 já corrigidos no v2) |
| Geração de nome de arquivo único | UUID manual, contador | `Date.now() + random` via multer `filename` cb | Simples e suficiente para TCC; colisão negligível |
| Validação de tipo MIME | Verificar extensão do arquivo | `fileFilter` do multer + `mimetype` da req | Extensão pode ser falsificada; mimetype via busboy é mais confiável |

---

## Common Pitfalls

### Pitfall 1: `Content-Type: multipart/form-data` manual no fetch

**O que dá errado:** Definir `headers: { 'Content-Type': 'multipart/form-data' }` no fetch
faz o servidor receber o corpo sem o boundary, e o multer não consegue parsear — `req.file`
é `undefined`.
**Por que acontece:** O boundary (ex: `----WebKitFormBoundary7MA4YWxkTrZu0gW`) é gerado
pelo browser e deve estar no header. Definir manualmente sobrescreve sem boundary.
**Como evitar:** Nunca definir `Content-Type` quando o body é `FormData`. O browser faz isso
automaticamente com o boundary correto.
**Sinal de alerta:** `req.file === undefined` no handler, mesmo com arquivo no form.

---

### Pitfall 2: helmet CSP bloqueia imagens de `/uploads`

**O que dá errado:** Após configurar `app.use('/uploads', express.static(...))`, as imagens
do perfil não carregam no browser — console mostra erro de Content Security Policy.
**Por que acontece:** `helmet()` ativa CSP por padrão com `img-src 'self'`. Imagens vindas
de `/uploads` teoricamente são `'self'`, mas base64 data URLs (se houver fallback) não são.
**Como evitar:** Configurar helmet explicitamente:
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'img-src': ["'self'", 'data:']
    }
  }
}));
```
**Sinal de alerta:** Imagens não aparecem; console do browser mostra "Content Security Policy".

---

### Pitfall 3: `uploads/` efêmero no Railway/Render

**O que dá errado:** Após redeploy, todas as fotos de perfil desaparecem — o diretório
`uploads/` é recriado vazio.
**Por que acontece:** Railway e Render usam filesystem efêmero — apenas o conteúdo do repositório
persiste entre deploys. Arquivos escritos em runtime são perdidos.
**Como evitar para TCC:** Documentar na checklist de smoke test que fotos precisam ser
re-uploaded após deploy. Para produção real, usar Railway Volumes (pago) ou Cloudinary.
**Sinal de alerta:** `GET /uploads/foto.jpg` retorna 404 depois de novo deploy.

---

### Pitfall 4: 404 handler declarado ANTES das rotas

**O que dá errado:** Se o `app.use(handler404)` for declarado antes das rotas de API,
todas as requisições retornam 404.
**Por que acontece:** Express executa middlewares em ordem de declaração.
**Como evitar:** Declarar o handler 404 APÓS todos os `app.use('/api', rotasXxx)`.
**Sinal de alerta:** Todas as rotas da API retornam `{ message: 'Rota não encontrada.' }`.

---

### Pitfall 5: `mostrarAviso` vs `showError` — conflito de nomes

**O que dá errado:** `ui.js` declara `window.mostrarAviso` como global — conflito com
a função já declarada em `aluno.js`. Páginas que carregam ambos quebram silenciosamente.
**Por que acontece:** `aluno.js` já define `mostrarAviso()` no escopo global (não em IIFE).
**Como evitar:** `ui.js` declara apenas `showLoading`, `hideLoading`, `showError`,
`showSuccess` — nunca `mostrarAviso`. As páginas existentes que chamam `mostrarAviso()`
podem continuar fazendo isso; substituir gradualmente por `showError()` apenas nos `catch`.
**Sinal de alerta:** `TypeError: mostrarAviso is not a function` no console.

---

### Pitfall 6: process.exit(1) no unhandledRejection conflita com Railway health check

**O que dá errado:** Se um `unhandledRejection` ocorrer durante o primeiro request após
deploy, o Railway interpreta o exit como crash e reinicia em loop.
**Por que acontece:** O Railway health check faz requests imediatamente após o deploy.
Se houver bug na inicialização, o processo entra em loop de restart.
**Como evitar:** Resolver todos os erros de inicialização antes de habilitar o handler.
Testar localmente com `NODE_ENV=production` antes de fazer deploy.
**Sinal de alerta:** Railway mostra "Restarting" em loop nos logs.

---

## Runtime State Inventory

> Esta fase envolve migração de dados em banco (foto_perfil base64).

| Categoria | Itens encontrados | Ação necessária |
|-----------|-------------------|-----------------|
| Stored data | `preferencias_usuario.foto_perfil LONGTEXT` — pode conter strings base64 `data:image/...` de usuários que fizeram upload antes desta fase | **Data migration:** `migration-05.js` limpa base64 → NULL; ALTER TABLE muda tipo para `VARCHAR(255)` |
| Live service config | Nenhum serviço externo configurado (Railway/Render não está deployado ainda) | Configurar no painel após criar conta |
| OS-registered state | Nada — projeto local, sem Task Scheduler / pm2 / systemd | Nenhuma |
| Secrets/env vars | `backend/.env` contém `GEMINI_API_KEY` real — não commitar; copiar valores para Railway manualmente | Configurar no painel Railway; `.env` fica local |
| Build artifacts | `uploads/` ainda não existe — será criado pelo `mkdirSync` na startup | Criar `uploads/.gitkeep` e commitar |

---

## State of the Art

| Abordagem antiga | Abordagem atual | Quando mudou | Impacto |
|------------------|-----------------|--------------|---------|
| `multer@1.4.x` (bugs críticos) | `multer@2.1.1` (CVEs 2025/2026 corrigidos) | 2025-05 a 2026-03 | Usar v2 — v1 tem vulnerabilidades de DoS conhecidas |
| `process.on('unhandledRejection', 'exit')` automático no Node 15+ | Ainda recomendado handler explícito com log | Node.js 15 (2020) | Handler explícito permite logging estruturado antes do exit |
| Base64 em LONGTEXT para fotos | Path de arquivo + `express.static` | Padrão do mercado | Elimina payloads de centenas de KB em cada fetch de preferências |

**Deprecated/outdated:**
- `multer@1.4.x`: tem CVE-2025-47935, CVE-2025-47944, CVE-2025-48997, CVE-2026-2359, CVE-2026-3304, CVE-2026-3520 — não usar.
- Base64 em banco para imagens: anti-pattern confirmado; polui queries de preferências com dados binários grandes.

---

## Environment Availability

| Dependência | Requerida por | Disponível | Versão | Fallback |
|-------------|---------------|-----------|--------|----------|
| Node.js | Servidor Express | ✓ | v26.2.0 | — |
| npm | Instalação multer | ✓ | 11.15.0 | — |
| MySQL 8.0 (local) | migration-05.js | ✓ (local) | 8.0.46 | — |
| Railway CLI / conta Railway | Deploy | ✗ (não verificado) | — | Render como alternativa |
| Git | Push para Railway | ✓ | disponível | — |

**Dependências ausentes sem fallback:**
- Conta Railway ou Render — precisa ser criada manualmente pelo estudante antes do deploy.

---

## Validation Architecture

> workflow.nyquist_validation: não configurado em .planning/config.json → tratado como enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Nenhum framework de testes automatizados detectado no projeto |
| Config file | Não existe |
| Quick run command | N/A — smoke test é manual nesta fase |
| Full suite command | N/A |

> Esta fase é de polimento e deploy. Os "testes" são smoke tests manuais (item 5 do plano do
> roadmap). Não há requisito de testes automatizados — o planner NÃO deve criar Wave 0 de testes.

### Phase Requirements → Test Map

| Req ID | Comportamento | Tipo de teste | Comando automatizado | Arquivo existe? |
|--------|--------------|---------------|----------------------|-----------------|
| INFRA-03 | Upload de foto funciona; foto servida de `/uploads/`; base64 eliminado da rede | Smoke manual | N/A | N/A |
| INFRA-04 | Servidor não sobe sem JWT_SECRET | Smoke manual: `unset JWT_SECRET && node server.js` | N/A | N/A |
| INFRA-05 | URL pública com todos os 5 fluxos funcionando | Smoke manual (checklist) | N/A | N/A |

### Wave 0 Gaps

Nenhum — não há framework de testes; smoke tests são manuais conforme checklist do plano 5.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Não (já implementado fases 1–4) | JWT middleware existente |
| V3 Session Management | Não (já implementado) | localStorage + JWT |
| V4 Access Control | Sim (upload de foto) | `autenticar` middleware no endpoint `/api/perfil/foto`; verificar `req.user.id` |
| V5 Input Validation | Sim | multer `fileFilter` valida mimetype; `limits.fileSize` previne DoS |
| V6 Cryptography | Não | — |

### Known Threat Patterns

| Pattern | STRIDE | Mitigação padrão |
|---------|--------|-----------------|
| Upload de arquivo malicioso (PHP, exe disfarçado de .jpg) | Tampering | `fileFilter` valida `file.mimetype` (busboy detecta MIME real, não extensão) |
| DoS via upload de arquivo gigante | DoS | `limits: { fileSize: 5 * 1024 * 1024 }` no multer |
| Acesso a foto de outro usuário (path traversal) | Elevation of Privilege | Nomes de arquivo gerados por `Date.now() + random` — sem dados do usuário no nome; path não aceitável como input do cliente |
| Stack trace exposto em produção | Information Disclosure | `errorHandler.js` já condiciona por `NODE_ENV !== 'production'` — manter |
| GEMINI_API_KEY no código/git | Information Disclosure | `.env` já no `.gitignore`; configurar no painel Railway, nunca commitar |

---

## Assumptions Log

| # | Claim | Seção | Risco se errado |
|---|-------|-------|-----------------|
| A1 | Railway injeta variáveis do MySQL plugin com nomes `MYSQL_HOST`, `MYSQL_USER`, etc. | Standard Stack / Deploy | Baixo — se nomes forem diferentes, ajustar mapeamento no painel |
| A2 | Railway detecta buildpack Node.js automaticamente via `package.json` sem `Procfile` | Padrão 5 (railway.json) | Baixo — railway.json com `startCommand` explícito cobre esse caso |
| A3 | Express 4 async handlers nos controllers existentes já usam try/catch; `unhandledRejection` é camada extra | Padrão 3 | Médio — se houver handler sem try/catch, o handler process.on vai pegar e derrubar; verificar todos os controllers |
| A4 | MySQL plugin do Railway é MySQL 8.x (compatível com mysql2 usado no projeto) | Deploy | Baixo — railway oferece MySQL 8 como padrão |

---

## Open Questions

1. **Railway free tier é suficiente para o TCC?**
   - O que sabemos: Railway tem plano Hobby com crédito mensal (~$5 USD). MySQL plugin consome recursos adicionais. [ASSUMED]
   - O que é incerto: Se o crédito gratuito cobre o período de apresentação do TCC.
   - Recomendação: Confirmar no painel Railway ao criar a conta; alternativa é Render com PlanetScale MySQL externo (free tier permanente).

2. **Volumes persistentes no Railway para `uploads/`?**
   - O que sabemos: Railway oferece Volumes para armazenamento persistente. [ASSUMED]
   - O que é incerto: Se Volumes estão disponíveis no plano free/hobby do Railway.
   - Recomendação: Para o TCC, aceitar filesystem efêmero e documentar no smoke test. Para demos ao vivo, fazer upload das fotos após cada deploy.

3. **`CORS_ORIGIN` deve aceitar múltiplas origens (localhost + produção)?**
   - O que sabemos: O código atual aceita uma única `CORS_ORIGIN`.
   - O que é incerto: Se o estudante vai testar localmente contra o DB de produção.
   - Recomendação: Em produção, `CORS_ORIGIN` = URL do Railway. Local continua `localhost:3000`.

---

## Sources

### Primary (HIGH confidence)
- `github.com/expressjs/multer` v2.1.1 — `index.js`, `README.md`, `CHANGELOG.md` — API, breaking changes, fileFilter, DiskStorage
- `github.com/expressjs/multer/blob/v2.1.1/package.json` — confirma CommonJS (`index.js`), sem campo `exports`, `module.exports = multer`

### Secondary (MEDIUM confidence)
- Codebase análise direta — `backend/server.js`, `backend/middleware/errorHandler.js`, `backend/controllers/usuariosController.js`, `assets/js/aluno.js`, `database/schema.sql` — padrões existentes verificados

### Tertiary (LOW / ASSUMED)
- Railway deployment patterns — Railway docs redirecionam para app Next.js; conteúdo real não extraído. Padrões de `railway.json` e MySQL plugin baseados em conhecimento de treinamento. [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- multer@2.1.1 API: HIGH — verificado via GitHub oficial expressjs/multer index.js + README
- Padrões de erro/env: HIGH — baseado em codebase existente + Node.js standard patterns
- Frontend ui.js: HIGH — baseado em UI-SPEC.md aprovado + código existente em aluno.js
- Railway deploy: MEDIUM/LOW — documentação não totalmente extraída; padrões [ASSUMED]
- Migration script: HIGH — baseado em padrão idêntico de migration-04.js existente

**Research date:** 2026-05-23
**Valid until:** 2026-06-23 (30 dias — Railway/Render mudam ofertas com frequência moderada)
