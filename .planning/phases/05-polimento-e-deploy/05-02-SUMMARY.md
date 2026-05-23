---
phase: 05-polimento-e-deploy
plan: "02"
subsystem: backend-hardening
tags: [server, env-validation, error-handling, helmet, uploads, 404]
dependency_graph:
  requires: []
  provides: [env-validation, server-hardening, multer-error-handling]
  affects: [backend/server.js, backend/config/env.js, backend/middleware/errorHandler.js]
tech_stack:
  added: []
  patterns:
    - validarEnv() na startup — fail-fast com process.exit(1) se vars ausentes
    - process.on('unhandledRejection') + process.on('uncaughtException') — crash controlado
    - helmet CSP com img-src para same-origin uploads
    - handler404 com req.accepts('json') para resposta adequada por tipo de cliente
    - multer.MulterError instanceof check para 413/400 no errorHandler
key_files:
  created:
    - backend/config/env.js
  modified:
    - backend/server.js
    - backend/middleware/errorHandler.js
decisions:
  - "DB_PASSWORD (não DB_PASS) confirmado como nome correto da var no .env local — incluído no array OBRIGATORIAS"
  - "handler404 usa req.accepts('json') para diferenciar cliente API (JSON) de browser (HTML)"
  - "pastaUploads criada via mkdirSync recursive na startup para evitar erro em ambiente limpo"
metrics:
  duration: "~15min"
  completed: "2026-05-23"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
---

# Phase 5 Plan 02: Hardening do Servidor — Env Validation, 404 Handler e MulterError Summary

**One-liner:** Validação fail-fast de 6 env vars obrigatórias na startup + unhandledRejection/uncaughtException handlers + helmet CSP para uploads + 404 JSON handler + MulterError 413/400 no errorHandler.

## O que foi feito

### Tarefa 1 — config/env.js + server.js hardening (commit `2b51116`)

**Novo arquivo `backend/config/env.js`:**
- Módulo CommonJS com `'use strict'`
- Array `OBRIGATORIAS = ['JWT_SECRET', 'GEMINI_API_KEY', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']`
- `validarEnv()` filtra vars ausentes, loga cada uma com `console.error`, encerra com `process.exit(1)` se houver ausentes

**Edits cirúrgicos em `backend/server.js`:**
1. Adicionado `require('./config/env').validarEnv()` na 2ª linha efetiva (imediatamente após `dotenv.config`)
2. `process.on('unhandledRejection', ...)` e `process.on('uncaughtException', ...)` com log + `process.exit(1)`
3. `app.use(helmet())` → `app.use(helmet({ contentSecurityPolicy: { directives: { ...defaults, 'img-src': ["'self'", 'data:'] } } }))` para permitir imagens de /uploads
4. `app.use('/uploads', express.static(pastaUploads))` com `mkdirSync` recursive após `express.static(pastaPublica)` e antes das rotas
5. `app.use(function handler404(req, res) {...})` com `req.accepts('json')` adicionado ANTES de `app.use(errorHandler)`

### Tarefa 2 — errorHandler.js com MulterError (commit `48f6771`)

**Atualizado `backend/middleware/errorHandler.js`:**
- `const multer = require('multer')` adicionado no topo
- Check `instanceof multer.MulterError` antes de `ER_DUP_ENTRY`:
  - `LIMIT_FILE_SIZE` → HTTP 413 com "Arquivo muito grande. O limite é 5 MB."
  - Outros MulterError → HTTP 400 com `erro.message`
- Check de `erro.message.includes('Tipo de arquivo não permitido')` → HTTP 400
- Lógica existente (ER_DUP_ENTRY 409, genérico 500, NODE_ENV production sem stack trace) **mantida intacta**

## Verificações executadas

```
✅ node -e "require('./backend/config/env')" → carrega sem erro
✅ server.js contém: validarEnv, handler404, img-src, /uploads, unhandledRejection, uncaughtException
✅ node -e "require('./backend/middleware/errorHandler')" → carrega sem erro
✅ errorHandler.js contém: MulterError, LIMIT_FILE_SIZE, 413
✅ node -e "process.env.JWT_SECRET = ''; require('./backend/config/env').validarEnv();" → exit code 1, lista JWT_SECRET + outras 5 vars ausentes no stderr
```

## Deviations from Plan

None — plano executado exatamente como especificado.

## Known Stubs

None — nenhum placeholder ou dado fictício introduzido.

## Threat Flags

Nenhum novo threat surface introduzido. As mitigações T-05-05 a T-05-09 foram implementadas conforme o threat model do plano:

| Threat ID | Status | Arquivo |
|-----------|--------|---------|
| T-05-05 | ✅ Mitigado | errorHandler.js — `NODE_ENV !== 'production'` mantido |
| T-05-06 | ✅ Mitigado | server.js — `process.on('unhandledRejection')` registrado |
| T-05-07 | ✅ Mitigado | server.js — handler404 retorna JSON sem expor internals |
| T-05-08 | ✅ Mitigado | config/env.js — `validarEnv()` encerra antes de qualquer request |
| T-05-09 | ✅ Mitigado | server.js — helmet CSP img-src: `['self', 'data:']` |

## Self-Check: PASSED

- `backend/config/env.js` → FOUND
- `backend/server.js` → FOUND (modificado)
- `backend/middleware/errorHandler.js` → FOUND (modificado)
- commit `2b51116` → FOUND
- commit `48f6771` → FOUND
