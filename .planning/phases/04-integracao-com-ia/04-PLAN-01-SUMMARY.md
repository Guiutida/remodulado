---
phase: "04"
plan: "01"
subsystem: "ia-infrastructure"
tags: ["gemini", "rate-limit", "migration", "mysql", "express"]
dependency_graph:
  requires: []
  provides: ["gemini-client", "ia-rate-limiter", "sessoes_ia-table", "mensagens_ia-table"]
  affects: ["backend/services", "backend/middleware", "database"]
tech_stack:
  added: ["@google/genai@2.6.0"]
  patterns: ["singleton-service", "per-user-rate-limiting", "idempotent-migration"]
key_files:
  created:
    - backend/services/ia.js
    - backend/middleware/rateLimit.js
    - backend/scripts/migration-04.js
    - database/migration-04-ia.sql
    - backend/.env.example
  modified:
    - backend/package.json
    - backend/package-lock.json
decisions:
  - "Usar GoogleGenAI singleton em services/ia.js para evitar múltiplas instâncias do cliente"
  - "Rate limit por req.usuario.id (não por IP) para rastrear por usuário autenticado"
  - "GEMINI_API_KEY não commitada (.env no .gitignore) — apenas .env.example atualizado"
metrics:
  duration: "~5 min"
  completed: "2025-07-14"
  tasks_completed: 4
  files_created: 5
  files_modified: 2
---

# Phase 04 Plan 01: Infraestrutura de IA — Gemini SDK, Rate Limiter, Migration

## One-liner

Gemini SDK v2 encapsulado em singleton service, rate limiter por usuário autenticado (8 req/min) e tabelas `sessoes_ia`/`mensagens_ia` criadas no banco via migration idempotente.

## What Was Built

### `backend/services/ia.js`
Instância única do cliente `GoogleGenAI` configurada com `process.env.GEMINI_API_KEY`. Exporta `{ ai, MODELO }` — todos os controllers de IA importam daqui, garantindo uma única leitura da chave no processo.

### `backend/middleware/rateLimit.js`
Rate limiter para endpoints de IA usando `express-rate-limit@8.5.2` (já instalado). Chave de rastreamento por `req.usuario.id` — requer middleware `autenticar` antes. Limites: 8 req/min, janela de 60 s, headers RFC 6585, resposta 429 em pt-BR.

### `database/migration-04-ia.sql` + `backend/scripts/migration-04.js`
SQL + script de migration seguindo o padrão de `migration-03.js`. Cria tabelas:
- `sessoes_ia (id, aluno_id, titulo, criado_em)` — FK → `usuarios(id)` CASCADE
- `mensagens_ia (id, sessao_id, role ENUM, conteudo TEXT, criado_em)` — FK → `sessoes_ia(id)` CASCADE

Migration executada com sucesso; idempotência confirmada (2ª execução = sem erros).

## Commits

| Task | Commit  | Descrição |
|------|---------|-----------|
| 1    | ab76a8b | feat(04-01): instalar @google/genai@2.6.0 e criar services/ia.js |
| 2    | 0fb81b0 | feat(04-01): middleware/rateLimit.js — 8 req/min por usuario autenticado |
| 3    | 448efd0 | feat(04-01): migration-04 — tabelas sessoes_ia e mensagens_ia |

## Verification Results

| Check | Resultado |
|-------|-----------|
| `node --check services/ia.js` | ✅ SYNTAX OK |
| `node --check middleware/rateLimit.js` | ✅ SYNTAX OK |
| `node --check scripts/migration-04.js` | ✅ SYNTAX OK |
| `require('@google/genai')` | ✅ SDK carrega |
| `services/ia.js` exports | ✅ `{ ai: object, MODELO: 'gemini-2.0-flash' }` |
| `middleware/rateLimit.js` exports | ✅ `{ iaRateLimit: function }` |
| Migration 1ª execução | ✅ exit 0 |
| Migration 2ª execução (idempotência) | ✅ exit 0 |

## Deviations from Plan

### Auto-adições (Rule 2 — funcionalidade crítica ausente)

**1. [Rule 2 - Missing Config] GEMINI_API_KEY adicionada ao .env.example**
- **Found during:** Task 1
- **Issue:** `.env.example` não documentava `GEMINI_API_KEY` apesar do plano afirmar que "deve existir em .env". O `.env` real não tinha a variável.
- **Fix:** Adicionado `GEMINI_API_KEY=insira_sua_chave_da_api_google_aqui` ao `.env.example` e valor placeholder no `.env` local (não commitado).
- **Files modified:** `backend/.env.example`
- **Commit:** ab76a8b

## Known Stubs

| Arquivo | Detalhe |
|---------|---------|
| `backend/.env` | `GEMINI_API_KEY=insira_sua_chave_aqui` — placeholder; substituir pela chave real do Google AI Studio antes de usar endpoints de IA |

## Threat Flags

Nenhum novo endpoint de rede introduzido neste plano. As tabelas criadas ficam atrás da camada de auth existente (plans futuros montarão as rotas com `autenticar + iaRateLimit`).

## Self-Check: PASSED

- ✅ `backend/services/ia.js` existe
- ✅ `backend/middleware/rateLimit.js` existe
- ✅ `backend/scripts/migration-04.js` existe
- ✅ `database/migration-04-ia.sql` existe
- ✅ commit ab76a8b existe
- ✅ commit 0fb81b0 existe
- ✅ commit 448efd0 existe
