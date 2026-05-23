# SUMMARY: Plano 1 — Instalar Dependências de Segurança

**Status:** ✅ Completo  
**Data:** 2026-05-22  
**Commit:** abcae0b

---

## O que foi feito

### Tarefa 1: Instalar pacotes npm de segurança
- Instalados 6 pacotes no `backend/package.json`:
  - `bcrypt@6.0.0` — hash de senhas (bindings C++)
  - `jsonwebtoken@9.0.3` — emissão e verificação de JWT
  - `helmet@8.2.0` — headers HTTP de segurança
  - `cors@2.8.6` — configuração de CORS
  - `express-rate-limit@8.5.2` — rate limiting
  - `express-validator@7.3.2` — validação de inputs
- 25 pacotes adicionados no total; 0 vulnerabilidades detectadas pelo `npm audit`

### Tarefa 2: Variáveis de ambiente
- `backend/.env` atualizado com: `JWT_SECRET`, `CORS_ORIGIN=http://localhost:3000`, `NODE_ENV=development`
- `.env` já coberto por `*.env` no `.gitignore` raiz — sem risco de commit de segredos

---

## Verificações Passadas

- [x] `npm install` concluiu sem erros (0 vulnerabilities)
- [x] Todos os 6 pacotes carregam via `require()` sem exceção
- [x] `JWT_SECRET`, `CORS_ORIGIN`, `NODE_ENV` presentes no `.env`
- [x] `.env` coberto pelo `.gitignore` (`*.env`)

---

## Decisões Tomadas

- `CORS_ORIGIN=http://localhost:3000` como valor de desenvolvimento (PLAN-03 lê esta variável)
- JWT_SECRET deixado como placeholder — deve ser substituído por `crypto.randomBytes(64).toString('hex')` antes de qualquer deploy

---

## Próximo Plano

**PLAN-02:** Implementar hash bcrypt nas senhas (cadastro + login + update + script de migração)
