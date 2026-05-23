// assets/js/painel.js
// Depende de aluno.js: usuarioLogado(), tokenAtual(), mostrarAviso()
// Carregado em: pages/aluno.html

(function () {
    const usuario = usuarioLogado();
    if (!usuario || usuario.perfil !== "aluno") return;

    function api(caminho, opcoes) {
        const token = tokenAtual();
        return fetch(caminho, {
            ...opcoes,
            headers: {
                "Content-Type": "application/json",
                ...(token ? { "Authorization": "Bearer " + token } : {}),
                ...((opcoes && opcoes.headers) || {})
            }
        });
    }

    async function carregarPainel() {
        try {
            showLoading();
            const resp  = await api("/api/alunos/painel");
            const dados = await resp.json();
            if (dados.status !== "ok") throw new Error(dados.message);

            const { usuario: u, trilhas, atividades_pendentes } = dados;

            // Saudação
            document.querySelectorAll("[data-saudacao-nome]").forEach(el => {
                el.textContent = u.nome.split(" ")[0];
            });

            // Indicadores
            const elProgresso  = document.querySelector("[data-indicador-progresso]");
            const elStreak     = document.querySelector("[data-indicador-streak]");
            const elPendentes  = document.querySelector("[data-indicador-pendentes]");

            if (elStreak)    elStreak.textContent    = u.streak_atual + (u.streak_atual === 1 ? " dia" : " dias");
            if (elPendentes) elPendentes.textContent = atividades_pendentes.length;

            // Progresso: média das trilhas (ou "--" se sem trilha)
            if (trilhas.length) {
                const mediaPct = Math.round(
                    trilhas.reduce((acc, t) => acc + (t.progresso_pct || 0), 0) / trilhas.length
                );
                if (elProgresso) elProgresso.textContent = mediaPct + "%";

                // Barra de progresso do cartão destaque
                const barra = document.querySelector("[data-barra-progresso]");
                if (barra) barra.style.width = mediaPct + "%";
            } else {
                if (elProgresso) elProgresso.textContent = "--";
            }

            // Cartão destaque — próxima atividade pendente
            const proxima = atividades_pendentes[0];
            const elTitulo = document.querySelector("[data-proxima-atividade-titulo]");
            const elDesc   = document.querySelector("[data-proxima-atividade-desc]");
            const elLink   = document.querySelector("[data-link-proxima-atividade]");

            if (proxima) {
                if (elTitulo) elTitulo.textContent = proxima.titulo;
                if (elDesc)   elDesc.textContent   = proxima.prazo
                    ? "Prazo: " + new Date(proxima.prazo).toLocaleDateString("pt-BR")
                    : "Sem prazo definido";
                if (elLink)   elLink.href = "atividades.html";
            } else {
                if (elTitulo) elTitulo.textContent = "Nenhuma atividade pendente";
                if (elDesc)   elDesc.textContent   = "Você está em dia com as atividades!";
            }

            // Seção "Hoje" — lista de atividades pendentes
            const listaHoje = document.getElementById("lista-hoje");
            if (listaHoje) {
                if (!atividades_pendentes.length) {
                    listaHoje.innerHTML = "<p><em>Nenhuma atividade pendente.</em></p>";
                } else {
                    listaHoje.innerHTML = atividades_pendentes.slice(0, 3).map(a => `
                        <p>
                            <strong>${a.titulo}</strong>
                            <span>${a.prazo
                                ? "Prazo: " + new Date(a.prazo).toLocaleDateString("pt-BR")
                                : a.total_questoes + " questão(ões)"}</span>
                        </p>
                    `).join("");
                }
            }

            // Etapas da trilha — usa a primeira trilha como referência
            const containerEtapas = document.getElementById("etapas-trilha-painel");
            if (containerEtapas && trilhas.length) {
                const t = trilhas[0];
                const pct = t.progresso_pct || 0;
                // Representa progresso em 4 etapas simbólicas
                const rotulos = ["Base", "Prática", "Revisão", "Desafio"];
                const etapaAtual = Math.min(Math.floor(pct / 25), 3);
                containerEtapas.innerHTML = rotulos.map((r, i) => {
                    let cls = "";
                    if (i < etapaAtual) cls = "feito";
                    else if (i === etapaAtual) cls = "ativo";
                    return `<span class="${cls}">${r}</span>`;
                }).join("");
            }

        } catch {
            showError("Não foi possível carregar o painel.");
        } finally {
            hideLoading();
        }
    }

    carregarPainel();

    async function carregarHistorico() {
        const listaEl = document.getElementById("lista-historico");
        if (!listaEl) return;
        try {
            showLoading();
            const resp  = await api("/api/alunos/historico");
            const dados = await resp.json();
            if (dados.status !== "ok") throw new Error(dados.message);

            if (!dados.historico.length) {
                listaEl.innerHTML = "<p><em>Nenhuma atividade entregue ainda.</em></p>";
                return;
            }
            listaEl.innerHTML = dados.historico.map(h => `
                <p>
                    <strong>${h.titulo}</strong>
                    <span>${h.status}${h.nota !== null ? " · Nota: " + h.nota : ""}
                    · ${new Date(h.enviado_em).toLocaleDateString("pt-BR")}</span>
                </p>
            `).join("");
        } catch {
            showError("Não foi possível carregar o histórico.");
        } finally {
            hideLoading();
        }
    }

    carregarHistorico();

    // ── Resumo de desempenho por IA ───────────────────────────────────────────
    async function carregarResumoIA() {
        const container = document.getElementById('resumo-ia-aluno');
        if (!container) return; // elemento ausente na página — encerrar silenciosamente

        container.innerHTML = '<p><em>Gerando análise de desempenho…</em></p>';

        try {
            const resp  = await api('/api/ia/resumo-aluno');
            const dados = await resp.json();

            if (dados.status !== 'ok') {
                container.innerHTML = '<p><em>Não foi possível gerar a análise agora.</em></p>';
                return;
            }

            const { analise } = dados;

            const fortesHTML = Array.isArray(analise.pontos_fortes) && analise.pontos_fortes.length
                ? '<ul>' + analise.pontos_fortes.map(p => `<li>${escHtmlPainel(p)}</li>`).join('') + '</ul>'
                : '<p><em>Continue entregando atividades para identificar seus pontos fortes.</em></p>';

            const fracosHTML = Array.isArray(analise.pontos_fracos) && analise.pontos_fracos.length
                ? '<ul>' + analise.pontos_fracos.map(p => `<li>${escHtmlPainel(p)}</li>`).join('') + '</ul>'
                : '<p><em>Sem áreas de melhoria identificadas ainda.</em></p>';

            container.innerHTML = `
                <p>${escHtmlPainel(analise.resumo || '')}</p>
                <div class="linha-titulo" style="margin-top:1rem"><h4>Pontos fortes</h4></div>
                ${fortesHTML}
                <div class="linha-titulo" style="margin-top:1rem"><h4>Pontos de melhoria</h4></div>
                ${fracosHTML}
                ${analise.recomendacao
                    ? `<p style="margin-top:1rem"><strong>Próximo passo:</strong> ${escHtmlPainel(analise.recomendacao)}</p>`
                    : ''}
            `;
        } catch {
            container.innerHTML = '<p><em>Não foi possível carregar a análise de IA.</em></p>';
        }
    }

    function escHtmlPainel(str) {
        return String(str || '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    carregarResumoIA();
})();
