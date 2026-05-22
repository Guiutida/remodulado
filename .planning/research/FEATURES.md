# Features Research

**Domain:** AI-powered educational platform (K-12, Brazilian ensino fundamental 2 / ensino médio)
**Researched:** 2025-01-27
**Project context:** DuoPratic — students follow AI-personalized learning tracks (trilhas), complete
activities, get guided help from AI; teachers manage turmas, assign activities, monitor progress.
Stack: Node.js + Express + MySQL + vanilla HTML/CSS/JS. TCC milestone.

---

## What Already Exists (Don't Rebuild)

Before defining what to build, note what is **already functional**:

| What | State |
|------|-------|
| Login + cadastro (aluno/professor) | ✅ Fully working, API-backed |
| All page shells (aluno, professor, trilhas, atividades, estudo, ia-estudo, turma, configurações) | ✅ UI built, static/hardcoded |
| Preferences (tema, status, foto, notificacoes, ritmo, disciplina) | ✅ DB-backed, working |
| DB schema: usuarios, turmas, turma_alunos, atividades, entregas, avisos, preferencias_usuario | ✅ Exists, needs extension |
| Progress API (`/api/alunos/:id/progresso/funcoes`) | ⚠️ Exists but hardcoded to one activity |
| Navigation, notifications panel, profile menu | ✅ Functional UI |

---

## Table Stakes (Must Have)

Features users expect from any educational platform. Their absence makes the product feel broken
or incomplete — not a "nice to have," a blocker for genuine utility.

### For Students (Alunos)

| Feature | Why Expected | Complexity | Current State |
|---------|--------------|------------|---------------|
| **Real progress tracking** — % completion per trilha, per disciplina, persisted to DB | Every edu-platform shows progress; static 72% breaks trust immediately | Medium | Hardcoded — needs real `progresso_aluno` table + API |
| **Activity submission** — student writes answer, clicks submit, status updates | Core academic loop; without it the platform is read-only | Medium | Schema exists (`entregas`), UI built, API partially wired |
| **Teacher feedback visible** — see grade + comentário from professor after correction | Students need to know if they're right; no feedback = no learning loop | Low | Schema has `nota` + `comentario_professor`, UI not wired |
| **Activity list with real status** — pending/delivered/corrected from DB, not hardcoded | Students filter by "what I still owe" daily | Low | UI built, filter works, data is static |
| **Turma join by código** — student enters class code, gets added | Standard since Google Classroom; Brazilian schools expect this exact UX | Low | DB + server ready, frontend form not connected |
| **Class member list** — see classmates and professor info in turma | Social presence; confirms you're in the right class | Low | UI exists, data hardcoded |
| **Announcements (avisos)** — read teacher announcements inside turma | Every LMS has this; "what did the teacher say?" is daily use | Low | Schema + UI exist, not DB-backed |
| **"Continue where you left off"** — dashboard shows next pending step | Core retention mechanic; Duolingo, Khan Academy, all do this | Low | UI exists (`aluno.html` destaque card), not real-data |
| **Notifications** — new activity, grade received, aviso from teacher | Users expect bell icon to actually ring | Medium | Panel exists, data hardcoded |

### For Teachers (Professores)

| Feature | Why Expected | Complexity | Current State |
|---------|--------------|------------|---------------|
| **Create turma** — name, disciplina, generates join code | Founding action; teacher can't teach without a class | Low | DB + API support it, no frontend form wired |
| **Create activity** — title, description, deadline, assign to turma | Core teacher action; without it there's nothing to submit | Medium | Schema exists, no creation form wired |
| **See all submissions** — list all entregas for an atividade | Teachers need to know who delivered | Low | DB query ready, no dedicated view |
| **Grade + comment** — set nota and comentário on a submission | Closes the academic loop | Low | Schema has columns, no write API |
| **Class overview** — how many students, pending activities, last access | "At a glance" dashboard — professor.html already shows this pattern | Medium | UI exists, all hardcoded |
| **Announcements** — post avisos to turma | Teachers need to broadcast to class | Low | Schema + UI exist, not DB-backed |

---

## Differentiating Features (Sets DuoPratic Apart)

These are the features that justify DuoPratic's existence. Khan Academy has content; Google
Classroom has class management; **DuoPratic's edge is the AI that tutors without tutoring
for the student.**

### AI Tutor — Guided Reasoning (Core Differentiator)

The central constraint is **pedagogical**: the AI must never give the direct answer. Instead it
uses Socratic questioning, analogy, and partial hints to guide the student's own reasoning.

| Feature | Value | Complexity | Notes |
|---------|-------|------------|-------|
| **Context-aware AI hints** — AI receives the exercise question + student's attempt + asks for reasoning direction, not answer | Real learning happens when students think; competitors like Socratic just answer | High | Needs LLM API (GPT-4o-mini or Gemini Flash), system prompt engineering is critical |
| **"Explique meu erro"** — student pastes their answer; AI identifies the conceptual mistake and asks a guiding question | Students know they're wrong; they don't know *why* — this bridges that gap | High | Requires careful prompting: "do not say the correct answer; identify the flawed step" |
| **"Me dê uma dica"** — step-by-step scaffolded hint, each request reveals one more layer | Prevents the student from leapfrogging to the answer | Medium | Hint levels: concept → method → example analogy (not solution) |
| **"Faça uma pergunta parecida"** — AI generates an isomorphic problem with different numbers/context | Practice via variation; students see the pattern, not just the answer | High | LLM-generated variant exercises — include answer for teacher, not exposed to student |
| **AI conversation history** — see last N interactions in context | Continuity of tutoring session feels natural | Low | `ai_historico` table: aluno_id, atividade_id, pergunta, resposta, timestamp |
| **Pedagogical guardrails** — system prompt explicitly prohibits direct answers, uses Socratic method | Without this, AI becomes a homework-solver — the TCC's entire academic argument collapses | High | System prompt is the product; test extensively against "just tell me the answer" attempts |

### Personalized Learning Tracks (Trilhas)

| Feature | Value | Complexity | Notes |
|---------|-------|------------|-------|
| **Data-driven trilha engine** — trilha is a sequence of etapas (base → prática → revisão → desafio), progress persists per student | Without real trilhas the "paths" are just static HTML | Medium | New tables: `trilhas`, `etapas_trilha`, `progresso_trilha` |
| **AI performance analysis** — after completing a set of activities, AI summarizes weak areas | "Você errou 3 questões sobre coeficiente angular — veja etapa de revisão" | High | Aggregate entregas data → send to LLM for pattern detection → return Portuguese summary |
| **AI trilha suggestion** — based on weak areas, AI recommends which trilha to do next | Personalization that no generic LMS offers | High (post-TCC candidate) | Can be simplified: rule-based suggestion + AI explanation of why |
| **Etapa completion unlocks next** — linear progression through base→prática→revisão→desafio | Prevents skipping without foundation; UI already suggests this pattern | Medium | Simple: mark etapa as `concluida` in DB, gate next |

### Teacher Intelligence Panel

| Feature | Value | Complexity | Notes |
|---------|-------|------------|-------|
| **Students needing attention** — AI flags students with low completion or wrong patterns | "5 alunos precisam de atenção" is already in the UI — make it real | Medium | Simple rule: < 50% completion OR > 3 consecutive wrong = flag |
| **AI-assisted correction** — when professor reviews a submission, AI suggests a grade band and identifies key concepts tested | Saves grading time significantly for large classes | High (post-TCC candidate) | Can simplify to: AI summarizes the student's answer for teacher |

---

## Engagement Mechanics

Tactics that drive students back to the platform and build habit. Calibrated for Brazilian
13–18 year olds; avoid anything that feels patronizing or gamified beyond their tolerance.

### What Works (Evidence from Duolingo, Khan Academy, Brilliant)

| Mechanic | Why It Works | Implementation | Priority |
|----------|-------------|----------------|----------|
| **Study streak (sequência)** — "5 dias seguidos" counter on dashboard | Daily habit formation; mild FOMO when streak breaks; Duolingo's #1 retention driver | Store last_activity_date per user, compute streak at login | **Must Have** — already in UI, needs DB backing |
| **"Plano de hoje" / daily goal** — dashboard shows exactly what to do today | Removes decision friction; students with ADHD especially benefit from a single clear action | Rule: 1 pending atividade + 1 review item if due | **Must Have** — already in UI shell |
| **Progress bar per trilha** — visual % completion | Completion anxiety; want to reach 100% | Simple % of etapas concluidas | **Must Have** — in UI, needs real data |
| **Pending review indicator** — "3 itens para revisar" | Spaced repetition light; students know they have unfinished business | Count entregas not yet reviewed / with comments unread | **Should Have** |
| **Immediate feedback** — after submitting, UI responds within 2 seconds | Students hate uncertainty; waiting breaks momentum | AI response streaming or fast DB write | **Must Have** |
| **Teacher comment notification** — "Prof. Ana comentou sua atividade" | Social accountability; students care what teachers think | On grade/comment write, create notification record | **Should Have** |

### What to Avoid (Scope + Pedagogy Reasons)

| Mechanic | Why Not |
|----------|---------|
| **XP points / leaderboard** | Competitive ranking demotivates weaker students (anti-learning); scope creep for TCC |
| **Hearts / lives system** (Duolingo style) | Punishes mistakes — counter-pedagogical; students should feel safe to try and fail |
| **Badges / trophies** | Surface-level; meaningful only with a full gamification system; half-baked badges are worse than none |
| **Student-to-student chat** | Moderation nightmare for minors; LGPD implications; out of scope |

---

## What Competitors Do (Brief Reference)

| Platform | Core Loop | AI | Gamification | Brazil Relevance |
|----------|-----------|----|----|------------------|
| **Khan Academy** | Watch video → practice exercises → mastery | Khanmigo (GPT-4): hints, Socratic dialog | Badges, energy points, leaderboard | Has PT-BR content; no classroom integration for BR schools |
| **Duolingo** | Bite-sized lessons → streak → XP | AI for sentence correction, adaptive difficulty | Hearts, streaks, leagues, XP — the most gamified edu-app | Popular but for language only; no school curriculum |
| **Google Classroom** | Teacher assigns → student submits → teacher grades | None native | None | Used in BR schools but no AI tutoring, no learning tracks |
| **Socratic (Google)** | Photo a problem → AI explains it | AI gives direct answers (anti-pedagogical) | None | Popular with BR students for doing homework — what DuoPratic explicitly avoids |
| **Brilliant** | Guided problem-solving → conceptual hints | Step-by-step reveal | Progress, streaks | English-only; math/science focused |
| **Edmodo / Schoology** | LMS-style class management | None | None | Deprecated or niche in BR; left gap for DuoPratic |

**The gap DuoPratic fills:** A platform that combines classroom management (Google Classroom) +
personalized tracks (Khan Academy) + AI tutoring that enforces reasoning (unlike Socratic) —
all in Portuguese, for the BNCC curriculum context, with a teacher in the loop.

---

## Minimum Viable Set for TCC

This is the exact set of features needed for DuoPratic to be **genuinely useful** (not a toy)
at TCC presentation. Ordered by dependency.

### Layer 1 — Data Foundation (nothing works without these)

| Feature | What to Build | Why First |
|---------|--------------|-----------|
| **Real turma CRUD** | Professor creates turma → frontend form → POST `/api/turmas`; aluno joins by código | Everything else is scoped to a turma |
| **Real atividade CRUD** | Professor creates atividade for a turma; aluno sees it in their list | Core academic loop |
| **Real submission + grade** | Aluno submits `resposta` text → status `entregue`; professor writes `nota` + `comentario` → status `corrigida` | Closes the loop |
| **Real progress tracking** | `progresso_trilha` table; etapa completion API; real % on dashboard | Currently 100% hardcoded |

### Layer 2 — AI Integration (the differentiator)

| Feature | What to Build | Notes |
|---------|--------------|-------|
| **AI tutor endpoint** — `POST /api/ia/orientar` | Accepts: `{pergunta, tentativa_aluno, contexto_exercicio}`; returns Socratic guidance | Use OpenAI GPT-4o-mini or Google Gemini 1.5 Flash (cost-effective) |
| **Pedagogical system prompt** | Refuses to answer directly; asks guiding questions; detects homework-solving attempts | Most important single engineering decision |
| **ia-estudo.html wired** | Replace simulated responses with real API call | Page already built, just needs fetch() |
| **estudo.html IA panel wired** | "Depois da sua explicação, a IA pode mostrar outro caminho" — make that real | Critical for TCC demo |

### Layer 3 — Teacher Intelligence (makes teachers want to use it)

| Feature | What to Build | Notes |
|---------|--------------|-------|
| **Student attention flags** | Rule-based: flag student if streak = 0 AND pending activities ≥ 2 | Simple SQL query, professor.html already has the "precisam de atenção" UI |
| **AI performance summary** | After completing a trilha, aggregate wrong answers → AI generates a 2-sentence summary of weak spots | One LLM call per trilha completion |

### Layer 4 — Engagement (keeps students coming back)

| Feature | What to Build | Notes |
|---------|--------------|-------|
| **Study streak** | Store `ultimo_acesso` per user; compute streak days in GET `/api/alunos/:id/streak` | Simple, high retention impact |
| **Real notifications** | Write notification records on: new activity, grade received, new aviso | Panel already exists; needs DB + API |
| **Real avisos** | POST `/api/turmas/:id/avisos` → aluno sees in turma page | Schema exists, just needs wiring |

### What to Defer (Post-TCC)

| Feature | Reason to Defer |
|---------|----------------|
| AI trilha generation (AI creates the trilha structure) | Content curation problem; needs human-reviewed curriculum; very complex for TCC |
| Leaderboards, XP, badges | Not pedagogically aligned; scope creep |
| File upload for atividades | Text-based submissions sufficient for TCC |
| Mobile app | Web-responsive is enough |
| Multi-teacher per turma | Single professor per turma is fine for TCC |
| Email notifications | In-app notifications are sufficient |
| AI-assisted grading | Automates teacher job — ethically sensitive; post-TCC discussion |

---

## Feature Dependencies (Build Order)

```
1. DB schema extensions (trilhas, etapas, progresso, notificacoes, ai_historico)
        ↓
2. Turma CRUD APIs (create, list, join by código)
        ↓
3. Atividade CRUD APIs (create, list by turma, submit, grade)
        ↓
4. Progress tracking APIs (etapa completion, trilha %, streak)
        ↓
5. AI tutor endpoint (system prompt + LLM integration)
        ↓
6. Frontend wiring (connect all existing HTML shells to real APIs)
        ↓
7. Notifications (depends on all above to generate events)
        ↓
8. AI performance summary (depends on real submission data existing)
```

---

## Anti-Features (Explicitly Do Not Build)

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **AI that gives direct answers** | Destroys the academic integrity argument of the TCC; makes the platform a homework solver | Enforce with system prompt + test adversarially |
| **Leaderboard / ranking** | Demotivates the bottom 50% of the class; Brazilian school culture already over-indexes on grades | Use individual progress bars only |
| **Complex exercise types** (drag-and-drop, math equation editor) | Extreme scope for TCC; vanilla JS gets complicated fast | Text answer + multiple choice (4 options) is sufficient |
| **Content creation by AI upfront** | AI-generated curriculum is unreviewed; teachers don't trust it | Teacher creates content; AI helps students navigate it |
| **Student-to-student messaging** | LGPD issues (minors), moderation burden, distraction | Teacher → class one-way announcements only |

---

## Sources & Confidence

| Claim | Source | Confidence |
|-------|--------|------------|
| Khan Academy Socratic AI pattern (no direct answers) | khanacademy.org/khan-labs, Khanmigo docs | HIGH |
| Duolingo streak as #1 retention mechanic | Duolingo 2023/2024 Annual Report, multiple UX studies | HIGH |
| Socratic by Google gives direct answers (contrast) | Direct use of app + Google AI overview | HIGH |
| "Hearts system demotivates weaker learners" | Learning science literature; Duolingo's own A/B test reversals | MEDIUM |
| Brazilian school LMS gap (no AI tutoring in PT-BR) | Market scan: no equivalent to Khanmigo in Portuguese for BNCC | MEDIUM |
| LGPD (LGPD Lei 13.709/2018) applies to minors data | Brazilian law, ANPD guidelines | HIGH |
| GPT-4o-mini / Gemini Flash cost-effectiveness for this use case | OpenAI + Google pricing pages | HIGH |
