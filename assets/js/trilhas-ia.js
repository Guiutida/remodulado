// assets/js/trilhas-ia.js
// Geração de trilha por IA — seção exclusiva para professores em trilhas.html
//
// Depende de aluno.js (carregado antes):
//   usuarioLogado(), tokenAtual(), mostrarAviso(texto)
//
// Fluxo:
//   1. Professor preenche formulário (turma, tema, nivel, qtdEtapas)
//   2. Clica "Gerar com IA" → POST /api/ia/gerar-trilha
//   3. Resultado renderizado em formulário editável (campos preenchidos com dados da IA)
//   4. Professor edita livremente → clica "Publicar trilha"
//   5. POST /api/ia/salvar-trilha → redireciona para trilhas.html (ou recarga)

(function () {
    'use strict';

    var usuario = usuarioLogado();
    if (!usuario || usuario.perfil !== 'professor') return;

    var formGerarIA       = document.querySelector('[data-form-gerar-trilha-ia]');
    var containerPreview  = document.querySelector('[data-preview-trilha-ia]');

    if (!formGerarIA) return; // seção IA ausente nesta página — encerrar silenciosamente

    // ── Popular select de turmas ──────────────────────────────────────────────
    async function popularSelectTurmas() {
        var select = formGerarIA.querySelector('[name="turma_id"]');
        if (!select) return;
        try {
            var resp  = await fetch('/api/turmas', {
                headers: { 'Authorization': 'Bearer ' + tokenAtual() }
            });
            var dados = await resp.json();
            if (dados.status !== 'ok' || !dados.turmas || !dados.turmas.length) return;
            select.innerHTML = '<option value="">Selecione a turma...</option>' +
                dados.turmas.map(function (t) {
                    return '<option value="' + escHtml(String(t.id)) + '">' + escHtml(t.nome) + '</option>';
                }).join('');
        } catch (e) {
            // Silencioso — professor pode não ter turmas ainda
        }
    }
    popularSelectTurmas();

    var trilhaGerada = null; // dados brutos vindos da IA (para referência)

    // ── Helper de fetch autenticado ───────────────────────────────────────────
    function api(caminho, opcoes) {
        var headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + tokenAtual()
        };
        if (opcoes && opcoes.headers) {
            Object.assign(headers, opcoes.headers);
        }
        return fetch(caminho, Object.assign({}, opcoes, { headers: headers }));
    }

    // ── Geração ───────────────────────────────────────────────────────────────
    formGerarIA.addEventListener('submit', async function (e) {
        e.preventDefault();

        var turmaId   = formGerarIA.querySelector('[name="turma_id"]').value;
        var tema      = formGerarIA.querySelector('[name="tema"]').value.trim();
        var nivel     = formGerarIA.querySelector('[name="nivel"]').value;
        var qtdEtapas = formGerarIA.querySelector('[name="qtdEtapas"]').value;

        if (!turmaId)  { mostrarAviso('Selecione a turma para a trilha'); return; }
        if (!tema)     { mostrarAviso('Informe o tema da trilha'); return; }
        if (!nivel)    { mostrarAviso('Selecione o nível de ensino'); return; }

        var botao = formGerarIA.querySelector('[type="submit"]');
        if (botao) { botao.disabled = true; botao.textContent = 'Gerando com IA…'; }

        try {
            var resp  = await api('/api/ia/gerar-trilha', {
                method: 'POST',
                body: JSON.stringify({ tema: tema, nivel: nivel, qtdEtapas: qtdEtapas })
            });
            var dados = await resp.json();

            if (dados.status !== 'ok') throw new Error(dados.message);

            trilhaGerada = dados.trilha;
            renderizarPreview(trilhaGerada, turmaId);

        } catch (erro) {
            mostrarAviso('Erro ao gerar trilha: ' + erro.message);
        } finally {
            if (botao) { botao.disabled = false; botao.textContent = 'Gerar com IA'; }
        }
    });

    // ── Renderizar formulário editável ────────────────────────────────────────
    function renderizarPreview(trilha, turmaId) {
        if (!containerPreview) return;

        containerPreview.innerHTML =
            '<div class="cartao-painel">' +
                '<h3>Revisar e editar antes de publicar</h3>' +
                '<p style="opacity:.7;font-size:.9em">Edite os campos à vontade — apenas você verá a trilha após publicar.</p>' +

                '<input type="hidden" data-campo="turma_id" value="' + escHtml(turmaId) + '">' +

                '<label class="campo">Título da trilha' +
                    '<input type="text" data-campo="titulo"' +
                           ' value="' + escHtml(trilha.titulo) + '" maxlength="140" />' +
                '</label>' +
                '<label class="campo">Descrição' +
                    '<textarea data-campo="descricao">' + escHtml(trilha.descricao || '') + '</textarea>' +
                '</label>' +
                '<label class="campo">Disciplina' +
                    '<input type="text" data-campo="disciplina"' +
                           ' value="' + escHtml(trilha.disciplina || '') + '" maxlength="80" />' +
                '</label>' +

                '<h4>Etapas (' + trilha.etapas.length + ')</h4>' +
                '<div data-etapas-ia>' +
                    trilha.etapas.map(function (etapa, i) {
                        return (
                            '<div class="cartao-painel" data-etapa-idx="' + i + '" style="margin-bottom:1rem">' +
                                '<label class="campo">Etapa ' + (i + 1) + ' — Título' +
                                    '<input type="text" data-etapa-titulo' +
                                           ' value="' + escHtml(etapa.titulo) + '" maxlength="140" />' +
                                '</label>' +
                                '<label class="campo">Conteúdo' +
                                    '<textarea data-etapa-conteudo rows="4">' + escHtml(etapa.conteudo || '') + '</textarea>' +
                                '</label>' +
                            '</div>'
                        );
                    }).join('') +
                '</div>' +

                '<div class="acoes" style="margin-top:1rem">' +
                    '<button class="botao botao-claro" type="button" data-cancelar-ia>Cancelar</button>' +
                    '<button class="botao" type="button" data-publicar-trilha-ia>Publicar trilha</button>' +
                '</div>' +
            '</div>';

        containerPreview.style.display = 'block';

        // Bind dos botões de ação dentro do preview
        containerPreview.querySelector('[data-cancelar-ia]').addEventListener('click', function () {
            containerPreview.innerHTML = '';
            containerPreview.style.display = 'none';
            trilhaGerada = null;
        });

        containerPreview.querySelector('[data-publicar-trilha-ia]').addEventListener('click', publicarTrilha);
    }

    // ── Publicar trilha editada ───────────────────────────────────────────────
    async function publicarTrilha() {
        if (!containerPreview) return;

        var turmaId    = containerPreview.querySelector('[data-campo="turma_id"]').value;
        var titulo     = containerPreview.querySelector('[data-campo="titulo"]').value.trim();
        var descricao  = containerPreview.querySelector('[data-campo="descricao"]').value.trim();
        var disciplina = containerPreview.querySelector('[data-campo="disciplina"]').value.trim();

        if (!titulo)     { mostrarAviso('Título da trilha é obrigatório'); return; }
        if (!disciplina) { mostrarAviso('Disciplina é obrigatória'); return; }

        // Coleta etapas editadas
        var etapasEls = containerPreview.querySelectorAll('[data-etapa-idx]');
        var etapas = Array.from(etapasEls).map(function (el) {
            return {
                titulo:   el.querySelector('[data-etapa-titulo]').value.trim(),
                conteudo: el.querySelector('[data-etapa-conteudo]').value.trim()
            };
        });

        var etapasInvalidas = etapas.filter(function (e) { return !e.titulo || !e.conteudo; });
        if (etapasInvalidas.length > 0) {
            mostrarAviso('Todas as etapas precisam ter título e conteúdo');
            return;
        }

        var botao = containerPreview.querySelector('[data-publicar-trilha-ia]');
        if (botao) { botao.disabled = true; botao.textContent = 'Publicando…'; }

        try {
            var resp  = await api('/api/ia/salvar-trilha', {
                method: 'POST',
                body: JSON.stringify({
                    turma_id:  turmaId,
                    titulo:    titulo,
                    descricao: descricao,
                    disciplina: disciplina,
                    etapas:    etapas
                })
            });
            var dados = await resp.json();

            if (dados.status !== 'ok') throw new Error(dados.message);

            mostrarAviso('Trilha publicada com sucesso!');
            containerPreview.innerHTML = '';
            containerPreview.style.display = 'none';
            trilhaGerada = null;

            // Recarrega lista de trilhas se a função global existir
            if (typeof carregarTrilhas === 'function') {
                carregarTrilhas();
            } else {
                window.location.reload();
            }

        } catch (erro) {
            mostrarAviso('Erro ao publicar trilha: ' + erro.message);
            if (botao) { botao.disabled = false; botao.textContent = 'Publicar trilha'; }
        }
    }

    // ── Utilitário ────────────────────────────────────────────────────────────
    function escHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

})();
