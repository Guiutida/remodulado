---
phase: "04"
plan: "03"
subsystem: frontend-ia
tags: [sse, streaming, vanilla-js, iife, chat-ui]
dependency_graph:
  requires: [04-PLAN-02]
  provides: [ia-estudo-frontend]
  affects: [pages/ia-estudo.html, assets/js/ia-estudo.js]
tech_stack:
  added: []
  patterns: [IIFE, ReadableStream SSE, data-attribute UI binding]
key_files:
  created:
    - assets/js/ia-estudo.js
  modified:
    - pages/ia-estudo.html
decisions:
  - "Usar fetch + ReadableStream em vez de EventSource para suportar Authorization header no SSE"
  - "Renderização incremental via textContent (sem innerHTML) para segurança contra XSS na resposta da IA"
  - "Criar sessão automaticamente ao carregar se aluno não tiver nenhuma"
metrics:
  duration: "~10min"
  completed: "2025-01-31"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 04 Plan 03: Frontend Tutor IA — SSE Streaming em ia-estudo.html

## Resumo em uma linha

Cliente SSE via ReadableStream com IIFE, gerenciamento de sessões e rendering incremental de tokens no chat tutor IA.

## O que foi construído

### Task 1 — `assets/js/ia-estudo.js` (criado)
Módulo IIFE completo para a página de Tutor IA:

- **Inicialização**: `GET /api/ia/sessoes` ao carregar; se vazia cria sessão automática via `POST /api/ia/sessoes`
- **Histórico de sessões**: `renderizarListaSessoes()` renderiza até 5 sessões com click handler para troca de contexto
- **Carga de histórico**: `exibirUltimaMensagem()` exibe última resposta do `role: 'model'` ao reabrir sessão
- **Envio + SSE**: `enviarMensagem()` usa `fetch` + `ReadableStream` para consumir `text/event-stream` do `/api/ia/orientar`
- **Rendering incremental**: tokens acumulados em string, `textContent` atualizado a cada chunk — sem innerHTML
- **Atalhos**: 4 botões `[data-atalho-ia]` preenchem textarea com prompt padronizado
- **Teclado**: Ctrl+Enter / Cmd+Enter disparam envio
- **XSS prevention**: `escHtml()` aplicado nos títulos de sessão renderizados no histórico
- **Sem redeclarações**: usa `usuarioLogado()`, `tokenAtual()`, `mostrarAviso()` de `aluno.js` sem redeclarar

### Task 2 — `pages/ia-estudo.html` (3 edições)

| # | Alteração | Resultado |
|---|-----------|-----------|
| 1 | Subtítulo `Resposta simulada` → `Tutor IA` + `[data-indicador-digitando]` | Label mais preciso + indicador de streaming |
| 2 | Histórico hardcoded removido | Container limpo para renderização dinâmica |
| 3 | `<script src="../assets/js/ia-estudo.js">` adicionado | Script carregado após `aluno.js` |

## Verificações realizadas

- [x] `node --check assets/js/ia-estudo.js` → SYNTAX OK
- [x] IIFE pattern correto: `(function(){ 'use strict'; })();`
- [x] Globals `usuarioLogado()`, `tokenAtual()`, `mostrarAviso()` usados sem redeclarar
- [x] `mostrarAviso()` chamado apenas com 1 argumento string
- [x] Order de scripts no HTML: `auth-guard.js` → `aluno.js` → `ia-estudo.js`
- [x] `data-indicador-digitando hidden` adicionado ao HTML
- [x] Histórico estático substituído por container dinâmico

## Desvios do Plano

Nenhum — plano executado exatamente como especificado.

## Stubs conhecidos

Nenhum — toda renderização busca dados reais da API. O texto `"Escreva uma dúvida..."` em `[data-resposta-ia]` é placeholder de UX visível antes da primeira interação, substituído dinamicamente pela IA.

## Commits

| Hash | Mensagem |
|------|----------|
| `15f2648` | feat(04-03): assets/js/ia-estudo.js — SSE streaming + histórico de sessões |
| `efb8452` | feat(04-03): ia-estudo.html — indicador de digitação, histórico dinâmico, script ia-estudo.js |

## Self-Check: PASSED

- [x] `assets/js/ia-estudo.js` existe e passa em `node --check`
- [x] `pages/ia-estudo.html` contém `data-indicador-digitando`, histórico dinâmico e script ia-estudo.js
- [x] Commits `15f2648` e `efb8452` presentes no histórico git
