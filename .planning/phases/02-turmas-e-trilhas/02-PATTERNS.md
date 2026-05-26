# Phase 2: Turmas e Trilhas — Pattern Map

**Mapped:** 2026-05-22  
**Files analyzed:** 8 new/modified files  
**Analogs found:** 8 / 8

---

## Pattern Map

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------------|------|-----------|----------------|---------------|
| `backend/routes/turmas.js` | route | request-response | `backend/routes/usuarios.js` | exact — same IDOR middleware inline pattern |
| `backend/routes/trilhas.js` | route | request-response | `backend/routes/alunos.js` + `routes/usuarios.js` | exact — same guard + perfil check pattern |
| `backend/controllers/turmasController.js` | controller | CRUD | `backend/controllers/usuariosController.js` | exact — same banco.query + dynamic field build + error codes |
| `backend/controllers/trilhasController.js` | controller | CRUD | `backend/controllers/alunosController.js` + `usuariosController.js` | role-match — same query structure, adds JOIN pattern |
| `database/migrate-02.sql` | migration | batch / DDL | `database/schema.sql` | exact — same `CREATE TABLE IF NOT EXISTS` + `ENGINE=InnoDB` idioms |
| `assets/js/turma.js` | frontend script | request-response | `assets/js/aluno.js` lines 36–131 | exact — same fetch+401 guard+mostrarAviso pattern |
| `assets/js/trilhas.js` | frontend script | request-response | `assets/js/aluno.js` lines 285–331 | exact — same async fetch + DOM mutation pattern |
| `assets/js/aluno.js` (modify) | frontend script | request-response | self (`assets/js/aluno.js`) | additive — new functions appended, no existing lines touched |

---

## Key Patterns to Replicate

---

### `backend/routes/turmas.js`

**Analog:** `backend/routes/usuarios.js` (lines 1–20)

**Imports pattern** (copy from usuarios.js lines 1–5):
```js
const { Router } = require("express");
const { autenticar } = require("../middleware/auth");
const turmasController = require("../controllers/turmasController");

const roteador = Router();
```

**Role-guard middleware pattern** (copy structure from usuarios.js lines 7–13, adapt for perfil):
```js
// Inline guard — keep it here, not in a shared file (existing pattern)
function verificarProfessor(req, res, next) {
    if (req.usuario.perfil !== "professor") {
        return res.status(403).json({ status: "erro", message: "Apenas professores podem realizar esta ação." });
    }
    next();
}

function verificarAluno(req, res, next) {
    if (req.usuario.perfil !== "aluno") {
        return res.status(403).json({ status: "erro", message: "Apenas alunos podem realizar esta ação." });
    }
    next();
}
```

**Route registration pattern** — literal routes BEFORE param routes (pitfall from RESEARCH.md):
```js
// ORDEM IMPORTA: literais antes de :param para evitar conflito Express
roteador.post("/entrar", autenticar, verificarAluno, turmasController.entrar);     // literal PRIMEIRO
roteador.post("/", autenticar, verificarProfessor, turmasController.criar);
roteador.get("/", autenticar, verificarProfessor, turmasController.listar);
roteador.get("/:id/membros", autenticar, verificarProfessor, turmasController.getMembros);
roteador.delete("/:id/membros/:alunoId", autenticar, verificarProfessor, turmasController.removerMembro);

module.exports = roteador;
```

**Rate-limit pattern for `POST /entrar`** (copy from auth.js lines 7–13):
```js
const rateLimit = require("express-rate-limit");

const limitadorEntrada = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: "erro", message: "Muitas tentativas. Tente novamente em 15 minutos." }
});
// Apply: roteador.post("/entrar", limitadorEntrada, autenticar, verificarAluno, ...)
```

---

### `backend/routes/trilhas.js`

**Analog:** `backend/routes/alunos.js` (lines 1–18) + `usuarios.js` (lines 7–13)

**Imports pattern** (mirrors alunos.js lines 1–5):
```js
const { Router } = require("express");
const { autenticar } = require("../middleware/auth");
const trilhasController = require("../controllers/trilhasController");

const roteador = Router();
```

**Route guard functions** (same `verificarProfessor` / `verificarAluno` as turmas.js — copy verbatim):
```js
// Reusar mesma estrutura inline de verificarProfessor / verificarAluno
// NÃO importar de arquivo compartilhado — padrão atual é inline por arquivo de rota
```

**Route registration** (literal routes before params — same pitfall):
```js
roteador.get("/minhas", autenticar, verificarAluno, trilhasController.minhas);           // literal PRIMEIRO
roteador.post("/etapas/:etapaId/concluir", autenticar, verificarAluno, trilhasController.concluirEtapa);
roteador.post("/", autenticar, verificarProfessor, trilhasController.criar);
roteador.get("/turma/:turmaId", autenticar, verificarProfessor, trilhasController.listarPorTurma);
roteador.post("/:id/etapas", autenticar, verificarProfessor, trilhasController.adicionarEtapa);
roteador.get("/:id/etapas", autenticar, trilhasController.getEtapas);
roteador.get("/:id/progresso", autenticar, verificarAluno, trilhasController.getProgresso);

module.exports = roteador;
```

---

### `backend/controllers/turmasController.js`

**Analog:** `backend/controllers/usuariosController.js` (full file, 152 lines)

**Imports pattern** (copy from usuariosController.js line 1):
```js
const banco = require("../db");
// No bcrypt needed for turmas
```

**Geração de código único** (from RESEARCH.md — no existing analog; implement as shown):
```js
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem ambíguos: 0/O, 1/I

async function gerarCodigoUnico() {
    for (let tentativa = 0; tentativa < 10; tentativa++) {
        let codigo = "";
        for (let i = 0; i < 6; i++) codigo += CHARS[Math.floor(Math.random() * CHARS.length)];
        const [existente] = await banco.query(
            "SELECT id FROM turmas WHERE codigo = ? LIMIT 1", [codigo]
        );
        if (!existente.length) return codigo;
    }
    throw new Error("Não foi possível gerar código único após 10 tentativas.");
}
```

**IDOR check helper pattern** (copy structure from usuariosController.js lines 28–33 `garantirPreferencias`):
```js
// Helper: retorna boolean, chamado no início dos handlers de escrita
async function verificarDonoDaTurma(turmaId, professorId) {
    const [turmas] = await banco.query(
        "SELECT id FROM turmas WHERE id = ? AND professor_id = ? LIMIT 1",
        [turmaId, professorId]
    );
    return turmas.length > 0;
}
```

**Standard handler structure** (copy from usuariosController.js lines 35–49 `getUsuario`):
```js
async function criar(req, res) {
    // 1. Validação manual de campos obrigatórios
    const { nome, disciplina } = req.body;
    if (!nome || !disciplina) {
        return res.status(400).json({ status: "erro", message: "Nome e disciplina são obrigatórios." });
    }
    try {
        // 2. Lógica de negócio
        const codigo = await gerarCodigoUnico();
        const [resultado] = await banco.query(
            "INSERT INTO turmas (nome, disciplina, codigo, professor_id) VALUES (?, ?, ?, ?)",
            [nome, disciplina, codigo, req.usuario.id]
        );
        // 3. Retorno padrão { status: "ok", <recurso>: {...} }
        res.status(201).json({ status: "ok", turma: { id: resultado.insertId, nome, disciplina, codigo } });
    } catch (erro) {
        // 4. Erro interno com detalhe
        res.status(500).json({ status: "erro", message: "Erro ao criar turma.", detalhe: erro.message });
    }
}
```

**Dynamic field build pattern** (copy from usuariosController.js lines 54–71 `atualizarUsuario`):
```js
// Para operações com campos opcionais — mesmo pattern push/join
const campos = [];
const valores = [];
if (nome) { campos.push("nome = ?"); valores.push(nome); }
if (!campos.length) return res.status(400).json({ status: "erro", message: "Nenhum dado para atualizar." });
valores.push(req.params.id);
await banco.query(`UPDATE turmas SET ${campos.join(", ")} WHERE id = ?`, valores);
```

**ER_DUP_ENTRY handling** (copy from usuariosController.js lines 80–82):
```js
} catch (erro) {
    if (erro.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ status: "erro", message: "Código de turma já em uso. Tente novamente." });
    }
    res.status(500).json({ status: "erro", message: "Erro ao criar turma.", detalhe: erro.message });
}
```

**module.exports pattern** (copy from usuariosController.js line 151):
```js
module.exports = { criar, listar, getMembros, removerMembro, entrar, getTurmaDoAluno };
```

---

### `backend/controllers/trilhasController.js`

**Analog:** `backend/controllers/alunosController.js` (full file, 67 lines) for structure; `usuariosController.js` for IDOR helpers

**Imports pattern** (copy from alunosController.js line 1):
```js
const banco = require("../db");
```

**parseInt for ID params** (copy from alunosController.js line 5):
```js
const trilhaId = parseInt(req.params.id, 10);
const etapaId  = parseInt(req.params.etapaId, 10);
```

**INSERT … ON DUPLICATE KEY pattern** (copy from alunosController.js lines 45–53):
```js
// Para progresso_etapa — idempotente, correto para duplo-clique
await banco.query(
    `INSERT INTO progresso_etapa (aluno_id, etapa_id, concluido, concluido_em)
     VALUES (?, ?, 1, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE
        concluido = 1,
        concluido_em = CURRENT_TIMESTAMP`,
    [req.usuario.id, etapaId]   // ← aluno_id SEMPRE de req.usuario.id, NUNCA de req.body
);
```

**Progresso percentual query — MySQL-correto** (from RESEARCH.md Pitfall 8 — SEM `FILTER`):
```js
// CORRETO para MySQL — usar SUM(IF(...)) não FILTER
const [rows] = await banco.query(
    `SELECT
        COUNT(te.id)                          AS total_etapas,
        SUM(IF(pe.concluido = 1, 1, 0))       AS etapas_concluidas,
        ROUND(SUM(IF(pe.concluido = 1, 1, 0)) / COUNT(te.id) * 100) AS percentual
     FROM trilha_etapas te
     LEFT JOIN progresso_etapa pe ON pe.etapa_id = te.id AND pe.aluno_id = ?
     WHERE te.trilha_id = ?`,
    [req.usuario.id, trilhaId]
);
```

**IDOR check for trilha ownership** (same helper pattern as turmasController):
```js
async function verificarDonoDaTrilha(trilhaId, professorId) {
    const [trilhas] = await banco.query(
        "SELECT id FROM trilhas WHERE id = ? AND professor_id = ? LIMIT 1",
        [trilhaId, professorId]
    );
    return trilhas.length > 0;
}
```

**IDOR check for aluno membership** (mirrors alunos.js guard but in controller):
```js
async function verificarMembroTurma(turmaId, alunoId) {
    const [rows] = await banco.query(
        "SELECT id FROM turma_alunos WHERE turma_id = ? AND aluno_id = ? LIMIT 1",
        [turmaId, alunoId]
    );
    return rows.length > 0;
}
```

**Error response pattern** (copy from alunosController.js lines 27–28):
```js
res.status(500).json({ status: "erro", message: "Erro ao buscar trilhas.", detalhe: erro.message });
```

**module.exports pattern**:
```js
module.exports = { criar, listarPorTurma, adicionarEtapa, minhas, getEtapas, concluirEtapa, getProgresso };
```

---

### `database/migrate-02.sql`

**Analog:** `database/schema.sql` (full file, 93 lines)

**File header pattern** (copy from schema.sql lines 1–5):
```sql
-- Migration 02: Trilhas e Progresso
-- Executar UMA VEZ após database/schema.sql estar aplicado
-- Seguro para re-execução: CREATE TABLE IF NOT EXISTS

USE duopratic;
```

**Table definition pattern** (copy from schema.sql lines 16–25 `turmas`):
```sql
-- mesmo ENGINE=InnoDB, CHARACTER SET implícito do banco, TIMESTAMP defaults
CREATE TABLE IF NOT EXISTS trilhas (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    turma_id     INT          NOT NULL,
    professor_id INT          NOT NULL,
    titulo       VARCHAR(140) NOT NULL,
    disciplina   VARCHAR(80)  NOT NULL,
    descricao    TEXT,
    ativa        TINYINT(1)   NOT NULL DEFAULT 1,
    criado_em    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (turma_id)     REFERENCES turmas(id)    ON DELETE CASCADE,
    FOREIGN KEY (professor_id) REFERENCES usuarios(id)  ON DELETE CASCADE
) ENGINE=InnoDB;
```

**UNIQUE KEY pattern** (copy from schema.sql lines 32–33 `turma_aluno_unico`):
```sql
-- Mesmo padrão de named UNIQUE KEY inline
UNIQUE KEY etapa_unica (trilha_id, ordem)
```

**Junction table pattern** (copy from schema.sql lines 27–37 `turma_alunos`):
```sql
-- Mesmo padrão de bridge table: UNIQUE KEY no par, duas FK ON DELETE CASCADE
CREATE TABLE IF NOT EXISTS progresso_etapa (
    id           INT        AUTO_INCREMENT PRIMARY KEY,
    aluno_id     INT        NOT NULL,
    etapa_id     INT        NOT NULL,
    concluido    TINYINT(1) NOT NULL DEFAULT 0,
    concluido_em TIMESTAMP  NULL,
    UNIQUE KEY progresso_unico (aluno_id, etapa_id),
    FOREIGN KEY (aluno_id) REFERENCES usuarios(id)      ON DELETE CASCADE,
    FOREIGN KEY (etapa_id) REFERENCES trilha_etapas(id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

---

### `assets/js/turma.js`

**Analog:** `assets/js/aluno.js` lines 11–131 (token + fetch + 401 guard)

**Session helpers** (copy from aluno.js lines 11–21 — do NOT redeclare in turma.js; these already exist globally when aluno.js loads first):
```js
// turma.js carrega APÓS aluno.js no HTML — usuarioLogado() e tokenAtual() já existem
// NÃO redeclarar. Usar diretamente:
const usuario = usuarioLogado();
const token   = tokenAtual();
```

**Authenticated fetch + 401 guard pattern** (copy from aluno.js lines 40–62):
```js
async function buscarTurmaAtual() {
    const usuario = usuarioLogado();
    if (!usuario?.id) return;

    try {
        const resposta = await fetch("/api/aluno/turma", {
            headers: { "Authorization": `Bearer ${tokenAtual()}` }
        });
        if (resposta.status === 401) {
            localStorage.removeItem("duopratic_token");
            localStorage.removeItem("duopratic_usuario");
            window.location.href = "../pages/login.html";
            return;
        }
        const resultado = await resposta.json();
        if (resposta.ok) {
            renderizarTurmaAluno(resultado.turma);
        }
    } catch {
        mostrarAviso("Não foi possível carregar a turma");   // mostrarAviso já existe via aluno.js
    }
}
```

**Perfil-based conditional render** (no existing analog — new pattern for Phase 2):
```js
// Detectar perfil logo no início do arquivo e revelar a section correta
function inicializar() {
    const usuario = usuarioLogado();
    if (!usuario) {
        window.location.href = "../pages/login.html";
        return;
    }
    if (usuario.perfil === "professor") {
        document.getElementById("view-professor").style.display = "";
        inicializarProfessor();
    } else {
        document.getElementById("view-aluno").style.display = "";
        inicializarAluno();
    }
}
inicializar();
```

**POST with JSON body pattern** (copy from aluno.js lines 68–82 `salvarPreferenciaBanco`):
```js
async function criarTurma(dados) {
    const resposta = await fetch("/api/turmas", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${tokenAtual()}`
        },
        body: JSON.stringify(dados)
    });
    const resultado = await resposta.json();
    if (!resposta.ok) {
        throw new Error(resultado.message || "Não foi possível criar a turma.");
    }
    return resultado.turma;
}
```

**Toast feedback pattern** (reuse, not copy — mostrarAviso already provided by aluno.js):
```js
// Usar: mostrarAviso("Turma criada com sucesso");
// mostrarAviso() definido em aluno.js lines 379–391 — NÃO redefinir
```

---

### `assets/js/trilhas.js`

**Analog:** `assets/js/aluno.js` lines 285–331 (`buscarProgressoFuncoesBanco` + `marcarFuncoesConcluidaBanco`)

**Authenticated GET pattern** (copy from aluno.js lines 285–308):
```js
async function buscarTrilhas() {
    const usuario = usuarioLogado();
    if (!usuario?.id) return;

    try {
        const resposta = await fetch("/api/trilhas/minhas", {
            headers: { "Authorization": `Bearer ${tokenAtual()}` }
        });
        if (resposta.status === 401) {
            localStorage.removeItem("duopratic_token");
            localStorage.removeItem("duopratic_usuario");
            window.location.href = "../pages/login.html";
            return;
        }
        const resultado = await resposta.json();
        if (resposta.ok) renderizarTrilhas(resultado.trilhas);
    } catch {
        mostrarAviso("Não foi possível carregar as trilhas");
    }
}
```

**Authenticated POST pattern** (copy from aluno.js lines 319–331 `marcarFuncoesConcluidaBanco`):
```js
async function concluirEtapa(etapaId) {
    const resposta = await fetch(`/api/trilhas/etapas/${etapaId}/concluir`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${tokenAtual()}` }
    });
    const resultado = await resposta.json();
    if (!resposta.ok) {
        throw new Error(resultado.message || "Não foi possível salvar o progresso.");
    }
    return resultado;
}
```

**DOM mutation pattern** (copy from aluno.js lines 224–283 `aplicarProgressoFuncoes` — use data-attribute selectors):
```js
// Usar atributos data-* específicos para não colidir com os de aluno.js
// aluno.js usa: [data-atividade-funcoes], [data-status-funcoes], .etapas-trilha
// trilhas.js deve usar: [data-trilha-id], [data-etapa-id], [data-progresso-trilha]
function renderizarTrilhas(trilhas) {
    const container = document.querySelector("[data-lista-trilhas]");
    if (!container) return;
    container.innerHTML = "";
    trilhas.forEach((trilha) => {
        // Criar elemento com data-trilha-id="${trilha.id}" para não colidir
    });
}
```

**Perfil-based init** (same pattern as turma.js):
```js
function inicializar() {
    const usuario = usuarioLogado();
    if (!usuario) { window.location.href = "../pages/login.html"; return; }
    if (usuario.perfil === "professor") {
        document.getElementById("view-professor").style.display = "";
        inicializarProfessor();
    } else {
        document.getElementById("view-aluno").style.display = "";
        inicializarAluno();
    }
}
inicializar();
```

---

### `assets/js/aluno.js` (modifications only)

**Analog:** self — additive changes only, zero line removal

**Append-only rule:** New functions go at the END of the file after line 620. Do NOT modify existing functions `buscarProgressoFuncoesBanco()`, `aplicarProgressoFuncoes()`, or `marcarFuncoesConcluidaBanco()`.

**New function to append** — turma info for aluno.html dashboard:
```js
// APPEND to end of aluno.js — NÃO remover nenhuma linha existente

async function buscarTurmaAlunoBanco() {
    const usuario = usuarioLogado();
    if (!usuario?.id || usuario.perfil !== "aluno") return;

    try {
        const resposta = await fetch("/api/aluno/turma", {
            headers: { "Authorization": `Bearer ${tokenAtual()}` }
        });
        if (resposta.status === 401) {
            localStorage.removeItem("duopratic_token");
            localStorage.removeItem("duopratic_usuario");
            window.location.href = "../pages/login.html";
            return;
        }
        const resultado = await resposta.json();
        if (resposta.ok) aplicarTurmaAluno(resultado.turma);
    } catch {
        mostrarAviso("Não foi possível carregar dados da turma");
    }
}

function aplicarTurmaAluno(turma) {
    // Usa data-turma-nome para não colidir com elementos existentes
    document.querySelectorAll("[data-turma-nome]").forEach((el) => {
        el.textContent = turma?.nome || "Sem turma";
    });
}
```

**Call site** — add after existing initialization calls (aluno.js line 222):
```js
// aluno.js linha 222 — bloco existente de inicialização:
// aplicarTema();
// aplicarFotoPerfil();
// aplicarNomeUsuario();
// aplicarStatus();
// buscarUsuarioBanco();
// buscarPreferenciasBanco();
// buscarProgressoFuncoesBanco();
buscarTurmaAlunoBanco(); // ← ADICIONAR esta linha apenas
```

**Data-attribute collision avoidance** (Pitfall 5 from RESEARCH.md):
```
aluno.js existente usa:   [data-atividade-funcoes], [data-status-funcoes], [data-link-funcoes]
                          .etapas-trilha, .destaque-aluno, .cartao-destaque-pequeno
Fase 2 DEVE usar:         [data-trilha-id], [data-etapa-id], [data-progresso-trilha], [data-turma-nome]
Regra:                    Se o seletor não existe no HTML hoje → seguro usar
                          Se existe → criar data-attribute novo
```

---

### `backend/server.js` (modification only)

**Analog:** self — copy existing `app.use` registration pattern (server.js lines 9–12, 45–47)

**Pattern to copy** (server.js lines 9–12 imports + lines 45–47 registration):
```js
// IMPORTS — copiar estilo das linhas 9–11
const rotasTurmas = require("./routes/turmas");
const rotasTrilhas = require("./routes/trilhas");

// REGISTRATION — copiar estilo das linhas 45–47, adicionar após rotasAlunos
app.use("/api/turmas", rotasTurmas);
app.use("/api/trilhas", rotasTrilhas);
app.use("/api/aluno", rotasAlunos);  // GET /api/aluno/turma fica em rotasAlunos ou rotasTurmas separado
```

> **Decisão:** `GET /api/aluno/turma` pode ser adicionado a `routes/alunos.js` existente (mais simples) ou em `routes/turmas.js` com prefixo diferente. Planner decide — ambos seguem o padrão existente.

---

## Shared Patterns

### 1. `autenticar` middleware — usar sem modificação
**Source:** `backend/middleware/auth.js` lines 7–24  
**Apply to:** Todas as rotas em `turmas.js` e `trilhas.js`
```js
// Popula req.usuario = { id, perfil, iat, exp }
// jwt.verify lança JsonWebTokenError ou TokenExpiredError — capturado internamente
// Uso: roteador.get("/rota", autenticar, handler)
const { autenticar } = require("../middleware/auth");
```

### 2. Response envelope — `{ status: "ok"|"erro", <recurso>: ... }`
**Source:** `backend/controllers/usuariosController.js` (linhas 46, 78, 105, 145)  
**Apply to:** Todos os handlers em `turmasController.js` e `trilhasController.js`
```js
// Sucesso singular:   res.json({ status: "ok", turma: { ... } })
// Sucesso plural:     res.json({ status: "ok", trilhas: [...] })
// Criação:            res.status(201).json({ status: "ok", turma: { ... } })
// Validação falhou:   res.status(400).json({ status: "erro", message: "..." })
// Não encontrado:     res.status(404).json({ status: "erro", message: "..." })
// IDOR bloqueado:     res.status(403).json({ status: "erro", message: "Acesso negado." })
// Conflito/duplicata: res.status(409).json({ status: "erro", message: "..." })
// Erro interno:       res.status(500).json({ status: "erro", message: "...", detalhe: erro.message })
```

### 3. `banco.query()` pool — import sempre de `../db`
**Source:** `backend/db.js` lines 1–13  
**Apply to:** `turmasController.js`, `trilhasController.js`
```js
const banco = require("../db");
// banco é um mysql2/promise pool — await banco.query(sql, params) retorna [rows, fields]
// Destructuring padrão: const [linhas] = await banco.query(...)
```

### 4. Frontend 401-redirect pattern
**Source:** `assets/js/aluno.js` lines 44–49, 93–98, 292–297  
**Apply to:** Cada função `fetch` em `turma.js` e `trilhas.js`
```js
if (resposta.status === 401) {
    localStorage.removeItem("duopratic_token");
    localStorage.removeItem("duopratic_usuario");
    window.location.href = "../pages/login.html";
    return;
}
```

### 5. `mostrarAviso(texto)` toast — reutilizar, não redeclarar
**Source:** `assets/js/aluno.js` lines 379–391  
**Apply to:** `turma.js`, `trilhas.js` (aluno.js carrega antes via `<script>` no HTML)
```js
// Já disponível globalmente quando aluno.js carrega antes
// NÃO copiar a implementação — chamar diretamente:
mostrarAviso("Turma criada com sucesso");
mostrarAviso("Erro ao entrar na turma");
```

### 6. `parseInt(req.params.id, 10)` — IDs sempre numéricos
**Source:** `backend/controllers/alunosController.js` line 5  
**Apply to:** Todo handler que usa `req.params.id`, `req.params.alunoId`, `req.params.etapaId`
```js
const turmaId  = parseInt(req.params.id, 10);
const alunoId  = parseInt(req.params.alunoId, 10);
const etapaId  = parseInt(req.params.etapaId, 10);
```

### 7. `LIMIT 1` em toda SELECT de unicidade
**Source:** `backend/controllers/usuariosController.js` lines 37, 73, 89, 128  
**Apply to:** Toda query que busca por PK ou UNIQUE key
```js
// Sempre LIMIT 1 quando se espera zero ou um resultado
"SELECT id FROM turmas WHERE codigo = ? LIMIT 1"
"SELECT id FROM turmas WHERE id = ? AND professor_id = ? LIMIT 1"
```

---

## Deviations Required

| Deviation | Why Phase 1 pattern is insufficient | Phase 2 approach |
|-----------|-------------------------------------|------------------|
| **Inline perfil guard nas rotas** | `usuarios.js` verifica se `req.usuario.id === idRequisitado` (IDOR de recurso próprio). Para turmas/trilhas, a restrição é por **perfil** (professor vs aluno), não por ID. | Criar `verificarProfessor` e `verificarAluno` inline no arquivo de rota — mesma localização inline, lógica diferente. |
| **IDOR por `professor_id` na tabela, não por `req.params.id === req.usuario.id`** | Os controllers da Fase 1 comparam `req.params.id` com `req.usuario.id` diretamente. Para turmas, o recurso pertence ao professor mas o ID do recurso não é o ID do professor. | Usar helper `verificarDonoDaTurma(turmaId, req.usuario.id, banco)` que faz query com `WHERE id = ? AND professor_id = ?`. |
| **Perfil-based dual render no frontend** | `aluno.js` renderiza apenas para alunos. Não existe padrão de dual-view no frontend atual. | `turma.js` e `trilhas.js` detectam `usuarioLogado().perfil` e revelam/ocultam sections `#view-professor` / `#view-aluno`. |
| **`express-validator` para inputs de escrita** | Nenhum controller da Fase 1 usa `express-validator` (está instalado mas não usado). | Introduzir validação básica nos endpoints de escrita de turmas/trilhas: `check("nome").notEmpty()`, `check("tipo").isIn(["texto","video","link"])`. Estilo: inline nos handlers com `validationResult(req)`. |
| **`SUM(IF(...))` em vez de `COUNT(... FILTER)` para progresso** | Não existe query de agregação condicional na Fase 1. | Usar `SUM(IF(pe.concluido = 1, 1, 0))` — MySQL-nativo. NUNCA `FILTER (WHERE ...)` que é PostgreSQL. |
| **Geração de código único com retry loop** | Nenhum campo auto-gerado com garantia de unicidade existe na Fase 1. | Função `gerarCodigoUnico()` com loop de 10 tentativas + `SELECT` de verificação antes do `INSERT`. |
| **`ordem` auto-incrementado pelo controller** | Nenhum campo de ordem sequencial na Fase 1. | No handler `adicionarEtapa`: `SELECT MAX(ordem) FROM trilha_etapas WHERE trilha_id = ?` e usar `(max || 0) + 1`. NÃO aceitar `ordem` do body do cliente. |

---

## Anti-Patterns to Avoid

| Anti-Pattern | Source Evidence | O que fazer |
|--------------|-----------------|-------------|
| **`FILTER (WHERE ...)` em MySQL** | RESEARCH.md Pitfall 8 — sintaxe PostgreSQL não suportada no MySQL | Usar `SUM(IF(condicao, 1, 0))` ou `SUM(CASE WHEN condicao THEN 1 ELSE 0 END)` |
| **`req.body.alunoId` para progresso** | RESEARCH.md Security §4 — IDOR crítico | `aluno_id` no INSERT/UPDATE de `progresso_etapa` SEMPRE vem de `req.usuario.id` (JWT), nunca do body |
| **Rota literal depois de rota com param** | RESEARCH.md Pitfall 2 — Express interpreta "entrar" como `:id` | Registrar `router.post("/entrar", ...)` ANTES de `router.get("/:id/...", ...)` no mesmo arquivo de rotas |
| **Aluno em múltiplas turmas sem controle** | RESEARCH.md Pitfall 1 | `POST /api/turmas/entrar` verifica se aluno já tem turma antes do INSERT; retorna 409 com mensagem clara |
| **Reordenação de etapas com UNIQUE KEY ativo** | RESEARCH.md Pitfall 3 — viola `UNIQUE(trilha_id, ordem)` | Não implementar reordenação na Fase 2; `ordem` é append-only via MAX(ordem)+1 |
| **Redeclarar `usuarioLogado()` / `tokenAtual()` / `mostrarAviso()` em novos arquivos JS** | `aluno.js` lines 11–21, 379–391 — já globais quando aluno.js carrega antes | Chamar diretamente; documentar no topo do arquivo que dependem de aluno.js |
| **Tocar nas funções existentes de `aluno.js`** | RESEARCH.md Pitfall 5 — `buscarProgressoFuncoesBanco()` ainda é funcional | Apenas APPEND novas funções ao final; usar data-attributes novos (`[data-trilha-id]`) que não colidem |
| **Criar tabelas no `server.js` startup** | RESEARCH.md §Database — anti-pattern já removido na Fase 1 | Usar apenas SQL scripts em `database/` rodados manualmente |
| **`INSERT IGNORE` para progresso** | Silencia erros genuínos além de duplicatas | Usar `ON DUPLICATE KEY UPDATE concluido = 1, concluido_em = CURRENT_TIMESTAMP` — idempotente e explícito |
| **Hardcoded `professor_id` ou `aluno_id` no frontend** | RESEARCH.md Security §2,3,4 | IDs de ownership SEMPRE vindos do JWT no backend; frontend nunca envia seu próprio ID como prova de autorização |

---

## No Analog Found

Nenhum arquivo sem analog — todos os 8 arquivos têm match usável no codebase existente.  
Os dois padrões verdadeiramente novos (dual-view por perfil; geração de código único) estão documentados acima em **Deviations Required** com implementação concreta extraída do RESEARCH.md.

---

## Metadata

**Analog search scope:** `backend/routes/`, `backend/controllers/`, `backend/middleware/`, `backend/`, `assets/js/`, `database/`  
**Files scanned:** 9 source files read  
**Pattern extraction date:** 2026-05-22
