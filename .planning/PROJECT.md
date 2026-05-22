# DuoPratic

## What This Is

Plataforma de estudo online voltada para alunos do ensino fundamental 2 e ensino médio, com suporte a professores que gerenciam turmas. Os alunos avançam por trilhas de aprendizado, resolvem atividades com retorno imediato e contam com IA integrada para apoio no estudo. Os professores criam turmas, atribuem conteúdo e acompanham o desempenho da turma.

## Core Value

Alunos aprendem mais, com ritmo próprio e apoio de IA — professores acompanham o progresso sem esforço extra.

## Requirements

### Validated

- ✓ Landing page com apresentação da plataforma — existente
- ✓ Cadastro de usuário (aluno/professor) — existente
- ✓ Login com autenticação — existente
- ✓ Backend Node.js/Express com MySQL — existente

### Active

- [ ] Gerenciamento de turmas — professor cria turma, adiciona alunos, visualiza membros
- [ ] Trilhas de aprendizado — criação, organização em etapas e navegação pelo aluno
- [ ] Atividades e exercícios — criação pelo professor, resolução pelo aluno com retorno imediato
- [ ] Painel do aluno — progresso nas trilhas, histórico de atividades, pontuação
- [ ] Painel do professor — visão da turma, desempenho dos alunos, acompanhamento
- [ ] IA: avaliação de desempenho — análise do progresso e pontos fracos do aluno
- [ ] IA: explicação de exercícios — ajuda o aluno a entender sem entregar a resposta
- [ ] IA: criação de trilhas — sugere ou gera trilhas baseadas no perfil e histórico do aluno

### Out of Scope

- Acesso de qualquer pessoa sem vínculo a turma — decidido para versão futura após o TCC
- Aplicativo mobile nativo — plataforma web responsiva é suficiente para o TCC
- Pagamentos / monetização — fora do escopo do TCC

## Context

- Projeto de TCC (Trabalho de Conclusão de Curso) que também será continuado como produto real após a apresentação
- Stack existente: Node.js + Express no backend, MySQL, HTML/CSS/JS vanilla no frontend
- Login e cadastro já funcionam; demais funcionalidades incompletas
- Páginas frontend já estruturadas: aluno, professor, trilhas, turmas, atividades, estudo, ia-estudo
- A integração com IA é um diferencial central do projeto

## Constraints

- **Stack**: Node.js + Express + MySQL + HTML/CSS/JS vanilla — já estabelecido, sem framework frontend
- **Prazo**: TCC precisa estar funcional para apresentação — v1 completa e implantada
- **IA**: deve explicar sem revelar respostas diretas — requisito pedagógico explícito

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| IA explica exercícios sem dar respostas | Requisito pedagógico — estimula o raciocínio do aluno | — Pending |
| Stack vanilla (sem framework frontend) | Já definido no projeto, manter consistência | — Pending |
| Sistema real com banco de dados persistido | TCC exige demonstração funcional, não protótipo | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-22 after initialization*
