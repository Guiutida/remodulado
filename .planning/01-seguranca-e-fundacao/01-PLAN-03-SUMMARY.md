# SUMMARY: Plano 3 — Autenticação JWT + CORS + Helmet

**Status:** ✅ Completo  
**Data:** 2026-05-22  
**Commit:** 9b62f6a

---

## O que foi feito

### Tarefa 1: Criado backend/middleware/auth.js
- Função `autenticar(req, res, next)` exportada como `{ autenticar }`
- Verifica header `Authorization: Bearer <token>`
- Em caso de token válido: popula `req.usuario = { id, perfil, iat, exp }` e chama `next()`
- Em caso de token inválido/expirado: retorna HTTP 401 com `{ status: "erro", message: "Token inválido ou expirado." }`

### Tarefa 2: JWT emitido no login
- `POST /api/login` agora retorna `{ status: "ok", token: "eyJ...", usuario: {...} }`
- Payload JWT: `{ id, perfil }` — mínimo necessário, sem dados pessoais
- Expiração: `7d` — adequado para app educacional

### Tarefa 3: CORS + Helmet + Rate Limiting
- Removido middleware CORS manual com wildcard `*` e `Authorization` ausente
- Adicionado pacote `cors` com `origin: CORS_ORIGIN`, `allowedHeaders: ["Content-Type", "Authorization"]`
- Adicionado `helmet()` — aplica ~12 headers HTTP de segurança
- Adicionado `express-rate-limit`: 20 tentativas/15min nos endpoints `/api/login` e `/api/cadastro`

---

## Verificações Passadas

- [x] `autenticar` exportado como função (`typeof autenticar === 'function'`)
- [x] `node --check backend/server.js` sem erros de sintaxe
- [x] Token JWT emitido no login com payload `{ id, perfil }`
- [x] CORS manual wildcard removido; substituído pelo pacote cors com Authorization na allowlist
- [x] `helmet()` aplicado antes de `cors()`
- [x] Rate limiter aplicado em `/api/cadastro` e `/api/login`

---

## Decisões Tomadas

- **`expiresIn: "7d"`**: adequado para app educacional sem dados críticos
- **Payload `{ id, perfil }`**: mínimo necessário; nome/email podem mudar após emissão
- **Helmet antes de CORS**: convenção; não afeta funcionalidade
- **Rate limit 20/15min**: por IP; suficiente para uso normal, proteção contra brute-force

---

## Próximo Plano

**PLAN-04:** Aplicar middleware `autenticar` em todas as rotas protegidas + corrigir IDOR + remover seed data de produção
