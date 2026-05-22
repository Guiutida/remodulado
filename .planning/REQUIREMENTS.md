# Requirements: DuoPratic

**Defined:** 2026-05-22
**Core Value:** Alunos aprendem mais, com ritmo próprio e apoio de IA — professores acompanham o progresso sem esforço extra.

## v1 Requirements

### Segurança e Autenticação

- [ ] **AUTH-01**: Senhas armazenadas com hash bcrypt (migração do texto plano atual)
- [ ] **AUTH-02**: Todas as rotas de API protegidas por middleware JWT
- [ ] **AUTH-03**: Token JWT emitido no login e validado a cada requisição autenticada
- [ ] **AUTH-04**: Sessão do usuário persiste entre recarregamentos do browser
- [ ] **AUTH-05**: CORS configurado sem wildcard — apenas origens permitidas
- [ ] **AUTH-06**: Aluno não consegue acessar dados de outro aluno (IDOR eliminado)

### Turmas

- [ ] **TURM-01**: Professor pode criar uma turma com nome e código de acesso
- [ ] **TURM-02**: Aluno pode entrar em uma turma pelo código de acesso
- [ ] **TURM-03**: Professor visualiza lista de membros da turma
- [ ] **TURM-04**: Professor pode remover aluno da turma
- [ ] **TURM-05**: Aluno visualiza a turma em que está inscrito

### Trilhas de Aprendizado

- [ ] **TRIL-01**: Professor pode criar uma trilha com nome, descrição e disciplina
- [ ] **TRIL-02**: Professor pode adicionar etapas à trilha (texto, vídeo ou link)
- [ ] **TRIL-03**: Professor atribui trilha a uma turma
- [ ] **TRIL-04**: Aluno visualiza trilhas disponíveis na sua turma
- [ ] **TRIL-05**: Aluno navega pelas etapas da trilha em sequência
- [ ] **TRIL-06**: Progresso do aluno na trilha é persistido no banco de dados
- [ ] **TRIL-07**: Aluno pode marcar etapa como concluída

### Atividades e Exercícios

- [ ] **ATIV-01**: Professor pode criar atividade com questões de múltipla escolha
- [ ] **ATIV-02**: Professor pode criar atividade com questões dissertativas
- [ ] **ATIV-03**: Professor atribui atividade a uma turma com prazo
- [ ] **ATIV-04**: Aluno responde atividade e recebe retorno imediato nas questões objetivas
- [ ] **ATIV-05**: Resposta do aluno é salva no banco de dados
- [ ] **ATIV-06**: Professor visualiza entregas dos alunos para cada atividade

### Painel do Aluno

- [ ] **ALUN-01**: Aluno visualiza progresso real nas trilhas (não hardcoded)
- [ ] **ALUN-02**: Aluno visualiza histórico de atividades realizadas
- [ ] **ALUN-03**: Aluno visualiza pontuação e sequência de estudos (streak)

### Painel do Professor

- [ ] **PROF-01**: Professor visualiza desempenho geral da turma por atividade
- [ ] **PROF-02**: Professor visualiza progresso individual de cada aluno nas trilhas
- [ ] **PROF-03**: Professor pode criar e gerenciar avisos para a turma

### IA — Tutor de Estudos

- [ ] **IA-01**: Aluno pode enviar dúvida sobre exercício e receber orientação da IA
- [ ] **IA-02**: IA explica o raciocínio necessário SEM fornecer a resposta direta
- [ ] **IA-03**: Resposta da IA é transmitida em streaming (SSE) para feedback ao vivo
- [ ] **IA-04**: Rate limiting aplicado no endpoint de IA (máx. 8 req/min por usuário)
- [ ] **IA-05**: Histórico da conversa de IA é salvo e usado como contexto nas próximas mensagens

### IA — Geração de Trilhas

- [ ] **IA-06**: Professor pode solicitar à IA que gere sugestão de trilha para um tema
- [ ] **IA-07**: Trilha gerada pela IA pode ser editada antes de ser publicada

### IA — Avaliação de Desempenho

- [ ] **IA-08**: IA gera resumo de pontos fortes e fracos do aluno com base em respostas
- [ ] **IA-09**: Professor visualiza resumo de desempenho da turma gerado por IA

### Infraestrutura e Qualidade

- [ ] **INFRA-01**: `server.js` dividido em módulos (`routes/`, `middleware/`, `controllers/`)
- [ ] **INFRA-02**: Dados de seed removidos de handlers de produção
- [ ] **INFRA-03**: `foto_perfil` migrada de LONGTEXT base64 para armazenamento em arquivo
- [ ] **INFRA-04**: Variáveis de ambiente validadas na inicialização do servidor
- [ ] **INFRA-05**: Sistema implantado em ambiente de produção acessível (Railway ou Render)

## v2 Requirements

### Acesso Livre (sem turma)

- **LIVRE-01**: Usuário pode estudar trilhas públicas sem estar em turma
- **LIVRE-02**: Plataforma acessível para qualquer pessoa sem vínculo institucional

### Personalização Avançada de IA

- **IAADV-01**: IA adapta trilha automaticamente conforme progresso do aluno
- **IAADV-02**: IA detecta lacunas de aprendizado e sugere revisão
- **IAADV-03**: Sistema de espaçamento inteligente de revisão (spaced repetition)

### Engajamento

- **ENG-01**: Sistema de notificações por e-mail
- **ENG-02**: Emblemas e conquistas por progressos específicos

## Out of Scope

| Feature | Reason |
|---------|--------|
| Aplicativo mobile nativo | Plataforma web responsiva suficiente para o TCC; mobile é v3+ |
| Pagamentos / planos pagos | Fora do escopo acadêmico do TCC |
| OAuth (Google, GitHub) | Email/senha suficiente para v1 |
| Chat em tempo real entre alunos | Alta complexidade, não é o diferencial central |
| Geração de vídeo ou áudio pela IA | Custo e complexidade fora do escopo do TCC |
| Leaderboards públicos | Pesquisa indica risco de desmotivação — anti-feature para este público |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| AUTH-06 | Phase 1 | Pending |
| INFRA-01 | Phase 1 | Pending |
| INFRA-02 | Phase 1 | Pending |
| TURM-01 | Phase 2 | Pending |
| TURM-02 | Phase 2 | Pending |
| TURM-03 | Phase 2 | Pending |
| TURM-04 | Phase 2 | Pending |
| TURM-05 | Phase 2 | Pending |
| TRIL-01 | Phase 2 | Pending |
| TRIL-02 | Phase 2 | Pending |
| TRIL-03 | Phase 2 | Pending |
| TRIL-04 | Phase 2 | Pending |
| TRIL-05 | Phase 2 | Pending |
| TRIL-06 | Phase 2 | Pending |
| TRIL-07 | Phase 2 | Pending |
| ATIV-01 | Phase 3 | Pending |
| ATIV-02 | Phase 3 | Pending |
| ATIV-03 | Phase 3 | Pending |
| ATIV-04 | Phase 3 | Pending |
| ATIV-05 | Phase 3 | Pending |
| ATIV-06 | Phase 3 | Pending |
| ALUN-01 | Phase 3 | Pending |
| ALUN-02 | Phase 3 | Pending |
| ALUN-03 | Phase 3 | Pending |
| IA-01 | Phase 4 | Pending |
| IA-02 | Phase 4 | Pending |
| IA-03 | Phase 4 | Pending |
| IA-04 | Phase 4 | Pending |
| IA-05 | Phase 4 | Pending |
| IA-06 | Phase 4 | Pending |
| IA-07 | Phase 4 | Pending |
| IA-08 | Phase 4 | Pending |
| IA-09 | Phase 4 | Pending |
| PROF-01 | Phase 4 | Pending |
| PROF-02 | Phase 4 | Pending |
| PROF-03 | Phase 3 | Pending |
| INFRA-03 | Phase 5 | Pending |
| INFRA-04 | Phase 5 | Pending |
| INFRA-05 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 44 total
- Mapped to phases: 44
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-22*
*Last updated: 2026-05-22 after initial definition*
