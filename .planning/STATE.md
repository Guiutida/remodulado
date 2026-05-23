# STATE.md — DuoPratic

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-22)

**Core value:** Alunos aprendem mais, com ritmo próprio e apoio de IA — professores acompanham o progresso sem esforço extra.
**Current focus:** Phase 1 — Segurança e Fundação

## Current Milestone

**v1.0 — TCC**
Sistema funcional de ponta a ponta para apresentação do Trabalho de Conclusão de Curso.

## Phase Status

| Phase | Status |
|-------|--------|
| Phase 1: Segurança e Fundação | ✅ Complete |
| Phase 2: Turmas e Trilhas | 🔲 Not Started |
| Phase 3: Atividades e Painel do Aluno | 🔲 Not Started |
| Phase 4: Integração com IA | 🔲 Not Started |
| Phase 5: Polimento e Deploy | 🔲 Not Started |

## Active Decisions

- Gemini 2.5 Flash (`@google/genai@2.6.0`) como provider de IA — free tier cobre demo do TCC
- SSE (Server-Sent Events) para streaming das respostas da IA — sem dependências extras
- Sem framework frontend — vanilla HTML/CSS/JS mantido por consistência com a base existente

## Next Step

Run `/gsd-plan-phase 2` to plan Phase 2: Turmas e Trilhas.

---
*Last updated: 2026-05-22 after Phase 1 completion*

