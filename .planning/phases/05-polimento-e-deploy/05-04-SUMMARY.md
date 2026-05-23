# Plan 05-04 Summary — Deploy Railway

**Phase:** 05-polimento-e-deploy
**Plan:** 04
**Status:** ⏸ Aguardando checkpoint humano (Tarefa 1 completa)
**Date:** 2026-05-23

## O que foi entregue

### Tarefa 1 ✅ (commit `e840ea4`)
- **`railway.json`** criado na raiz do repositório com:
  - `buildCommand: "cd backend && npm install"` (Nixpacks, sem Dockerfile)
  - `startCommand: "node backend/server.js"`
  - `healthcheckPath: "/api/health"` (timeout 30s)
  - `restartPolicyType: "ON_FAILURE"` (max 3 retries)
- **`backend/.env.example`** atualizado com todas as vars de produção incluindo `DB_PORT=3306`, `NODE_ENV=production`, `PORT=3000` e comentários explicativos

## Pendente (checkpoints humanos)

### Tarefa 2 — Setup Railway (ação humana)
Para fazer o deploy:
1. Criar conta: https://railway.app → Sign Up via GitHub
2. New Project → Deploy from GitHub repo → selecionar DuoPratic
3. Add Service → Database → MySQL → copiar credenciais
4. Configurar variáveis na aplicação:
   - `JWT_SECRET` (gerar com: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
   - `GEMINI_API_KEY` (do backend/.env local)
   - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` (do MySQL plugin)
   - `NODE_ENV=production`, `CORS_ORIGIN=<URL gerada pelo Railway>`
5. Settings → Domains → Generate Domain → copiar URL
6. Rodar migration-05 contra o banco Railway:
   ```powershell
   $env:DB_HOST="..."; $env:DB_USER="..."; $env:DB_PASSWORD="..."; $env:DB_NAME="..."; $env:DB_PORT="..."
   node backend/scripts/migration-05.js
   ```

### Tarefa 3 — Verificação de saúde (após Tarefa 2)
- `GET /api/health` na URL pública → `{"status":"ok"}`
- `GET /api/db/status` → `"conectado":1`

## Para retomar
Quando o deploy Railway estiver pronto, informe a URL pública e continue com Plan 05-05 (Smoke Test).
