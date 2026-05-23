---
phase: 03
plan: 01
subsystem: database
tags: [migration, mysql, schema, gamificacao]
dependency-graph:
  requires: []
  provides: [questoes, respostas_questao, usuarios.pontuacao, usuarios.streak_atual, usuarios.ultimo_acesso]
  affects: [backend/db, atividades, usuarios]
tech-stack:
  added: []
  patterns: [migration-script-pattern, idempotent-alter-errno-1060]
key-files:
  created:
    - database/migration-03-atividades.sql
    - backend/scripts/migration-03.js
  modified: []
decisions:
  - "Idempotência do ALTER TABLE via try/catch errno 1060 no JS em vez de stored procedure (mysql2 não suporta DELIMITER)"
  - "Arquivo SQL mantém bloco DELIMITER para referência CLI; execução real é feita pelo script JS"
  - "opcoes usa tipo JSON nativo do MySQL 8.0.46 — não TEXT/VARCHAR"
metrics:
  duration: ~5min
  completed: 2025-01-26
---

# Phase 3 Plan 01: Migration BD — Atividades Multi-questão + Pontuação/Streak — Summary

**One-liner:** Migration idempotente que cria `questoes` e `respostas_questao` e adiciona `pontuacao`, `streak_atual`, `ultimo_acesso` em `usuarios` via try/catch errno 1060.

## O que foi feito

Criados dois arquivos que juntos implementam a migration do banco para suportar atividades multi-questão e gamificação de alunos:

1. **`database/migration-03-atividades.sql`** — SQL puro de referência com os três blocos (questoes, respostas_questao, ALTER TABLE usuarios). Inclui o bloco DELIMITER para uso via MySQL CLI.

2. **`backend/scripts/migration-03.js`** — Script Node.js de execução real. Segue exatamente o padrão de `migration-02.js`: carrega `.env` via path explícito, usa `require("../db")`, executa cada instrução separadamente sem depender de DELIMITER, loga por etapa e exit 0/1.

## Verificação executada

```
node backend/scripts/migration-03.js   # 1ª execução
  Tabela 'questoes' verificada/criada.
  Tabela 'respostas_questao' verificada/criada.
  Coluna 'usuarios.pontuacao' adicionada.
  Coluna 'usuarios.streak_atual' adicionada.
  Coluna 'usuarios.ultimo_acesso' adicionada.
Migration-03 concluída com sucesso.

node backend/scripts/migration-03.js   # 2ª execução (idempotência)
  Tabela 'questoes' verificada/criada.
  Tabela 'respostas_questao' verificada/criada.
  Coluna 'usuarios.pontuacao' já existe — ignorado.
  Coluna 'usuarios.streak_atual' já existe — ignorado.
  Coluna 'usuarios.ultimo_acesso' já existe — ignorado.
Migration-03 concluída com sucesso.
```

Ambas as execuções terminaram com exit code 0.

## Commits

| Task | Commit   | Descrição                                                |
|------|----------|----------------------------------------------------------|
| 1    | f715c28  | feat(03-01): migration-03 SQL — questoes, respostas_questao, pontuacao cols |
| 2    | 28a2a54  | feat(03-01): migration-03.js script                      |

## Deviations from Plan

Nenhuma — plano executado exatamente como escrito.

## Decisions Made

1. **Idempotência via JS (não stored procedure):** `mysql2/promise` não suporta `DELIMITER`, então o bloco 3 (ALTER TABLE usuarios) é executado no script JS com `try/catch` que verifica `erro.errno === 1060`. O arquivo SQL mantém o bloco DELIMITER apenas para referência / uso via CLI.

2. **`opcoes` como JSON nativo:** MySQL 8.0.46 suporta o tipo JSON nativamente — usado em vez de TEXT/VARCHAR para garantir validação de estrutura no nível do banco.

## Known Stubs

Nenhum — este plano é puramente de banco de dados (DDL). Nenhum componente de UI ou API foi criado.

## Threat Flags

Nenhuma nova superfície de rede ou autenticação introduzida — este plano é DDL-only.

## Self-Check: PASSED

- ✅ `database/migration-03-atividades.sql` — existe
- ✅ `backend/scripts/migration-03.js` — existe
- ✅ Commit f715c28 — existe
- ✅ Commit 28a2a54 — existe
- ✅ Migration executou com exit 0 (1ª e 2ª execução)
