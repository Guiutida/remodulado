---
phase: 03-atividades-e-painel-do-aluno
plan: "03"
subsystem: api
tags: [nodejs, express, mysql2, respostas, streak, pontuacao, idor]

# Dependency graph
requires:
  - phase: 03-atividades-e-painel-do-aluno
    plan: "01"
    provides: tabelas questoes e respostas_questao criadas
  - phase: 03-atividades-e-painel-do-aluno
    plan: "02"
    provides: verificarAlunoNaAtividade helper, controller base e rota /api/atividades montada

provides:
  - POST /api/atividades/:id/respostas — submissão idempotente de respostas com feedback imediato MC
  - GET  /api/atividades/:id/respostas — consulta das próprias respostas do aluno (sem gabarito)
  - Streak e pontuação atualizados atomicamente a cada entrega
  - Response com pontuacao_ganha e streak_atual para o frontend

affects:
  - 04-correcao-ia (corrige dissertativas com correta=NULL pendentes)
  - painel-aluno (usa pontuacao_ganha e streak_atual da resposta)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - alunoId sempre de req.usuario.id — nunca do req.body
    - gabarito_correto enviado apenas para MC com correta===0 (nunca dissertativa)
    - ON DUPLICATE KEY UPDATE para idempotência em respostas e entregas
    - pontuacao/streak calculados e atualizados no servidor, nunca aceitos do body
    - GET /:id como última rota de parâmetro para evitar captura de sub-rotas

key-files:
  created: []
  modified:
    - backend/controllers/atividadesController.js
    - backend/routes/atividades.js

key-decisions:
  - "pontuacao_ganha e streak_atual incluídos no response (além do que o plan especificava) para o frontend ter feedback imediato sem segunda request"
  - "streak_atual buscado do banco após UPDATE para garantir valor real (caso houvesse race condition ou valor inicial NULL)"
  - "GET /:id mantido como última rota para não capturar /:id/respostas prematuramente"

patterns-established:
  - "IDOR por perfil: verificarAlunoNaAtividade antes de qualquer escrita de resposta"
  - "Gabarito: SELECT interno com gabarito para cálculo, mas campo nunca aparece em nenhum objeto de resposta ao aluno"
  - "Dissertativa: correta=NULL persistido, aguarda Phase 4 (IA) para correção"

requirements-completed: [ATIV-04, ATIV-05]

# Metrics
duration: 15min
completed: 2025-01-29
---

# Phase 03 Plan 03: API de Respostas e Feedback Imediato (Aluno) Summary

**Endpoints de submissão idempotente de respostas com feedback MC imediato, cálculo de pontuação/streak no servidor e proteção IDOR via verificarAlunoNaAtividade**

## Performance

- **Duration:** ~15 min
- **Started:** 2025-01-29T00:00:00Z
- **Completed:** 2025-01-29T00:15:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `responderAtividade`: valida IDOR, processa array de respostas, corrige MC no servidor (gabarito nunca exposto), persiste com ON DUPLICATE KEY UPDATE, registra entrega idempotente, atualiza streak/pontuação atomicamente
- `getRespostasAluno`: retorna respostas do aluno para uma atividade sem qualquer campo de gabarito, protegido por IDOR check
- Rotas do aluno (`POST/GET /:id/respostas`) inseridas na ordem correta entre `/:id/questoes` e `/:id` no router

## Task Commits

1. **Task 1: responderAtividade + getRespostasAluno** — `ec74cce` (feat)
2. **Task 2: routes POST/GET /:id/respostas** — `d861649` (feat)

## Files Created/Modified

- `backend/controllers/atividadesController.js` — adicionadas funções `responderAtividade` e `getRespostasAluno`; module.exports atualizado
- `backend/routes/atividades.js` — adicionadas rotas `POST /:id/respostas` e `GET /:id/respostas` com guard `verificarAluno`

## Decisions Made

- **`pontuacao_ganha` e `streak_atual` no response:** O plano retornava apenas `{ status, resultados }`. O `project_context` especificava um response com `pontuacao_ganha` e `streak_atual`. Incluídos ambos — `pontuacao_ganha` calculado localmente (`10 + 5*acertosMC`), `streak_atual` buscado do banco após UPDATE para garantir valor atualizado. Motivo: frontend precisa dessas informações para animações de gamificação sem fazer uma segunda request.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] `pontuacao_ganha` e `streak_atual` incluídos na resposta**
- **Found during:** Task 1 (implementação de responderAtividade)
- **Issue:** O código do plano retornava apenas `{ status: "ok", resultados }`, mas o `project_context` especificava um response com `pontuacao_ganha` e `streak_atual` — informações críticas para o frontend de gamificação
- **Fix:** Calculado `pontuacao_ganha = 10 + (5 * acertosMC)` localmente; `streak_atual` buscado com SELECT após o UPDATE
- **Files modified:** `backend/controllers/atividadesController.js`
- **Verification:** `node --check` passou; lógica alinhada com project_context
- **Committed in:** ec74cce (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 — funcionalidade crítica para UX de gamificação)
**Impact on plan:** Extensão mínima do response; sem scope creep; alinha com especificação do project_context.

## Issues Encountered

Nenhum. Ambos os arquivos existiam do PLAN-02 com estrutura compatível, permitindo modificação direta.

## Security Checklist Verificado

- [x] `alunoId` exclusivamente de `req.usuario.id` — nunca do `req.body`
- [x] Campo `gabarito` nunca aparece em nenhum objeto retornado ao aluno
- [x] `gabarito_correto` enviado apenas para MC com `correta === 0`
- [x] Dissertativas nunca recebem `gabarito_correto` na resposta
- [x] `questao_id` validado com `parseInt` e verificado contra `atividade_id` no SQL
- [x] Resposta sanitizada com `String(item.resposta).trim()`
- [x] Pontuação calculada no servidor — nunca aceita do body

## User Setup Required

Nenhum — sem serviços externos ou variáveis de ambiente novas.

## Next Phase Readiness

- Endpoints de resposta prontos para uso pelo frontend (painel do aluno)
- `respostas_questao` com `correta=NULL` para dissertativas aguardando Phase 4 (correção IA)
- `entregas` registradas com status `entregue` para relatórios do professor
- Streak e pontuação no banco atualizados a cada entrega, prontos para exibição no painel

---
*Phase: 03-atividades-e-painel-do-aluno*
*Completed: 2025-01-29*
