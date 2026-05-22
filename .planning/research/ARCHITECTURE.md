# Architecture Research

**Project:** DuoPratic — educational platform for Brazilian middle/high school students  
**Researched:** 2025-01  
**Confidence:** HIGH (based on direct codebase analysis + established Node.js/MySQL patterns)

---

## Baseline: What Already Exists

Before any new architecture, understand what's in place:

| Component | Current State | What It Means |
|-----------|--------------|---------------|
| `server.js` | Single ~400-line file, all routes inline | Needs splitting before new features land |
| `db.js` | `mysql2/promise` pool, 10 connections | Good foundation, no changes needed |
| Auth | Password stored **plain text**, no token/session mechanism | Must fix before adding protected routes |
| Frontend auth | `localStorage` stores `{ id, nome, email, perfil }` | Keep localStorage, add token alongside |
| Schema | 6 tables: `usuarios`, `turmas`, `turma_alunos`, `atividades`, `entregas`, `avisos` | Solid base — extend, don't replace |
| Progress | Hardcoded `72%` / `85%` in `/api/alunos/:id/progresso/funcoes` | Placeholder; real progress table needed |
| AI | Simulated in the frontend (`data-resposta-ia` element) | No backend AI plumbing yet |

---

## Data Model Patterns

### Design Philosophy
Model the domain as it actually works: a **trilha** is a sequence of **etapas**; a student's position in that sequence is **progresso**; an **atividade** is a set of **questões**; a student's work on that atividade is an **entrega** containing **respostas** per questão. Keep these concerns in separate tables — do not collapse progress into the content tables.

### Complete Schema (extend the existing schema.sql)

```sql
-- ─── TRILHAS ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trilhas (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    turma_id    INT NOT NULL,
    titulo      VARCHAR(140) NOT NULL,
    disciplina  VARCHAR(80)  NOT NULL,
    descricao   TEXT,
    gerada_por_ia TINYINT(1) NOT NULL DEFAULT 0,  -- flag: AI-generated track
    ativa       TINYINT(1)   NOT NULL DEFAULT 1,
    criado_em   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (turma_id) REFERENCES turmas(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Ordered steps within a trilha
CREATE TABLE IF NOT EXISTS trilha_etapas (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    trilha_id   INT          NOT NULL,
    ordem       SMALLINT     NOT NULL,           -- 1, 2, 3 … determines sequence
    titulo      VARCHAR(140) NOT NULL,
    tipo        ENUM('teoria','exercicio','revisao','avaliacao') NOT NULL DEFAULT 'exercicio',
    conteudo    TEXT,                            -- explanation text / markdown
    criado_em   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trilha_id) REFERENCES trilhas(id) ON DELETE CASCADE,
    UNIQUE KEY etapa_unica (trilha_id, ordem)
) ENGINE=InnoDB;

-- Per-student, per-step progress
CREATE TABLE IF NOT EXISTS progresso_etapa (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    aluno_id        INT       NOT NULL,
    etapa_id        INT       NOT NULL,
    status          ENUM('pendente','em_progresso','concluido') NOT NULL DEFAULT 'pendente',
    iniciado_em     TIMESTAMP NULL,
    concluido_em    TIMESTAMP NULL,
    UNIQUE KEY progresso_unico (aluno_id, etapa_id),
    FOREIGN KEY (aluno_id)  REFERENCES usuarios(id)      ON DELETE CASCADE,
    FOREIGN KEY (etapa_id)  REFERENCES trilha_etapas(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── QUESTÕES (structured exercises inside atividades) ───────────────────────

CREATE TABLE IF NOT EXISTS questoes (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    atividade_id    INT          NOT NULL,
    ordem           SMALLINT     NOT NULL,
    enunciado       TEXT         NOT NULL,
    tipo            ENUM('multipla_escolha','aberta') NOT NULL DEFAULT 'multipla_escolha',
    pontos          DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    criado_em       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (atividade_id) REFERENCES atividades(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Options for multiple-choice questions
CREATE TABLE IF NOT EXISTS opcoes_questao (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    questao_id  INT         NOT NULL,
    texto       VARCHAR(400) NOT NULL,
    correta     TINYINT(1)  NOT NULL DEFAULT 0,
    FOREIGN KEY (questao_id) REFERENCES questoes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Student answer per question (linked to the entrega)
CREATE TABLE IF NOT EXISTS respostas_questao (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    entrega_id      INT       NOT NULL,
    questao_id      INT       NOT NULL,
    opcao_id        INT       NULL,          -- for multipla_escolha
    resposta_texto  TEXT      NULL,          -- for aberta
    correto         TINYINT(1) NULL,         -- NULL = not yet evaluated (open questions)
    feedback_ia     TEXT      NULL,          -- AI hint shown to student
    respondido_em   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY resposta_unica (entrega_id, questao_id),
    FOREIGN KEY (entrega_id)  REFERENCES entregas(id)       ON DELETE CASCADE,
    FOREIGN KEY (questao_id)  REFERENCES questoes(id)       ON DELETE CASCADE,
    FOREIGN KEY (opcao_id)    REFERENCES opcoes_questao(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─── AI INTERACTION LOG ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sessoes_ia (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    aluno_id    INT         NOT NULL,
    tipo        ENUM('duvida','feedback_exercicio','geracao_trilha') NOT NULL,
    contexto    JSON        NULL,    -- topic, atividade_id, etapa_id etc.
    tokens_total INT        NOT NULL DEFAULT 0,
    criado_em   TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (aluno_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS mensagens_ia (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    sessao_id   INT         NOT NULL,
    papel       ENUM('aluno','ia') NOT NULL,
    conteudo    TEXT        NOT NULL,
    tokens      INT         NOT NULL DEFAULT 0,
    criado_em   TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sessao_id) REFERENCES sessoes_ia(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── SESSION TOKENS (replace plain-text password auth) ───────────────────────

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS senha_hash   VARCHAR(255) NULL AFTER senha,
    ADD COLUMN IF NOT EXISTS token_sessao VARCHAR(64)  NULL UNIQUE;
-- Production: full JWT, refresh tokens, expiry. TCC: simple random token.
```

### Entity Relationships (summary)

```
turmas  ──< trilhas ──< trilha_etapas ──< progresso_etapa >── usuarios (aluno)
turmas  ──< atividades ──< questoes ──< opcoes_questao
                                   └──< respostas_questao >── entregas >── usuarios (aluno)
usuarios (aluno) ──< sessoes_ia ──< mensagens_ia
```

### Derived Progress Calculation
Never store a raw percentage in the DB — calculate it on the fly:

```sql
-- Progress for one student in one trilha
SELECT
    t.id AS trilha_id,
    COUNT(te.id)                                            AS total_etapas,
    COUNT(pe.id) FILTER (WHERE pe.status = 'concluido')    AS etapas_concluidas,
    ROUND(
        COUNT(pe.id) FILTER (WHERE pe.status = 'concluido')
        / NULLIF(COUNT(te.id), 0) * 100
    )                                                       AS percentual
FROM trilhas t
JOIN trilha_etapas te ON te.trilha_id = t.id
LEFT JOIN progresso_etapa pe
       ON pe.etapa_id = te.id AND pe.aluno_id = ?
WHERE t.id = ?
GROUP BY t.id;
```

---

## AI Integration Architecture

### Provider Recommendation
**OpenAI `gpt-4o-mini`** for all three use cases (feedback, explanation, track generation).

Rationale:
- Node.js SDK (`openai`) is the most mature, best-documented
- `gpt-4o-mini` is cheap (~$0.15/M input tokens) — critical for a TCC budget
- Streaming via SSE is first-class in the SDK
- Claude (Anthropic) is equally good but the OpenAI SDK is better integrated with Node.js tooling and has more community examples
- Gemini is viable but adds Google account complexity for no benefit here

### Three AI Call Patterns

#### 1. Exercise Feedback (synchronous + streaming)
**When:** Student submits open-ended answer, needs immediate guidance  
**Pattern:** SSE stream from server to browser — student sees response typed out word-by-word

```
Browser ──POST /api/ia/feedback──► Express ──stream──► OpenAI
         ◄──SSE text/event-stream──              ◄──stream chunks──
```

```javascript
// backend/routes/ia.js
router.post('/feedback', requireAuth, requireAluno, async (req, res) => {
    const { questao_id, resposta_aluno, entrega_id } = req.body;

    // Load question + correct answer for context (never sent to client)
    const [questao] = await db.query(
        'SELECT q.enunciado, o.texto AS resposta_correta ' +
        'FROM questoes q ' +
        'LEFT JOIN opcoes_questao o ON o.questao_id = q.id AND o.correta = 1 ' +
        'WHERE q.id = ?', [questao_id]
    );

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 300,          // hard cap — cost control
        stream: true,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT_TUTOR },
            { role: 'user',   content: buildFeedbackPrompt(questao[0], resposta_aluno) }
        ]
    });

    let fullText = '';
    for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content ?? '';
        fullText += token;
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();

    // Persist to DB after stream ends
    await saveIaMessage(req.usuario.id, 'feedback_exercicio', fullText, questao_id);
});
```

```javascript
// Frontend — receiving SSE stream
const evtSource = new EventSource('/api/ia/feedback');  // OR use fetch + ReadableStream
// For POST with body, use fetch + getReader():
const resp = await fetch('/api/ia/feedback', { method: 'POST', body: JSON.stringify(payload), headers: {...} });
const reader = resp.body.getReader();
const decoder = new TextDecoder();
while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = decoder.decode(value).split('\n');
    for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            const { token } = JSON.parse(line.slice(6));
            outputEl.textContent += token;
        }
    }
}
```

#### 2. Study Question (conversational, multi-turn)
**When:** Student in ia-estudo.html asks a question  
**Pattern:** Streaming SSE; maintain last N messages as context

```javascript
// Fetch last 5 messages for this student's session
const [history] = await db.query(
    'SELECT papel, conteudo FROM mensagens_ia ' +
    'WHERE sessao_id = ? ORDER BY criado_em DESC LIMIT 5',
    [sessao_id]
);
const messages = [
    { role: 'system', content: SYSTEM_PROMPT_TUTOR },
    ...history.reverse().map(m => ({ role: m.papel === 'ia' ? 'assistant' : 'user', content: m.conteudo })),
    { role: 'user', content: pergunta }
];
```

**Context limit:** Keep last 5 turns (10 messages). Beyond that, cost grows fast for no pedagogical gain.

#### 3. Track Generation (non-streaming, teacher-triggered)
**When:** Teacher requests AI to suggest a trilha for a topic  
**Pattern:** Regular `await` (no stream needed), response is structured JSON

```javascript
router.post('/gerar-trilha', requireAuth, requireProfessor, async (req, res) => {
    const { topico, nivel, quantidade_etapas } = req.body;

    const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 1000,
        response_format: { type: 'json_object' },   // structured output
        messages: [{
            role: 'system',
            content: 'Você é um assistente pedagógico. Responda APENAS com JSON válido.'
        }, {
            role: 'user',
            content: `Crie uma trilha de ${quantidade_etapas} etapas sobre "${topico}" para ${nivel}.
                      Formato: { "titulo": "...", "etapas": [{ "ordem": 1, "titulo": "...", "tipo": "teoria|exercicio|revisao", "conteudo": "..." }] }`
        }]
    });

    const trilha = JSON.parse(completion.choices[0].message.content);
    // Persist to trilhas + trilha_etapas tables
    res.json({ status: 'ok', trilha });
});
```

### System Prompt (Core Pedagogy)
```
Você é um tutor de apoio para alunos do ensino fundamental e médio no Brasil.
Seu papel é guiar o raciocínio do aluno — NUNCA entregue a resposta diretamente.
Faça perguntas que ajudem o aluno a descobrir o caminho.
Use linguagem simples, exemplos concretos e português brasileiro coloquial.
Limite suas respostas a no máximo 3 parágrafos curtos.
Se o aluno pedir a resposta explicitamente, recuse com gentileza e ofereça uma dica nova.
```

### Cost Control Strategy

| Measure | Implementation | Savings |
|---------|---------------|---------|
| `max_tokens: 300` per feedback call | Hard limit in every `create()` | ~60% vs uncapped |
| `gpt-4o-mini` not `gpt-4o` | Model choice | ~20x cheaper |
| Conversation window: 5 turns | Trim history before sending | Linear cost growth |
| Rate limit: 10 AI calls/student/hour | In-memory counter or DB count per hour | Prevents abuse |
| No AI for multiple-choice auto-grade | Grade locally, AI only for open answers | Eliminates majority of calls |

```javascript
// Simple rate limit check (TCC-grade, no Redis needed)
async function checkAiRateLimit(alunoId) {
    const [rows] = await db.query(
        'SELECT COUNT(*) AS total FROM sessoes_ia ' +
        'WHERE aluno_id = ? AND criado_em > DATE_SUB(NOW(), INTERVAL 1 HOUR)',
        [alunoId]
    );
    return rows[0].total < 10;
}
```

---

## Role-Based Access Patterns

### Authentication Upgrade (minimal change, maximum impact)

The current system stores the user object in localStorage with no server validation. Every API call is therefore unprotected. The fix is a **server-side token** stored in the `token_sessao` column:

```javascript
// On login — generate token, store in DB, return to client
const token = require('crypto').randomBytes(32).toString('hex');
await db.query('UPDATE usuarios SET token_sessao = ? WHERE id = ?', [token, usuario.id]);
res.json({ status: 'ok', usuario: { ...usuario, token } });

// Client stores: localStorage.setItem('duopratic_token', token)
// Client sends: Authorization: Bearer <token> on every API call
```

### Auth Middleware (drop into any route)

```javascript
// backend/middleware/auth.js
async function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) return res.status(401).json({ status: 'erro', message: 'Não autenticado.' });

    const [rows] = await db.query(
        'SELECT id, perfil FROM usuarios WHERE token_sessao = ? LIMIT 1',
        [token]
    );

    if (!rows.length) return res.status(401).json({ status: 'erro', message: 'Sessão inválida.' });

    req.usuario = rows[0];   // { id, perfil }
    next();
}

function requirePerfil(perfil) {
    return (req, res, next) => {
        if (req.usuario?.perfil !== perfil)
            return res.status(403).json({ status: 'erro', message: 'Acesso negado.' });
        next();
    };
}

const requireAluno    = requirePerfil('aluno');
const requireProfessor = requirePerfil('professor');

module.exports = { requireAuth, requireAluno, requireProfessor };
```

### Route Permission Matrix

| Route Pattern | Auth Required | Role Required | Notes |
|---------------|--------------|---------------|-------|
| `POST /api/login` | ✗ | — | Public |
| `POST /api/cadastro` | ✗ | — | Public |
| `GET /api/usuarios/:id` | ✓ | own id OR professor | Check ownership |
| `GET /api/turmas/:id` | ✓ | member OR professor | Verify membership |
| `GET /api/trilhas/:id` | ✓ | aluno in turma | Check turma_alunos |
| `POST /api/trilhas` | ✓ | professor | Own turma only |
| `POST /api/ia/*` | ✓ | aluno | Rate-limited |
| `POST /api/ia/gerar-trilha` | ✓ | professor | — |
| `GET /api/turmas/:id/alunos` | ✓ | professor | Own turma only |
| `PUT /api/entregas/:id/corrigir` | ✓ | professor | Own atividade only |

### Ownership Checks (beyond role)
Role alone is not enough — a professor should only see their own turmas:

```javascript
// Reusable ownership helper
async function professorOwnsAtividade(professorId, atividadeId) {
    const [rows] = await db.query(
        'SELECT a.id FROM atividades a JOIN turmas t ON t.id = a.turma_id ' +
        'WHERE a.id = ? AND t.professor_id = ?',
        [atividadeId, professorId]
    );
    return rows.length > 0;
}
```

---

## Key Architectural Decisions

### 1. File Structure — Split server.js Now

The single-file server must be split before adding AI routes, or maintenance becomes impossible:

```
backend/
├── server.js           ← app setup + app.listen() ONLY
├── db.js               ← existing, unchanged
├── middleware/
│   ├── auth.js         ← requireAuth, requireAluno, requireProfessor
│   └── validate.js     ← input validation helpers
└── routes/
    ├── auth.js         ← /api/login, /api/cadastro
    ├── usuarios.js     ← /api/usuarios/:id, /api/usuarios/:id/preferencias
    ├── turmas.js       ← /api/turmas, /api/turmas/:id/alunos
    ├── trilhas.js      ← /api/trilhas, /api/trilhas/:id/etapas, /api/trilhas/:id/progresso
    ├── atividades.js   ← /api/atividades, /api/atividades/:id/questoes
    ├── entregas.js     ← /api/entregas, /api/entregas/:id/respostas
    └── ia.js           ← /api/ia/feedback, /api/ia/duvida, /api/ia/gerar-trilha
```

```javascript
// New server.js (stripped to essentials)
require('dotenv').config();
const express = require('express');
const path    = require('path');
const app     = express();
const porta   = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.resolve(__dirname, '..')));

app.use('/api',          require('./routes/auth'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/turmas',   require('./routes/turmas'));
app.use('/api/trilhas',  require('./routes/trilhas'));
app.use('/api',          require('./routes/atividades'));
app.use('/api',          require('./routes/entregas'));
app.use('/api/ia',       require('./routes/ia'));

app.get('/', (_, res) => res.sendFile(path.resolve(__dirname, '../index.html')));
app.listen(porta, () => console.log(`DuoPratic online :${porta}`));
```

### 2. Password Hashing — Non-Negotiable Fix

Passwords are currently stored in plain text. Even for a TCC demo, this is a critical problem:

```bash
npm install bcrypt
```

```javascript
const bcrypt = require('bcrypt');
const ROUNDS = 10;

// On cadastro:  await bcrypt.hash(senha, ROUNDS)  → store hash
// On login:     await bcrypt.compare(senha, hash)  → true/false
```

Migration: add `senha_hash` column, hash on first login, deprecate `senha` column.

### 3. Study Session State (client-side is fine for TCC)

The study flow (etapa navigation, which question is active) can be managed entirely in the frontend via `sessionStorage` — no server round-trip needed per step:

```javascript
// sessionStorage shape for active study session
{
    trilha_id: 3,
    etapa_atual: 2,        // index into etapas array
    etapas: [...],         // fetched once on session start
    sessao_ia_id: 47       // AI session ID from server
}
```

Server involvement:
- `GET /api/trilhas/:id/etapas` — load once on session start
- `POST /api/progresso/etapa/:id/concluir` — called when student clicks "Concluir etapa"
- `POST /api/ia/feedback` — called per open-answer submission

This keeps the server stateless (no in-memory session) which is correct for a Node.js single-process app.

### 4. Progress Calculation — Computed Not Stored

Never store a `percentual` column. Compute it from `progresso_etapa` rows. This means:
- No synchronization bugs
- Accurate as soon as an etapa is marked `concluido`
- Slightly more DB work but trivial at TCC scale

### 5. AI Calls — Streaming Over Polling

For the "IA de estudo" chat interface, prefer SSE streaming over:
- **Request/Response (await full response):** Acceptable but feels slow for 2-3s responses
- **Polling:** Complex client code, wasteful requests, unnecessary for this stack
- **WebSockets:** Overkill — unidirectional AI response stream doesn't need bidirectional socket

SSE via `fetch + ReadableStream` works in all modern browsers without any library.

---

## TCC vs Production Tradeoffs

### What's Acceptable for TCC (but not Production)

| Decision | TCC Approach | Production Approach | Risk if Not Changed |
|----------|-------------|---------------------|-------------------|
| Auth | Token in `usuarios.token_sessao` | JWT + refresh tokens, expiry | Single token never expires; logout doesn't invalidate |
| Sessions | `sessionStorage` on client | Server-side session or signed JWT | Fine — stateless is actually better |
| AI rate limiting | DB `COUNT` per hour | Redis with sliding window | DB query overhead per AI call |
| Background jobs | None — all sync | Bull/BullMQ queue for track generation | Track generation blocks request for ~3s |
| Password hashing | bcrypt (implement now) | bcrypt (same — this is non-negotiable) | Credential exposure |
| CORS | `*` wildcard | Specific origin list | Cross-origin attacks (low risk for TCC) |
| HTTPS | Depends on hosting | Always | Token interception on HTTP |
| DB connection | Single pool, 10 connections | Read replicas, connection proxy | Fine for TCC scale |
| Error logging | `console.error` | Structured logging (Winston/Pino) | Hard to debug production issues |
| Input validation | Manual `if (!campo)` checks | zod or joi schema validation | Inconsistent validation, more bugs |

### Scale Assumptions

| Metric | TCC Demo | Real Deployment |
|--------|---------|-----------------|
| Concurrent users | 1–5 (presentation) | 100–500 per school |
| AI calls per day | ~50 | ~5,000 |
| DB records | Hundreds | Millions |
| Infra | Single XAMPP/VPS | Docker + managed DB |

**For TCC:** Everything in this document scales to the demo. No Redis, no queues, no CDN needed. A single VPS with Node.js + MySQL handles it without modification.

**First production upgrade:** Add token expiry + Redis for AI rate limiting. Everything else can wait.

### Hosting for TCC Presentation

Recommended: **Railway.app** or **Render.com** (free tier)
- Deploy Node.js + MySQL in one platform
- Add `DATABASE_URL` and `OPENAI_API_KEY` as environment variables
- No DevOps knowledge required
- Avoids "it works on my machine" during presentation

Alternative: VPS (DigitalOcean $6/mo droplet) with PM2 + MySQL — more control, slightly more setup.

---

## Component Communication Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Vanilla JS + sessionStorage + localStorage)        │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌───────────┐  │
│  │ aluno.js │  │ acesso.js│  │  tema.js  │  │  [new]    │  │
│  │ (shared) │  │  (auth)  │  │  (theme)  │  │  trilha.js│  │
│  └────┬─────┘  └────┬─────┘  └───────────┘  └─────┬─────┘  │
└───────┼─────────────┼───────────────────────────────┼───────┘
        │  fetch()    │  fetch()                       │ fetch()+SSE
        ▼             ▼                                ▼
┌─────────────────────────────────────────────────────────────┐
│  Express (Node.js)  — backend/                               │
│  ┌──────────┐ ┌────────────┐ ┌────────────┐ ┌───────────┐  │
│  │ auth.js  │ │ trilhas.js │ │atividades │ │   ia.js   │  │
│  │  routes  │ │  routes    │ │  routes    │ │  routes   │  │
│  └────┬─────┘ └─────┬──────┘ └─────┬──────┘ └─────┬─────┘  │
│       └─────────────┴──────────────┴───────────────┘        │
│                           │                    │             │
│              ┌────────────▼───┐    ┌───────────▼──────────┐ │
│              │   db.js (pool) │    │  openai SDK (stream)  │ │
│              └────────────────┘    └──────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
        │                                    │
        ▼                                    ▼
┌──────────────┐                   ┌──────────────────────┐
│  MySQL       │                   │  OpenAI API          │
│  (duopratic) │                   │  gpt-4o-mini         │
└──────────────┘                   └──────────────────────┘
```

---

## Sources & Confidence

| Claim | Source | Confidence |
|-------|--------|------------|
| OpenAI Node.js SDK streaming API | Direct codebase inspection + OpenAI docs | HIGH |
| SSE pattern for streaming in Express | Established Node.js pattern | HIGH |
| bcrypt for password hashing | Node.js security standard | HIGH |
| gpt-4o-mini pricing advantage | OpenAI pricing page | HIGH |
| MySQL schema patterns for LMS | Standard educational platform patterns | HIGH |
| sessionStorage for client-side study state | Browser API standard | HIGH |
| Railway/Render for TCC hosting | Platform docs | MEDIUM (pricing tiers may vary) |
