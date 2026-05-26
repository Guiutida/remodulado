# Phase 2: Turmas e Trilhas — Research

**Pesquisado em:** 2026-05-22  
**Domínio:** CRUD de turmas/trilhas com MySQL2 raw queries; frontend vanilla JS  
**Confiança geral:** HIGH — tudo verificado diretamente no codebase real

---

<phase_requirements>
## Phase Requirements

| ID | Descrição | Suporte da Pesquisa |
|----|-----------|---------------------|
| TURM-01 | Professor pode criar turma com nome e código de acesso | Tabela `turmas` já existe com `codigo` UNIQUE; falta API POST + geração do código |
| TURM-02 | Aluno pode entrar em turma pelo código de acesso | Tabela `turma_alunos` já existe; falta endpoint `POST /api/turmas/entrar` |
| TURM-03 | Professor visualiza lista de membros da turma | JOIN `turma_alunos` + `usuarios`; falta endpoint `GET /api/turmas/:id/membros` |
| TURM-04 | Professor pode remover aluno da turma | DELETE em `turma_alunos`; falta endpoint `DELETE /api/turmas/:id/membros/:alunoId` |
| TURM-05 | Aluno visualiza a turma em que está inscrito | JOIN `turma_alunos` + `turmas`; falta endpoint `GET /api/aluno/turma` |
| TRIL-01 | Professor pode criar trilha com nome, descrição e disciplina | Tabela `trilhas` **não existe** — criar via migration |
| TRIL-02 | Professor pode adicionar etapas à trilha (texto, vídeo, link) | Tabela `trilha_etapas` **não existe** — criar via migration |
| TRIL-03 | Professor atribui trilha a uma turma | Coluna `turma_id` na `trilhas` faz a atribuição; endpoint `POST /api/trilhas/:id/atribuir` (ou via criação) |
| TRIL-04 | Aluno visualiza trilhas disponíveis na sua turma | Query JOIN `trilhas` WHERE `turma_id` = turma do aluno |
| TRIL-05 | Aluno navega pelas etapas da trilha em sequência | Coluna `ordem` em `trilha_etapas`; UI renderiza em ordem ASC |
| TRIL-06 | Progresso do aluno na trilha é persistido no banco | Tabela `progresso_etapa` **não existe** — criar via migration |
| TRIL-07 | Aluno pode marcar etapa como concluída | INSERT/UPDATE em `progresso_etapa`; endpoint `POST /api/trilhas/etapas/:id/concluir` |
</phase_requirements>

---

## Research Summary

Phase 1 entregou uma base sólida: backend 100% modular (`routes/` + `controllers/` + `middleware/`), JWT funcional em todas as rotas, bcrypt, helmet, CORS configurado e zero seed em produção. O schema já tem `turmas` e `turma_alunos` — metade do trabalho de banco de dados desta fase já existe.

O que **falta** para a Fase 2 são exatamente três tabelas novas (`trilhas`, `trilha_etapas`, `progresso_etapa`), dois novos pares route/controller (`turmas.js` e `trilhas.js`), e a conexão do frontend com a API real. O padrão de módulos da Fase 1 deve ser replicado literalmente — não há decisões de arquitetura a tomar, só execução consistente.

O maior ponto de atenção é a **dualidade de visualização**: `turma.html` tem `data-perfil-guard=""` (aceita professor e aluno), mas o conteúdo hoje é fixo no HTML. Na Fase 2, o JS deverá detectar `usuarioLogado().perfil` e renderizar a view correta para cada perfil. Da mesma forma, `trilhas.html` atualmente tem `data-perfil-guard="aluno"` — precisará mudar para `""` e renderizar seções condicionais.

**Recomendação primária:** Criar migration SQL `database/migration-02-trilhas.sql` + dois novos módulos `routes/turmas.js` e `routes/trilhas.js` + dois novos controllers + JS por página. Zero dependências novas necessárias.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Geração de `codigo_acesso` único | API / Backend | — | Precisa de acesso ao banco para garantir unicidade; nunca no cliente |
| Verificação de membership na turma antes de mostrar trilhas | API / Backend | — | Segurança IDOR; cliente nunca decide o que é autorizado |
| Ordenação de etapas por `ordem` ASC | API / Backend | Frontend (render) | Backend garante no SELECT; frontend renderiza na ordem recebida |
| Persistência de progresso de etapa | API / Backend | Database | Regra de negócio no controller; MySQL guarda o estado |
| Renderização condicional professor/aluno em turma.html e trilhas.html | Browser / Client | — | Lógica de display puramente baseada em `localStorage.perfil` após auth |
| Cálculo de percentual de progresso de trilha | API / Backend | — | COUNT de etapas concluídas / total; nunca hardcoded no frontend |
| Geração de código de acesso no frontend | ❌ NÃO FAZER | — | Uniqueness requer banco; sempre backend |

---

## Tech Stack (confirmed)

**Nenhuma dependência nova necessária para a Fase 2.** Todos os pacotes já estão instalados.

| Pacote | Versão | Uso na Fase 2 | Já instalado? |
|--------|--------|---------------|---------------|
| `express` | 4.21.2 | Rotas REST | ✅ `backend/package.json` |
| `mysql2` | 3.22.3 | Queries raw ao banco | ✅ `backend/package.json` |
| `jsonwebtoken` | 9.0.3 | `autenticar` middleware nas novas rotas | ✅ `backend/package.json` |
| `express-validator` | 7.3.2 | Validação de inputs (nome, código, tipo etapa) | ✅ `backend/package.json` |
| `helmet` + `cors` | já configurados | Sem mudança | ✅ `backend/server.js` |

**Importante:** A pesquisa confirma que `express-validator` está instalado mas **não está sendo usado ainda** nos controllers existentes. A Fase 2 deve introduzir validação real nos novos endpoints (nome da turma não vazio, tipo de etapa no ENUM válido, etc.).

---

## Existing Codebase Analysis

### O que já existe no banco (`database/schema.sql`)

```sql
-- ✅ JÁ EXISTE — base das turmas está pronta
CREATE TABLE turmas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    disciplina VARCHAR(80) NOT NULL,
    codigo VARCHAR(20) NOT NULL UNIQUE,   -- campo ja reservado para o codigo de acesso
    professor_id INT NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (professor_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ✅ JÁ EXISTE — bridge table aluno-turma está pronta
CREATE TABLE turma_alunos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    turma_id INT NOT NULL,
    aluno_id INT NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY turma_aluno_unico (turma_id, aluno_id),   -- evita duplicatas
    FOREIGN KEY (turma_id) REFERENCES turmas(id) ON DELETE CASCADE,
    FOREIGN KEY (aluno_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
```

### O que **NÃO existe** e precisa ser criado

As três tabelas de trilhas e progresso **não existem** no `schema.sql`. Precisam ser criadas via migration script.

### Módulos existentes (Fase 1) para replicar o padrão

| Arquivo | Papel | Replica exatamente para |
|---------|-------|------------------------|
| `backend/routes/alunos.js` | Route com IDOR middleware inline | `routes/turmas.js`, `routes/trilhas.js` |
| `backend/controllers/alunosController.js` | Controller com `banco.query()` | `controllers/turmasController.js`, `controllers/trilhasController.js` |
| `backend/middleware/auth.js` | `autenticar` — usar sem modificação | Importar em todas as novas rotas |
| `backend/db.js` | Pool MySQL2 | `const banco = require("../db")` nos novos controllers |

### Frontend existente (padrões a preservar)

**`assets/js/aluno.js`** (26KB) — arquivo compartilhado entre `aluno.html`, `trilhas.html`, `turma.html` e `configuracoes.html`. Contém:
- `usuarioLogado()` — retorna objeto do localStorage
- `tokenAtual()` — retorna JWT do localStorage
- `mostrarAviso(texto)` — toast de feedback
- Handler de 401: limpa localStorage + redireciona para login
- Sistema de status, tema, foto de perfil — **NÃO tocar**

**Padrão de fetch que DEVE ser replicado:**
```js
const resposta = await fetch("/api/rota", {
    headers: { "Authorization": `Bearer ${tokenAtual()}` }
});
if (resposta.status === 401) {
    localStorage.removeItem("duopratic_token");
    localStorage.removeItem("duopratic_usuario");
    window.location.href = "../pages/login.html";
    return;
}
```

**`assets/js/auth-guard.js`** — verifica `data-perfil-guard` no `<body>`. Não requer modificação. O atributo das páginas precisará ser ajustado:
- `turma.html` — manter `data-perfil-guard=""` (ambos os perfis)
- `trilhas.html` — mudar de `data-perfil-guard="aluno"` para `data-perfil-guard=""` (professores também criam trilhas)

### Estado atual dos arquivos HTML relevantes

| Página | Guard atual | Guard necessário | Dados hardcoded a substituir |
|--------|-------------|------------------|------------------------------|
| `turma.html` | `""` (qualquer auth) | `""` (manter) | Nome da turma, código, nº alunos, lista colegas, avisos, atividades |
| `trilhas.html` | `"aluno"` | `""` | Nome, percentual, lista de trilhas em andamento e próximas |
| `aluno.html` | `"aluno"` | `"aluno"` (manter) | Progresso 72%, sequência 5 dias, etapas da trilha (Fase 3 completa isso) |
| `professor.html` | `"professor"` | `"professor"` (manter) | Nº turmas, entregas, avisos — adicionar seção de criação de turma/trilha |

---

## Database Schema Design

### Migration Script: `database/migration-02-trilhas.sql`

```sql
-- Migration 02: Trilhas e Progresso
-- Executar UMA VEZ após Phase 1 estar em produção/dev

USE duopratic;

-- Trilhas (criadas pelo professor, atribuídas a uma turma)
CREATE TABLE IF NOT EXISTS trilhas (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    turma_id      INT          NOT NULL,
    professor_id  INT          NOT NULL,              -- desnormalização útil para IDOR check
    titulo        VARCHAR(140) NOT NULL,
    disciplina    VARCHAR(80)  NOT NULL,
    descricao     TEXT,
    ativa         TINYINT(1)   NOT NULL DEFAULT 1,
    criado_em     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (turma_id)    REFERENCES turmas(id)   ON DELETE CASCADE,
    FOREIGN KEY (professor_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Etapas da trilha (ordenadas, tipo: texto | video | link)
CREATE TABLE IF NOT EXISTS trilha_etapas (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    trilha_id   INT           NOT NULL,
    ordem       SMALLINT      NOT NULL,               -- 1, 2, 3 ... determina sequência
    titulo      VARCHAR(140)  NOT NULL,
    tipo        ENUM('texto','video','link') NOT NULL DEFAULT 'texto',
    conteudo    TEXT          NOT NULL,               -- texto, URL do vídeo ou URL do link
    criado_em   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trilha_id) REFERENCES trilhas(id) ON DELETE CASCADE,
    UNIQUE KEY etapa_unica (trilha_id, ordem)         -- garante que não há 2 etapas com mesma ordem
) ENGINE=InnoDB;

-- Progresso por aluno por etapa
CREATE TABLE IF NOT EXISTS progresso_etapa (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    aluno_id     INT       NOT NULL,
    etapa_id     INT       NOT NULL,
    concluido    TINYINT(1) NOT NULL DEFAULT 0,
    concluido_em TIMESTAMP NULL,
    UNIQUE KEY progresso_unico (aluno_id, etapa_id),  -- um registro por aluno/etapa
    FOREIGN KEY (aluno_id) REFERENCES usuarios(id)      ON DELETE CASCADE,
    FOREIGN KEY (etapa_id) REFERENCES trilha_etapas(id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

### Notas de design

1. **`professor_id` em `trilhas`**: desnormalizado propositalmente — sem ele, cada IDOR check precisaria de um JOIN `trilhas → turmas → professor_id`, tornando o código mais complexo sem ganho para TCC. Com ele, o check é `WHERE id = ? AND professor_id = req.usuario.id`.

2. **`tipo` em `trilha_etapas`**: `ENUM('texto','video','link')` cobre os três tipos mencionados no requisito TRIL-02. O campo `conteudo` é TEXT e armazena o texto formatado, URL de vídeo (YouTube embed) ou URL do link, conforme o tipo.

3. **`progresso_etapa` simples**: apenas `concluido` (0/1) e timestamp. Sem estados intermediários (ex: "em_progresso") para manter o scope do TCC. A Fase 3 pode adicionar se necessário.

4. **Cálculo de percentual** — NUNCA armazenar, sempre calcular:
```sql
SELECT
    COUNT(te.id)                                             AS total_etapas,
    SUM(COALESCE(pe.concluido, 0))                          AS etapas_concluidas,
    ROUND(SUM(COALESCE(pe.concluido, 0)) / COUNT(te.id) * 100) AS percentual
FROM trilha_etapas te
LEFT JOIN progresso_etapa pe ON pe.etapa_id = te.id AND pe.aluno_id = ?
WHERE te.trilha_id = ?
GROUP BY te.trilha_id
```

### Abordagem de migration (raw MySQL2, sem ORM)

O projeto usa `mysql2/promise` direto. A abordagem mais segura para TCC:

**Opção recomendada: SQL script manual** (`database/migration-02-trilhas.sql`):
- `CREATE TABLE IF NOT EXISTS` → idempotente, seguro para rodar múltiplas vezes
- Rodado manualmente no MySQL Workbench / CLI na instalação
- Documentado no README como passo de setup
- **Não** criar tabelas no `server.js` startup (anti-pattern já identificado e removido na Fase 1)

**Alternativa aceitável: script Node.js** (`backend/scripts/migration-02.js`):
- Padrão estabelecido pela Fase 1 (`backend/scripts/migrar-senhas.js`)
- Rodado uma vez via `node backend/scripts/migration-02.js`
- Vantagem: pode logar sucesso/falha com mais contexto

**NÃO usar**: Sequelize migrations, Flyway, Liquibase — oversized para TCC com 3 tabelas.

---

## API Design

### Módulo de Turmas

**Arquivo:** `backend/routes/turmas.js` + `backend/controllers/turmasController.js`  
**Registrar em `server.js`:** `app.use("/api/turmas", rotasTurmas)`

| Método | Rota | Auth | Perfil | Requisito | Descrição |
|--------|------|------|--------|-----------|-----------|
| `POST` | `/api/turmas` | ✅ JWT | professor | TURM-01 | Cria turma, gera código único |
| `GET` | `/api/turmas` | ✅ JWT | professor | TURM-01,03 | Lista turmas do professor logado |
| `GET` | `/api/turmas/:id/membros` | ✅ JWT | professor | TURM-03 | Lista alunos membros |
| `DELETE` | `/api/turmas/:id/membros/:alunoId` | ✅ JWT | professor | TURM-04 | Remove aluno da turma |
| `POST` | `/api/turmas/entrar` | ✅ JWT | aluno | TURM-02 | Aluno entra pelo código |
| `GET` | `/api/aluno/turma` | ✅ JWT | aluno | TURM-05 | Retorna turma atual do aluno |

> `GET /api/aluno/turma` é registrado como `app.use("/api/aluno", rotasAluno)` — separado, ou adicionado às rotas de alunos existentes.

### Módulo de Trilhas

**Arquivo:** `backend/routes/trilhas.js` + `backend/controllers/trilhasController.js`  
**Registrar em `server.js`:** `app.use("/api/trilhas", rotasTrilhas)`

| Método | Rota | Auth | Perfil | Requisito | Descrição |
|--------|------|------|--------|-----------|-----------|
| `POST` | `/api/trilhas` | ✅ JWT | professor | TRIL-01,03 | Cria trilha já associada a uma turma |
| `GET` | `/api/trilhas/turma/:turmaId` | ✅ JWT | professor | TRIL-01 | Lista trilhas da turma (visão do professor) |
| `POST` | `/api/trilhas/:id/etapas` | ✅ JWT | professor | TRIL-02 | Adiciona etapa à trilha |
| `GET` | `/api/trilhas/minhas` | ✅ JWT | aluno | TRIL-04 | Trilhas da turma do aluno com progresso |
| `GET` | `/api/trilhas/:id/etapas` | ✅ JWT | aluno+prof | TRIL-05 | Lista etapas em sequência (ORDER BY ordem) |
| `POST` | `/api/trilhas/etapas/:etapaId/concluir` | ✅ JWT | aluno | TRIL-06,07 | Marca etapa como concluída |
| `GET` | `/api/trilhas/:id/progresso` | ✅ JWT | aluno | TRIL-06 | Retorna % progresso do aluno na trilha |

### Padrão de geração de código de acesso (TURM-01)

```js
// backend/controllers/turmasController.js
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem ambíguos: 0/O, 1/I

async function gerarCodigoUnico(banco) {
    for (let tentativa = 0; tentativa < 10; tentativa++) {
        let codigo = "";
        for (let i = 0; i < 6; i++) {
            codigo += CHARS[Math.floor(Math.random() * CHARS.length)];
        }
        const [existente] = await banco.query(
            "SELECT id FROM turmas WHERE codigo = ? LIMIT 1", [codigo]
        );
        if (!existente.length) return codigo;
    }
    throw new Error("Não foi possível gerar código único após 10 tentativas.");
}
```

**Formato:** 6 caracteres, maiúsculas, sem caracteres ambíguos (O/0, I/1). Com 32 chars → 32^6 = ~1 bilhão de combinações → colisão é improvável para TCC.

### IDOR checks — padrão da Fase 1 aplicado às novas rotas

```js
// IDOR: professor só modifica sua própria turma
async function verificarDonoDaTurma(turmaId, professorId, banco) {
    const [turmas] = await banco.query(
        "SELECT id FROM turmas WHERE id = ? AND professor_id = ? LIMIT 1",
        [turmaId, professorId]
    );
    return turmas.length > 0;
}

// No controller:
if (!(await verificarDonoDaTurma(req.params.id, req.usuario.id, banco))) {
    return res.status(403).json({ status: "erro", message: "Acesso negado." });
}

// IDOR: aluno só acessa trilhas da turma em que está
async function verificarMembroTurma(turmaId, alunoId, banco) {
    const [rows] = await banco.query(
        "SELECT id FROM turma_alunos WHERE turma_id = ? AND aluno_id = ? LIMIT 1",
        [turmaId, alunoId]
    );
    return rows.length > 0;
}
```

### Respostas de API — formato padrão do projeto

```js
// Sucesso
res.status(201).json({ status: "ok", turma: { id, nome, codigo, criado_em } });
res.json({ status: "ok", trilhas: [...] });

// Erro de validação
res.status(400).json({ status: "erro", message: "Nome da turma é obrigatório." });

// Não encontrado
res.status(404).json({ status: "erro", message: "Turma não encontrada." });

// Conflito (já membro)
res.status(409).json({ status: "erro", message: "Você já é membro desta turma." });

// Proibido (IDOR)
res.status(403).json({ status: "erro", message: "Acesso negado." });

// Erro interno
res.status(500).json({ status: "erro", message: "Erro ao criar turma.", detalhe: erro.message });
```

---

## Frontend Analysis

### turma.html — dual view (professor + aluno)

O arquivo tem `data-perfil-guard=""` — ambos os perfis chegam nesta página. O JS (novo `assets/js/turma.js`) deve detectar o perfil e renderizar views diferentes:

**View do professor** (quando `usuarioLogado().perfil === "professor"`):
- Formulário de criação de turma: nome + disciplina → `POST /api/turmas`
- Lista das turmas criadas com códigos de acesso exibidos
- Ao clicar numa turma: lista de membros via `GET /api/turmas/:id/membros`
- Botão "remover" por aluno: `DELETE /api/turmas/:id/membros/:alunoId`

**View do aluno** (quando `usuarioLogado().perfil === "aluno"`):
- Se não estiver em turma: formulário "Entrar na turma" com campo de código → `POST /api/turmas/entrar`
- Se estiver em turma: exibe info da turma via `GET /api/aluno/turma` (nome, código, professor, nº colegas)
- Lista de colegas (nomes dos membros)

**Estratégia de implementação:** Criar dois `<section>` no HTML com `id="view-professor"` e `id="view-aluno"`, ambos ocultos por CSS. O JS revela o correto após checar o perfil.

**Nota sobre aluno.js:** O `aluno.js` não deve ser modificado para lógica de turma — criar `assets/js/turma.js` dedicado. O `aluno.js` continua como script de suporte (usuarioLogado, tokenAtual, tema, etc.).

### trilhas.html — dual view (professor + aluno)

Atualmente tem `data-perfil-guard="aluno"` — **precisa mudar para `""`**.

**View do professor:**
- Dropdown para selecionar turma + botão "Nova trilha"
- Formulário de criação: título, disciplina, descrição → `POST /api/trilhas`
- Formulário de etapa: título, tipo (texto/vídeo/link), conteúdo → `POST /api/trilhas/:id/etapas`
- Lista de trilhas da turma via `GET /api/trilhas/turma/:turmaId`

**View do aluno:**
- Lista de trilhas disponíveis via `GET /api/trilhas/minhas`
- Barra de progresso calculada pelo backend
- Ao clicar numa trilha: etapas em sequência via `GET /api/trilhas/:id/etapas`
- Botão "Marcar como concluída" por etapa: `POST /api/trilhas/etapas/:id/concluir`

**Criar:** `assets/js/trilhas.js` dedicado para esta página.

### aluno.html — atualizações de Fase 2

Os indicadores de progresso e "caminho da trilha" nesta página serão **parcialmente** conectados na Fase 2:
- Seção "Caminho da trilha" → busca `GET /api/trilhas/minhas` e renderiza a primeira trilha ativa com etapas
- Seção "Turma" → busca `GET /api/aluno/turma` para mostrar nome da turma e aviso recente

Os indicadores completos (streak, revisão pendente) são escopo da Fase 3 — substituir por placeholders dinâmicos na Fase 2.

### Arquivos JS a criar

| Arquivo | Páginas que carregam | Responsabilidade |
|---------|----------------------|------------------|
| `assets/js/turma.js` | `turma.html` | Lógica de turma para professor e aluno |
| `assets/js/trilhas.js` | `trilhas.html` | Lógica de trilhas para professor e aluno |

Ambos importam `aluno.js` implicitamente (via `<script>` anterior no HTML) para acesso a `usuarioLogado()`, `tokenAtual()`, `mostrarAviso()`.

---

## Security Considerations

### 1. IDOR em operações de turma

**Risco:** Professor A modifica turma do Professor B.  
**Proteção:** Todo `PUT/DELETE` em turma verifica `professor_id = req.usuario.id`:
```sql
SELECT id FROM turmas WHERE id = ? AND professor_id = ?
```

### 2. IDOR em operações de trilha

**Risco:** Professor A adiciona etapa à trilha do Professor B.  
**Proteção:** Controller verifica `trilhas.professor_id = req.usuario.id` antes de qualquer escrita.

### 3. Aluno acessando trilha de turma alheia

**Risco:** Aluno adivinha `trilha_id` e acessa trilha de turma que não é membro.  
**Proteção:** `GET /api/trilhas/:id/etapas` verifica:
```sql
SELECT ta.id
FROM turma_alunos ta
JOIN trilhas t ON t.turma_id = ta.turma_id
WHERE t.id = ? AND ta.aluno_id = ?
```
Se não encontrar → 403.

### 4. Aluno marcando progresso de outro aluno

**Risco:** `POST /api/trilhas/etapas/:id/concluir` usado com etapa de outro aluno.  
**Proteção:** O `aluno_id` no INSERT/UPDATE vem de `req.usuario.id` (token JWT), nunca do body:
```js
// ERRADO (IDOR):
await banco.query("INSERT INTO progresso_etapa (aluno_id, etapa_id, ...) VALUES (?, ?, ...)",
    [req.body.alunoId, etapaId, ...]); // ← nunca usar req.body para o aluno_id

// CORRETO:
await banco.query("INSERT INTO progresso_etapa (aluno_id, etapa_id, ...) VALUES (?, ?, ...)",
    [req.usuario.id, etapaId, ...]); // ← sempre do token
```

### 5. Código de acesso de turma — enumeração

**Risco:** Bot testa todos os códigos de 6 chars para descobrir turmas.  
**Proteção mínima (TCC):** O `express-rate-limit` já está em `/api/login` e `/api/cadastro`. Aplicar também a `POST /api/turmas/entrar`.

### 6. Perfil não verificado além do guard frontend

**Risco:** Aluno faz `POST /api/turmas` (criar turma) manualmente via curl.  
**Proteção:** Middleware `verificarProfessor` nas rotas de escrita de professor:
```js
function verificarProfessor(req, res, next) {
    if (req.usuario.perfil !== "professor") {
        return res.status(403).json({ status: "erro", message: "Apenas professores podem realizar esta ação." });
    }
    next();
}
// Uso: router.post("/", autenticar, verificarProfessor, turmasController.criar)
```

Similarmente, `verificarAluno` para endpoints exclusivos de aluno.

---

## Risk & Pitfalls

### Pitfall 1: Aluno em múltiplas turmas — undefined behavior no frontend

**Problema:** `turma_alunos` permite aluno em N turmas (`UNIQUE KEY` apenas por par). Se o aluno entrar em 2 turmas, `GET /api/aluno/turma` retornaria qual?  
**Solução recomendada:** Backend retorna a turma mais recente (`ORDER BY criado_em DESC LIMIT 1`). Opcionalmente, checar antes do INSERT se aluno já está em alguma turma e retornar 409 com mensagem "Você já está em uma turma. Saia da turma atual para entrar em outra." — **mais simples para TCC**.

### Pitfall 2: `POST /api/turmas/entrar` conflita com `GET /api/turmas/:id` no Express router

**Problema:** Se registrar `router.post("/:id/membros")` e depois `router.post("/entrar")`, o Express pode interpretar "entrar" como `:id`.  
**Solução:** Sempre registrar rotas literais ANTES de rotas com parâmetros:
```js
// routes/turmas.js — ORDEM IMPORTA
roteador.post("/entrar", autenticar, verificarAluno, turmasController.entrar); // PRIMEIRO
roteador.get("/:id/membros", autenticar, verificarProfessor, turmasController.getMembros); // DEPOIS
```

### Pitfall 3: UNIQUE KEY em `trilha_etapas(trilha_id, ordem)` bloqueia reordenação

**Problema:** Se o professor quiser reordenar etapas (ex: mover etapa 3 para posição 2), o UPDATE viola a UNIQUE KEY.  
**Solução para TCC:** Não implementar reordenação na Fase 2. Etapas são adicionadas em sequência e `ordem` é auto-incrementado pelo controller (MAX(ordem)+1). Reordenação é escopo futuro.

### Pitfall 4: `ON DUPLICATE KEY` vs verificação explícita no progresso

**Problema:** Se usar `INSERT INTO progresso_etapa ... ON DUPLICATE KEY UPDATE`, funciona. Mas se o aluno clicar "concluir" duas vezes, a segunda chamada retorna sucesso silencioso.  
**Solução:** Usar `INSERT ... ON DUPLICATE KEY UPDATE concluido = 1, concluido_em = CURRENT_TIMESTAMP` — idempotente e correto.

### Pitfall 5: Hardcoded `buscarProgressoFuncoesBanco()` em `aluno.js`

**Problema:** `aluno.js` tem uma chamada hardcoded a `/api/alunos/:id/progresso/funcoes` que atualiza elementos DOM específicos ("Funções do 1º grau"). Esta lógica conflita com a Fase 2 que quer substituir isso por dados dinâmicos.  
**Solução:** NÃO remover `buscarProgressoFuncoesBanco()` na Fase 2 — ela ainda funciona como fallback para dados legados. Os novos elementos DOM de trilhas dinâmicas devem ter IDs/classes diferentes (`[data-trilha-id]`) para não colidir com a lógica hardcoded.

### Pitfall 6: `trilhas.html` tem `data-perfil-guard="aluno"` — professor é redirecionado

**Problema:** Se um professor abrir `trilhas.html` sem mudar o guard, `auth-guard.js` o redireciona para `professor.html`.  
**Solução:** Mudar `data-perfil-guard="aluno"` para `data-perfil-guard=""` em `trilhas.html` na Fase 2.

### Pitfall 7: `turma.html` nav mostra links de aluno para professores

**Problema:** O `<aside class="barra-aluno">` em `turma.html` tem links para `aluno.html`, `trilhas.html`, `atividades.html` — irrelevantes para professores.  
**Solução TCC:** Mostrar nav condicional via JS (ocultar sidebar e exibir sidebar de professor). Para o TCC, aceita-se um `display: none` do nav aluno e inserção do nav professor via JS. Alternativa simples: adicionar `href="professor.html"` com `id="link-home"` e atualizar via JS conforme perfil.

### Pitfall 8: MySQL `FILTER (WHERE ...)` não existe no MySQL

**Problema:** A query de percentual no `ARCHITECTURE.md` usa `COUNT(...) FILTER (WHERE ...)` — sintaxe PostgreSQL, **não suportada no MySQL**.  
**Solução MySQL correta:**
```sql
-- MySQL: usar SUM + IF ou SUM + CASE
SELECT
    COUNT(te.id) AS total_etapas,
    SUM(IF(pe.concluido = 1, 1, 0)) AS etapas_concluidas,
    ROUND(SUM(IF(pe.concluido = 1, 1, 0)) / COUNT(te.id) * 100) AS percentual
FROM trilha_etapas te
LEFT JOIN progresso_etapa pe ON pe.etapa_id = te.id AND pe.aluno_id = ?
WHERE te.trilha_id = ?
```

---

## Confidence Level

| Área | Nível | Razão |
|------|-------|-------|
| Schema de banco | HIGH | `schema.sql` lido diretamente; design de trilhas verificado contra ARCHITECTURE.md do projeto |
| Padrão de módulos backend | HIGH | Código real de routes/controllers/middleware lido e documentado |
| Padrão de frontend (fetch + auth) | HIGH | `aluno.js` e `auth-guard.js` lidos completamente |
| Design dos endpoints REST | HIGH | Baseado em padrões estabelecidos + requisitos explícitos do ROADMAP |
| Estado das páginas HTML | HIGH | HTML lido linha a linha; todos os dados hardcoded identificados |
| Edge cases de MySQL UNIQUE KEY | HIGH | Verificado no schema real; pitfall de `FILTER` verificado via conhecimento de SQL |
| Geração de código 6 chars | MEDIUM | Padrão estabelecido (charset sem ambíguos); colisão probabilística calculada |

---

## RESEARCH COMPLETE
