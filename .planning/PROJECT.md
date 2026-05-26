# DuoPratic

## Current State (v1.0 — Shipped 2026-05-26)

Plataforma educacional funcional entregue para apresentação do TCC. Sistema completo com autenticação segura, turmas, trilhas, atividades com correção automática, tutor IA socrático e análise de desempenho.

**Stack:** Node.js + Express + MySQL + HTML/CSS/JS vanilla
**Fases entregues:** 5 fases, 23 planos, 43/44 requisitos v1
**Gap aceito:** INFRA-05 (deploy em produção) — railway.json pronto para deploy futuro

## What This Is

Plataforma de estudo online voltada para alunos do ensino fundamental 2 e ensino médio, com suporte a professores que gerenciam turmas. Os alunos avançam por trilhas de aprendizado, resolvem atividades com retorno imediato e contam com IA integrada para apoio no estudo. Os professores criam turmas, atribuem conteúdo e acompanham o desempenho da turma.

## Core Value

Alunos aprendem mais, com ritmo próprio e apoio de IA — professores acompanham o progresso sem esforço extra.

## Requirements

### Validated (v1.0)

- ✓ Landing page com apresentação da plataforma — existente
- ✓ Cadastro de usuário (aluno/professor) — existente
- ✓ Login com autenticação — existente
- ✓ Backend Node.js/Express com MySQL — existente
- ✓ Autenticação segura bcrypt + JWT — v1.0 Phase 1
- ✓ CORS configurado + IDOR eliminado — v1.0 Phase 1
- ✓ Backend modular (routes/controllers/middleware) — v1.0 Phase 1
- ✓ Gerenciamento de turmas — professor cria turma, adiciona alunos — v1.0 Phase 2
- ✓ Trilhas de aprendizado — criação, etapas e navegação pelo aluno — v1.0 Phase 2
- ✓ Atividades e exercícios — criação pelo professor, resolução com retorno imediato — v1.0 Phase 3
- ✓ Painel do aluno — progresso nas trilhas, histórico, pontuação — v1.0 Phase 3
- ✓ Painel do professor — desempenho da turma, progresso individual — v1.0 Phase 4
- ✓ IA: tutor socrático com streaming SSE + defesa pedagógica — v1.0 Phase 4
- ✓ IA: geração de trilhas por IA + edição antes de publicar — v1.0 Phase 4
- ✓ IA: resumo de desempenho aluno + turma — v1.0 Phase 4
- ✓ Upload foto de perfil via multer (não base64) — v1.0 Phase 5
- ✓ Validação de env vars + 404/500 handlers — v1.0 Phase 5
- ✓ Spinner global + toasts de erro/sucesso — v1.0 Phase 5

### Active (Next Milestone)

- [ ] Deploy em URL pública acessível (railway.json já criado)
- [ ] Smoke test end-to-end em produção

### Out of Scope

- Acesso de qualquer pessoa sem vínculo a turma — decidido para versão futura após o TCC
- Aplicativo mobile nativo — plataforma web responsiva é suficiente para o TCC
- Pagamentos / monetização — fora do escopo do TCC

## Context

- v1.0 entregue em 4 dias (2026-05-22 → 2026-05-26), 97 commits, 23 planos
- Sistema funcional localmente com todos os fluxos principais operacionais
- Deploy pode ser feito a qualquer momento via Railway (railway.json + .env.example prontos)
- Próximo passo: apresentação da banca do TCC

## Constraints

- **Stack**: Node.js + Express + MySQL + HTML/CSS/JS vanilla — sem framework frontend
- **Prazo**: TCC apresentado — sistema funcional e demonstrável
- **IA**: explica sem revelar respostas diretas — requisito pedagógico explícito

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| IA explica exercícios sem dar respostas | Requisito pedagógico — estimula o raciocínio do aluno | ✓ Implementado com defesa de injection |
| Stack vanilla (sem framework frontend) | Já definido no projeto, manter consistência | ✓ Mantido em todas as 5 fases |
| Sistema real com banco de dados persistido | TCC exige demonstração funcional, não protótipo | ✓ Entregue |
| bcrypt + JWT (migração de texto plano) | Eliminar vulnerabilidade crítica de segurança | ✓ Phase 1 |
| multer DiskStorage para foto_perfil | Eliminar base64 LONGTEXT do banco | ✓ Phase 5 |
| Gemini 2.5 Flash + SSE | Free tier cobre demo; sem dependências extras para streaming | ✓ Phase 4 |
| Deploy removido do escopo v1.0 | Decisão do usuário — foco no sistema local para a banca | ⚠ Gap aceito (INFRA-05) |

## Evolution

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-26 after v1.0 milestone*
