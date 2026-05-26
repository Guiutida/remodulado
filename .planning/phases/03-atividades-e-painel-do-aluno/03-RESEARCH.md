# Phase 3: Atividades e Painel do Aluno — Research

**Pesquisado em:** 2025-01-27
**Domínio:** Módulo de atividades multi-questão + painel de progresso real (backend Node/Express/MySQL2 + frontend Vanilla JS)
**Confiança geral:** HIGH — toda base foi lida diretamente do código-fonte

---

## Sumário Executivo

A Phase 3 estende o sistema em **três frentes complementares**: (1) o professor cria atividades com questões estruturadas (múltipla escolha e dissertativa), (2) o aluno responde e recebe feedback imediato nas questões objetivas, e (3) os painéis do aluno e do professor substituem dados hardcoded por dados reais de BD.

O esquema atual contém `atividades` e `entregas`, mas ambas as tabelas foram projetadas para atividade de resposta única (campo `resposta TEXT`). Para suportar múltiplas questões, é necessário criar duas novas tabelas (`questoes`, `respostas_questao`) e manter `entregas` como cabeçalho de submissão. Não existe nenhuma coluna para streak ou pontuação — estas precisam ser adicionadas via migration.

O `alunosController.js` atual é **inteiramente hardcoded** para "Funcoes do 1 grau" e deve ser completamente reescrito. O arquivo `aluno.js` contém funções legadas (`buscarProgressoFuncoesBanco`, `aplicarProgressoFuncoes`, `marcarFuncoesConcluidaBanco`) que devem ser removidas.

**Recomendação principal:** 5 planos em sequência — (A) migration de BD, (B) backend criação de atividades, (C) backend respostas + feedback, (D) backend painéis com dados reais, (E) frontend dual-view completo.

---

<phase_requirements>
## Phase Requirements

| ID | Descrição | Suporte da Pesquisa |
|----|-----------|---------------------|
| ATIV-01 | Professor pode criar atividade com questões de múltipla escolha | Nova tabela `questoes` com `tipo='multipla_escolha'`, `opcoes JSON`, `gabarito` |
| ATIV-02 | Professor pode criar atividade com questões dissertativas | Mesmo modelo, `tipo='dissertativa'`, `gabarito NULL` |
| ATIV-03 | Professor atribui atividade a uma turma com prazo | Coluna `prazo DATE` já existe em `atividades`; IDOR via `turmas.professor_id` |
| ATIV-04 | Aluno responde atividade e recebe retorno imediato nas questões objetivas | Resposta salva em `respostas_questao`; comparação com `gabarito` no server, resultado devolvido no JSON |
| ATIV-05 | Resposta do aluno é salva no banco de dados | `ON DUPLICATE KEY UPDATE` em `respostas_questao`; cabeçalho em `entregas` |
| ATIV-06 | Professor visualiza entregas dos alunos para cada atividade | Query `GROUP BY aluno_id` em `respostas_questao` + `entregas`; IDOR via `turmas.professor_id` |
| ALUN-01 | Aluno visualiza progresso real nas trilhas (não hardcoded) | Endpoint já existe em `trilhasController.listarAluno`; `aluno.html` precisa consumi-lo |
| ALUN-02 | Aluno visualiza histórico de atividades realizadas | Nova query em `entregas JOIN atividades`; novo endpoint `/api/alunos/historico` |
| ALUN-03 | Aluno visualiza pontuação e sequência de estudos (streak) | Novas colunas `pontuacao`, `streak_atual`, `ultimo_acesso` em `usuarios`; atualizado a cada submissão |
| PROF-03 | Professor visualiza desempenho dos alunos na turma ⚠️ | Query `GROUP BY aluno_id` com contagens; ver nota sobre conflito de numeração abaixo |
</phase_requirements>

---

## ⚠️ Conflito de Numeração: PROF-03

O `REQUIREMENTS.md` define **PROF-03** como *"Professor pode criar e gerenciar avisos para a turma"*. A descrição desta Phase 3 usa PROF-03 para *"Professor visualiza desempenho dos alunos na turma"*.

A funcionalidade real de **desempenho** (ATIV-06 + visão por aluno) está no escopo desta fase conforme o enunciado. O planner deve implementar a funcionalidade descrita na fase, e o `REQUIREMENTS.md` precisará de uma correção de rastreabilidade. **Não bloqueante.**

---

## Análise do Esquema de BD

### Tabelas Existentes — O que Temos

#### `atividades`
```sql
id, turma_id, titulo, descricao TEXT, prazo DATE, criado_em
```
- ✅ `turma_id` permite IDOR check via `turmas.professor_id`
- ✅ `prazo DATE` já existe (ATIV-03 parcialmente coberto)
- ❌ Sem campo `tipo` de atividade (mas não necessário — o tipo é determinado pelas questões)
- ❌ Sem questões estruturadas — apenas `descricao` livre

#### `entregas`
```sql
id, atividade_id, aluno_id, resposta TEXT, status ENUM('pendente','entregue','corrigida'),
nota DECIMAL(4,2), comentario_professor TEXT, enviado_em, criado_em
UNIQUE KEY entrega_unica (atividade_id, aluno_id)
```
- ✅ Estrutura de cabeçalho de submissão já existe
- ✅ `UNIQUE KEY` previne duplicatas — `ON DUPLICATE KEY UPDATE` funcionará
- ❌ `resposta TEXT` único campo: não serve para múltiplas questões
- ✅ **Decisão:** manter `entregas` como cabeçalho (status geral da submissão); questões individuais vão em `respostas_questao`

#### `usuarios`
```sql
id, nome, email, senha, perfil ENUM('aluno','professor'), criado_em
```
- ❌ Sem `pontuacao`, `streak_atual`, `ultimo_acesso` — necessários para ALUN-03

### Novas Tabelas Necessárias

#### `questoes` (nova)
```sql
CREATE TABLE IF NOT EXISTS questoes (
    id           INT          AUTO_INCREMENT PRIMARY KEY,
    atividade_id INT          NOT NULL,
    ordem        SMALLINT     NOT NULL,
    tipo         ENUM('multipla_escolha','dissertativa') NOT NULL,
    enunciado    TEXT         NOT NULL,
    opcoes       JSON         NULL,    -- ["a) Opção A","b) Opção B","c) Opção C","d) Opção D"]
    gabarito     VARCHAR(10)  NULL,    -- "a","b","c","d" para multipla_escolha; NULL para dissertativa
    criado_em    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY questao_unica (atividade_id, ordem),
    FOREIGN KEY (atividade_id) REFERENCES atividades(id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

**Decisão de design:** `opcoes JSON` em vez de tabela separada `opcoes_questao` — adequado para o escopo do TCC, evita JOINs extras. MySQL 5.7+ suporta JSON nativo; verificar versão do ambiente se necessário.

**Gabarito no servidor:** `gabarito` é armazenado no servidor e NUNCA enviado ao aluno no GET de questões. O feedback é calculado server-side na rota de resposta.

#### `respostas_questao` (nova)
```sql
CREATE TABLE IF NOT EXISTS respostas_questao (
    id            INT        AUTO_INCREMENT PRIMARY KEY,
    aluno_id      INT        NOT NULL,
    questao_id    INT        NOT NULL,
    resposta      TEXT       NOT NULL,
    correta       TINYINT(1) NULL,     -- NULL=dissertativa; 0=errada; 1=correta
    respondido_em TIMESTAMP  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY resposta_unica (aluno_id, questao_id),
    FOREIGN KEY (aluno_id)   REFERENCES usuarios(id)  ON DELETE CASCADE,
    FOREIGN KEY (questao_id) REFERENCES questoes(id)  ON DELETE CASCADE
) ENGINE=InnoDB;
```

### Alteração em `usuarios` (ALTER TABLE)

```sql
ALTER TABLE usuarios
    ADD COLUMN pontuacao    INT  NOT NULL DEFAULT 0   AFTER perfil,
    ADD COLUMN streak_atual INT  NOT NULL DEFAULT 0   AFTER pontuacao,
    ADD COLUMN ultimo_acesso DATE NULL                AFTER streak_atual;
```

**Lógica de streak** (aplicada a cada submissão de entrega):
- Se `ultimo_acesso = CURDATE()` → já acessou hoje, não altera streak
- Se `ultimo_acesso = CURDATE() - INTERVAL 1 DAY` → streak continua, incrementar
- Else → streak zerou, definir como 1
- Sempre atualizar `ultimo_acesso = CURDATE()`

**Pontuação:** +10 por atividade entregue; +5 por questão de MC correta (calculado server-side).

---

## Design de API

### Grupo 1 — Atividades (Professor)

```
POST   /api/atividades                    → criar atividade (ATIV-01, ATIV-02, ATIV-03)
GET    /api/atividades                    → listar atividades do professor (suas turmas)
GET    /api/atividades/:id                → detalhe com questoes (sem gabarito para aluno)
POST   /api/atividades/:id/questoes       → adicionar questão à atividade
```

**Regra de IDOR para professor:**
```js
// verificarDonoAtividade(atividadeId, professorId)
SELECT a.id FROM atividades a
JOIN turmas t ON t.id = a.turma_id
WHERE a.id = ? AND t.professor_id = ?
LIMIT 1
```

### Grupo 2 — Respostas (Aluno)

```
POST   /api/atividades/:id/respostas      → submeter respostas (ATIV-04, ATIV-05)
GET    /api/atividades/:id/respostas      → ver próprias respostas com feedback
```

**Regra de IDOR para aluno:**
```js
// verificarAlunoNaAtividade(atividadeId, alunoId)
SELECT a.id FROM atividades a
JOIN turma_alunos ta ON ta.turma_id = a.turma_id
WHERE a.id = ? AND ta.aluno_id = ?
LIMIT 1
```

### Grupo 3 — Entregas (Professor vê)

```
GET    /api/atividades/:id/entregas       → lista de alunos + status + acertos (ATIV-06)
GET    /api/atividades/:id/entregas/:alunoId  → detalhes das respostas de um aluno
```

### Grupo 4 — Painel do Aluno

```
GET    /api/alunos/painel                 → progresso, streak, pontuação (ALUN-01, ALUN-03)
GET    /api/alunos/historico              → atividades realizadas (ALUN-02)
GET    /api/alunos/atividades             → atividades disponíveis na turma do aluno
```

### Grupo 5 — Desempenho da Turma (Professor)

```
GET    /api/turmas/:id/desempenho         → desempenho alunos na turma (PROF-03)
```

**Query de desempenho por turma:**
```sql
SELECT u.id, u.nome,
       COUNT(DISTINCT e.atividade_id) AS total_entregues,
       ROUND(AVG(CASE WHEN rq.correta = 1 THEN 100 ELSE 0 END), 0) AS media_acerto,
       u.streak_atual, u.pontuacao
FROM turma_alunos ta
JOIN usuarios u ON u.id = ta.aluno_id
LEFT JOIN entregas e ON e.aluno_id = u.id
LEFT JOIN atividades a ON a.id = e.atividade_id AND a.turma_id = ta.turma_id
LEFT JOIN respostas_questao rq ON rq.aluno_id = u.id
LEFT JOIN questoes q ON q.id = rq.questao_id AND q.tipo = 'multipla_escolha'
WHERE ta.turma_id = ?
GROUP BY u.id
ORDER BY u.nome ASC
```

---

## Análise do Frontend

### Páginas que Mudam

| Página | Mudança | Impacto |
|--------|---------|---------|
| `atividades.html` | `data-perfil-guard="aluno"` → `data-perfil-guard=""` + dual-view | ALTO — reestruturação completa |
| `aluno.html` | Remover hardcoded; carregar dados reais via JS | MÉDIO — substituição de conteúdo estático |
| `professor.html` | Substituir cards hardcoded por dados reais | MÉDIO — adicionar JS + seção desempenho |

### Padrão Dual-View (confirmado de turma.html / trilhas.html)

```html
<!-- body sem perfil-guard restritivo -->
<body class="area-aluno" data-perfil-guard="">
  <div id="view-professor" style="display:none"> ... </div>
  <div id="view-aluno"     style="display:none"> ... </div>
</body>
```

```js
// assets/js/atividades.js — IIFE obrigatório
(function () {
    const usuario = usuarioLogado();
    if (!usuario) return;

    const viewProfessor = document.getElementById("view-professor");
    const viewAluno     = document.getElementById("view-aluno");

    if (usuario.perfil === "professor") {
        if (viewProfessor) viewProfessor.style.display = "";
        iniciarProfessor();
    } else {
        if (viewAluno) viewAluno.style.display = "";
        iniciarAluno();
    }
    // ...
})();
```

### Carregamento de Scripts (ordem obrigatória)

```html
<script src="../assets/js/auth-guard.js"></script>
<script src="../assets/js/aluno.js"></script>
<script src="../assets/js/atividades.js"></script>  <!-- novo -->
```

### Funções Globais de `aluno.js` — Usar, Não Redeclarar

| Função | Assinatura atual | Nota |
|--------|-----------------|------|
| `usuarioLogado()` | `() → Object\|null` | Retorna objeto do localStorage |
| `tokenAtual()` | `() → string\|null` | Bearer token |
| `mostrarAviso(texto)` | `(texto) → void` | ⚠️ Ignora segundo parâmetro "tipo" — sem diferenciação visual erro/sucesso atualmente |

**Padrão `api()` helper** (copiar de turma.js / trilhas.js):
```js
function api(caminho, opcoes = {}) {
    const token = tokenAtual();
    return fetch(caminho, {
        ...opcoes,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
            ...(opcoes.headers || {})
        }
    });
}
```

### Funções Legadas a Remover de `aluno.js`

As seguintes funções em `aluno.js` são hardcoded para "Funcoes do 1 grau" e **devem ser removidas** nesta fase:

- `buscarProgressoFuncoesBanco()` — linhas ~285–308
- `marcarFuncoesConcluidaBanco()` — linhas ~310–331
- `aplicarProgressoFuncoes()` — linhas ~224–283
- Variável `funcoesConcluida` — linha 7
- Chamada `buscarProgressoFuncoesBanco()` na linha 222

Ao removê-las, **substituir** pelo carregamento de dados reais no `aluno.html` via script dedicado ou via `aluno.js` generalizado.

### `aluno.html` — Mapeamento Hardcoded → Real

| Elemento atual (hardcoded) | Dado real | Fonte |
|---------------------------|-----------|-------|
| `72%` progresso (barra + indicador) | percentual da trilha ativa | `GET /api/trilhas/disponiveis` |
| `5 dias` sequência | `streak_atual` do usuário | `GET /api/alunos/painel` |
| `3 itens` revisão | atividades pendentes | `GET /api/alunos/atividades` |
| `Funções do 1º grau` (destaque) | atividade com prazo mais próximo | `GET /api/alunos/atividades` |
| Lista "Hoje" (hardcoded) | atividades pendentes do dia/semana | `GET /api/alunos/atividades` |
| "Aviso do professor" | último aviso da turma | `GET /api/turmas/:id/avisos` (já existe tabela `avisos`) |
| Etapas da trilha (Base/Prática/Revisão) | etapas reais com progresso | `GET /api/trilhas/:id` |

### `atividades.html` — View Aluno (o que renderizar)

- Lista de atividades da turma com status (pendente / entregue / corrigida)
- Filtro por status (já existe no HTML como botões)
- Card de destaque: próxima entrega com prazo mais urgente
- Indicadores: pendentes, entregues, próximo prazo

### `atividades.html` — View Professor

- Formulário: criar atividade (título, turma, prazo)
- Formulário: adicionar questões (enunciado, tipo, opções MC, gabarito)
- Lista de atividades criadas
- Para cada atividade: botão "Ver entregas" → expande lista de alunos com status

---

## Segurança / IDOR

### Verificações de Propriedade

Todo controller desta fase precisa de funções helper de IDOR — seguindo o padrão de `trilhasController.js`:

```js
// Para professor: confirma que a atividade pertence a uma turma dele
async function verificarDonoAtividade(atividadeId, professorId) {
    const [rows] = await banco.query(
        `SELECT a.id FROM atividades a
         JOIN turmas t ON t.id = a.turma_id
         WHERE a.id = ? AND t.professor_id = ?
         LIMIT 1`,
        [atividadeId, professorId]
    );
    return rows.length > 0;
}

// Para aluno: confirma que está na turma da atividade
async function verificarAlunoNaAtividade(atividadeId, alunoId) {
    const [rows] = await banco.query(
        `SELECT a.id FROM atividades a
         JOIN turma_alunos ta ON ta.turma_id = a.turma_id
         WHERE a.id = ? AND ta.aluno_id = ?
         LIMIT 1`,
        [atividadeId, alunoId]
    );
    return rows.length > 0;
}
```

### Regras Críticas

| Risco | Prevenção |
|-------|-----------|
| Aluno ver gabarito antes de responder | **NUNCA** incluir `gabarito` no `SELECT` de GET questões para aluno |
| IDOR em entregas | Professor só vê entregas de atividades em suas turmas (JOIN obrigatório) |
| Aluno submeter por outra pessoa | `aluno_id` SEMPRE de `req.usuario.id`, nunca de `req.body` |
| Aluno responder atividade de turma alheia | `verificarAlunoNaAtividade()` antes de qualquer INSERT em `respostas_questao` |
| Professor ver aluno de outra turma | `verificarDonoAtividade()` antes de `GET /entregas` |
| Manipulação de `ordem` de questão | Calculado no servidor: `MAX(ordem)+1`, nunca aceito do body |

---

## Plano de Migration

### `database/migration-03-atividades.sql`

```sql
-- Migration 03: Atividades multi-questão + pontuação/streak
-- Executar UMA VEZ após migration-02-trilhas.sql
-- Seguro para re-execução: CREATE TABLE IF NOT EXISTS / ALTER com IF NOT EXISTS workaround

USE duopratic;

-- Questões estruturadas por atividade
-- gabarito NUNCA é enviado ao frontend sem autenticação de professor
CREATE TABLE IF NOT EXISTS questoes (
    id           INT          AUTO_INCREMENT PRIMARY KEY,
    atividade_id INT          NOT NULL,
    ordem        SMALLINT     NOT NULL,
    tipo         ENUM('multipla_escolha','dissertativa') NOT NULL,
    enunciado    TEXT         NOT NULL,
    opcoes       JSON         NULL,
    gabarito     VARCHAR(10)  NULL,
    criado_em    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY questao_unica (atividade_id, ordem),
    FOREIGN KEY (atividade_id) REFERENCES atividades(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Respostas por questão; correta NULL = dissertativa (sem correção automática)
CREATE TABLE IF NOT EXISTS respostas_questao (
    id            INT        AUTO_INCREMENT PRIMARY KEY,
    aluno_id      INT        NOT NULL,
    questao_id    INT        NOT NULL,
    resposta      TEXT       NOT NULL,
    correta       TINYINT(1) NULL,
    respondido_em TIMESTAMP  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY resposta_unica (aluno_id, questao_id),
    FOREIGN KEY (aluno_id)   REFERENCES usuarios(id)  ON DELETE CASCADE,
    FOREIGN KEY (questao_id) REFERENCES questoes(id)  ON DELETE CASCADE
) ENGINE=InnoDB;

-- Pontuação e streak (verificar se colunas já existem antes de ALTER)
-- MySQL não tem ADD COLUMN IF NOT EXISTS nativo; usar procedure ou checar no script
ALTER TABLE usuarios
    ADD COLUMN pontuacao    INT  NOT NULL DEFAULT 0  AFTER perfil,
    ADD COLUMN streak_atual INT  NOT NULL DEFAULT 0  AFTER pontuacao,
    ADD COLUMN ultimo_acesso DATE NULL               AFTER streak_atual;
```

**Atenção:** `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` não existe em MySQL < 8.0. Para re-execução segura, usar procedure wrapper ou executar com tratamento de erro `1060 (Duplicate column name)` ignorado.

---

## Recomendação de Agrupamento em Planos (5 planos)

### Plano A — Fundação: Migration de BD
**Arquivos:** `database/migration-03-atividades.sql`
**Cobre:** Base para todos os outros planos
**Dependência:** Nenhuma além do schema.sql

### Plano B — Backend: Atividades e Questões (Criação pelo Professor)
**Arquivos novos:** `backend/controllers/atividadesController.js`, `backend/routes/atividades.js`
**Registrar em:** `backend/server.js`
**Endpoints:** POST/GET `/api/atividades`, POST `/api/atividades/:id/questoes`, GET `/api/atividades/:id`
**Cobre:** ATIV-01, ATIV-02, ATIV-03

### Plano C — Backend: Respostas e Feedback Imediato
**Arquivos:** adicionar funções ao `atividadesController.js`
**Endpoints:** POST `/api/atividades/:id/respostas`, GET `/api/atividades/:id/respostas`
**Inclui:** lógica de streak + pontuação no servidor
**Cobre:** ATIV-04, ATIV-05

### Plano D — Backend: Painéis com Dados Reais
**Arquivos:** reescrever `backend/controllers/alunosController.js`, adicionar funções ao `atividadesController.js`
**Endpoints:** GET `/api/alunos/painel`, GET `/api/alunos/historico`, GET `/api/alunos/atividades`, GET `/api/atividades/:id/entregas`, GET `/api/turmas/:id/desempenho`
**Cobre:** ALUN-01, ALUN-02, ALUN-03, ATIV-06, PROF-03

### Plano E — Frontend: Todas as Páginas
**Arquivos novos/alterados:**
- `assets/js/atividades.js` (novo — IIFE dual-view)
- `pages/atividades.html` (dual-view, remover `data-perfil-guard="aluno"`)
- `pages/aluno.html` (substituir hardcoded por `data-*` targets)
- `pages/professor.html` (adicionar seção desempenho real)
- `assets/js/aluno.js` (remover funções legadas hardcoded)
**Cobre:** Frontend de todos os requisitos

---

## Armadilhas Críticas

### Armadilha 1: Gabarito Exposto ao Aluno
**O que dá errado:** GET `/api/atividades/:id` retorna `gabarito` para todos os usuários.
**Por que acontece:** Query sem filtro de colunas por perfil.
**Como evitar:** Duas queries distintas — professor recebe `gabarito`, aluno recebe apenas `enunciado`, `tipo`, `opcoes`. Nunca retornar `gabarito` para perfil aluno.
**Sinal de alerta:** `SELECT *` em questoes sem exclusão do campo `gabarito`.

### Armadilha 2: ALTER TABLE Falha na Segunda Execução
**O que dá errado:** `ALTER TABLE usuarios ADD COLUMN pontuacao ...` lança `ERROR 1060: Duplicate column name` se executado duas vezes.
**Por que acontece:** MySQL não suporta `ADD COLUMN IF NOT EXISTS` nativamente.
**Como evitar:** Usar `PROCEDURE` com `IGNORE` ou documentar claramente que o migration é executado uma única vez. Alternativa: criar script com `SET` + `IF` via stored procedure, ou aceitar o erro na segunda execução e continuar.

### Armadilha 3: `JSON` no MySQL — Versão
**O que dá errado:** `opcoes JSON` falha em MySQL < 5.7.8.
**Por que acontece:** Tipo `JSON` foi introduzido no MySQL 5.7.8.
**Como evitar:** Verificar versão com `SELECT VERSION()`. Se < 5.7.8, usar `TEXT` e fazer `JSON.parse` no controller.

### Armadilha 4: `ON DUPLICATE KEY UPDATE` em `respostas_questao`
**O que dá errado:** Submissão múltipla de respostas cria registros duplicados ou falha.
**Por que acontece:** `UNIQUE KEY resposta_unica (aluno_id, questao_id)` lança `ER_DUP_ENTRY` sem `ON DUPLICATE KEY`.
**Como evitar:** Usar padrão já estabelecido no projeto:
```sql
INSERT INTO respostas_questao (aluno_id, questao_id, resposta, correta, respondido_em)
VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE
    resposta = VALUES(resposta),
    correta  = VALUES(correta),
    respondido_em = CURRENT_TIMESTAMP
```

### Armadilha 5: Redeclaração de Funções Globais de `aluno.js`
**O que dá errado:** `atividades.js` declara `function usuarioLogado()` ou `function mostrarAviso()` — silencioso se no escopo global, `ReferenceError` se dentro do IIFE.
**Por que acontece:** Falta de IIFE ou conflito de nome.
**Como evitar:** Toda lógica de página-específica dentro de `(function(){ ... })()`. Nunca redeclarar `usuarioLogado`, `tokenAtual`, `mostrarAviso`.

### Armadilha 6: `data-perfil-guard="aluno"` em `atividades.html`
**O que dá errado:** Professor que visita `atividades.html` é redirecionado para `professor.html` pelo `auth-guard.js`.
**Por que acontece:** `auth-guard.js` linha 21: `if (perfilEsperado && usuario.perfil !== perfilEsperado)`.
**Como evitar:** Alterar `data-perfil-guard="aluno"` para `data-perfil-guard=""` (padrão dual-view confirmado em `turma.html` e `trilhas.html`).

### Armadilha 7: Streak Calculado no Cliente
**O que dá errado:** Frontend calcula streak comparando `ultimo_acesso` com data local — pode ser manipulado.
**Por que acontece:** Tentação de calcular no JS para simplicidade.
**Como evitar:** Toda lógica de streak calculada e persistida no servidor a cada submissão de entrega. Frontend apenas exibe o valor retornado pela API.

### Armadilha 8: `alunosController.js` Legado
**O que dá errado:** Novas rotas do painel conflitam com rotas legadas `/:id/progresso/funcoes`.
**Por que acontece:** O arquivo atual tem rotas amarradas a nome hardcoded de atividade.
**Como evitar:** Reescrever completamente o `alunosController.js` nesta fase. As rotas `GET /api/alunos/:id/progresso/funcoes` e `POST /api/alunos/:id/progresso/funcoes` em `alunos.js` devem ser **removidas** — são substituídas pelas novas rotas de painel.

---

## Padrões MySQL Necessários

### COUNT com filtro condicional (ATIV-06)
```sql
-- Contagem de entregas por status para uma atividade
SELECT
    COUNT(*)                                           AS total_alunos,
    SUM(IF(e.status IN ('entregue','corrigida'), 1, 0)) AS total_entregues,
    SUM(IF(e.status = 'pendente' OR e.id IS NULL, 1, 0)) AS total_pendentes,
    ROUND(AVG(CASE WHEN rq.correta = 1 THEN 100 ELSE 0 END), 1) AS media_acerto_mc
FROM turma_alunos ta
JOIN atividades a ON a.id = ?
LEFT JOIN entregas e ON e.atividade_id = a.id AND e.aluno_id = ta.aluno_id
LEFT JOIN respostas_questao rq ON rq.aluno_id = ta.aluno_id
LEFT JOIN questoes q ON q.id = rq.questao_id AND q.atividade_id = a.id AND q.tipo = 'multipla_escolha'
WHERE ta.turma_id = a.turma_id
```

### Histórico de atividades do aluno (ALUN-02)
```sql
SELECT a.id, a.titulo, a.prazo, t.nome AS turma_nome,
       e.status, e.nota, e.enviado_em,
       COUNT(q.id)                                        AS total_questoes,
       SUM(IF(rq.correta = 1, 1, 0))                      AS corretas,
       SUM(IF(q.tipo = 'multipla_escolha', 1, 0))         AS total_mc
FROM entregas e
JOIN atividades a ON a.id = e.atividade_id
JOIN turmas t ON t.id = a.turma_id
LEFT JOIN questoes q ON q.atividade_id = a.id
LEFT JOIN respostas_questao rq ON rq.questao_id = q.id AND rq.aluno_id = e.aluno_id
WHERE e.aluno_id = ?
GROUP BY e.id
ORDER BY e.enviado_em DESC
LIMIT 20
```

### Painel do aluno — dados consolidados (ALUN-01, ALUN-03)
```sql
-- Dados do usuário + stats em uma query
SELECT u.pontuacao, u.streak_atual, u.ultimo_acesso,
       COUNT(DISTINCT e.id) AS total_entregues,
       COUNT(DISTINCT CASE WHEN e.status = 'pendente' THEN a.id END) AS pendentes
FROM usuarios u
LEFT JOIN turma_alunos ta ON ta.aluno_id = u.id
LEFT JOIN atividades a ON a.turma_id = ta.turma_id
LEFT JOIN entregas e ON e.atividade_id = a.id AND e.aluno_id = u.id
WHERE u.id = ?
GROUP BY u.id
```

---

## Mapa de Responsabilidade Arquitetural

| Capacidade | Tier Principal | Tier Secundário | Rationale |
|------------|---------------|-----------------|-----------|
| Criar atividade + questões | API/Backend | — | Validação, IDOR, persistência |
| Correção automática MC | API/Backend | — | Gabarito nunca chega ao cliente |
| Cálculo de streak | API/Backend | — | Integridade de dados |
| Renderização dual-view | Browser/Cliente | — | JS detecta perfil do localStorage |
| Filtro de atividades (pendente/entregue) | Browser/Cliente | — | Filtra DOM, dados já carregados |
| Histórico de atividades | API/Backend | Browser/Cliente | Query BD → render lista |
| Feedback de MC | API/Backend | Browser/Cliente | Servidor calcula, cliente exibe |

---

## Arquitetura do Sistema (Fluxo de Dados)

```
PROFESSOR                              ALUNO
    │                                    │
    ▼                                    ▼
[atividades.html #view-professor]  [atividades.html #view-aluno]
    │ POST /api/atividades               │ GET /api/alunos/atividades
    │ POST /api/atividades/:id/questoes  │
    ▼                                    ▼
[atividadesController]             [alunosController]
    │                                    │
    ├─ verificarDonoAtividade()          ├─ verificarAlunoNaAtividade()
    │                                    │
    ▼                                    ▼
[MySQL: atividades + questoes]     [MySQL: respostas_questao]
                                         │
                                         ├─ gabarito comparison (server-side)
                                         ├─ UPDATE usuarios (pontuacao, streak)
                                         │
                                         ▼
                                   JSON { correta: true/false, ... }
                                         │
                                         ▼
                                   [Browser: renderizar feedback imediato]

[aluno.html]
    │ GET /api/alunos/painel
    │ GET /api/trilhas/disponiveis
    ▼
[alunosController + trilhasController]
    │
    ▼
[MySQL: usuarios + progresso_etapa + entregas]
    │
    ▼
JSON { streak, pontuacao, trilhas[], atividades_pendentes[] }
    │
    ▼
[Browser: substituir todos os elementos hardcoded]
```

---

## Estrutura de Arquivos Recomendada

```
backend/
├── controllers/
│   ├── alunosController.js      ← REESCREVER COMPLETAMENTE
│   ├── atividadesController.js  ← CRIAR NOVO
│   └── turmasController.js      ← adicionar getDesempenho()
├── routes/
│   ├── alunos.js                ← remover rotas legadas, adicionar /painel /historico
│   ├── atividades.js            ← CRIAR NOVO
│   └── turmas.js                ← adicionar GET /:id/desempenho
└── server.js                    ← registrar rotasAtividades

database/
└── migration-03-atividades.sql  ← CRIAR NOVO

assets/js/
├── aluno.js                     ← remover 3 funções hardcoded + variável funcoesConcluida
└── atividades.js                ← CRIAR NOVO (IIFE dual-view)

pages/
├── atividades.html              ← data-perfil-guard="" + dual-view completo
├── aluno.html                   ← data-* targets, remover valores hardcoded
└── professor.html               ← seção desempenho real
```

---

## Arquitetura de Validação (Nyquist)

### Framework de Testes
| Propriedade | Valor |
|-------------|-------|
| Framework | Nenhum configurado atualmente — Wave 0 deve adicionar |
| Config | Nenhum `jest.config.js` / `vitest.config.*` detectado |
| Quick run | `node --test` (Node.js nativo, sem dependências) ou `npx jest --testPathPattern=atividades` |
| Suite completa | `npx jest` (após instalação) |

### Mapeamento Requisitos → Testes

| Req ID | Comportamento | Tipo | Arquivo de Teste |
|--------|--------------|------|-----------------|
| ATIV-01 | POST /api/atividades cria com questão MC | integração | `tests/atividades.test.js` |
| ATIV-02 | POST /api/atividades/questoes cria dissertativa | integração | `tests/atividades.test.js` |
| ATIV-03 | POST valida turma_id e prazo | integração | `tests/atividades.test.js` |
| ATIV-04 | POST /respostas retorna `correta` para MC | integração | `tests/respostas.test.js` |
| ATIV-05 | ON DUPLICATE KEY não duplica resposta | integração | `tests/respostas.test.js` |
| ATIV-06 | GET /entregas recusado se não for dono | integração | `tests/atividades.test.js` |
| ALUN-03 | Streak incrementa após entrega em dias consecutivos | unitário | `tests/streak.test.js` |

### Gaps do Wave 0
- [ ] `tests/atividades.test.js` — cobre ATIV-01 a ATIV-06
- [ ] `tests/respostas.test.js` — cobre ATIV-04, ATIV-05
- [ ] `tests/streak.test.js` — cobre ALUN-03 (lógica de streak isolada)
- [ ] Framework: `npm install --save-dev jest` se adotado

---

## Inventário de Estado de Runtime

> Não é fase de rename/refactor — porém há estado legado a migrar.

| Categoria | Item | Ação Necessária |
|-----------|------|----------------|
| Stored data | `entregas` existentes com `resposta TEXT` preenchido (hardcoded de Phase 1) | Nenhuma — dados legados permanecem válidos; `respostas_questao` é nova |
| Stored data | Sem registros em `questoes` ou `respostas_questao` (tabelas novas) | Criar via migration |
| Stored data | Colunas `pontuacao`, `streak_atual`, `ultimo_acesso` ausentes em `usuarios` | ALTER TABLE no migration-03 |
| OS-registered state | Nenhum | — |
| Secrets/env vars | Nenhum novo necessário | — |
| Build artifacts | Nenhum | — |

---

## Disponibilidade do Ambiente

| Dependência | Requerida por | Disponível | Versão | Fallback |
|-------------|--------------|-----------|--------|---------|
| MySQL | Todas as queries | ✓ (pressuposto — BD rodando nas fases 1 e 2) | — | — |
| Node.js / Express | Backend | ✓ | — | — |
| mysql2/promise | Queries | ✓ | — | — |
| `JSON` type MySQL | `questoes.opcoes` | Verificar `SELECT VERSION()` | ≥ 5.7.8 | Usar `TEXT` |

---

## Domínio de Segurança

### Categorias ASVS Aplicáveis

| Categoria ASVS | Aplica | Controle Padrão |
|---------------|--------|----------------|
| V2 Authentication | sim | JWT via `autenticar` middleware (já implementado) |
| V4 Access Control | **SIM — crítico** | `verificarDonoAtividade()` + `verificarAlunoNaAtividade()` em todo handler |
| V5 Input Validation | sim | `parseInt(req.params.id, 10)`, validar `tipo` contra enum, gabarito nunca do body |
| V6 Cryptography | não | N/A para este módulo |

### Ameaças Conhecidas para o Stack

| Padrão | STRIDE | Mitigação Padrão |
|--------|--------|-----------------|
| IDOR em entregas | Elevation of Privilege | JOIN obrigatório `atividades→turmas→professor_id` |
| Gabarito exposto | Information Disclosure | Campo excluído do SELECT para perfil aluno |
| Manipulação de streak | Tampering | Calculado server-side, nunca aceito do body |
| Resposta por outro aluno | Spoofing | `aluno_id = req.usuario.id` sempre |

---

## Log de Suposições

| # | Afirmação | Seção | Risco se Errado |
|---|-----------|-------|----------------|
| A1 | MySQL versão ≥ 5.7.8 (suporte a JSON nativo) | Schema / questoes.opcoes | Usar `TEXT` em vez de `JSON` — mudança pequena |
| A2 | O PROF-03 desta fase refere-se a desempenho/entregas, não gestão de avisos | Phase Requirements | Fora do escopo desta fase; avisos podem ser Phase 4 |
| A3 | Pontuação de +10 por entrega e +5 por questão correta é adequada para o TCC | ALUN-03 | Valores podem ser ajustados sem mudança estrutural |

---

## Questões em Aberto

1. **Versão MySQL do ambiente de desenvolvimento**
   - O que sabemos: Schema usa InnoDB, utf8mb4 — compatível com MySQL 5.7+
   - O que não está claro: Se `JSON` nativo está disponível
   - Recomendação: Confirmar com `SELECT VERSION()` antes do migration; se < 5.7.8, usar `TEXT`

2. **PROF-03 vs "avisos da turma"**
   - O que sabemos: REQUIREMENTS.md define PROF-03 como "avisos"; fase define como "desempenho"
   - O que não está claro: Se a gestão de avisos deve ser incluída nesta fase também
   - Recomendação: Implementar "desempenho" conforme a fase; marcar "avisos" como PROF-03b para Phase 4; atualizar traceability no REQUIREMENTS.md

3. **`aluno.html` tem sidebar com link "IA de estudo"**
   - O que sabemos: `ia-estudo.html` existe mas não está implementada nesta fase
   - O que não está claro: Deve ser desabilitado visualmente?
   - Recomendação: Manter link no nav como está (será implementado na Phase 4)

---

## Fontes

### Primárias (HIGH — lidas diretamente do código-fonte)
- `C:\dev\DuoPratic\database\schema.sql` — tabelas existentes
- `C:\dev\DuoPratic\database\migration-02-trilhas.sql` — padrão de migration estabelecido
- `C:\dev\DuoPratic\backend\controllers\alunosController.js` — código legado a substituir
- `C:\dev\DuoPratic\backend\controllers\turmasController.js` — padrão de IDOR e controller
- `C:\dev\DuoPratic\backend\controllers\trilhasController.js` — padrão completo Phase 2
- `C:\dev\DuoPratic\backend\routes\alunos.js`, `turmas.js`, `trilhas.js` — padrão de roteamento
- `C:\dev\DuoPratic\assets\js\aluno.js` — funções globais, legado hardcoded
- `C:\dev\DuoPratic\assets\js\turma.js` — padrão IIFE dual-view
- `C:\dev\DuoPratic\assets\js\trilhas.js` — padrão IIFE dual-view
- `C:\dev\DuoPratic\pages\atividades.html` — conteúdo hardcoded a substituir
- `C:\dev\DuoPratic\pages\aluno.html` — conteúdo hardcoded a substituir
- `C:\dev\DuoPratic\pages\professor.html` — conteúdo hardcoded a substituir
- `C:\dev\DuoPratic\pages\turma.html`, `trilhas.html` — confirma `data-perfil-guard=""`
- `C:\dev\DuoPratic\assets\js\auth-guard.js` — comportamento de perfil-guard

### Secundárias (MEDIUM)
- `C:\dev\DuoPratic\.planning\REQUIREMENTS.md` — requisitos e traceability
- `C:\dev\DuoPratic\backend\server.js` — roteamento central
- `C:\dev\DuoPratic\backend\middleware\auth.js` — estrutura de `req.usuario`

---

## Metadados

**Cobertura de confiança:**
- Schema / BD: HIGH — lido diretamente do código
- Padrões de controller/IDOR: HIGH — copiado dos controllers existentes
- Padrões de frontend IIFE: HIGH — confirmado em turma.js e trilhas.js
- Lógica de streak: MEDIUM (A3) — design razoável mas valores de pontos são suposição
- Versão MySQL para JSON: LOW (A1) — não verificado no ambiente

**Data da pesquisa:** 2025-01-27
**Válido até:** 60 dias (stack estável, sem dependências externas novas)
