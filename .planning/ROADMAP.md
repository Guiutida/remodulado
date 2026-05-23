# Roadmap: DuoPratic

**Milestone:** v1.0 — TCC
**Target:** Fully functional system for thesis presentation
**Phases:** 5

---

## Phases

- [x] **Phase 1: Segurança e Fundação** — Corrigir as 5 vulnerabilidades de segurança confirmadas e refatorar a estrutura do servidor
- [x] **Phase 2: Turmas e Trilhas** — Ligar os shells HTML existentes a dados reais; CRUD completo de turmas e trilhas
- [x] **Phase 3: Atividades e Painel do Aluno** — Loop de criação/submissão de atividades e painel do aluno com dados reais
- [x] **Phase 4: Integração com IA** — Tutor Socrático, geração de trilhas e análise de desempenho com Gemini
- [ ] **Phase 5: Polimento e Deploy** — Sistema pronto para produção, implantado e validado para apresentação do TCC

---

## Phase Details

### Phase 1: Segurança e Fundação

**Goal:** O sistema não possui vulnerabilidades críticas conhecidas e o servidor está organizado em módulos — base segura para todas as fases seguintes.
**Depends on:** Nada (primeira fase)
**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, INFRA-01, INFRA-02
**Status:** Not Started

**Success Criteria** (what must be TRUE):
1. Usuário cria conta e senha é armazenada como hash bcrypt — texto plano nunca gravado no banco
2. Qualquer rota de API retorna 401 se chamada sem token JWT válido no header
3. Aluno autenticado não consegue ler ou modificar dados de outro aluno (requisição retorna 403)
4. `server.js` foi substituído por arquivos em `routes/`, `middleware/` e `controllers/` — sem lógica de negócio inline
5. Dados de seed (Prof. Ana Paula, atividades fake) não aparecem em nenhuma resposta da API em produção

### Plans

1. **Instalar dependências de segurança e configurar variáveis de ambiente** — adicionar `bcrypt@6.0.0`, `jsonwebtoken@9.0.3`, `express-rate-limit@8.5.2`, `helmet@8.2.0`, `express-validator@7.3.2` via npm; criar `.env.example` com `JWT_SECRET`, `GEMINI_API_KEY`, `CORS_ORIGIN` e validação mínima na inicialização
2. **Migrar senhas para bcrypt e emitir JWT no login** — substituir comparação de texto plano por `bcrypt.compare` e hash por `bcrypt.hash`; endpoint de login passa a retornar `{ token, user }` com JWT assinado; frontend salva token em `localStorage` e reenvia no header `Authorization`
3. **Implementar middleware JWT e corrigir IDOR** — criar `middleware/auth.js` que valida token em cada requisição; aplicar a todas as rotas protegidas; adicionar verificação `req.user.id === req.params.id` (ou `req.user.turma_id`) em cada handler para eliminar IDOR; configurar CORS com `CORS_ORIGIN` env var
4. **Refatorar server.js em módulos** — mover rotas para `routes/auth.js`, `routes/turmas.js`, etc.; extrair handlers para `controllers/`; criar `middleware/errorHandler.js`; remover `garantirAtividadeFuncoes()` e todo seed de produção; `server.js` passa a ser apenas entry point com `app.use` calls
5. **Adicionar guards de rota no frontend** — inserir verificação de token no início de cada página protegida (`aluno.html`, `professor.html`, etc.); redirecionar para login se token ausente ou expirado

**UI hint**: yes

---

### Phase 2: Turmas e Trilhas

**Goal:** Professor cria turmas e trilhas; aluno entra na turma e navega pelas trilhas — tudo persistido no banco, zero dados hardcoded visíveis.
**Depends on:** Phase 1
**Requirements:** TURM-01, TURM-02, TURM-03, TURM-04, TURM-05, TRIL-01, TRIL-02, TRIL-03, TRIL-04, TRIL-05, TRIL-06, TRIL-07
**Status:** ✅ Complete (2026-05-22) cria turma e vê a turma listada com código de acesso gerado
2. Aluno digita o código de acesso e aparece na lista de membros da turma do professor
3. Professor acessa `trilhas.html`, cria trilha com etapas (texto/vídeo/link) e a atribui à turma
4. Aluno vê as trilhas disponíveis na sua turma e navega pelas etapas em sequência
5. Ao marcar etapa como concluída, o progresso persiste após recarregar a página

### Plans

1. **Criar tabelas de trilhas no banco e atualizar schema** — adicionar tabelas `trilhas`, `trilha_etapas`, `progresso_etapa` ao schema; criar migration script; documentar relações no README do banco
2. **Implementar API de turmas (CRUD + join)** — `POST /api/turmas`, `GET /api/turmas/:id/membros`, `DELETE /api/turmas/:id/membros/:alunoId`, `POST /api/turmas/entrar` com validação de código; gerar `codigo_acesso` único (6 chars) no create
3. **Implementar API de trilhas (CRUD + atribuição + progresso)** — `POST /api/trilhas`, `POST /api/trilhas/:id/etapas`, `POST /api/trilhas/:id/atribuir`, `GET /api/trilhas` (aluno vê trilhas da sua turma), `POST /api/trilhas/etapas/:id/concluir`, `GET /api/trilhas/:id/progresso`
4. **Conectar turma.html ao backend** — substituir dados hardcoded pelo fetch real; formulário de criação de turma chama API; lista de membros vem de `GET /api/turmas/:id/membros`; botão "remover aluno" chama DELETE; aluno vê sua turma via `GET /api/aluno/turma`
5. **Conectar trilhas.html e aluno.html ao backend** — trilhas disponíveis renderizadas dinamicamente; UI de etapas sequenciais consome API de progresso; botão "marcar como concluída" persiste no banco; barra de progresso na trilha mostra percentual real

**UI hint**: yes

---

### Phase 3: Atividades e Painel do Aluno

**Goal:** Professor cria e distribui atividades; aluno responde e recebe feedback imediato; painel do aluno exibe dados reais de progresso, histórico e pontuação.
**Depends on:** Phase 2
**Requirements:** ATIV-01, ATIV-02, ATIV-03, ATIV-04, ATIV-05, ATIV-06, ALUN-01, ALUN-02, ALUN-03, PROF-03
**Status:** Not Started

**Success Criteria** (what must be TRUE):
1. Professor cria atividade com questões de múltipla escolha e/ou dissertativas via formulário e a atribui à turma com prazo
2. Aluno acessa a atividade, responde e vê imediatamente quais questões objetivas acertou (verde) ou errou (vermelho) com a resposta correta
3. Respostas do aluno estão salvas no banco; professor vê lista de entregas com nome e status de cada aluno
4. Painel do aluno (`aluno.html`) mostra progresso real nas trilhas, histórico de atividades e streak de estudos — sem nenhum valor hardcoded
5. Professor pode criar aviso para a turma e todos os alunos membros veem o aviso na próxima visita

### Plans

1. **Criar tabelas de atividades e respostas no banco** — adicionar `questoes`, `opcoes_questao`, `respostas_questao` ao schema (tabela `atividades` existe, estender conforme necessário); criar migration script
2. **Implementar API de criação e atribuição de atividades (professor)** — `POST /api/atividades` com questões aninhadas, `POST /api/atividades/:id/atribuir`, `GET /api/atividades/turma/:turmaId` (visão do professor com entregas), `POST /api/avisos` e `GET /api/avisos/turma/:turmaId`
3. **Implementar API de submissão e correção automática (aluno)** — `POST /api/atividades/:id/responder` que salva respostas, compara gabarito de múltipla escolha, retorna objeto `{ resultados: [{ questaoId, correta, respostaCorreta }] }` imediatamente; dissertativas registradas como pendentes de correção manual
4. **Implementar endpoints de dashboard do aluno** — `GET /api/aluno/dashboard` retorna: progresso por trilha (real), atividades recentes (últimas 5), pontuação acumulada, streak calculado a partir de `ultimo_acesso`; atualizar `ultimo_acesso` a cada login
5. **Conectar atividades.html e aluno.html ao backend** — formulário de criação de atividade (professor) consome API; tela de resolução (aluno) exibe questões da API e envia respostas; feedback imediato renderizado no frontend; painel do aluno substitui todos os valores hardcoded por dados do endpoint de dashboard

**UI hint**: yes

---

### Phase 4: Integração com IA

**Goal:** As três funcionalidades de IA estão operacionais com defesas pedagógicas (tutor não dá respostas diretas), rate limiting e histórico de conversa persistido.
**Depends on:** Phase 3
**Requirements:** IA-01, IA-02, IA-03, IA-04, IA-05, IA-06, IA-07, IA-08, IA-09, PROF-01, PROF-02
**Status:** Not Started

**Success Criteria** (what must be TRUE):
1. Aluno envia dúvida em `ia-estudo.html` e recebe resposta em streaming que orienta o raciocínio sem revelar a resposta — tentar extrair a resposta com "me dê a resposta direta" é detectado e recusado
2. Histórico da conversa persiste entre sessões; ao reabrir a sessão, o contexto anterior está disponível
3. Endpoint de IA retorna 429 após 8 requisições por minuto pelo mesmo usuário
4. Professor solicita geração de trilha para um tema, recebe sugestão da IA, edita antes de publicar
5. Aluno e professor visualizam resumo de desempenho gerado por IA (pontos fortes, pontos fracos, padrões identificados) no painel respectivo

### Plans

1. **Instalar @google/genai e configurar cliente Gemini** — `npm install @google/genai@2.6.0`; criar `services/ia.js` com cliente Gemini (`gemini-2.0-flash`); criar `middleware/rateLimit.js` com `express-rate-limit` (8 req/min por usuário autenticado); criar tabelas `sessoes_ia` e `mensagens_ia` no banco
2. **Implementar endpoint de tutor com SSE streaming e defesa pedagógica** — `POST /api/ia/orientar` com 3 camadas: (1) system prompt em PT-BR instruindo Gemini a orientar sem revelar resposta, (2) detecção de injection ("me dê a resposta", "ignore as instruções anteriores"), (3) validação da resposta antes de transmitir; streaming via `res.write()` com `text/event-stream`; histórico de mensagens salvo por `sessao_id`
3. **Conectar ia-estudo.html e estudo.html ao endpoint real** — substituir simulação JS por `fetch` com `ReadableStream` para consumir SSE; renderizar tokens conforme chegam; botões "Explique meu erro" e "Me dê uma dica" enviam contexto da questão atual; indicador de digitação durante streaming
4. **Implementar endpoint de geração de trilha por IA** — `POST /api/ia/gerar-trilha` recebe `{ tema, nivel, qtdEtapas }`; Gemini retorna estrutura JSON com nome, descrição e etapas; professor vê resultado em formulário editável antes de salvar; `POST /api/ia/salvar-trilha` persiste a versão editada
5. **Implementar resumos de desempenho por IA e painéis do professor** — `GET /api/ia/resumo-aluno/:id` agrega respostas do aluno e solicita análise ao Gemini; `GET /api/ia/resumo-turma/:turmaId` agrega dados da turma; `GET /api/professor/dashboard` retorna desempenho por atividade (`PROF-01`) e progresso individual nas trilhas (`PROF-02`) com flags de alunos que precisam de atenção

**UI hint**: yes

---

### Phase 5: Polimento e Deploy

**Goal:** Sistema implantado em URL pública, sem dados de perfil corrompidos, com tratamento de erros visível ao usuário e smoke test de todos os fluxos aprovado.
**Depends on:** Phase 4
**Requirements:** INFRA-03, INFRA-04, INFRA-05
**Status:** Not Started

**Success Criteria** (what must be TRUE):
1. Upload de foto de perfil funciona via formulário; foto é servida como arquivo estático — nenhum base64 trafega na rede
2. Servidor não inicia se variáveis obrigatórias (`JWT_SECRET`, `GEMINI_API_KEY`, `DB_*`) estiverem ausentes — mensagem de erro clara no console
3. Rotas inexistentes retornam página/JSON de 404; erros internos retornam 500 sem stack trace exposto; promessas rejeitadas não derrubam o processo
4. Frontend exibe spinner de carregamento durante fetches e mensagem de erro amigável quando API falha — nenhuma tela em branco silenciosa
5. URL pública acessível (Railway ou Render) onde todos os 5 fluxos principais funcionam: cadastro → turma → trilha → atividade → IA

### Plans

1. **Migrar foto_perfil de LONGTEXT base64 para sistema de arquivos** — instalar `multer@2.1.1`; criar endpoint `POST /api/perfil/foto` que salva arquivo em `uploads/`; servir `uploads/` como estático; atualizar campo no banco para path do arquivo; script de migration para converter registros base64 existentes
2. **Adicionar validação de variáveis de ambiente e tratamento global de erros** — criar `config/env.js` que valida presença de todas as vars na inicialização (process.exit(1) se ausente); adicionar middleware `errorHandler` para 404 e 500; registrar `process.on('unhandledRejection')` e `process.on('uncaughtException')` com log estruturado
3. **Adicionar estados de carregamento e feedback de erro no frontend** — criar utilitário JS `ui.js` com `showLoading()`, `hideLoading()`, `showError(msg)`, `showSuccess(msg)`; aplicar em todos os formulários e fetches das páginas principais; garantir que erro de rede nunca resulta em tela em branco
4. **Configurar deploy em Railway (ou Render) com MySQL gerenciado** — criar `Dockerfile` ou usar buildpack Node.js; configurar variáveis de ambiente no painel; provisionar MySQL gerenciado; rodar migration script; configurar `railway.json` / `render.yaml` com health check
5. **Smoke test end-to-end de todos os fluxos antes da entrega** — percorrer manualmente: (1) cadastro + login, (2) professor cria turma + trilha + atividade, (3) aluno entra na turma + completa trilha + responde atividade, (4) tutor IA responde dúvida, (5) painel do professor mostra dados reais; documentar resultado de cada fluxo

**UI hint**: yes

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Segurança e Fundação | 5/5 | ✅ Complete | 2026-05-22 |
| 2. Turmas e Trilhas | 5/5 | ✅ Complete | 2026-05-22 |
| 3. Atividades e Painel do Aluno | 5/5 | ✅ Complete | 2026-05-22 |
| 4. Integração com IA | 5/5 | ✅ Complete | 2026-05-23 |
| 5. Polimento e Deploy | 0/5 | Not started | - |

---

## Milestone Summary

**v1.0 — TCC** entrega uma plataforma educacional funcional de ponta a ponta para o ensino fundamental 2 e médio brasileiro.

**Para o aluno:** cria conta, entra em uma turma pelo código, navega por trilhas de aprendizado em sequência, resolve atividades com correção automática imediata nas questões objetivas, acompanha seu progresso e streak no painel pessoal, e consulta um tutor de IA em português que orienta o raciocínio sem revelar respostas — diferencial central do produto.

**Para o professor:** cria turmas com código de acesso, monta trilhas com etapas de texto/vídeo/link, cria atividades e as distribui com prazo, visualiza entregas e desempenho de cada aluno, publica avisos para a turma, solicita geração de trilhas via IA e acompanha um painel de desempenho da turma com resumo gerado por inteligência artificial.

**Base técnica:** segurança real (bcrypt + JWT + CORS configurado + IDOR eliminado), código organizado em módulos, sistema implantado em URL pública com banco de dados gerenciado — nenhum dado fictício visível na interface, nenhuma senha em texto plano, nenhum endpoint público sem autenticação.

O resultado é um sistema demonstrável para a banca do TCC e suficientemente robusto para ser evoluído como produto real após a apresentação.

---
*Roadmap criado: 2026-05-22*
*Cobertura: 44/44 requisitos v1 mapeados ✓*
