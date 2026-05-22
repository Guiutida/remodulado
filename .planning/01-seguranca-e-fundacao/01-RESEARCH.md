# Phase 1: Segurança e Fundação — Research

**Pesquisado:** 2026-05-22  
**Domínio:** Segurança em Node.js/Express — autenticação JWT, bcrypt, CORS, IDOR, refatoração de módulos  
**Confiança geral:** HIGH — vulnerabilidades confirmadas via leitura direta do código; versões de pacotes verificadas no registro npm

---

<phase_requirements>
## Requisitos da Fase

| ID | Descrição | Suporte da Pesquisa |
|----|-----------|---------------------|
| AUTH-01 | Senhas armazenadas com hash bcrypt | Padrão bcrypt.hash/compare documentado; `senha VARCHAR(255)` já suporta o hash |
| AUTH-02 | Todas as rotas de API protegidas por middleware JWT | Middleware `autenticar` documentado; lista exata de rotas afetadas mapeada |
| AUTH-03 | Token JWT emitido no login e validado a cada requisição | Fluxo login→emitir→armazenar→reenviar documentado; mudanças no frontend identificadas |
| AUTH-04 | Sessão persiste entre recarregamentos do browser | `localStorage` já existe; basta salvar `token` junto com `usuario` |
| AUTH-05 | CORS sem wildcard | CORS manual em `*` identificado; padrão de substituição com `cors` package documentado |
| AUTH-06 | Aluno não acessa dados de outro aluno (IDOR eliminado) | Todas as 4 rotas vulneráveis mapeadas; padrão de verificação `req.usuario.id !== parseInt(req.params.id)` documentado |
| INFRA-01 | `server.js` dividido em `routes/`, `middleware/`, `controllers/` | Estrutura de destino e mapeamento rota-a-rota documentados |
| INFRA-02 | Dados de seed removidos de handlers de produção | `garantirAtividadeFuncoes()` identificada; todas as chamadas mapeadas; estratégia de remoção documentada |
</phase_requirements>

---

## Resumo

O `backend/server.js` atual é um arquivo monolítico de ~406 linhas com cinco vulnerabilidades críticas confirmadas: senhas em texto plano, nenhum middleware de autenticação JWT, IDOR em todas as rotas de usuário, CORS com wildcard `*`, e uma função de seed de produção (`garantirAtividadeFuncoes`) que cria dados fictícios a cada chamada de endpoint de progresso. O banco de dados já tem o campo `senha VARCHAR(255)` dimensionado para o hash bcrypt, então nenhuma migração de schema é necessária para a coluna — apenas para os dados existentes.

O `acesso.js` do frontend atualmente retorna apenas `resultado.usuario` da resposta da API (linha 40), ignora qualquer token, e todas as chamadas `fetch` em `aluno.js` são feitas sem cabeçalho `Authorization`. Isso significa que dois arquivos de frontend são modificados nesta fase: `acesso.js` (para salvar o token) e `aluno.js` (para injetar `Authorization` em cada chamada). Cada página HTML protegida (`aluno.html`, `professor.html`, etc.) também precisa de um guard de rota.

A refatoração do `server.js` segue um padrão Express padrão: `routes/` contém a definição de rotas com middlewares, `controllers/` contém os handlers (lógica de negócio), `middleware/` contém `auth.js` e `errorHandler.js`. O `server.js` se torna apenas o ponto de entrada com `app.use()`.

**Recomendação primária:** Resolva as vulnerabilidades na ordem: (1) bcrypt + JWT no login, (2) middleware JWT aplicado a todas as rotas, (3) verificações IDOR, (4) substituir CORS manual pelo pacote `cors`, (5) refatorar estrutura de módulos, (6) guards de rota no frontend.

---

## Mapa de Responsabilidade Arquitetural

| Capacidade | Tier Primário | Tier Secundário | Justificativa |
|------------|---------------|-----------------|---------------|
| Hash de senha (bcrypt) | API / Backend | — | Nunca executar lógica criptográfica no browser |
| Emissão de token JWT | API / Backend | — | O segredo JWT deve permanecer no servidor |
| Validação de token JWT | API / Backend (middleware) | — | Verificação deve ser feita em cada requisição antes de qualquer lógica |
| Verificação IDOR | API / Backend (handler) | — | Comparação `req.usuario.id` vs `req.params.id` acontece no servidor |
| Configuração CORS | API / Backend | — | Header de resposta, determinado pelo servidor |
| Armazenamento de token | Browser / Client (localStorage) | — | Padrão para SPA/vanilla JS sem cookies |
| Guards de rota | Browser / Client | — | Verificação de token no carregamento da página; defesa superficial (o backend é a defesa real) |
| Seed data removal | API / Backend | — | Função `garantirAtividadeFuncoes()` está no servidor |

---

## Stack Padrão

### Core
| Biblioteca | Versão | Propósito | Por que padrão |
|------------|--------|-----------|----------------|
| `bcrypt` | 6.0.0 | Hash e comparação de senhas | Bindings nativos C++; timing-safe; padrão Node.js de fato para senhas |
| `jsonwebtoken` | 9.0.3 | Emissão e verificação de JWTs | Biblioteca oficial da Auth0; API estável desde v9 |
| `helmet` | 8.2.0 | HTTP security headers (CSP, HSTS, etc.) | Uma linha, uma dúzia de headers; padrão Express |
| `cors` | 2.8.6 | Configuração de CORS via env var | Pacote oficial do expressjs; substitui o CORS manual atual |
| `express-rate-limit` | 8.5.2 | Rate limiting de endpoints | Padrão Express; leve e sem dependências |
| `express-validator` | 7.3.2 | Validação de inputs nas rotas | Integra-se diretamente com middleware Express |

### Instalação
```bash
cd backend
npm install bcrypt@6.0.0 jsonwebtoken@9.0.3 helmet@8.2.0 cors express-rate-limit@8.5.2 express-validator@7.3.2
```

> **Nota:** `cors` não tem versão fixada — a versão atual `2.8.6` é estável há anos. Não instalar via versão específica evita conflitos se o Express atualizar.

---

## Auditoria de Legitimidade de Pacotes

> slopcheck não estava disponível neste ambiente (Windows, sem Python). Todos os pacotes foram verificados manualmente via `npm view` contra registros oficiais e repositórios fonte conhecidos.

| Pacote | Registro | Última modificação | Repositório fonte | slopcheck | Disposição |
|--------|----------|--------------------|-------------------|-----------|------------|
| `bcrypt` | npm | 2026-03-28 | github.com/kelektiv/node.bcrypt.js | [ASSUMED OK] | Aprovado |
| `jsonwebtoken` | npm | 2026-04-16 | github.com/auth0/node-jsonwebtoken | [ASSUMED OK] | Aprovado |
| `helmet` | npm | 2026-05-22 | github.com/helmetjs/helmet | [ASSUMED OK] | Aprovado |
| `express-rate-limit` | npm | 2026-05-14 | github.com/express-rate-limit/express-rate-limit | [ASSUMED OK] | Aprovado |
| `cors` | npm | 2026-01-22 | github.com/expressjs/cors | [ASSUMED OK] | Aprovado |
| `express-validator` | npm | (verificado) | github.com/express-validator/express-validator | [ASSUMED OK] | Aprovado |

**Pacotes removidos por [SLOP]:** nenhum  
**Pacotes sinalizados como suspeitos:** nenhum — todos os 6 possuem repositórios em organizações reconhecidas (kelektiv, auth0, helmetjs, express-rate-limit org, expressjs)

*Como slopcheck estava indisponível, todos os pacotes estão marcados como `[ASSUMED]`. O planner deve verificar antes da instalação se necessário.*

---

## Estado Atual do Código (Auditoria)

### `backend/server.js` — Inventário de vulnerabilidades confirmadas

```
Arquivo: backend/server.js
Tamanho: ~406 linhas
Estrutura: monolítico (todas as rotas inline)
```

**VULN-1 — Senha em texto plano (linhas 170-172 e 201-208)**
```js
// Cadastro: INSERT direto com senha em claro
"INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)",
[nome, email, senha, perfil]   // ← senha é o texto digitado pelo usuário

// Login: comparação direta no SQL
"SELECT id, nome, email, perfil FROM usuarios WHERE email = ? AND senha = ? AND perfil = ?"
[email, senha, perfil]         // ← senha comparada no banco sem hash
```

**VULN-2 — Sem middleware JWT (toda a aplicação)**  
Não existe nenhum middleware de autenticação. Qualquer `fetch` para qualquer rota retorna dados sem verificação de identidade.

**VULN-3 — IDOR em 4 rotas (linhas 216, 233, 276, 300, 341, 369)**
```
GET  /api/usuarios/:id              — qualquer um pode ler dados de qualquer usuário
PUT  /api/usuarios/:id              — qualquer um pode alterar dados de qualquer usuário
GET  /api/usuarios/:id/preferencias — qualquer um pode ler preferências de qualquer usuário
PUT  /api/usuarios/:id/preferencias — qualquer um pode alterar preferências de qualquer usuário
GET  /api/alunos/:id/progresso/funcoes — qualquer um pode ler progresso de qualquer aluno
POST /api/alunos/:id/progresso/funcoes — qualquer um pode modificar progresso de qualquer aluno
```

**VULN-4 — CORS com wildcard (linhas 22-32)**
```js
res.setHeader("Access-Control-Allow-Origin", "*");
res.setHeader("Access-Control-Allow-Headers", "Content-Type");  // ← Não inclui Authorization
```
Problema duplo: wildcard + o header `Authorization` não está na allowlist, o que vai quebrar quando o token JWT for adicionado.

**VULN-5 — Seed de produção `garantirAtividadeFuncoes()` (linhas 34-94)**  
Chamada em toda requisição para `GET /api/alunos/:id/progresso/funcoes` e `POST /api/alunos/:id/progresso/funcoes`. Cria:
- Usuário `Prof. Ana Paula` (ana@duopratic.local) com senha `123456` em plaintext
- Turma `Matematica - 1 ano` com código `MAT-102`
- Atividade `Funcoes do 1 grau`
- Vinculação do aluno na turma fictícia

**PROBLEMA SECUNDÁRIO — Schema duplicado (linhas 96-119)**  
`garantirTabelaPreferencias()` recria a tabela `preferencias_usuario` via `CREATE TABLE IF NOT EXISTS` em cada requisição de preferências. A mesma tabela já existe em `database/schema.sql` linhas 80-92. Deve ser removida do server.js.

**PROBLEMA SECUNDÁRIO — `PUT /api/usuarios/:id` aceita nova senha em plaintext (linhas 233-274)**  
```js
if (senha) {
    campos.push("senha = ?");
    valores.push(senha);  // ← sem hash bcrypt
}
```
Este endpoint ficará quebrado pós-migração se não for corrigido junto com o cadastro.

### `backend/db.js` — Nenhum problema
Pool `mysql2/promise` bem configurado. Nenhuma alteração necessária nesta fase.

### `assets/js/acesso.js` — Landmines de frontend

```js
// Linha 40 — retorna apenas usuario, ignora token
return resultado.usuario;

// Linha 56 — salva apenas o objeto usuario no localStorage
localStorage.setItem("duopratic_usuario", JSON.stringify(usuario));
```

Após a fase 1, a resposta do login será `{ status, token, usuario }`. O `acesso.js` precisa:
1. Salvar `resultado.token` em `localStorage` como `duopratic_token`
2. Continuar salvando `resultado.usuario` como antes (as páginas leem `duopratic_usuario`)

### `assets/js/aluno.js` — Todas as chamadas `fetch` sem `Authorization`

```js
// Linha 37 — sem Authorization header
const resposta = await fetch(`/api/usuarios/${usuario.id}/preferencias`);

// Linha 75 — sem Authorization header
const resposta = await fetch(`/api/usuarios/${usuario.id}`);

// Linha 56 — sem Authorization header
const resposta = await fetch(`/api/usuarios/${usuario.id}/preferencias`, {
    method: "PUT", ...
});
```

Todas as chamadas precisam incluir `Authorization: Bearer <token>`.

---

## Padrões de Arquitetura

### Diagrama de Fluxo — Autenticação JWT

```
Browser                     Express                    MySQL
  |                             |                         |
  |-- POST /api/login --------> |                         |
  |   { email, senha, perfil }  |-- SELECT usuarios ----> |
  |                             |<-- { id, nome, hash } --|
  |                             |                         |
  |                             | bcrypt.compare()        |
  |                             | jwt.sign({ id, perfil })|
  |<-- { token, usuario } ------|                         |
  |                             |                         |
  | localStorage.setItem(token) |                         |
  |                             |                         |
  |-- GET /api/usuarios/42 ---> |                         |
  |   Authorization: Bearer ... | middleware autenticar() |
  |                             | jwt.verify() → req.usuario
  |                             | IDOR check              |
  |                             |-- SELECT usuarios ----> |
  |<-- { status, usuario } -----|                         |
```

### Estrutura de Módulos de Destino

```
backend/
├── server.js                  # Entry point — apenas app.use() e app.listen()
├── db.js                      # Pool MySQL (sem alterações)
├── .env                       # JWT_SECRET, GEMINI_API_KEY, CORS_ORIGIN, DB_*
├── middleware/
│   ├── auth.js                # Middleware JWT — verifica token, popula req.usuario
│   └── errorHandler.js        # 404 + 500 globais (usado em Fase 5)
├── routes/
│   ├── auth.js                # POST /api/cadastro, POST /api/login
│   ├── usuarios.js            # GET/PUT /api/usuarios/:id e /preferencias
│   └── alunos.js              # GET/POST /api/alunos/:id/progresso/*
└── controllers/
    ├── authController.js      # lógica de cadastro e login
    ├── usuariosController.js  # lógica de get/update usuário e preferências
    └── alunosController.js    # lógica de progresso (sem seed data)
```

---

## Padrões de Código

### Padrão 1: Hash bcrypt no Cadastro

```js
// controllers/authController.js
const bcrypt = require("bcrypt");
const CUSTO_BCRYPT = 12; // boa prática para hardware 2025

async function cadastrar(req, res) {
    const { nome, email, senha, perfil } = req.body;

    if (!nome || !email || !senha || !perfil) {
        return res.status(400).json({ status: "erro", message: "Preencha todos os campos." });
    }
    if (!["aluno", "professor"].includes(perfil)) {
        return res.status(400).json({ status: "erro", message: "Perfil inválido." });
    }

    try {
        const hash = await bcrypt.hash(senha, CUSTO_BCRYPT); // ← hash antes do INSERT
        const [resultado] = await banco.query(
            "INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)",
            [nome, email, hash, perfil]  // ← hash, não senha
        );
        res.status(201).json({
            status: "ok",
            usuario: { id: resultado.insertId, nome, email, perfil }
        });
    } catch (erro) {
        if (erro.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ status: "erro", message: "Este e-mail já está cadastrado." });
        }
        res.status(500).json({ status: "erro", message: "Erro ao cadastrar usuário." });
    }
}
```

### Padrão 2: Login com bcrypt.compare e emissão JWT

```js
// controllers/authController.js
const jwt = require("jsonwebtoken");

async function login(req, res) {
    const { email, senha, perfil } = req.body;

    if (!email || !senha || !perfil) {
        return res.status(400).json({ status: "erro", message: "Preencha todos os campos." });
    }

    try {
        // Busca por email + perfil; NÃO inclui senha no WHERE — comparação é feita em JS
        const [usuarios] = await banco.query(
            "SELECT id, nome, email, perfil, senha FROM usuarios WHERE email = ? AND perfil = ? LIMIT 1",
            [email, perfil]
        );

        if (!usuarios.length) {
            return res.status(401).json({ status: "erro", message: "E-mail, senha ou perfil inválidos." });
        }

        const usuario = usuarios[0];
        const senhaCorreta = await bcrypt.compare(senha, usuario.senha); // ← timing-safe

        if (!senhaCorreta) {
            return res.status(401).json({ status: "erro", message: "E-mail, senha ou perfil inválidos." });
        }

        const token = jwt.sign(
            { id: usuario.id, perfil: usuario.perfil },
            process.env.JWT_SECRET,
            { expiresIn: "8h" }
        );

        // Não enviar campo senha na resposta
        const { senha: _, ...usuarioSeguro } = usuario;
        res.json({ status: "ok", token, usuario: usuarioSeguro });
    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao entrar." });
    }
}
```

### Padrão 3: Middleware JWT

```js
// middleware/auth.js
const jwt = require("jsonwebtoken");

function autenticar(req, res, next) {
    const cabecalho = req.headers.authorization;

    if (!cabecalho || !cabecalho.startsWith("Bearer ")) {
        return res.status(401).json({ status: "erro", message: "Não autenticado." });
    }

    const token = cabecalho.slice(7); // remove "Bearer "

    try {
        req.usuario = jwt.verify(token, process.env.JWT_SECRET);
        // req.usuario agora contém { id, perfil, iat, exp }
        next();
    } catch {
        // jwt.verify lança se expirado ou inválido
        res.status(401).json({ status: "erro", message: "Token inválido ou expirado." });
    }
}

module.exports = { autenticar };
```

### Padrão 4: Verificação IDOR por rota

```js
// Aplicar em GET /api/usuarios/:id, PUT /api/usuarios/:id, GET/PUT /api/usuarios/:id/preferencias
function verificarProprioUsuario(req, res, next) {
    const idRequisitado = parseInt(req.params.id, 10);

    // Professor pode acessar dados de qualquer usuário; aluno só o próprio
    if (req.usuario.id !== idRequisitado && req.usuario.perfil !== "professor") {
        return res.status(403).json({ status: "erro", message: "Acesso negado." });
    }
    next();
}

// Para rotas de aluno (progresso): apenas o próprio aluno
function verificarProprioAluno(req, res, next) {
    const idRequisitado = parseInt(req.params.id, 10);

    if (req.usuario.id !== idRequisitado) {
        return res.status(403).json({ status: "erro", message: "Acesso negado." });
    }
    next();
}
```

**Uso nas rotas:**
```js
// routes/usuarios.js
router.get("/:id", autenticar, verificarProprioUsuario, usuariosController.getUsuario);
router.put("/:id", autenticar, verificarProprioUsuario, usuariosController.atualizarUsuario);
router.get("/:id/preferencias", autenticar, verificarProprioUsuario, usuariosController.getPreferencias);
router.put("/:id/preferencias", autenticar, verificarProprioUsuario, usuariosController.atualizarPreferencias);

// routes/alunos.js
router.get("/:id/progresso/funcoes", autenticar, verificarProprioAluno, alunosController.getProgresso);
router.post("/:id/progresso/funcoes", autenticar, verificarProprioAluno, alunosController.salvarProgresso);
```

### Padrão 5: Configuração CORS com `cors` package

```js
// server.js — substituir o middleware manual atual
const cors = require("cors");
const helmet = require("helmet");

// Antes de qualquer rota
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]  // Authorization é crítico!
}));
```

> ⚠️ **Atenção:** O CORS manual atual não inclui `Authorization` em `Access-Control-Allow-Headers`. Se o middleware JWT for adicionado sem substituir o CORS, os browsers vão rejeitar as requisições com preflight CORS antes de chegar no backend.

### Padrão 6: `server.js` como entry point limpo

```js
// server.js — pós-refatoração
require("dotenv").config();

const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");

const rotasAuth = require("./routes/auth");
const rotasUsuarios = require("./routes/usuarios");
const rotasAlunos = require("./routes/alunos");

const app = express();
const porta = process.env.PORT || 3000;
const pastaPublica = path.resolve(__dirname, "..");

app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(express.static(pastaPublica));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api", rotasAuth);
app.use("/api/usuarios", rotasUsuarios);
app.use("/api/alunos", rotasAlunos);

app.get("/", (_req, res) => res.sendFile(path.join(pastaPublica, "index.html")));

app.listen(porta, () => {
    console.log(`Servidor DuoPratic online na porta ${porta}`);
});
```

### Padrão 7: Guards de rota no frontend (vanilla JS)

```js
// Adicionar no INÍCIO do bloco de script de cada página protegida
// (antes de qualquer chamada à API)

function usuarioLogado() {
    try {
        return JSON.parse(localStorage.getItem("duopratic_usuario")) || null;
    } catch {
        return null;
    }
}

function tokenSalvo() {
    return localStorage.getItem("duopratic_token") || null;
}

// Guard para páginas de aluno
const usuario = usuarioLogado();
const token = tokenSalvo();

if (!usuario || !token) {
    window.location.href = "/pages/login.html";
} else if (usuario.perfil !== "aluno") {
    window.location.href = "/pages/professor.html";
}
```

**Para páginas de professor:**
```js
if (!usuario || !token) {
    window.location.href = "/pages/login.html";
} else if (usuario.perfil !== "professor") {
    window.location.href = "/pages/aluno.html";
}
```

### Padrão 8: Injeção de token em chamadas fetch

Todas as chamadas `fetch` autenticadas em `aluno.js` precisam incluir o header:

```js
// Utilitário reutilizável — pode ser extraído para assets/js/api.js
function authHeaders() {
    const token = localStorage.getItem("duopratic_token");
    return {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };
}

// Uso:
const resposta = await fetch(`/api/usuarios/${usuario.id}/preferencias`, {
    headers: authHeaders()
});

// Para PUT/POST:
const resposta = await fetch(`/api/usuarios/${usuario.id}/preferencias`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ [campo]: valor })
});
```

### Padrão 9: Migração de senhas existentes (usuários cadastrados com texto plano)

```js
// Script de migração a ser executado UMA VEZ no banco de desenvolvimento
// backend/scripts/migrar-senhas.js
const banco = require("../db");
const bcrypt = require("bcrypt");

async function migrarSenhas() {
    const [usuarios] = await banco.query(
        "SELECT id, senha FROM usuarios WHERE LENGTH(senha) < 60"
        // hashes bcrypt têm sempre 60 caracteres; senhas curtas são texto plano
    );

    console.log(`Migrando ${usuarios.length} usuário(s)...`);

    for (const u of usuarios) {
        const hash = await bcrypt.hash(u.senha, 12);
        await banco.query("UPDATE usuarios SET senha = ? WHERE id = ?", [hash, u.id]);
        console.log(`  Usuário ${u.id} migrado.`);
    }

    console.log("Migração concluída.");
    process.exit(0);
}

migrarSenhas().catch(console.error);
```

> **Por que LENGTH(senha) < 60?** Um hash bcrypt tem exatamente 60 caracteres no formato `$2b$12$...`. Senhas em texto plano são tipicamente muito mais curtas. Esta heurística é segura para o banco de desenvolvimento onde sabemos que os dados são fictícios.

### Padrão 10: `PUT /api/usuarios/:id` — hash de senha na atualização

```js
// controllers/usuariosController.js — atualização de senha
if (senha) {
    campos.push("senha = ?");
    const hash = await bcrypt.hash(senha, 12); // ← obrigatório
    valores.push(hash);
}
```

### Padrão 11: Remover seed data — controller de progresso sem `garantirAtividadeFuncoes`

```js
// controllers/alunosController.js — GET /api/alunos/:id/progresso/funcoes
// SEM chamada a garantirAtividadeFuncoes()
async function getProgressoFuncoes(req, res) {
    try {
        const alunoId = parseInt(req.params.id, 10);

        // Verificar se aluno existe (req.usuario.id já foi verificado pelo middleware IDOR)
        const [entregas] = await banco.query(
            `SELECT e.status, e.enviado_em
             FROM entregas e
             JOIN atividades a ON a.id = e.atividade_id
             WHERE e.aluno_id = ?
               AND a.titulo = 'Funcoes do 1 grau'
             LIMIT 1`,
            [alunoId]
        );

        const entrega = entregas[0];
        const concluido = ["entregue", "corrigida"].includes(entrega?.status);

        res.json({
            status: "ok",
            entrega: entrega?.status || "pendente",
            concluido,
            progresso: concluido ? 85 : 72  // hardcoded ainda — será real na Fase 3
        });
    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao buscar progresso." });
    }
}
```

> **Nota:** Os valores `85` e `72` de progresso continuam hardcoded. Isso está fora do escopo da Fase 1 (INFRA-02 trata apenas de remover o seed; os valores reais são da Fase 3 ALUN-01). Documente isso para evitar regressão.

---

## O que Não Implementar Manualmente

| Problema | Não construir | Usar em vez | Por quê |
|----------|---------------|-------------|---------|
| CORS | Headers manuais customizados | `cors` package | O manual atual esqueceu `Authorization`; o package lida com preflight corretamente |
| Hashing de senha | MD5, SHA-256, ou bcryptjs puro-JS | `bcrypt` (bindings nativos) | 2-3x mais rápido no servidor; timing-safe |
| Verificação de token | Decode manual de JWT base64 | `jwt.verify()` | Verificação de assinatura e expiração automáticas |
| Rate limiting | Contador em memória caseiro | `express-rate-limit` | Lida com reinicialização de servidor, janelas deslizantes, headers padrão |
| Security headers | `res.setHeader()` um a um | `helmet()` | Cobre CSP, HSTS, X-Frame-Options, X-Content-Type — impossível replicar sem erro |

---

## Armadilhas Comuns

### Armadilha 1: CORS quebra com `Authorization` header
**O que dá errado:** Adicionar JWT sem atualizar o CORS. O browser envia preflight `OPTIONS` pedindo permissão para `Authorization`, o servidor CORS retorna apenas `Content-Type` na allowlist, e o browser bloqueia a requisição antes de chegar no Express.  
**Por que acontece:** O CORS manual atual (linhas 22-32) só lista `"Content-Type"` em `Access-Control-Allow-Headers`.  
**Como evitar:** Substituir o CORS manual pelo `cors` package com `allowedHeaders: ["Content-Type", "Authorization"]` ANTES de adicionar qualquer middleware JWT.  
**Sinal de alerta:** Erros de `CORS policy: Request header field authorization is not allowed` no console do browser.

### Armadilha 2: `garantirTabelaPreferencias()` precisa ser removida junto com `garantirAtividadeFuncoes()`
**O que dá errado:** Focar apenas em remover a seed data e esquecer que `garantirTabelaPreferencias()` ainda executa `CREATE TABLE IF NOT EXISTS` em toda requisição de preferências.  
**Por que acontece:** A função está integrada no fluxo `garantirPreferencias()` chamado em dois endpoints.  
**Como evitar:** Ao refatorar para `controllers/usuariosController.js`, remover ambas as chamadas a `garantirTabelaPreferencias()` e `garantirPreferencias()`. A tabela `preferencias_usuario` já existe em `schema.sql`.

### Armadilha 3: `acesso.js` só salva `resultado.usuario`, ignora token
**O que dá errado:** Após implementar JWT no backend, o login funciona mas o frontend nunca salva o token. Todos os fetches subsequentes falham com 401.  
**Por que acontece:** Linha 40 de `acesso.js` retorna apenas `resultado.usuario`. A API passará a retornar `{ status, token, usuario }` mas o front só lê `usuario`.  
**Como evitar:** Atualizar `acesso.js` linha 56 para salvar `resultado.token` em `localStorage.setItem("duopratic_token", resultado.token)` além do `usuario`.

### Armadilha 4: `PUT /api/usuarios/:id` salva nova senha sem bcrypt
**O que dá errado:** Usuário altera a senha nas configurações; a nova senha é salva em texto plano enquanto a senha de cadastro agora está hasheada. Próximo login falha porque o bcrypt.compare compara texto plano com texto plano (funciona) mas se o usuário tiver migrado o hash antes, compara hash com texto plano (quebra).  
**Por que acontece:** O handler de atualização (linhas 233-274) não aplica bcrypt.hash ao novo valor de senha.  
**Como evitar:** Tratar `senha` no `PUT /api/usuarios/:id` com `bcrypt.hash(senha, 12)` antes de persistir.

### Armadilha 5: Ordem das rotas públicas vs protegidas
**O que dá errado:** Aplicar `autenticar` globalmente via `app.use(autenticar)` e depois descobrir que `/api/health`, `/api/cadastro`, e `/api/login` passam a exigir token, quebrando o fluxo de registro.  
**Como evitar:** Aplicar o middleware `autenticar` por rota ou por roteador, nunca globalmente. Apenas as rotas após o login devem ter o middleware.

### Armadilha 6: `parseInt(req.params.id)` vs `req.usuario.id`
**O que dá errado:** A comparação IDOR `req.usuario.id !== req.params.id` retorna sempre `true` porque `req.params.id` é uma string (`"42"`) e `req.usuario.id` é um número (`42`). Todo usuário recebe 403.  
**Como evitar:** Sempre fazer `parseInt(req.params.id, 10)` antes de comparar. Ou `String(req.usuario.id) !== req.params.id`.

### Armadilha 7: `pastaPublica` serve o diretório raiz do projeto
**O que dá errado (nota de observação):** `app.use(express.static(pastaPublica))` serve `path.resolve(__dirname, "..")` — isso expõe `database/schema.sql`, `.planning/`, `.env.example` como arquivos estáticos.  
**Ação nesta fase:** Não está no escopo da Fase 1 mudar isso, mas anotar para a Fase 5 (INFRA-05). Garanta que o `.env` real NUNCA fica na raiz do projeto ou seja servido como estático.

---

## Variáveis de Ambiente — `.env.example` Atualizado

```dotenv
# Banco de Dados
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=duopratic
DB_PORT=3306

# Servidor
PORT=3000

# Segurança
JWT_SECRET=troque_para_string_aleatoria_minimo_32_chars
CORS_ORIGIN=http://localhost:3000

# IA (Fase 4)
GEMINI_API_KEY=sua_chave_do_google_ai_studio
```

---

## Inventário de Runtime State

> Fase de segurança envolve migração de senhas existentes — verificando estado de runtime.

| Categoria | Itens encontrados | Ação necessária |
|-----------|-------------------|-----------------|
| Dados armazenados | Tabela `usuarios.senha`: senhas em texto plano para usuários de dev existentes | Script de migração bcrypt a ser executado uma vez |
| Dados armazenados | Tabela `usuarios`: usuário `Prof. Ana Paula` (ana@duopratic.local) criado pela seed function | Remoção manual ou limpeza do banco de dev (dados fictícios) |
| Configuração de serviço vivo | `localStorage` do browser: chave `duopratic_usuario` sem token | Usuários existentes precisarão fazer login novamente após a mudança |
| Estado registrado no OS | Nenhum task scheduler, pm2, ou serviço registrado identificado | Nenhuma ação necessária |
| Secrets/env vars | `.env.example` atual não tem `JWT_SECRET` ou `CORS_ORIGIN` | Atualizar `.env.example`; desenvolvedores copiam para `.env` |
| Build artifacts | `node_modules/` não inclui pacotes de segurança (bcrypt, jwt, etc.) | `npm install` com novos pacotes |

---

## Arquitetura de Validação

### Framework de Testes
Esta fase não inclui testes automatizados (projeto TCC sem infraestrutura de testes pré-existente). Validação é manual via curl/Postman e inspeção direta do banco.

| Propriedade | Valor |
|-------------|-------|
| Framework | Nenhum — validação manual com curl |
| Arquivo de config | N/A |
| Comando rápido | `curl -X POST http://localhost:3000/api/login` |

### Mapa de Requisitos → Validação

| Req ID | Comportamento | Tipo de Teste | Comando de Validação |
|--------|--------------|---------------|---------------------|
| AUTH-01 | Senha hasheada no banco | Inspeção SQL | `SELECT email, senha FROM usuarios` — deve mostrar `$2b$12$...` |
| AUTH-01 | Cadastro cria hash | curl | `curl -X POST /api/cadastro` + inspecionar banco |
| AUTH-02 | Rotas bloqueiam sem token | curl | `curl /api/usuarios/1` sem header → deve retornar 401 |
| AUTH-03 | Login retorna token | curl | `curl -X POST /api/login` → resposta deve conter campo `token` |
| AUTH-03 | Token válido libera rota | curl | `curl -H "Authorization: Bearer <token>" /api/usuarios/1` → 200 |
| AUTH-04 | Sessão persiste | Browser | Recarregar página após login → continua logado |
| AUTH-05 | CORS bloqueia origens desconhecidas | Browser DevTools | Requisição de porta diferente → bloqueada com erro CORS |
| AUTH-05 | `Authorization` header no CORS | curl OPTIONS | `curl -X OPTIONS /api/usuarios/1 -H "Access-Control-Request-Headers: Authorization"` → `Access-Control-Allow-Headers` contém `authorization` |
| AUTH-06 | Aluno não acessa dados alheios | curl | Token do usuário 1, requisição para `/api/usuarios/2` → 403 |
| AUTH-06 | Aluno acessa próprios dados | curl | Token do usuário 1, requisição para `/api/usuarios/1` → 200 |
| INFRA-01 | `server.js` é só entry point | Inspeção manual | Abrir `server.js` — não deve ter nenhum handler inline |
| INFRA-02 | Seed data não aparece | curl + SQL | `GET /api/alunos/1/progresso/funcoes` → sem criar Prof. Ana Paula; `SELECT * FROM usuarios WHERE email = 'ana@duopratic.local'` → vazio |

### Verificação Detalhada por Vulnerabilidade

**Verificar AUTH-01 (bcrypt)**
```bash
# 1. Criar usuário de teste
curl -X POST http://localhost:3000/api/cadastro \
  -H "Content-Type: application/json" \
  -d '{"nome":"Teste","email":"teste@test.com","senha":"minhasenha","perfil":"aluno"}'

# 2. Inspecionar banco — senha deve começar com $2b$
mysql -u root duopratic -e "SELECT email, LEFT(senha, 20) AS hash_inicio FROM usuarios WHERE email='teste@test.com'"
# Esperado: $2b$12$...

# 3. Login deve funcionar
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@test.com","senha":"minhasenha","perfil":"aluno"}'
# Esperado: { "status": "ok", "token": "eyJ...", "usuario": {...} }
```

**Verificar AUTH-02/AUTH-03 (JWT middleware)**
```bash
# Sem token — deve retornar 401
curl http://localhost:3000/api/usuarios/1
# Esperado: {"status":"erro","message":"Não autenticado."}

# Com token válido — deve retornar dados
TOKEN="eyJ..." # token do login acima
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/usuarios/1
# Esperado: {"status":"ok","usuario":{...}}

# Com token expirado/inválido — deve retornar 401
curl -H "Authorization: Bearer tokeninvalido" http://localhost:3000/api/usuarios/1
# Esperado: {"status":"erro","message":"Token inválido ou expirado."}
```

**Verificar AUTH-06 (IDOR)**
```bash
# Criar dois usuários, fazer login com o usuário 1
# Tentar acessar dados do usuário 2 com token do usuário 1
curl -H "Authorization: Bearer $TOKEN_USUARIO_1" http://localhost:3000/api/usuarios/2
# Esperado: {"status":"erro","message":"Acesso negado."} — HTTP 403
```

**Verificar INFRA-02 (sem seed data)**
```bash
# Chamar endpoint de progresso (endpoint que antes chamava garantirAtividadeFuncoes)
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/alunos/1/progresso/funcoes

# Verificar que não criou dados de seed
mysql -u root duopratic -e "SELECT COUNT(*) FROM usuarios WHERE email = 'ana@duopratic.local'"
# Esperado: 0
```

---

## Disponibilidade de Ambiente

| Dependência | Requerida por | Disponível | Versão | Fallback |
|-------------|--------------|------------|--------|----------|
| Node.js | Backend Express | ✓ | (instalado — projeto existente funciona) | — |
| npm | Instalar pacotes | ✓ | (confirmado via package.json) | — |
| MySQL | Banco de dados | ✓ | (projeto já conecta) | — |

---

## Domínio de Segurança

### Categorias ASVS Aplicáveis

| Categoria ASVS | Aplica | Controle padrão |
|----------------|--------|-----------------|
| V2 Autenticação | sim | bcrypt para senhas; JWT para sessão |
| V3 Gerenciamento de Sessão | sim | JWT com expiração `8h`; token em localStorage |
| V4 Controle de Acesso | sim | Verificação IDOR por rota |
| V5 Validação de Input | sim | `express-validator` nas rotas de auth |
| V6 Criptografia | sim | bcrypt (nunca MD5/SHA sem salt) |

### Padrões de Ameaça Conhecidos

| Padrão | STRIDE | Mitigação padrão |
|--------|--------|------------------|
| Acesso a senhas via dump do banco | Information Disclosure | bcrypt — hash irreversível com salt único por senha |
| Requisição sem autenticação a endpoints privados | Elevation of Privilege | Middleware JWT em todas as rotas protegidas |
| Aluno acessando dados de outro aluno | Information Disclosure | Verificação `req.usuario.id === parseInt(req.params.id)` |
| Cross-origin request maliciosa | Tampering | CORS restrito ao `CORS_ORIGIN` env var |
| Brute force de login | Elevation of Privilege | `express-rate-limit` em `/api/login` e `/api/cadastro` |

---

## Suposições

| # | Afirmação | Seção | Risco se errado |
|---|-----------|-------|-----------------|
| A1 | Todos os pacotes marcados [ASSUMED OK] são legítimos (slopcheck indisponível neste ambiente) | Package Legitimacy Audit | Baixo — pacotes têm histórico verificável e repos fonte conhecidos |
| A2 | Senhas em texto plano no banco têm menos de 60 caracteres (heurística de migração) | Padrão 9 | Médio — se alguma senha em texto plano tiver 60+ chars, não será migrada; mitigável verificando o formato `$2b$` explicitamente |
| A3 | O frontend não usa outras páginas HTML além das listadas em `pages/` que precisam de guard | Padrão 7 | Baixo — auditoria visual das 10 páginas confirmadas |

---

## Fontes

### Primárias (HIGH confidence)
- Leitura direta de `backend/server.js` — inventário completo de vulnerabilidades confirmadas
- Leitura direta de `assets/js/acesso.js` e `aluno.js` — state do frontend confirmado
- Leitura direta de `database/schema.sql` — schema confirmado (`senha VARCHAR(255)`, compatível com bcrypt)
- `npm view bcrypt|jsonwebtoken|helmet|express-rate-limit|cors|express-validator version` — versões confirmadas no registro npm
- Repositórios fonte confirmados via `npm view <pkg> repository.url`
- `.planning/research/STACK.md` — pesquisa de stack anterior com padrões verificados via Context7
- `.planning/research/PITFALLS.md` — auditoria de segurança anterior com localizações de linha confirmadas

### Secundárias (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` — padrões de arquitetura para a estrutura de módulos

---

## Metadata

**Breakdown de confiança:**
- Vulnerabilidades identificadas: HIGH — confirmadas via leitura direta do código
- Stack padrão: HIGH — versões verificadas no registro npm; repos fonte confirmados
- Padrões de código: HIGH — padrões bcrypt/JWT bem estabelecidos; verificados em pesquisa anterior via Context7
- Padrões de frontend: HIGH — baseados no código `acesso.js`/`aluno.js` lido diretamente

**Data da pesquisa:** 2026-05-22  
**Válido até:** 2026-06-22 (bibliotecas estáveis; versões do Express/Node não mudaram)
