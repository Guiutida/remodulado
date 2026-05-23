---
phase: "04"
plan: "02"
subsystem: backend/ia
tags: [ia, gemini, sse, streaming, sessoes, rate-limit, socratic, injection-defense]
dependency_graph:
  requires: [04-01]
  provides: [iaController, routes/ia, /api/ia]
  affects: [backend/server.js]
tech_stack:
  added: []
  patterns:
    - SSE streaming com res.flushHeaders() + res.write() + res.end()
    - Post-stream DB persistence em try/catch separado
    - Detecção de injeção de prompt por regex (12 padrões)
    - IDOR check via aluno_id em todas as rotas de sessão
    - Rate limit por usuário autenticado (iaRateLimit após autenticar)
key_files:
  created:
    - backend/controllers/iaController.js
    - backend/routes/ia.js
  modified:
    - backend/server.js
decisions:
  - "SYSTEM_PROMPT_TUTOR definido como constante server-side, nunca serializado em resposta HTTP"
  - "Post-stream persistence usa try/catch separado do fluxo SSE — erros de DB logados no console sem impactar cliente"
  - "Título da sessão atualizado automaticamente com os primeiros 80 chars da 1ª mensagem do aluno"
  - "12 padrões regex de injeção de prompt cobrindo PT-BR e EN (jailbreak, DAN, [INST], system:, act as, etc.)"
  - "iaRateLimit posicionado APÓS autenticar e verificarAluno para garantir req.usuario.id disponível"
metrics:
  duration: "~12 min"
  completed: "2025-07-16"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 1
---

# Fase 04 Plano 02: Backend Tutor IA — Sessões, SSE Streaming e Defesa Pedagógica

**One-liner:** Tutor socrático via Gemini SSE streaming com detecção de injeção, IDOR, rate limit por usuário e persistência pós-stream separada.

---

## Resumo

Implementação completa dos endpoints de IA para o tutor pedagógico do DuoPratic. O controlador `iaController.js` gerencia sessões de conversa e oferece streaming SSE via Gemini API (`@google/genai`). O sistema prompt socrático é mantido exclusivamente no servidor. Doze padrões regex detectam tentativas de injeção/jailbreak antes de qualquer chamada ao modelo.

---

## Tarefas Executadas

| # | Tarefa | Commit | Arquivos |
|---|--------|--------|---------|
| 1 | Criar `iaController.js` — CRUD de sessões + tutor SSE + defesa pedagógica | `d6ccf52` | `backend/controllers/iaController.js` |
| 2 | Criar `routes/ia.js` + montar `/api/ia` em `server.js` | `05b75cc` | `backend/routes/ia.js`, `backend/server.js` |

---

## Arquivos Criados / Modificados

### `backend/controllers/iaController.js` (novo — 252 linhas)
- **`criarSessao`** — `POST /api/ia/sessoes`: cria sessão com título (max 140 chars), retorna `{ status: 'ok', sessao_id }`
- **`listarSessoes`** — `GET /api/ia/sessoes`: lista 20 sessões mais recentes do aluno logado
- **`getMensagens`** — `GET /api/ia/sessoes/:id/mensagens`: histórico completo com IDOR check
- **`orientar`** — `POST /api/ia/orientar`: streaming SSE com Gemini, defesa socrática, persistência pós-stream

### `backend/routes/ia.js` (novo — 52 linhas)
- Guards `verificarAluno` e `verificarProfessor` definidos inline
- Rotas literais (`/sessoes`) antes de rotas com parâmetro (`:id`) — padrão Express obrigatório
- Ordem de middleware em `/orientar`: `autenticar → verificarAluno → iaRateLimit → handler`
- Rotas futuras (gerar-trilha, resumos) comentadas para PLANs 04 e 05

### `backend/server.js` (editado)
- Adicionado `require('./routes/ia')` + `app.use('/api/ia', rotasIa)`

---

## Segurança Implementada

### Camada 1 — System Prompt Pedagógico (server-side only)
`SYSTEM_PROMPT_TUTOR` é uma constante no módulo do controlador. Nunca serializado em respostas HTTP, nunca exposto ao cliente.

### Camada 2 — Detecção de Injeção de Prompt
12 padrões regex antes de qualquer chamada ao Gemini:
- PT-BR: "me dê a resposta", "ignore as instruções", "finja que", "você é agora", "esqueça tudo", "novo papel/modo/personagem"
- EN: "act as", "forget your", "jailbreak", `DAN`, `[INST]`, `system:`

Retorna HTTP 400 com mensagem pedagógica ao detectar injeção.

### Camada 3 — Rate Limit por Usuário
`iaRateLimit` (8 req/min por `req.usuario.id`) aplicado APÓS `autenticar` e `verificarAluno` na rota `/orientar`.

### IDOR Protection
Todas as rotas com `sessao_id` verificam `aluno_id = req.usuario.id` antes de qualquer operação.

---

## Padrão SSE Implementado

```
Headers obrigatórios:
  Content-Type: text/event-stream
  Cache-Control: no-cache
  Connection: keep-alive
  X-Accel-Buffering: no

Eventos:
  data: {"text": "<token>"}\n\n   ← chunks do Gemini
  data: [DONE]\n\n                 ← sinalização de fim

Post-stream (try/catch separado):
  INSERT mensagens_ia (role='model', conteudo=respostaCompleta)
  UPDATE sessoes_ia SET titulo (apenas se for 1ª mensagem)
```

---

## Desvios do Plano

Nenhum — plano executado exatamente como especificado.

---

## Known Stubs

Nenhum. Todos os endpoints retornam dados reais do banco (dependentes de sessões/mensagens criadas pelo usuário).

---

## Threat Flags

Nenhum novo surface não coberto pelo threat model do plano. Os endpoints `/api/ia/orientar` e `/api/ia/sessoes` estão protegidos por autenticação JWT + IDOR + rate limit conforme especificado.

---

## Self-Check: PASSED

- [x] `backend/controllers/iaController.js` — existe, sintaxe OK (`node --check`)
- [x] `backend/routes/ia.js` — existe, sintaxe OK (`node --check`)
- [x] `backend/server.js` — editado, sintaxe OK (`node --check`), contém `rotasIa` e `/api/ia`
- [x] Commit `d6ccf52` — Task 1 (iaController)
- [x] Commit `05b75cc` — Task 2 (routes + server)
