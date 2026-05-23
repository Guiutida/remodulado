# PLAN-05 Summary — Refatoração em Módulos + Frontend JWT + Auth Guards

**Status:** ✅ Complete  
**Commit:** 27ed7b0

## Tarefa 1: Backend modularizado

### Novos arquivos criados
| Arquivo | Descrição |
|---------|-----------|
| `backend/middleware/errorHandler.js` | Handler centralizado de erros Express (4 params) |
| `backend/controllers/authController.js` | Lógica de `/api/cadastro` e `/api/login` |
| `backend/controllers/usuariosController.js` | Lógica de GET/PUT usuário + preferências |
| `backend/controllers/alunosController.js` | Lógica de progresso/funcoes |
| `backend/routes/auth.js` | Router com rate limiting p/ cadastro/login |
| `backend/routes/usuarios.js` | Router com IDOR middleware `verificarProprioUsuario` |
| `backend/routes/alunos.js` | Router com IDOR middleware `verificarProprioAluno` |

### server.js refatorado
- De ~393 linhas para **57 linhas** (apenas entry point)
- Apenas `app.use()` e `app.listen()` + health endpoints
- Critério do plano: "menos de 60 linhas" ✅

## Tarefa 2: Frontend JWT

### acesso.js
- `enviarAcesso()` agora retorna `{ token, usuario }` em vez de apenas `usuario`
- Submit handler salva `duopratic_token` no `localStorage`

### aluno.js
- Função auxiliar `tokenAtual()` adicionada após `usuarioLogado()`
- 6 funções de `fetch` atualizadas com `Authorization: Bearer ${tokenAtual()}`
- 3 funções GET adicionam handler de 401 (limpa token + redireciona para login)

## Tarefa 3: Auth Guards

### auth-guard.js (novo)
- IIFE síncrona — executa antes do DOM renderizar
- Verifica `duopratic_token` + `duopratic_usuario` no localStorage
- Redireciona para `login.html` se não autenticado
- Verifica `data-perfil-guard` no `<body>` — redireciona perfil errado

### 8 páginas protegidas atualizadas
| Página | data-perfil-guard |
|--------|------------------|
| aluno.html | `"aluno"` |
| atividades.html | `"aluno"` |
| configuracoes.html | `"aluno"` |
| estudo.html | `"aluno"` |
| ia-estudo.html | `"aluno"` |
| trilhas.html | `"aluno"` |
| professor.html | `"professor"` |
| turma.html | `""` (auth only, sem restrição de perfil) |

## Estado Final da Fase 1
Todos os 5 critérios de aceitação da fase alcançados:
- ✅ VULN-1 — Senhas hasheadas com bcrypt
- ✅ VULN-2 — JWT aplicado a todas as rotas protegidas  
- ✅ VULN-3 — IDOR corrigido (parseInt + verificação por middleware)
- ✅ VULN-4 — CORS restrito + Helmet + rate limiting
- ✅ VULN-5 — Seed data removida da produção
- ✅ INFRA-01 — server.js refatorado em módulos
- ✅ AUTH-03/04/05 — Token salvo, enviado e guard ativo
