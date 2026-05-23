// assets/js/ia-estudo.js
// Tutor IA — frontend da página ia-estudo.html
//
// Depende de aluno.js (carregado antes):
//   usuarioLogado(), tokenAtual(), mostrarAviso(texto)
//
// Fluxo:
//   1. Ao carregar: listar sessões existentes ou criar nova
//   2. Clicar em sessão do histórico: carregar mensagens e mostrar a última resposta
//   3. Atalhos: preencher textarea com texto de contexto padrão
//   4. Enviar: stremar SSE, renderizar tokens ao vivo, salvar na sessão ativa
//   5. Ctrl+Enter também envia

(function () {
    'use strict';

    const usuario = usuarioLogado();
    if (!usuario || usuario.perfil !== 'aluno') return;

    // ── Elementos da UI ───────────────────────────────────────────────────────
    const elPergunta   = document.querySelector('[data-pergunta-ia]');
    const elEnviar     = document.querySelector('[data-enviar-ia]');
    const elResposta   = document.querySelector('[data-resposta-ia]');
    const elHistorico  = document.querySelector('[data-historico-ia]');
    const elDigitando  = document.querySelector('[data-indicador-digitando]');
    const botoesAtalho = document.querySelectorAll('[data-atalho-ia]');

    let sessaoAtual = null; // ID (int) da sessão ativa

    // ── Helper de fetch autenticado ───────────────────────────────────────────
    function api(caminho, opcoes) {
        return fetch(caminho, {
            ...opcoes,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + tokenAtual(),
                ...((opcoes && opcoes.headers) || {})
            }
        });
    }

    // ── Textos dos atalhos ────────────────────────────────────────────────────
    const TEXTO_ATALHO = {
        dica:    'Pode me dar uma dica sobre como pensar nesse problema, sem me entregar a resposta?',
        erro:    'Explique por que estou errando nesse tipo de exercício. O que devo rever?',
        exemplo: 'Crie uma pergunta parecida com esta para eu praticar o mesmo conceito.',
        resumo:  'Resuma em poucas linhas o conceito principal que preciso entender aqui.'
    };

    // ── Inicialização ─────────────────────────────────────────────────────────
    async function iniciar() {
        try {
            const resp  = await api('/api/ia/sessoes');
            const dados = await resp.json();

            if (dados.status === 'ok' && dados.sessoes.length > 0) {
                sessaoAtual = dados.sessoes[0].id;
                renderizarListaSessoes(dados.sessoes);
                await exibirUltimaMensagem(sessaoAtual);
            } else {
                // Aluno sem sessões — criar a primeira
                await criarNovaSessao('Nova conversa');
                if (elHistorico) {
                    elHistorico.innerHTML = '<p><em>Nenhuma conversa anterior.</em></p>';
                }
            }
        } catch {
            mostrarAviso('Não foi possível carregar o histórico de IA');
        }
    }

    async function criarNovaSessao(titulo) {
        try {
            const resp  = await api('/api/ia/sessoes', {
                method: 'POST',
                body: JSON.stringify({ titulo })
            });
            const dados = await resp.json();
            if (dados.status === 'ok') {
                sessaoAtual = dados.sessao_id;
            }
        } catch {
            mostrarAviso('Erro ao criar sessão de conversa');
        }
    }

    // Mostra a última resposta do modelo (para contexto visual ao reabrir sessão)
    async function exibirUltimaMensagem(sessaoId) {
        try {
            const resp  = await api('/api/ia/sessoes/' + sessaoId + '/mensagens');
            const dados = await resp.json();

            if (dados.status !== 'ok' || !dados.mensagens.length) return;

            const ultima = dados.mensagens[dados.mensagens.length - 1];
            if (ultima.role === 'model' && elResposta) {
                elResposta.textContent = ultima.conteudo;
            }
        } catch {
            // Silencioso — sessão pode estar vazia
        }
    }

    // ── Renderizar lista de sessões no histórico ──────────────────────────────
    function renderizarListaSessoes(sessoes) {
        if (!elHistorico) return;

        elHistorico.innerHTML = sessoes.slice(0, 5).map(s => `
            <div class="cartao-linha" data-sessao-id="${s.id}" style="cursor:pointer">
                <strong>${escHtml(s.titulo.slice(0, 60))}</strong>
                <p>${new Date(s.criado_em).toLocaleDateString('pt-BR')}</p>
            </div>
        `).join('');

        elHistorico.querySelectorAll('[data-sessao-id]').forEach(el => {
            el.addEventListener('click', async () => {
                const id = parseInt(el.dataset.sessaoId, 10);
                sessaoAtual = id;
                if (elResposta) elResposta.textContent = 'Carregando conversa…';
                await exibirUltimaMensagem(id);
                // Marca visualmente como ativo
                elHistorico.querySelectorAll('[data-sessao-id]').forEach(e => e.classList.remove('ativo'));
                el.classList.add('ativo');
            });
        });
    }

    // ── Envio de mensagem e consumo de SSE ────────────────────────────────────
    async function enviarMensagem() {
        const texto = elPergunta ? elPergunta.value.trim() : '';

        if (!texto) {
            mostrarAviso('Escreva uma dúvida antes de enviar');
            return;
        }
        if (!sessaoAtual) {
            mostrarAviso('Aguarde — inicializando sessão...');
            return;
        }

        // Estado de carregamento
        if (elEnviar)    elEnviar.disabled    = true;
        if (elResposta)  elResposta.textContent = '';
        if (elDigitando) elDigitando.hidden   = false;

        try {
            const resposta = await fetch('/api/ia/orientar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + tokenAtual()
                },
                body: JSON.stringify({ sessao_id: sessaoAtual, mensagem: texto })
            });

            // Erros HTTP antes do stream (401, 400, 429, 500)
            if (!resposta.ok) {
                const err = await resposta.json().catch(() => ({ message: 'Erro desconhecido.' }));
                if (elResposta) elResposta.textContent = err.message || 'Erro ao obter orientação.';
                return;
            }

            // Consumir SSE via ReadableStream
            // (EventSource não suporta headers de Authorization)
            const reader  = resposta.body.getReader();
            const decoder = new TextDecoder();
            let acumulado = '';
            if (elDigitando) elDigitando.hidden = true;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });

                for (const linha of chunk.split('\n')) {
                    if (!linha.startsWith('data: ')) continue;

                    const payload = linha.slice(6).trim();
                    if (payload === '[DONE]') break;

                    try {
                        const obj = JSON.parse(payload);
                        if (obj.erro) {
                            if (elResposta) elResposta.textContent += '\n[' + obj.erro + ']';
                        } else if (obj.text) {
                            acumulado += obj.text;
                            if (elResposta) elResposta.textContent = acumulado;
                        }
                    } catch {
                        // Chunk SSE parcial — ignorar (linha incompleta entre leituras)
                    }
                }
            }

            // Limpar campo após envio bem-sucedido
            if (elPergunta) elPergunta.value = '';

            // Atualizar lista de sessões (título pode ter mudado se era 1ª mensagem)
            const respSessoes  = await api('/api/ia/sessoes');
            const dadosSessoes = await respSessoes.json();
            if (dadosSessoes.status === 'ok') {
                renderizarListaSessoes(dadosSessoes.sessoes);
            }

        } catch {
            if (elResposta) elResposta.textContent = 'Erro de conexão. Verifique sua internet e tente novamente.';
        } finally {
            if (elEnviar)    elEnviar.disabled    = false;
            if (elDigitando) elDigitando.hidden   = true;
        }
    }

    // ── Atalhos ───────────────────────────────────────────────────────────────
    botoesAtalho.forEach(btn => {
        btn.addEventListener('click', () => {
            const tipo = btn.dataset.atalhoIa;
            if (elPergunta && TEXTO_ATALHO[tipo]) {
                elPergunta.value = TEXTO_ATALHO[tipo];
                elPergunta.focus();
            }
        });
    });

    // ── Eventos de envio ──────────────────────────────────────────────────────
    if (elEnviar) {
        elEnviar.addEventListener('click', enviarMensagem);
    }

    if (elPergunta) {
        // Ctrl+Enter ou Cmd+Enter envia
        elPergunta.addEventListener('keydown', e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                enviarMensagem();
            }
        });
    }

    // ── Utilitário ────────────────────────────────────────────────────────────
    function escHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    iniciar();
})();
