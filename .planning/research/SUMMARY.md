# Research Summary — DuoPratic

**Synthesized:** 2025-05  
**Sources:** STACK.md · FEATURES.md · ARCHITECTURE.md · PITFALLS.md  
**Overall Confidence:** HIGH — all 4 researchers worked directly from codebase analysis + verified library docs

---

## Executive Summary

DuoPratic is an AI-tutored educational platform for Brazilian ensino fundamental 2 / ensino médio — a category where no direct Portuguese-language competitor exists. The platform's core differentiator is a Socratic AI tutor that guides student reasoning without giving direct answers, paired with personalized learning tracks (trilhas) and classroom management for teachers. The tech stack (Node.js/Express/MySQL/vanilla JS) is a good fit for the TCC scope; the challenge is not architectural novelty but rather **finishing what's been started**: the UI shells are complete, the DB schema is solid, and most pages exist — they are just wired to hardcoded data instead of real APIs.

The critical finding is that **the existing codebase has 5 confirmed security vulnerabilities that must be resolved before any new feature is built.** Passwords are stored in plaintext, there are no auth tokens, every user can read every other user's data (IDOR), and seed data runs inside production request handlers. Adding AI on top of these issues would create compounding risk — a student could exfiltrate all classmates' data, and the AI endpoint would be callable by anyone on the internet. The recommended approach is a hard Phase 1 that fixes security and refactors the server structure, then proceeds to data wiring, then AI.

The AI integration is straightforward once the foundation is clean: Google Gemini 2.5 Flash via `@google/genai` is free-tier viable for TCC demo (no credit card required, unlike OpenAI), streaming via SSE needs no additional libraries, and the "explain without answering" constraint must be implemented as a 3-layer defense (robust system prompt + injection detection + response validation). The personalized trilha engine and teacher intelligence panel represent the product's long-term value, but for TCC purposes the minimum viable set is: real turma/atividade CRUD, real progress tracking, working AI tutor, and no hardcoded data visible in the UI.

---

## Critical Issues Found in Existing Code

These are **confirmed present in the current codebase** — not hypothetical risks. They must be resolved in Phase 1 before any new features are built.

| ID | Issue | Location | Severity | Estimated Fix |
|----|-------|----------|----------|---------------|
| SEC-1 | **Plaintext passwords** — stored and compared in clear text in MySQL | `server.js` lines 170–172, 202 | 🔴 Critical | 2h (bcrypt) |
| SEC-2 | **No auth tokens** — login returns user object, no JWT; all API routes publicly accessible | `server.js` all routes; `acesso.js` line 56 | 🔴 Critical | 4h (JWT) |
| SEC-3 | **IDOR** — `:id` param never checked against authenticated user; any student can read any other student's data | `server.js` lines 216–367 | 🔴 Critical | 1h (after SEC-2) |
| SEC-4 | **Wildcard CORS** — `Access-Control-Allow-Origin: *` in production | `server.js` lines 23–25 | 🟠 High | 30min |
| SEC-5 | **No frontend route guards** — pages accessible without login via direct URL | `aluno.html`, `professor.html` | 🟠 High | 1h |
| NODE-3 | **Seed data in production handlers** — `garantirAtividadeFuncoes()` creates fake Prof. Ana Paula on every progress API call | `server.js` lines 34–94 | 🟠 High | 1h |
| DB-1 | **Profile photo as LONGTEXT base64** — every preference fetch returns 270KB+; DB backup bloat | `schema.sql` line 85 | 🟠 High | 2h |
| DB-2 | **Schema defined in two places** — `preferencias_usuario` in schema.sql AND recreated in server.js on every request | `server.js` lines 96–111 | 🟡 Medium | 1h |

> **LGPD implication:** SEC-1 through SEC-3 together constitute a LGPD (Lei 13.709/2018) violation for a platform serving minors. A TCC jury asking "how is student data protected?" must have a real answer.

---

## Recommended Stack Additions

All versions verified against npm registry and Context7 documentation.

| Package | Version | Purpose | Priority |
|---------|---------|---------|----------|
| `bcrypt` | 6.0.0 | Password hashing (Phase 1 blocker) | 🔴 Immediate |
| `jsonwebtoken` | 9.0.3 | JWT auth tokens (Phase 1 blocker) | 🔴 Immediate |
| `express-rate-limit` | 8.5.2 | Brute-force protection on auth + AI cost control | 🔴 Immediate |
| `helmet` | 8.2.0 | HTTP security headers (CSP, HSTS, X-Frame-Options) | 🟠 Phase 1 |
| `express-validator` | 7.3.2 | Input validation, especially for AI prompt length | 🟠 Phase 1 |
| `@google/genai` | 2.6.0 | Gemini AI SDK — free tier, no credit card for TCC | 🟡 Phase 3 |
| `multer` | 2.1.1 | File uploads for profile photos (replaces base64) | 🟡 Phase 2 |

**Do NOT install:**
- `@google/generative-ai` — deprecated, different API surface
- `langchain` / Vercel AI SDK — overkill; 30 lines of Express code replaces both
- `socket.io` — SSE is sufficient for one-directional AI streaming; no extra dep needed
- Prisma / Sequelize / TypeORM — existing raw `mysql2` queries work; ORM migration has negative ROI for TCC

**AI Provider Decision:** Use `@google/genai` with `gemini-2.0-flash` for TCC (free: 15 RPM, 1M tokens/day) and `gemini-2.5-flash` optionally for production (better reasoning, tighter free quota). Both are accessed via the same SDK — it's just a string parameter change. ARCHITECTURE.md recommends OpenAI but STACK.md's Gemini recommendation is stronger for TCC budget constraints: **no credit card required, R$ 0 to demo.**

**Environment variables to add:**
```
JWT_SECRET=<32+ char random string>
GEMINI_API_KEY=<from Google AI Studio>
CORS_ORIGIN=http://localhost:3000
```

---

## Feature Priority

### What Already Works (Do Not Rebuild)
- Login + cadastro (aluno/professor) — API-backed, functional
- All page shells — UI complete, needs data wiring only
- Preferences (tema, status, foto, notificações, ritmo, disciplina) — DB-backed
- DB schema: `usuarios`, `turmas`, `turma_alunos`, `atividades`, `entregas`, `avisos` — solid base

### Table Stakes — Must Have for TCC

| Feature | Gap | Phase |
|---------|-----|-------|
| Real turma CRUD | Professor form not wired to API | 2 |
| Real atividade CRUD | No creation form connected | 2 |
| Activity submission + grading | Schema exists, UI not wired | 2 |
| Real progress tracking | 100% hardcoded | 2 |
| Turma join by código (aluno) | Frontend form not connected | 2 |
| AI tutor endpoint (`/api/ia/orientar`) | No backend AI plumbing | 3 |
| `ia-estudo.html` wired to real AI | Currently simulated in HTML | 3 |
| Study streak — `ultimo_acesso` | UI shell exists, needs DB | 4 |
| Real notifications | Panel exists, data hardcoded | 4 |
| No hardcoded content visible in UI | Prof. Ana, static %, fake history | 1+2 |

### Differentiating Features

| Feature | Value | Phase |
|---------|-------|-------|
| **Socratic AI tutor in PT-BR** — guides without answering | Core product differentiator; competitors (Socratic by Google) just answer | 3 |
| **"Explique meu erro"** — AI identifies the student's conceptual mistake | Students know they're wrong; they don't know *why* | 3 |
| **"Me dê uma dica"** — scaffolded hints, one layer at a time | Prevents leapfrogging to the answer | 3 |
| **AI performance summary** — weak areas after trilha completion | "Você errou 3 questões sobre coeficiente angular" | 4 |
| **Student attention flags** — teacher sees who needs help | Rule-based: < 50% OR streak = 0 AND ≥ 2 pending | 4 |

### Explicitly Defer to Post-TCC

- AI trilha generation (AI creates curriculum structure) — content curation complexity
- Leaderboards, XP, badges — not pedagogically aligned; demotivates weak students
- File upload for atividade content — text-based submissions sufficient
- AI-assisted grading — ethically sensitive, needs post-TCC discussion
- Multi-teacher per turma, email notifications, mobile app

### Anti-Features (Never Build)

- **AI that gives direct answers** — destroys the TCC's academic integrity argument
- **Competitive ranking/leaderboard** — demotivates bottom 50% of class
- **Student-to-student chat** — LGPD issues for minors, moderation burden
- **Hearts/lives system** — punishes mistakes; counter-pedagogical

---

## Key Architectural Decisions

### 1. Split server.js Before Adding Any New Feature

The current 400-line monolith will become unmaintainable at 2000+ lines when AI routes, trilhas, and atividades are added. **This is Phase 1, not optional.**

Target structure:
```
backend/
├── server.js               ← app setup + listen ONLY
├── db.js                   ← unchanged
├── middleware/
│   ├── auth.js             ← requireAuth, requireAluno, requireProfessor
│   └── validate.js         ← express-validator helpers
└── routes/
    ├── auth.js             ← /api/login, /api/cadastro
    ├── usuarios.js         ← /api/usuarios/:id + preferences
    ├── turmas.js           ← /api/turmas + member management
    ├── trilhas.js          ← /api/trilhas + etapas + progresso
    ├── atividades.js       ← /api/atividades + questoes
    ├── entregas.js         ← /api/entregas + respostas
    └── ia.js               ← /api/ia/orientar, /api/ia/gerar-trilha
```

### 2. Database Schema Extensions Required

New tables needed (extend, don't replace existing schema):

| Table | Purpose |
|-------|---------|
| `trilhas` | Learning track linked to a turma |
| `trilha_etapas` | Ordered steps within a trilha (teoria/exercicio/revisao/avaliacao) |
| `progresso_etapa` | Per-student, per-step completion status — never store raw % |
| `questoes` | Structured exercises inside atividades (multipla_escolha / aberta) |
| `opcoes_questao` | Answer choices for multiple-choice questions |
| `respostas_questao` | Student answer per question, per entrega |
| `sessoes_ia` | AI conversation session per student (token usage tracking) |
| `mensagens_ia` | Individual turns in an AI session (aluno/ia) |

**Progress calculation rule:** Never store a `percentual` column. Compute on the fly:
```sql
ROUND(COUNT(pe.id) FILTER (WHERE pe.status = 'concluido') / NULLIF(COUNT(te.id), 0) * 100)
```

**Profile photos:** Migrate `foto_perfil LONGTEXT` → `foto_perfil VARCHAR(255)` storing a filesystem path. Use `multer` + Express static `/uploads/` folder. Do this in Phase 1 or early Phase 2.

### 3. Auth Pattern

- **JWT (jsonwebtoken)** signed tokens, 8h expiry, stored in `localStorage` as `duopratic_token`
- Frontend replaces raw user object with `Authorization: Bearer <token>` header on every API call
- Every protected route uses `requireAuth` middleware; role-specific routes add `requireAluno` / `requireProfessor`
- Every `:id` route checks ownership: `req.usuario.id === parseInt(req.params.id)` OR professor role

### 4. AI Integration — 3 Layers of "Explain Without Answering"

The pedagogical constraint is the product. It must be defended in depth:

1. **System prompt layer** — detailed, specific rules (not just "don't give answers"):
   > "Nunca enuncie a resposta final numérica. Nunca complete um cálculo que o aluno deve fazer. SE PERGUNTADO diretamente, recuse com gentileza e ofereça uma nova dica."

2. **Injection detection layer** — server-side regex blocks: `"ignore previous"`, `"forget instructions"`, `"now act as"`, `"disregard"`

3. **Response validation layer** — secondary AI call: `"Does this response directly solve an exercise? yes/no"` — regenerate if yes

**AI streaming:** SSE via `Content-Type: text/event-stream` + `fetch + ReadableStream` on the frontend. No Socket.io, no extra libraries.

**Cost control for free tier:**
- `max_tokens: 400` on every tutoring call
- Rate limiter: 8 AI requests/minute per IP (buffer below Gemini's 15 RPM free tier)
- Per-user daily quota tracked in `sessoes_ia` table (10 sessions/day during TCC demo)
- `gemini-2.0-flash` for development (1M tokens/day free); `gemini-2.5-flash` optionally for demo

### 5. Study Session State — Client-Side is Correct

Navigation through trilha etapas (which step is active) lives in `sessionStorage` — no server round-trip per step. Server is only called at 3 moments: load etapas, mark etapa complete, call AI. This keeps the Node.js process stateless and scales fine for TCC.

---

## Risks & Mitigations

| Risk | Severity | Mitigation | Phase |
|------|----------|-----------|-------|
| **Plaintext passwords** in live DB | 🔴 Critical | Install bcrypt, hash all passwords, force reset for existing users | 1 |
| **No auth tokens** — all APIs public | 🔴 Critical | JWT middleware on every protected route | 1 |
| **IDOR** — student reads classmate data | 🔴 Critical | Ownership check after JWT: `req.usuario.id === req.params.id` | 1 |
| **AI prompt injection** — student bypasses "no answer" | 🔴 Critical | 3-layer defense: system prompt + injection regex + validation pass | 3 |
| **AI cost explosion** — one student sends 500 messages | 🔴 Critical | Rate limiter + daily quota in DB + Gemini account hard cap | 3 |
| **Context drift** — long conversations leak answers | 🟠 High | Sliding window: keep last 4–6 turns; re-inject system prompt every N messages | 3 |
| **Math hallucinations** — AI gives wrong formula | 🟠 High | `temperature: 0.1` for math; disclaimer in UI; test suite of 20 math questions | 3 |
| **Seed data in production** — fake Prof. Ana in live DB | 🟠 High | Remove `garantirAtividadeFuncoes()` from handlers; move to `npm run seed` | 1 |
| **Base64 photos bloat DB** — 270KB per preferences fetch | 🟠 High | Migrate to filesystem storage in Phase 2 | 2 |
| **Hardcoded UI data visible to jury** — static 72%, Prof. Ana, fake history | 🟠 High | Wire all pages to real APIs before any demo | 2 |
| **Weak system prompt** — AI becomes homework solver | 🟠 High | Write detailed rules with examples; test 30+ adversarial inputs per sprint | 3 |
| **Schema in two places** — preferencias_usuario drifts | 🟡 Medium | Single source of truth: schema.sql only; remove `garantirTabelaPreferencias()` | 1 |
| **Missing DB indexes** on foreign keys | 🟡 Medium | Add explicit indexes for `aluno_id`, `turma_id`, `atividade_id` query patterns | 2 |
| **AI dependency over learning** — students skip thinking | 🟡 Medium | Mandatory attempt-before-AI UX; track `tentativas_proprias` | 3 |
| **No loading/error states for async UI** — duplicate AI requests | 🟡 Medium | Disable button during pending; streaming reduces perceived latency | 3 |

---

## Recommended Phase Order

Based on dependency analysis across all 4 research files, the following phase order is **non-negotiable** — each phase unblocks the next.

### Phase 1 — Security & Structure Foundation *(Do This First, No Exceptions)*

**Rationale:** 5 critical vulnerabilities exist in live code. Adding any feature on top of them creates compounding risk. The refactor also enables parallel backend development.

**Delivers:**
- Plaintext passwords → bcrypt hashes
- No tokens → JWT auth middleware on all protected routes
- IDOR removed — ownership checks on all `:id` routes
- Wildcard CORS locked down
- `server.js` split into `routes/` + `middleware/`
- Seed data removed from production handlers
- `foto_perfil` LONGTEXT migration planned (schema change)
- Frontend page guards (redirect to login if not authenticated)
- `.env` validation at startup

**Libraries:** `bcrypt`, `jsonwebtoken`, `helmet`, `express-rate-limit` (auth limiter only)
**Must avoid:** SEC-1, SEC-2, SEC-3, NODE-1, NODE-3 pitfalls
**Research flag:** Standard patterns — no additional research needed

---

### Phase 2 — Data Wiring & Core Academic Loop *(Make the Product Real)*

**Rationale:** All UI shells exist but show hardcoded data. This phase connects them to real APIs. Without this, DuoPratic is a static mockup. Must complete before AI is added (AI needs real submission data).

**Delivers:**
- Professor: create turma → generates join code
- Student: join turma by código
- Professor: create atividade for turma
- Student: see atividade list from DB, submit answer, see grade + comment
- Professor: see all submissions, write nota + comentário
- New DB tables: `trilhas`, `trilha_etapas`, `progresso_etapa`, `questoes`, `opcoes_questao`, `respostas_questao`
- Real progress tracking: computed from `progresso_etapa`, not hardcoded
- Avisos CRUD wired (schema exists, not connected)
- Photo storage migrated to filesystem (`multer` + `/uploads/`)
- Dashboard "continue where you left off" using real data
- DB indexes added for query performance

**Libraries:** `multer`, `express-validator`
**Must avoid:** DB-1 (base64 photos), DB-2 (schema duplication), DB-3 (hardcoded progress), UX-1 (static data visible)
**Research flag:** Standard patterns — no additional research needed

---

### Phase 3 — AI Tutor Integration *(The Differentiator)*

**Rationale:** AI tutoring is the core product differentiator. Depends on Phase 2 being complete (AI needs real questoes/entregas data for context). Must be hardened against prompt injection before any student touches it.

**Delivers:**
- `POST /api/ia/orientar` — Socratic guidance endpoint with SSE streaming
- `POST /api/ia/feedback` — "Explique meu erro" endpoint with exercise context
- `ia-estudo.html` wired to real API (replaces simulated responses)
- `estudo.html` AI hint panel wired
- Pedagogical system prompt (3-layer defense)
- Per-user rate limiting (DB quota) + `express-rate-limit` on AI routes
- `sessoes_ia` + `mensagens_ia` tables for conversation persistence
- Context window management (sliding 4–6 turn window)
- AI response disclaimer in UI ("Verifique com seu professor")

**Libraries:** `@google/genai` v2.6.0
**Must avoid:** AI-1 (prompt injection), AI-4 (rate limit/cost), AI-5 (weak prompt), AI-2 (context drift)
**Research flag:** ⚠️ Needs `/gsd-plan-phase --research-phase 3` — system prompt engineering, injection defense patterns, and Gemini SSE integration need detailed task planning

---

### Phase 4 — Teacher Intelligence & Engagement *(Makes it Sticky)*

**Rationale:** With real data flowing and AI working, this phase adds the analytics and engagement mechanics that make teachers want to use DuoPratic and students want to return.

**Delivers:**
- Student attention flags: rule-based (streak = 0 AND pending ≥ 2) surfaced in professor.html
- AI performance summary: aggregate wrong answers → LLM → 2-sentence weak-area summary
- Study streak (`ultimo_acesso` per user, computed at login)
- Real notifications (new activity, grade received, aviso from teacher)
- "Plano de hoje" on dashboard (real pending items)
- Teacher class overview with real data
- AI trilha suggestion (rule-based + AI explanation of why)

**Must avoid:** UX-2 (over-gamification), AI-6 (no conversation history for personalization), DB-6 (analytics data not designed)
**Research flag:** ⚠️ AI performance summary prompt design and analytics schema may need phase research

---

### Phase 5 — Polish, TCC Presentation Prep *(Cross the Finish Line)*

**Rationale:** Final phase before TCC submission. Focus on demo reliability, not new features.

**Delivers:**
- Loading/error states on all async UI (no frozen buttons, no raw JSON errors)
- Global Express error handler + `process.on('unhandledRejection')`
- Environment validation at startup (crashes early if JWT_SECRET or GEMINI_API_KEY missing)
- `atualizado_em` audit timestamps on all mutable tables
- Adversarial AI prompt test suite (30+ inputs, documented results)
- Remove all remaining hardcoded content from HTML
- Deployment to Railway.app or Render.com (free tier, no DevOps)

**Must avoid:** NODE-5 (unhandled rejections), NODE-6 (env validation), UX-4 (no loading states)
**Research flag:** Deployment patterns are standard — no research needed

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|-----------|-------|
| **Security vulnerabilities** | HIGH | Confirmed by direct code analysis (line numbers cited) |
| **Stack recommendations** | HIGH | Verified via Context7 + npm registry; versions confirmed |
| **AI provider choice (Gemini)** | HIGH | Free tier limits verified; STACK.md > ARCHITECTURE.md — ARCHITECTURE.md recommended OpenAI but STACK.md's Gemini free-tier argument is stronger for TCC budget |
| **Feature prioritization** | HIGH | Based on actual UI/schema audit; features either exist or don't |
| **DB schema design** | HIGH | Standard patterns, consistent across both ARCHITECTURE.md and PITFALLS.md |
| **AI prompt engineering** | MEDIUM | Principles well-established; specific prompt text requires testing and iteration |
| **Gemini free tier limits** | MEDIUM | Documented limits change; verify at ai.google.dev/pricing before planning AI phase |
| **Phase effort estimates** | MEDIUM | Security fixes are well-scoped; AI prompt hardening is harder to estimate |

---

## Open Questions

Decisions still needed before or during planning. None block Phase 1 or Phase 2.

| Question | Stakes | When Needed |
|----------|--------|------------|
| **Which Gemini model for TCC demo?** `gemini-2.0-flash` (more free quota) vs `gemini-2.5-flash` (better reasoning) | Affects AI quality vs. demo reliability | Phase 3 planning |
| **How many AI sessions per student per day?** 10 sessions/day was suggested — is that right for a class of 30? | Directly affects cost and Gemini rate limit headroom | Phase 3 planning |
| **File upload scope:** Profile photos only, or also activity attachments? | Affects `multer` integration complexity and Phase 2 scope | Phase 2 planning |
| **Multiple-choice only, or open-answer, or both for TCC?** | Multiple-choice auto-grades locally; open-answer needs AI — significant scope difference | Phase 2 planning |
| **Will there be real teachers and students for TCC demo, or just the jury?** | Affects how strictly rate limits and AI cost controls need to be tested | Phase 3 planning |
| **Hosting platform:** Railway.app vs Render.com vs local XAMPP for presentation? | Determines whether HTTPS/deployment is a Phase 5 task or optional | Phase 5 planning |

---

## Sources (Aggregated)

- **STACK.md** — Context7 `/googleapis/js-genai`, `/kelektiv/node.bcrypt.js`, `/auth0/node-jsonwebtoken`, `/express-rate-limit/express-rate-limit`, `/expressjs/multer` + npm registry (all HIGH confidence)
- **FEATURES.md** — Khan Academy Khanmigo docs, Duolingo 2023/2024 Annual Report, Google Socratic app, Brazilian LMS market scan, LGPD Lei 13.709/2018 (MEDIUM–HIGH confidence)
- **ARCHITECTURE.md** — Direct codebase analysis (`backend/server.js`, `database/schema.sql`, `assets/js/`) + established Node.js/MySQL patterns (HIGH confidence)
- **PITFALLS.md** — OpenAI official docs (Safety in building agents, Rate limits, Safety best practices), direct code analysis with line numbers, bcrypt/JWT industry standards, LGPD (HIGH confidence)
