# PLAN-04 Summary — Route Protection + IDOR Fix + Seed Removal

**Status:** ✅ Complete  
**Commit:** 6e51a23

## Changes Made

### 1. autenticar middleware aplicado a 6 rotas
- `GET /api/usuarios/:id`
- `PUT /api/usuarios/:id`
- `GET /api/usuarios/:id/preferencias`
- `PUT /api/usuarios/:id/preferencias`
- `GET /api/alunos/:id/progresso/funcoes`
- `POST /api/alunos/:id/progresso/funcoes`

### 2. IDOR corrigido com 2 variantes

**Rotas `/usuarios` — professor pode acessar qualquer aluno:**
```js
const idRequisitado = parseInt(req.params.id, 10);
if (req.usuario.id !== idRequisitado && req.usuario.perfil !== "professor") {
    return res.status(403).json({ status: "erro", message: "Acesso negado." });
}
```

**Rotas `/alunos/progresso` — somente o próprio aluno:**
```js
const idRequisitado = parseInt(req.params.id, 10);
if (req.usuario.id !== idRequisitado) {
    return res.status(403).json({ status: "erro", message: "Acesso negado." });
}
```

### 3. Funções seed removidas da produção
- `garantirAtividadeFuncoes()` — removida completamente (criava professor, turma, atividade fake em produção)
- `garantirTabelaPreferencias()` — removida completamente (criação de tabela não deve ocorrer em produção)
- `garantirPreferencias()` — mantida, sem a chamada de `garantirTabelaPreferencias()`

### 4. Handlers de progresso reescritos
- `GET /api/alunos/:id/progresso/funcoes` — consulta `entregas` JOIN `atividades` por título, sem seed
- `POST /api/alunos/:id/progresso/funcoes` — busca atividade existente por título, retorna 404 se não existe, sem seed

## Vulnerabilidades Resolvidas
- ✅ VULN-2 — JWT auth aplicado às rotas protegidas
- ✅ VULN-3 — IDOR corrigido em 6 rotas
- ✅ VULN-5 — `garantirAtividadeFuncoes` removida da produção

## Estado das vulnerabilidades após PLAN-04
| ID | Descrição | Status |
|----|-----------|--------|
| VULN-1 | Senhas plaintext | ✅ FIXED (PLAN-02) |
| VULN-2 | Sem autenticação JWT | ✅ FIXED (PLAN-03 + PLAN-04) |
| VULN-3 | IDOR em 6 rotas | ✅ FIXED (PLAN-04) |
| VULN-4 | CORS wildcard | ✅ FIXED (PLAN-03) |
| VULN-5 | Seed em produção | ✅ FIXED (PLAN-04) |
