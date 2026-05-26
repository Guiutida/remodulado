---
phase: "03"
plan: "04"
subsystem: "api-alunos-painel"
tags: [alunos, painel, historico, atividades, desempenho, entregas, mysql]
dependency_graph:
  requires: [03-PLAN-01, 03-PLAN-02, 03-PLAN-03]
  provides: [GET /api/alunos/painel, GET /api/alunos/historico, GET /api/alunos/atividades, GET /api/atividades/:id/entregas, GET /api/turmas/:id/desempenho]
  affects: [frontend-painel-aluno, frontend-desempenho-professor]
tech_stack:
  added: []
  patterns: [SUM(IF(...)) MySQL 8.0, NULLIF division-by-zero guard, IDOR via verificarDonoAtividade, IDOR via professor_id check]
key_files:
  created: []
  modified:
    - backend/controllers/alunosController.js
    - backend/controllers/atividadesController.js
    - backend/routes/alunos.js
    - backend/routes/atividades.js
    - backend/routes/turmas.js
decisions:
  - "SUM(IF(...)) em vez de COUNT(...) FILTER: compatibilidade MySQL 8.0 (sem suporte a FILTER)"
  - "getDesempenhoTurma implementado em atividadesController (acesso ao banco e verificarDonoAtividade já disponíveis), montado em routes/turmas.js"
  - "getEntregas usa COALESCE(e.status, 'pendente') para mostrar alunos sem entrega"
  - "gabarito nunca incluído em getEntregas — apenas contagens de correta/erros"
metrics:
  duration: "~12 min"
  completed: "2025-07-13"
  tasks_completed: 4
  files_modified: 5
---

# Phase 3 Plan 04: API de Painéis com Dados Reais — Summary

## One-liner

Substituição de endpoints hardcoded por queries reais: painel do aluno com trilhas/gamificação, histórico de entregas, atividades da turma, lista de entregas por atividade (professor) e desempenho da turma — todos com IDOR e padrões MySQL 8.0.

## Tasks Completed

| # | Task | Commit | Arquivos |
|---|------|--------|---------|
| 1 | Reescrever `alunosController.js` | `3bd00b3` | `backend/controllers/alunosController.js` |
| 2 | Reescrever `routes/alunos.js` | `1445b74` | `backend/routes/alunos.js` |
| 3 | Adicionar `getEntregas` + `getDesempenhoTurma` em `atividadesController.js` | `2dd900c` | `backend/controllers/atividadesController.js` |
| 4 | Adicionar rotas `/entregas` e `/desempenho` | `069f3a5` | `backend/routes/atividades.js`, `backend/routes/turmas.js` |

## What Was Built

### Endpoints do Aluno (`/api/alunos`)

- **`GET /api/alunos/painel`** — Retorna `{ usuario: { nome, pontuacao, streak_atual }, trilhas: [...], atividades_pendentes: [...] }`. Trilhas com `progresso_pct` calculado via `SUM(IF(pe.concluido=1,1,0)) * 100 / NULLIF(COUNT(te.id),0)`. Atividades pendentes via `NOT EXISTS (SELECT 1 FROM entregas ...)`. Retorna arrays vazios se aluno não está em turma.
- **`GET /api/alunos/historico`** — Últimas 20 entregas com `atividade_titulo`, `status`, `nota`, `total_questoes`, `total_acertos`.
- **`GET /api/alunos/atividades`** — Todas as atividades da turma com `status_entrega` (null = pendente), `questoes_respondidas`, `total_acertos`.

### Endpoints do Professor

- **`GET /api/atividades/:id/entregas`** — Lista todos os alunos da turma com `acertos`, `erros`, `dissertativas_pendentes`, `status` (COALESCE para 'pendente'). IDOR via `verificarDonoAtividade`.
- **`GET /api/turmas/:id/desempenho`** — Desempenho por aluno: `total_entregues`, `media_acerto_pct`, `streak_atual`, `pontuacao`. IDOR via `WHERE professor_id = req.usuario.id`.

### Removido

- `getProgressoFuncoes` — hardcoded para título 'Funcoes do 1 grau' com progresso fixo 72/85
- `salvarProgressoFuncoes` — hardcoded para mesma atividade
- Rotas `GET /:id/progresso/funcoes` e `POST /:id/progresso/funcoes`
- Guard `verificarProprioAluno` (não mais necessário)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Duplicate `module.exports` em `atividadesController.js`**
- **Found during:** Task 3
- **Issue:** A estratégia de edição inseriu as novas funções após o `module.exports` antigo sem removê-lo, gerando dois `module.exports` no mesmo arquivo (o segundo sobrescreve o primeiro em Node.js — as funções novas seriam exportadas mas as antigas estariam duplicadas no código).
- **Fix:** Removido o `module.exports` antigo (linha 396), mantendo apenas o novo exportador completo no final do arquivo.
- **Files modified:** `backend/controllers/atividadesController.js`
- **Commit:** `2dd900c` (incluído na mesma task)

## Known Stubs

Nenhum. Todos os endpoints retornam dados reais do banco de dados.

## Security Checklist

- ✅ IDOR em `getEntregas`: `verificarDonoAtividade(atividadeId, req.usuario.id)` antes de qualquer query de dados
- ✅ IDOR em `getDesempenhoTurma`: `WHERE id = ? AND professor_id = ?` antes de qualquer query
- ✅ `turmaId` e `atividadeId` sempre parseados com `parseInt(req.params.id, 10)`
- ✅ Nenhum dado de outros professores exposto: todas as queries filtram por `professor_id`
- ✅ `gabarito` não aparece em `getEntregas` — apenas contagens de `correta`
- ✅ `pontuacao` e `streak_atual` nunca aceitos do body — sempre lidos do banco

## Threat Flags

Nenhum. Todos os novos endpoints usam `autenticar` + guard de perfil + verificação IDOR explícita.

## Self-Check: PASSED

Arquivos criados/modificados:
- FOUND: `backend/controllers/alunosController.js` ✅
- FOUND: `backend/controllers/atividadesController.js` ✅
- FOUND: `backend/routes/alunos.js` ✅
- FOUND: `backend/routes/atividades.js` ✅
- FOUND: `backend/routes/turmas.js` ✅

Commits:
- FOUND: `3bd00b3` feat(03-04): alunosController ✅
- FOUND: `1445b74` feat(03-04): routes/alunos ✅
- FOUND: `2dd900c` feat(03-04): turmasController + routes ✅
- FOUND: `069f3a5` feat(03-04): routes entregas/desempenho ✅

Verificação de sintaxe (`node --check`): todos os 5 arquivos passaram ✅
