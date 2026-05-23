---
phase: "05-polimento-e-deploy"
plan: "03"
subsystem: "frontend-ux"
tags: [ui, spinner, toast, error-handling, loading-states]
dependency_graph:
  requires: ["05-01"]
  provides: ["ui.js globals", "spinner CSS", "toast variants CSS", "loading/error states em JS de produto"]
  affects: ["pages/aluno.html", "pages/professor.html", "pages/atividades.html", "pages/trilhas.html", "pages/turma.html", "pages/configuracoes.html", "pages/estudo.html", "assets/css/base.css", "assets/js/aluno.js", "assets/js/atividades.js", "assets/js/professor.js", "assets/js/painel.js", "assets/js/turma.js", "assets/js/trilhas.js", "assets/js/trilhas-ia.js"]
tech_stack:
  added: []
  patterns: ["IIFE module pattern para ui.js", "try/showLoading/finally/hideLoading em fetch calls", "showError/showSuccess para feedback amigável de API"]
key_files:
  created:
    - path: "assets/js/ui.js"
      description: "Módulo IIFE com showLoading, hideLoading, showError, showSuccess — sem conflito com mostrarAviso de aluno.js"
  modified:
    - path: "assets/css/base.css"
      description: "Adicionado: .carregando-global (spinner), .aviso-config.sucesso/.erro (toast variants), .erro-inline (dark mode)"
    - path: "pages/aluno.html"
      description: "Script tag ui.js inserido antes de aluno.js"
    - path: "pages/professor.html"
      description: "Script tag ui.js inserido antes de aluno.js"
    - path: "pages/atividades.html"
      description: "Script tag ui.js inserido antes de aluno.js"
    - path: "pages/trilhas.html"
      description: "Script tag ui.js inserido antes de aluno.js"
    - path: "pages/turma.html"
      description: "Script tag ui.js inserido antes de aluno.js"
    - path: "pages/configuracoes.html"
      description: "Script tag ui.js inserido antes de aluno.js"
    - path: "pages/estudo.html"
      description: "Script tag ui.js inserido antes de aluno.js"
    - path: "assets/js/aluno.js"
      description: "buscarPreferenciasBanco + buscarUsuarioBanco: showLoading/hideLoading + showError"
    - path: "assets/js/atividades.js"
      description: "10 funções: showLoading/hideLoading/showError; strings 'Carregando...' removidas"
    - path: "assets/js/professor.js"
      description: "4 funções: showLoading/hideLoading + showError; 'Carregando...' removido"
    - path: "assets/js/painel.js"
      description: "carregarPainel + carregarHistorico: showLoading/hideLoading + showError"
    - path: "assets/js/turma.js"
      description: "mostrarErro→showError; mostrarAviso sucesso→showSuccess; 'Carregando...' removido"
    - path: "assets/js/trilhas.js"
      description: "mostrarErro→showError; mostrarAviso sucesso→showSuccess; 'Carregando...' removido"
    - path: "assets/js/trilhas-ia.js"
      description: "catch blocks→showError amigável; sucesso→showSuccess; showLoading/hideLoading"
decisions:
  - "ui.js expõe apenas 4 globals (showLoading/hideLoading/showError/showSuccess) sem redeclarar mostrarAviso de aluno.js"
  - "IIFE com 'use strict' para evitar poluição do escopo global"
  - "mostrarErro() em turma.js e trilhas.js refatorada para delegar a showError() — sem duplicação"
  - "Spinner criado lazy (obterSpinner) — não exige markup na HTML"
  - "catch blocks nunca expõem erro.message técnico ao usuário (T-05-10 mitigado)"
metrics:
  duration: "~25 min"
  completed: "2026-05-23"
  tasks_completed: 2
  files_changed: 16
---

# Phase 5 Plan 03: UI Global — Spinner, Toasts e Estados de Loading Summary

**One-liner:** Módulo ui.js com spinner global lazy e toast coloridos wired em todos os fetches + CSS de variantes, eliminando telas em branco silenciosas.

## O Que Foi Feito

### Tarefa 1: ui.js + CSS + Script Tags nas 7 Páginas (commit: a5ac968)

**assets/js/ui.js** criado como módulo IIFE:
- `showLoading()` — cria `.carregando-global` lazily se não existir, adiciona `.ativo`
- `hideLoading()` — remove `.ativo` do spinner
- `showError(msg)` — toast vermelho com `.aviso-config.erro`
- `showSuccess(msg)` — toast verde com `.aviso-config.sucesso`
- **Zero conflito** com `mostrarAviso` de aluno.js — funções com nomes distintos

**assets/css/base.css** — Inseridos após `.aviso-config`:
- `.aviso-config.sucesso` (verde) e `.aviso-config.erro` (vermelho)
- `.erro-inline` com suporte dark mode (`.tema-escuro`)
- `.carregando-global` + `.ativo` + `.spinner-anel` + `@keyframes girar`

**7 páginas HTML** — `ui.js` inserido antes de `aluno.js` em todas:
`aluno.html`, `professor.html`, `atividades.html`, `trilhas.html`, `turma.html`, `configuracoes.html`, `estudo.html`

### Tarefa 2: Atualização dos 7 Arquivos JS (commit: cd96afe)

**aluno.js:**
- `buscarPreferenciasBanco` e `buscarUsuarioBanco`: `showLoading()/hideLoading()` em try/finally; catch → `showError()` amigável

**atividades.js:**
- 10 funções de fetch: `showLoading()/hideLoading()`
- Strings `"<p><em>Carregando...</em></p>"` removidas de `abrirEntregas`, `abrirResponder`, `verRespostas`
- Todos catch blocks: `mostrarAviso("Erro ... " + erro.message)` → `showError("msg amigável")`

**professor.js:**
- `carregarTurmas`, `carregarDesempenho`, `carregarAtividades`, `carregarProgressoTrilhas`: showLoading/hideLoading
- `"<p><em>Carregando progresso nas trilhas…</em></p>"` removido
- Todos catch → `showError()` amigável

**painel.js:**
- `carregarPainel` e `carregarHistorico`: showLoading/hideLoading + showError

**turma.js:**
- `mostrarErro(msg)`: `mostrarAviso(msg, "erro")` → `showError(msg)`
- `"<p>Carregando...</p>"` removido de `abrirModalMembros`
- `mostrarAviso(msg, "sucesso")` → `showSuccess(msg)` (turma criada, aluno removido, entrou na turma)
- Todas as funções assíncronas: showLoading/hideLoading em try/finally

**trilhas.js:**
- `mostrarErro(msg)`: `mostrarAviso(msg, "erro")` → `showError(msg)`
- `"<p>Carregando...</p>"` removido de `abrirModalEtapas` e `abrirModalTrilhaAluno`
- `mostrarAviso(msg, "sucesso")` → `showSuccess(msg)` (trilha criada, etapa adicionada)
- Todas as funções assíncronas: showLoading/hideLoading

**trilhas-ia.js:**
- `mostrarAviso('Erro ao gerar trilha: ...')` → `showError('Não foi possível gerar a trilha. Tente novamente.')`
- `mostrarAviso('Trilha publicada com sucesso!')` → `showSuccess('Trilha publicada com sucesso!')`
- `mostrarAviso('Erro ao publicar trilha: ...')` → `showError('Não foi possível publicar a trilha. Tente novamente.')`
- showLoading/hideLoading em `formGerarIA` e `publicarTrilha`

## Deviations from Plan

None — plano executado exatamente como especificado.

## Threat Flags

Nenhuma nova superfície de segurança introduzida — apenas melhorias de UX em código front-end existente.

**T-05-10 mitigado:** Nenhum `showError(erro.message)` com conteúdo técnico de API — todos os catch blocks usam mensagens amigáveis fixas.

**T-05-11 mitigado:** `hideLoading()` sempre em `finally {}` — spinner nunca fica preso em caso de erro.

## Known Stubs

Nenhum — todas as funções estão conectadas a endpoints de API reais.

## Self-Check

Verificações executadas pós-implementação:

- `assets/js/ui.js` existe: ✅
- ui.js contém `showLoading`: ✅
- ui.js NÃO contém declaração de `mostrarAviso`: ✅
- `base.css` contém `.carregando-global`: ✅
- `base.css` contém `.aviso-config.sucesso`: ✅
- 7 páginas HTML com script tag ui.js: ✅ (count = 7)
- showError ocorrências nos 7 JS: ✅ (23 ocorrências)
- innerHTML "Carregando..." restantes: ✅ (0 ocorrências)
- showSuccess em turma.js/trilhas.js: ✅
- showLoading em todos os 7 arquivos JS: ✅ (31 ocorrências)

## Self-Check: PASSED
