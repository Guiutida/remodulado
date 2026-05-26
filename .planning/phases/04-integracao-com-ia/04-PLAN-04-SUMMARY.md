---
phase: 04-integracao-com-ia
plan: "04"
subsystem: api, ui
tags: [gemini, ia, trilhas, professor, nodejs, express, vanilla-js, iife]

# Dependency graph
requires:
  - phase: 04-integracao-com-ia
    provides: iaController.js existente com criarSessao/listarSessoes/getMensagens/orientar; routes/ia.js com rotas comentadas de trilha

provides:
  - POST /api/ia/gerar-trilha (professor only) — chama Gemini e retorna JSON estruturado de trilha
  - POST /api/ia/salvar-trilha (professor only) — persiste trilha + etapas no banco com IDOR
  - assets/js/trilhas-ia.js — IIFE para professor gerar, editar e publicar trilha via IA
  - Seção IA em pages/trilhas.html visível apenas para professores

affects: [04-PLAN-05, trilhas, professor-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Gemini generateContent (não streaming) para geração de JSON estruturado
    - Strip de markdown fence (```json ... ```) antes de JSON.parse
    - IDOR verificando turma pertence ao professor via turmas.professor_id
    - IIFE CommonJS-compatible sem arrow functions para compatibilidade máxima
    - escHtml() local no IIFE para sanitizar output da IA antes de innerHTML

key-files:
  created:
    - assets/js/trilhas-ia.js
  modified:
    - backend/controllers/iaController.js
    - backend/routes/ia.js
    - pages/trilhas.html

key-decisions:
  - "gerarTrilha usa generateContent (não streaming) pois professor precisa do JSON completo antes de renderizar o formulário editável"
  - "salvarTrilha faz INSERT sequencial das etapas em loop (await por etapa) para garantir ordem — não usa INSERT batch para simplicidade"
  - "escHtml() definida localmente no IIFE de trilhas-ia.js — não é global em aluno.js"
  - "Seção IA exibida por micro-script inline após trilhas-ia.js para evitar modificar trilhas.js"
  - "tipo das etapas IA fixo em 'texto' pois Gemini gera conteúdo textual"

patterns-established:
  - "Strip de markdown fence: replace /^```json\\s*/i + /^```\\s*/i + /```\\s*$/i antes de JSON.parse"
  - "Validação mínima da estrutura Gemini: titulo + disciplina + Array.isArray(etapas) com length > 0"
  - "IDOR em salvarTrilha: SELECT id FROM turmas WHERE id=? AND professor_id=? LIMIT 1"

requirements-completed: [IA-06, IA-07]

# Metrics
duration: 15min
completed: 2026-05-23
---

# Phase 04 Plan 04: Geração de Trilha por IA — Professor Solicita, Edita e Publica — Summary

**Endpoints POST /api/ia/gerar-trilha e /api/ia/salvar-trilha + IIFE trilhas-ia.js para professor gerar via Gemini, editar formulário e publicar trilha real no banco**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-23T05:00:00Z
- **Completed:** 2026-05-23T05:13:41Z
- **Tasks:** 4 (agrupados em 2 commits)
- **Files modified:** 4

## Accomplishments

- `gerarTrilha`: chama Gemini com prompt instrucional específico para nível (fundamental/médio), strip de fences markdown, JSON.parse com validação mínima de estrutura
- `salvarTrilha`: IDOR verificando turma pertence ao professor, INSERT trilhas + INSERT loop trilha_etapas com tipo fixo 'texto'
- `trilhas-ia.js` (IIFE): popularSelectTurmas no init, formulário de geração, renderizarPreview com escHtml em todos os campos da IA, publicarTrilha com coleta de etapas editadas
- Seção IA em `pages/trilhas.html` oculta por padrão, exibida via micro-script inline apenas para professores

## Task Commits

1. **Task 1+2: iaController.js gerarTrilha+salvarTrilha + routes desbloquear** — `6483113` (feat)
2. **Task 3+4: trilhas-ia.js + seção IA trilhas.html** — `17ca293` (feat)

## Files Created/Modified

- `backend/controllers/iaController.js` — Adicionadas funções gerarTrilha e salvarTrilha antes do module.exports; module.exports atualizado com ambas
- `backend/routes/ia.js` — Rotas POST /gerar-trilha e POST /salvar-trilha descomentadas (professor only)
- `assets/js/trilhas-ia.js` — Criado: IIFE com popularSelectTurmas, submit handler, renderizarPreview, publicarTrilha, escHtml local
- `pages/trilhas.html` — Seção `<section data-secao-professor-ia>` adicionada antes de `</main>`; script trilhas-ia.js + micro-script inline adicionados ao final do body

## Decisions Made

- `gerarTrilha` usa `generateContent` (não streaming) pois o professor precisa do JSON completo para renderizar o formulário editável — streaming seria inadequado aqui
- `salvarTrilha` insere etapas em loop sequencial (não batch) para simplicidade e garantia de ordem
- `escHtml()` definida localmente no IIFE — não é exposta como global em aluno.js
- Micro-script inline exibe a seção IA para professores em vez de modificar trilhas.js (escopo mínimo neste plano)

## Deviations from Plan

None — plano executado exatamente como especificado.

## Issues Encountered

- `pages/trilhas.html` estava em `pages/` (raiz do projeto), não em `assets/pages/` como indicado no `<files_to_read>`. Caminho correto encontrado via busca recursiva. Nenhum impacto funcional.

## Known Stubs

Nenhum — trilhas-ia.js conecta diretamente aos endpoints reais e popularSelectTurmas busca turmas reais via GET /api/turmas.

## Next Phase Readiness

- Endpoints de geração e salvamento de trilha prontos para uso real
- PLAN-05 pode usar iaController.js como base para adicionar resumoAluno / resumoTurma
- Rotas comentadas de PLAN-05 já existem em routes/ia.js aguardando descomentação

## Self-Check: PASSED

- `backend/controllers/iaController.js` — FOUND
- `backend/routes/ia.js` — FOUND
- `assets/js/trilhas-ia.js` — FOUND
- `pages/trilhas.html` — FOUND
- `.planning/phases/04-integracao-com-ia/04-PLAN-04-SUMMARY.md` — FOUND
- Commit `6483113` (iaController + routes) — FOUND
- Commit `17ca293` (trilhas-ia.js + trilhas.html) — FOUND

