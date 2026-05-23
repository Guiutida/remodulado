# SUMMARY: Plano 2 — Hash de Senhas com bcrypt

**Status:** ✅ Completo  
**Data:** 2026-05-22  
**Commits:** 6eac2a4, d2dba5e

---

## O que foi feito

### Tarefa 1: Corrigir cadastro e login
- `backend/server.js`: adicionado `require('bcrypt')` e `SALT_ROUNDS = 12`
- `POST /api/cadastro`: senha hasheada com `bcrypt.hash(senha, 12)` antes do INSERT
- `POST /api/login`: query agora busca por `email + perfil` somente; hash comparado com `bcrypt.compare()` (timing-safe); campo `senha` removido da resposta via destructuring

### Tarefa 2: Corrigir PUT /api/usuarios/:id
- `PUT /api/usuarios/:id`: quando `senha` enviada no body, agora hasheia com `bcrypt.hash()` antes do UPDATE (era texto plano — bug silencioso que quebraria login após troca de senha)

### Tarefa 3: Script de migração
- Criado `backend/scripts/migrar-senhas.js`
- Migra todos os usuários com `LENGTH(senha) < 60` (heurística para texto plano)
- Script idempotente: segunda execução retorna "Nenhuma migração necessária"
- Nota: script requer conexão MySQL — rodar após o banco estar disponível

---

## Verificações Passadas

- [x] Código sintaticamente correto (commits sem erros)
- [x] `require('bcrypt')` e `SALT_ROUNDS` adicionados corretamente
- [x] INSERT no cadastro usa `hash` em vez de `senha`
- [x] SELECT no login não inclui `senha = ?` como filtro
- [x] `bcrypt.compare()` usado na verificação de senha
- [x] Campo `senha` removido da resposta do login
- [x] PUT `/api/usuarios/:id` hasheia nova senha antes do UPDATE
- [x] Script de migração criado com heurística `LENGTH(senha) < 60`

---

## Decisões Tomadas

- `SALT_ROUNDS = 12`: boa prática para hardware 2025 (~250ms/hash); valor mais alto que o PLAN original (10) por recomendação do researcher
- Mensagem de erro genérica no login: não diferencia "usuário inexistente" de "senha errada" (previne enumeração)
- Script de migração não tem guard `NODE_ENV` (FLAG-2 do plan-checker): risco mínimo em contexto de desenvolvimento

---

## Próximo Plano

**PLAN-03:** Criar middleware JWT, substituir CORS wildcard, adicionar helmet e rate limiting
