# Fase 1: Segurança e Fundação — Mapa de Padrões

**Mapeado:** 2026-05-22  
**Arquivos analisados:** 16 (novos/modificados na fase)  
**Análogos encontrados:** 14 / 16

---

## Classificação de Arquivos

| Arquivo Novo / Modificado | Papel | Fluxo de Dados | Análogo Mais Próximo | Qualidade |
|---------------------------|-------|----------------|----------------------|-----------|
| `backend/middleware/auth.js` | middleware | request-response | `backend/server.js` linhas 22-32 (CORS manual) | role-match |
| `backend/middleware/errorHandler.js` | middleware | request-response | `backend/server.js` linhas 148-155, 184-190 (catch inline) | role-match |
| `backend/routes/auth.js` | route | request-response | `backend/server.js` linhas 158-214 (`/api/cadastro`, `/api/login`) | **exact** |
| `backend/routes/usuarios.js` | route | CRUD | `backend/server.js` linhas 216-338 (rotas `/api/usuarios/:id`) | **exact** |
| `backend/routes/alunos.js` | route | CRUD | `backend/server.js` linhas 341-397 (rotas `/api/alunos/:id`) | **exact** |
| `backend/controllers/authController.js` | controller | request-response | `backend/server.js` linhas 158-214 (handlers inline de cadastro/login) | **exact** |
| `backend/controllers/usuariosController.js` | controller | CRUD | `backend/server.js` linhas 216-338 (handlers inline de usuários) | **exact** |
| `backend/controllers/alunosController.js` | controller | CRUD | `backend/server.js` linhas 341-397 (handlers inline de progresso) | **exact** |
| `backend/server.js` *(refatorado)* | config | request-response | `backend/server.js` linhas 1-32 (ponto de entrada atual) | **exact** |
| `assets/js/acesso.js` *(modificado)* | utility | request-response | `assets/js/acesso.js` linhas 18-65 (fetch de login/cadastro) | **exact** |
| `assets/js/aluno.js` *(modificado)* | utility | request-response | `assets/js/aluno.js` linhas 32-104 (fetch de preferências/usuário) | **exact** |
| `assets/js/auth-guard.js` *(novo)* | utility | request-response | `assets/js/acesso.js` linhas 43-65 (lógica de redirecionamento) | role-match |
| `pages/login.html` *(modificado)* | — | — | `pages/login.html` atual | **exact** |
| `pages/cadastro.html` *(modificado)* | — | — | `pages/cadastro.html` atual | **exact** |
| `pages/aluno.html` *(modificado)* | — | — | `pages/aluno.html` atual | **exact** |
| `backend/.env` *(modificado)* | config | — | `backend/.env.example` | **exact** |

---

## Padrões por Arquivo

---

### `backend/middleware/auth.js` (middleware, request-response)

**Análogo:** `backend/server.js` — middleware CORS manual (linhas 22-32) como estrutura de middleware; lógica JWT nova.

**Padrão de require** (copiar estilo de `server.js` linhas 1-5):
```js
require("dotenv").config();                // só se for entry point — NÃO colocar em middleware
const jwt = require("jsonwebtoken");       // novo pacote da fase
```

**Padrão de exportação de middleware** — o projeto usa CommonJS puro:
```js
// PADRÃO do projeto: module.exports = função
module.exports = banco;             // db.js linha 13 — exemplo canônico
// Para middleware: exportar uma função (req, res, next)
module.exports = function autenticar(req, res, next) { ... };
```

**Padrão de resposta de erro de auth** — copiar do handler `/api/login` (server.js linhas 206-208):
```js
// server.js linha 207 — formato EXATO de erro 401:
return res.status(401).json({ status: "erro", message: "E-mail, senha ou perfil inválidos." });
// Adaptar para JWT:
return res.status(401).json({ status: "erro", message: "Token inválido ou ausente." });
```

**Padrão de early return com guard** — copiar de server.js linhas 161-163:
```js
if (!nome || !email || !senha || !perfil) {
    return res.status(400).json({ status: "erro", message: "Preencha todos os campos." });
}
```

**Estrutura completa do middleware** (novo; sem análogo direto — usar RESEARCH.md):
```js
const jwt = require("jsonwebtoken");

module.exports = function autenticar(req, res, next) {
    const cabecalho = req.headers["authorization"];

    if (!cabecalho || !cabecalho.startsWith("Bearer ")) {
        return res.status(401).json({ status: "erro", message: "Token ausente." });
    }

    const token = cabecalho.split(" ")[1];

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = payload;   // { id, perfil } disponível nos controllers
        next();
    } catch {
        return res.status(401).json({ status: "erro", message: "Token inválido ou expirado." });
    }
};
```

---

### `backend/middleware/errorHandler.js` (middleware, request-response)

**Análogo:** Blocos `catch` inline de server.js (ex. linhas 184-190, 267-273).

**Padrão de erro interno** — extraído de server.js linha 189:
```js
// PADRÃO atual inline (copiar o formato, centralizar aqui):
res.status(500).json({ status: "erro", message: "Erro ao cadastrar usuário.", detalhe: erro.message });

// CAMPO "detalhe" é opcional mas já está no projeto — manter em dev, omitir em prod:
res.status(500).json({
    status: "erro",
    message: erro.message || "Erro interno do servidor.",
    ...(process.env.NODE_ENV !== "production" && { detalhe: erro.stack })
});
```

**Padrão de erro por código MySQL** — copiar de server.js linhas 185-186 e 268-269:
```js
if (erro.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ status: "erro", message: "Este e-mail já está cadastrado." });
}
```

**Estrutura do handler de erro Express** (4 parâmetros — obrigatório):
```js
// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(erro, req, res, next) {
    if (erro.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ status: "erro", message: "Este e-mail já está cadastrado." });
    }
    res.status(erro.status || 500).json({
        status: "erro",
        message: erro.message || "Erro interno do servidor."
    });
};
```

---

### `backend/routes/auth.js` (route, request-response)

**Análogo:** `backend/server.js` linhas 158-214 — handlers de `/api/cadastro` e `/api/login`.

**Padrão de require de router** (adaptar do estilo server.js):
```js
const { Router } = require("express");
const roteador = Router();                       // "roteador" — padrão PT-BR do projeto
const authController = require("../controllers/authController");
```

**Padrão de validação com express-validator** — copiar estrutura de validação de server.js linhas 161-167:
```js
// Atual (inline):
if (!nome || !email || !senha || !perfil) {
    return res.status(400).json({ status: "erro", message: "Preencha todos os campos." });
}
if (!["aluno", "professor"].includes(perfil)) {
    return res.status(400).json({ status: "erro", message: "Perfil inválido." });
}

// Com express-validator (novo padrão da fase):
const { body, validationResult } = require("express-validator");

const validarCadastro = [
    body("nome").notEmpty().withMessage("Nome é obrigatório."),
    body("email").isEmail().withMessage("E-mail inválido."),
    body("senha").isLength({ min: 6 }).withMessage("Senha deve ter ao menos 6 caracteres."),
    body("perfil").isIn(["aluno", "professor"]).withMessage("Perfil inválido.")
];
```

**Padrão de rate-limit** (novo; aplicar nas rotas de auth):
```js
const limitador = require("express-rate-limit")({
    windowMs: 15 * 60 * 1000,   // 15 minutos
    max: 20,
    message: { status: "erro", message: "Muitas tentativas. Tente novamente em 15 minutos." }
});
```

**Padrão de exportação de router**:
```js
module.exports = roteador;
```

---

### `backend/routes/usuarios.js` (route, CRUD)

**Análogo:** `backend/server.js` linhas 216-338 — rotas `GET /api/usuarios/:id`, `PUT /api/usuarios/:id`, `GET/PUT /api/usuarios/:id/preferencias`.

**Padrão de injeção de middleware de auth** (novo):
```js
const autenticar = require("../middleware/auth");

// Todas as rotas de usuário exigem JWT:
roteador.use(autenticar);
```

**Padrão de verificação IDOR** — a verificação DEVE ser a primeira coisa no controller:
```js
// Extraído da RESEARCH.md (padrão IDOR fix):
if (req.usuario.id !== parseInt(req.params.id, 10)) {
    return res.status(403).json({ status: "erro", message: "Acesso negado." });
}
```

**Padrão de rota de preferências** — copiar da server.js linhas 276-298:
```js
roteador.get("/:id/preferencias", autenticar, usuariosController.buscarPreferencias);
roteador.put("/:id/preferencias", autenticar, usuariosController.salvarPreferencias);
```

---

### `backend/routes/alunos.js` (route, CRUD)

**Análogo:** `backend/server.js` linhas 341-397 — rotas `GET/POST /api/alunos/:id/progresso/funcoes`.

**Padrão de rota de progresso** (copiar estrutura das linhas 341 e 369):
```js
roteador.get("/:id/progresso/funcoes", autenticar, alunosController.buscarProgressoFuncoes);
roteador.post("/:id/progresso/funcoes", autenticar, alunosController.marcarProgressoFuncoes);
```

---

### `backend/controllers/authController.js` (controller, request-response)

**Análogo:** `backend/server.js` linhas 158-214 — lógica inline de `/api/cadastro` e `/api/login`.

**Padrão de require do banco** — copiar de server.js linhas 5:
```js
const banco = require("../db");          // caminho relativo ao controllers/
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const SALT_ROUNDS = 12;                  // constante nomeada, não magic number
```

**Padrão de cadastro com bcrypt** — adaptar de server.js linhas 169-190:
```js
// ATUAL (servidor.js linhas 170-172) — INSEGURO, referência do que REMOVER:
const [resultado] = await banco.query(
    "INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)",
    [nome, email, senha, perfil]           // ← senha em texto plano
);

// NOVO padrão:
const hash = await bcrypt.hash(senha, SALT_ROUNDS);
const [resultado] = await banco.query(
    "INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)",
    [nome, email, hash, perfil]            // ← hash bcrypt
);
```

**Padrão de resposta do cadastro** — copiar de server.js linhas 175-183:
```js
res.status(201).json({
    status: "ok",
    usuario: {
        id: resultado.insertId,
        nome,
        email,
        perfil
    }
});
```

**Padrão de login com bcrypt + JWT** — adaptar de server.js linhas 200-210:
```js
// ATUAL (linhas 201-208) — SELECT com senha em texto plano:
const [usuarios] = await banco.query(
    "SELECT id, nome, email, perfil FROM usuarios WHERE email = ? AND senha = ? AND perfil = ? LIMIT 1",
    [email, senha, perfil]
);

// NOVO padrão — buscar por email apenas, comparar hash:
const [usuarios] = await banco.query(
    "SELECT id, nome, email, perfil, senha FROM usuarios WHERE email = ? AND perfil = ? LIMIT 1",
    [email, perfil]
);

if (!usuarios.length) {
    return res.status(401).json({ status: "erro", message: "E-mail, senha ou perfil inválidos." });
}

const usuario = usuarios[0];
const senhaValida = await bcrypt.compare(senha, usuario.senha);

if (!senhaValida) {
    return res.status(401).json({ status: "erro", message: "E-mail, senha ou perfil inválidos." });
}

const token = jwt.sign(
    { id: usuario.id, perfil: usuario.perfil },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
);

// Resposta sem expor campo senha:
res.json({
    status: "ok",
    token,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil }
});
```

**Padrão de erro de duplicata** — copiar de server.js linhas 185-187:
```js
if (erro.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ status: "erro", message: "Este e-mail já está cadastrado." });
}
```

---

### `backend/controllers/usuariosController.js` (controller, CRUD)

**Análogo:** `backend/server.js` linhas 216-338 — handlers de GET/PUT de usuários e preferências.

**Padrão de busca por ID com verificação 404** — copiar de server.js linhas 217-225:
```js
const [usuarios] = await banco.query(
    "SELECT id, nome, email, perfil FROM usuarios WHERE id = ? LIMIT 1",
    [req.params.id]
);

if (!usuarios.length) {
    return res.status(404).json({ status: "erro", message: "Usuário não encontrado." });
}

res.json({ status: "ok", usuario: usuarios[0] });
```

**Padrão de UPDATE dinâmico** — copiar de server.js linhas 234-259:
```js
const campos = [];
const valores = [];

if (nome) { campos.push("nome = ?"); valores.push(nome); }
if (email) { campos.push("email = ?"); valores.push(email); }
if (senha) {
    campos.push("senha = ?");
    const hash = await bcrypt.hash(senha, SALT_ROUNDS);   // NOVO: hash antes de guardar
    valores.push(hash);
}

if (!campos.length) {
    return res.status(400).json({ status: "erro", message: "Nenhum dado para atualizar." });
}

valores.push(req.params.id);
await banco.query(`UPDATE usuarios SET ${campos.join(", ")} WHERE id = ?`, valores);
```

**Padrão de verificação IDOR — adicionar ANTES de qualquer query**:
```js
// Verificação IDOR — PRIMEIRA linha do handler, antes de qualquer SELECT/UPDATE:
if (req.usuario.id !== parseInt(req.params.id, 10)) {
    return res.status(403).json({ status: "erro", message: "Acesso negado." });
}
```

**Padrão de formatarPreferencias** — copiar de server.js linhas 121-131 EXATAMENTE:
```js
function formatarPreferencias(linha) {
    return {
        tema: linha.tema,
        status: linha.status_usuario,
        foto: linha.foto_perfil || "",
        notificacoes: linha.notificacoes_turma === 1,
        lembretes: linha.lembretes_estudo,
        disciplina: linha.disciplina_principal,
        ritmo: linha.ritmo_semanal
    };
}
```

---

### `backend/controllers/alunosController.js` (controller, CRUD)

**Análogo:** `backend/server.js` linhas 341-397 — handlers de progresso.

**Padrão de busca de progresso** — copiar de server.js linhas 348-366:
```js
const [entregas] = await banco.query(
    "SELECT status, enviado_em FROM entregas WHERE atividade_id = ? AND aluno_id = ? LIMIT 1",
    [atividade.id, req.params.id]
);

const entrega = entregas[0];
const concluido = ["entregue", "corrigida"].includes(entrega?.status);

res.json({
    status: "ok",
    atividade_id: atividade.id,
    entrega: entrega?.status || "pendente",
    concluido,
    progresso: concluido ? 85 : 72
});
```

**Padrão de UPSERT** — copiar de server.js linhas 377-384:
```js
await banco.query(
    `INSERT INTO entregas (atividade_id, aluno_id, resposta, status, enviado_em)
     VALUES (?, ?, ?, 'entregue', CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE
        resposta = VALUES(resposta),
        status = 'entregue',
        enviado_em = CURRENT_TIMESTAMP`,
    [atividade.id, req.params.id, "Etapa de Funcoes do 1 grau concluida."]
);
```

> **ATENÇÃO:** `garantirAtividadeFuncoes()` deve ser REMOVIDA. Não mover para controller — eliminá-la completamente. Ver seção "Sem Análogo" abaixo.

---

### `backend/server.js` *(refatorado)* (config, request-response)

**Análogo:** `backend/server.js` linhas 1-32 — ponto de entrada atual.

**Padrão de ponto de entrada** — copiar linhas 1-9 e 20-21, depois substituir CORS manual e rotas inline por `app.use()`:
```js
require("dotenv").config();

const express = require("express");
const path = require("path");
const helmet = require("helmet");
const cors = require("cors");

const app = express();
const porta = process.env.PORT || 3000;
const pastaPublica = path.resolve(__dirname, "..");

// Segurança — substituir CORS manual (linhas 22-32 atuais) por:
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:3000" }));
app.use(express.json());
app.use(express.static(pastaPublica));

// Rotas — substituir handlers inline por:
app.use("/api", require("./routes/auth"));
app.use("/api/usuarios", require("./routes/usuarios"));
app.use("/api/alunos", require("./routes/alunos"));

// Health check — copiar de server.js linhas 133-138 EXATAMENTE:
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", message: "Servidor DuoPratic online." });
});

// Error handler — deve ser o ÚLTIMO middleware:
app.use(require("./middleware/errorHandler"));

app.listen(porta, () => {
    console.log(`Servidor DuoPratic online na porta ${porta}`);
});
```

---

### `assets/js/acesso.js` *(modificado)* (utility, request-response)

**Análogo:** `assets/js/acesso.js` — arquivo atual completo (66 linhas).

**Padrão de fetch** — copiar de acesso.js linhas 18-41 e adicionar `token`:
```js
// ATUAL (linha 40): retorna apenas usuario
return resultado.usuario;

// NOVO: retornar token + usuario; chamador salva ambos
return { token: resultado.token, usuario: resultado.usuario };
```

**Padrão de localStorage** — copiar de acesso.js linhas 56-58 e adicionar token:
```js
// ATUAL (acesso.js linhas 56-57):
localStorage.setItem("duopratic_usuario", JSON.stringify(usuario));
localStorage.setItem("duopratic_perfil", usuario.perfil);

// NOVO: adicionar token na mesma sequência:
localStorage.setItem("duopratic_usuario", JSON.stringify(usuario));
localStorage.setItem("duopratic_perfil", usuario.perfil);
localStorage.setItem("duopratic_token", token);     // ← NOVA linha
```

**Padrão de exibição de mensagem de erro** — copiar de acesso.js linhas 7-16 EXATAMENTE (não inventar novo padrão):
```js
function mostrarMensagem(texto) {
    const antiga = document.querySelector(".aviso-config");
    if (antiga) antiga.remove();

    const aviso = document.createElement("div");
    aviso.className = "aviso-config";
    aviso.textContent = texto;
    document.body.appendChild(aviso);
    setTimeout(() => aviso.remove(), 2200);
}
```

---

### `assets/js/aluno.js` *(modificado)* (utility, request-response)

**Análogo:** `assets/js/aluno.js` — arquivo atual, especialmente linhas 32-104.

**Padrão de leitura do token do localStorage** — derivado de `usuarioLogado()` (linhas 11-17):
```js
function tokenAtual() {
    return localStorage.getItem("duopratic_token") || null;
}
```

**Padrão de fetch COM Authorization** — adaptar de aluno.js linhas 56-68 (salvarPreferenciaBanco):
```js
// ATUAL (aluno.js linha 56-61) — sem Authorization:
const resposta = await fetch(`/api/usuarios/${usuario.id}/preferencias`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [campo]: valor })
});

// NOVO padrão — injetar Authorization em TODOS os fetches autenticados:
const token = tokenAtual();
const resposta = await fetch(`/api/usuarios/${usuario.id}/preferencias`, {
    method: "PUT",
    headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ [campo]: valor })
});
```

> **Regra:** Toda função `fetch` em aluno.js que chame `/api/` deve injetar o cabeçalho `Authorization`. São 5 funções: `buscarPreferenciasBanco`, `salvarPreferenciaBanco`, `buscarUsuarioBanco`, `salvarUsuarioBanco`, `buscarProgressoFuncoesBanco`, `marcarFuncoesConcluidaBanco`.

**Padrão de resposta 401** — adicionar tratamento de token expirado em cada fetch:
```js
if (resposta.status === 401) {
    localStorage.removeItem("duopratic_token");
    localStorage.removeItem("duopratic_usuario");
    window.location.href = "../pages/login.html";
    return;
}
```

**Padrão de aviso existente** — copiar de aluno.js linhas 344-356 EXATAMENTE (não duplicar):
```js
function mostrarAviso(texto) {
    const avisoAtual = document.querySelector(".aviso-config");
    if (avisoAtual) avisoAtual.remove();
    const aviso = document.createElement("div");
    aviso.className = "aviso-config";
    aviso.textContent = texto;
    document.body.appendChild(aviso);
    setTimeout(() => aviso.remove(), 1800);
}
```

---

### `assets/js/auth-guard.js` *(novo)* (utility, request-response)

**Análogo:** `assets/js/acesso.js` linhas 43-65 — lógica de redirecionamento após login.

**Padrão de guard de página** — derivado do `usuarioLogado()` de aluno.js (linhas 11-17) e `destinoPorPerfil()` de acesso.js (linhas 3-5):
```js
// Seguir o mesmo padrão de nomeação em português do projeto:
(function guardarPagina(perfilEsperado) {
    const token = localStorage.getItem("duopratic_token");
    let usuario = null;

    try {
        usuario = JSON.parse(localStorage.getItem("duopratic_usuario"));
    } catch {
        usuario = null;
    }

    if (!token || !usuario) {
        window.location.href = "../pages/login.html";
        return;
    }

    if (perfilEsperado && usuario.perfil !== perfilEsperado) {
        // Redirecionar para a página correta do perfil real
        window.location.href = usuario.perfil === "professor"
            ? "../pages/professor.html"
            : "../pages/aluno.html";
    }
})(document.body.dataset.perfilGuard || null);
```

**Como incluir nas páginas HTML** — seguir o padrão de `aluno.html` linha 155 (`<script src="../assets/js/aluno.js">`):
```html
<!-- Adicionar como PRIMEIRO script, antes de qualquer outro -->
<script src="../assets/js/auth-guard.js"></script>
<!-- Marcar o body com o perfil esperado: -->
<body class="area-aluno" data-perfil-guard="aluno">
```

---

### `backend/.env` *(modificado)* (config)

**Análogo:** `backend/.env.example` — arquivo atual (5 linhas).

**Padrão de variáveis de ambiente** — copiar de `.env.example` e adicionar novas:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=duopratic
PORT=3000
JWT_SECRET=troque_este_valor_por_uma_string_longa_e_aleatoria
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

> **Regra:** `JWT_SECRET` NUNCA deve ser commitado com valor real. Adicionar ao `.gitignore` se ainda não estiver.

---

## Padrões Transversais (Aplicar a Todos os Arquivos)

### Nomenclatura — Português para lógica de domínio, inglês para padrões técnicos

**Fonte:** `backend/server.js` (arquivo inteiro) + `assets/js/aluno.js` (arquivo inteiro)

| Contexto | Convenção | Exemplos do projeto |
|----------|-----------|---------------------|
| Variáveis de módulo | PT-BR camelCase | `banco`, `pastaPublica`, `camposPreferencias`, `porta` |
| Funções de negócio | PT-BR camelCase | `garantirPreferencias`, `formatarPreferencias`, `usuarioLogado`, `salvarConfig` |
| Parâmetros HTTP | PT-BR | `nome`, `email`, `senha`, `perfil` |
| Nomes de arquivos novos | inglês kebab-case | `auth.js`, `errorHandler.js`, `authController.js` (padrão Express de mercado) |
| Chaves de resposta JSON | PT-BR | `status`, `message`, `detalhe`, `usuario`, `preferencias` |
| Constantes | UPPER_SNAKE inglês | `SALT_ROUNDS`, `JWT_SECRET` |

### Formato de Resposta JSON

**Fonte:** `backend/server.js` — todos os handlers

```js
// Sucesso — sempre { status: "ok", <chave_dado>: valor }
res.json({ status: "ok", usuario: usuarios[0] });                          // linha 227
res.status(201).json({ status: "ok", usuario: { id, nome, email, perfil } }); // linha 175
res.json({ status: "ok", preferencias: formatarPreferencias(linha) });    // linha 294

// Erro de validação — { status: "erro", message: "..." }
res.status(400).json({ status: "erro", message: "Preencha todos os campos." });  // linha 162
res.status(400).json({ status: "erro", message: "Nenhum dado para atualizar." }); // linha 254

// Erro de auth — { status: "erro", message: "..." }
res.status(401).json({ status: "erro", message: "E-mail, senha ou perfil inválidos." }); // linha 207

// Não encontrado — { status: "erro", message: "..." }
res.status(404).json({ status: "erro", message: "Usuário não encontrado." });   // linha 224

// Conflito — { status: "erro", message: "..." }
res.status(409).json({ status: "erro", message: "Este e-mail já está cadastrado." }); // linha 186

// Erro interno — { status: "erro", message: "...", detalhe: erro.message }
res.status(500).json({ status: "erro", message: "Erro ao cadastrar usuário.", detalhe: erro.message }); // linha 189
```

**Regra:** O campo `detalhe` é incluído nos erros 500 — manter em dev, remover em produção futura.

### Padrão de Query ao Banco

**Fonte:** `backend/db.js` + todas as queries em `server.js`

```js
// 1. Import — sempre chamar de "banco":
const banco = require("./db");        // ou "../db" dependendo da profundidade

// 2. Query com destructuring — SEMPRE desestruturar o primeiro elemento:
const [linhas] = await banco.query("SELECT ...", [params]);

// 3. Para INSERT/UPDATE — desestruturar como "resultado":
const [resultado] = await banco.query("INSERT INTO ...", [params]);
const id = resultado.insertId;

// 4. Parâmetros — SEMPRE usar placeholder ? (nunca interpolação de string direta):
await banco.query("SELECT * FROM usuarios WHERE id = ? LIMIT 1", [req.params.id]);

// 5. Verificar existência — sempre com .length:
if (!linhas.length) {
    return res.status(404).json({ status: "erro", message: "Não encontrado." });
}

// 6. Optional chaining para campos que podem ser nulos:
const valor = linhas[0]?.campo || "padrão";   // padrão de server.js linhas 49, 64
```

### Padrão de Fetch no Frontend

**Fonte:** `assets/js/acesso.js` linhas 18-41 + `assets/js/aluno.js` linhas 32-104

```js
// 1. Sempre async/await — sem .then().catch() no projeto
// 2. Sempre verificar resposta.ok antes de usar dados
// 3. Mensagens de erro via mostrarAviso() ou mostrarMensagem()
// 4. Usuário atual via usuarioLogado() — nunca ler localStorage diretamente nas funções

// Padrão canônico de fetch autenticado (NOVO na fase 1):
async function chamarApi(url, opcoes = {}) {
    const token = localStorage.getItem("duopratic_token");
    const resposta = await fetch(url, {
        ...opcoes,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
            ...(opcoes.headers || {})
        }
    });

    if (resposta.status === 401) {
        localStorage.clear();
        window.location.href = "../pages/login.html";
        return null;
    }

    return resposta;
}
```

### Padrão de Middleware Chain no Express

**Fonte:** `backend/server.js` linhas 20-32

```js
// ORDEM OBRIGATÓRIA no server.js refatorado:
// 1. helmet() — antes de tudo
// 2. cors() — antes de json parser
// 3. express.json() — antes das rotas
// 4. express.static() — antes das rotas
// 5. rotas de API — /api/*
// 6. rota HTML catch-all — app.get("/", ...)
// 7. errorHandler — ÚLTIMO middleware (4 parâmetros)
```

---

## Sem Análogo no Codebase

| Arquivo | Papel | Fluxo | Motivo |
|---------|-------|-------|--------|
| `garantirAtividadeFuncoes()` (a REMOVER) | utility | seed | Função de seed de produção sem análogo válido — deve ser **eliminada**, não migrada. Criar script separado `database/seed.js` se necessário para dev. |

> **Nota:** Para bcrypt, JWT e express-validator não há nenhum uso anterior no projeto. O planner deve usar os exemplos de RESEARCH.md para esses novos padrões. Os excertos acima já integram as chamadas corretas nos locais certos.

---

## Metadados

**Escopo de busca de análogos:** `backend/`, `assets/js/`, `pages/`  
**Arquivos lidos:** `server.js`, `db.js`, `package.json`, `.env.example`, `acesso.js`, `aluno.js`, `tema.js`, `login.html`, `cadastro.html`, `aluno.html`, `configuracoes.html`  
**Data de extração de padrões:** 2026-05-22
