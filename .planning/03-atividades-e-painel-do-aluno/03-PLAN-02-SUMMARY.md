---
phase: 03
plan: 02
subsystem: backend/atividades
tags: [api, atividades, idor, segurança, professor, aluno, mysql]
dependency_graph:
  requires: [03-PLAN-01]
  provides: [API /api/atividades, atividadesController, routes/atividades]
  affects: [backend/server.js]
tech_stack:
  added: []
  patterns: [IDOR-helpers, gabarito-never-exposed, ordem-server-side, perfil-guard-inline]
key_files:
  created:
    - backend/controllers/atividadesController.js
    - backend/routes/atividades.js
  modified:
    - backend/server.js
decisions:
  - gabarito excluído do SELECT para alunos em nível de SQL (não filtrado em JS)
  - ordem calculada via COALESCE(MAX(ordem),0)+1 — nunca aceita do body
  - getDetalhe serve professor e aluno com ramificação interna por req.usuario.perfil
  - verificarDonoAtividade e verificarAlunoNaAtividade são helpers privados (não exportados)
metrics:
  duration: ~15min
  completed: 2025-05-22
  tasks_completed: 3
  files_changed: 3
---

# Phase 3 Plan 02: API de Criação de Atividades (Professor) — Summary

## One-liner

API REST `/api/atividades` com IDOR completo, gabarito nunca exposto ao aluno via SQL, e ordem de questões calculada server-side via `COALESCE(MAX(ordem),0)+1`.

## O que foi construído

Três arquivos criados/modificados para habilitar criação e consulta de atividades e questões no DuoPratic:

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `backend/controllers/atividadesController.js` | criado | 4 funções: criarAtividade, adicionarQuestao, listarProfessor, getDetalhe |
| `backend/routes/atividades.js` | criado | Router Express com guards de perfil inline |
| `backend/server.js` | modificado | require + app.use para /api/atividades |

## Endpoints criados

| Método | Rota | Perfil | Proteção |
|--------|------|--------|----------|
| `POST` | `/api/atividades` | professor | autenticar + verificarProfessor + IDOR turma |
| `GET` | `/api/atividades` | professor | autenticar + verificarProfessor |
| `POST` | `/api/atividades/:id/questoes` | professor | autenticar + verificarProfessor + verificarDonoAtividade |
| `GET` | `/api/atividades/:id` | professor + aluno | autenticar + IDOR interno por perfil |

## Segurança implementada

- **`gabarito` nunca no SELECT quando perfil = aluno** — exclusão a nível de SQL, não filtragem em JS
- **`ordem` nunca lida do body** — sempre `COALESCE(MAX(ordem), 0) + 1`
- **`aluno_id` nunca do body** — sempre `req.usuario.id` (JWT)
- **IDOR em todas as rotas** — professor só acessa atividades das próprias turmas
- **IDOR aluno** — só acessa atividade se estiver matriculado na turma correspondente
- **`parseInt(req.params.id, 10)`** em toda leitura de parâmetro numérico
- **Gabarito não retornado** nem para professor no endpoint `adicionarQuestao`

## Commits

| Task | Hash | Mensagem |
|------|------|----------|
| 1 | `5a13c0d` | feat(03-02): atividadesController — createAtividade + addQuestao + getAtividade |
| 2 | `a8e8cc4` | feat(03-02): routes/atividades.js — Express router |
| 3 | `3264c71` | feat(03-02): server.js — mount /api/atividades |

## Deviations from Plan

Nenhuma — plano executado exatamente como especificado.

## Known Stubs

Nenhum stub. Todos os handlers estão completamente implementados com lógica real de banco de dados.

## Threat Flags

Nenhuma superfície nova além do especificado no plano. As rotas POST/GET `/api/atividades` e `/api/atividades/:id/questoes` e `/api/atividades/:id` já constavam no modelo de ameaça do PLAN-02 (ATIV-01 a ATIV-03, ATIV-06).

## Self-Check: PASSED

- [x] `backend/controllers/atividadesController.js` existe e passou em `node --check`
- [x] `backend/routes/atividades.js` existe e passou em `node --check`
- [x] `backend/server.js` modificado e passou em `node --check`
- [x] Commits `5a13c0d`, `a8e8cc4`, `3264c71` existem no histórico
