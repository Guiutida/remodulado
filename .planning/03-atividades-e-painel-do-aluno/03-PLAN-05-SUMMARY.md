---
phase: "03"
plan: "05"
subsystem: frontend
tags: [frontend, vanilla-js, atividades, painel-aluno, professor, dual-view, iife]
dependency_graph:
  requires: [03-PLAN-02, 03-PLAN-03, 03-PLAN-04]
  provides: [painel-aluno-dinamico, dual-view-atividades, desempenho-professor]
  affects: [aluno.html, atividades.html, professor.html, aluno.js]
tech_stack:
  added: [painel.js, professor.js, atividades.js]
  patterns: [IIFE, dual-view-perfil, data-attributes-binding, inline-feedback]
key_files:
  created:
    - assets/js/painel.js
    - assets/js/professor.js
    - assets/js/atividades.js
  modified:
    - assets/js/aluno.js
    - pages/aluno.html
    - pages/professor.html
    - pages/atividades.html
decisions:
  - "Globals de aluno.js (usuarioLogado/tokenAtual/mostrarAviso) nunca redeclarados — IIFE confia no escopo global já estabelecido"
  - "data-perfil-guard='' em atividades.html permite acesso tanto para aluno quanto professor"
  - "Dual-view via display:none — JS decide qual seção mostrar baseado em usuarioLogado().perfil"
  - "Gabarito exibido somente em r.correta===0 (resposta errada) — nunca em inputs ou revisão aluno"
metrics:
  duration: "~25 minutos"
  completed: "2025-07-15"
  tasks_completed: 7
  files_changed: 7
---

# Phase 3 Plan 05: Frontend — Todas as Páginas — Summary

## One-liner
Substituição completa de hardcode por dados dinâmicos: painel aluno com gamificação real, dual-view de atividades (professor cria/gerencia, aluno responde com feedback inline), e desempenho da turma no painel professor — tudo via IIFE vanilla JS.

## O que foi construído

### Task 1 — Limpeza de `aluno.js`
Removidas cirurgicamente 3 funções hardcoded e a variável associada:
- `let funcoesConcluida = false`
- `function aplicarProgressoFuncoes()` (60 linhas de DOM hardcoded)
- `async function buscarProgressoFuncoesBanco()` (endpoint `/progresso/funcoes` que não existe mais)
- `async function marcarFuncoesConcluidaBanco()`
- Chamada `buscarProgressoFuncoesBanco()` no load
- **[Rule 1 - Bug auto-fix]** Chamada órfã de `marcarFuncoesConcluidaBanco()` em `etapaEstudo === 3` (linha 601) — removida para evitar `ReferenceError` em tempo de execução

### Task 2 — `pages/aluno.html`
- Saudação dinâmica: `<span data-saudacao-nome>`
- Cartão destaque com `data-proxima-atividade-titulo/desc` e barra `data-barra-progresso`
- Indicadores: `data-indicador-progresso`, `data-indicador-streak`, `data-indicador-pendentes` (antes era "72%", "5 dias", "3 itens" hardcoded)
- Seção "Hoje" como `id="lista-hoje"` dinâmico
- Etapas da trilha como `id="etapas-trilha-painel"` dinâmico
- Nova seção `#secao-historico` com `#lista-historico`
- Script `painel.js` adicionado após `aluno.js`

### Task 3 — `pages/professor.html`
- Adicionado `article#desempenho` com `[data-desempenho-turma-nome]` e `#desempenho-container`
- Adicionado `article#atividades-recentes` com `.professor-lista` (necessário para `carregarAtividades()`)
- Script `professor.js` adicionado após `aluno.js`

### Task 4 — `pages/atividades.html` (dual-view)
- Reescrita completa: `data-perfil-guard=""` (antes era `"aluno"`, bloqueando professores)
- `#view-professor`: form criar atividade, seção adicionar questões MC/dissertativa, lista de atividades com botão "Ver entregas", painel de entregas expandível
- `#view-aluno`: cartão próxima entrega, indicadores dinâmicos, lista com filtros Todas/Pendentes/Entregues, form de resposta inline + área de feedback
- Ordem scripts: `auth-guard.js → aluno.js → atividades.js`

### Task 5 — `assets/js/painel.js` (novo)
IIFE para `aluno.html`:
- `GET /api/alunos/painel` → saudação, indicadores, barra de progresso, seção "Hoje", etapas da trilha
- `GET /api/alunos/historico` → `#lista-historico`

### Task 6 — `assets/js/professor.js` (novo)
IIFE para `professor.html`:
- `GET /api/turmas` → detecta primeira turma automaticamente
- `GET /api/turmas/:id/desempenho` → tabela com aluno/entregas/média acerto/streak/pontuação
- `GET /api/atividades` → lista recente em `.professor-lista` (max 5)

### Task 7 — `assets/js/atividades.js` (novo)
IIFE dual-view para `atividades.html`:
- **Professor**: `POST /api/atividades`, `POST /api/atividades/:id/questoes`, `GET /api/atividades`, `GET /api/atividades/:id/entregas`
- **Aluno**: `GET /api/alunos/atividades`, `GET /api/atividades/:id`, `POST /api/atividades/:id/respostas`, `GET /api/atividades/:id/respostas`
- Feedback imediato: ✅ acerto, ❌ erro + gabarito, 📝 dissertativa aguardando correção
- Gabarito nunca exposto na view aluno exceto como feedback pós-envio em resposta errada

## Commits

| Task | Hash      | Descrição |
|------|-----------|-----------|
| 1    | `3e1b1e0` | feat(03-05): aluno.js — remove funcoes hardcoded de funcoes |
| 2    | `aed0d9a` | feat(03-05): aluno.html — painel real + historico de atividades |
| 3    | `8918b34` | feat(03-05): professor.html — secao desempenho turma |
| 4    | `e8b5cdd` | feat(03-05): atividades.html — dual-view professor/aluno |
| 5    | `455f89d` | feat(03-05): painel.js — dashboard aluno com dados reais |
| 6    | `56dac74` | feat(03-05): professor.js — painel professor com desempenho turma |
| 7    | `d00d8de` | feat(03-05): atividades.js — dual-view IIFE professor+aluno |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Chamada órfã de `marcarFuncoesConcluidaBanco()` em `aluno.js`**
- **Found during:** Task 1
- **Issue:** A remoção das funções hardcoded deixou uma chamada `marcarFuncoesConcluidaBanco().catch(...)` em `etapaEstudo === 3` (linha 601 do arquivo original). Sem a função declarada, isso causaria `ReferenceError` em runtime no `estudo.html`.
- **Fix:** Removida a linha da chamada. A transição para `etapaEstudo === 3` agora simplesmente avança o texto da etapa sem tentar persistir progresso num endpoint descontinuado.
- **Files modified:** `assets/js/aluno.js`
- **Commit:** `3e1b1e0`

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: xss-via-innerhtml | assets/js/atividades.js | `innerHTML` usa `a.titulo`, `q.enunciado`, `e.nome` vindos do servidor — não de input direto do usuário. Aceitável para MVP; sanitizar com DOMPurify em produção. |
| threat_flag: xss-via-innerhtml | assets/js/painel.js | `innerHTML` usa `a.titulo`, `h.titulo` vindos do servidor. Mesmo contexto. |
| threat_flag: xss-via-innerhtml | assets/js/professor.js | `innerHTML` usa `a.titulo`, `a.nome` vindos do servidor. Mesmo contexto. |

> Nota: Gabarito correto é exibido apenas em `r.correta === 0` (feedback de erro). Nunca aparece na view de carregamento de questões.

## Known Stubs

Nenhum — todas as seções dinâmicas buscam dados reais da API. Os textos "Carregando..." são estados de loading que são substituídos após as respostas da API.

## Self-Check

- [x] `assets/js/painel.js` — criado e verificado
- [x] `assets/js/professor.js` — criado e verificado  
- [x] `assets/js/atividades.js` — criado e verificado
- [x] Todos os 7 commits existem no log do git
- [x] Nenhum global redeclarado nos novos arquivos JS
- [x] Todos os 3 novos arquivos JS abertos com `(function () {`
- [x] `data-perfil-guard=""` em `atividades.html`
- [x] `funcoesConcluida`, `buscarProgressoFuncoesBanco`, `marcarFuncoesConcluidaBanco`, `aplicarProgressoFuncoes` — nenhuma ocorrência em `aluno.js`

## Self-Check: PASSED
