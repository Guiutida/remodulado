---
phase: "04"
plan: "05"
subsystem: "ia"
tags: [ia, gemini, resumo-aluno, resumo-turma, progresso-trilhas, dashboard]
dependency_graph:
  requires: [04-PLAN-04]
  provides: [resumoAluno, resumoTurma, progressoTrilhasTurma, carregarResumoIA, carregarResumoIATurma, carregarProgressoTrilhas]
  affects: [pages/aluno.html, pages/professor.html, assets/js/painel.js, assets/js/professor.js]
tech_stack:
  added: []
  patterns: [Gemini generateContent non-streaming, SUM(IF) MySQL 8.0, NULLIF division-by-zero guard, escHtml XSS sanitization, IDOR ownership check]
key_files:
  created: []
  modified:
    - backend/controllers/iaController.js
    - backend/routes/ia.js
    - assets/js/painel.js
    - assets/js/professor.js
    - pages/aluno.html
    - pages/professor.html
decisions:
  - "Commits separados por camada: controller → routes → painel frontend → professor frontend"
  - "escHtmlPainel / escHtmlProf definidos localmente no IIFE de cada arquivo para XSS safety sobre conteúdo gerado pela IA"
  - "progressoTrilhasTurma não chama Gemini: retorna dados brutos para renderização de barras de progresso (PROF-02)"
metrics:
  duration: "~12 min"
  completed: "2025-07-27"
  tasks_completed: 4
  files_modified: 6
---

# Phase 04 Plan 05: Resumos de Desempenho por IA e Painéis — Summary

**One-liner:** Endpoints Gemini de análise pedagógica (resumo aluno + resumo turma + progresso trilhas) com painéis em aluno.html e professor.html via escHtml-sanitized rendering.

---

## Tasks Completed

| # | Descrição | Commit | Arquivos |
|---|-----------|--------|----------|
| 1 | `resumoAluno`, `resumoTurma`, `progressoTrilhasTurma` em iaController.js | `d761c16` | backend/controllers/iaController.js |
| 2 | Desbloquear rotas comentadas em routes/ia.js | `3f3bc4d` | backend/routes/ia.js |
| 3 | `carregarResumoIA()` em painel.js + card em aluno.html | `aa7bbbe` | assets/js/painel.js, pages/aluno.html |
| 4 | `carregarResumoIATurma()` + `carregarProgressoTrilhas()` em professor.js + cards em professor.html | `9059979` | assets/js/professor.js, pages/professor.html |

---

## Implementation Details

### Backend — `iaController.js`

**`resumoAluno`** (GET `/api/ia/resumo-aluno`):
- `alunoId = req.usuario.id` sempre (sem parâmetro de rota — IDOR por design)
- Agrega: `total_atividades`, `media_acerto_pct`, `total_acertos`, `total_erros`, `streak_atual`, `pontuacao`
- Busca últimas 5 questões erradas para contexto qualitativo no prompt
- Padrão MySQL 8.0: `SUM(IF(correta=1, 100, IF(correta=0, 0, NULL))) / NULLIF(...)` 
- Retorna: `{ status: 'ok', aluno: { nome, pontuacao, streak_atual }, analise: { resumo, pontos_fortes[], pontos_fracos[], recomendacao } }`

**`resumoTurma`** (GET `/api/ia/resumo-turma/:turmaId`):
- IDOR: `SELECT FROM turmas WHERE id = ? AND professor_id = ?`
- Subquery para média individual por aluno (evita distorção por volume de respostas)
- Busca alunos com `media_pct < 50 OR media_pct IS NULL` para seção "alunos_atencao"
- Retorna: `{ status: 'ok', turma: { id, nome }, analise: { resumo, pontos_fortes[], pontos_fracos[], recomendacao_professor, alunos_atencao[] } }`

**`progressoTrilhasTurma`** (GET `/api/ia/progresso-trilhas/:turmaId`):
- IDOR: `SELECT FROM turmas WHERE id = ? AND professor_id = ?`
- JOIN: `turma_alunos → usuarios → trilhas → trilha_etapas LEFT JOIN progresso_etapa`
- `SUM(IF(pe.concluido = 1, 1, 0)) * 100 / NULLIF(COUNT(te.id), 0)` para `progresso_pct`
- Não chama Gemini — retorna dados brutos para renderização de barras
- Retorna: `{ status: 'ok', progresso: [{ aluno_id, aluno_nome, trilha_id, trilha_titulo, disciplina, total_etapas, etapas_concluidas, progresso_pct }] }`

### Frontend — `painel.js` + `aluno.html`

- `carregarResumoIA()`: chamada ao montar o IIFE, usa `container.innerHTML` para loading/erro/sucesso
- `escHtmlPainel()`: sanitiza `&`, `<`, `>`, `"` — protege contra XSS em conteúdo Gemini
- Card `#resumo-ia-aluno-card` adicionado antes de `</main>` em aluno.html

### Frontend — `professor.js` + `professor.html`

- `carregarResumoIATurma(turmaId)`: invocada junto com `carregarDesempenho` para a primeira turma
- `carregarProgressoTrilhas(turmaId)`: agrupa resultados por `aluno_id`, renderiza barras `<div class="barra"><span style="width:N%"></span></div>`
- `escHtmlProf()`: mesma sanitização XSS, definida localmente no IIFE
- Card estático "Acompanhamento" (dados fake) **substituído** por `#resumo-ia-turma-card` e `#progresso-trilhas-card`

---

## Deviations from Plan

Nenhuma — plano executado exatamente como especificado.

---

## Verification

```bash
node --check backend/controllers/iaController.js  # OK
node --check assets/js/painel.js                  # OK
node --check assets/js/professor.js               # OK
```

**Critérios atendidos:**
- [x] `node --check` passa em iaController.js, painel.js e professor.js
- [x] `GET /api/ia/resumo-aluno` retorna `{ status: 'ok', aluno: {...}, analise: { resumo, pontos_fortes, pontos_fracos, recomendacao } }`
- [x] `GET /api/ia/resumo-turma/:turmaId` retorna `{ status: 'ok', turma: {...}, analise: {...} }`
- [x] `GET /api/ia/resumo-turma/:turmaId` com IDOR → 403 (controller verifica professor_id)
- [x] `GET /api/ia/progresso-trilhas/:turmaId` retorna array de progresso por aluno por trilha
- [x] `aluno.html`: card `#resumo-ia-aluno-card` renderizado pelo JS
- [x] `professor.html`: cards `#resumo-ia-turma-card` e `#progresso-trilhas-card` substituem dado estático
- [x] Perfil incorreto retorna 403 (verificarAluno / verificarProfessor nos middlewares de rota)

---

## Known Stubs

Nenhum — toda renderização consome dados reais da API ou exibe mensagens de erro/carregamento explícitas.

---

## Self-Check: PASSED

Arquivos criados/modificados:
- FOUND: `backend/controllers/iaController.js`
- FOUND: `backend/routes/ia.js`
- FOUND: `assets/js/painel.js`
- FOUND: `assets/js/professor.js`
- FOUND: `pages/aluno.html`
- FOUND: `pages/professor.html`

Commits verificados:
- `d761c16` feat(04-05): iaController.js — resumoAluno + resumoTurma + progressoTrilhasTurma
- `3f3bc4d` feat(04-05): routes/ia.js — /resumo-aluno + /resumo-turma/:id + /progresso-trilhas/:id
- `aa7bbbe` feat(04-05): painel.js + aluno.html — card resumo IA aluno
- `9059979` feat(04-05): professor.js + professor.html — desempenho IA turma + progresso trilhas
