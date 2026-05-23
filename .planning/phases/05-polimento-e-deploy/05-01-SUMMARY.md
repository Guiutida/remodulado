---
phase: 05-polimento-e-deploy
plan: "01"
subsystem: uploads
tags: [multer, file-upload, migration, foto-perfil]
dependency_graph:
  requires: []
  provides: [POST /api/usuarios/perfil/foto, uploads/ directory, migration-05]
  affects: [backend/routes/usuarios.js, assets/js/aluno.js]
tech_stack:
  added: [multer@2.1.1]
  patterns: [DiskStorage, multipart/form-data, idempotent migration]
key_files:
  created:
    - backend/scripts/migration-05.js
    - uploads/.gitkeep
  modified:
    - backend/routes/usuarios.js
    - assets/js/aluno.js
    - pages/configuracoes.html
decisions:
  - "UPLOADS_DIR aponta dois níveis acima de __dirname para ficar na raiz do repositório"
  - "Endpoint POST /perfil/foto inserido ANTES das rotas /:id para evitar match incorreto"
  - "fileFilter usa file.mimetype (não extensão) para validação real de tipo"
  - "arquivoParaUpload guarda referência ao File object; fotoTemporaria mantém base64 apenas para preview"
metrics:
  duration: "~15 minutos"
  completed: "2026-05-27"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 05 Plan 01: Upload de Foto via Multer — Summary

**One-liner:** Migração de foto de perfil de LONGTEXT base64 para sistema de arquivos via multer@2.1.1 com endpoint multipart e migration idempotente.

## O que foi construído

### Tarefa 1 — Backend: multer + endpoint + migration + uploads/

**`backend/routes/usuarios.js`** — adicionados:
- Import de `multer`, `path`, `fs`
- `UPLOADS_DIR` apontando para `<repo-root>/uploads/` via `path.join(__dirname, '..', '..', 'uploads')`
- `multer.diskStorage` com `filename` gerado por `Date.now() + random`
- `fileFilter` que permite apenas `image/jpeg`, `image/png`, `image/webp`; rejeita outros com `MulterError`
- `limits: { fileSize: 5 * 1024 * 1024 }` — rejeita uploads acima de 5 MB
- Endpoint `POST /perfil/foto` com `autenticar` + `uploadFoto.single('foto')`:
  - Salva path `/uploads/filename` via `UPDATE preferencias_usuario SET foto_perfil`
  - Usa `req.usuario.id` (middleware `autenticar` existente)
  - Inserido ANTES de `/:id` para evitar match incorreto pelo Express

**`backend/scripts/migration-05.js`** — script idempotente:
- Conta e zera para NULL registros com `foto_perfil LIKE 'data:image%'`
- Verifica tipo atual da coluna via `SHOW COLUMNS`; só executa `ALTER TABLE` se ainda não for `VARCHAR(255)`
- Executado com sucesso: `ALTER TABLE preferencias_usuario MODIFY COLUMN foto_perfil VARCHAR(255) NULL`

**`uploads/.gitkeep`** — versiona o diretório de uploads no repositório

**`backend/package.json`** — `multer@2.1.1` adicionado às dependências

### Tarefa 2 — Frontend: FormData + validação de formatos + HTML

**`assets/js/aluno.js`** — alterações:
- Nova variável `let arquivoParaUpload = null;` ao lado de `fotoTemporaria`
- `carregarFoto()`: troca `image/gif` por `image/webp`; atualiza aviso para "Use JPG, PNG ou WebP"; armazena `arquivo` em `arquivoParaUpload` antes do FileReader
- Listener `[data-salvar-foto]` reescrito: faz `fetch POST /api/usuarios/perfil/foto` com `FormData` — sem Content-Type manual; salva `dados.foto` (`/uploads/…`) em `localStorage` via `salvarConfig('foto', dados.foto)`; botão desabilitado durante upload com feedback "Salvando foto…"

**`pages/configuracoes.html`** — `accept` do input de foto atualizado para `image/jpeg,image/png,image/webp`

## Verificação executada

| Check | Resultado |
|-------|-----------|
| `npm list multer` no backend | `multer@2.1.1` ✅ |
| `node -e "require('./backend/routes/usuarios')"` | Sem erros ✅ |
| `uploads/.gitkeep` existe | `True` ✅ |
| `node --check backend/scripts/migration-05.js` | Sintaxe OK ✅ |
| `Select-String "FormData"` em aluno.js | `True` ✅ |
| `Select-String "arquivoParaUpload"` em aluno.js | `True` ✅ |
| `Select-String "image/webp"` em aluno.js | `True` ✅ |
| `Select-String "image/jpeg,image/png,image/webp"` em configuracoes.html | `True` ✅ |
| `node backend/scripts/migration-05.js` | "Migration-05 concluída com sucesso." ✅ |

## Commits

| Tarefa | Hash | Mensagem |
|--------|------|----------|
| 1 | `7429961` | feat(05-01): instalar multer + endpoint POST /perfil/foto + migration-05.js + uploads/.gitkeep |
| 2 | `470f513` | feat(05-01): migrar upload de foto para FormData + atualizar formatos + migration-05 |

## Deviations from Plan

None — plano executado exatamente como especificado.

## Known Stubs

Nenhum. O endpoint retorna path real do arquivo; `aplicarFotoPerfil()` já lê `buscarConfig("foto","")` e gera `url(/uploads/...)` sem alterações adicionais.

## Threat Flags

Nenhuma superfície nova identificada além do modelo de ameaças documentado no plano (T-05-01 a T-05-04, T-05-SC). Todas as mitigações foram implementadas conforme especificado.

## Self-Check: PASSED

- `uploads/.gitkeep` ✅
- `backend/scripts/migration-05.js` ✅
- `backend/routes/usuarios.js` ✅ (POST /perfil/foto antes de /:id)
- `assets/js/aluno.js` ✅ (FormData, arquivoParaUpload, image/webp)
- `pages/configuracoes.html` ✅ (accept correto)
- Commits `7429961` e `470f513` ✅
