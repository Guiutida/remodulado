# STATE.md — DuoPratic

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-22)

**Core value:** Alunos aprendem mais, com ritmo próprio e apoio de IA — professores acompanham o progresso sem esforço extra.
**Current focus:** Phase 5 — Polimento e Deploy

## Current Milestone

**v1.0 — TCC**
Sistema funcional de ponta a ponta para apresentação do Trabalho de Conclusão de Curso.

## Phase Status

| Phase | Status |
|-------|--------|
| Phase 1: Segurança e Fundação | ✅ Complete |
| Phase 2: Turmas e Trilhas | ✅ Complete |
| Phase 3: Atividades e Painel do Aluno | ✅ Complete |
| Phase 4: Integração com IA | ✅ Complete |
| Phase 5: Polimento e Deploy | 🔄 In Progress |

## Active Decisions

- Gemini 2.5 Flash (`@google/genai@2.6.0`) como provider de IA — free tier cobre demo do TCC
- SSE (Server-Sent Events) para streaming das respostas da IA — sem dependências extras
- Sem framework frontend — vanilla HTML/CSS/JS mantido por consistência com a base existente
- multer@2.1.1 via DiskStorage — foto de perfil armazenada em arquivo, não em base64 no banco

## Next Step

Execute Plan 05-03: ui.js + spinner/toast CSS + loading/error states no frontend.

---
*Last updated: 2026-05-23 after Phase 5 Plan 02 completion*


